-- Fix RLS policies to be explicitly PERMISSIVE and ensure proper authentication checks

-- Drop and recreate clients policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can view own clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (is_owner(user_id));

CREATE POLICY "Users can insert own clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (is_owner(user_id));

CREATE POLICY "Users can update own clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (is_owner(user_id))
WITH CHECK (is_owner(user_id));

CREATE POLICY "Users can delete own clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (is_owner(user_id));

-- Drop and recreate profiles policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);