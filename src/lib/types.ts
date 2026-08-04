export type Period = "daily" | "weekly" | "monthly";
export type HabitType = "recurring" | "once";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  period: Period;
  target: number;
  /** recurring=周期习惯；once=一次性任务 */
  type: HabitType;
  /** 一次性任务的截止日期（YYYY-MM-DD） */
  end_date: string | null;
  reminder_enabled: boolean;
  reminder_frequency: Period | null;
  /** 提醒时间列表（HH:MM，24 小时制），可多个 */
  reminder_times: string[] | null;
  /** 每周几提醒（1=周一 .. 7=周日） */
  reminder_weekday: number | null;
  /** 每月几号提醒（1-31） */
  reminder_day: number | null;
  /** 专属提醒文案（如「该喝水啦」）；留空则用默认文案 */
  reminder_message: string | null;
  sort_order: number;
  created_at: string;
}

export interface CheckinRow {
  id: string;
  user_id: string;
  habit_id: string;
  /** YYYY-MM-DD（用户本地时区） */
  date: string;
  count: number;
  created_at: string;
}

export interface HabitProgress {
  habit: Habit;
  /** 当前周期内累计次数 */
  periodCount: number;
  /** 今天打卡次数 */
  todayCount: number;
  /** 本周期是否已达标 */
  completed: boolean;
  /** 是否今天达标（今天完成） */
  completedToday: boolean;
  /** 一次性任务是否已过期且未完成 */
  expired: boolean;
  /** 一次性任务的截止日期 */
  endDate: string | null;
  /** 一次性任务的剩余天数（含今天，负数=已过期） */
  daysLeft: number | null;
}
