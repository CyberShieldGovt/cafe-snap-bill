
GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT ON public.kot_sections TO anon, authenticated;
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_categories TO service_role;
GRANT ALL ON public.menu_items TO service_role;
GRANT ALL ON public.kot_sections TO service_role;
GRANT ALL ON public.locations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon, authenticated;
GRANT ALL ON public.inventory_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO anon, authenticated;
GRANT ALL ON public.purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO anon, authenticated;
GRANT ALL ON public.bills TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_orders TO anon, authenticated;
GRANT ALL ON public.table_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;

CREATE TABLE IF NOT EXISTS public.daily_inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('LOGIN','LOGOUT')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_inventory_logs TO anon, authenticated;
GRANT ALL ON public.daily_inventory_logs TO service_role;

ALTER TABLE public.daily_inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.daily_inventory_logs FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_daily_inventory_logs_updated_at
BEFORE UPDATE ON public.daily_inventory_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
