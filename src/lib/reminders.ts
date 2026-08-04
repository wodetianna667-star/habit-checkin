import { useEffect, useRef } from "react";
import type { Habit } from "./types";
import { isoWeekday, nowTimeStr, startOfMonth, startOfWeek, toDateStr, todayStr } from "./date";

const SHOWN_PREFIX = "habit-reminder-shown-";

/**
 * 判断某提醒时间是否到点。返回一个周期内的唯一 key（用于去重），未到点返回 null。
 * daily  -> d-<日期>
 * weekly -> w-<本周周一日期>
 * monthly-> m-<本月1日>
 */
function dueKey(habit: Habit, time: string): string | null {
  const now = new Date();
  if (nowTimeStr() < time) return null;
  if (habit.reminder_frequency === "weekly") {
    if (isoWeekday(now) !== habit.reminder_weekday) return null;
    return `w-${toDateStr(startOfWeek(now))}`;
  }
  if (habit.reminder_frequency === "monthly") {
    if (now.getDate() !== habit.reminder_day) return null;
    return `m-${toDateStr(startOfMonth(now))}`;
  }
  return `d-${todayStr()}`;
}

/** 根据习惯名称自动生成提醒文案（如「喝水」->「该喝水啦」） */
export function defaultReminderMessage(name: string): string {
  const n = name.trim();
  if (!n) return "";
  if (n.endsWith("啦")) return n;
  return `该${n}啦`;
}

function reminderMessage(habit: Habit): string {
  if (habit.reminder_message?.trim()) return habit.reminder_message.trim();
  if (habit.type === "once") {
    return `「${habit.name}」记得完成哦，别让它过期啦`;
  }
  return defaultReminderMessage(habit.name);
}

export function showBrowserNotification(message: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification("任务来了", { body: message });
  } else if (Notification.permission === "default") {
    void Notification.requestPermission().then((p) => {
      if (p === "granted") new Notification("任务来了", { body: message });
    });
  }
}

/**
 * 检查已开启提醒的习惯是否到点（支持每个习惯多个提醒时间）；
 * 到点则触发回调并记录，避免重复提醒。页面打开期间每分钟检查一次。
 */
export function useReminders(habits: Habit[], onFire: (message: string) => void) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      for (const habit of habits) {
        if (!habit.reminder_enabled || !habit.reminder_times?.length) continue;
        for (const time of habit.reminder_times) {
          if (!time) continue;
          const key = dueKey(habit, time);
          if (!key) continue;
          const storageKey = SHOWN_PREFIX + habit.id + "-" + key + "-" + time;
          if (firedRef.current.has(storageKey)) continue;
          let shown = false;
          try {
            shown = localStorage.getItem(storageKey) === "1";
          } catch {
            /* ignore */
          }
          if (shown) {
            firedRef.current.add(storageKey);
            continue;
          }
          firedRef.current.add(storageKey);
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            /* ignore */
          }
          onFire(reminderMessage(habit));
        }
      }
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [habits, onFire]);
}
