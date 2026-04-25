-- GradiaFlow core schema & RLS
-- Run with: supabase db push (or psql against your project)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('super_admin', 'school_admin', 'teacher', 'parent', 'student');
  end if;
  if not exists (select 1 from pg_type where typname = 'school_status') then
    create type public.school_status as enum ('pending', 'approved', 'disabled');
  end if;
  if not exists (select 1 from pg_type where typname = 'pay_method') then
    create type public.pay_method as enum ('manual', 'paystack');
  end if;
  if not exists (select 1 from pg_type where typname = 'pay_status') then
    create type public.pay_status as enum ('pending', 'approved', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
  end if;
end
$$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_code text,
  status public.school_status default 'pending',
  approved_at timestamptz,
  disabled_at timestamptz,
  disabled_reason text,
  demo_started_at timestamptz default now(),
  demo_expires_at timestamptz default (now() + interval '14 days'),
  logo_url text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  paystack_public_key text,
  paystack_secret_key text,
  paystack_enabled boolean default false,
  subscription_plan text default 'trial',
  subscription_status text default 'active',
  subscription_expires_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.schools add column if not exists school_code text;
alter table public.schools add column if not exists status public.school_status default 'pending';
alter table public.schools add column if not exists approved_at timestamptz;
alter table public.schools add column if not exists disabled_at timestamptz;
alter table public.schools add column if not exists disabled_reason text; 
alter table public.schools add column if not exists demo_started_at timestamptz default now();
alter table public.schools add column if not exists demo_expires_at timestamptz default (now() + interval '14 days');
create unique index if not exists schools_school_code_idx on public.schools(school_code);

drop view if exists public.school_directory cascade;

create or replace view public.school_directory as
select id, name, logo_url, school_code
from public.schools
where status = 'approved';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  role public.user_role not null default 'student',
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists profiles_school_id_idx on public.profiles(school_id);

-- SECURITY DEFINER is required here so these helpers bypass RLS when
-- querying public.profiles. Without it, any policy on profiles that calls
-- current_user_role() would cause infinite recursion.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt()->'user_metadata'->>'role', '')::public.user_role,
    (select role from public.profiles where id = auth.uid())
  );
$$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.school_is_operational(target_school_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.schools
    where id = target_school_id
      and status = 'approved'
  );
$$;

