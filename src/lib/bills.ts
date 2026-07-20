import { useEffect, useState, useCallback } from "react";
import type { OrderLine } from "./orders";

export type Bill = {
  id: string;              // bill number, e.g. "000125"
  tableId: string;
  tableLabel: string;
  lines: OrderLine[];
  total: number;
  itemCount: number;
  status: "paid" | "void";
  createdAt: number;       // ms epoch
  date: string;            // "20 Jul 2026"
  time: string;            // "07:34 PM"
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

export function nextBillNumber(): string {
  const cur = parseInt(localStorage.getItem(COUNTER_KEY) || "124", 10);
  const next = cur + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return String(next).padStart(6, "0");
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
  return bill;
}

export function deleteBill(id: string) {
  write(read().filter((b) => b.id !== id));
}

export function useBills() {
  const [bills, setBills] = useState<Bill[]>([]);
  useEffect(() => {
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
