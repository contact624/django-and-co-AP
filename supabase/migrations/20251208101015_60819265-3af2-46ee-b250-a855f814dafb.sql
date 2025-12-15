-- Create expense category enum
CREATE TYPE public.expense_category AS ENUM (
  'fuel',
  'vehicle_maintenance',
  'dog_equipment',
  'insurance',
  'phone',
  'accounting',
  'training',
  'other'
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category expense_category NOT NULL DEFAULT 'other',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own expenses"
ON public.expenses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
ON public.expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
ON public.expenses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
ON public.expenses
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage policies for receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);