create or replace function public.current_school_is_operational()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.school_is_operational(public.current_school_id());
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  level text,
  fee numeric(12, 2) default 0,
  created_at timestamptz default now()
);
create index if not exists classes_school_idx on public.classes(school_id);

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
create index if not exists streams_class_idx on public.streams(class_id);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz default now()
);
create index if not exists subjects_school_idx on public.subjects(school_id);
alter table public.subjects drop constraint if exists subjects_school_id_code_key;
create unique index if not exists subjects_school_class_code_idx on public.subjects(school_id, class_id, code);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz default now()
);
alter table public.parents add column if not exists full_name text;
alter table public.parents add column if not exists email text;
alter table public.parents add column if not exists phone text;
alter table public.parents add column if not exists address text;
create index if not exists parents_school_idx on public.parents(school_id);
create unique index if not exists parents_profile_idx on public.parents(profile_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  resolved_school_id uuid;
  requested_school_name text;
  resolved_class_id uuid;
  resolved_class_school_id uuid;
  resolved_student_id uuid;
  requested_teacher_code text;
  requested_student_code text;
begin
  requested_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
    'student'::public.user_role
  );
  resolved_school_id := nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid;
  requested_school_name := nullif(btrim(new.raw_user_meta_data ->> 'school_name'), '');
  resolved_class_id := nullif(new.raw_user_meta_data ->> 'class_id', '')::uuid;
  requested_teacher_code := nullif(btrim(new.raw_user_meta_data ->> 'teacher_code'), '');
  requested_student_code := nullif(btrim(new.raw_user_meta_data ->> 'student_code'), '');

  if requested_role = 'school_admin' and resolved_school_id is null then
    if requested_school_name is null then
      raise exception 'school_name is required for school_admin signup';
    end if;

    insert into public.schools (
      name,
      status,
      subscription_plan,
      subscription_status,
      subscription_expires_at,
      demo_started_at,
      demo_expires_at
    )
    values (
      requested_school_name,
      'pending',
      'demo',
      'demo',
      (now() + interval '14 days')::date,
      now(),
      now() + interval '14 days'
    )
    returning id into resolved_school_id;

    insert into public.sms_wallets (school_id)
    values (resolved_school_id)
    on conflict (school_id) do nothing;
  end if;

  insert into public.profiles (
    id,
    school_id,
    student_id,
    role,
    full_name,
    email
  )
  values (
    new.id,
    resolved_school_id,
    null,
    requested_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email
  )
  on conflict (id) do update set
    school_id = excluded.school_id,
    student_id = excluded.student_id,
    role = excluded.role,
    full_name = excluded.full_name,
    email = excluded.email;

  if requested_role = 'parent' then
    insert into public.parents (profile_id, school_id)
    values (
      new.id,
      resolved_school_id
    )
    on conflict (profile_id) do nothing;
  end if;

  if requested_role = 'teacher' then
    if resolved_class_id is null then
      raise exception 'class_id is required for teacher signup';
    end if;

    select school_id into resolved_class_school_id
    from public.classes
    where id = resolved_class_id;

    if resolved_class_school_id is null or resolved_class_school_id <> resolved_school_id then
      raise exception 'class_id must belong to the selected school';
    end if;

    insert into public.teachers (profile_id, school_id, class_id, teacher_code)
    values (
      new.id,
      resolved_school_id,
      resolved_class_id,
      requested_teacher_code
    )
    on conflict (profile_id) do nothing;
  end if;

  if requested_role = 'student' then
    if requested_student_code is null then
      raise exception 'student_code is required for student signup';
    end if;

    select id into resolved_student_id
    from public.students
    where school_id = resolved_school_id
      and (
        upper(coalesce(student_code, '')) = upper(requested_student_code)
        or upper(coalesce(admission_no, '')) = upper(requested_student_code)
      )
    limit 1;

    if resolved_student_id is null then
      raise exception 'No student record matches the provided student_code';
    end if;

    update public.profiles
    set student_id = resolved_student_id
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  teacher_code text,
  subjects text[],
  responsibilities text[],
  hired_at date,
  created_at timestamptz default now()
);
alter table public.teachers add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.teachers add column if not exists teacher_code text;
create index if not exists teachers_school_idx on public.teachers(school_id);
create unique index if not exists teachers_profile_idx on public.teachers(profile_id);
create unique index if not exists teachers_class_idx on public.teachers(class_id) where class_id is not null;
create unique index if not exists teachers_teacher_code_idx on public.teachers(school_id, teacher_code) where teacher_code is not null;

create or replace function public.current_teacher_class_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select class_id
  from public.teachers
  where profile_id = auth.uid();
$$;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  stream_id uuid references public.streams(id) on delete set null,
  parent_id uuid references public.parents(id) on delete set null,
  student_code text,
  first_name text not null,
  last_name text not null,
  gender text,
  dob date,
  admission_no text unique,
  photo_url text,
  status text default 'active',
  enrolled_at date default now(),
  created_at timestamptz default now()
);
alter table public.students add column if not exists student_code text;
create index if not exists students_school_idx on public.students(school_id);
create index if not exists students_parent_idx on public.students(parent_id);
create unique index if not exists students_student_code_idx on public.students(student_code);

alter table public.profiles add column if not exists student_id uuid references public.students(id) on delete set null;
create unique index if not exists profiles_student_idx on public.profiles(student_id) where student_id is not null;

