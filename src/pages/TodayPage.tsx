import { useCallback, useEffect, useState } from "react";
import type { CheckinRow, Habit } from "../lib/types";
import {
  createHabit,
  fetchCheckins,
  fetchHabits,
  incrementCheckin,
  type HabitInput,
} from "../lib/api";
import { rangeStartStr, computeProgress, computeDayCompletionMap } from "../lib/progress";
import { periodLabel, todayStr, startOfWeek, toDateStr, daysBetween, formatShortCN } from "../lib/date";
import { showBrowserNotification, useReminders } from "../lib/reminders";
import HabitCard from "../components/HabitCard";

const EXAMPLES: HabitInput[] = [
  { name: "喝水", emoji: "💧", period: "daily", target: 8, type: "recurring", end_date: null, reminder_enabled: false, reminder_frequency: null, reminder_times: null, reminder_weekday: null, reminder_day: null, reminder_message: "该喝水啦" },
  { name: "运动", emoji: "🏃", period: "weekly", target: 3, type: "recurring", end_date: null, reminder_enabled: false, reminder_frequency: null, reminder_times: null, reminder_weekday: null, reminder_day: null, reminder_message: "该运动啦" },
  { name: "读书", emoji: "📖", period: "daily", target: 1, type: "recurring", end_date: null, reminder_enabled: false, reminder_frequency: null, reminder_times: null, reminder_weekday: null, reminder_day: null, reminder_message: "该读书啦" },
];

