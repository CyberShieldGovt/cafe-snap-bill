
-- Menu categories & items
CREATE TABLE public.menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);

-- Active table orders (one row per table)
CREATE TABLE public.table_orders (
  table_id TEXT PRIMARY KEY,
  table_label TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finalized bills
CREATE TABLE public.bills (
  id TEXT PRIMARY KEY,               -- bill number "000125"
  table_id TEXT NOT NULL,
  table_label TEXT NOT NULL,
  lines JSONB NOT NULL,
  total INT NOT NULL,
  item_count INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bills_created_at ON public.bills(created_at DESC);

-- Inventory
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'Piece',
  stock NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT
);
CREATE INDEX idx_purchases_entered_at ON public.purchases(entered_at DESC);

-- Key-value settings (printer width, bill counter, migration flag, etc.)
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants (open device, no login — anon may read/write)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_orders TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.menu_categories, public.menu_items, public.table_orders, public.bills,
             public.inventory_items, public.purchases, public.settings TO service_role;

-- RLS: enable with open policies (in-cafe device, no user accounts)
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.menu_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.table_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime for hot tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- Atomic bill number generator: reserves the next number in one round-trip
CREATE OR REPLACE FUNCTION public.next_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  INSERT INTO public.settings(key, value)
  VALUES ('bill_counter', to_jsonb(125))
  ON CONFLICT (key) DO UPDATE
    SET value = to_jsonb(((public.settings.value)::int) + 1),
        updated_at = now()
  RETURNING (value)::int INTO next_num;
  RETURN lpad(next_num::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_bill_number() TO anon, authenticated;
