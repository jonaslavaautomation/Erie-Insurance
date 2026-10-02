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
SELECT 'David', '', 'Guttenberg', '509 Erie Insurance Way', 'Meadville', 'WI', '16335', '1968-07-14'
WHERE NOT EXISTS (
  SELECT 1 FROM public.portal_customers WHERE first_name = 'David' AND last_name = 'Guttenberg'
);

INSERT INTO public.portal_customers (first_name, middle_name, last_name, address, city, state, zip, date_of_birth)
SELECT 'Maria', 'Elena', 'Johnson', '120 Lakeview Drive', 'Madison', 'WI', '53703', '1984-11-23'
WHERE NOT EXISTS (
  SELECT 1 FROM public.portal_customers WHERE first_name = 'Maria' AND last_name = 'Johnson'
);