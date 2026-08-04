import { useState, type FormEvent } from "react";
import type { Habit, HabitType, Period } from "../lib/types";
import type { HabitInput } from "../lib/api";
import { periodLabel } from "../lib/date";

const EMOJI_SUGGESTIONS = ["💧", "🏃", "📖", "💪", "😴", "🥗", "☀️", "🧘", "✍️", "🎯"];
const WEEKDAYS = [
  { v: 1, label: "周一" },
  { v: 2, label: "周二" },
  { v: 3, label: "周三" },
  { v: 4, label: "周四" },
  { v: 5, label: "周五" },
  { v: 6, label: "周六" },
  { v: 7, label: "周日" },
];

interface Props {
  initial: Habit | null;
  busy: boolean;
  onSubmit: (input: HabitInput) => void;
  onClose: () => void;
}

export default function HabitForm({ initial, busy, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "✅");
  const [type, setType] = useState<HabitType>(initial?.type ?? "recurring");
  const [period, setPeriod] = useState<Period>(initial?.period ?? "daily");
  const [target, setTarget] = useState(initial?.target ?? 1);
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [reminderOn, setReminderOn] = useState(initial?.reminder_enabled ?? false);
  const [reminderFreq, setReminderFreq] = useState<Period>(initial?.reminder_frequency ?? "daily");
  const [reminderTime, setReminderTime] = useState(initial?.reminder_time ?? "20:00");
  const [reminderWeekday, setReminderWeekday] = useState(initial?.reminder_weekday ?? 1);
  const [reminderDay, setReminderDay] = useState(initial?.reminder_day ?? 1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === "once" && !endDate) return;
    onSubmit({
      name: name.trim(),
      emoji: emoji.trim() || "✅",
      period,
      target: Math.max(1, Math.floor(target) || 1),
      type,
      end_date: type === "once" ? endDate || null : null,
      reminder_enabled: reminderOn,
      reminder_frequency: reminderOn ? reminderFreq : null,
      reminder_time: reminderOn ? reminderTime : null,
      reminder_weekday: reminderOn && reminderFreq === "weekly" ? reminderWeekday : null,
      reminder_day: reminderOn && reminderFreq === "monthly" ? reminderDay : null,
    });
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initial ? "编辑习惯" : "添加习惯"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：喝水"
              maxLength={20}
              autoFocus
            />
          </div>
          <div className="field">
            <label>图标</label>
            <div className="emoji-row">
              {EMOJI_SUGGESTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`emoji-pick${emoji === em ? " active" : ""}`}
                  onClick={() => setEmoji(em)}
                >
                  {em}
                </button>
              ))}
            </div>
            <input
              className="emoji-input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              placeholder="也可以直接输入 emoji"
            />
          </div>
          <div className="field">
            <label>类型</label>
            <div className="seg">
              <button
                type="button"
                className={`seg-btn${type === "recurring" ? " active" : ""}`}
                onClick={() => setType("recurring")}
              >
                周期习惯
              </button>
              <button
                type="button"
                className={`seg-btn${type === "once" ? " active" : ""}`}
                onClick={() => setType("once")}
              >
                一次性任务
              </button>
            </div>
          </div>

          {type === "recurring" ? (
            <div className="field">
              <label>周期</label>
              <div className="seg">
                {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`seg-btn${period === p ? " active" : ""}`}
                    onClick={() => setPeriod(p)}
                  >
                    {periodLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="field">
              <label>截止日期</label>
              <input
                type="date"
                value={endDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          )}

          <div className="field">
            <label>{type === "once" ? "目标次数（截止前完成几次）" : "每周期目标次数"}</label>
            <input
              type="number"
              min={1}
              max={999}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label className="reminder-toggle-label">
              <span>定时提醒</span>
              <button
                type="button"
                role="switch"
                aria-checked={reminderOn}
                className={`switch${reminderOn ? " on" : ""}`}
                onClick={() => setReminderOn((v) => !v)}
              />
            </label>
            {reminderOn && (
              <div className="reminder-config">
                <div className="seg">
                  {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`seg-btn${reminderFreq === p ? " active" : ""}`}
                      onClick={() => setReminderFreq(p)}
                    >
                      {periodLabel(p)}
                    </button>
                  ))}
                </div>
                <div className="reminder-time-row">
                  {reminderFreq === "weekly" && (
                    <select value={reminderWeekday} onChange={(e) => setReminderWeekday(Number(e.target.value))}>
                      {WEEKDAYS.map((w) => (
                        <option key={w.v} value={w.v}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {reminderFreq === "monthly" && (
                    <select value={reminderDay} onChange={(e) => setReminderDay(Number(e.target.value))}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d} 号
                        </option>
                      ))}
                    </select>
                  )}
                  <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={busy || !name.trim() || (type === "once" && !endDate)}
            >
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
