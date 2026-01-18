-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Affiliate Platforms Table
create table if not exists public.affiliate_platforms (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- e.g., 'Coupang', 'Amazon', 'AliExpress'
  domains text[] not null, -- e.g., ['coupang.com', 'coupang.kr']
  type text not null check (type in ('param_injection', 'api_generation')), -- simple param or api call
  config jsonb not null default '{}'::jsonb, -- Store tags, api keys (encrypted ideally, or just RLS protected)
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Click Logs Table (Analytics)
create table if not exists public.click_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  item_id uuid references public.items(id),
  platform_id uuid references public.affiliate_platforms(id),
  original_url text,
  affiliate_url text,
  clicked_at timestamp with time zone default now()
);

-- 3. RLS Policies (Security)
alter table public.affiliate_platforms enable row level security;
alter table public.click_logs enable row level security;

-- Only Admins can VIEW/EDIT platforms (We will define 'admin' check later, for now allow authenticated implicit admin or strict)
-- For this MVP, let's assume we will add an 'is_admin' column to profiles or check user metadata.
-- For now, let's create a policy that might need adjustment based on how we define admin.
-- TEMPORARY: Allow ALL authenticated users to READ platforms (needed for Edge Function/Client to know what's active if not using Edge entirely?)
-- Actually, the Edge Function has service_role access, so it can read everything.
-- The Client (Admin Dashboard) needs read/write access.

-- Policy: Allow read access to authenticated users (for dashboard display if we want to show active platforms?)
-- Better: Only allow specific Admin UUIDs.
-- Let's create a placeholder policy. User should replace 'THEIR_ADMIN_UUID' or we handle via app logic.
create policy "Allow read access to authenticated users"
  on public.affiliate_platforms for select
  to authenticated
  using (true);

-- Policy: Click logs can be inserted by anyone (via Edge Function usually, but if client logs it)
-- If Edge Function inserts, it uses service_role.
-- If Client inserts, allow insert.
create policy "Allow insert access to authenticated users"
  on public.click_logs for insert
  to authenticated
  with check (auth.uid() = user_id);
