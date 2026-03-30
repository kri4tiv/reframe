-- ─── REFRAME — Supabase Migration ────────────────────────────────────────
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  free_gens_used  int          not null default 0,
  has_api_key     boolean      not null default false,
  api_key_enc     text,
  total_generations int        not null default 0,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Service role can do everything (for server-side operations)
create policy "profiles: service all" on public.profiles using (true) with check (true);

-- ─── Generations ──────────────────────────────────────────────────────────
create table if not exists public.generations (
  id          uuid         primary key default uuid_generate_v4(),
  user_id     uuid         references public.profiles(id) on delete set null,
  session_id  text         not null,
  formats     text[]       not null default '{}',
  source_hash text,
  status      text         not null default 'done',
  created_at  timestamptz  not null default now()
);

alter table public.generations enable row level security;

create policy "generations: own read" on public.generations for select using (auth.uid() = user_id);
create policy "generations: service all" on public.generations using (true) with check (true);

create index idx_generations_user_id   on public.generations(user_id);
create index idx_generations_session   on public.generations(session_id);
create index idx_generations_created   on public.generations(created_at desc);

-- ─── Free Generations (fingerprint tracking) ──────────────────────────────
create table if not exists public.free_generations (
  fingerprint text        primary key,
  count       int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.free_generations enable row level security;

-- Only service role can access (no direct client access)
create policy "free_gens: service only" on public.free_generations using (false);

-- ─── RPC: Auto-create profile on signup ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── RPC: Increment free gens on account ─────────────────────────────────
create or replace function public.increment_free_gens(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set free_gens_used     = free_gens_used + 1,
      total_generations  = total_generations + 1,
      updated_at         = now()
  where id = user_id;
end;
$$;

-- ─── RPC: Increment total generations ────────────────────────────────────
create or replace function public.increment_total_gens(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set total_generations = total_generations + 1,
      updated_at        = now()
  where id = user_id;
end;
$$;
