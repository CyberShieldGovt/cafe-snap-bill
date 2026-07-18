import { createFileRoute, Link } from "@tanstack/react-router";
import { TABLE_COUNT, useAllOrders, total } from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTech Cafe — POS & Table Billing" },
      { name: "description", content: "Offline POS and table billing for BTech Cafe." },
      { property: "og:title", content: "BTech Cafe POS" },
      { property: "og:description", content: "Fast, tablet-friendly table billing for BTech Cafe." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const orders = useAllOrders();
  const tables = Array.from({ length: TABLE_COUNT }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              BTech <span className="text-primary">Cafe</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Table billing & orders</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Tables</div>
            <div className="text-2xl font-bold text-foreground">{TABLE_COUNT}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Select a table</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tables.map((n) => {
            const lines = orders[String(n)] || [];
            const occupied = lines.length > 0;
            const amt = total(lines);
            return (
              <Link
                key={n}
                to="/table/$id"
                params={{ id: String(n) }}
                className={`group relative rounded-3xl border-2 p-6 transition-all active:scale-[0.98] ${
                  occupied
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
                    : "bg-card text-card-foreground border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider ${occupied ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      Table
                    </div>
                    <div className="text-5xl font-bold mt-1">{n}</div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      occupied
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {occupied ? "Occupied" : "Available"}
                  </span>
                </div>
                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <div className={`text-xs ${occupied ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      Current bill
                    </div>
                    <div className="text-3xl font-bold mt-1">₹{amt}</div>
                  </div>
                  <div className={`text-sm font-medium ${occupied ? "text-primary-foreground/90" : "text-primary"}`}>
                    Open →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
