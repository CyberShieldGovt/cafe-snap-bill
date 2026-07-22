import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cloudUpsert, cloudDelete, startCloudSync } from "./cloud-sync";

export type OrderLine = { name: string; price: number; qty: number };
export type TableOrders = Record<string, OrderLine[]>;

const KEY = "btech-cafe-orders-v1";
const START_KEY = "btech-cafe-order-starts-v1";

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
function readStarts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(START_KEY) || "{}");
  } catch {
    return {};
  }
}

function write(data: TableOrders) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("btech-orders-updated"));
}
function writeStarts(data: Record<string, number>) {
  localStorage.setItem(START_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("btech-orders-updated"));
}

/**
 * Bootstrap: pull orders from cloud on load + subscribe to realtime changes.
 * Merges remote state into the local cache and dispatches update events.
 */
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  startCloudSync();

  const sb = supabase as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: unknown[] | null; error: unknown }> };
    channel: (name: string) => {
      on: (event: string, filter: unknown, cb: (payload: unknown) => void) => {
        subscribe: () => unknown;
      };
    };
  };

  // Initial pull (best-effort)
  sb.from("table_orders")
    .select("table_id, table_label, lines, started_at")
    .then(({ data, error }) => {
      if (error || !data) return;
      const remote: TableOrders = {};
      const starts: Record<string, number> = {};
      for (const r of data as Array<{
        table_id: string;
        lines: OrderLine[];
        started_at: string;
      }>) {
        if (r.lines && r.lines.length > 0) {
          remote[r.table_id] = r.lines;
          starts[r.table_id] = new Date(r.started_at).getTime();
        }
      }
      // Merge with local: local overwrites when it has entries (in case offline edits pending)
      const local = read();
      const merged = { ...remote, ...local };
      write(merged);
      writeStarts({ ...starts, ...readStarts() });
    });

  // Realtime subscription
  supabase
    .channel("table_orders_rt")
    .on(
      // @ts-expect-error — postgres_changes literal fine
      "postgres_changes",
      { event: "*", schema: "public", table: "table_orders" },
      (payload: {
        eventType: string;
        new: { table_id?: string; lines?: OrderLine[]; started_at?: string } | null;
        old: { table_id?: string } | null;
      }) => {
        const cur = read();
        const starts = readStarts();
        if (payload.eventType === "DELETE") {
          const id = payload.old?.table_id;
          if (id) {
            delete cur[id];
            delete starts[id];
            write(cur);
            writeStarts(starts);
          }
          return;
        }
        const row = payload.new;
        if (!row?.table_id) return;
        if (!row.lines || row.lines.length === 0) {
          delete cur[row.table_id];
          delete starts[row.table_id];
        } else {
          cur[row.table_id] = row.lines;
          if (row.started_at) starts[row.table_id] = new Date(row.started_at).getTime();
        }
        write(cur);
        writeStarts(starts);
      }
    )
    .subscribe();
}

export function useAllOrders() {
  const [orders, setOrders] = useState<TableOrders>({});
  useEffect(() => {
    bootstrap();
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

export function useTableStartedAt() {
  const [starts, setStarts] = useState<Record<string, number>>({});
  useEffect(() => {
    bootstrap();
    setStarts(readStarts());
    const h = () => setStarts(readStarts());
    window.addEventListener("btech-orders-updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("btech-orders-updated", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return starts;
}

export function useTableOrder(tableId: string) {
  const [lines, setLines] = useState<OrderLine[]>([]);
  useEffect(() => {
    bootstrap();
    setLines(read()[tableId] || []);
    const h = () => setLines(read()[tableId] || []);
    window.addEventListener("btech-orders-updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("btech-orders-updated", h);
      window.removeEventListener("storage", h);
    };
  }, [tableId]);

  const save = useCallback(
    (next: OrderLine[]) => {
      const all = read();
      const starts = readStarts();
      if (next.length === 0) {
        delete all[tableId];
        delete starts[tableId];
        write(all);
        writeStarts(starts);
        cloudDelete("table_orders", "table_id", tableId);
      } else {
        // Preserve existing startedAt; stamp a new one only when the table was empty
        const startedAtMs = starts[tableId] ?? Date.now();
        starts[tableId] = startedAtMs;
        all[tableId] = next;
        write(all);
        writeStarts(starts);
        cloudUpsert(
          "table_orders",
          {
            table_id: tableId,
            table_label: tableLabel(tableId),
            lines: next,
            started_at: new Date(startedAtMs).toISOString(),
            updated_at: new Date().toISOString(),
          },
          "table_id"
        );
      }
      setLines(next);
    },
    [tableId]
  );

  const clear = useCallback(() => {
    const all = read();
    const starts = readStarts();
    delete all[tableId];
    delete starts[tableId];
    write(all);
    writeStarts(starts);
    cloudDelete("table_orders", "table_id", tableId);
    setLines([]);
  }, [tableId]);

  return { lines, save, clear };
}

export const total = (lines: OrderLine[]) =>
  lines.reduce((s, l) => s + l.price * l.qty, 0);
export const totalQty = (lines: OrderLine[]) =>
  lines.reduce((s, l) => s + l.qty, 0);
