-- 习惯打卡 v4：手机推送订阅
-- 在 Supabase 控制台 -> SQL Editor 中执行本文件（现有项目）

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- 推送去重记录（由 Edge Function 使用 service_role 写入，普通用户不可读写）
create table if not exists public.push_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  period_key text not null,
  reminder_time text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, habit_id, period_key, reminder_time)
);

create index if not exists push_sent_user_idx on public.push_sent (user_id);
alter table public.push_sent enable row level security;
