alter table public.students add column if not exists promoted_from_class_id uuid references public.classes(id) on delete set null;
alter table public.students add column if not exists promoted_at timestamptz;
alter table public.students add column if not exists last_promotion_decision text;
alter table public.students add column if not exists last_promotion_session text;

create table if not exists public.student_promotion_decisions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  from_class_id uuid references public.classes(id) on delete set null,
  to_class_id uuid references public.classes(id) on delete set null,
  session_year text not null,
  average_score numeric(6, 2) default 0,
  subject_count integer default 0,
  pass_mark numeric(5, 2) default 40,
  decision text not null check (decision in ('promote', 'repeat', 'graduate')),
  reason text,
  applied_at timestamptz,
  created_at timestamptz default now(),
  unique (student_id, session_year)
);

create index if not exists student_promotion_decisions_school_idx
  on public.student_promotion_decisions(school_id, session_year, from_class_id);

create table if not exists public.session_rollovers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  from_session_year text not null,
  to_session_year text not null,
  pass_mark numeric(5, 2) default 40,
  promoted_count integer default 0,
  repeated_count integer default 0,
  graduated_count integer default 0,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz default now(),
  unique (school_id, from_session_year)
);

create or replace function public.class_progression_rank(class_name text, class_level text default null)
returns integer
language plpgsql
immutable
as $$
declare
  normalized text := lower(coalesce(class_name, '') || ' ' || coalesce(class_level, ''));
  number_match text;
begin
  if normalized ~ '(nursery|nur)[^0-9]*1' then return 10; end if;
  if normalized ~ '(nursery|nur)[^0-9]*2' then return 20; end if;
  if normalized ~ '(kg|kindergarten)[^0-9]*1' then return 30; end if;
  if normalized ~ '(kg|kindergarten)[^0-9]*2' then return 40; end if;

  if normalized ~ '(primary|pry|basic)[^0-9]*[1-6]' then
    number_match := substring(normalized from '(?:primary|pry|basic)[^0-9]*([1-6])');
    return 100 + number_match::integer * 10;
  end if;

  if normalized ~ '(jss|junior)[^0-9]*[1-3]' then
    number_match := substring(normalized from '(?:jss|junior)[^0-9]*([1-3])');
    return 200 + number_match::integer * 10;
  end if;

  if normalized ~ '(sss|senior|ss)[^0-9]*[1-3]' then
    number_match := substring(normalized from '(?:sss|senior|ss)[^0-9]*([1-3])');
    return 300 + number_match::integer * 10;
  end if;

  return null;
end;
$$;

create or replace function public.next_session_year(session_year text)
returns text
language plpgsql
immutable
as $$
declare
  start_year integer;
  finish_year integer;
begin
  start_year := split_part(session_year, '/', 1)::integer;
  finish_year := split_part(session_year, '/', 2)::integer;
  return (start_year + 1)::text || '/' || (finish_year + 1)::text;
exception
  when others then
    return session_year;
end;
$$;

