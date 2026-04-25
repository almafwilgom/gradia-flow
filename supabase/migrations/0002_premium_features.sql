-- GradiaFlow Premium Features
-- Run with: supabase db push

-- Add new enum types for domains
do $$
begin
  if not exists (select 1 from pg_type where typname = 'result_domain') then
    create type public.result_domain as enum ('cognitive', 'affective', 'psychomotor');
  end if;
  if not exists (select 1 from pg_type where typname = 'grade_scale') then
    create type public.grade_scale as enum ('A', 'B', 'C', 'D', 'E', 'F', 'I');
  end if;
  if not exists (select 1 from pg_type where typname = 'behaviour_rating') then
    create type public.behaviour_rating as enum ('excellent', 'good', 'average', 'poor', 'very_poor');
  end if;
end
$$;

-- Enhanced results table with domain tracking
alter table public.results add column if not exists domain public.result_domain default 'cognitive';
alter table public.results add column if not exists score_out_of numeric(5, 2);
alter table public.results add column if not exists percentage numeric(5, 2) generated always as (
  case 
    when score_out_of > 0 then round(((coalesce(ca_score, 0) + coalesce(exam_score, 0)) / score_out_of) * 100, 2)
    else 0
  end
) stored;
alter table public.results add column if not exists ai_comment text;
alter table public.results add column if not exists ai_subject_insight text;
alter table public.results add column if not exists qr_code_data text;
alter table public.results add column if not exists verified_at timestamptz;
alter table public.results add column if not exists verification_token text unique;

-- Attendance summary per student per term
create table if not exists public.attendance_summary (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  term text not null,
  session_year text not null,
  days_present integer default 0,
  days_absent integer default 0,
  days_late integer default 0,
  days_excused integer default 0,
  total_school_days integer,
  attendance_percentage numeric(5, 2) generated always as (
    case 
      when total_school_days > 0 then round(((days_present + days_late + days_excused)::numeric / total_school_days) * 100, 2)
      else 0
    end
  ) stored,
  created_at timestamptz default now(),
  unique (student_id, term, session_year)
);
create index if not exists attendance_summary_school_idx on public.attendance_summary(school_id, term);

-- Behaviour evaluations per student
create table if not exists public.behaviour_evaluations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  term text not null,
  session_year text not null,
  obedience public.behaviour_rating,
  honesty public.behaviour_rating,
  respect public.behaviour_rating,
  cooperation public.behaviour_rating,
  punctuality public.behaviour_rating,
  self_discipline public.behaviour_rating,
  initiative public.behaviour_rating,
  overall_rating public.behaviour_rating,
  teacher_comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, class_id, term, session_year)
);
create index if not exists behaviour_evaluations_school_idx on public.behaviour_evaluations(school_id);

-- Psychomotor skills evaluation
create table if not exists public.psychomotor_skills (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  term text not null,
  session_year text not null,
  skill_name text not null,
  proficiency_level text,
  score numeric(5, 2),
  teacher_feedback text,
  created_at timestamptz default now(),
  unique (student_id, term, session_year, skill_name)
);

-- Form master remarks (AI-generated)
create table if not exists public.form_master_remarks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  term text not null,
  session_year text not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  remarks text not null,
  is_ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, class_id, term, session_year)
);

-- Principal remarks (AI-generated)
create table if not exists public.principal_remarks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  term text not null,
  session_year text not null,
  remarks text not null,
  is_ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, class_id, term, session_year)
);

-- Result reports (complete compiled result sheets)
create table if not exists public.result_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  term text not null,
  session_year text not null,
  compiled_by uuid references public.profiles(id),
  compiled_at timestamptz,
  published_at timestamptz,
  is_locked boolean default false,
  pdf_url text,
  qr_code_url text,
  verification_code text unique,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, class_id, term, session_year)
);
create index if not exists result_reports_school_idx on public.result_reports(school_id, term, session_year);

