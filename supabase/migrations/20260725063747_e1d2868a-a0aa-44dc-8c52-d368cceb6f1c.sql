CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  pay_type text,
  quantity numeric,
  unit text,
  amount integer NOT NULL DEFAULT 0,
  note text,
  spent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_expenses_spent_at ON public.expenses(spent_at DESC);