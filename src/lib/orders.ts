import { useEffect, useState, useCallback } from "react";

export type OrderLine = { name: string; price: number; qty: number };
export type TableOrders = Record<string, OrderLine[]>;

const KEY = "btech-cafe-orders-v1";

export type TableDef = { id: string; label: string; short: string };

// Ground floor: 5 tables (id "1".."5" — preserves existing carts)
export const GROUND_TABLES: TableDef[] = Array.from({ length: 5 }, (_, i) => ({
  id: String(i + 1),
  label: `Table ${i + 1}`,
  short: String(i + 1).padStart(2, "0"),
}));

// Rooftop: 12 tables (id "R1".."R12")
export const ROOF_TABLES: TableDef[] = Array.from({ length: 12 }, (_, i) => ({
  id: `R${i + 1}`,
  label: `Roof Table ${i + 1}`,
  short: `R${String(i + 1).padStart(2, "0")}`,
}));

export const ALL_TABLES: TableDef[] = [...GROUND_TABLES, ...ROOF_TABLES];
export const TABLE_COUNT = ALL_TABLES.length;

export function tableLabel(id: string) {
  return ALL_TABLES.find((t) => t.id === id)?.label ?? `Table ${id}`;
}

function read(): TableOrders {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(data: TableOrders) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("btech-orders-updated"));
}

export function useAllOrders() {
  const [orders, setOrders] = useState<TableOrders>({});
  useEffect(() => {
    setOrders(read());
    const h = () => setOrders(read());
    window.addEventListener("btech-orders-updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("btech-orders-updated", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return orders;
}

export function useTableOrder(tableId: string) {
  const [lines, setLines] = useState<OrderLine[]>([]);
  useEffect(() => {
    setLines(read()[tableId] || []);
  }, [tableId]);

  const save = useCallback(
    (next: OrderLine[]) => {
      const all = read();
      if (next.length === 0) delete all[tableId];
      else all[tableId] = next;
      write(all);
      setLines(next);
    },
    [tableId]
  );

  const clear = useCallback(() => {
    const all = read();
    delete all[tableId];
    write(all);
    setLines([]);
  }, [tableId]);

  return { lines, save, clear };
}

export const total = (lines: OrderLine[]) =>
  lines.reduce((s, l) => s + l.price * l.qty, 0);
export const totalQty = (lines: OrderLine[]) =>
  lines.reduce((s, l) => s + l.qty, 0);
