
-- Create enums for service types, activity status, and payment status
CREATE TYPE public.service_type AS ENUM ('individual_walk', 'group_walk', 'education', 'dog_sitting', 'transport', 'other');
CREATE TYPE public.activity_status AS ENUM ('planned', 'done', 'invoiced');
CREATE TYPE public.payment_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- =====================
-- CLIENTS TABLE
-- =====================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- ANIMALS TABLE
-- =====================
CREATE TABLE public.animals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'dog',
  breed TEXT,
  birth_date DATE,
  microchip_number TEXT,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own animals" ON public.animals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own animals" ON public.animals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own animals" ON public.animals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own animals" ON public.animals
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_animals_updated_at
  BEFORE UPDATE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- ACTIVITIES TABLE
-- =====================
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL DEFAULT 'individual_walk',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  status public.activity_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON public.activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" ON public.activities
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- INVOICES TABLE
-- =====================
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
  total NUMERIC(10,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate / 100)) STORED,
  status public.payment_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- INVOICE LINES TABLE
-- =====================
CREATE TABLE public.invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice lines" ON public.invoice_lines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice lines" ON public.invoice_lines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice lines" ON public.invoice_lines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoice lines" ON public.invoice_lines
  FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- INDEXES FOR PERFORMANCE
-- =====================
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_animals_user_id ON public.animals(user_id);
CREATE INDEX idx_animals_client_id ON public.animals(client_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_client_id ON public.activities(client_id);
CREATE INDEX idx_activities_scheduled_date ON public.activities(scheduled_date);
CREATE INDEX idx_activities_status ON public.activities(status);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_lines_invoice_id ON public.invoice_lines(invoice_id);
