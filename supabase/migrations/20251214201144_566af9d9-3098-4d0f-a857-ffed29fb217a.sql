
-- =====================================================
-- MODULE PLANIFICATION DJANGO & CO
-- =====================================================
-- Hypothèses documentées :
-- 1. Les groupes sont des templates hebdomadaires réutilisables
-- 2. Les affectations sont par semaine ISO (weekly_assignments)
-- 3. Le secteur du chien est dérivé de l'adresse client mais stocké pour performance
-- 4. Les préférences de jours sont stockées en array de texte ['lundi', 'mardi', etc.]

-- =====================================================
-- ENUMS
-- =====================================================

-- Type de secteur géographique
CREATE TYPE public.geographic_sector AS ENUM ('S1', 'S2', 'S3');

-- Type de bloc horaire
CREATE TYPE public.time_block AS ENUM ('B1', 'B2', 'B3');

-- Jour de la semaine (travail uniquement)
CREATE TYPE public.work_day AS ENUM ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi');

-- Type de groupe/balade
CREATE TYPE public.walk_type AS ENUM ('COLLECTIVE', 'INDIVIDUELLE', 'CANIRANDO', 'SUR_MESURE');

-- Type de routine/abonnement
CREATE TYPE public.routine_type AS ENUM ('R1', 'R2', 'R3', 'ROUTINE_PLUS', 'PONCTUEL');

-- Préférence de créneau
CREATE TYPE public.time_preference AS ENUM ('MATIN', 'MIDI', 'APRESMIDI', 'INDIFFERENT');

-- =====================================================
-- TABLE: walk_groups (15 groupes pré-créés)
-- =====================================================
-- Représente les 15 créneaux hebdomadaires fixes (templates)

CREATE TABLE public.walk_groups (
  id TEXT PRIMARY KEY, -- Ex: "LU-B1", "MA-B2", etc.
  user_id UUID NOT NULL,
  day public.work_day NOT NULL,
  block public.time_block NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pickup_duration_minutes INTEGER NOT NULL DEFAULT 30,
  walk_duration_minutes INTEGER NOT NULL DEFAULT 60,
  return_duration_minutes INTEGER NOT NULL DEFAULT 30,
  default_sector public.geographic_sector,
  default_capacity INTEGER NOT NULL DEFAULT 4,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day, block)
);

-- =====================================================
-- TABLE: weekly_schedules (état d'un groupe pour une semaine)
-- =====================================================
-- Permet de modifier le type/capacité d'un groupe pour une semaine spécifique

CREATE TABLE public.weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id TEXT NOT NULL REFERENCES public.walk_groups(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL, -- Semaine ISO (1-53)
  walk_type public.walk_type NOT NULL DEFAULT 'COLLECTIVE',
  sector public.geographic_sector,
  capacity INTEGER NOT NULL DEFAULT 4,
  is_blocked BOOLEAN NOT NULL DEFAULT false, -- Pour bloquer un créneau (congé, etc.)
  block_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, year, week_number)
);

-- =====================================================
-- TABLE: dog_routines (routine hebdomadaire d'un chien)
-- =====================================================
-- Stocke la configuration de routine d'un chien

CREATE TABLE public.dog_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  routine_type public.routine_type NOT NULL DEFAULT 'PONCTUEL',
  sector public.geographic_sector,
  time_preference public.time_preference NOT NULL DEFAULT 'INDIFFERENT',
  preferred_days public.work_day[] DEFAULT '{}',
  walk_type_preference public.walk_type NOT NULL DEFAULT 'COLLECTIVE',
  behavior_notes TEXT, -- Notes comportement (réactif, ok congénères, etc.)
  special_requirements TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(animal_id)
);

-- =====================================================
-- TABLE: group_assignments (affectation chien -> groupe -> semaine)
-- =====================================================
-- Junction table pour les affectations hebdomadaires

CREATE TABLE public.group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES public.walk_groups(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false, -- Balade effectuée
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(animal_id, group_id, year, week_number)
);

-- =====================================================
-- TABLE: canirando_events (événements Cani-Rando)
-- =====================================================
-- Gère les Cani-Rando qui consomment 2 blocs consécutifs

CREATE TABLE public.canirando_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_date DATE NOT NULL,
  day public.work_day NOT NULL,
  start_block public.time_block NOT NULL, -- B1 ou B2 (B3 ne peut pas être début)
  duration_hours NUMERIC NOT NULL DEFAULT 3,
  capacity INTEGER NOT NULL DEFAULT 3,
  location TEXT,
  description TEXT,
  price_per_dog NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: canirando_participants
-- =====================================================

