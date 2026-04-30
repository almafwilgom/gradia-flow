-- Add term fees and resumption date to schools table
alter table public.schools add column if not exists current_term_fees numeric(12, 2) default 0;
alter table public.schools add column if not exists next_resumption_date date;

-- Update school overview view to include these
drop view if exists public.vw_school_overview cascade;
create or replace view public.vw_school_overview as
select
  s.id,
  s.name,
  s.school_code,
  s.status,
  s.demo_started_at,
  s.demo_expires_at,
  s.subscription_status,
  s.current_term_fees,
  s.next_resumption_date,
  s.created_at,
  (select count(*) from public.students st where st.school_id = s.id) as total_students,
  (select count(*) from public.classes c where c.school_id = s.id) as total_classes
from public.schools s;
