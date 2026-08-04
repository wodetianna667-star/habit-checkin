-- 习惯打卡 v3：每个习惯支持多个提醒时间
-- 在 Supabase 控制台 -> SQL Editor 中执行本文件（现有项目）

alter table public.habits
  add column if not exists reminder_times text[];

-- 把旧的单个提醒时间迁移到新数组（如果有）
update public.habits
set reminder_times = array[reminder_time]
where reminder_times is null and reminder_enabled and reminder_time is not null;
