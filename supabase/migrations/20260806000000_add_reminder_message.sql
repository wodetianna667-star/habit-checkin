-- 习惯打卡 v5：每个习惯可设置专属提醒文案
-- 在 Supabase 控制台 -> SQL Editor 中执行本文件（现有项目）

alter table public.habits
  add column if not exists reminder_message text;

comment on column public.habits.reminder_message is '自定义提醒文案，如「该喝水啦」；留空则使用默认文案';
