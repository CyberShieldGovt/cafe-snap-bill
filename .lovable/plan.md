# BTech Cafe — QR Ordering, Tokens, KOT & Landing Page

A staged upgrade on top of the existing POS. Nothing currently working is removed: existing table carts, bill history, QZ Tray printing, inventory, expenses and sales reports keep working exactly as they do today while the new order engine is introduced alongside them.

## What exists today (inspected)

- Tables are a hardcoded list in code: 5 Quick Service (`1`-`5`) + 12 Rooftop (`R1`-`R12`).
- Active carts live in `table_orders` (one row per table, lines as JSON) mirrored to localStorage with realtime sync.
- Finished bills go to `bills` (flat row, lines as JSON, server-side bill number).
- Menu lives in `menu_categories` / `menu_items`.
- Printing is QZ Tray ESC/POS (58/80mm) with bill + single KOT.
- No authentication, no customer-facing surface, no order status model.

The current data model has no place for order status, customers, tokens, KOT records or table locations — so the core of this work is a proper order engine that the existing screens then read from.

## Routing change (please confirm)

Today the POS dashboard is at `/`. The plan moves it to `/admin` and gives `/` to the public landing page. All existing POS screens move under `/admin/*` with the old paths redirecting so nothing breaks mid-shift.

## Phase 1 — Data foundation

New tables (all with grants + RLS):

- `locations` — location_type (QUICK_SERVICE / ROOFTOP / SMOKE_ZONE / TAKEAWAY), table_number, label, qr_id (random, unguessable), status, active_order_id. Seeded with the existing 17 tables (same ids, so current carts survive) + 5 Smoke Zone + 5 Takeaway.
- `orders` — master order: order_type (TABLE / TOKEN / CUSTOMER_QR), location, token_number, status, customer name/mobile, subtotal/discount/total, payment_mode, paid_at, timestamps, public tracking token.
- `order_items` — line-level rows with price snapshot, kot_section, item status.
- `kots` + `kot_items` — one KOT record per section per order, with printed_at / print_status for duplicate prevention.
- `kot_sections` and a `kot_section` column on `menu_items` (default mapping: one section per category, Continental as fallback), editable from admin.
- `customer_sessions` — session id, qr_id, customer details, expiry.
- `order_status_history`, `payments`.
- `menu_items` gains: description, image_url, is_veg, is_available, visibility (CUSTOMER / POS / BOTH), prep_time.
- Server-side sequence functions: `next_token_number()` and order numbering, same pattern as the existing `next_bill_number()`.

Order creation, token generation, table occupation, payment and KOT generation all go through transactional Postgres functions so two devices can never double-book a table or reuse a token.

## Phase 2 — Order engine (server functions)

One shared engine in `src/lib/orders-engine.server.ts` + thin `*.functions.ts` wrappers:

- create/append order (TABLE, TOKEN, CUSTOMER_QR all use the same path)
- approve / reject QR order, record payment, advance status, close table
- generate KOTs grouped by section, idempotent by `(order_id, section, revision)`
- public customer endpoints (menu read, session create, place order, track by secure token) with prices recomputed server-side — client totals are never trusted.

## Phase 3 — Admin

- `/admin` dashboard: today's sales, pending QR orders, preparing, ready, occupied/available tables, active tokens, pending payments.
- `/admin/tables`: four sections (Quick Service, Rooftop, Smoke Zone, Takeaway), status badge + text, customer, amount, server-timestamp running timer. Occupied tables open the existing order screen instead of starting a second bill.
- `/admin/orders`: Live Orders with tabs (All / QR / Table / Token / Takeaway / Preparing / Ready / Completed / Cancelled) and Approve / Reject / View for QR orders.
- `/admin/tokens`: NEW TOKEN → server-issued token → the existing POS item picker → bill + KOTs, TOKEN #NNN shown large.
- `/admin/kot`: KOT list, print status, reprint.
- `/admin/menu`: categories/items CRUD, image upload to storage, veg flag, availability, KOT section, visibility, sort order.
- Existing `/admin/sales`, `/admin/inventory`, `/admin/expenses` unchanged, plus new report filters (order type, location, token, KOT section, payment mode).

## Phase 4 — Printing

Reuses `src/lib/qz.ts` untouched. Adds:

- section-wise KOT slips (BTECH CAFE, TOKEN #/table label, order no, section, date/time, items, notes)
- bill layout gains order/token number, location, customer name, payment mode, tax/discount lines
- print calls mark `printed_at` server-side so reconnects and refreshes never reprint.

## Phase 5 — Customer QR experience

Separate visual language from the POS — mobile-first, large imagery, rounded cards, sticky category rail, floating cart, bottom sheets.

- `/order?q=<qr_id>` — welcome + name/mobile + detected location (Takeaway needs no table)
- menu with search, category chips with scroll-spy, add-to-cart animation, item bottom sheet with special instructions
- cart sheet → Place Order → "Go to the counter and tell them Rooftop 04"
- `/order-status/<token>` — realtime status stepper
- `/menu` — public read-only menu

## Phase 6 — Landing page

`/` with hero, about, signature experiences, our spaces, gallery, why BTech Cafe, order-online CTA, location with directions, footer. Full SEO head (title, description, OG image), no invented reviews or claims.

## Technical notes

- Existing localStorage cache layer stays as the offline mirror for POS screens; new order data is read through TanStack Query against the cloud with realtime invalidation, falling back to polling.
- Customer endpoints are public server routes with no admin surface; admin mutations stay in server functions.
- No auth is added (the cafe runs open-device today). If you want the admin section behind a login, say so and I'll add it in Phase 3.

## Suggested order of delivery

Phases 1+2 first (schema + engine, nothing visible changes), then 3+4 (admin + printing), then 5+6 (customer + landing). Each phase is verified against the existing POS before moving on.
