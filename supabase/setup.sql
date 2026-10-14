-- ERIE AgentExchange demo — Supabase setup. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

/*
# Create sample portal customer accounts

1. New Tables
- `portal_customers`
- `id` (uuid, primary key) uniquely identifies each sample customer account.
- `first_name` (text) stores the customer's first name.
- `middle_name` (text) stores an optional middle name.
- `last_name` (text) stores the customer's last name.
- `address` (text) stores the mailing street address.
- `city` (text) stores the mailing city.
- `state` (text) stores the two-letter mailing state.
- `zip` (text) stores the mailing ZIP code.
- `date_of_birth` (date) stores the customer's date of birth for quote prefill.
- `created_at` (timestamptz) records when the account row was created.

2. Seed Data
- Adds two clearly labeled dummy customer accounts for the portal demo.
- Re-running this migration does not create duplicate sample accounts.

3. Security
- Enables row-level security on `portal_customers`.
- Allows the no-sign-in portal to read the intentionally shared demo records.
- Allows the portal to create, update, and remove demo records through separate CRUD policies.

4. Important Notes
- These records are sample data for the portal experience and are not real customer records.
- No sign-in or user ownership columns are added because this portal currently has no sign-in screen.
*/

CREATE TABLE IF NOT EXISTS public.portal_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  middle_name text NOT NULL DEFAULT '',
  last_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  date_of_birth date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read portal customers" ON public.portal_customers;
CREATE POLICY "Public can read portal customers"
ON public.portal_customers FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can add portal customers" ON public.portal_customers;
CREATE POLICY "Public can add portal customers"
ON public.portal_customers FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update portal customers" ON public.portal_customers;
CREATE POLICY "Public can update portal customers"
ON public.portal_customers FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete portal customers" ON public.portal_customers;
CREATE POLICY "Public can delete portal customers"
ON public.portal_customers FOR DELETE
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS portal_customers_name_idx
ON public.portal_customers (last_name, first_name);

INSERT INTO public.portal_customers (first_name, middle_name, last_name, address, city, state, zip, date_of_birth)
SELECT 'David', '', 'Lindqvist', '509 Erie Insurance Way', 'Meadville', 'WI', '16335', '1967-11-02'
WHERE NOT EXISTS (
  SELECT 1 FROM public.portal_customers WHERE first_name = 'David' AND last_name = 'Lindqvist'
);

INSERT INTO public.portal_customers (first_name, middle_name, last_name, address, city, state, zip, date_of_birth)
SELECT 'Maria', 'Elena', 'Johnson', '120 Lakeview Drive', 'Madison', 'WI', '53703', '1984-11-23'
WHERE NOT EXISTS (
  SELECT 1 FROM public.portal_customers WHERE first_name = 'Maria' AND last_name = 'Johnson'
);

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
