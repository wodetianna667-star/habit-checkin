import type { CheckinRow, Habit, HabitProgress, Period } from "./types";
import { addDays, parseDateStr, startOfPeriod, toDateStr } from "./date";

/** 某天所在周期的起始日（字符串） */
export function periodStartStr(dateStr: string, period: Period): string {
  return toDateStr(startOfPeriod(parseDateStr(dateStr), period));
}

/** habit_id -> date -> count */
function groupByHabitAndDate(checkins: CheckinRow[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const c of checkins) {
    let byDate = map.get(c.habit_id);
    if (!byDate) {
      byDate = new Map();
      map.set(c.habit_id, byDate);
    }
    byDate.set(c.date, (byDate.get(c.date) ?? 0) + c.count);
  }
  return map;
}

export function computeProgress(
  habits: Habit[],
  checkins: CheckinRow[],
  dayStr: string,
): HabitProgress[] {
  const map = groupByHabitAndDate(checkins);
  return habits.map((habit) => {
    const start = periodStartStr(dayStr, habit.period);
    const byDate = map.get(habit.id) ?? new Map<string, number>();
    let periodCount = 0;
    for (const [date, count] of byDate) {
      if (date >= start && date <= dayStr) periodCount += count;
    }
    const todayCount = byDate.get(dayStr) ?? 0;
    const completed = periodCount >= habit.target;
    // 今天达标：今天的打卡把周期累计首次推过目标
    const completedToday = completed && periodCount - todayCount < habit.target;
    return { habit, periodCount, todayCount, completed, completedToday };
  });
}

/**
 * 计算 [fromDayStr, toDayStr] 内每天的“完成习惯数”。
 * 每日习惯：当天次数达标；周/月习惯：当天累计首次达到周期目标。
 * 仅记录完成数 > 0 的日子。
 */
export function computeDayCompletionMap(
  habits: Habit[],
  checkins: CheckinRow[],
  fromDayStr: string,
  toDayStr: string,
): Map<string, number> {
  const map = groupByHabitAndDate(checkins);
  const result = new Map<string, number>();
  let cur = parseDateStr(fromDayStr);
  const end = parseDateStr(toDayStr);
  while (cur <= end) {
    const dayStr = toDateStr(cur);
    let completedCount = 0;
    for (const habit of habits) {
      const start = periodStartStr(dayStr, habit.period);
      const byDate = map.get(habit.id) ?? new Map<string, number>();
      let sum = 0;
      for (const [date, count] of byDate) {
        if (date >= start && date <= dayStr) sum += count;
      }
      if (sum >= habit.target) {
        const prevStr = toDateStr(addDays(cur, -1));
        let sumPrev = 0;
        if (prevStr >= start) {
          for (const [date, count] of byDate) {
            if (date >= start && date <= prevStr) sumPrev += count;
          }
        }
        if (sumPrev < habit.target) completedCount += 1;
      }
    }
    if (completedCount > 0) result.set(dayStr, completedCount);
    cur = addDays(cur, 1);
  }
  return result;
}

/** 连续打卡天数：从今天（或昨天）往前，每天至少完成 1 个习惯 */
export function computeStreak(dayCompletion: Map<string, number>, todayStrValue: string): number {
  const todayDone = (dayCompletion.get(todayStrValue) ?? 0) > 0;
  let cur = parseDateStr(todayStrValue);
  if (!todayDone) cur = addDays(cur, -1);
  let streak = 0;
  while ((dayCompletion.get(toDateStr(cur)) ?? 0) > 0) {
    streak += 1;
    cur = addDays(cur, -1);
  }
  return streak;
}
