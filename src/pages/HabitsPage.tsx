import { useCallback, useEffect, useState } from "react";
import type { Habit } from "../lib/types";
import { createHabit, deleteHabit, fetchHabits, updateHabit, type HabitInput } from "../lib/api";
import { formatShortCN, periodLabel } from "../lib/date";
import HabitForm from "../components/HabitForm";
import PushSettings from "../components/PushSettings";
import { countReminderHabits, downloadRemindersIcs } from "../lib/calendar";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exporting, setExporting] = useState(false);

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

  async function handleExport() {
    if (countReminderHabits(habits) === 0) {
      alert("还没有开启定时提醒的习惯。请先点习惯的「编辑」→ 打开「定时提醒」并设置时间，再导出日历。");
      return;
    }
    setExporting(true);
    try {
      const r = await downloadRemindersIcs(habits);
      setExportMsg(
        r.usedShare
          ? "已生成日历文件！请在弹出的分享面板里选择「日历」或「文件管理」打开并导入。"
          : "已生成 21tian-reminders.ics，请用手机日历打开并导入 👇",
      );
      setExported(true);
      setTimeout(() => setExported(false), 10000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "导出失败，请重试");
    } finally {
      setExporting(false);
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
      <PushSettings />
      <div className="card push-card">
        <h3>📅 日历提醒</h3>
        <p className="muted small">
          把习惯的提醒时间导出为日历文件，导入手机「日历」后到点会响铃提醒。不依赖谷歌服务，红米日历直接支持。
        </p>
        <button
          type="button"
          className="btn primary"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          {exporting ? "生成中…" : "导出日历文件 (.ics)"}
        </button>
        {exported && <p className="ok-text">{exportMsg}</p>}
        {countReminderHabits(habits) === 0 && (
          <p className="muted small">当前没有开启定时提醒的习惯。先点习惯「编辑」→ 打开「定时提醒」设置时间，再导出。</p>
        )}
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
                {h.reminder_enabled && h.reminder_times?.length && ` · 提醒 ${h.reminder_times.join("、")}`}
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
