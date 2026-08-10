
-- ============ ENUM-ish text with checks ============

-- 1. Locations
CREATE TABLE public.locations (
  id text PRIMARY KEY,
  location_type text NOT NULL CHECK (location_type IN ('QUICK_SERVICE','ROOFTOP','SMOKE_ZONE','TAKEAWAY','TOKEN')),
  table_number int,
  label text NOT NULL,
  short text NOT NULL,
  qr_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ORDER_PENDING','PAYMENT_PENDING','OCCUPIED','PREPARING','READY','COMPLETED','CLOSED')),
  active_order_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations_public_read" ON public.locations FOR SELECT TO anon, authenticated USING (true);

-- 2. KOT sections
CREATE TABLE public.kot_sections (
  id text PRIMARY KEY,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.kot_sections TO anon, authenticated;
GRANT ALL ON public.kot_sections TO service_role;
ALTER TABLE public.kot_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kot_sections_public_read" ON public.kot_sections FOR SELECT TO anon, authenticated USING (true);

-- 3. Menu extensions
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_veg boolean,
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'BOTH' CHECK (visibility IN ('CUSTOMER','POS','BOTH')),
  ADD COLUMN IF NOT EXISTS prep_time_min int,
  ADD COLUMN IF NOT EXISTS kot_section text;

GRANT SELECT ON public.menu_categories TO anon;
GRANT SELECT ON public.menu_items TO anon;

-- 4. Orders (one master engine)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  order_type text NOT NULL CHECK (order_type IN ('TABLE','TOKEN','CUSTOMER_QR')),
  location_id text REFERENCES public.locations(id),
  location_type text NOT NULL,
  location_label text NOT NULL,
  token_number int,
  status text NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL','PAYMENT_PENDING','APPROVED','PREPARING','READY','SERVED','COMPLETED','CANCELLED')),
  customer_name text,
  customer_mobile text,
  notes text,
  reject_reason text,
  subtotal int NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  discount_amount int NOT NULL DEFAULT 0,
  tax int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  payment_mode text,
  paid_at timestamptz,
  tracking_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id),
  name text NOT NULL,
  price int NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  kot_section text,
  notes text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount int NOT NULL,
  mode text NOT NULL DEFAULT 'CASH',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. KOTs
CREATE TABLE public.kots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  section_id text NOT NULL,
  section_name text NOT NULL,
  revision int NOT NULL DEFAULT 1,
  print_status text NOT NULL DEFAULT 'PENDING' CHECK (print_status IN ('PENDING','PRINTED','FAILED')),
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, section_id, revision)
);
GRANT ALL ON public.kots TO service_role;
ALTER TABLE public.kots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kot_id uuid NOT NULL REFERENCES public.kots(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty numeric NOT NULL,
  notes text
);
GRANT ALL ON public.kot_items TO service_role;
ALTER TABLE public.kot_items ENABLE ROW LEVEL SECURITY;

-- 6. Customer sessions
CREATE TABLE public.customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid,
  location_id text REFERENCES public.locations(id),
  customer_name text,
  customer_mobile text,
  active_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '12 hours'
);
GRANT ALL ON public.customer_sessions TO service_role;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Counters
CREATE OR REPLACE FUNCTION public.next_token_number()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  INSERT INTO public.settings(key, value) VALUES ('token_counter', to_jsonb(100))
  ON CONFLICT (key) DO UPDATE SET value = to_jsonb(((public.settings.value)::int) + 1), updated_at = now()
  RETURNING (value)::int INTO n;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.next_order_no()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  INSERT INTO public.settings(key, value) VALUES ('order_counter', to_jsonb(1000))
  ON CONFLICT (key) DO UPDATE SET value = to_jsonb(((public.settings.value)::int) + 1), updated_at = now()
  RETURNING (value)::int INTO n;
  RETURN 'BC' || n::text;
END; $$;

