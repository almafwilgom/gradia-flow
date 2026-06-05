-- Drop function first to allow changing parameter names
drop function if exists public.finalize_session_rollover(uuid, text, numeric, integer);

-- Migration to fix duplicate key errors on the teacher-class assignment unique index during session rollover
create or replace function public.finalize_session_rollover(
  target_school_id uuid,
  target_session_year text,
  target_pass_mark numeric default 40,
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
    target_pass_mark,
    minimum_subjects
  );

  next_session := public.next_session_year(target_session_year);

  -- 1. Update students first
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

  -- 2. Safely update class teachers to avoid unique key conflicts on teachers.class_id unique index:
  -- A. First set class_id to NULL for teachers whose class is graduating (no next class)
  update public.teachers t
  set class_id = null
  from (
    select distinct from_class_id
    from public.student_promotion_decisions
    where school_id = target_school_id
      and session_year = target_session_year
      and decision = 'graduate'
  ) d
  where t.school_id = target_school_id
    and t.class_id = d.from_class_id;

  -- B. Create a temp table to hold teacher rollover mappings for promoting teachers
  create temp table temp_teacher_rollover (
    teacher_id uuid,
    target_class_id uuid
  ) on commit drop;

  -- C. Populate the temp table
  insert into temp_teacher_rollover (teacher_id, target_class_id)
  select t.id, d.to_class_id
  from public.teachers t
  join (
    select distinct from_class_id, to_class_id
    from public.student_promotion_decisions
    where school_id = target_school_id
      and session_year = target_session_year
      and decision = 'promote'
      and to_class_id is not null
  ) d on t.class_id = d.from_class_id
  where t.school_id = target_school_id;

  -- D. Set class_id to NULL for all teachers in temp table to avoid unique key conflicts during swap/shift
  update public.teachers
  set class_id = null
  where id in (select teacher_id from temp_teacher_rollover);

  -- E. Apply the new class_id to promoted teachers
  update public.teachers t
  set class_id = tr.target_class_id
  from temp_teacher_rollover tr
  where t.id = tr.teacher_id;

  -- F. Drop the temp table explicitly to avoid cached plan issues
  drop table if exists temp_teacher_rollover;

  -- 3. Mark promotion decisions as applied
  update public.student_promotion_decisions
  set applied_at = now()
  where school_id = target_school_id
    and session_year = target_session_year
    and applied_at is null;

  -- 4. Update the school session
  update public.schools
  set current_session_year = next_session,
      current_term = 'Term 1',
      updated_at = now()
  where id = target_school_id;

  -- 5. Record the rollover
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
    target_pass_mark,
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

grant execute on function public.finalize_session_rollover(uuid, text, numeric, integer) to authenticated;
