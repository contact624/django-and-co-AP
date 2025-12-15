-- Fix RLS policies: RESTRICTIVE policies alone block all access
-- Need to change them back to PERMISSIVE (default) which is the correct approach

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- Clients table
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can view own clients"
ON public.clients FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own clients"
ON public.clients FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own clients"
ON public.clients FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Animals table
DROP POLICY IF EXISTS "Users can view own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can insert own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can update own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can delete own animals" ON public.animals;

CREATE POLICY "Users can view own animals"
ON public.animals FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own animals"
ON public.animals FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own animals"
ON public.animals FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own animals"
ON public.animals FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Activities table
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;

CREATE POLICY "Users can view own activities"
ON public.activities FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own activities"
ON public.activities FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own activities"
ON public.activities FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own activities"
ON public.activities FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Invoices table
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;

CREATE POLICY "Users can view own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own invoices"
ON public.invoices FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Invoice lines table
DROP POLICY IF EXISTS "Users can view own invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can insert own invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can update own invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can delete own invoice lines" ON public.invoice_lines;

CREATE POLICY "Users can view own invoice lines"
ON public.invoice_lines FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own invoice lines"
ON public.invoice_lines FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own invoice lines"
ON public.invoice_lines FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own invoice lines"
ON public.invoice_lines FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Expenses table
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own expenses"
ON public.expenses FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own expenses"
ON public.expenses FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own expenses"
ON public.expenses FOR DELETE TO authenticated
USING (public.is_owner(user_id));