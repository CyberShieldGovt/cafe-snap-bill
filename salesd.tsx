/**
 * Demo sales dataset for the Sales Summary page (project / presentation use).
 *
 * Deterministic: the same dates always produce the same bills.
 *  - Past months:    ₹3.1L – ₹3.8L per month  (≈ ₹10k–₹12.5k per day)
 *  - Current month:  ₹6,000 – ₹8,000 per day
 *
 * Flip DEMO_SALES to `false` to show real bills from the database again.
 */
import { addDays, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ALL_ITEMS } from "./menu";
import type { Bill } from "./bills";
import { formatDate, formatTime } from "./bills";
import type { OrderLine } from "./orders";

export const DEMO_SALES = true;
const MONTHS_BACK = 5;

// --- tiny seeded RNG (mulberry32) ---------------------------------------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Unique menu items, cheap items weighted higher (chai, buns, snacks sell most)
const UNIQUE = Array.from(new Map(ALL_ITEMS.map((i) => [i.name, i])).values()).filter(
  (i) => i.price > 0 && i.price <= 260
);
const WEIGHTED = UNIQUE.flatMap((i) => {
  const w = i.price <= 30 ? 8 : i.price <= 60 ? 6 : i.price <= 110 ? 4 : i.price <= 160 ? 2 : 1;
  return Array(w).fill(i);
});

const TABLES = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `t${i + 1}`, label: `Table ${i + 1}` })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `r${i + 1}`, label: `Roof Table ${i + 1}` })),
];

function makeBillLines(r: () => number): OrderLine[] {
  const n = 2 + Math.floor(r() * 4); // 2–5 distinct items
  const map = new Map<string, OrderLine>();
  for (let i = 0; i < n; i++) {
    const it = WEIGHTED[Math.floor(r() * WEIGHTED.length)];
    const qty = 1 + Math.floor(r() * (it.price <= 60 ? 4 : 2));
    const cur = map.get(it.name);
    if (cur) cur.qty += qty;
    else map.set(it.name, { name: it.name, price: it.price, qty });
  }
  return Array.from(map.values());
}

/** Daily sales target for a given day. */
function dailyTarget(day: Date, monthIdx: number, isCurrentMonth: boolean, r: () => number) {
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  if (isCurrentMonth) {
    // ₹6,000 – ₹8,000 every day (weekends skew to the top)
    return Math.round(6000 + r() * (weekend ? 2000 : 1700));
  }
  // Month base varies per month so totals land between ₹3.1L and ₹3.8L
  const base = 10_300 + ((monthIdx * 7919) % 5) * 380; // 10.3k – 11.8k
  const wk = weekend ? 1.12 : 0.97;
  return Math.round(base * wk * (0.93 + r() * 0.14));
}

export function buildDemoBills(now = new Date()): Bill[] {
  const bills: Bill[] = [];
  const firstMonth = startOfMonth(subMonths(now, MONTHS_BACK));
  const today = startOfDay(now);
  let counter = 124;

  for (let day = firstMonth; +day <= +today; day = addDays(day, 1)) {
    const isCurrentMonth = day.getMonth() === now.getMonth() && day.getFullYear() === now.getFullYear();
    const seed = day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate();
    const r = rng(seed);
    const target = dailyTarget(day, day.getFullYear() * 12 + day.getMonth(), isCurrentMonth, r);

    // Build the day's bills until the target is met, then stamp times 9:00–22:30
    const dayBills: { lines: OrderLine[]; total: number }[] = [];
    let sum = 0;
    while (sum < target) {
      const lines = makeBillLines(r);
      const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
      dayBills.push({ lines, total });
      sum += total;
    }
    const times = dayBills
      .map(() => 9 * 60 + Math.floor(r() * 810))
      .sort((a, b) => a - b);

    dayBills.forEach((b, i) => {
      const ts = +day + times[i] * 60_000;
      if (ts > +now) return; // nothing in the future
      counter += 1;
      const table = TABLES[Math.floor(r() * TABLES.length)];
      bills.push({
        id: String(counter).padStart(6, "0"),
        tableId: table.id,
        tableLabel: table.label,
        lines: b.lines,
        total: b.total,
        itemCount: b.lines.reduce((s, l) => s + l.qty, 0),
        status: "paid",
        createdAt: ts,
        date: formatDate(ts),
        time: formatTime(ts),
      });
    });
  }
  return bills.sort((a, b) => b.createdAt - a.createdAt);
}
