import { useCallback, useEffect, useState } from "react";
import type { Habit } from "../lib/types";
import { createHabit, deleteHabit, fetchHabits, updateHabit, type HabitInput } from "../lib/api";
import { formatShortCN, periodLabel } from "../lib/date";
import HabitForm from "../components/HabitForm";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHabits(await fetchHabits());
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(h: Habit) {
    setEditing(h);
    setFormOpen(true);
  }

  async function handleSubmit(input: HabitInput) {
    setBusy(true);
    try {
      if (editing) await updateHabit(editing.id, input);
      else await createHabit(input);
      setFormOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(h: Habit) {
    if (!window.confirm(`确定删除「${h.name}」吗？它的打卡记录也会一并删除。`)) return;
    try {
      await deleteHabit(h.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败，请重试");
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2 className="page-title">我的习惯</h2>
        <button type="button" className="btn primary" onClick={openAdd}>
          + 添加
        </button>
      </div>
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
          <p className="muted">还没有习惯，点击右上角「+ 添加」创建一个吧。</p>
        </div>
      ) : (
        habits.map((h) => (
          <div className="card habit-manage-row" key={h.id}>
            <span className="habit-emoji">{h.emoji}</span>
            <div className="habit-info">
              <div className="habit-name">{h.name}</div>
              <div className="habit-meta">
                {h.type === "once"
                  ? `一次性 · ${h.end_date ? `截止 ${formatShortCN(h.end_date)}` : "未设截止"}`
                  : `${periodLabel(h.period)} · ${h.target} 次`}
                {h.reminder_enabled && ` · 提醒 ${h.reminder_time ?? ""}`}
              </div>
            </div>
            <div className="manage-actions">
              <button
                type="button"
                className="btn small"
                onClick={() => openEdit(h)}
              >
                编辑
              </button>
              <button
                type="button"
                className="btn small danger"
                onClick={() => void handleDelete(h)}
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}
      {formOpen && (
        <HabitForm
          initial={editing}
          busy={busy}
          onSubmit={(input) => void handleSubmit(input)}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
