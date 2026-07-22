/**
 * QZ Tray integration for direct thermal printing.
 *
 * QZ Tray runs as a small local app on the billing PC (https://qz.io/download/)
 * and exposes a WebSocket at ws://localhost:8181 that the browser talks to.
 * We push raw ESC/POS byte sequences straight to the connected TVS RP 3200 Lite
 * (or whatever printer is set as Windows default) — no browser print dialog,
 * no PDF save, no popup blocker.
 *
 * First time the app prints, QZ shows a one-time trust prompt.
 * Tick "Remember" → Allow, and every subsequent print is silent.
 */

type QZApi = {
  websocket: {
    connect: (opts?: { retries?: number; delay?: number }) => Promise<void>;
    disconnect: () => Promise<void>;
    isActive: () => boolean;
  };
  printers: {
    find: (query?: string) => Promise<string | string[]>;
    getDefault: () => Promise<string>;
  };
  configs: { create: (printer: string, opts?: Record<string, unknown>) => unknown };
  print: (config: unknown, data: unknown[]) => Promise<void>;
  security: {
    setCertificatePromise: (cb: (resolve: (v: string) => void) => void) => void;
    setSignaturePromise: (cb: (toSign: string) => (resolve: (v: string) => void) => void) => void;
  };
};

declare global {
  interface Window {
    qz?: QZApi;
  }
}

const QZ_SRC = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";

let loadPromise: Promise<QZApi> | null = null;

function loadQz(): Promise<QZApi> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("QZ Tray requires a browser"));
      return;
    }
    if (window.qz) {
      resolve(window.qz);
      return;
    }
    const s = document.createElement("script");
    s.src = QZ_SRC;
    s.async = true;
    s.onload = () => {
      if (window.qz) resolve(window.qz);
      else reject(new Error("QZ Tray script loaded but window.qz is missing"));
    };
    s.onerror = () => reject(new Error("Failed to load QZ Tray client script"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

let connectPromise: Promise<QZApi> | null = null;
async function connect(): Promise<QZApi> {
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    const qz = await loadQz();
    // Unsigned mode — QZ Tray prompts the operator once per session to trust the site.
    qz.security.setCertificatePromise((resolve) => resolve(""));
    qz.security.setSignaturePromise(() => (resolve) => resolve(""));
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }
    return qz;
  })().catch((err) => {
    connectPromise = null;
    throw err;
  });
  return connectPromise;
}

async function pickPrinter(qz: QZApi): Promise<string> {
  // Try to auto-detect the TVS RP 3200 Lite by name
  try {
    const all = await qz.printers.find();
    const list = Array.isArray(all) ? all : [all];
    const match = list.find((n) =>
      /tvs|rp.?3200|thermal|pos|receipt/i.test(String(n))
    );
    if (match) return match;
  } catch {
    /* fall through */
  }
  return qz.printers.getDefault();
}

// -------- ESC/POS byte-sequence builder --------
const ESC = 0x1b;
const GS = 0x1d;

function toBytes(s: string): number[] {
  // ESC/POS printers use CP437/CP858 by default; ASCII is safe. Strip anything else.
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out.push(c > 127 ? 0x3f : c); // '?' for non-ASCII
  }
  return out;
}

type EscPos = {
  init: () => void;
  center: () => void;
  left: () => void;
  bold: (on: boolean) => void;
  doubleSize: (on: boolean) => void;
  text: (s: string) => void;
  line: (s?: string) => void;
  feed: (n?: number) => void;
  cut: () => void;
  toArray: () => number[];
};

function makeEsc(width = 32): EscPos {
  const buf: number[] = [];
  const push = (...bs: number[]) => buf.push(...bs);
  const api: EscPos = {
    init: () => push(ESC, 0x40),
    center: () => push(ESC, 0x61, 0x01),
    left: () => push(ESC, 0x61, 0x00),
    bold: (on) => push(ESC, 0x45, on ? 0x01 : 0x00),
    doubleSize: (on) => push(GS, 0x21, on ? 0x11 : 0x00),
    text: (s) => push(...toBytes(s)),
    line: (s = "") => {
      push(...toBytes(s));
      push(0x0a);
    },
    feed: (n = 1) => {
      for (let i = 0; i < n; i++) push(0x0a);
    },
    cut: () => push(GS, 0x56, 0x01),
    toArray: () => buf,
  };
  void width;
  return api;
}

function padLine(left: string, right: string, width: number): string {
  const l = left.length + right.length;
  if (l >= width) return (left + " " + right).slice(0, width);
  return left + " ".repeat(width - l) + right;
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let s = text;
  while (s.length > width) {
    let cut = s.lastIndexOf(" ", width);
    if (cut < width / 2) cut = width;
    out.push(s.slice(0, cut).trimEnd());
    s = s.slice(cut).trimStart();
  }
  if (s.length) out.push(s);
  return out;
}

export type ReceiptData = {
  id: string;
  tableLabel: string;
  date: string;
  time: string;
  lines: { name: string; price: number; qty: number }[];
  total: number;
};

export function buildReceiptEscPos(bill: ReceiptData, widthMm: 58 | 80 = 58): number[] {
  const width = widthMm === 80 ? 42 : 32;
  const e = makeEsc(width);
  e.init();
  e.center();
  e.bold(true);
  e.doubleSize(true);
  e.line("BTECH CAFE");
  e.doubleSize(false);
  e.bold(false);
  e.line("Nallurahalli");
  e.line("Bengaluru");
  e.line("=".repeat(width));
  e.left();
  e.line(padLine("Invoice", bill.id, width));
  e.line(padLine("Table", bill.tableLabel, width));
  e.line(padLine("Date", bill.date, width));
  e.line(padLine("Time", bill.time, width));
  e.line("-".repeat(width));
  // Header row
  e.bold(true);
  const nameW = width - 4 - 5 - 6;
  e.line(
    padLine("Item", "Qty Rate  Total", width).slice(0, width)
  );
  e.bold(false);
  e.line("-".repeat(width));

  for (const l of bill.lines) {
    const rowRight = `${String(l.qty).padStart(2)} ${String(l.price).padStart(4)} ${String(
      l.price * l.qty
    ).padStart(5)}`;
    const nameLines = wrap(l.name, nameW);
    e.line(padLine(nameLines[0], rowRight, width));
    for (let i = 1; i < nameLines.length; i++) e.line(nameLines[i]);
  }

  e.line("-".repeat(width));
  e.line(padLine("Subtotal", `Rs.${bill.total}`, width));
  e.bold(true);
  e.doubleSize(true);
  e.line("TOTAL Rs." + bill.total);
  e.doubleSize(false);
  e.bold(false);
  e.line("=".repeat(width));
  e.center();
  e.bold(true);
  e.line("Thank You");
  e.bold(false);
  e.line("Visit Again");
  e.feed(3);
  e.cut();
  return e.toArray();
}

export async function isQzAvailable(): Promise<boolean> {
  try {
    await connect();
    return true;
  } catch {
    return false;
  }
}

export async function printReceiptViaQz(
  bill: ReceiptData,
  widthMm: 58 | 80 = 58
): Promise<{ ok: true; printer: string } | { ok: false; error: string }> {
  try {
    const qz = await connect();
    const printer = await pickPrinter(qz);
    const bytes = buildReceiptEscPos(bill, widthMm);
    const cfg = qz.configs.create(printer, { encoding: "UTF-8" });
    await qz.print(cfg, [{ type: "raw", format: "command", data: bytes, flavor: "plain" }]);
    return { ok: true, printer };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