create or replace function public.generate_school_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'EDU-' || lpad((floor(random() * 1000000))::integer::text, 6, '0');
    exit when not exists (
      select 1
      from public.schools
      where school_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.generate_student_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'STU-' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
    exit when not exists (
      select 1
      from public.students
      where student_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.generate_teacher_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'STAFF-' || lpad((floor(random() * 1000000))::integer::text, 6, '0');
    exit when not exists (
      select 1
      from public.teachers
      where teacher_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.ensure_school_code()
returns trigger
language plpgsql
as $$
begin
  if new.school_code is null or btrim(new.school_code) = '' then
    new.school_code := public.generate_school_code();
  else
    new.school_code := upper(btrim(new.school_code));
  end if;

  return new;
end;
$$;

create or replace function public.ensure_student_code()
returns trigger
language plpgsql
as $$
begin
  if new.student_code is null or btrim(new.student_code) = '' then
    new.student_code := public.generate_student_code();
  else
    new.student_code := upper(btrim(new.student_code));
  end if;

  return new;
end;
$$;

create or replace function public.ensure_teacher_code()
returns trigger
language plpgsql
as $$
begin
  if new.teacher_code is null or btrim(new.teacher_code) = '' then
    new.teacher_code := public.generate_teacher_code();
  else
    new.teacher_code := upper(btrim(new.teacher_code));
  end if;

  return new;
end;
$$;

alter table public.schools alter column school_code set default public.generate_school_code();
alter table public.students alter column student_code set default public.generate_student_code();
alter table public.teachers alter column teacher_code set default public.generate_teacher_code();

drop trigger if exists trg_set_school_code on public.schools;
create trigger trg_set_school_code
before insert or update on public.schools
for each row execute procedure public.ensure_school_code();

drop trigger if exists trg_set_student_code on public.students;
create trigger trg_set_student_code
before insert or update on public.students
for each row execute procedure public.ensure_student_code();

drop trigger if exists trg_set_teacher_code on public.teachers;
create trigger trg_set_teacher_code
before insert or update on public.teachers
for each row execute procedure public.ensure_teacher_code();

update public.schools
set school_code = public.generate_school_code()
where school_code is null or btrim(school_code) = '';

update public.students
set student_code = public.generate_student_code()
where student_code is null or btrim(student_code) = '';

update public.teachers
set teacher_code = public.generate_teacher_code()
where teacher_code is null or btrim(teacher_code) = '';

update public.schools
set status = 'approved'
where status is null or status = 'pending';

update public.schools
set demo_started_at = coalesce(demo_started_at, created_at, now()),
    demo_expires_at = coalesce(demo_expires_at, coalesce(created_at, now()) + interval '14 days'),
    approved_at = coalesce(approved_at, created_at)
where status = 'approved';

drop view if exists public.vw_school_overview cascade;
drop view if exists public.vw_dashboard_stats cascade;

create or replace view public.vw_school_overview as
select
  s.id,
  s.name,
  s.school_code,
  s.status,
  s.demo_started_at,
  s.demo_expires_at,
  s.subscription_status,
  s.created_at,
  (select count(*) from public.students st where st.school_id = s.id) as total_students,
  (select count(*) from public.classes c where c.school_id = s.id) as total_classes
from public.schools s;

create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  stream_id uuid references public.streams(id) on delete set null,
  week_start date not null,
  created_at timestamptz default now()
);

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  timetable_id uuid references public.timetables(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz default now()
);

create table if not exists public.attendance_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  attended_on date not null,
  status public.attendance_status not null,
  remarks text,
  created_at timestamptz default now(),
  unique (student_id, attended_on)
);
create index if not exists attendance_students_school_idx on public.attendance_students(school_id, attended_on);

create table if not exists public.attendance_staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  attended_on date not null,
  status public.attendance_status not null,
  created_at timestamptz default now(),
  unique (profile_id, attended_on)
);
create index if not exists attendance_staff_school_idx on public.attendance_staff(school_id, attended_on);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  term text not null,
  session_year text not null,
  ca_score numeric(5, 2) default 0,
  exam_score numeric(5, 2) default 0,
  total numeric(6, 2) generated always as (coalesce(ca_score, 0) + coalesce(exam_score, 0)) stored,
  grade text,
  position integer,
  locked boolean default false,
  created_at timestamptz default now(),
  unique (student_id, subject_id, term, session_year)
);
create index if not exists results_school_idx on public.results(school_id);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  mode text default 'cbt',
  start_at timestamptz,
  end_at timestamptz,
  duration_minutes integer,
  total_marks numeric(6, 2),
  created_at timestamptz default now()
);
create index if not exists exams_school_idx on public.exams(school_id);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  question text not null,
  options jsonb default '[]'::jsonb,
  correct_option text,
  points numeric(5, 2) default 1
);

create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  answers jsonb default '{}'::jsonb,
  score numeric(6, 2) default 0,
  submitted_at timestamptz default now(),
  unique (exam_id, student_id)
);
create index if not exists exam_submissions_exam_idx on public.exam_submissions(exam_id);

