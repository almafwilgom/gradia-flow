alter table public.schools add column if not exists current_session_year text;
alter table public.schools add column if not exists current_term text default 'Term 1';

update public.schools
set current_term = coalesce(current_term, 'Term 1')
where current_term is null;
