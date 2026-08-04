import { useState, type FormEvent } from "react";
import type { Habit, Period } from "../lib/types";
import type { HabitInput } from "../lib/api";
import { periodLabel } from "../lib/date";

const EMOJI_SUGGESTIONS = ["💧", "🏃", "📖", "💪", "😴", "🥗", "☀️", "🧘", "✍️", "🎯"];

interface Props {
  initial: Habit | null;
  busy: boolean;
  onSubmit: (input: HabitInput) => void;
  onClose: () => void;
}

export default function HabitForm({ initial, busy, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "✅");
  const [period, setPeriod] = useState<Period>(initial?.period ?? "daily");
  const [target, setTarget] = useState(initial?.target ?? 1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      emoji: emoji.trim() || "✅",
      period,
      target: Math.max(1, Math.floor(target) || 1),
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
          <div className="field">
            <label>每周期目标次数</label>
            <input
              type="number"
              min={1}
              max={999}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
