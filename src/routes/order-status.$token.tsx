import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trackOrder } from "@/lib/customer.functions";
import { Check, ChefHat, Clock, PartyPopper, Coffee, XCircle } from "lucide-react";

export const Route = createFileRoute("/order-status/$token")({
  head: () => ({
    meta: [
      { title: "Track your order — BTech Cafe" },
      { name: "description", content: "Live status of your BTech Cafe order, from kitchen to table." },
      { property: "og:title", content: "Track your order — BTech Cafe" },
      { property: "og:description", content: "Live status of your BTech Cafe order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

const STEPS = [
  { key: "PENDING_APPROVAL", label: "Sent to counter", icon: Clock },
  { key: "APPROVED", label: "Approved", icon: Check },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "READY", label: "Ready", icon: PartyPopper },
  { key: "SERVED", label: "Served", icon: Coffee },
];

function StatusPage() {
  const { token } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["track", token],
    queryFn: () => trackOrder({ data: { token } }),
    refetchInterval: 8000,
  });

  const order = data as
    | {
        order_no: string;
        status: string;
        token_number: number | null;
        location_label: string | null;
        total: number;
        items: { name: string; qty: number; price: number }[];
        created_at: string;
      }
    | null
    | undefined;

  if (isLoading) return <p className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</p>;

  if (!order)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <XCircle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-3 text-xl font-black">Order not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">This tracking link is invalid or has expired.</p>
          <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Back to home
          </Link>
        </div>
      </div>
    );

  const cancelled = order.status === "CANCELLED";
  const idx = STEPS.findIndex((s) => s.key === order.status);
  const activeIdx = order.status === "COMPLETED" || order.status === "PAYMENT_PENDING" ? STEPS.length - 1 : idx;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Order {order.order_no}</p>
          {order.token_number != null && (
            <>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-primary">Your token</p>
              <p className="text-6xl font-black leading-none tracking-tight">{order.token_number}</p>
            </>
          )}
          <p className="mt-3 text-sm font-bold">{order.location_label ?? "Takeaway"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {cancelled ? "This order was cancelled." : "Keep this page open — it updates automatically."}
          </p>
        </div>

        {!cancelled && (
          <div className="mt-4 rounded-3xl border border-border bg-card p-5">
            {STEPS.map((s, i) => {
              const done = activeIdx >= i;
              return (
                <div key={s.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`grid size-9 place-items-center rounded-full transition ${
                        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <s.icon className="size-4" />
                    </div>
                    {i < STEPS.length - 1 && <div className={`h-6 w-0.5 ${activeIdx > i ? "bg-primary" : "bg-border"}`} />}
                  </div>
                  <p className={`pt-2 text-sm font-bold ${done ? "" : "text-muted-foreground"}`}>{s.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your items</h2>
          <div className="mt-3 space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-3 text-sm">
                <span className="font-semibold">
                  {it.name} <span className="text-muted-foreground">× {it.qty}</span>
                </span>
                <span className="font-bold">₹{it.price * it.qty}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-black">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>

        <Link to="/" className="mt-5 block text-center text-xs font-semibold text-muted-foreground hover:text-foreground">
          Back to home
        </Link>
      </div>
    </div>
  );
}
