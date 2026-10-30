/**
 * Saved sales report (the report shown on the admin Sales page).
 *
 * The frontend sales report was synced to the `sales_report_bills` table once
 * (initial synchronization). After that, database updates are manual only:
 *  - new live bills are NOT written here automatically;
 *  - manual add / edit / delete from the Sales page save via upsert on the
 *    bill id, so repeated saves never create duplicate records.
 *
 * While loading (or if the cloud is unreachable) the page keeps showing the
 * local demo dataset so nothing breaks offline.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderLine } from "./orders";
import type { Bill } from "./bills";
import { formatDate, formatTime } from "./bills";
import { DEMO_SALES, buildDemoBills } from "./sale";
import { cloudUpsert, cloudDelete, startCloudSync } from "./cloud-sync";

const KEY = "btech-cafe-report-bills-v1";
const SEED_FLAG = "btech-cafe-report-seeded-v1";
const EVT = "btech-report-bills-updated";

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
  window.dispatchEvent(new Event(EVT));
}

export type ReportRow = {
  id: string;
  table_id: string;
  table_label: string;
  lines: OrderLine[];
  total: number;
  item_count: number;
  status: string;
  created_at: string;
};

function rowToBill(r: ReportRow): Bill {
  const ts = new Date(r.created_at).getTime();
  return {
    id: r.id,
    tableId: r.table_id,
    tableLabel: r.table_label,
    lines: r.lines,
    total: r.total,
    itemCount: r.item_count,
    status: (r.status as Bill["status"]) || "paid",
    createdAt: ts,
    date: formatDate(ts),
    time: formatTime(ts),
  };
}

function billToRow(b: Bill) {
  return {
    id: b.id,
    table_id: b.tableId,
    table_label: b.tableLabel,
    lines: b.lines,
    total: b.total,
    item_count: b.itemCount,
    status: b.status,
    created_at: new Date(b.createdAt).toISOString(),
  };
}

/** One-time initial sync: seed the saved report from the frontend dataset. */
async function seedOnce(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(SEED_FLAG) === "1") return false;
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => Promise<{ data: unknown[] | null; error: unknown }>;
      upsert: (
        rows: unknown[],
        opts?: { onConflict?: string }
      ) => Promise<{ error: unknown }>;
    };
  };
  const { data, error } = await sb.from("sales_report_bills").select("id");
  if (error) return false;
  if (data && data.length > 0) {
    localStorage.setItem(SEED_FLAG, "1");
    return false;
  }
  const seed = buildDemoBills();
  for (let i = 0; i < seed.length; i += 400) {
    const chunk = seed.slice(i, i + 400).map(billToRow);
    const { error: upErr } = await sb.from("sales_report_bills").upsert(chunk, {
      onConflict: "id",
    });
    if (upErr) return false;
  }
  localStorage.setItem(SEED_FLAG, "1");
  return true;
}

let bootstrapped = false;

export function useSalesReport() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    startCloudSync();
    setBills(read());
    const h = () => setBills(read());
    window.addEventListener(EVT, h);

    let cancelled = false;
    (async () => {
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
      const { data, error: err } = await sb
        .from("sales_report_bills")
        .select(
          "id, table_id, table_label, lines, total, item_count, status, created_at"
        )
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) {
        setError("saved report unavailable");
        setLoaded(true);
        return;
      }
      if (!data || data.length === 0) {
        const didSeed = await seedOnce();
        if (cancelled) return;
        if (!didSeed) {
          // Table is empty and seeding was skipped/flagged: keep local view.
          write(read());
        } else {
          const fresh = (await (async () => {
            const r = await sb
              .from("sales_report_bills")
              .select(
                "id, table_id, table_label, lines, total, item_count, status, created_at"
              )
              .order("created_at", { ascending: false });
            return r.data || [];
          })()) as Parameters<typeof rowToBill>[];
          write(fresh.map(rowToBill));
        }
      } else {
        write((data as Parameters<typeof rowToBill>[]).map(rowToBill));
      }
      if (cancelled) return;
      setError(null);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(EVT, h);
    };
  }, []);

  const save = useCallback((bill: Bill) => {
    const cur = read().filter((b) => b.id !== bill.id);
    cur.unshift(bill);
    cur.sort((a, b) => b.createdAt - a.createdAt);
    write(cur);
    cloudUpsert("sales_report_bills", billToRow(bill), "id");
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((b) => b.id !== id));
    cloudDelete("sales_report_bills", "id", id);
  }, []);

  return { bills, loaded, error, save, remove };
}

/** Next manual-entry bill number (continues after the highest saved id). */
export function nextReportBillNumber(bills: Bill[]): string {
  let max = 124;
  for (const b of bills) {
    const n = parseInt(b.id, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(6, "0");
}
