import { useEffect, useState } from "react";
import type { CheckinRow, Habit } from "../lib/types";
import { fetchCheckins, fetchHabits } from "../lib/api";
import {
  addDays,
  addMonths,
  daysInMonth,
  isSameDay,
  startOfMonth,
  today,
  toDateStr,
} from "../lib/date";
import { computeDayCompletionMap, computeStreak } from "../lib/progress";

const WEEK_HEADERS = ["一", "二", "三", "四", "五", "六", "日"];

export default function HistoryPage() {
  const [month, setMonth] = useState(() => startOfMonth(today()));
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const todayD = today();
  const monthStart = startOfMonth(month);
  const monthEnd = addDays(addMonths(month, 1), -1);
  const back400 = addDays(todayD, -400);
  const winStartD = addDays(monthStart < back400 ? monthStart : back400, -31);
  const winEnd = monthEnd > todayD ? monthEnd : todayD;
  const fromStr = toDateStr(winStartD);
  const toStr = toDateStr(winEnd);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const h = await fetchHabits();
        if (cancelled) return;
        setHabits(h);
        if (h.length) {
          const rows = await fetchCheckins(fromStr, toStr);
          if (!cancelled) setCheckins(rows);
        } else if (!cancelled) {
          setCheckins([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败，请重试");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, fromStr, toStr, refreshKey]);

  const dayMap = habits.length
    ? computeDayCompletionMap(habits, checkins, fromStr, toStr)
    : new Map<string, number>();
  const streak = computeStreak(dayMap, toDateStr(todayD));

  const total = daysInMonth(month);
  const offset = (monthStart.getDay() + 6) % 7;
  const monthFromStr = toDateStr(monthStart);
  const monthToStr = toDateStr(monthEnd);
  let monthDoneDays = 0;

  const cells: { dayNum: number; dateStr: string; count: number; isToday: boolean }[] = [];
  for (let i = 0; i < offset + total; i++) {
    const dayNum = i - offset + 1;
    if (dayNum < 1) {
      cells.push({ dayNum: 0, dateStr: "", count: 0, isToday: false });
      continue;
    }
    const d = addDays(monthStart, dayNum - 1);
    const dateStr = toDateStr(d);
    const count = dayMap.get(dateStr) ?? 0;
    if (count > 0 && dateStr >= monthFromStr && dateStr <= monthToStr) monthDoneDays += 1;
    cells.push({ dayNum, dateStr, count, isToday: isSameDay(d, todayD) });
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2 className="page-title">历史记录</h2>
        <div className="month-nav">
          <button
            type="button"
            className="btn-round small"
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="上个月"
          >
            ‹
          </button>
          <span className="month-label">
            {month.getFullYear()}年{month.getMonth() + 1}月
          </span>
          <button
            type="button"
            className="btn-round small"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="下个月"
            disabled={isSameDay(monthStart, startOfMonth(todayD))}
          >
            ›
          </button>
        </div>
      </div>
      {loading ? (
        <p className="muted center pad">加载中…</p>
      ) : error ? (
        <div className="card error-card">
          <p>{error}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setMonth(startOfMonth(today()));
              setRefreshKey((k) => k + 1);
            }}
          >
            重试
          </button>
        </div>
      ) : habits.length === 0 ? (
        <div className="card empty-card">
          <p className="muted">还没有习惯，先去「习惯」页添加吧。</p>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-num">{streak}</div>
              <div className="stat-label">连续打卡（天）</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{monthDoneDays}</div>
              <div className="stat-label">本月完成（天）</div>
            </div>
          </div>
          <div className="calendar card">
            <div className="cal-head">
              {WEEK_HEADERS.map((w) => (
                <div key={w} className="cal-head-cell">
                  {w}
                </div>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((c, idx) =>
                c.dayNum === 0 ? (
                  <div key={idx} className="cal-cell empty" />
                ) : (
                  <div
                    key={idx}
                    className={`cal-cell${c.count > 0 ? " done" : ""}${c.isToday ? " today" : ""}`}
                  >
                    <span className="day-num">{c.dayNum}</span>
                    {c.count > 0 && <span className="cell-count">{c.count}</span>}
                  </div>
                ),
              )}
            </div>
          </div>
          <p className="muted small center">格子里的小数字 = 当天完成的习惯数</p>
        </>
      )}
    </div>
  );
}
