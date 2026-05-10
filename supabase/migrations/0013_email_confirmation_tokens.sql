create extension if not exists "pgcrypto";

create table if not exists public.email_confirmation_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  full_name text not null,
  school_name text not null,
  expires_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_confirmation_tokens_email_idx
  on public.email_confirmation_tokens (lower(email));

create unique index if not exists email_confirmation_tokens_pending_email_idx
  on public.email_confirmation_tokens (lower(email))
  where consumed_at is null;
