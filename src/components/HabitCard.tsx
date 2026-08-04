import type { HabitProgress } from "../lib/types";
import { periodLabel } from "../lib/date";

interface Props {
  progress: HabitProgress;
  onIncrement: (habitId: string, delta: number) => void;
}

export default function HabitCard({ progress, onIncrement }: Props) {
  const { habit, periodCount, todayCount, completed, completedToday } = progress;
  const pct = Math.min(100, Math.round((periodCount / habit.target) * 100));
  const canMinus = todayCount > 0;

  return (
    <div className={`habit-card${completed ? " done" : ""}`}>
      <div className="habit-top">
        <span className="habit-emoji">{habit.emoji}</span>
        <div className="habit-info">
          <div className="habit-name-row">
            <span className="habit-name">{habit.name}</span>
            {completed && <span className="badge badge-done">✓ 达标</span>}
            {completedToday && <span className="badge badge-today">今天完成</span>}
          </div>
          <div className="habit-meta">
            {periodLabel(habit.period)} · 目标 {habit.target} 次
          </div>
        </div>
        <div className="habit-actions">
          {canMinus && (
            <button
              type="button"
              className="btn-round minus"
              onClick={() => onIncrement(habit.id, -1)}
              aria-label="撤销一次"
            >
              −
            </button>
          )}
          <button
            type="button"
            className={`btn-round plus${completed ? " done" : ""}`}
            onClick={() => onIncrement(habit.id, 1)}
            aria-label="打卡一次"
          >
            +
          </button>
        </div>
      </div>
      <div className="habit-bottom">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="habit-count">
          {periodCount}
          <span className="muted">/{habit.target}</span>
        </div>
      </div>
    </div>
  );
}