create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  currency text default 'NGN',
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  amount numeric(12, 2) not null,
  method public.pay_method not null,
  status public.pay_status default 'pending',
  reference text,
  proof_url text,
  paid_at timestamptz default now(),
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists payments_school_idx on public.payments(school_id);
create index if not exists payments_student_idx on public.payments(student_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null,
  incurred_on date not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  staff_profile_id uuid references public.profiles(id) on delete cascade,
  month smallint check (month between 1 and 12),
  year integer,
  gross numeric(12, 2),
  net numeric(12, 2),
  status text default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now(),
  unique (staff_profile_id, month, year)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  title text not null,
  body text not null,
  audience text[] default '{students,parents,teachers,staff}',
  publish_at timestamptz default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists announcements_school_idx on public.announcements(school_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id),
  receiver_profile_id uuid references public.profiles(id),
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists messages_school_idx on public.messages(school_id);

create table if not exists public.sms_wallets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  balance numeric(12, 2) default 0,
  updated_at timestamptz default now()
);
create unique index if not exists sms_wallets_school_idx on public.sms_wallets(school_id);

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  phone text not null,
  message text not null,
  status text default 'queued',
  cost numeric(10, 2) default 0,
  created_at timestamptz default now()
);
create index if not exists sms_logs_school_idx on public.sms_logs(school_id);

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  file_url text not null,
  type text,
  created_at timestamptz default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  content jsonb default '[]'::jsonb,
  published boolean default false,
  created_at timestamptz default now(),
  unique (school_id, slug)
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  plan text not null,
  amount numeric(12, 2),
  status text default 'active',
  period_months integer default 1,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  next_billing_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists subscriptions_school_idx on public.subscriptions(school_id);

drop view if exists public.vw_dashboard_stats cascade;

create or replace view public.vw_dashboard_stats as
select
  s.id as school_id,
  (select count(*) from public.teachers t where t.school_id = s.id) as total_teachers,
  (select count(*) from public.students st where st.school_id = s.id) as total_students,
  (select count(*) from public.parents p where p.school_id = s.id) as total_parents,
  (select count(*) from public.classes c where c.school_id = s.id) as total_classes,
  coalesce(
    (
      select avg(case when a.status = 'present' then 1 else 0 end)
      from public.attendance_students a
      where a.school_id = s.id
        and a.attended_on > (now() - interval '30 days')
    ),
    0
  ) as attendance_pct,
  coalesce(
    (
      select sum(pay.amount)
      from public.payments pay
      where pay.school_id = s.id
        and pay.status = 'approved'
    ),
    0
  ) as fees_collected
from public.schools s;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.streams enable row level security;
alter table public.subjects enable row level security;
alter table public.parents enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.timetables enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.attendance_students enable row level security;
alter table public.attendance_staff enable row level security;
alter table public.results enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.fee_structures enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.payroll enable row level security;
alter table public.announcements enable row level security;
alter table public.messages enable row level security;
alter table public.sms_wallets enable row level security;
alter table public.sms_logs enable row level security;
alter table public.media_library enable row level security;
alter table public.pages enable row level security;
alter table public.gallery_items enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "super admin manage schools" on public.schools;
drop policy if exists "school admin read own school" on public.schools;
drop policy if exists "school admin update own school" on public.schools;
drop policy if exists "users can view self" on public.profiles;
drop policy if exists "school admin view school profiles" on public.profiles;
drop policy if exists "super admin manage profiles" on public.profiles;
drop policy if exists "classes by school" on public.classes;
drop policy if exists "streams by school" on public.streams;
drop policy if exists "subjects by school" on public.subjects;
drop policy if exists "parents by school" on public.parents;
drop policy if exists "teachers by school" on public.teachers;
drop policy if exists "students by school" on public.students;
drop policy if exists "students write by staff" on public.students;
drop policy if exists "timetables by school" on public.timetables;
drop policy if exists "timetable entries by school" on public.timetable_entries;
drop policy if exists "attendance students by school" on public.attendance_students;
drop policy if exists "attendance staff by school" on public.attendance_staff;
drop policy if exists "results by school" on public.results;
drop policy if exists "results write by staff" on public.results;
drop policy if exists "exams by school" on public.exams;
drop policy if exists "exam questions by school" on public.exam_questions;
drop policy if exists "exam submissions by school" on public.exam_submissions;
drop policy if exists "fee structures by school" on public.fee_structures;
drop policy if exists "payments by school" on public.payments;
drop policy if exists "payments insert by parent or admin" on public.payments;
drop policy if exists "payments update by admin" on public.payments;
drop policy if exists "expenses by school" on public.expenses;
drop policy if exists "payroll by school" on public.payroll;
drop policy if exists "announcements by school" on public.announcements;
drop policy if exists "messages by school" on public.messages;
drop policy if exists "sms wallet by school" on public.sms_wallets;
drop policy if exists "sms logs by school" on public.sms_logs;
drop policy if exists "media by school" on public.media_library;
drop policy if exists "pages by school" on public.pages;
drop policy if exists "gallery by school" on public.gallery_items;
drop policy if exists "subscriptions by school" on public.subscriptions;

