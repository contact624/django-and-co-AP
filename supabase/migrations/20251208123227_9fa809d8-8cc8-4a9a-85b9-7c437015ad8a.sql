-- Create security definer function to check client ownership
CREATE OR REPLACE FUNCTION public.owns_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = _client_id
      AND user_id = auth.uid()
  )
$$;

-- Create security definer function to check if user owns data by user_id
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _user_id
$$;

-- Drop existing clients policies
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

-- Recreate clients policies as RESTRICTIVE with security definer functions
CREATE POLICY "Users can view own clients"
ON public.clients
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own clients"
ON public.clients
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own clients"
ON public.clients
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_owner(user_id))
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own clients"
ON public.clients
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_owner(user_id));

-- Also secure related tables with RESTRICTIVE policies

-- Animals table
DROP POLICY IF EXISTS "Users can view own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can insert own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can update own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can delete own animals" ON public.animals;

CREATE POLICY "Users can view own animals"
ON public.animals AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own animals"
ON public.animals AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own animals"
ON public.animals AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own animals"
ON public.animals AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Activities table
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;

CREATE POLICY "Users can view own activities"
ON public.activities AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own activities"
ON public.activities AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own activities"
ON public.activities AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own activities"
ON public.activities AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Invoices table
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;

CREATE POLICY "Users can view own invoices"
ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own invoices"
ON public.invoices AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own invoices"
ON public.invoices AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own invoices"
ON public.invoices AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Invoice lines table
DROP POLICY IF EXISTS "Users can view own invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can insert own invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can update own invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can delete own invoice lines" ON public.invoice_lines;

CREATE POLICY "Users can view own invoice lines"
ON public.invoice_lines AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own invoice lines"
ON public.invoice_lines AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own invoice lines"
ON public.invoice_lines AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own invoice lines"
ON public.invoice_lines AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_owner(user_id));

-- Expenses table
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Users can view own expenses"
ON public.expenses AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_owner(user_id));

CREATE POLICY "Users can insert own expenses"
ON public.expenses AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can update own expenses"
ON public.expenses AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_owner(user_id)) WITH CHECK (public.is_owner(user_id));

CREATE POLICY "Users can delete own expenses"
ON public.expenses AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_owner(user_id));