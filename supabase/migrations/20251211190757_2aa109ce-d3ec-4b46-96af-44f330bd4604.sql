-- Create table for recovery codes (stored as hashed values)
CREATE TABLE public.recovery_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

-- Create policies using existing is_owner function
CREATE POLICY "Users can view own recovery codes"
  ON public.recovery_codes
  FOR SELECT
  USING (is_owner(user_id));

CREATE POLICY "Users can insert own recovery codes"
  ON public.recovery_codes
  FOR INSERT
  WITH CHECK (is_owner(user_id));

CREATE POLICY "Users can update own recovery codes"
  ON public.recovery_codes
  FOR UPDATE
  USING (is_owner(user_id));

CREATE POLICY "Users can delete own recovery codes"
  ON public.recovery_codes
  FOR DELETE
  USING (is_owner(user_id));