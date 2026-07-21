import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Upload,
  Package,
  AlertTriangle,
  Trash2,
  Edit3,
  FileText,
  X,
  Check,
  History,
  Boxes,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useInventory,
  usePurchases,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addStock,
  addPurchase,
  parseBillText,
  stockStatus,
  UNITS,
  type Unit,
  type InventoryItem,
} from "@/lib/inventory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — BTech Cafe" },
      { name: "description", content: "Manage raw materials, stock levels and purchase bills for BTech Cafe." },
    ],
  }),
  component: InventoryPage,
});

type Tab = "list" | "upload" | "history";

function InventoryPage() {
  const { items } = useInventory();
  const { items: purchases } = usePurchases();
  const [tab, setTab] = useState<Tab>("list");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.supplier.toLowerCase().includes(q)
    );
  }, [items, query]);

  const total = items.length;
  const low = items.filter((i) => stockStatus(i) === "Low Stock").length;
  const out = items.filter((i) => stockStatus(i) === "Out of Stock").length;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" /> Tables
          </Link>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              BTech Cafe
            </div>
            <div className="text-lg font-black text-foreground leading-tight">Inventory</div>
          </div>
          <Link
            to="/sales"
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition"
          >
            Sales Summary →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Boxes className="w-4 h-4" />} label="Total Items" value={String(total)} accent />
          <Stat icon={<AlertTriangle className="w-4 h-4" />} label="Low Stock" value={String(low)} />
          <Stat icon={<Package className="w-4 h-4" />} label="Out of Stock" value={String(out)} />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab === "list"} onClick={() => setTab("list")} icon={<Boxes className="w-4 h-4" />}>
            Inventory List
          </TabBtn>
          <TabBtn active={tab === "upload"} onClick={() => setTab("upload")} icon={<Upload className="w-4 h-4" />}>
            Upload Purchase Bill
          </TabBtn>
          <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={<History className="w-4 h-4" />}>
            Purchase History
          </TabBtn>
        </div>

        {tab === "list" && (
          <section className="rounded-3xl border-2 border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— Stock</div>
                <h3 className="text-xl font-black text-foreground">Inventory List</h3>
              </div>
              <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search item / category / supplier"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 h-10 rounded-full bg-secondary border-transparent"
                  />
                </div>
                <Button
                  onClick={() => setShowAdd(true)}
                  className="h-10 rounded-full bg-primary text-primary-foreground font-bold gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl border-2 border-dashed border-border">
                {items.length === 0
                  ? "No inventory yet. Click 'Add Item' to get started."
                  : "No items match your search."}
              </div>
            ) : (
              <div className="overflow-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-foreground">
                    <tr className="text-left">
                      <Th>Item</Th>
                      <Th>Category</Th>
                      <Th>Current Stock</Th>
                      <Th>Unit</Th>
                      <Th>Min Stock</Th>
                      <Th>Supplier</Th>
                      <Th>Cost</Th>
                      <Th>Status</Th>
                      <Th className="text-right pr-4">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((i) => {
                      const s = stockStatus(i);
                      return (
                        <tr key={i.id} className="border-t border-border hover:bg-secondary/40">
                          <Td className="font-bold">{i.name}</Td>
                          <Td>{i.category || "—"}</Td>
                          <Td className="font-bold">{i.stock}</Td>
                          <Td>{i.unit}</Td>
                          <Td>{i.minStock}</Td>
                          <Td>{i.supplier || "—"}</Td>
                          <Td>₹{i.costPrice}</Td>
                          <Td>
                            <StatusPill status={s} />
                          </Td>
                          <Td className="text-right pr-2">
                            <div className="inline-flex items-center gap-1">
                              <IconBtn label="Edit" onClick={() => setEditing(i)}>
                                <Edit3 className="w-4 h-4" />
                              </IconBtn>
                              <IconBtn label="Delete" onClick={() => setDeleting(i)} destructive>
                                <Trash2 className="w-4 h-4" />
                              </IconBtn>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "upload" && <UploadBillPanel />}

        {tab === "history" && (
          <section className="rounded-3xl border-2 border-border bg-card p-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— History</div>
                <h3 className="text-xl font-black text-foreground">Purchase History</h3>
              </div>
              <div className="text-xs text-muted-foreground font-semibold">
                {purchases.length} entr{purchases.length === 1 ? "y" : "ies"}
              </div>
            </div>
            {purchases.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl border-2 border-dashed border-border">
                No purchases recorded yet.
              </div>
            ) : (
              <div className="overflow-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-foreground">
                    <tr className="text-left">
                      <Th>Date</Th>
                      <Th>Supplier</Th>
                      <Th>Items</Th>
                      <Th>Total Qty</Th>
                      <Th>Bill</Th>
                      <Th>Added By</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => {
                      const totalQty = p.items.reduce((s, it) => s + it.qty, 0);
                      const d = new Date(p.date);
                      return (
                        <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                          <Td>
                            <div className="font-semibold">
                              {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </Td>
                          <Td className="font-semibold">{p.supplier || "—"}</Td>
                          <Td>
                            <div className="max-w-[280px] truncate" title={p.items.map((i) => `${i.name} ${i.qty}${i.unit}`).join(", ")}>
                              {p.items.map((i) => `${i.name} ${i.qty}${i.unit}`).join(", ")}
                            </div>
                          </Td>
                          <Td className="font-bold">{totalQty}</Td>
                          <Td>
                            {p.billImage ? (
                              <a
                                href={p.billImage}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" /> {p.billName || "View"}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </Td>
                          <Td>{p.addedBy || "Staff"}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {showAdd && (
        <ItemFormDialog
          onClose={() => setShowAdd(false)}
          onSubmit={(v) => {
            addInventoryItem(v);
            toast.success(`${v.name} added to inventory`);
            setShowAdd(false);
          }}
        />
      )}
      {editing && (
        <ItemFormDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) => {
            updateInventoryItem(editing.id, v);
            toast.success(`${v.name} updated`);
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the item from inventory. Purchase history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  deleteInventoryItem(deleting.id);
                  toast.success(`${deleting.name} deleted`);
                  setDeleting(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Add / Edit Form ---------------- */

type FormValues = {
  name: string;
  category: string;
  unit: Unit;
  stock: number;
  minStock: number;
  supplier: string;
  costPrice: number;
};

function ItemFormDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: InventoryItem;
  onClose: () => void;
  onSubmit: (v: FormValues) => void;
}) {
  const [v, setV] = useState<FormValues>({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    unit: initial?.unit ?? "Kg",
    stock: initial?.stock ?? 0,
    minStock: initial?.minStock ?? 0,
    supplier: initial?.supplier ?? "",
    costPrice: initial?.costPrice ?? 0,
  });
  const submit = () => {
    if (!v.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    onSubmit({ ...v, name: v.name.trim(), category: v.category.trim(), supplier: v.supplier.trim() });
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl bg-card border-2 border-border shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card p-4 flex items-center justify-between border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              {initial ? "Edit" : "Add"}
            </div>
            <div className="font-black text-lg">{initial ? initial.name : "New Item"}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Item Name">
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input placeholder="e.g. Dairy" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
            </Field>
            <Field label="Unit">
              <select
                value={v.unit}
                onChange={(e) => setV({ ...v, unit: e.target.value as Unit })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening / Current Stock">
              <Input
                type="number"
                inputMode="decimal"
                value={v.stock}
                onChange={(e) => setV({ ...v, stock: Number(e.target.value) })}
              />
            </Field>
            <Field label="Minimum Stock">
              <Input
                type="number"
                inputMode="decimal"
                value={v.minStock}
                onChange={(e) => setV({ ...v, minStock: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Supplier">
            <Input value={v.supplier} onChange={(e) => setV({ ...v, supplier: e.target.value })} />
          </Field>
          <Field label="Cost Price (₹ per unit)">
            <Input
              type="number"
              inputMode="decimal"
              value={v.costPrice}
              onChange={(e) => setV({ ...v, costPrice: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} className="bg-primary text-primary-foreground font-bold">
            {initial ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">{label}</div>
      {children}
    </label>
  );
}

/* ---------------- Upload Bill ---------------- */

type Parsed = { name: string; qty: number; unit: Unit; existsAs?: InventoryItem };

function UploadBillPanel() {
  const { items } = useInventory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<string>("");
  const [supplier, setSupplier] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<Parsed[]>([]);
  const [confirmNew, setConfirmNew] = useState<Parsed | null>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    const isImage = f.type.startsWith("image/");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => setFileData(String(reader.result || ""));
      reader.readAsDataURL(f);
    } else {
      // Store filename only for PDFs — we can't OCR here offline.
      setFileData("");
    }
    toast.message("Bill attached", {
      description: isImage
        ? "Preview ready. Paste or edit the extracted text below, then Parse."
        : "PDF attached. Paste bill contents in the text box, then Parse.",
    });
  };

  const parse = () => {
    const rows = parseBillText(rawText);
    const withMatch: Parsed[] = rows.map((r) => ({
      ...r,
      existsAs: items.find((i) => i.name.toLowerCase() === r.name.toLowerCase()),
    }));
    setParsed(withMatch);
    if (withMatch.length === 0) toast.error("No items detected. Try format: 'Milk 20 L' per line.");
    else toast.success(`${withMatch.length} item${withMatch.length === 1 ? "" : "s"} detected`);
  };

  const applyOne = (idx: number, mode: "increase" | "create") => {
    const row = parsed[idx];
    if (!row) return;
    if (mode === "increase" && row.existsAs) {
      addStock(row.existsAs.name, row.qty);
      toast.success(`+${row.qty} ${row.unit} added to ${row.existsAs.name}`);
    } else if (mode === "create") {
      addInventoryItem({
        name: row.name,
        category: "",
        unit: row.unit,
        stock: row.qty,
        minStock: 0,
        supplier,
        costPrice: 0,
      });
      toast.success(`${row.name} created with ${row.qty} ${row.unit}`);
    }
    setParsed((p) => p.filter((_, i) => i !== idx));
  };

  const applyAll = () => {
    if (parsed.length === 0) return;
    let added = 0;
    let created = 0;
    const remaining: Parsed[] = [];
    for (const row of parsed) {
      if (row.existsAs) {
        addStock(row.existsAs.name, row.qty);
        added++;
      } else {
        // Defer new items — ask user
        remaining.push(row);
      }
    }
    if (added > 0) {
      addPurchase({
        supplier,
        addedBy: addedBy || "Staff",
        billImage: fileData || undefined,
        billName: fileName || undefined,
        items: parsed.filter((r) => r.existsAs).map((r) => ({ name: r.name, qty: r.qty, unit: r.unit })),
      });
    }
    setParsed(remaining);
    void created;
    toast.success(
      remaining.length > 0
        ? `Updated ${added} existing. ${remaining.length} new item${remaining.length === 1 ? "" : "s"} need confirmation.`
        : `Purchase recorded · ${added} item${added === 1 ? "" : "s"} updated`
    );
  };

  return (
    <section className="rounded-3xl border-2 border-border bg-card p-5 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">— Purchase</div>
          <h3 className="text-xl font-black text-foreground">Upload Purchase Bill</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Attach a PDF / JPG / PNG bill, paste/edit the item lines, then Parse to detect items and update stock.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Supplier">
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" />
        </Field>
        <Field label="Added By">
          <Input value={addedBy} onChange={(e) => setAddedBy(e.target.value)} placeholder="Your name" />
        </Field>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-5 text-center">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div className="font-bold">{fileName || "Attach purchase bill"}</div>
          <div className="text-xs text-muted-foreground">PDF, JPG or PNG</div>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="mt-2 rounded-full">
            Choose File
          </Button>
          {fileData && (
            <img
              src={fileData}
              alt="Bill preview"
              className="mt-3 max-h-48 rounded-xl border border-border object-contain"
            />
          )}
        </div>
      </div>

      <Field label="Bill Items (one per line, e.g. 'Milk 20 L')">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"Milk 20 L\nSugar 50 Kg\nTea Powder 10 Kg\nCoffee Powder 5 Kg\nOil 15 L"}
          rows={6}
          className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button onClick={parse} className="rounded-full bg-foreground text-background font-bold gap-1">
          <FileText className="w-4 h-4" /> Parse Items
        </Button>
        {parsed.length > 0 && (
          <Button onClick={applyAll} className="rounded-full bg-primary text-primary-foreground font-bold gap-1">
            <Check className="w-4 h-4" /> Apply All
          </Button>
        )}
      </div>

      {parsed.length > 0 && (
        <div className="overflow-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                <Th>Item</Th>
                <Th>Qty</Th>
                <Th>Unit</Th>
                <Th>Match</Th>
                <Th className="text-right pr-4">Action</Th>
              </tr>
            </thead>
            <tbody>
              {parsed.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <Td className="font-bold">{r.name}</Td>
                  <Td>{r.qty}</Td>
                  <Td>{r.unit}</Td>
                  <Td>
                    {r.existsAs ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                        Exists · {r.existsAs.stock} {r.existsAs.unit}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-secondary text-foreground px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </Td>
                  <Td className="text-right pr-2">
                    {r.existsAs ? (
                      <Button size="sm" onClick={() => applyOne(i, "increase")} className="rounded-full bg-primary text-primary-foreground">
                        +{r.qty} to stock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmNew(r)} className="rounded-full">
                        Create item
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!confirmNew} onOpenChange={(o) => !o && setConfirmNew(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new item "{confirmNew?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add <b>{confirmNew?.name}</b> to inventory with opening stock{" "}
              <b>
                {confirmNew?.qty} {confirmNew?.unit}
              </b>
              . You can edit category, min stock and cost later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmNew) return;
                const idx = parsed.findIndex(
                  (p) => p.name === confirmNew.name && p.qty === confirmNew.qty && p.unit === confirmNew.unit
                );
                if (idx >= 0) applyOne(idx, "create");
                setConfirmNew(null);
              }}
              className="bg-primary text-primary-foreground"
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/* ---------------- Bits ---------------- */

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border-2 ${
        accent
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-card-foreground border-border"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-background/70" : "text-muted-foreground"
        }`}
      >
        {icon} {label}
      </div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-foreground border-border hover:border-primary/40"
      }`}
    >
      {icon} {children}
    </button>
  );
}

function StatusPill({ status }: { status: "Normal" | "Low Stock" | "Out of Stock" }) {
  const cls =
    status === "Normal"
      ? "bg-primary/15 text-primary"
      : status === "Low Stock"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-[10px] uppercase tracking-widest font-bold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function IconBtn({
  children,
  onClick,
  label,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
        destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