-- Mark entry tracking (for progress tracking)
create table if not exists public.mark_entry_tracker (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  term text not null,
  session_year text not null,
  assessment_type text, -- 'classwork', 'quiz', 'exam'
  total_students integer,
  marks_entered integer default 0,
  marks_percentage numeric(5, 2) generated always as (
    case 
      when total_students > 0 then round((marks_entered::numeric / total_students) * 100, 2)
      else 0
    end
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (class_id, subject_id, term, session_year, assessment_type)
);

-- Invoice tracking
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  invoice_number text unique,
  amount numeric(12, 2) not null,
  description text,
  due_date date,
  issued_at timestamptz default now(),
  paid_at timestamptz,
  status text default 'pending', -- 'pending', 'partial', 'paid', 'overdue'
  created_at timestamptz default now()
);
create index if not exists invoices_school_idx on public.invoices(school_id);
create index if not exists invoices_student_idx on public.invoices(student_id);

-- SMS logs (for parent notifications)
alter table public.sms_logs add column if not exists recipient_id uuid references public.profiles(id);
alter table public.sms_logs add column if not exists message_type text; -- 'result', 'payment', 'attendance', etc

-- Teacher marking progress
create table if not exists public.teacher_marking_progress (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete cascade,
  term text not null,
  session_year text not null,
  subject_id uuid references public.subjects(id),
  class_id uuid references public.classes(id),
  classwork_progress integer default 0, -- percentage 0-100
  quiz_progress integer default 0,
  exam_progress integer default 0,
  comments_progress integer default 0,
  behaviour_progress integer default 0,
  last_updated timestamptz default now(),
  unique (teacher_id, term, session_year, subject_id)
);

-- AI comment templates (for reference)
create table if not exists public.ai_comment_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  subject_name text,
  score_range text, -- e.g., "80-100", "60-79", "40-59", "0-39"
  template_text text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Create function to generate verification token
create or replace function public.generate_verification_token()
returns text
language plpgsql
as $$
declare
  token text;
begin
  loop
    token := 'VER-' || upper(substr(md5(random()::text || now()::text), 1, 16));
    exit when not exists (
      select 1 from public.result_reports where verification_code = token
    );
  end loop;
  return token;
end;
$$;

-- Create function to generate QR code data
create or replace function public.generate_qr_code_data(report_id uuid)
returns text
language plpgsql
as $$
declare
  base_url text;
  token text;
begin
  select verification_code into token from public.result_reports where id = report_id;
  if token is null then
    token := public.generate_verification_token();
    update public.result_reports set verification_code = token where id = report_id;
  end if;
  base_url := 'https://verify.gradiaflow.com/result/' || token;
  return base_url;
end;
$$;

-- RLS policies for new tables
alter table public.attendance_summary enable row level security;
drop policy if exists "attendance_summary_by_school" on public.attendance_summary;
create policy "attendance_summary_by_school" on public.attendance_summary
  for select to public
  using (
    current_user_role() = 'super_admin'
    or (current_user_role() = 'school_admin' and school_id = (select school_id from public.profiles where id = auth.uid()))
    or (current_user_role() = 'teacher' and class_id = (select class_id from public.teachers where profile_id = auth.uid()))
  );

alter table public.behaviour_evaluations enable row level security;
drop policy if exists "behaviour_evaluations_by_school" on public.behaviour_evaluations;
create policy "behaviour_evaluations_by_school" on public.behaviour_evaluations
  for all to public
  using (
    current_user_role() = 'super_admin'
    or (current_user_role() = 'school_admin' and school_id = (select school_id from public.profiles where id = auth.uid()))
    or (current_user_role() = 'teacher' and teacher_id = (select id from public.teachers where profile_id = auth.uid()))
  )
  with check (
    current_user_role() = 'super_admin'
    or (current_user_role() = 'school_admin' and school_id = (select school_id from public.profiles where id = auth.uid()))
    or (current_user_role() = 'teacher' and teacher_id = (select id from public.teachers where profile_id = auth.uid()))
  );

alter table public.result_reports enable row level security;
drop policy if exists "result_reports_by_school" on public.result_reports;
create policy "result_reports_by_school" on public.result_reports
  for select to public
  using (
    current_user_role() = 'super_admin'
    or (current_user_role() = 'school_admin' and school_id = (select school_id from public.profiles where id = auth.uid()))
    or (current_user_role() = 'teacher' and class_id = (select class_id from public.teachers where profile_id = auth.uid()))
    or (current_user_role() = 'parent' and student_id in (select id from public.students where parent_id in (select id from public.parents where profile_id = auth.uid())))
    or (current_user_role() = 'student' and student_id = (select student_id from public.profiles where id = auth.uid()))
  );