-- 8. Seed KOT sections
INSERT INTO public.kot_sections (id, name, sort_order) VALUES
  ('buns','Bun & Breads',1),
  ('maggi','Magic Maggi',2),
  ('sandwich','Sandwich Tales',3),
  ('quick-bites','Quick Bites',4),
  ('rolls','Rolls',5),
  ('pasta','Pasta Stories',6),
  ('pizza','Pizza Mania',7),
  ('burger','Burger Hub',8),
  ('juices','Fresh Juices & Moj',9),
  ('hot-brews','Hot Beverages',10),
  ('chinese','Chinese',11),
  ('continental','Continental',12)
ON CONFLICT (id) DO NOTHING;

-- 9. Seed locations
INSERT INTO public.locations (id, location_type, table_number, label, short, sort_order) VALUES
  ('1','QUICK_SERVICE',1,'Table 1','01',1),
  ('2','QUICK_SERVICE',2,'Table 2','02',2),
  ('3','QUICK_SERVICE',3,'Table 3','03',3),
  ('4','QUICK_SERVICE',4,'Table 4','04',4),
  ('5','QUICK_SERVICE',5,'Table 5','05',5),
  ('R1','ROOFTOP',1,'Roof Table 1','R01',11),
  ('R2','ROOFTOP',2,'Roof Table 2','R02',12),
  ('R3','ROOFTOP',3,'Roof Table 3','R03',13),
  ('R4','ROOFTOP',4,'Roof Table 4','R04',14),
  ('R5','ROOFTOP',5,'Roof Table 5','R05',15),
  ('R6','ROOFTOP',6,'Roof Table 6','R06',16),
  ('R7','ROOFTOP',7,'Roof Table 7','R07',17),
  ('R8','ROOFTOP',8,'Roof Table 8','R08',18),
  ('R9','ROOFTOP',9,'Roof Table 9','R09',19),
  ('R10','ROOFTOP',10,'Roof Table 10','R10',20),
  ('R11','ROOFTOP',11,'Roof Table 11','R11',21),
  ('R12','ROOFTOP',12,'Roof Table 12','R12',22),
  ('S1','SMOKE_ZONE',1,'Smoke Zone 1','S01',31),
  ('S2','SMOKE_ZONE',2,'Smoke Zone 2','S02',32),
  ('S3','SMOKE_ZONE',3,'Smoke Zone 3','S03',33),
  ('S4','SMOKE_ZONE',4,'Smoke Zone 4','S04',34),
  ('S5','SMOKE_ZONE',5,'Smoke Zone 5','S05',35),
  ('T1','TAKEAWAY',1,'Takeaway 1','T01',41),
  ('T2','TAKEAWAY',2,'Takeaway 2','T02',42),
  ('T3','TAKEAWAY',3,'Takeaway 3','T03',43),
  ('T4','TAKEAWAY',4,'Takeaway 4','T04',44),
  ('T5','TAKEAWAY',5,'Takeaway 5','T05',45)
ON CONFLICT (id) DO NOTHING;

-- 10. Seed menu categories
INSERT INTO public.menu_categories (id, name, emoji, sort_order) VALUES
  ('hot-brews','Hot Brews & Boosters','☕',1),
  ('buns','Bun & Breads','🥖',2),
  ('maggi','Magic Maggi','🍜',3),
  ('sandwich','Sandwich Tales','🥪',4),
  ('quick-bites','Quick Bites','🍟',5),
  ('starters','Crispy Starters','🌶',6),
  ('chinese','Chinese Feast','🍚',7),
  ('rolls','Rolls','🌯',8),
  ('pasta','Pasta Stories','🍝',9),
  ('pizza','Pizza Mania','🍕',10),
  ('burger','Burger Hub','🍔',11),
  ('juices','Fresh Juices, Mojitos & Shakes','🥤',12),
  ('extras','Extras','➕',13)
ON CONFLICT (id) DO NOTHING;

