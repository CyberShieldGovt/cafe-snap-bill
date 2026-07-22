import type { Bill } from "./bills";
import { printReceiptViaQz, buildReceiptEscPos } from "./qz";

export type PrinterWidth = 58 | 80;

const WIDTH_KEY = "btech-cafe-printer-width-v1";

export function getPrinterWidth(): PrinterWidth {
  if (typeof window === "undefined") return 58;
  const v = parseInt(localStorage.getItem(WIDTH_KEY) || "58", 10);
  return v === 80 ? 80 : 58;
}

export function setPrinterWidth(w: PrinterWidth) {
  localStorage.setItem(WIDTH_KEY, String(w));
  window.dispatchEvent(new Event("btech-printer-width"));
}

/**
 * Fallback preview: opens the receipt as plain text in a new tab.
 * Only used when QZ Tray isn't running — so the operator sees the
 * bill and can still hand-write / photograph it.
 */
function previewFallback(bill: Bill, width: PrinterWidth) {
  const bytes = buildReceiptEscPos(bill, width);
  // Strip ESC/POS control bytes for a readable text preview
  const text = bytes
    .map((b) => (b === 0x0a ? "\n" : b >= 32 && b < 127 ? String.fromCharCode(b) : ""))
    .join("");
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write(
    `<pre style="font: 14px/1.35 'Courier New', monospace; padding: 12px; white-space: pre-wrap;">${text.replace(/</g, "&lt;")}</pre>`
  );
  w.document.close();
}

/**
 * Print directly to the connected thermal printer via QZ Tray.
 * Returns a promise so callers can await success/failure.
 */
export async function printBill(
  bill: Bill,
  width?: PrinterWidth
): Promise<{ ok: true; printer: string } | { ok: false; error: string }> {
  const w = width ?? getPrinterWidth();
  const res = await printReceiptViaQz(bill, w);
  if (!res.ok) {
    console.error("[print] QZ Tray print failed:", res.error);
    // Show the bill so the operator can still work; QZ install instructions below.
    try {
      previewFallback(bill, w);
    } catch {
      /* ignore */
    }
  }
  return res;
}
