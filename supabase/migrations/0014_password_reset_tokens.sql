create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id);

create index if not exists password_reset_tokens_email_idx
  on public.password_reset_tokens (lower(email));

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens (expires_at);
