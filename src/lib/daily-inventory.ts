import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Staff who can record the daily inventory. */
export const STAFF_NAMES = ["Hussain", "Bhargav"] as const;

/** Items counted at the start (login) and end (logout) of a shift. */
export const DAILY_ITEMS = [
  "Fries",
  "Chicken Nuggets",
  "Peri Peri Masala",
  "Veg Nuggets",
  "Butter",
  "Popcorn",
  "Paneer",
  "Chicken",
  "Veg Patty",
  "Chicken Patty",
  "Pizza Base",
  "Burger Buns",
  "Sandwich Bread",
  "Eggs",
  "Jam",
  "Milk Maid",
  "Buns",
  "Other items",
] as const;

export type ShiftType = "LOGIN" | "LOGOUT";

export type DailyInventoryEntry = { name: string; qty: number; unit?: string | null };

export type DailyInventoryLog = {
  id: string;
  staff_name: string;
  shift_type: ShiftType;
  items: DailyInventoryEntry[];
  note: string | null;
  created_at: string;
};

const sb = supabase as unknown as {
  from: (t: string) => any;
};

export async function saveDailyInventory(input: {
  staffName: string;
  shiftType: ShiftType;
  items: DailyInventoryEntry[];
  note?: string | null;
}) {
  const { error } = await sb.from("daily_inventory_logs").insert({
    staff_name: input.staffName,
    shift_type: input.shiftType,
    items: input.items,
    note: input.note ?? null,
  });
  if (error) throw new Error((error as { message?: string }).message ?? "Could not save");
}

export async function deleteDailyInventory(id: string) {
  const { error } = await sb.from("daily_inventory_logs").delete().eq("id", id);
  if (error) throw new Error((error as { message?: string }).message ?? "Could not delete");
}

export function useDailyInventoryLogs() {
  const [logs, setLogs] = useState<DailyInventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await sb
      .from("daily_inventory_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (!error && data) setLogs(data as DailyInventoryLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { logs, loading, refresh: load };
}