export default function TodayPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await fetchHabits();
      setHabits(h);
      if (h.length) {
        const dayStr = todayStr();
        const starts = h.map((it) => rangeStartStr(it, dayStr));
        const minStart = starts.reduce((a, b) => (a < b ? a : b));
        setCheckins(await fetchCheckins(minStart, dayStr));
      } else {
        setCheckins([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 提醒 toast 自动消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleReminder = useCallback((message: string) => {
    setToast(message);
    showBrowserNotification(message);
  }, []);

  const progress = computeProgress(habits, checkins, todayStr());
  useReminders(
    progress.map((p) => p.habit),
    handleReminder,
  );

  async function handleIncrement(habitId: string, delta: number) {
    const date = todayStr();
    try {
      await incrementCheckin(habitId, date, delta);
      setCheckins((prev) => {
        const idx = prev.findIndex((c) => c.habit_id === habitId && c.date === date);
        if (idx === -1) {
          if (delta <= 0) return prev;
          const row: CheckinRow = {
            id: `local-${habitId}-${date}`,
            user_id: "",
            habit_id: habitId,
            date,
            count: delta,
            created_at: "",
          };
          return [...prev, row];
        }
        const next = prev.slice();
        const row = { ...next[idx] };
        row.count += delta;
        if (row.count <= 0) next.splice(idx, 1);
        else next[idx] = row;
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "打卡失败，请重试");
    }
  }

  async function handleAddExample(input: HabitInput) {
    setBusy(true);
    try {
      await createHabit(input);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "添加失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  const completedToday = progress.filter((p) => p.completedToday).length;
  const allDone = habits.length > 0 && progress.every((p) => p.completed || p.expired);

  // 本周完成情况统计（周一到今天）
  const dayStr = todayStr();
  const weekStartDate = startOfWeek(new Date());
  const weekStartStr = toDateStr(weekStartDate);
  const weekCount = checkins
    .filter((c) => c.date >= weekStartStr && c.date <= dayStr)
    .reduce((s, c) => s + c.count, 0);
  const weekDayMap = computeDayCompletionMap(habits, checkins, weekStartStr, dayStr);
  const weekDaysDone = weekDayMap.size;
  const weekDaysTotal = daysBetween(weekStartStr, dayStr) + 1;

  // 本周目标：每日习惯按天累计，每周习惯按整周目标，每月习惯按比例折算
  const daysInCurMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const weekTargetFor = (h: Habit): number => {
    if (h.type === "once") return 0;
    if (h.period === "daily") return h.target * weekDaysTotal;
    if (h.period === "weekly") return h.target;
    return Math.round((h.target * weekDaysTotal) / daysInCurMonth);
  };
  const weekTarget = habits.reduce((s, h) => s + weekTargetFor(h), 0);
  const weekCompletedFor = (h: Habit): boolean => {
    if (h.type === "once") return false;
    const sum = checkins
      .filter((c) => c.habit_id === h.id && c.date >= weekStartStr && c.date <= dayStr)
      .reduce((s, c) => s + c.count, 0);
    if (h.period === "daily") return sum >= h.target * weekDaysTotal;
    return sum >= h.target;
  };
  const weekTotalHabits = habits.filter((h) => h.type !== "once").length;
  const weekDoneHabits = habits.filter((h) => h.type !== "once" && weekCompletedFor(h)).length;
  const pct = (done: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="page">
      {loading ? (
        <p className="muted center pad">加载中…</p>
      ) : error ? (
        <div className="card error-card">
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => void load()}>
            重试
          </button>
        </div>
      ) : habits.length === 0 ? (
        <div className="card empty-card">
          <h2>还没有习惯</h2>
          <p className="muted">添加你想坚持的习惯或一次性任务，然后每天来打卡吧。</p>
          <div className="example-list">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => void handleAddExample(ex)}
              >
                {ex.emoji} {ex.name} · {periodLabel(ex.period)} {ex.target} 次
              </button>
            ))}
          </div>
          <p className="muted small">也可以到下方「习惯」页自行添加（支持一次性任务和定时提醒）</p>
        </div>
      ) : (
        <>
          <div className="summary">
            <div>
              <div className="summary-label">今日已完成</div>
              <div className="summary-num">
                {completedToday}
                <span className="summary-total"> / {habits.length} 项</span>
              </div>
            </div>
            <div className="summary-right">
              {allDone ? (
                <span className="summary-done">全部完成 🎉</span>
              ) : (
                <span className="summary-tip">继续加油 💪</span>
              )}
            </div>
          </div>
          <div className="card week-summary">
            <div className="week-summary-head">
              <span className="week-summary-title">📅 本周完成情况</span>
              <span className="muted small">
                {formatShortCN(weekStartStr)} – {formatShortCN(dayStr)}
              </span>
            </div>
            <div className="week-row">
              <div className="week-row-top">
                <span className="week-row-label">本周打卡</span>
                <span className="week-row-num">
                  {weekCount} / {weekTarget} 次
                </span>
              </div>
              <div className="week-bar">
                <div className="week-bar-fill" style={{ width: `${pct(weekCount, weekTarget)}%` }} />
              </div>
            </div>
            <div className="week-row">
              <div className="week-row-top">
                <span className="week-row-label">本周坚持</span>
                <span className="week-row-num">
                  {weekDaysDone} / {weekDaysTotal} 天
                </span>
              </div>
              <div className="week-bar">
                <div className="week-bar-fill" style={{ width: `${pct(weekDaysDone, weekDaysTotal)}%` }} />
              </div>
            </div>
            <div className="week-row">
              <div className="week-row-top">
                <span className="week-row-label">达标习惯</span>
                <span className="week-row-num">
                  {weekDoneHabits} / {weekTotalHabits} 个
                </span>
              </div>
              <div className="week-bar">
                <div className="week-bar-fill" style={{ width: `${pct(weekDoneHabits, weekTotalHabits)}%` }} />
              </div>
            </div>
          </div>
          {progress.map((p) => (
            <HabitCard
              key={p.habit.id}
              progress={p}
              onIncrement={(id, delta) => void handleIncrement(id, delta)}
            />
          ))}
        </>
      )}
      {toast && (
        <div className="toast">
          <span>{toast}</span>
          <button type="button" className="toast-close" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
