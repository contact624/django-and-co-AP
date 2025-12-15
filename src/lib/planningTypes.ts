/**
 * =====================================================
 * TYPES & CONSTANTES - MODULE PLANIFICATION DJANGO & CO
 * =====================================================
 * 
 * Hypothèses documentées :
 * - Les 15 groupes sont des templates hebdomadaires réutilisables
 * - Une semaine ISO (1-53) identifie chaque planning hebdomadaire
 * - Le secteur du chien est déterminé par l'adresse du client
 * - Les préférences de jours sont optionnelles (flexible par défaut)
 */

// =====================================================
// ENUMS & CONSTANTES
// =====================================================

export type GeographicSector = 'S1' | 'S2' | 'S3';
export type TimeBlock = 'B1' | 'B2' | 'B3';
export type WorkDay = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi';
export type WalkType = 'COLLECTIVE' | 'INDIVIDUELLE' | 'CANIRANDO' | 'SUR_MESURE';
export type RoutineType = 'R1' | 'R2' | 'R3' | 'ROUTINE_PLUS' | 'PONCTUEL';
export type TimePreference = 'MATIN' | 'MIDI' | 'APRESMIDI' | 'INDIFFERENT';

// Mapping jour -> code
export const DAY_CODES: Record<WorkDay, string> = {
  lundi: 'LU',
  mardi: 'MA',
  mercredi: 'ME',
  jeudi: 'JE',
  vendredi: 'VE',
};

// Labels français
export const DAY_LABELS: Record<WorkDay, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
};

export const BLOCK_LABELS: Record<TimeBlock, string> = {
  B1: 'Matin',
  B2: 'Midi',
  B3: 'Après-midi',
};

export const WALK_TYPE_LABELS: Record<WalkType, string> = {
  COLLECTIVE: 'Collective',
  INDIVIDUELLE: 'Individuelle',
  CANIRANDO: 'Cani-Rando',
  SUR_MESURE: 'Sur mesure',
};

export const ROUTINE_LABELS: Record<RoutineType, string> = {
  R1: '1x/semaine',
  R2: '2x/semaine',
  R3: '3x/semaine',
  ROUTINE_PLUS: '4-5x/semaine',
  PONCTUEL: 'Ponctuel',
};

export const SECTOR_LABELS: Record<GeographicSector, string> = {
  S1: 'Nyon & proches',
  S2: 'Lac / Genève',
  S3: 'Jura / Campagne',
};

export const SECTOR_DESCRIPTIONS: Record<GeographicSector, string> = {
  S1: 'Nyon, Prangins, Crans, Eysins, Duillier',
  S2: 'Gland, Vich, Rolle, Coppet, Founex',
  S3: 'Begnins, Genolier, Bassins, Arzier',
};

export const TIME_PREFERENCE_LABELS: Record<TimePreference, string> = {
  MATIN: 'Matin (B1)',
  MIDI: 'Midi (B2)',
  APRESMIDI: 'Après-midi (B3)',
  INDIFFERENT: 'Indifférent',
};

// Horaires fixes des blocs
export const BLOCK_SCHEDULES: Record<TimeBlock, { start: string; end: string; pickup: string; walk: string; return: string }> = {
  B1: { start: '09:30', end: '11:30', pickup: '09:30-10:00', walk: '10:00-11:00', return: '11:00-11:30' },
  B2: { start: '12:00', end: '14:00', pickup: '12:00-12:30', walk: '12:30-13:30', return: '13:30-14:00' },
  B3: { start: '14:30', end: '16:30', pickup: '14:30-15:00', walk: '15:00-16:00', return: '16:00-16:30' },
};

// Capacités par défaut
export const DEFAULT_CAPACITIES: Record<WalkType, number> = {
  COLLECTIVE: 4,
  INDIVIDUELLE: 1,
  CANIRANDO: 3,
  SUR_MESURE: 4,
};

