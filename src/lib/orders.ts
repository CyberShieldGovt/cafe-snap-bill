import { useEffect, useState, useCallback } from "react";

export type OrderLine = { name: string; price: number; qty: number };
export type TableOrders = Record<string, OrderLine[]>;

const KEY = "btech-cafe-orders-v1";
export const TABLE_COUNT = 5;

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
