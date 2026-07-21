import { useEffect, useState, useCallback } from "react";

export type Unit = "Kg" | "Litre" | "Piece" | "Packet" | "Bottle" | "Nos" | "Gram" | "ML";

export const UNITS: Unit[] = ["Kg", "Gram", "Litre", "ML", "Piece", "Packet", "Bottle", "Nos"];

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  stock: number;
  minStock: number;
  supplier: string;
  costPrice: number;
  createdAt: number;
  updatedAt: number;
};

export type PurchaseEntry = {
  id: string;
  date: number;
  supplier: string;
  addedBy: string;
  billImage?: string; // data URL preview (optional)
  billName?: string;
  items: { name: string; qty: number; unit: Unit }[];
};

const INV_KEY = "btech-cafe-inventory-v1";
const HIST_KEY = "btech-cafe-purchases-v1";

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? fb;
  } catch {
    return fb;
  }
}
function write<T>(k: string, v: T, evt: string) {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event(evt));
}

export function listInventory(): InventoryItem[] {
  return read<InventoryItem[]>(INV_KEY, []);
}
export function listPurchases(): PurchaseEntry[] {
  return read<PurchaseEntry[]>(HIST_KEY, []);
}

export function saveInventory(items: InventoryItem[]) {
  write(INV_KEY, items, "btech-inventory-updated");
}
export function savePurchases(items: PurchaseEntry[]) {
  write(HIST_KEY, items, "btech-purchases-updated");
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function addInventoryItem(input: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const item: InventoryItem = { ...input, id: uid(), createdAt: now, updatedAt: now };
  const all = listInventory();
  all.push(item);
  saveInventory(all);
  return item;
}

export function updateInventoryItem(id: string, patch: Partial<InventoryItem>) {
  const all = listInventory().map((i) => (i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i));
  saveInventory(all);
}

export function deleteInventoryItem(id: string) {
  saveInventory(listInventory().filter((i) => i.id !== id));
}

export function addStock(name: string, qty: number) {
  const all = listInventory();
  const idx = all.findIndex((i) => i.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return false;
  all[idx].stock += qty;
  all[idx].updatedAt = Date.now();
  saveInventory(all);
  return true;
}

export function addPurchase(entry: Omit<PurchaseEntry, "id" | "date"> & { date?: number }) {
  const e: PurchaseEntry = { ...entry, id: uid(), date: entry.date ?? Date.now() };
  const all = listPurchases();
  all.unshift(e);
  savePurchases(all);
  return e;
}

export function stockStatus(i: InventoryItem): "Normal" | "Low Stock" | "Out of Stock" {
  if (i.stock <= 0) return "Out of Stock";
  if (i.minStock > 0 && i.stock <= i.minStock) return "Low Stock";
  return "Normal";
}

/**
 * Parse free-form text extracted from a purchase bill.
 * Detects lines like:
 *   Milk 20 L
 *   Sugar - 50 Kg
 *   Tea Powder    10 kg
 *   Coffee Powder: 5 kg @ 200
 */
const UNIT_MAP: Record<string, Unit> = {
  kg: "Kg",
  kgs: "Kg",
  kilogram: "Kg",
  kilograms: "Kg",
  g: "Gram",
  gram: "Gram",
  grams: "Gram",
  gm: "Gram",
  gms: "Gram",
  l: "Litre",
  ltr: "Litre",
  ltrs: "Litre",
  litre: "Litre",
  litres: "Litre",
  liter: "Litre",
  liters: "Litre",
  ml: "ML",
  pc: "Piece",
  pcs: "Piece",
  piece: "Piece",
  pieces: "Piece",
  packet: "Packet",
  packets: "Packet",
  pkt: "Packet",
  pkts: "Packet",
  bottle: "Bottle",
  bottles: "Bottle",
  btl: "Bottle",
  nos: "Nos",
  no: "Nos",
};

export function parseBillText(raw: string): { name: string; qty: number; unit: Unit }[] {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rx = /^(.+?)[\s\-:,]+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\b/;
  const out: { name: string; qty: number; unit: Unit }[] = [];
  for (const line of lines) {
    const m = line.match(rx);
    if (!m) continue;
    const unitKey = m[3].toLowerCase();
    const unit = UNIT_MAP[unitKey];
    if (!unit) continue;
    const name = m[1].replace(/[\-:,]+$/, "").trim();
    if (!name) continue;
    out.push({ name, qty: parseFloat(m[2]), unit });
  }
  return out;
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  useEffect(() => {
    setItems(listInventory());
    const h = () => setItems(listInventory());
    window.addEventListener("btech-inventory-updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("btech-inventory-updated", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  const refresh = useCallback(() => setItems(listInventory()), []);
  return { items, refresh };
}

export function usePurchases() {
  const [items, setItems] = useState<PurchaseEntry[]>([]);
  useEffect(() => {
    setItems(listPurchases());
    const h = () => setItems(listPurchases());
    window.addEventListener("btech-purchases-updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("btech-purchases-updated", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return { items };
}
