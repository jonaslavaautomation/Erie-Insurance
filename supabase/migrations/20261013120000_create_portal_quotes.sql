/*
# Saved quotes

1. New table `portal_quotes`
   - `id` (text, primary key): the quote's id in the portal (Q-26-…).
   - `quote_number` (text): first product's 10-digit quote number.
   - `applicant_name`, `applicant_state`, `products`, `status`, `effective_date`, `total_premium`, `rated`:
     summary columns for searching and reporting in Supabase.
   - `data` (jsonb): the complete quote (applicant, drivers, vehicles, dwelling, coverages, reports).
   - `created_at`, `updated_at` (timestamptz).

2. Security
   - Row-level security is enabled. The portal has no sign-in, so the anon role can read and write
     every quote: anyone with the site can see saved quotes. Use demo / test data only.
*/

CREATE TABLE IF NOT EXISTS public.portal_quotes (
  id text PRIMARY KEY,
  quote_number text NOT NULL DEFAULT '',
  applicant_name text NOT NULL DEFAULT '',
  applicant_state text NOT NULL DEFAULT '',
  products text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Quote',
  effective_date date,
  total_premium numeric(12, 2),
  rated boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_quotes_updated_idx ON public.portal_quotes (updated_at DESC);
CREATE INDEX IF NOT EXISTS portal_quotes_applicant_idx ON public.portal_quotes (applicant_name);

ALTER TABLE public.portal_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portal can read quotes" ON public.portal_quotes;
CREATE POLICY "Portal can read quotes" ON public.portal_quotes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Portal can add quotes" ON public.portal_quotes;
CREATE POLICY "Portal can add quotes" ON public.portal_quotes FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Portal can update quotes" ON public.portal_quotes;
CREATE POLICY "Portal can update quotes" ON public.portal_quotes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Portal can delete quotes" ON public.portal_quotes;
CREATE POLICY "Portal can delete quotes" ON public.portal_quotes FOR DELETE TO anon, authenticated USING (true);
