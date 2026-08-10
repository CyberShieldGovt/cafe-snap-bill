// Server-only order engine. All table / token / QR orders flow through here.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Loose = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};
const db = () => supabaseAdmin as unknown as Loose;

function unwrap(res: { data: any; error: any }): any {
  if (res.error) throw new Error(res.error.message ?? String(res.error));
  return res.data;
}

export type PlaceOrderInput = {
  orderType: "TABLE" | "TOKEN" | "CUSTOMER_QR";
  locationId?: string | null;
  customerName?: string | null;
  customerMobile?: string | null;
  items: { item_id: string; qty: number; notes?: string }[];
  notes?: string | null;
  sessionId?: string | null;
  discountPct?: number;
};

export async function placeOrder(input: PlaceOrderInput) {
  const res = await db().rpc("place_order", {
    p_order_type: input.orderType,
    p_location_id: input.locationId ?? null,
    p_customer_name: input.customerName ?? null,
    p_customer_mobile: input.customerMobile ?? null,
    p_items: input.items,
    p_notes: input.notes ?? null,
    p_session_id: input.sessionId ?? null,
    p_discount_pct: input.discountPct ?? 0,
  });
  if (res.error) {
    const msg = String(res.error.message ?? res.error);
    if (msg.includes("TABLE_BUSY")) throw new Error("This table already has an active order.");
    if (msg.includes("ITEM_UNAVAILABLE")) throw new Error("One of the items is currently unavailable.");
    if (msg.includes("INVALID_LOCATION")) throw new Error("Unknown table / location.");
    if (msg.includes("INVALID_ITEM")) throw new Error("Unknown menu item.");
    if (msg.includes("EMPTY_ORDER")) throw new Error("Your order is empty.");
    throw new Error(msg);
  }
  return res.data;
}

export async function addItems(orderId: string, items: { item_id: string; qty: number; notes?: string }[]) {
  return unwrap(await db().rpc("add_order_items", { p_order_id: orderId, p_items: items }));
}

export async function setStatus(orderId: string, status: string, note?: string) {
  return unwrap(await db().rpc("set_order_status", { p_order_id: orderId, p_status: status, p_note: note ?? null }));
}

export async function recordPayment(orderId: string, mode: string, amount?: number) {
  return unwrap(await db().rpc("record_payment", { p_order_id: orderId, p_mode: mode, p_amount: amount ?? null }));
}

export async function listLocations() {
  return unwrap(
    await db()
      .from("locations")
      .select("id, location_type, table_number, label, short, qr_id, status, active_order_id, sort_order")
      .eq("is_active", true)
      .order("sort_order")
  );
}

const ORDER_COLS =
  "id, order_no, order_type, location_id, location_type, location_label, token_number, status, customer_name, customer_mobile, notes, subtotal, discount_pct, discount_amount, total, payment_mode, paid_at, tracking_token, created_at, updated_at, closed_at";

export async function listOrders(opts: { activeOnly?: boolean; limit?: number } = {}) {
  let q = db()
    .from("orders")
    .select(`${ORDER_COLS}, order_items(id, name, price, qty, kot_section, notes, status)`)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.activeOnly) {
    q = q.not("status", "in", "(COMPLETED,CANCELLED)");
  }
  return unwrap(await q);
}

export async function getOrder(orderId: string) {
  return unwrap(
    await db()
      .from("orders")
      .select(`${ORDER_COLS}, order_items(id, name, price, qty, kot_section, notes, status)`)
      .eq("id", orderId)
      .maybeSingle()
  );
}

export async function listKots(opts: { orderId?: string; pendingOnly?: boolean } = {}) {
  let q = db()
    .from("kots")
    .select("id, order_id, section_id, section_name, revision, print_status, printed_at, created_at, kot_items(name, qty, notes), orders(order_no, token_number, location_label, location_type, customer_name, notes)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts.orderId) q = q.eq("order_id", opts.orderId);
  if (opts.pendingOnly) q = q.eq("print_status", "PENDING");
  return unwrap(await q);
}

export async function markKotPrinted(kotId: string) {
  return unwrap(
    await db()
      .from("kots")
      .update({ print_status: "PRINTED", printed_at: new Date().toISOString() })
      .eq("id", kotId)
      .select("id, print_status, printed_at")
      .maybeSingle()
  );
}

export async function listMenu(forCustomer: boolean) {
  const cats = unwrap(
    await db().from("menu_categories").select("id, name, emoji, sort_order").order("sort_order")
  ) as { id: string; name: string; emoji: string; sort_order: number }[];
  let iq = db()
    .from("menu_items")
    .select("id, category_id, name, price, sort_order, is_active, is_available, is_veg, description, image_url, visibility, kot_section, prep_time_min")
    .eq("is_active", true)
    .order("sort_order");
  if (forCustomer) iq = iq.in("visibility", ["CUSTOMER", "BOTH"]);
  const items = unwrap(await iq) as any[];
  return cats
    .map((c) => ({ ...c, items: items.filter((i) => i.category_id === c.id) }))
    .filter((c) => c.items.length > 0);
}

export async function updateMenuItem(id: string, patch: Record<string, unknown>) {
  return unwrap(await db().from("menu_items").update(patch).eq("id", id).select("id").maybeSingle());
}

export async function createMenuItem(row: Record<string, unknown>) {
  return unwrap(await db().from("menu_items").insert(row).select("id").maybeSingle());
}

export async function deleteMenuItem(id: string) {
  return unwrap(await db().from("menu_items").delete().eq("id", id).select("id"));
}

export async function listKotSections() {
  return unwrap(await db().from("kot_sections").select("id, name, sort_order").order("sort_order"));
}

// ---------- Customer-facing ----------

export async function locationByQr(qrId: string) {
  return unwrap(await db().rpc("get_location_by_qr", { p_qr: qrId }));
}

export async function orderByTracking(token: string) {
  return unwrap(await db().rpc("get_order_by_tracking", { p_token: token }));
}

export async function createSession(input: {
  qrId?: string | null;
  locationId?: string | null;
  name: string;
  mobile: string;
}) {
  return unwrap(
    await db()
      .from("customer_sessions")
      .insert({
        qr_id: input.qrId ?? null,
        location_id: input.locationId ?? null,
        customer_name: input.name,
        customer_mobile: input.mobile,
      })
      .select("id")
      .maybeSingle()
  );
}

export async function dashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = unwrap(
    await db()
      .from("orders")
      .select("id, status, order_type, total, token_number, created_at")
      .gte("created_at", today.toISOString())
  ) as any[];
  const locations = (await listLocations()) as any[];
  const completed = orders.filter((o) => o.status === "COMPLETED");
  return {
    salesToday: completed.reduce((s, o) => s + (o.total ?? 0), 0),
    ordersToday: orders.length,
    pendingQr: orders.filter((o) => o.status === "PENDING_APPROVAL" && o.order_type === "CUSTOMER_QR").length,
    preparing: orders.filter((o) => o.status === "PREPARING").length,
    ready: orders.filter((o) => o.status === "READY").length,
    pendingPayments: orders.filter((o) => o.status === "PAYMENT_PENDING").length,
    activeTokens: orders.filter((o) => o.token_number && !["COMPLETED", "CANCELLED"].includes(o.status)).length,
    occupiedTables: locations.filter((l) => l.status !== "AVAILABLE").length,
    availableTables: locations.filter((l) => l.status === "AVAILABLE").length,
  };
}
