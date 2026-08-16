import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchOrders, updateOrderStatus } from "@/lib/pos.functions";
import { ArrowLeft, Check, ChefHat, Clock, PartyPopper, QrCode, RefreshCw, X } from "lucide-react";
import { Toaster, toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "QR Orders — BTech Cafe" },
      { name: "description", content: "Approve, prepare and close customer QR orders at BTech Cafe." },
      { property: "og:title", content: "QR Orders — BTech Cafe" },
      { property: "og:description", content: "Live queue of customer QR orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  order_no: string;
  order_type: string;
  location_label: string | null;
  token_number: number | null;
  status: string;
  customer_name: string | null;
  customer_mobile: string | null;
  notes: string | null;
  total: number;
  created_at: string;
  order_items: { id: string; name: string; qty: number; price: number; notes: string | null }[];
};

const FILTERS = [
  { id: "PENDING_APPROVAL", label: "Awaiting approval" },
  { id: "PREPARING", label: "Preparing" },
  { id: "READY", label: "Ready" },
  { id: "ALL", label: "All active" },
] as const;

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min ago`;
}

function OrdersPage() {
  const getOrders = useServerFn(fetchOrders);
  const setStatus = useServerFn(updateOrderStatus);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("PENDING_APPROVAL");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => getOrders({ data: { activeOnly: true, limit: 100 } }),
    refetchInterval: 6000,
  });

  const orders = (data ?? []) as OrderRow[];

  const mutate = useMutation({
    mutationFn: (v: { orderId: string; status: string; note?: string }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
    onError: (e: Error) => toast.error(e.message || "Could not update the order"),
  });

  const act = (o: OrderRow, status: string, note?: string, msg?: string) => {
    mutate.mutate(
      { orderId: o.id, status, note },
      { onSuccess: () => toast.success(msg ?? `${o.order_no} updated`) }
    );
  };

  const pending = orders.filter((o) => o.status === "PENDING_APPROVAL");
  const visible = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Tables
          </Link>
          <div className="h-8 w-px bg-border" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">BTech Cafe</div>
            <div className="text-lg font-black leading-tight text-foreground">QR Orders</div>
          </div>
          {pending.length > 0 && (
            <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground">
              {pending.length} new
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-bold transition hover:bg-primary hover:text-primary-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count = f.id === "ALL" ? orders.length : orders.filter((o) => o.status === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${
                  filter === f.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {f.label} · {count}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border py-20 text-center text-muted-foreground">
            <QrCode className="mx-auto mb-3 h-8 w-8 opacity-50" />
            No orders here right now.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((o) => (
              <article key={o.id} className="rounded-3xl border-2 border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {o.order_type === "CUSTOMER_QR" ? "Customer QR" : o.order_type}
                    </div>
                    <h2 className="truncate text-lg font-black leading-tight">
                      {o.location_label || "Takeaway"}
                      {o.token_number != null && <span className="ml-2 text-primary">#{o.token_number}</span>}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {o.order_no} · {timeAgo(o.created_at)}
                    </p>
                  </div>
                  <StatusPill status={o.status} />
                </div>

                {(o.customer_name || o.customer_mobile) && (
                  <p className="mt-2 truncate text-xs font-semibold text-foreground">
                    {o.customer_name} {o.customer_mobile ? `· ${o.customer_mobile}` : ""}
                  </p>
                )}

                <ul className="mt-3 space-y-1.5 rounded-2xl bg-secondary/40 p-3">
                  {o.order_items?.map((it) => (
                    <li key={it.id} className="flex items-start justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-bold">{it.qty}×</span> {it.name}
                        {it.notes && <em className="block text-[11px] text-muted-foreground">“{it.notes}”</em>}
                      </span>
                      <span className="shrink-0 font-semibold">₹{it.price * it.qty}</span>
                    </li>
                  ))}
                </ul>

                {o.notes && <p className="mt-2 text-[11px] text-muted-foreground">Note: {o.notes}</p>}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</span>
                  <span className="text-xl font-black text-primary">₹{o.total}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "PENDING_APPROVAL" && (
                    <>
                      <ActionBtn
                        primary
                        onClick={() => act(o, "PREPARING", "approved at counter", `${o.order_no} approved`)}
                      >
                        <Check className="h-4 w-4" /> Approve
                      </ActionBtn>
                      <ActionBtn
                        destructive
                        onClick={() => act(o, "CANCELLED", "rejected at counter", `${o.order_no} rejected`)}
                      >
                        <X className="h-4 w-4" /> Reject
                      </ActionBtn>
                    </>
                  )}
                  {o.status === "PREPARING" && (
                    <ActionBtn primary onClick={() => act(o, "READY", "food ready", `${o.order_no} ready`)}>
                      <PartyPopper className="h-4 w-4" /> Mark ready
                    </ActionBtn>
                  )}
                  {o.status === "READY" && (
                    <ActionBtn primary onClick={() => act(o, "COMPLETED", "served", `${o.order_no} completed`)}>
                      <Check className="h-4 w-4" /> Served & close
                    </ActionBtn>
                  )}
                  {!["PENDING_APPROVAL", "COMPLETED", "CANCELLED"].includes(o.status) && (
                    <ActionBtn onClick={() => act(o, "CANCELLED", "cancelled by staff", `${o.order_no} cancelled`)}>
                      Cancel
                    </ActionBtn>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
    PENDING_APPROVAL: { label: "New", icon: Clock, cls: "bg-primary text-primary-foreground" },
    PREPARING: { label: "Preparing", icon: ChefHat, cls: "bg-secondary text-foreground" },
    READY: { label: "Ready", icon: PartyPopper, cls: "bg-foreground text-background" },
  };
  const m = map[status] ?? { label: status, icon: Clock, cls: "bg-secondary text-foreground" };
  const Icon = m.icon;
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
        primary
          ? "bg-primary text-primary-foreground hover:brightness-110"
          : destructive
            ? "border-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-2 border-border text-foreground hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}
