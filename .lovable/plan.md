# BTech Cafe POS — Cloud + Direct Print Upgrade

## What ships in this plan

1. **Menu additions** — `Parcel Charges ₹10` and `Water Bottle ₹10` added under the beverages/juices category. Behaves like any other item (selectable, qty, billed, printed, reported).

2. **Live table timer** — every occupied table on the dashboard shows "Billed At" (first-item timestamp) and rolling "Elapsed" (updates every 30s, survives reload, resets on Settle & Clear).

3. **QZ Tray direct thermal printing** to TVS RP 3200 Lite (58 mm, USB, ESC/POS).

4. **Full cloud migration** to Lovable Cloud (Supabase) with realtime sync + offline queue. localStorage → cloud, one-time auto-migration, no login (open device, shared workspace).

---

## 1. Menu items

Edit `src/lib/menu.ts`: append `Parcel Charges ₹10` and `Water Bottle ₹10` to the `juices` category (labelled "Fresh Juices, Mojitos & Shakes" — closest to beverages; can move to a new "Extras" category if you prefer — say the word). No other code needs to change; they flow through orders, bills, print, and sales automatically.

## 2. Live table timer

- Add `startedAt: number` (ms epoch) to the order record when the **first** item is added to an empty table.
- Cleared when the table is settled or emptied.
- Dashboard table card renders:
  - `Billed At: 10:10 AM`
  - `Elapsed: 1 hr 42 mins` (formatter: <1 min → "just now", <60 → "N mins", else "H hr M mins")
- A single `useEffect` in the dashboard ticks a `now` state every 30 s so all cards update together without re-reading storage.

## 3. QZ Tray direct printing

**One-time setup on the billing PC (you do this once):**
1. Download & install QZ Tray from `https://qz.io/download/` (free, works on Windows).
2. Plug in the TVS RP 3200 Lite and install its Windows driver (TVS provides one — printer appears as `TVSE RP 3200` or similar in Windows "Printers & scanners").
3. Start QZ Tray (auto-starts on boot).
4. First time the app prints, QZ shows a one-time trust prompt → tick "Remember" → Allow.

**What I build in the app:**
- `src/lib/qz.ts` — loads QZ Tray JS client from CDN, connects over `ws://localhost:8181`, auto-detects a printer whose name matches `/tvs|rp.?3200|thermal|pos/i` (falls back to Windows default printer).
- Uses **raw ESC/POS** mode (not HTML/PDF) so it prints instantly with no dialog:
  - Init (`ESC @`), center + bold header `BTECH CAFE`, address lines
  - Bill no, table, date, time
  - Item rows with right-aligned qty × rate and total (32-char line for 58 mm)
  - Dashed separators, grand total in double-width
  - Footer "Thank You / Visit Again"
  - Cut command (`GS V 1` partial cut — printer ignores if unsupported)
- Save & Print flow:
  1. Save the order to cloud (same as today).
  2. `await qz.print(receipt)` → if it throws (QZ not running, printer offline), show a red toast **"Printer offline — is QZ Tray running and the TVS printer connected?"** and keep the saved bill so staff can Reprint from Sales.
- Sales page "Reprint" button uses the same path.
- Printer width preference on Sales stays (58/80 mm — controls ESC/POS line width, since QZ can also drive 80 mm units).

## 4. Cloud migration (Lovable Cloud, no login)

Enable Lovable Cloud and create these tables (all with permissive `anon` policies since there is no login — this is an in-cafe device):

```text
menu_items     (id, category_id, name, price, sort_order, is_active)
menu_categories(id, name, emoji, sort_order)
table_orders   (table_id PK, lines jsonb, started_at, updated_at)
bills          (id PK bill-number, table_id, table_label, lines jsonb,
                total, item_count, status, created_at)
inventory_items(id, name, unit, stock, low_stock_threshold, updated_at)
purchases      (id, supplier, entered_at, items jsonb, image_url)
settings       (key PK, value jsonb)   -- printer width, bill counter, etc.
```

Realtime is enabled on `table_orders` and `bills` so a second tablet updates instantly.

**One-time migration (runs on first cloud-connected load):**
1. Read every `btech-cafe-*` localStorage key.
2. Upsert menu (from `src/lib/menu.ts` if `menu_items` is empty), then bills, orders, inventory, purchases, settings, bill counter.
3. Write a `settings` row `{ key: 'migrated_v1', value: true }` so it never re-runs.
4. After success, flip a runtime flag so all reads/writes go through the cloud client and localStorage becomes a read-only fallback cache.

**Data hooks rewrite:**
- `useAllOrders`, `useTableOrder`, `useBills`, inventory hooks, printer-width hook → all rewritten to hit Supabase via TanStack Query + realtime subscriptions.
- Public API is preserved (same hook names + return shapes) so `index.tsx`, `table.$id.tsx`, `sales.tsx`, `inventory.tsx` don't need UI rewrites.

**Offline queue:**
- A tiny `src/lib/sync.ts` wraps writes: online → straight to Supabase; offline (or network error) → append to an IndexedDB queue and apply optimistically to a local cache; on reconnect (`online` event + 15s poll) flush queue in order with idempotent upserts keyed by `id` / `bill_number` / `table_id` so a retry can never duplicate.
- Header shows a small pill: **Online / Offline / Syncing (N) / Synced**.

## Technical details

- QZ Tray is loaded via `<script src="https://cdn.jsdelivr.net/npm/qz-tray/qz-tray.js">` in `__root.tsx` (lazy, only on client) so it doesn't affect SSR builds.
- ESC/POS bytes are generated in-app (no external escpos npm needed) — simple enough for 58 mm receipts and keeps the bundle small.
- Bill number counter moves to a Postgres sequence / `settings.bill_counter` row updated via a server function so two tablets can't mint the same number.
- Realtime uses Supabase Realtime channels on the two hot tables; polling fallback every 30 s if the WebSocket is dropped.
- All tables get explicit `GRANT SELECT, INSERT, UPDATE, DELETE ... TO anon` because the app has no login. If you ever want per-staff login later, we tighten policies then.
- Existing UI, colors, layout, dashboards, sales charts, inventory screens — **untouched** except the timer additions on table cards and the online/offline pill in the header.

## What I need from you before shipping the printer bit

- Confirm the TVS RP 3200 Lite is installed as a Windows printer on the billing PC (visible in Settings → Printers). If yes, QZ Tray will see it by name and I'll auto-select it. If you know the exact name Windows shows, tell me and I'll match it verbatim.

## Things I explicitly will NOT change

- Existing Save & Re-add and Settle & Clear behavior.
- Existing bill format layout (header, table, totals, footer) — only the delivery mechanism changes from browser-dialog to ESC/POS direct.
- Sales page charts, filters, item-sold-today section.
- Inventory upload/OCR flow.

Approve and I'll start with cloud enable + schema + migration, then printing, then timer + menu items.