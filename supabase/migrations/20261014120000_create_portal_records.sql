/*
# Shared insureds and policy records

1. New table `portal_records`
   - One row per record, keyed by `collection` + `id`:
     - `customers` — insureds and prospects (id C-…)
     - `policies` — issued policies (policy number)
     - `billing` — billing accounts (policy number)
     - `claims` — claims (claim number)
   - `label` (text): a readable name for browsing in Supabase.
   - `data` (jsonb): the complete record as the portal uses it.
   - `updated_at` (timestamptz).

2. Security
   - Row-level security is enabled. The portal has no sign-in, so the anon role can read and write
     every record: anyone with the site can see them. Use demo / test data only.
*/

CREATE TABLE IF NOT EXISTS public.portal_records (
  collection text NOT NULL CHECK (collection IN ('customers', 'policies', 'billing', 'claims')),
  id text NOT NULL,
  label text NOT NULL DEFAULT '',
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS portal_records_label_idx ON public.portal_records (collection, label);

ALTER TABLE public.portal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portal can read records" ON public.portal_records;
CREATE POLICY "Portal can read records" ON public.portal_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Portal can add records" ON public.portal_records;
CREATE POLICY "Portal can add records" ON public.portal_records FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Portal can update records" ON public.portal_records;
CREATE POLICY "Portal can update records" ON public.portal_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