create policy "super admin manage schools" on public.schools
  for all
  to public
  using (current_user_role() = 'super_admin')
  with check (current_user_role() = 'super_admin');

create policy "school admin read own school" on public.schools
  for select
  to public
  using (id = (select school_id from public.profiles where id = auth.uid()));

create policy "school admin update own school" on public.schools
  for update
  to public
  using (id = (select school_id from public.profiles where id = auth.uid()))
  with check (id = (select school_id from public.profiles where id = auth.uid()));

create policy "users can view self" on public.profiles
  for select
  to public
  using (id = auth.uid());

create policy "school admin view school profiles" on public.profiles
  for select
  to public
  using (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'school_admin'
      and school_id = public.current_school_id()
    )
  );

create policy "super admin manage profiles" on public.profiles
  for all
  to public
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

create policy "classes by school" on public.classes
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "streams by school" on public.streams
  for all
  to public
  using (
    (
      (select school_id from public.classes where id = class_id) = current_school_id()
      and public.school_is_operational((select school_id from public.classes where id = class_id))
    )
    or current_user_role() = 'super_admin'
  )
  with check (
    (
      (select school_id from public.classes where id = class_id) = current_school_id()
      and public.school_is_operational((select school_id from public.classes where id = class_id))
    )
    or current_user_role() = 'super_admin'
  );

create policy "subjects by school" on public.subjects
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "parents by school" on public.parents
  for all
  to public
  using (
    (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin', 'parent'))
    or current_user_role() = 'super_admin'
  )
  with check (
    (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin', 'parent'))
    or current_user_role() = 'super_admin'
  );

create policy "teachers by school" on public.teachers
  for all
  to public
  using (
    (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin'))
    or current_user_role() = 'super_admin'
    or (current_user_role() = 'teacher' and profile_id = auth.uid())
  )
  with check (
    (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin'))
    or current_user_role() = 'super_admin'
    or (current_user_role() = 'teacher' and profile_id = auth.uid())
  );

create policy "students by school" on public.students
  for select
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "students write by staff" on public.students
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "timetables by school" on public.timetables
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "timetable entries by school" on public.timetable_entries
  for all
  to public
  using (
    (
      (select school_id from public.timetables where id = timetable_id) = current_school_id()
      and public.school_is_operational((select school_id from public.timetables where id = timetable_id))
    )
    or (
      current_user_role() = 'teacher'
      and (select class_id from public.timetables where id = timetable_id) = current_teacher_class_id()
    )
    or current_user_role() = 'super_admin'
  )
  with check (
    (
      (select school_id from public.timetables where id = timetable_id) = current_school_id()
      and public.school_is_operational((select school_id from public.timetables where id = timetable_id))
    )
    or (
      current_user_role() = 'teacher'
      and (select class_id from public.timetables where id = timetable_id) = current_teacher_class_id()
    )
    or current_user_role() = 'super_admin'
  );

create policy "attendance students by school" on public.attendance_students
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "attendance staff by school" on public.attendance_staff
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and profile_id = auth.uid()
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and profile_id = auth.uid()
    )
  );

create policy "results by school" on public.results
  for select
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
    or (
      current_user_role() = 'student'
      and student_id = (select student_id from public.profiles where id = auth.uid())
    )
  );

create policy "results write by staff" on public.results
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = (select school_id from public.profiles where id = auth.uid())
    )
    or (
      current_user_role() = 'teacher'
      and class_id = (select class_id from public.teachers where profile_id = auth.uid())
    )
  );

create policy "exams by school" on public.exams
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = current_school_id()
      and current_school_is_operational()
    )
    or (
      current_user_role() = 'teacher'
      and class_id = current_teacher_class_id()
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = current_school_id()
      and current_school_is_operational()
    )
    or (
      current_user_role() = 'teacher'
      and class_id = current_teacher_class_id()
    )
  );

