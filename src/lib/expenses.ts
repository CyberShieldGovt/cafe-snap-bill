import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory = "chef" | "grocery" | "vegetables" | "chicken" | "milk";
export type ChefName = "Hussain" | "Raju";
export type PayType = "daily" | "monthly";

export type Expense = {
  id: string;
  category: ExpenseCategory;
  subcategory: string | null;
  pay_type: PayType | null;
  quantity: number | null;
  unit: string | null;
  amount: number;
  note: string | null;
  spent_at: string;
  created_at: string;
};

const sb = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }> };
    insert: (row: unknown) => Promise<{ error: unknown }>;
    delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
  };
  channel: (name: string) => {
    on: (event: string, filter: unknown, cb: (payload: unknown) => void) => { subscribe: () => unknown };
  };
  removeChannel: (ch: unknown) => void;
};

export async function addExpense(e: Omit<Expense, "id" | "created_at" | "spent_at"> & { spent_at?: string }) {
  const row = {
    ...e,
    spent_at: e.spent_at ?? new Date().toISOString(),
  };
  const { error } = await sb.from("expenses").insert(row);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export function useExpenses() {
  const [list, setList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await sb.from("expenses").select("*").order("spent_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) setList(data as Expense[]);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("expenses_rt")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "expenses" },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { list, loading };
}
