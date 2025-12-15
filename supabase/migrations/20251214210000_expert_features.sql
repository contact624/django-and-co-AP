-- =====================================================
-- MIGRATION: Fonctionnalités Expert++ Django & Co
-- Version: 2.0.0
-- Date: 2024-12-14
-- =====================================================
-- 
-- Cette migration ajoute :
-- 1. Table des absences et annulations
-- 2. Table des périodes de vacances
-- 3. Table des forfaits clients
-- 4. Table d'audit pour traçabilité
-- 5. Table des rappels de facture
-- 6. Fonctions de validation côté serveur
-- 7. Triggers de sécurité renforcée

-- =====================================================
-- ENUM ADDITIONNELS (avec gestion erreur si existe)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.absence_type AS ENUM (
    'VACANCES_CLIENT',
    'CHIEN_MALADE',
    'CHIEN_CHALEURS',
    'RENDEZ_VOUS_VETERINAIRE',
    'EVENEMENT_FAMILIAL',
    'PROMENEUR_ABSENT',
    'METEO_EXTREME',
    'AUTRE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cancellation_policy AS ENUM (
    'FULL_REFUND',
    'PARTIAL_CHARGE',
    'FULL_CHARGE',
    'RESCHEDULED',
    'PACKAGE_CREDIT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABLE: absence_records
-- =====================================================

CREATE TABLE IF NOT EXISTS public.absence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  original_group_id TEXT NOT NULL,
  original_date DATE NOT NULL,
  original_year INTEGER NOT NULL,
  original_week_number INTEGER NOT NULL,
  absence_type public.absence_type NOT NULL,
  reason TEXT,
  cancellation_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  policy public.cancellation_policy NOT NULL,
  charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  rescheduled_group_id TEXT,
  rescheduled_date DATE,
  rescheduled_confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_absence_records_user ON public.absence_records(user_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_dog ON public.absence_records(dog_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_client ON public.absence_records(client_id);
CREATE INDEX IF NOT EXISTS idx_absence_records_date ON public.absence_records(original_date);
CREATE INDEX IF NOT EXISTS idx_absence_records_week ON public.absence_records(original_year, original_week_number);

-- =====================================================
-- TABLE: vacation_periods
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vacation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason public.absence_type NOT NULL DEFAULT 'VACANCES_CLIENT',
  notes TEXT,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vacation_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vacation_periods_user ON public.vacation_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_dog ON public.vacation_periods(dog_id);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_dates ON public.vacation_periods(start_date, end_date);

-- =====================================================
-- TABLE: client_packages (Forfaits)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  routine_type public.routine_type NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_month_walks INTEGER NOT NULL DEFAULT 0,
  expected_monthly_walks INTEGER NOT NULL,
  credit_walks INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dog_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_client_packages_user ON public.client_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON public.client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_dog ON public.client_packages(dog_id);
CREATE INDEX IF NOT EXISTS idx_client_packages_active ON public.client_packages(is_active) WHERE is_active = true;

-- =====================================================
-- TABLE: audit_log
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON public.audit_log(created_at DESC);

-- =====================================================
-- TABLE: invoice_reminders
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_level INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_via TEXT NOT NULL DEFAULT 'email',
  recipient_email TEXT,
  message_content TEXT,
  delivery_status TEXT DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON public.invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_date ON public.invoice_reminders(sent_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

-- Policies absence_records
DROP POLICY IF EXISTS "Users can view own absence records" ON public.absence_records;
CREATE POLICY "Users can view own absence records" ON public.absence_records 
  FOR SELECT USING (is_owner(user_id));
DROP POLICY IF EXISTS "Users can insert own absence records" ON public.absence_records;
CREATE POLICY "Users can insert own absence records" ON public.absence_records 
  FOR INSERT WITH CHECK (is_owner(user_id));
DROP POLICY IF EXISTS "Users can update own absence records" ON public.absence_records;
CREATE POLICY "Users can update own absence records" ON public.absence_records 
  FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
DROP POLICY IF EXISTS "Users can delete own absence records" ON public.absence_records;
CREATE POLICY "Users can delete own absence records" ON public.absence_records 
  FOR DELETE USING (is_owner(user_id));

-- Policies vacation_periods
DROP POLICY IF EXISTS "Users can view own vacation periods" ON public.vacation_periods;
CREATE POLICY "Users can view own vacation periods" ON public.vacation_periods 
  FOR SELECT USING (is_owner(user_id));
DROP POLICY IF EXISTS "Users can insert own vacation periods" ON public.vacation_periods;
CREATE POLICY "Users can insert own vacation periods" ON public.vacation_periods 
  FOR INSERT WITH CHECK (is_owner(user_id));
DROP POLICY IF EXISTS "Users can update own vacation periods" ON public.vacation_periods;
CREATE POLICY "Users can update own vacation periods" ON public.vacation_periods 
  FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
DROP POLICY IF EXISTS "Users can delete own vacation periods" ON public.vacation_periods;
CREATE POLICY "Users can delete own vacation periods" ON public.vacation_periods 
  FOR DELETE USING (is_owner(user_id));

-- Policies client_packages
DROP POLICY IF EXISTS "Users can view own client packages" ON public.client_packages;
CREATE POLICY "Users can view own client packages" ON public.client_packages 
  FOR SELECT USING (is_owner(user_id));
DROP POLICY IF EXISTS "Users can insert own client packages" ON public.client_packages;
CREATE POLICY "Users can insert own client packages" ON public.client_packages 
  FOR INSERT WITH CHECK (is_owner(user_id));
DROP POLICY IF EXISTS "Users can update own client packages" ON public.client_packages;
CREATE POLICY "Users can update own client packages" ON public.client_packages 
  FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
DROP POLICY IF EXISTS "Users can delete own client packages" ON public.client_packages;
CREATE POLICY "Users can delete own client packages" ON public.client_packages 
  FOR DELETE USING (is_owner(user_id));

-- Policies audit_log (lecture seule)
DROP POLICY IF EXISTS "Users can view own audit log" ON public.audit_log;
CREATE POLICY "Users can view own audit log" ON public.audit_log 
  FOR SELECT USING (is_owner(user_id));
DROP POLICY IF EXISTS "Users can insert own audit log" ON public.audit_log;
CREATE POLICY "Users can insert own audit log" ON public.audit_log 
  FOR INSERT WITH CHECK (is_owner(user_id));

-- Policies invoice_reminders
DROP POLICY IF EXISTS "Users can view own invoice reminders" ON public.invoice_reminders;
CREATE POLICY "Users can view own invoice reminders" ON public.invoice_reminders 
  FOR SELECT USING (is_owner(user_id));
DROP POLICY IF EXISTS "Users can insert own invoice reminders" ON public.invoice_reminders;
CREATE POLICY "Users can insert own invoice reminders" ON public.invoice_reminders 
  FOR INSERT WITH CHECK (is_owner(user_id));

-- =====================================================
-- TRIGGERS updated_at
-- =====================================================

DROP TRIGGER IF EXISTS update_absence_records_updated_at ON public.absence_records;
CREATE TRIGGER update_absence_records_updated_at 
  BEFORE UPDATE ON public.absence_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vacation_periods_updated_at ON public.vacation_periods;
CREATE TRIGGER update_vacation_periods_updated_at 
  BEFORE UPDATE ON public.vacation_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_packages_updated_at ON public.client_packages;
CREATE TRIGGER update_client_packages_updated_at 
  BEFORE UPDATE ON public.client_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FONCTION: Vérifier capacité groupe avant insertion
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_group_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_capacity INTEGER;
  schedule_capacity INTEGER;
  group_default_capacity INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.group_assignments
  WHERE group_id = NEW.group_id
    AND year = NEW.year
    AND week_number = NEW.week_number
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT default_capacity INTO group_default_capacity
  FROM public.walk_groups
  WHERE id = NEW.group_id;

  SELECT capacity INTO schedule_capacity
  FROM public.weekly_schedules
  WHERE group_id = NEW.group_id
    AND year = NEW.year
    AND week_number = NEW.week_number;

  max_capacity := COALESCE(schedule_capacity, group_default_capacity, 4);

  IF current_count >= max_capacity THEN
    RAISE EXCEPTION 'Groupe % complet pour la semaine % de % (capacité: %, actuel: %)',
      NEW.group_id, NEW.week_number, NEW.year, max_capacity, current_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_capacity_before_insert ON public.group_assignments;
CREATE TRIGGER check_capacity_before_insert
  BEFORE INSERT ON public.group_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_group_capacity();

-- =====================================================
-- FONCTION: Vérifier si groupe bloqué
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_group_not_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_blocked BOOLEAN;
BEGIN
  SELECT ws.is_blocked INTO is_blocked
  FROM public.weekly_schedules ws
  WHERE ws.group_id = NEW.group_id
    AND ws.year = NEW.year
    AND ws.week_number = NEW.week_number;

  IF is_blocked = true THEN
    RAISE EXCEPTION 'Le groupe % est bloqué pour la semaine % de %',
      NEW.group_id, NEW.week_number, NEW.year;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_blocked_before_insert ON public.group_assignments;
CREATE TRIGGER check_blocked_before_insert
  BEFORE INSERT ON public.group_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_group_not_blocked();

-- =====================================================
-- FONCTION: Audit automatique
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values)
    VALUES (COALESCE(auth.uid(), OLD.user_id), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (COALESCE(auth.uid(), NEW.user_id), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (COALESCE(auth.uid(), NEW.user_id), 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Triggers d'audit sur tables critiques
DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

DROP TRIGGER IF EXISTS audit_activities ON public.activities;
CREATE TRIGGER audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- =====================================================
-- FONCTION: Statistiques hebdomadaires (helper)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_weekly_stats(
  p_user_id UUID,
  p_year INTEGER,
  p_week_number INTEGER
)
RETURNS TABLE (
  total_assignments BIGINT,
  total_capacity BIGINT,
  blocked_groups BIGINT,
  utilization_percent NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH group_stats AS (
    SELECT 
      wg.id,
      COALESCE(ws.capacity, wg.default_capacity) as capacity,
      COALESCE(ws.is_blocked, false) as is_blocked,
      COUNT(ga.id) as assignment_count
    FROM public.walk_groups wg
    LEFT JOIN public.weekly_schedules ws 
      ON ws.group_id = wg.id 
      AND ws.year = p_year 
      AND ws.week_number = p_week_number
    LEFT JOIN public.group_assignments ga 
      ON ga.group_id = wg.id 
      AND ga.year = p_year 
      AND ga.week_number = p_week_number
    WHERE wg.user_id = p_user_id
    GROUP BY wg.id, ws.capacity, wg.default_capacity, ws.is_blocked
  )
  SELECT 
    COALESCE(SUM(gs.assignment_count), 0)::BIGINT as total_assignments,
    COALESCE(SUM(CASE WHEN NOT gs.is_blocked THEN gs.capacity ELSE 0 END), 0)::BIGINT as total_capacity,
    COALESCE(SUM(CASE WHEN gs.is_blocked THEN 1 ELSE 0 END), 0)::BIGINT as blocked_groups,
    CASE 
      WHEN SUM(CASE WHEN NOT gs.is_blocked THEN gs.capacity ELSE 0 END) > 0 
      THEN ROUND((SUM(gs.assignment_count)::NUMERIC / SUM(CASE WHEN NOT gs.is_blocked THEN gs.capacity ELSE 0 END)) * 100, 1)
      ELSE 0 
    END as utilization_percent
  FROM group_stats gs;
END;
$$;