CREATE TABLE public.canirando_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  canirando_id UUID NOT NULL REFERENCES public.canirando_events(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(canirando_id, animal_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_walk_groups_user ON public.walk_groups(user_id);
CREATE INDEX idx_weekly_schedules_user_week ON public.weekly_schedules(user_id, year, week_number);
CREATE INDEX idx_dog_routines_user ON public.dog_routines(user_id);
CREATE INDEX idx_dog_routines_animal ON public.dog_routines(animal_id);
CREATE INDEX idx_group_assignments_user_week ON public.group_assignments(user_id, year, week_number);
CREATE INDEX idx_group_assignments_animal ON public.group_assignments(animal_id);
CREATE INDEX idx_group_assignments_group ON public.group_assignments(group_id);
CREATE INDEX idx_canirando_events_user_date ON public.canirando_events(user_id, event_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.walk_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dog_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canirando_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canirando_participants ENABLE ROW LEVEL SECURITY;

-- Policies pour walk_groups
CREATE POLICY "Users can view own walk groups" ON public.walk_groups FOR SELECT USING (is_owner(user_id));
CREATE POLICY "Users can insert own walk groups" ON public.walk_groups FOR INSERT WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can update own walk groups" ON public.walk_groups FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can delete own walk groups" ON public.walk_groups FOR DELETE USING (is_owner(user_id));

-- Policies pour weekly_schedules
CREATE POLICY "Users can view own weekly schedules" ON public.weekly_schedules FOR SELECT USING (is_owner(user_id));
CREATE POLICY "Users can insert own weekly schedules" ON public.weekly_schedules FOR INSERT WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can update own weekly schedules" ON public.weekly_schedules FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can delete own weekly schedules" ON public.weekly_schedules FOR DELETE USING (is_owner(user_id));

-- Policies pour dog_routines
CREATE POLICY "Users can view own dog routines" ON public.dog_routines FOR SELECT USING (is_owner(user_id));
CREATE POLICY "Users can insert own dog routines" ON public.dog_routines FOR INSERT WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can update own dog routines" ON public.dog_routines FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can delete own dog routines" ON public.dog_routines FOR DELETE USING (is_owner(user_id));

-- Policies pour group_assignments
CREATE POLICY "Users can view own group assignments" ON public.group_assignments FOR SELECT USING (is_owner(user_id));
CREATE POLICY "Users can insert own group assignments" ON public.group_assignments FOR INSERT WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can update own group assignments" ON public.group_assignments FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can delete own group assignments" ON public.group_assignments FOR DELETE USING (is_owner(user_id));

-- Policies pour canirando_events
CREATE POLICY "Users can view own canirando events" ON public.canirando_events FOR SELECT USING (is_owner(user_id));
CREATE POLICY "Users can insert own canirando events" ON public.canirando_events FOR INSERT WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can update own canirando events" ON public.canirando_events FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can delete own canirando events" ON public.canirando_events FOR DELETE USING (is_owner(user_id));

-- Policies pour canirando_participants
CREATE POLICY "Users can view own canirando participants" ON public.canirando_participants FOR SELECT USING (is_owner(user_id));
CREATE POLICY "Users can insert own canirando participants" ON public.canirando_participants FOR INSERT WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can update own canirando participants" ON public.canirando_participants FOR UPDATE USING (is_owner(user_id)) WITH CHECK (is_owner(user_id));
CREATE POLICY "Users can delete own canirando participants" ON public.canirando_participants FOR DELETE USING (is_owner(user_id));

-- =====================================================
-- TRIGGER pour updated_at
-- =====================================================

CREATE TRIGGER update_walk_groups_updated_at BEFORE UPDATE ON public.walk_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_schedules_updated_at BEFORE UPDATE ON public.weekly_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dog_routines_updated_at BEFORE UPDATE ON public.dog_routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_assignments_updated_at BEFORE UPDATE ON public.group_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canirando_events_updated_at BEFORE UPDATE ON public.canirando_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FONCTION: Validation capacité groupe (trigger)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_group_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  max_capacity INTEGER;
  schedule_capacity INTEGER;
  group_default_capacity INTEGER;
BEGIN
  -- Compter les assignations actuelles
  SELECT COUNT(*) INTO current_count
  FROM public.group_assignments
  WHERE group_id = NEW.group_id
    AND year = NEW.year
    AND week_number = NEW.week_number
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Récupérer la capacité du groupe
  SELECT default_capacity INTO group_default_capacity
  FROM public.walk_groups
  WHERE id = NEW.group_id;

  -- Vérifier s'il y a un schedule personnalisé pour cette semaine
  SELECT capacity INTO schedule_capacity
  FROM public.weekly_schedules
  WHERE group_id = NEW.group_id
    AND year = NEW.year
    AND week_number = NEW.week_number;

  max_capacity := COALESCE(schedule_capacity, group_default_capacity, 4);

  -- Vérifier la capacité
  IF current_count >= max_capacity THEN
    RAISE EXCEPTION 'Groupe % complet pour la semaine % de % (capacité: %)',
      NEW.group_id, NEW.week_number, NEW.year, max_capacity;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour vérifier la capacité avant insertion
DROP TRIGGER IF EXISTS check_capacity_before_insert ON public.group_assignments;
CREATE TRIGGER check_capacity_before_insert
  BEFORE INSERT ON public.group_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_group_capacity();

-- =====================================================
-- FONCTION: Vérifier si le groupe est bloqué
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_group_not_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
-- FONCTION: Audit automatique des modifications
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Triggers d'audit pour les tables critiques
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
