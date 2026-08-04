import type { CheckinRow, Habit, HabitType, Period } from "./types";
import { getSupabase } from "./supabase";

export async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await getSupabase()
    .from("habits")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Habit[];
}

export interface HabitInput {
  name: string;
  emoji: string;
  period: Period;
  target: number;
  type: HabitType;
  end_date: string | null;
  reminder_enabled: boolean;
  reminder_frequency: Period | null;
  reminder_times: string[] | null;
  reminder_weekday: number | null;
  reminder_day: number | null;
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  const { data, error } = await getSupabase()
    .from("habits")
    .insert({ ...input, sort_order: 0, user_id: user?.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Habit;
}

export async function updateHabit(id: string, patch: Partial<HabitInput>): Promise<void> {
  const { error } = await getSupabase().from("habits").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await getSupabase().from("habits").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchCheckins(fromDate: string, toDate: string): Promise<CheckinRow[]> {
  const { data, error } = await getSupabase()
    .from("checkins")
    .select("*")
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) throw new Error(error.message);
  return (data ?? []) as CheckinRow[];
}

/** 打卡 +1 / -1（通过 RPC 原子累计） */
export async function incrementCheckin(habitId: string, date: string, delta: number): Promise<void> {
  const { error } = await getSupabase().rpc("increment_checkin", {
    p_habit_id: habitId,
    p_date: date,
    p_delta: delta,
  });
  if (error) throw new Error(error.message);
}
