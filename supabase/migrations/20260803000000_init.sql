-- 习惯打卡：初始化迁移
-- 在 Supabase 控制台 -> SQL Editor 中执行本文件

-- gen_random_uuid 依赖（Supabase 项目默认已启用）
create extension if not exists pgcrypto;

-- 习惯表
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  emoji text not null default '✅',
  period text not null default 'daily' check (period in ('daily', 'weekly', 'monthly')),
  target integer not null default 1 check (target between 1 and 999),
  type text not null default 'recurring' check (type in ('recurring', 'once')),
  end_date date,
  reminder_enabled boolean not null default false,
  reminder_frequency text check (reminder_frequency in ('daily', 'weekly', 'monthly')),
  reminder_time text,
  reminder_weekday integer check (reminder_weekday between 1 and 7),
  reminder_day integer check (reminder_day between 1 and 31),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 打卡表：(user_id, habit_id, date) 唯一，upsert 累计
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  count integer not null default 1 check (count >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

create index if not exists habits_user_idx on public.habits (user_id);
create index if not exists checkins_user_date_idx on public.checkins (user_id, date);
create index if not exists checkins_habit_idx on public.checkins (habit_id);

-- 行级安全：每个人只能读写自己的数据
alter table public.habits enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

drop policy if exists "checkins_select_own" on public.checkins;
create policy "checkins_select_own" on public.checkins for select using (auth.uid() = user_id);
drop policy if exists "checkins_insert_own" on public.checkins;
create policy "checkins_insert_own" on public.checkins for insert with check (auth.uid() = user_id);
drop policy if exists "checkins_update_own" on public.checkins;
create policy "checkins_update_own" on public.checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "checkins_delete_own" on public.checkins;
create policy "checkins_delete_own" on public.checkins for delete using (auth.uid() = user_id);

-- 打卡累计 RPC：+1/-1 原子操作，自动处理首条插入与归零删除
create or replace function public.increment_checkin(p_habit_id uuid, p_date date, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then
    raise exception '未登录';
  end if;

  -- 校验习惯归属，防止越权操作他人数据
  select user_id into v_owner
  from public.habits
  where id = p_habit_id;

  if v_owner is null then
    raise exception '习惯不存在';
  end if;
  if v_owner <> v_uid then
    raise exception '无权操作该习惯';
  end if;

  if p_delta > 0 then
    insert into public.checkins (user_id, habit_id, date, count)
    values (v_uid, p_habit_id, p_date, p_delta)
    on conflict (user_id, habit_id, date)
    do update set count = public.checkins.count + excluded.count;
  else
    update public.checkins
    set count = count + p_delta
    where user_id = v_uid and habit_id = p_habit_id and date = p_date;
    delete from public.checkins
    where user_id = v_uid and habit_id = p_habit_id and date = p_date
      and count <= 0;
  end if;
end;
$$;

revoke all on function public.increment_checkin(uuid, date, integer) from public;
grant execute on function public.increment_checkin(uuid, date, integer) to authenticated;