create or replace function public.resolve_next_class(target_school_id uuid, current_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with current_class as (
    select public.class_progression_rank(name, level) as current_rank
    from public.classes
    where id = current_class_id
      and school_id = target_school_id
  ),
  ranked_classes as (
    select id, public.class_progression_rank(name, level) as rank
    from public.classes
    where school_id = target_school_id
  )
  select id
  from ranked_classes, current_class
  where rank is not null
    and current_rank is not null
    and rank > current_rank
  order by rank asc
  limit 1;
$$;

create or replace function public.prepare_session_promotion_decisions(
  target_school_id uuid,
  target_session_year text,
  pass_mark numeric default 40,
  minimum_subjects integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  if public.current_user_role() not in ('school_admin', 'super_admin') then
    raise exception 'Only school admins can prepare promotion decisions';
  end if;

  if public.current_user_role() = 'school_admin' and public.current_school_id() <> target_school_id then
    raise exception 'You can only prepare promotions for your own school';
  end if;

  insert into public.student_promotion_decisions (
    school_id,
    student_id,
    from_class_id,
    to_class_id,
    session_year,
    average_score,
    subject_count,
    pass_mark,
    decision,
    reason
  )
  select
    st.school_id,
    st.id,
    st.class_id,
    public.resolve_next_class(st.school_id, st.class_id),
    target_session_year,
    coalesce(round(avg(r.total)::numeric, 2), 0),
    count(r.id)::integer,
    pass_mark,
    case
      when count(r.id)::integer < minimum_subjects then 'repeat'
      when coalesce(avg(r.total), 0) < pass_mark then 'repeat'
      when public.resolve_next_class(st.school_id, st.class_id) is null then 'graduate'
      else 'promote'
    end,
    case
      when count(r.id)::integer < minimum_subjects then 'Incomplete or missing results'
      when coalesce(avg(r.total), 0) < pass_mark then 'Average below promotion pass mark'
      when public.resolve_next_class(st.school_id, st.class_id) is null then 'Final class completed'
      else 'Promotion requirement met'
    end
  from public.students st
  left join public.results r
    on r.student_id = st.id
   and r.session_year = target_session_year
  where st.school_id = target_school_id
    and coalesce(st.status, 'active') = 'active'
    and st.class_id is not null
  group by st.school_id, st.id, st.class_id
  on conflict (student_id, session_year) do update set
    from_class_id = excluded.from_class_id,
    to_class_id = excluded.to_class_id,
    average_score = excluded.average_score,
    subject_count = excluded.subject_count,
    pass_mark = excluded.pass_mark,
    decision = excluded.decision,
    reason = excluded.reason,
    created_at = now();

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.finalize_session_rollover(
  target_school_id uuid,
  target_session_year text,
  pass_mark numeric default 40,
  minimum_subjects integer default 1
)
returns table (
  promoted_count integer,
  repeated_count integer,
  graduated_count integer,
  next_session_year text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_session text;
begin
  if public.current_user_role() not in ('school_admin', 'super_admin') then
    raise exception 'Only school admins can complete a session rollover';
  end if;

  if public.current_user_role() = 'school_admin' and public.current_school_id() <> target_school_id then
    raise exception 'You can only complete rollover for your own school';
  end if;

  perform public.prepare_session_promotion_decisions(
    target_school_id,
    target_session_year,
    pass_mark,
    minimum_subjects
  );

  next_session := public.next_session_year(target_session_year);

  update public.students st
  set
    promoted_from_class_id = st.class_id,
    class_id = case when d.decision = 'promote' then d.to_class_id else st.class_id end,
    status = case when d.decision = 'graduate' then 'graduated' else coalesce(st.status, 'active') end,
    last_promotion_decision = d.decision,
    last_promotion_session = target_session_year,
    promoted_at = now()
  from public.student_promotion_decisions d
  where d.student_id = st.id
    and d.school_id = target_school_id
    and d.session_year = target_session_year
    and d.decision in ('promote', 'repeat', 'graduate');

  update public.teachers t
  set class_id = d.to_class_id
  from (
    select distinct from_class_id, to_class_id
    from public.student_promotion_decisions
    where school_id = target_school_id
      and session_year = target_session_year
      and decision = 'promote'
      and to_class_id is not null
  ) d
  where t.school_id = target_school_id
    and t.class_id = d.from_class_id;

  update public.student_promotion_decisions
  set applied_at = now()
  where school_id = target_school_id
    and session_year = target_session_year
    and applied_at is null;

  update public.schools
  set current_session_year = next_session,
      current_term = 'Term 1',
      updated_at = now()
  where id = target_school_id;

  insert into public.session_rollovers (
    school_id,
    from_session_year,
    to_session_year,
    pass_mark,
    promoted_count,
    repeated_count,
    graduated_count,
    processed_by
  )
  select
    target_school_id,
    target_session_year,
    next_session,
    pass_mark,
    count(*) filter (where decision = 'promote'),
    count(*) filter (where decision = 'repeat'),
    count(*) filter (where decision = 'graduate'),
    auth.uid()
  from public.student_promotion_decisions
  where school_id = target_school_id
    and session_year = target_session_year
  on conflict (school_id, from_session_year) do update set
    to_session_year = excluded.to_session_year,
    pass_mark = excluded.pass_mark,
    promoted_count = excluded.promoted_count,
    repeated_count = excluded.repeated_count,
    graduated_count = excluded.graduated_count,
    processed_by = excluded.processed_by,
    processed_at = now();

  return query
  select
    count(*) filter (where decision = 'promote')::integer,
    count(*) filter (where decision = 'repeat')::integer,
    count(*) filter (where decision = 'graduate')::integer,
    next_session
  from public.student_promotion_decisions
  where school_id = target_school_id
    and session_year = target_session_year;
end;
$$;

alter table public.student_promotion_decisions enable row level security;
alter table public.session_rollovers enable row level security;

drop policy if exists "promotion decisions by school" on public.student_promotion_decisions;
create policy "promotion decisions by school" on public.student_promotion_decisions
  for select
  to public
  using (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'school_admin'
      and school_id = public.current_school_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and from_class_id = public.current_teacher_class_id()
    )
  );

drop policy if exists "promotion decisions managed by admins" on public.student_promotion_decisions;
create policy "promotion decisions managed by admins" on public.student_promotion_decisions
  for all
  to public
  using (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'school_admin'
      and school_id = public.current_school_id()
    )
  )
  with check (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'school_admin'
      and school_id = public.current_school_id()
    )
  );

drop policy if exists "session rollovers by school admins" on public.session_rollovers;
create policy "session rollovers by school admins" on public.session_rollovers
  for all
  to public
  using (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'school_admin'
      and school_id = public.current_school_id()
    )
  )
  with check (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'school_admin'
      and school_id = public.current_school_id()
    )
  );

grant execute on function public.class_progression_rank(text, text) to authenticated;
grant execute on function public.next_session_year(text) to authenticated;
grant execute on function public.resolve_next_class(uuid, uuid) to authenticated;
grant execute on function public.prepare_session_promotion_decisions(uuid, text, numeric, integer) to authenticated;
grant execute on function public.finalize_session_rollover(uuid, text, numeric, integer) to authenticated;
