import type { Bill } from "./bills";

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

export function receiptHTML(bill: Bill): string {
  const rows = bill.lines
    .map(
      (l) => `
      <tr>
        <td class="name">${escape(l.name)}</td>
        <td class="qty">${l.qty}</td>
        <td class="amt">₹${l.price * l.qty}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Bill ${bill.id}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000;
    font-family: 'Courier New', ui-monospace, monospace; }
  .receipt { width: 58mm; padding: 4mm 3mm; font-size: 11px; line-height: 1.35; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .lg { font-size: 14px; font-weight: 800; letter-spacing: 1px; }
  .hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  .dbl { border: 0; border-top: 2px solid #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 1px 0; vertical-align: top; }
  th { text-align: left; font-weight: 700; }
  th.qty, td.qty { width: 22%; text-align: center; }
  th.amt, td.amt { width: 28%; text-align: right; }
  td.name { word-break: break-word; padding-right: 2px; }
  .row { display: flex; justify-content: space-between; }
  .total-row { font-size: 13px; font-weight: 800; }
  .foot { text-align: center; margin-top: 6px; }
  @media print { .noprint { display: none !important; } }
</style></head>
<body>
  <div class="receipt">
    <div class="center lg">BTECH CAFE</div>
    <div class="center">Nallurahalli,</div>
    <div class="center">Bengaluru</div>
    <hr class="dbl"/>
    <div class="row"><span>Bill No</span><span class="bold">${bill.id}</span></div>
    <div class="row"><span>Table</span><span class="bold">${escape(bill.tableLabel)}</span></div>
    <div class="row"><span>Date</span><span>${bill.date}</span></div>
    <div class="row"><span>Time</span><span>${bill.time}</span></div>
    <hr class="hr"/>
    <table>
      <thead>
        <tr><th>Item</th><th class="qty">Qty</th><th class="amt">Amt</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <hr class="hr"/>
    <div class="row total-row"><span>TOTAL</span><span>₹${bill.total}</span></div>
    <hr class="dbl"/>
    <div class="foot bold">Thank You!</div>
    <div class="foot">Visit Again</div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 80);
      window.addEventListener('afterprint', function () { window.close(); });
    });
  </script>
</body></html>`;
}

export function printBill(bill: Bill) {
  const w = window.open("", "PRINT", "width=380,height=640");
  if (!w) {
    alert("Please allow pop-ups to print the receipt.");
    return;
  }
  w.document.open();
  w.document.write(receiptHTML(bill));
  w.document.close();
}
