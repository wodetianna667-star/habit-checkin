import type { Period } from "./types";

/** 输出本地时区 YYYY-MM-DD */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 解析 YYYY-MM-DD 为本地正午时间，避免时区/夏令时边界问题 */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** 今天（本地正午） */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

export function todayStr(): string {
  return toDateStr(today());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
}

/** 周一为一周的第一天 */
export function startOfWeek(d: Date): Date {
  const diff = (d.getDay() + 6) % 7;
  return addDays(d, -diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).getDate();
}

export function startOfPeriod(d: Date, period: Period): Date {
  if (period === "daily") return d;
  if (period === "weekly") return startOfWeek(d);
  return startOfMonth(d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 周一 -> 周一 */
export function weekdayLabelCN(d: Date): string {
  return "日一二三四五六"[d.getDay()];
}

export function periodLabel(period: Period): string {
  if (period === "daily") return "每日";
  if (period === "weekly") return "每周";
  return "每月";
}
