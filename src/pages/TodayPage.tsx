import { useCallback, useEffect, useState } from "react";
import type { CheckinRow, Habit } from "../lib/types";
import {
  createHabit,
  fetchCheckins,
  fetchHabits,
  incrementCheckin,
  type HabitInput,
} from "../lib/api";
import { rangeStartStr, computeProgress } from "../lib/progress";
import { periodLabel, todayStr } from "../lib/date";
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
