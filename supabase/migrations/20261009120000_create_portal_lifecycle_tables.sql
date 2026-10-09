/*
# Policy lifecycle tables for the AgentExchange demo portal

1. New Tables
- `portal_policies` — one row per policy: number, line type, customer, status, term, premium,
  payment plan, and a `details` JSONB document (drivers, vehicles, coverages, property,
  commercial details, mortgagees) matching the app's `Policy` shape.
- `portal_endorsements` — processed policy changes with effective date, before/after premium
  and the pro-rata additional or return premium.
- `portal_claims` — first notice of loss and claim tracking (status, adjuster, reserve, paid,
  third-party information, notes and payments as JSONB).
- `portal_billing` — billing account per policy: balance, next due date, minimum due,
  payments and scheduled payments (JSONB).
- `portal_payment_methods` — saved card / bank account tokens per customer (last 4 only;
  full card and account numbers are never stored).

2. Security
- Row-level security is enabled on every table.
- Like `portal_customers`, the no-sign-in demo portal may read and write these sample rows.
  Before real use, replace these policies with ones scoped to authenticated agents.

3. Notes
- All data is sample data for the demo portal, not real ERIE records.
- The app currently keeps this data in the browser; these tables are the target schema
  for moving it to Supabase.
*/

CREATE TABLE IF NOT EXISTS public.portal_policies (
  policy_number text PRIMARY KEY,
  customer_id text NOT NULL,
  line_type text NOT NULL CHECK (line_type IN ('Auto', 'Home', 'Boat', 'Life', 'Umbrella', 'Business', 'Commercial Auto', 'Workers Comp')),
  policy_form text,
  status text NOT NULL CHECK (status IN ('Active', 'Pending Cancel', 'Cancelled', 'Pending Issue')),
  effective_date date NOT NULL,
  expiration_date date NOT NULL,
  annual_premium numeric(12, 2) NOT NULL CHECK (annual_premium >= 0),
  pay_plan text NOT NULL CHECK (pay_plan IN ('Annual', 'Semi-Annual', 'Quarterly', '9 Month', 'Monthly')),
  auto_pay boolean NOT NULL DEFAULT false,
  agent_number text NOT NULL,
  description text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expiration_date > effective_date)
);

CREATE TABLE IF NOT EXISTS public.portal_endorsements (
  id text PRIMARY KEY,
  policy_number text NOT NULL REFERENCES public.portal_policies (policy_number) ON DELETE CASCADE,
  change_type text NOT NULL,
  description text NOT NULL,
  effective_date date NOT NULL,
  processed_date date NOT NULL DEFAULT current_date,
  premium_before numeric(12, 2) NOT NULL,
  premium_after numeric(12, 2) NOT NULL,
  pro_rata numeric(12, 2) NOT NULL,
  processed_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_claims (
  claim_number text PRIMARY KEY,
  policy_number text NOT NULL REFERENCES public.portal_policies (policy_number),
  customer_id text NOT NULL,
  loss_date date NOT NULL,
  loss_time time,
  reported_date date NOT NULL DEFAULT current_date,
  loss_type text NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('Claim Submitted', 'Adjuster Assigned', 'Inspection', 'Estimate Approved', 'Payment Issued', 'Closed')),
  adjuster jsonb NOT NULL DEFAULT '{}'::jsonb,
  reserve numeric(12, 2) NOT NULL DEFAULT 0,
  paid numeric(12, 2) NOT NULL DEFAULT 0,
  deductible numeric(12, 2) NOT NULL DEFAULT 0,
  third_party jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_billing (
  policy_number text PRIMARY KEY REFERENCES public.portal_policies (policy_number) ON DELETE CASCADE,
  balance numeric(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  next_due_date date NOT NULL,
  minimum_due numeric(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_due >= 0),
  payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_payment_methods (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('card', 'ach')),
  brand text NOT NULL,
  last4 text NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  holder text NOT NULL,
  expiry text,
  bank_name text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_policies_customer_idx ON public.portal_policies (customer_id);
CREATE INDEX IF NOT EXISTS portal_endorsements_policy_idx ON public.portal_endorsements (policy_number, effective_date);
CREATE INDEX IF NOT EXISTS portal_claims_policy_idx ON public.portal_claims (policy_number);
CREATE INDEX IF NOT EXISTS portal_claims_customer_idx ON public.portal_claims (customer_id);
CREATE INDEX IF NOT EXISTS portal_payment_methods_customer_idx ON public.portal_payment_methods (customer_id);
-- At most one default payment method per customer.
CREATE UNIQUE INDEX IF NOT EXISTS portal_payment_methods_default_idx ON public.portal_payment_methods (customer_id) WHERE is_default;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['portal_policies', 'portal_endorsements', 'portal_claims', 'portal_billing', 'portal_payment_methods'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Demo read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Demo read %1$s" ON public.%1$I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Demo insert %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Demo insert %1$s" ON public.%1$I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Demo update %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Demo update %1$s" ON public.%1$I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Demo delete %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Demo delete %1$s" ON public.%1$I FOR DELETE TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;
