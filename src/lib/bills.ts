import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderLine } from "./orders";
import { cloudUpsert, cloudDelete, startCloudSync } from "./cloud-sync";

export type Bill = {
  id: string;
  tableId: string;
  tableLabel: string;
  lines: OrderLine[];
  total: number;
  itemCount: number;
  status: "paid" | "void";
  createdAt: number;
  date: string;
  time: string;
};

const KEY = "btech-cafe-bills-v1";
const COUNTER_KEY = "btech-cafe-bill-counter-v1";

function read(): Bill[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(data: Bill[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("btech-bills-updated"));
}

/** Client-side bill counter. Cloud sync reconciles it with max(remote id) on load. */
export function nextBillNumber(): string {
  const cur = parseInt(localStorage.getItem(COUNTER_KEY) || "124", 10);
  const next = cur + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return String(next).padStart(6, "0");
}

function bumpCounterAtLeast(n: number) {
  const cur = parseInt(localStorage.getItem(COUNTER_KEY) || "124", 10);
  if (n > cur) localStorage.setItem(COUNTER_KEY, String(n));
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Bootstrap: initial pull from cloud + realtime subscription.
 * Merges any bills we don't already have locally.
 */
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  startCloudSync();

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (
          col: string,
          opts: { ascending: boolean }
        ) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };

  sb.from("bills")
    .select("id, table_id, table_label, lines, total, item_count, status, created_at")
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error || !data) return;
      const local = read();
      const byId = new Map(local.map((b) => [b.id, b]));
      let maxNum = 124;
      for (const r of data as Array<{
        id: string;
        table_id: string;
        table_label: string;
        lines: OrderLine[];
        total: number;
        item_count: number;
        status: "paid" | "void";
        created_at: string;
      }>) {
        const ts = new Date(r.created_at).getTime();
        const bill: Bill = {
          id: r.id,
          tableId: r.table_id,
          tableLabel: r.table_label,
          lines: r.lines,
          total: r.total,
          itemCount: r.item_count,
          status: r.status,
          createdAt: ts,
          date: formatDate(ts),
          time: formatTime(ts),
        };
        byId.set(r.id, bill);
        const n = parseInt(r.id, 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      }
      bumpCounterAtLeast(maxNum);
      const merged = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
      write(merged);
    });

  supabase
    .channel("bills_rt")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "bills" },
      (payload: {
        eventType: string;
        new: {
          id?: string;
          table_id?: string;
          table_label?: string;
          lines?: OrderLine[];
          total?: number;
          item_count?: number;
          status?: "paid" | "void";
          created_at?: string;
        } | null;
        old: { id?: string } | null;
      }) => {
        const cur = read();
        if (payload.eventType === "DELETE") {
          const id = payload.old?.id;
          if (id) write(cur.filter((b) => b.id !== id));
          return;
        }
        const r = payload.new;
        if (!r?.id || !r.created_at) return;
        const ts = new Date(r.created_at).getTime();
        const bill: Bill = {
          id: r.id,
          tableId: r.table_id!,
          tableLabel: r.table_label!,
          lines: r.lines!,
          total: r.total!,
          itemCount: r.item_count!,
          status: r.status!,
          createdAt: ts,
          date: formatDate(ts),
          time: formatTime(ts),
        };
        const filtered = cur.filter((b) => b.id !== bill.id);
        filtered.unshift(bill);
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        write(filtered);
      }
    )
    .subscribe();
}

export function createBill(input: {
  tableId: string;
  tableLabel: string;
  lines: OrderLine[];
}): Bill {
  const now = Date.now();
  const total = input.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const itemCount = input.lines.reduce((s, l) => s + l.qty, 0);
  const bill: Bill = {
    id: nextBillNumber(),
    tableId: input.tableId,
    tableLabel: input.tableLabel,
    lines: input.lines.map((l) => ({ ...l })),
    total,
    itemCount,
    status: "paid",
    createdAt: now,
    date: formatDate(now),
    time: formatTime(now),
  };
  const all = read();
  all.unshift(bill);
  write(all);
  cloudUpsert(
    "bills",
    {
      id: bill.id,
      table_id: bill.tableId,
      table_label: bill.tableLabel,
      lines: bill.lines,
      total: bill.total,
      item_count: bill.itemCount,
      status: bill.status,
      created_at: new Date(now).toISOString(),
    },
    "id"
  );
  return bill;
}

export function deleteBill(id: string) {
  write(read().filter((b) => b.id !== id));
  cloudDelete("bills", "id", id);
}

export function useBills() {
  const [bills, setBills] = useState<Bill[]>([]);
  useEffect(() => {
    bootstrap();
    setBills(read());
    const h = () => setBills(read());
    window.addEventListener("btech-bills-updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("btech-bills-updated", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  const remove = useCallback((id: string) => deleteBill(id), []);
  return { bills, remove };
}
