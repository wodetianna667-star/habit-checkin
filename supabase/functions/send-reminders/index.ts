// 习惯打卡：定时推送提醒
// 部署到 Supabase Edge Functions，并用「定时任务」每 5 分钟调用一次。
// 需要设置环境变量（Edge Functions -> Secrets）：
//   VAPID_PUBLIC_KEY=生成的公钥
//   VAPID_PRIVATE_KEY=生成的私钥
//   VAPID_SUBJECT=https://wodetianna667-star.github.io/habit-checkin/
// （SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 由 Supabase 自动注入）

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

const TZ = "Asia/Shanghai"; // 与用户时区一致

/** 获取上海时间的各字段 */
function localParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) {
    parts[p.type] = p.value;
  }
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const h = Number(parts.hour) % 24;
  const min = Number(parts.minute);
  const dateUtc = new Date(Date.UTC(y, m - 1, d, h, min));
  const isoWeekday = dateUtc.getUTCDay() === 0 ? 7 : dateUtc.getUTCDay();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${y}-${pad(m)}-${pad(d)}`;
  // 本周周一
  const weekStart = new Date(Date.UTC(y, m - 1, d - (isoWeekday - 1)));
  const weekStartStr = `${weekStart.getUTCFullYear()}-${pad(weekStart.getUTCMonth() + 1)}-${pad(weekStart.getUTCDate())}`;
  return {
    dateStr,
    weekStartStr,
    monthKey: `${y}-${pad(m)}`,
    isoWeekday,
    dayOfMonth: d,
    minutes: h * 60 + min,
  };
}

/** 根据习惯名称自动生成提醒文案（如「喝水」->「该喝水啦」） */
function defaultReminderMessage(name: string): string {
  const n = name.trim();
  if (!n) return "";
  if (n.endsWith("啦")) return n;
  return `该${n}啦`;
}

/** 提醒时间是否在当前 10 分钟窗口内（配合每 5 分钟定时） */
function inWindow(reminderTime: string, nowMinutes: number): boolean {
  const [h, m] = reminderTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const diff = nowMinutes - (h * 60 + m);
  return diff >= 0 && diff < 10;
}

Deno.serve(async (_req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }

  const now = localParts();
  const { data: habits, error: habitErr } = await sb
    .from("habits")
    .select("id,user_id,name,reminder_frequency,reminder_times,reminder_weekday,reminder_day,reminder_message")
    .eq("reminder_enabled", true);
  if (habitErr) {
    return new Response(JSON.stringify({ error: habitErr.message }), { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const habit of habits ?? []) {
    const times: string[] = habit.reminder_times ?? [];
    if (!times.length) continue;

    // 频率匹配检查
    let periodKey: string;
    if (habit.reminder_frequency === "weekly") {
      if (now.isoWeekday !== habit.reminder_weekday) continue;
      periodKey = now.weekStartStr;
    } else if (habit.reminder_frequency === "monthly") {
      if (now.dayOfMonth !== habit.reminder_day) continue;
      periodKey = now.monthKey;
    } else {
      periodKey = now.dateStr;
    }

    for (const time of times) {
      if (!inWindow(time, now.minutes)) continue;
      // 去重：push_sent 唯一约束 (user_id, habit_id, period_key, reminder_time)
      const { error: sentErr } = await sb.from("push_sent").insert({
        user_id: habit.user_id,
        habit_id: habit.id,
        period_key: periodKey,
        reminder_time: time,
      });
      if (sentErr) {
        skipped += 1; // 已发过或冲突
        continue;
      }

      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth")
        .eq("user_id", habit.user_id);

      const payload = JSON.stringify({
        title: "任务来了",
        body: habit.reminder_message?.trim() || defaultReminderMessage(habit.name),
        url: "https://wodetianna667-star.github.io/habit-checkin/",
      });

      for (const sub of subs ?? []) {
        if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
          errors.push("未配置 VAPID 密钥");
          break;
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          sent += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/410|404|gone|expired/i.test(msg)) {
            // 订阅失效，清理
            await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            errors.push(msg);
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checked: (habits ?? []).length, sent, skipped, errors: errors.slice(0, 10) }),
    { headers: { "Content-Type": "application/json" } },
  );
});
