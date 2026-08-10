import { createServerFn } from "@tanstack/react-start";

export const fetchLocations = createServerFn({ method: "GET" }).handler(async () => {
  const { listLocations } = await import("./pos.server");
  return listLocations();
});

export const fetchOrders = createServerFn({ method: "GET" })
  .inputValidator((d: { activeOnly?: boolean; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const { listOrders } = await import("./pos.server");
    return listOrders(data);
  });

export const fetchOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const { getOrder } = await import("./pos.server");
    return getOrder(data.orderId);
  });

export const fetchDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { dashboardStats } = await import("./pos.server");
  return dashboardStats();
});

export const fetchMenu = createServerFn({ method: "GET" })
  .inputValidator((d: { forCustomer?: boolean } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const { listMenu } = await import("./pos.server");
    return listMenu(Boolean(data.forCustomer));
  });

export const fetchKotSections = createServerFn({ method: "GET" }).handler(async () => {
  const { listKotSections } = await import("./pos.server");
  return listKotSections();
});

export const fetchKots = createServerFn({ method: "GET" })
  .inputValidator((d: { orderId?: string; pendingOnly?: boolean } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const { listKots } = await import("./pos.server");
    return listKots(data);
  });

export const kotPrinted = createServerFn({ method: "POST" })
  .inputValidator((d: { kotId: string }) => d)
  .handler(async ({ data }) => {
    const { markKotPrinted } = await import("./pos.server");
    return markKotPrinted(data.kotId);
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      orderType: "TABLE" | "TOKEN";
      locationId?: string | null;
      customerName?: string | null;
      customerMobile?: string | null;
      items: { item_id: string; qty: number; notes?: string }[];
      discountPct?: number;
      notes?: string | null;
    }) => d
  )
  .handler(async ({ data }) => {
    const { placeOrder } = await import("./pos.server");
    return placeOrder(data);
  });

export const appendItems = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; items: { item_id: string; qty: number; notes?: string }[] }) => d)
  .handler(async ({ data }) => {
    const { addItems } = await import("./pos.server");
    return addItems(data.orderId, data.items);
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; status: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const { setStatus } = await import("./pos.server");
    return setStatus(data.orderId, data.status, data.note);
  });

export const payOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; mode: string; amount?: number }) => d)
  .handler(async ({ data }) => {
    const { recordPayment } = await import("./pos.server");
    return recordPayment(data.orderId, data.mode, data.amount);
  });

export const saveMenuItem = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const { updateMenuItem, createMenuItem } = await import("./pos.server");
    return data.id ? updateMenuItem(data.id, data.patch) : createMenuItem(data.patch);
  });

export const removeMenuItem = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { deleteMenuItem } = await import("./pos.server");
    return deleteMenuItem(data.id);
  });
