import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight cloud sync layer for BTech Cafe POS.
 *
 * Design goals:
 *  - localStorage stays the fast synchronous cache so the app feels
 *    instant and keeps working with no network.
 *  - Every write is mirrored to Lovable Cloud in the background.
 *  - Realtime updates from other devices merge back into the local cache
 *    and re-dispatch the app's existing "btech-*-updated" DOM events so
 *    every hook that already listens to them refreshes automatically.
 *  - Failed writes go into a persisted retry queue so nothing is lost
 *    when the network drops.
 */

const QUEUE_KEY = "btech-cafe-sync-queue-v1";
const STATUS_EVT = "btech-sync-status";

type Op =
  | { kind: "upsert"; table: string; row: Record<string, unknown>; conflict?: string }
  | { kind: "delete"; table: string; column: string; value: string };

type QueueItem = Op & { id: string; tries: number };

let queue: QueueItem[] = [];
let flushing = false;
let online = typeof navigator !== "undefined" ? navigator.onLine : true;

function readQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue() {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  emitStatus();
}

function emitStatus() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STATUS_EVT));
}

export type SyncStatus = "online" | "offline" | "syncing" | "synced";

export function getSyncStatus(): { status: SyncStatus; pending: number } {
  const pending = queue.length;
  if (!online) return { status: "offline", pending };
  if (flushing || pending > 0) return { status: "syncing", pending };
  return { status: "synced", pending: 0 };
}

export function useSyncStatus() {
  const [s, setS] = useState(() => getSyncStatus());
  useEffect(() => {
    const h = () => setS(getSyncStatus());
    window.addEventListener(STATUS_EVT, h);
    window.addEventListener("online", h);
    window.addEventListener("offline", h);
    return () => {
      window.removeEventListener(STATUS_EVT, h);
      window.removeEventListener("online", h);
      window.removeEventListener("offline", h);
    };
  }, []);
  return s;
}

async function runOp(op: Op): Promise<boolean> {
  try {
    // Types are regenerated after migrations; cast to any until then.
    const sb = supabase as unknown as {
      from: (t: string) => {
        upsert: (row: unknown, opts?: { onConflict?: string }) => Promise<{ error: unknown }>;
        delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      };
    };
    if (op.kind === "upsert") {
      const { error } = await sb.from(op.table).upsert(op.row, { onConflict: op.conflict });
      if (error) throw error;
    } else {
      const { error } = await sb.from(op.table).delete().eq(op.column, op.value);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.warn("[cloud-sync] op failed", op, err);
    return false;
  }
}

async function flush() {
  if (flushing) return;
  if (!online) return;
  if (queue.length === 0) return;
  flushing = true;
  emitStatus();
  try {
    while (queue.length > 0 && online) {
      const item = queue[0];
      const ok = await runOp(item);
      if (ok) {
        queue.shift();
        writeQueue();
      } else {
        item.tries += 1;
        writeQueue();
        // exponential-ish backoff: stop this pass, try again later
        if (item.tries >= 5) {
          // move to back to avoid blocking other ops forever
          queue.shift();
          queue.push(item);
          writeQueue();
        }
        break;
      }
    }
  } finally {
    flushing = false;
    emitStatus();
  }
}

function enqueue(op: Op) {
  const item: QueueItem = { ...op, id: crypto.randomUUID(), tries: 0 };
  queue.push(item);
  writeQueue();
  void flush();
}

export function cloudUpsert(table: string, row: Record<string, unknown>, conflict?: string) {
  enqueue({ kind: "upsert", table, row, conflict });
}

export function cloudDelete(table: string, column: string, value: string) {
  enqueue({ kind: "delete", table, column, value });
}

/**
 * Keys (identified by `keyCol`) for a table that still have un-synced local
 * writes. Callers use this to avoid overwriting local edits when they pull
 * authoritative state from the cloud.
 */
export function pendingKeys(table: string, keyCol: string): Set<string> {
  const out = new Set<string>();
  for (const op of queue) {
    if (op.table !== table) continue;
    if (op.kind === "upsert") {
      const v = op.row[keyCol];
      if (typeof v === "string") out.add(v);
    } else if (op.column === keyCol) {
      out.add(op.value);
    }
  }
  return out;
}

/** Flush any queued writes right now (e.g. on tab focus). */
export function flushNow() {
  online = typeof navigator !== "undefined" ? navigator.onLine : true;
  void flush();
}

// One-time bootstrap on the client
let started = false;
export function startCloudSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  queue = readQueue();
  window.addEventListener("online", () => {
    online = true;
    emitStatus();
    void flush();
  });
  window.addEventListener("offline", () => {
    online = false;
    emitStatus();
  });
  // periodic retry
  setInterval(() => {
    if (online && queue.length > 0) void flush();
  }, 15000);
  void flush();
}