create policy "exam questions by school" on public.exam_questions
  for all
  to public
  using (
    (
      (select school_id from public.exams where id = exam_id) = current_school_id()
      and public.school_is_operational((select school_id from public.exams where id = exam_id))
    )
    or (
      current_user_role() = 'teacher'
      and (select class_id from public.exams where id = exam_id) = current_teacher_class_id()
    )
    or current_user_role() = 'super_admin'
  )
  with check (
    (
      (select school_id from public.exams where id = exam_id) = current_school_id()
      and public.school_is_operational((select school_id from public.exams where id = exam_id))
    )
    or (
      current_user_role() = 'teacher'
      and (select class_id from public.exams where id = exam_id) = current_teacher_class_id()
    )
    or current_user_role() = 'super_admin'
  );

create policy "exam submissions by school" on public.exam_submissions
  for all
  to public
  using (
    (
      (select school_id from public.exams where id = exam_id) = current_school_id()
      and public.school_is_operational((select school_id from public.exams where id = exam_id))
    )
    or (
      current_user_role() = 'teacher'
      and (select class_id from public.exams where id = exam_id) = current_teacher_class_id()
    )
    or current_user_role() = 'super_admin'
  )
  with check (
    (
      (select school_id from public.exams where id = exam_id) = current_school_id()
      and public.school_is_operational((select school_id from public.exams where id = exam_id))
    )
    or (
      current_user_role() = 'teacher'
      and (select class_id from public.exams where id = exam_id) = current_teacher_class_id()
    )
    or current_user_role() = 'super_admin'
  );

create policy "fee structures by school" on public.fee_structures
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = current_school_id()
      and current_school_is_operational()
    )
    or (
      current_user_role() = 'teacher'
      and class_id = current_teacher_class_id()
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      current_user_role() = 'school_admin'
      and school_id = current_school_id()
      and current_school_is_operational()
    )
    or (
      current_user_role() = 'teacher'
      and class_id = current_teacher_class_id()
    )
  );

create policy "payments by school" on public.payments
  for select
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin', 'parent'))
  );

create policy "payments insert by parent or admin" on public.payments
  for insert
  to public
  with check (
    current_user_role() = 'super_admin'
    or (
      school_id = (select school_id from public.profiles where id = auth.uid())
      and current_user_role() in ('school_admin', 'parent')
    )
  );

create policy "payments update by admin" on public.payments
  for update
  to public
  using (
    current_user_role() = 'super_admin'
    or (
      school_id = (select school_id from public.profiles where id = auth.uid())
      and current_user_role() = 'school_admin'
    )
  )
  with check (
    current_user_role() = 'super_admin'
    or (
      school_id = (select school_id from public.profiles where id = auth.uid())
      and current_user_role() = 'school_admin'
    )
  );

create policy "expenses by school" on public.expenses
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "payroll by school" on public.payroll
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "announcements by school" on public.announcements
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin', 'teacher'))
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() in ('school_admin', 'teacher'))
  );

create policy "messages by school" on public.messages
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or sender_profile_id = auth.uid()
    or receiver_profile_id = auth.uid()
  )
  with check (
    current_user_role() = 'super_admin'
    or sender_profile_id = auth.uid()
  );

create policy "sms wallet by school" on public.sms_wallets
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "sms logs by school" on public.sms_logs
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "media by school" on public.media_library
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "pages by school" on public.pages
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "gallery by school" on public.gallery_items
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

create policy "subscriptions by school" on public.subscriptions
  for all
  to public
  using (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  )
  with check (
    current_user_role() = 'super_admin'
    or (school_id = (select school_id from public.profiles where id = auth.uid()) and current_user_role() = 'school_admin')
  );

alter view public.vw_dashboard_stats set (security_barrier = true);
alter view public.vw_school_overview set (security_barrier = true);

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert on public.schools from anon;
grant select on public.school_directory to anon, authenticated;
grant select on public.vw_dashboard_stats to authenticated;
grant select on public.vw_school_overview to authenticated;

create or replace function public.sync_result_lock()
returns trigger
language plpgsql
as $$
declare
  student uuid;
  required numeric;
  paid numeric;
begin
  student := coalesce(new.student_id, old.student_id);
  if student is null then
    return new;
  end if;

  select sum(amount) into required
  from public.fee_structures
  where class_id = (select class_id from public.students where id = student);
  required := coalesce(required, 0);

  select sum(amount) into paid
  from public.payments
  where student_id = student
    and status = 'approved';
  paid := coalesce(paid, 0);

  if paid >= required then
    update public.results set locked = false where student_id = student;
  else
    update public.results set locked = true where student_id = student;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_result_lock on public.payments;
create trigger trg_sync_result_lock
after insert or update on public.payments
for each row execute procedure public.sync_result_lock();