-- 11. Seed menu items
INSERT INTO public.menu_items (category_id, name, price, sort_order, kot_section) VALUES
  ('hot-brews','Tea',20,1,'hot-brews'),
  ('hot-brews','Irani Tea',20,2,'hot-brews'),
  ('hot-brews','Lemon Tea',20,3,'hot-brews'),
  ('hot-brews','Black Tea',20,4,'hot-brews'),
  ('hot-brews','Green Tea',20,5,'hot-brews'),
  ('hot-brews','Black Coffee',20,6,'hot-brews'),
  ('hot-brews','Ginger Tea',25,7,'hot-brews'),
  ('hot-brews','Coffee',25,8,'hot-brews'),
  ('hot-brews','Boost',25,9,'hot-brews'),
  ('hot-brews','Horlicks',25,10,'hot-brews'),
  ('hot-brews','Bournvita',25,11,'hot-brews'),
  ('hot-brews','Masala Tea',30,12,'hot-brews'),
  ('hot-brews','Badam Milk',30,13,'hot-brews'),
  ('hot-brews','Hot Chocolate Milk',30,14,'hot-brews'),
  ('hot-brews','Cold Coffee',80,15,'hot-brews'),
  ('buns','Malai Bun',49,1,'buns'),
  ('buns','Bun Maska',49,2,'buns'),
  ('buns','Jam Bun',49,3,'buns'),
  ('buns','Butter Jam Bun',69,4,'buns'),
  ('buns','Bread Toast',29,5,'buns'),
  ('buns','Butter Toast',49,6,'buns'),
  ('buns','Jam Toast',49,7,'buns'),
  ('buns','Omelette',39,8,'buns'),
  ('buns','Bread Omelette',49,9,'buns'),
  ('maggi','Veg Delight Maggi',69,1,'maggi'),
  ('maggi','Peri Peri Maggi',79,2,'maggi'),
  ('maggi','Cheese Maggi',89,3,'maggi'),
  ('maggi','Corn Cheese Maggi',99,4,'maggi'),
  ('maggi','Egg Maggi',79,5,'maggi'),
  ('maggi','Chicken Maggi',89,6,'maggi'),
  ('maggi','Chicken Peri Peri Maggi',99,7,'maggi'),
  ('sandwich','Roasted Veg Sandwich',99,1,'sandwich'),
  ('sandwich','Cheese Corn Sandwich',109,2,'sandwich'),
  ('sandwich','Paneer Tikka Sandwich',129,3,'sandwich'),
  ('sandwich','Grill Chicken Sandwich',129,4,'sandwich'),
  ('sandwich','Chicken Tikka Sandwich',139,5,'sandwich'),
  ('quick-bites','French Fries',89,1,'quick-bites'),
  ('quick-bites','Peri Peri Fries',109,2,'quick-bites'),
  ('quick-bites','Cheese Fries',119,3,'quick-bites'),
  ('quick-bites','Veg Nuggets',89,4,'quick-bites'),
  ('quick-bites','Chicken Nuggets',99,5,'quick-bites'),
  ('quick-bites','Chicken Popcorn',99,6,'quick-bites'),
  ('starters','Gobi Manchurian',99,1,'chinese'),
  ('starters','Baby Corn Pepper Fry',129,2,'chinese'),
  ('starters','Pepper Mushroom',159,3,'chinese'),
  ('starters','Chilly Paneer',179,4,'chinese'),
  ('starters','Chilly Chicken',179,5,'chinese'),
  ('starters','Chicken Wings',179,6,'chinese'),
  ('starters','Pepper Chicken',189,7,'chinese'),
  ('starters','Chicken Lollipop',189,8,'chinese'),
  ('starters','Dragon Chicken',199,9,'chinese'),
  ('chinese','Veg Fried Rice/Noodles',99,1,'chinese'),
  ('chinese','Schezwan Veg Fried Rice/Noodles',109,2,'chinese'),
  ('chinese','Gobi Fried Rice/Noodles',119,3,'chinese'),
  ('chinese','Kaju Paneer Fried Rice/Noodles',149,4,'chinese'),
  ('chinese','Egg Fried Rice/Noodles',109,5,'chinese'),
  ('chinese','Chicken Fried Rice/Noodles',129,6,'chinese'),
  ('chinese','Schezwan Chicken Fried Rice/Noodles',139,7,'chinese'),
  ('rolls','Veg Roll',69,1,'rolls'),
  ('rolls','Paneer Roll',89,2,'rolls'),
  ('rolls','Egg Roll',79,3,'rolls'),
  ('rolls','Chicken Roll',99,4,'rolls'),
  ('pasta','Mac & Cheese Pasta (Veg)',149,1,'pasta'),
  ('pasta','Mac & Cheese Pasta (Non Veg)',179,2,'pasta'),
  ('pasta','Mexican Spicy Pasta (Veg)',159,3,'pasta'),
  ('pasta','Mexican Spicy Pasta (Non Veg)',189,4,'pasta'),
  ('pasta','Alfredo Chicken Pasta',159,5,'pasta'),
  ('pasta','Alfredo Chicken Pasta (Large)',189,6,'pasta'),
  ('pizza','Onion/Capsicum Pizza',129,1,'pizza'),
  ('pizza','Corn Pizza',139,2,'pizza'),
  ('pizza','Cheese Burst Pizza',159,3,'pizza'),
  ('pizza','Paneer Tikka Pizza',169,4,'pizza'),
  ('pizza','Chicken Tikka Pizza',169,5,'pizza'),
  ('pizza','Peri Peri Chicken Pizza',179,6,'pizza'),
  ('pizza','BBQ Chicken Pizza',189,7,'pizza'),
  ('burger','Veg Burger',99,1,'burger'),
  ('burger','Cheese Veg Burger',119,2,'burger'),
  ('burger','Crispy Paneer Burger',129,3,'burger'),
  ('burger','Chicken Burger',139,4,'burger'),
  ('burger','Cheese Chicken Burger',149,5,'burger'),
  ('burger','Double Patty Chicken Burger',179,6,'burger'),
  ('juices','Mint Lime Juice',39,1,'juices'),
  ('juices','Lemon Juice',39,2,'juices'),
  ('juices','Lime Soda',49,3,'juices'),
  ('juices','Watermelon Juice',59,4,'juices'),
  ('juices','Pineapple Juice',79,5,'juices'),
  ('juices','Chocolate Shake',79,6,'juices'),
  ('juices','Oreo Shake',89,7,'juices'),
  ('juices','KitKat Shake',99,8,'juices'),
  ('juices','Strawberry Milkshake',109,9,'juices'),
  ('juices','Classic Mojito',79,10,'juices'),
  ('juices','Blackcurrant Mojito',89,11,'juices'),
  ('juices','Blue Berry Mojito',99,12,'juices'),
  ('juices','Cran Berry Mojito',109,13,'juices'),
  ('extras','Parcel Charges',10,1,'continental'),
  ('extras','Water Bottle',10,2,'continental'),
  ('extras','Niloufer Usmania Biscuits',10,3,'continental');

