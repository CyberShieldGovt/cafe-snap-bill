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
 *
 * Each print job now sends TWO raw slips in one call:
 *   1) The customer bill (with prices)
 *   2) The kitchen KOT (Kitchen Order Ticket — items/qty only, no prices)
 * Both go to the same printer, one after another, each ending with its own cut.
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
  doubleSize: (on: boolean) => void; // double width + double height
  tallSize: (on: boolean) => void; // double height only — width/columns unaffected
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
    init: () => {
      push(ESC, 0x40); // reset printer
      push(GS, 0x4c, 0x00, 0x00); // GS L: left margin = 0 dots (kills the left-side gap)
      push(ESC, 0x24, 0x00, 0x00); // ESC $: absolute print position = 0 (belt & suspenders)
    },
    center: () => push(ESC, 0x61, 0x01),
    left: () => push(ESC, 0x61, 0x00),
    bold: (on) => push(ESC, 0x45, on ? 0x01 : 0x00),
    doubleSize: (on) => push(GS, 0x21, on ? 0x11 : 0x00),
    tallSize: (on) => push(GS, 0x21, on ? 0x01 : 0x00),
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

  // Item lines — printed a bit taller for readability. Height-only scaling
  // (not width) so the column alignment/padding above is unaffected.
  e.tallSize(true);
  for (const l of bill.lines) {
    const rowRight = `${String(l.qty).padStart(2)} ${String(l.price).padStart(4)} ${String(
      l.price * l.qty
    ).padStart(5)}`;
    const nameLines = wrap(l.name, nameW);
    e.line(padLine(nameLines[0], rowRight, width));
    for (let i = 1; i < nameLines.length; i++) e.line(nameLines[i]);
  }
  e.tallSize(false);

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

/**
 * Kitchen Order Ticket — goes to the kitchen. No prices, just what to make.
 * Printed bigger/bolder since it's read at a glance in a busy kitchen.
 */
export function buildKotEscPos(bill: ReceiptData, widthMm: 58 | 80 = 58): number[] {
  const width = widthMm === 80 ? 42 : 32;
  const e = makeEsc(width);
  e.init();
  e.center();
  e.bold(true);
  e.doubleSize(true);
  e.line("KOT");
  e.doubleSize(false);
  e.line("Kitchen Order Ticket");
  e.bold(false);
  e.line("=".repeat(width));
  e.left();
  e.bold(true);
  e.line(padLine("Invoice", bill.id, width));
  e.line(padLine("Table", bill.tableLabel, width));
  e.line(padLine("Time", bill.time, width));
  e.bold(false);
  e.line("-".repeat(width));

  // Items only — name + qty, no price/total. Printed tall for kitchen readability.
  e.bold(true);
  e.tallSize(true);
  const nameW = width - 6;
  for (const l of bill.lines) {
    const rowRight = `x${l.qty}`;
    const nameLines = wrap(l.name, nameW);
    e.line(padLine(nameLines[0], rowRight, width));
    for (let i = 1; i < nameLines.length; i++) e.line(nameLines[i]);
  }
  e.tallSize(false);
  e.bold(false);

  e.line("=".repeat(width));
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

/**
 * Convert a byte array (0-255 values) into a raw binary string,
 * where each character's code point equals the byte value.
 * This is what QZ Tray's "raw" / "plain" print format expects —
 * NOT a JSON/array/decimal representation of the bytes.
 */
function bytesToRawString(bytes: number[]): string {
  return bytes.map((b) => String.fromCharCode(b & 0xff)).join("");
}

/**
 * Prints the customer bill, then the kitchen KOT, as two slips
 * in a single job on the same printer (each ends with its own cut).
 * Pass printKot: false if you only want the bill.
 */
export async function printReceiptViaQz(
  bill: ReceiptData,
  widthMm: 58 | 80 = 58,
  printKot: boolean = true
): Promise<{ ok: true; printer: string } | { ok: false; error: string }> {
  try {
    const qz = await connect();
    const printer = await pickPrinter(qz);
    const cfg = qz.configs.create(printer, { encoding: "UTF-8" });

    // Bill first, as its own job.
    const billData = bytesToRawString(buildReceiptEscPos(bill, widthMm));
    await qz.print(cfg, [{ type: "raw", format: "plain", data: billData }]);

    // KOT as a second, separate job — sending both in one qz.print() call
    // was unreliable (some printers/drivers only acted on the first entry
    // or merged both into one continuous strip). Two sequential awaited
    // calls reliably produce two distinct slips.
    if (printKot) {
      const kotData = bytesToRawString(buildKotEscPos(bill, widthMm));
      await qz.print(cfg, [{ type: "raw", format: "plain", data: kotData }]);
    }

    return { ok: true, printer };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// -------- Printer width preference --------
export type PrinterWidth = 58 | 80;
const WIDTH_KEY = "btech-cafe-printer-width-v1";

export function getPrinterWidth(): PrinterWidth {
  if (typeof window === "undefined") return 58;
  const v = parseInt(localStorage.getItem(WIDTH_KEY) || "58", 10);
  return v === 80 ? 80 : 58;
}
export function setPrinterWidth(w: PrinterWidth) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIDTH_KEY, String(w));
}

// -------- Bill → receipt adapter --------
type BillLike = {
  id: string;
  tableLabel: string;
  lines: { name: string; price: number; qty: number }[];
  total: number;
  date?: string;
  time?: string;
  createdAt?: number;
};

/**
 * Print a saved bill directly via QZ Tray (bill + KOT). Falls back to a
 * plain-text preview window when QZ Tray is unavailable so staff still
 * have something to hand the customer.
 */
export async function printBill(
  bill: BillLike,
  printKot: boolean = true
): Promise<{ ok: true; printer: string } | { ok: false; error: string }> {
  const width = getPrinterWidth();
  const created = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const receipt: ReceiptData = {
    id: bill.id,
    tableLabel: bill.tableLabel,
    date: bill.date ?? created.toLocaleDateString(),
    time: bill.time ?? created.toLocaleTimeString(),
    lines: bill.lines,
    total: bill.total,
  };
  const res = await printReceiptViaQz(receipt, width, printKot);
  if (!res.ok && typeof window !== "undefined") {
    // Offline fallback — open a plain text preview in a new tab.
    try {
      const w = window.open("", "_blank");
      if (w) {
        const text =
          `BTECH CAFE\nNallurahalli, Bengaluru\n` +
          `Invoice: ${receipt.id}   Table: ${receipt.tableLabel}\n` +
          `${receipt.date} ${receipt.time}\n\n` +
          receipt.lines
            .map((l) => `${l.name}  x${l.qty}  ₹${l.price * l.qty}`)
            .join("\n") +
          `\n\nTOTAL: ₹${receipt.total}\n`;
        w.document.write(`<pre style="font:14px monospace;padding:16px">${text}</pre>`);
        w.document.close();
      }
    } catch {
      /* ignore */
    }
  }
  return res;
}
