CREATE TABLE public.sales_report_bills (
  id text PRIMARY KEY,
  table_id text NOT NULL,
  table_label text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total integer NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sales_report_bills IS 'Manually maintained sales report shown on the admin Sales page. Seeded once from the frontend report; updates are manual-only (no automatic writes).';

CREATE INDEX sales_report_bills_created_at_idx ON public.sales_report_bills (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_report_bills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_report_bills TO authenticated;
GRANT ALL ON public.sales_report_bills TO service_role;

ALTER TABLE public.sales_report_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all"
  ON public.sales_report_bills
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE VIEW public.sales_report_items AS
SELECT
  b.id AS bill_id,
  b.table_label,
  b.created_at,
  l->>'name' AS item_name,
  (l->>'qty')::numeric AS qty,
  (l->>'price')::numeric * (l->>'qty')::numeric AS amount
FROM public.sales_report_bills b
CROSS JOIN LATERAL jsonb_array_elements(b.lines) AS l;

GRANT SELECT ON public.sales_report_items TO anon;
GRANT SELECT ON public.sales_report_items TO authenticated;
GRANT SELECT ON public.sales_report_items TO service_role;
