export type Period = "daily" | "weekly" | "monthly";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  period: Period;
  target: number;
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
}
