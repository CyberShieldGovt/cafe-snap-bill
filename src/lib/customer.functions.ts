import { createServerFn } from "@tanstack/react-start";

/** Public menu for the customer app — only items marked visible to customers. */
export const customerMenu = createServerFn({ method: "GET" }).handler(async () => {
  const { listMenu } = await import("./pos.server");
  return listMenu(true);
});

/** Resolve a scanned QR id to its table/location. Never trust a table id from the client. */
export const resolveQr = createServerFn({ method: "GET" })
  .inputValidator((d: { qr: string }) => d)
  .handler(async ({ data }) => {
    const { locationByQr } = await import("./pos.server");
    return locationByQr(data.qr);
  });

export const startSession = createServerFn({ method: "POST" })
  .inputValidator((d: { qr?: string | null; name: string; mobile: string }) => {
    const name = (d.name ?? "").trim();
    const mobile = (d.mobile ?? "").trim();
    if (name.length < 2) throw new Error("Please enter your name.");
    if (!/^[0-9]{10}$/.test(mobile)) throw new Error("Please enter a valid 10-digit mobile number.");
    return { qr: d.qr ?? null, name, mobile };
  })
  .handler(async ({ data }) => {
    const { locationByQr, createSession } = await import("./pos.server");
    let locationId: string | null = null;
    let location: any = null;
    if (data.qr) {
      location = await locationByQr(data.qr);
      if (!location) throw new Error("This QR code is not valid.");
      locationId = location.id;
    }
    const session = await createSession({
      qrId: data.qr,
      locationId,
      name: data.name,
      mobile: data.mobile,
    });
    return { sessionId: (session as { id: string }).id, location };
  });

/** Place a customer QR order. Prices, totals and the table are resolved server-side. */
export const submitCustomerOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      sessionId: string;
      qr?: string | null;
      name: string;
      mobile: string;
      notes?: string;
      items: { item_id: string; qty: number; notes?: string }[];
    }) => {
      if (!Array.isArray(d.items) || d.items.length === 0) throw new Error("Your cart is empty.");
      return d;
    }
  )
  .handler(async ({ data }) => {
    const { locationByQr, placeOrder } = await import("./pos.server");
    let locationId: string | null = null;
    if (data.qr) {
      const loc = (await locationByQr(data.qr)) as { id: string } | null;
      if (!loc) throw new Error("This QR code is not valid.");
      locationId = loc.id;
    }
    const order = await placeOrder({
      orderType: "CUSTOMER_QR",
      locationId,
      customerName: data.name,
      customerMobile: data.mobile,
      notes: data.notes ?? null,
      sessionId: data.sessionId,
      items: data.items.map((i) => ({ item_id: i.item_id, qty: Number(i.qty) || 1, notes: i.notes })),
    });
    return {
      orderNo: order.order_no as string,
      trackingToken: order.tracking_token as string,
      locationLabel: order.location_label as string,
      tokenNumber: order.token_number as number | null,
      total: order.total as number,
    };
  });

/** Customer order tracking — only reachable with the secret tracking token. */
export const trackOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { orderByTracking } = await import("./pos.server");
    return orderByTracking(data.token);
  });
