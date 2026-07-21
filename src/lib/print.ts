import type { Bill } from "./bills";

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

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

export function receiptHTML(bill: Bill, width: PrinterWidth = 58): string {
  const w = width;
  const pad = w === 80 ? "5mm 4mm" : "4mm 3mm";
  const fs = w === 80 ? 12 : 11;
  const lg = w === 80 ? 16 : 14;

  const rows = bill.lines
    .map(
      (l) => `
      <tr>
        <td class="name">${escape(l.name)}</td>
        <td class="qty">${l.qty}</td>
        <td class="rate">${l.price}</td>
        <td class="amt">${l.price * l.qty}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Bill ${bill.id}</title>
<style>
  @page { size: ${w}mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000;
    font-family: 'Courier New', ui-monospace, monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { box-sizing: border-box; }
  .receipt { width: ${w}mm; padding: ${pad}; font-size: ${fs}px; line-height: 1.35; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .lg { font-size: ${lg}px; font-weight: 800; letter-spacing: 1px; }
  .sm { font-size: ${fs - 1}px; }
  .hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  .dbl { border: 0; border-top: 2px solid #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: ${fs}px; }
  th, td { padding: 1px 0; vertical-align: top; }
  th { text-align: left; font-weight: 700; }
  th.qty, td.qty { width: 12%; text-align: center; }
  th.rate, td.rate { width: 20%; text-align: right; }
  th.amt, td.amt { width: 24%; text-align: right; }
  td.name { word-break: break-word; padding-right: 2px; }
  .row { display: flex; justify-content: space-between; }
  .total-row { font-size: ${fs + 2}px; font-weight: 800; }
  .foot { text-align: center; margin-top: 6px; }
  @media print { .noprint { display: none !important; } }
</style></head>
<body>
  <div class="receipt">
    <div class="center lg">BTECH CAFE</div>
    <div class="center sm">Nallurahalli</div>
    <div class="center sm">Bengaluru</div>
    <hr class="dbl"/>
    <div class="row"><span>Invoice</span><span class="bold">${bill.id}</span></div>
    <div class="row"><span>Table</span><span class="bold">${escape(bill.tableLabel)}</span></div>
    <div class="row"><span>Date</span><span>${bill.date}</span></div>
    <div class="row"><span>Time</span><span>${bill.time}</span></div>
    <hr class="hr"/>
    <table>
      <thead>
        <tr><th>Item</th><th class="qty">Qty</th><th class="rate">Rate</th><th class="amt">Total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <hr class="hr"/>
    <div class="row"><span>Subtotal</span><span>₹${bill.total}</span></div>
    <div class="row total-row"><span>GRAND TOTAL</span><span>₹${bill.total}</span></div>
    <hr class="dbl"/>
    <div class="foot bold">Thank You</div>
    <div class="foot sm">Visit Again</div>
  </div>
</body></html>`;
}

/**
 * Prints a receipt using a hidden iframe. This is more reliable than
 * window.open (no popup blockers) and immediately opens the browser's
 * native print dialog — the user picks their thermal printer there.
 * If a thermal printer is set as default in Windows, printing goes
 * directly to it. Never triggers a "Save as PDF" automatically.
 */
export function printBill(bill: Bill, width?: PrinterWidth) {
  try {
    const w = width ?? getPrinterWidth();
    const html = receiptHTML(bill, w);

    // Remove any prior print frame to avoid stacking
    document.querySelectorAll("iframe[data-btech-print]").forEach((n) => n.remove());

    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-btech-print", "1");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doPrint = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("Print frame unavailable");
        win.focus();
        win.print();
      } catch (err) {
        console.error("[print] failed", err);
        alert(
          "Unable to open the print dialog. Please check that a printer is installed and try again."
        );
      } finally {
        // Give the print dialog time to grab the frame content, then cleanup.
        setTimeout(() => iframe.remove(), 2000);
      }
    };

    iframe.onload = doPrint;
    // srcdoc is well supported and simpler than doc.write for print iframes
    iframe.srcdoc = html;
  } catch (err) {
    console.error("[print] error", err);
    alert("Printing failed. Please make sure your thermal printer is connected and set as default.");
  }
}