// Jours de travail ordonnés
export const WORK_DAYS: WorkDay[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
export const TIME_BLOCKS: TimeBlock[] = ['B1', 'B2', 'B3'];

// =====================================================
// INTERFACES
// =====================================================

export interface WalkGroup {
  id: string; // Ex: "LU-B1"
  user_id: string;
  day: WorkDay;
  block: TimeBlock;
  start_time: string;
  end_time: string;
  pickup_duration_minutes: number;
  walk_duration_minutes: number;
  return_duration_minutes: number;
  default_sector: GeographicSector | null;
  default_capacity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklySchedule {
  id: string;
  user_id: string;
  group_id: string;
  year: number;
  week_number: number;
  walk_type: WalkType;
  sector: GeographicSector | null;
  capacity: number;
  is_blocked: boolean;
  block_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DogRoutine {
  id: string;
  user_id: string;
  animal_id: string;
  routine_type: RoutineType;
  sector: GeographicSector | null;
  time_preference: TimePreference;
  preferred_days: WorkDay[];
  walk_type_preference: WalkType;
  behavior_notes: string | null;
  special_requirements: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupAssignment {
  id: string;
  user_id: string;
  animal_id: string;
  group_id: string;
  year: number;
  week_number: number;
  is_confirmed: boolean;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanirandoEvent {
  id: string;
  user_id: string;
  event_date: string;
  day: WorkDay;
  start_block: TimeBlock;
  duration_hours: number;
  capacity: number;
  location: string | null;
  description: string | null;
  price_per_dog: number | null;
  created_at: string;
  updated_at: string;
}

export interface CanirandoParticipant {
  id: string;
  user_id: string;
  canirando_id: string;
  animal_id: string;
  is_confirmed: boolean;
  created_at: string;
}

// =====================================================
// TYPES ENRICHIS (avec relations)
// =====================================================

export interface GroupAssignmentWithAnimal extends GroupAssignment {
  animals: {
    id: string;
    name: string;
    clients: {
      first_name: string;
      last_name: string;
    } | null;
  };
}

export interface DogRoutineWithAnimal extends DogRoutine {
  animals: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    clients: {
      first_name: string;
      last_name: string;
      address: string | null;
    } | null;
  };
}

export interface WeeklyGroupView {
  group: WalkGroup;
  schedule: WeeklySchedule | null;
  assignments: GroupAssignmentWithAnimal[];
  effectiveType: WalkType;
  effectiveCapacity: number;
  effectiveSector: GeographicSector | null;
  currentCount: number;
  availableSlots: number;
  isBlocked: boolean;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Génère l'ID d'un groupe à partir du jour et du bloc
 */
export function generateGroupId(day: WorkDay, block: TimeBlock): string {
  return `${DAY_CODES[day]}-${block}`;
}

/**
 * Parse un ID de groupe pour extraire jour et bloc
 */
export function parseGroupId(groupId: string): { day: WorkDay; block: TimeBlock } | null {
  const parts = groupId.split('-');
  if (parts.length !== 2) return null;
  
  const dayCode = parts[0];
  const block = parts[1] as TimeBlock;
  
  const dayEntry = Object.entries(DAY_CODES).find(([_, code]) => code === dayCode);
  if (!dayEntry || !TIME_BLOCKS.includes(block)) return null;
  
  return { day: dayEntry[0] as WorkDay, block };
}

/**
 * Calcule le numéro de semaine ISO d'une date
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Retourne la date du lundi d'une semaine ISO donnée
 */
export function getMondayOfWeek(year: number, weekNumber: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  return monday;
}

/**
 * Détermine le nombre de groupes nécessaires selon la routine
 */
export function getRequiredGroupCount(routine: RoutineType): number {
  switch (routine) {
    case 'R1': return 1;
    case 'R2': return 2;
    case 'R3': return 3;
    case 'ROUTINE_PLUS': return 4;
    case 'PONCTUEL': return 0;
    default: return 0;
  }
}

/**
 * Vérifie si un bloc correspond à une préférence horaire
 */
export function blockMatchesPreference(block: TimeBlock, preference: TimePreference): boolean {
  if (preference === 'INDIFFERENT') return true;
  const mapping: Record<TimePreference, TimeBlock[]> = {
    MATIN: ['B1'],
    MIDI: ['B2'],
    APRESMIDI: ['B3'],
    INDIFFERENT: ['B1', 'B2', 'B3'],
  };
  return mapping[preference].includes(block);
}

/**
 * Génère les couleurs de fond selon le type de balade
 */
export function getWalkTypeColor(type: WalkType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'COLLECTIVE':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'INDIVIDUELLE':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    case 'CANIRANDO':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'SUR_MESURE':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    default:
      return { bg: 'bg-muted/20', text: 'text-muted-foreground', border: 'border-muted/30' };
  }
}

/**
 * Génère les couleurs de fond selon le secteur
 */
export function getSectorColor(sector: GeographicSector | null): string {
  switch (sector) {
    case 'S1': return 'bg-cyan-500/20 text-cyan-400';
    case 'S2': return 'bg-rose-500/20 text-rose-400';
    case 'S3': return 'bg-amber-500/20 text-amber-400';
    default: return 'bg-muted/20 text-muted-foreground';
  }
}
