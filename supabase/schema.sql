-- Lanternly schema. Run once in the Supabase SQL editor.
-- All reads and writes happen on the server with the secret key, so RLS is
-- enabled with NO public policies: the publishable key can't read or write these tables.

create table if not exists public.reports (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete set null,
  question text not null check (char_length(question) <= 400),
  message jsonb not null,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);

create table if not exists public.runs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists runs_created_idx on public.runs (created_at desc);

alter table public.reports enable row level security;
alter table public.runs enable row level security;