-- 12. Transactional order placement
CREATE OR REPLACE FUNCTION public.place_order(
  p_order_type text,
  p_location_id text,
  p_customer_name text,
  p_customer_mobile text,
  p_items jsonb,
  p_notes text DEFAULT NULL,
  p_session_id uuid DEFAULT NULL,
  p_discount_pct numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_loc public.locations%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_order_id uuid;
  v_subtotal int := 0;
  v_discount int := 0;
  v_total int := 0;
  v_token int;
  v_item jsonb;
  v_mi public.menu_items%ROWTYPE;
  v_qty numeric;
  v_status text;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_ORDER';
  END IF;

  IF p_location_id IS NOT NULL THEN
    SELECT * INTO v_loc FROM public.locations WHERE id = p_location_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_LOCATION'; END IF;
    IF v_loc.active_order_id IS NOT NULL THEN RAISE EXCEPTION 'TABLE_BUSY'; END IF;
  END IF;

  v_status := CASE WHEN p_order_type = 'CUSTOMER_QR' THEN 'PENDING_APPROVAL' ELSE 'PREPARING' END;

  IF p_order_type IN ('TOKEN','CUSTOMER_QR') OR (v_loc.location_type = 'TAKEAWAY') THEN
    v_token := public.next_token_number();
  END IF;

  INSERT INTO public.orders (
    order_no, order_type, location_id, location_type, location_label,
    token_number, status, customer_name, customer_mobile, notes, session_id, discount_pct
  ) VALUES (
    public.next_order_no(), p_order_type, p_location_id,
    COALESCE(v_loc.location_type, 'TOKEN'),
    COALESCE(v_loc.label, 'Token'),
    v_token, v_status, NULLIF(p_customer_name,''), NULLIF(p_customer_mobile,''), NULLIF(p_notes,''), p_session_id, COALESCE(p_discount_pct,0)
  ) RETURNING * INTO v_order;
  v_order_id := v_order.id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_mi FROM public.menu_items WHERE id = (v_item->>'item_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
    IF v_mi.is_available = false THEN RAISE EXCEPTION 'ITEM_UNAVAILABLE'; END IF;
    v_qty := GREATEST(COALESCE((v_item->>'qty')::numeric, 1), 1);
    INSERT INTO public.order_items (order_id, menu_item_id, name, price, qty, kot_section, notes)
    VALUES (v_order_id, v_mi.id, v_mi.name, v_mi.price, v_qty,
            COALESCE(v_mi.kot_section, 'continental'), NULLIF(v_item->>'notes',''));
    v_subtotal := v_subtotal + (v_mi.price * v_qty)::int;
  END LOOP;

  v_discount := ROUND(v_subtotal * COALESCE(p_discount_pct,0) / 100.0);
  v_total := v_subtotal - v_discount;

  UPDATE public.orders SET subtotal = v_subtotal, discount_amount = v_discount, total = v_total, updated_at = now()
  WHERE id = v_order_id RETURNING * INTO v_order;

  IF p_location_id IS NOT NULL THEN
    UPDATE public.locations
      SET active_order_id = v_order_id,
          status = CASE WHEN v_status = 'PENDING_APPROVAL' THEN 'ORDER_PENDING' ELSE 'OCCUPIED' END,
          updated_at = now()
      WHERE id = p_location_id;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, note) VALUES (v_order_id, v_status, 'created');
  PERFORM public.generate_kots(v_order_id);

  RETURN to_jsonb(v_order);
END; $$;

-- 13. KOT generation (idempotent per order+section+revision)
CREATE OR REPLACE FUNCTION public.generate_kots(p_order_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_sec record;
  v_kot_id uuid;
  v_rev int;
  v_count int := 0;
BEGIN
  FOR v_sec IN
    SELECT oi.kot_section AS sid,
           COALESCE(ks.name, initcap(replace(oi.kot_section,'-',' '))) AS sname
    FROM public.order_items oi
    LEFT JOIN public.kot_sections ks ON ks.id = oi.kot_section
    WHERE oi.order_id = p_order_id
    GROUP BY oi.kot_section, ks.name
  LOOP
    SELECT COALESCE(MAX(revision),0) INTO v_rev FROM public.kots WHERE order_id = p_order_id AND section_id = v_sec.sid;
    IF v_rev > 0 THEN CONTINUE; END IF;
    INSERT INTO public.kots (order_id, section_id, section_name, revision)
    VALUES (p_order_id, v_sec.sid, v_sec.sname, 1)
    RETURNING id INTO v_kot_id;
    INSERT INTO public.kot_items (kot_id, name, qty, notes)
    SELECT v_kot_id, oi.name, oi.qty, oi.notes FROM public.order_items oi
    WHERE oi.order_id = p_order_id AND oi.kot_section = v_sec.sid;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- 14. Status transitions
CREATE OR REPLACE FUNCTION public.set_order_status(p_order_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  UPDATE public.orders SET status = p_status, updated_at = now(),
    reject_reason = CASE WHEN p_status = 'CANCELLED' THEN p_note ELSE reject_reason END,
    closed_at = CASE WHEN p_status IN ('COMPLETED','CANCELLED') THEN now() ELSE closed_at END
  WHERE id = p_order_id RETURNING * INTO v_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  INSERT INTO public.order_status_history (order_id, status, note) VALUES (p_order_id, p_status, p_note);

  IF v_order.location_id IS NOT NULL THEN
    IF p_status IN ('COMPLETED','CANCELLED') THEN
      UPDATE public.locations SET active_order_id = NULL, status = 'AVAILABLE', updated_at = now()
      WHERE id = v_order.location_id;
    ELSE
      UPDATE public.locations SET status = CASE
          WHEN p_status = 'PENDING_APPROVAL' THEN 'ORDER_PENDING'
          WHEN p_status = 'PAYMENT_PENDING' THEN 'PAYMENT_PENDING'
          WHEN p_status = 'PREPARING' THEN 'PREPARING'
          WHEN p_status = 'READY' THEN 'READY'
          ELSE 'OCCUPIED' END,
        updated_at = now()
      WHERE id = v_order.location_id;
    END IF;
  END IF;
  RETURN to_jsonb(v_order);
END; $$;

-- 15. Payment
CREATE OR REPLACE FUNCTION public.record_payment(p_order_id uuid, p_mode text, p_amount int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  INSERT INTO public.payments (order_id, amount, mode) VALUES (p_order_id, COALESCE(p_amount, v_order.total), COALESCE(p_mode,'CASH'));
  UPDATE public.orders SET payment_mode = COALESCE(p_mode,'CASH'), paid_at = now(), updated_at = now() WHERE id = p_order_id;
  RETURN public.set_order_status(p_order_id, 'PREPARING', 'payment recorded');
END; $$;

-- 16. Add items to an existing order
CREATE OR REPLACE FUNCTION public.add_order_items(p_order_id uuid, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_mi public.menu_items%ROWTYPE;
  v_qty numeric;
  v_subtotal int;
  v_discount int;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_mi FROM public.menu_items WHERE id = (v_item->>'item_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ITEM'; END IF;
    v_qty := GREATEST(COALESCE((v_item->>'qty')::numeric, 1), 1);
    INSERT INTO public.order_items (order_id, menu_item_id, name, price, qty, kot_section, notes)
    VALUES (p_order_id, v_mi.id, v_mi.name, v_mi.price, v_qty, COALESCE(v_mi.kot_section,'continental'), NULLIF(v_item->>'notes',''));
  END LOOP;
  SELECT COALESCE(SUM(price * qty),0)::int INTO v_subtotal FROM public.order_items WHERE order_id = p_order_id;
  v_discount := ROUND(v_subtotal * v_order.discount_pct / 100.0);
  UPDATE public.orders SET subtotal = v_subtotal, discount_amount = v_discount, total = v_subtotal - v_discount, updated_at = now()
  WHERE id = p_order_id RETURNING * INTO v_order;
  PERFORM public.generate_kots(p_order_id);
  RETURN to_jsonb(v_order);
END; $$;

-- 17. Public lookups for customer app
CREATE OR REPLACE FUNCTION public.get_location_by_qr(p_qr uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT to_jsonb(l) - 'active_order_id' FROM public.locations l WHERE l.qr_id = p_qr AND l.is_active;
$$;

CREATE OR REPLACE FUNCTION public.get_order_by_tracking(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'order_no', o.order_no, 'status', o.status, 'token_number', o.token_number,
    'location_label', o.location_label, 'location_type', o.location_type,
    'customer_name', o.customer_name, 'total', o.total, 'subtotal', o.subtotal,
    'discount_amount', o.discount_amount, 'created_at', o.created_at,
    'reject_reason', o.reject_reason,
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', oi.name, 'qty', oi.qty, 'price', oi.price, 'status', oi.status) ORDER BY oi.created_at) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  ) INTO v FROM public.orders o WHERE o.tracking_token = p_token;
  RETURN v;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_location_by_qr(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_order(text,text,text,text,jsonb,text,uuid,numeric) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_order_status(uuid,text,text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.record_payment(uuid,text,int) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.add_order_items(uuid,jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_kots(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_token_number() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_order_no() FROM anon, authenticated, public;
