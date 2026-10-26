/**
 * Expected Sales (plan) figures.
 *
 * Deterministic per month: the same month always produces the same numbers.
 * Month-till-date is pinned to ₹1,80,000, daily values sit in the ₹7,000–₹11,000
 * band from the 6th of the month, daily target is ₹10,000–₹11,000 and the
 * monthly target is ₹3.5–4L.
 */

export type ExpectedItem = { name: string; qty: number; amount: number };

export type ExpectedDay = {
  date: Date;
  label: string;
  short: string;
  sales: number;
  orders: number;
  tables: number;
  items: ExpectedItem[];
};

export type ExpectedSummary = {
  monthLabel: string;
  days: ExpectedDay[];
  elapsedDays: number;
  daysInMonth: number;
  mtdSales: number;
  mtdTables: number;
  mtdOrders: number;
  dailyTargetLow: number;
  dailyTargetHigh: number;
  monthlyTargetLow: number;
  monthlyTargetHigh: number;
  avgPerDay: number;
  items: ExpectedItem[];
};

const DAILY_TARGET_LOW = 10_000;
const DAILY_TARGET_HIGH = 11_000;
const MONTH_TARGET_LOW = 350_000;
const MONTH_TARGET_HIGH = 400_000;
const MTD_SALES = 180_000;

/** Popular sellers with their menu prices and a weight for the plan mix. */
const POPULAR: { name: string; price: number; w: number }[] = [
  { name: "Irani Dum Chai", price: 20, w: 14 },
  { name: "Bun Maska", price: 49, w: 12 },
  { name: "Niloufer Usmania Biscuits", price: 10, w: 6 },
  { name: "Tea", price: 20, w: 5 },
  { name: "Peri Peri Fries", price: 119, w: 6 },
  { name: "Veg Burger", price: 99, w: 5 },
  { name: "Chicken Popcorn", price: 109, w: 4 },
  { name: "Veg Nuggets", price: 99, w: 4 },
  { name: "Malai Bun", price: 49, w: 4 },
  { name: "Coffee", price: 25, w: 4 },
  { name: "Egg Omlette", price: 49, w: 3 },
  { name: "Veg Maggie", price: 79, w: 3 },
  { name: "Cold Coffee", price: 90, w: 3 },
  { name: "Chicken Fried Rice", price: 159, w: 3 },
  { name: "Veg Loaded Pizza", price: 139, w: 2 },
  { name: "Chicken Lollipop", price: 209, w: 2 },
  { name: "Crispy Chicken", price: 149, w: 2 },
  { name: "Cheese Burst Pizza", price: 159, w: 2 },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distribute(sales: number, rand: () => number): ExpectedItem[] {
  const weights = POPULAR.map((p) => ({ ...p, w: p.w * (0.75 + rand() * 0.5) }));
  const totalW = weights.reduce((s, p) => s + p.w, 0);
  const items: ExpectedItem[] = [];
  for (const p of weights) {
    const share = (p.w / totalW) * sales;
    const qty = Math.max(0, Math.round(share / p.price));
    if (qty > 0) items.push({ name: p.name, qty, amount: qty * p.price });
  }
  // Nudge the biggest line so the day's item amounts track the day's sales closely.
  const diff = sales - items.reduce((s, i) => s + i.amount, 0);
  if (items.length > 0 && diff !== 0) {
    const chai = items.find((i) => i.name === "Irani Dum Chai") ?? items[0];
    const price = weights.find((w) => w.name === chai.name)?.price ?? 20;
    chai.qty = Math.max(0, chai.qty + Math.round(diff / price));
    chai.amount = chai.qty * price;
  }
  return items.sort((a, b) => b.qty - a.qty);
}

export function buildExpectedSummary(now = new Date()): ExpectedSummary {
  const y = now.getFullYear();
  const m = now.getMonth();
  const rand = mulberry32(y * 100 + m + 7);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  // Plan runs from the 6th of the month so daily values can sit in the
  // ₹7,000–₹11,000 band while the month-till-date total stays ₹1,80,000.
  const startDay = Math.min(6, daysInMonth);
  const elapsedDays = Math.max(1, Math.min(now.getDate() - startDay + 1, daysInMonth - startDay + 1));

  // Raw per-day values inside the ₹7,000–₹11,000 band, scaled so the
  // month-till-date total lands exactly on ₹1,80,000.
  const raw: number[] = [];
  for (let i = 0; i < elapsedDays; i++) raw.push(7_000 + rand() * 4_000);
  const scale = MTD_SALES / raw.reduce((s, v) => s + v, 0);

  const days: ExpectedDay[] = raw.map((v, i) => {
    const date = new Date(y, m, startDay + i);
    const sales = Math.round((v * scale) / 100) * 100;
    const avgBill = 160 + Math.round(rand() * 60);
    const orders = Math.max(3, Math.round(sales / avgBill));
    return {
      date,
      label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      short: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      sales,
      orders,
      tables: orders,
      items: distribute(sales, rand),
    };
  });

  const itemsMap = new Map<string, ExpectedItem>();
  for (const d of days) {
    for (const it of d.items) {
      const cur = itemsMap.get(it.name);
      if (cur) {
        cur.qty += it.qty;
        cur.amount += it.amount;
      } else {
        itemsMap.set(it.name, { ...it });
      }
    }
  }

  const mtdSales = days.reduce((s, d) => s + d.sales, 0);

  return {
    monthLabel: `${MONTHS[m]} ${y}`,
    days,
    elapsedDays,
    daysInMonth,
    mtdSales,
    mtdTables: days.reduce((s, d) => s + d.tables, 0),
    mtdOrders: days.reduce((s, d) => s + d.orders, 0),
    dailyTargetLow: DAILY_TARGET_LOW,
    dailyTargetHigh: DAILY_TARGET_HIGH,
    monthlyTargetLow: MONTH_TARGET_LOW,
    monthlyTargetHigh: MONTH_TARGET_HIGH,
    avgPerDay: elapsedDays ? Math.round(mtdSales / elapsedDays) : 0,
    items: Array.from(itemsMap.values()).sort((a, b) => b.qty - a.qty),
  };
}
