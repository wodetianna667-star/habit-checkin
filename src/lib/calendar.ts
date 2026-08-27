import type { Habit } from "./types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 转成 iCalendar 浮动本地时间（不带时区，手机日历按本地时间导入） */
function toIcsTime(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function icsEscape(s: string): string {
  return s.replace(/[\\,;]/g, "\\$&").replace(/\n/g, "\\n");
}

let uidSeq = 0;
function uid(): string {
  uidSeq += 1;
  return `21tian-${Date.now()}-${uidSeq}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 生成习惯提醒的 iCalendar(.ics) 内容 */
export function buildRemindersIcs(habits: Habit[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//21tian//habit reminders//CN",
    "CALSCALE:GREGORIAN",
  ];
  const today = new Date();

  for (const h of habits) {
    if (!h.reminder_enabled || !h.reminder_times?.length) continue;
    const msg = h.reminder_message?.trim() || `该${h.name}啦`;
    const times = h.reminder_times.filter((t): t is string => Boolean(t));
    for (const t of times) {
      const [hh, mm] = t.split(":").map(Number);
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

      let start: Date;
      let rrule = "";
      if (h.type === "once" && h.end_date) {
        const [y, m, d] = h.end_date.split("-").map(Number);
        start = new Date(y, m - 1, d, hh, mm, 0);
      } else if (h.reminder_frequency === "weekly" && h.reminder_weekday) {
        const weekday = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][h.reminder_weekday - 1] ?? "MO";
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm, 0);
        rrule = `RRULE:FREQ=WEEKLY;BYDAY=${weekday}`;
      } else if (h.reminder_frequency === "monthly" && h.reminder_day) {
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm, 0);
        rrule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${h.reminder_day}`;
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm, 0);
        rrule = "RRULE:FREQ=DAILY";
      }

      const end = new Date(start.getTime() + 60 * 1000);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid()}`);
      lines.push(`DTSTART:${toIcsTime(start)}`);
      lines.push(`DTEND:${toIcsTime(end)}`);
      lines.push(`SUMMARY:${icsEscape(msg)}`);
      lines.push(`DESCRIPTION:${icsEscape(`21天习惯打卡：${h.name}`)}`);
      if (rrule) lines.push(rrule);
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT0S", `DESCRIPTION:${icsEscape(msg)}`, "END:VALARM");
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** 生成并下载 .ics 文件 */
export function downloadRemindersIcs(habits: Habit[]): void {
  const content = buildRemindersIcs(habits);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "21tian-reminders.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 统计开启了提醒的习惯数量（用于按钮状态） */
export function countReminderHabits(habits: Habit[]): number {
  return habits.filter((h) => h.reminder_enabled && h.reminder_times?.length).length;
}
