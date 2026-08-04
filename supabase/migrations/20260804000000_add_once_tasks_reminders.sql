-- 习惯打卡 v2：一次性任务 + 定时提醒
-- 在 Supabase 控制台 -> SQL Editor 中执行本文件（现有项目）

-- 任务类型：recurring=周期习惯（原有），once=一次性任务
alter table public.habits
  add column if not exists type text not null default 'recurring'
  check (type in ('recurring', 'once'));

-- 一次性任务的截止日期
alter table public.habits
  add column if not exists end_date date;

-- 提醒设置
alter table public.habits
  add column if not exists reminder_enabled boolean not null default false;
alter table public.habits
  add column if not exists reminder_frequency text
  check (reminder_frequency in ('daily', 'weekly', 'monthly'));
alter table public.habits
  add column if not exists reminder_time text;          -- HH:MM（24 小时制）
alter table public.habits
  add column if not exists reminder_weekday integer     -- 每周几（1=周一 .. 7=周日）
  check (reminder_weekday between 1 and 7);
alter table public.habits
  add column if not exists reminder_day integer         -- 每月几号（1-31）
  check (reminder_day between 1 and 31);
