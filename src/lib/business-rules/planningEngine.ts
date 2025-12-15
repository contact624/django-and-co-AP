/**
 * =====================================================
 * MOTEUR DE RÈGLES MÉTIER - DJANGO & CO
 * =====================================================
 * 
 * Ce module centralise toute la logique métier critique pour
 * la planification des balades canines. Il assure :
 * - Validation stricte des contraintes métier
 * - Détection des conflits et surréservations
 * - Calcul des statistiques de remplissage
 * - Alertes automatiques pour les situations problématiques
 * 
 * PRINCIPE FONDAMENTAL : Aucune erreur de planning ne doit
 * pouvoir passer inaperçue. Toutes les règles métier sont
 * appliquées de manière défensive avec des messages explicites.
 */

import { 
  WalkType, 
  WorkDay, 
  TimeBlock, 
  GeographicSector, 
  RoutineType,
  TimePreference,
  WORK_DAYS,
  TIME_BLOCKS,
  BLOCK_SCHEDULES,
  DEFAULT_CAPACITIES,
  DAY_CODES,
  DAY_LABELS,
} from '@/lib/planningTypes';

// =====================================================
// TYPES POUR LES RÈGLES MÉTIER
// =====================================================

export interface BusinessRuleViolation {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  context: Record<string, unknown>;
  suggestions?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  violations: BusinessRuleViolation[];
  warnings: BusinessRuleViolation[];
  info: BusinessRuleViolation[];
}

export interface CapacityCheck {
  groupId: string;
  currentCount: number;
  maxCapacity: number;
  isOverbooked: boolean;
  isFull: boolean;
  availableSlots: number;
}

export interface DogConflict {
  dogId: string;
  dogName: string;
  conflictType: 'double_booking' | 'consecutive_blocks' | 'same_day_different_clients' | 'incompatible_dogs';
  details: string;
  affectedGroups: string[];
}

export interface WeeklyLoadAnalysis {
  totalAssignments: number;
  totalCapacity: number;
  utilizationPercent: number;
  overBookedGroups: string[];
  emptyGroups: string[];
  nearCapacityGroups: string[]; // > 75% full
  sectorDistribution: Record<GeographicSector, number>;
  dayDistribution: Record<WorkDay, number>;
  blockDistribution: Record<TimeBlock, number>;
}

export interface DogScheduleConflict {
  dogId: string;
  dogName: string;
  type: 'already_assigned_this_week' | 'exceeds_routine' | 'wrong_sector' | 'blocked_day';
  message: string;
  existingAssignments?: string[];
}

// =====================================================
// CONSTANTES MÉTIER
// =====================================================

/** Capacité maximale absolue pour une balade (sécurité) */
export const ABSOLUTE_MAX_CAPACITY = 6;

/** Nombre maximum de balades par chien par semaine */
export const MAX_WALKS_PER_DOG_PER_WEEK = 5;

/** Temps minimum entre 2 balades consécutives pour un même chien (en blocs) */
export const MIN_BLOCKS_BETWEEN_WALKS = 1;

/** Seuil d'alerte pour remplissage groupe (%) */
export const CAPACITY_WARNING_THRESHOLD = 75;

/** Durées fixes des activités (en minutes) */
export const ACTIVITY_DURATIONS = {
  COLLECTIVE: 120,      // 2h total (30min + 60min + 30min)
  INDIVIDUELLE: 120,    // 2h total
  CANIRANDO: 240,       // 4h (2 blocs)
  SUR_MESURE: 120,      // Variable, défaut 2h
} as const;

/** Prix par défaut par type de service (CHF) */
export const DEFAULT_PRICES = {
  COLLECTIVE: 30,
  INDIVIDUELLE: 50,
  CANIRANDO: 70,
  SUR_MESURE: 45,
} as const;

/** Mapping routine -> nombre de balades attendues par semaine */
export const ROUTINE_WALK_COUNT: Record<RoutineType, number> = {
  R1: 1,
  R2: 2,
  R3: 3,
  ROUTINE_PLUS: 4,
  PONCTUEL: 0,
};

// =====================================================
// VALIDATION DES CONTRAINTES MÉTIER
// =====================================================

/**
 * Valide qu'une capacité est dans les limites acceptables
 */
export function validateCapacity(
  capacity: number,
  walkType: WalkType
): ValidationResult {
  const violations: BusinessRuleViolation[] = [];
  const warnings: BusinessRuleViolation[] = [];
  const info: BusinessRuleViolation[] = [];

  const defaultCap = DEFAULT_CAPACITIES[walkType];
  const maxAllowed = walkType === 'INDIVIDUELLE' ? 1 : ABSOLUTE_MAX_CAPACITY;
  const minAllowed = 1;

  if (capacity < minAllowed) {
    violations.push({
      code: 'CAPACITY_TOO_LOW',
      severity: 'error',
      message: `La capacité ne peut pas être inférieure à ${minAllowed}`,
      context: { capacity, minAllowed },
    });
  }

  if (capacity > maxAllowed) {
    violations.push({
      code: 'CAPACITY_TOO_HIGH',
      severity: 'error',
      message: `La capacité ne peut pas dépasser ${maxAllowed} pour une ${walkType.toLowerCase()}`,
      context: { capacity, maxAllowed, walkType },
    });
  }

  if (walkType === 'INDIVIDUELLE' && capacity > 1) {
    violations.push({
      code: 'INDIVIDUAL_WALK_CAPACITY',
      severity: 'error',
      message: 'Une balade individuelle ne peut accueillir qu\'un seul chien',
      context: { capacity, walkType },
    });
  }

  if (capacity > defaultCap + 1) {
    warnings.push({
      code: 'CAPACITY_ABOVE_RECOMMENDED',
      severity: 'warning',
      message: `Capacité supérieure à la recommandation (${defaultCap})`,
      context: { capacity, defaultCap, walkType },
      suggestions: ['Vérifiez que vous pouvez gérer autant de chiens en sécurité'],
    });
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
    info,
  };
}

/**
 * Vérifie si un chien peut être affecté à un groupe donné
 */
export function validateDogAssignment(params: {
  dogId: string;
  dogName: string;
  groupId: string;
  walkType: WalkType;
  currentAssignments: Array<{ groupId: string; dogId: string }>;
  currentGroupCount: number;
  maxCapacity: number;
  dogRoutineType?: RoutineType;
  dogSector?: GeographicSector | null;
  groupSector?: GeographicSector | null;
  isGroupBlocked?: boolean;
}): ValidationResult {
  const {
    dogId,
    dogName,
    groupId,
    walkType,
    currentAssignments,
    currentGroupCount,
    maxCapacity,
    dogRoutineType,
    dogSector,
    groupSector,
    isGroupBlocked,
  } = params;

  const violations: BusinessRuleViolation[] = [];
  const warnings: BusinessRuleViolation[] = [];
  const info: BusinessRuleViolation[] = [];

  // 1. Vérifier si le groupe est bloqué
  if (isGroupBlocked) {
    violations.push({
      code: 'GROUP_BLOCKED',
      severity: 'error',
      message: `Le créneau ${groupId} est bloqué et n'accepte pas de nouvelles affectations`,
      context: { groupId },
    });
  }

  // 2. Vérifier la capacité
  if (currentGroupCount >= maxCapacity) {
    violations.push({
      code: 'GROUP_FULL',
      severity: 'error',
      message: `Le groupe ${groupId} est complet (${currentGroupCount}/${maxCapacity})`,
      context: { groupId, currentGroupCount, maxCapacity },
      suggestions: ['Choisissez un autre créneau disponible'],
    });
  }

  // 3. Vérifier si le chien est déjà dans ce groupe
  const alreadyInGroup = currentAssignments.some(
    a => a.dogId === dogId && a.groupId === groupId
  );
  if (alreadyInGroup) {
    violations.push({
      code: 'DOG_ALREADY_IN_GROUP',
      severity: 'error',
      message: `${dogName} est déjà affecté au groupe ${groupId}`,
      context: { dogId, dogName, groupId },
    });
  }

  // 4. Vérifier le nombre total d'affectations pour ce chien cette semaine
  const dogWeeklyCount = currentAssignments.filter(a => a.dogId === dogId).length;
  if (dogWeeklyCount >= MAX_WALKS_PER_DOG_PER_WEEK) {
    violations.push({
      code: 'DOG_MAX_WEEKLY_WALKS',
      severity: 'error',
      message: `${dogName} a déjà ${dogWeeklyCount} balades cette semaine (max: ${MAX_WALKS_PER_DOG_PER_WEEK})`,
      context: { dogId, dogName, dogWeeklyCount, max: MAX_WALKS_PER_DOG_PER_WEEK },
    });
  }

  // 5. Vérifier la cohérence routine
  if (dogRoutineType && dogRoutineType !== 'PONCTUEL') {
    const expectedCount = ROUTINE_WALK_COUNT[dogRoutineType];
    if (dogWeeklyCount >= expectedCount) {
      warnings.push({
        code: 'ROUTINE_EXCEEDED',
        severity: 'warning',
        message: `${dogName} a une routine ${dogRoutineType} (${expectedCount}x/sem) et a déjà ${dogWeeklyCount} affectations`,
        context: { dogId, dogName, dogRoutineType, expectedCount, dogWeeklyCount },
        suggestions: ['Vérifiez si c\'est une balade supplémentaire exceptionnelle'],
      });
    }
  }

  // 6. Vérifier la cohérence du secteur
  if (dogSector && groupSector && dogSector !== groupSector) {
    warnings.push({
      code: 'SECTOR_MISMATCH',
      severity: 'warning',
      message: `${dogName} est dans le secteur ${dogSector} mais le groupe est en ${groupSector}`,
      context: { dogId, dogName, dogSector, groupSector },
      suggestions: [
        'Vérifiez que le trajet reste raisonnable',
        'Envisagez un groupe dans le bon secteur si disponible',
      ],
    });
  }

  // 7. Vérifier les balades consécutives
  const parsed = parseGroupId(groupId);
  if (parsed) {
    const { day, blockIndex } = parsed;
    
    // Chercher si le chien a une balade dans un bloc adjacent le même jour
    currentAssignments
      .filter(a => a.dogId === dogId)
      .forEach(assignment => {
        const otherParsed = parseGroupId(assignment.groupId);
        if (otherParsed && otherParsed.day === day) {
          const blockDiff = Math.abs(otherParsed.blockIndex - blockIndex);
          if (blockDiff === 1) {
            warnings.push({
              code: 'CONSECUTIVE_WALKS',
              severity: 'warning',
              message: `${dogName} a déjà une balade dans un créneau adjacent (${assignment.groupId})`,
              context: { dogId, dogName, groupId, adjacentGroup: assignment.groupId },
              suggestions: ['Vérifiez que le chien peut enchaîner 2 balades'],
            });
          }
        }
      });
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
    info,
  };
}

/**
 * Vérifie les doubles réservations potentielles
 */
export function detectDoubleBookings(assignments: Array<{
  dogId: string;
  dogName: string;
  groupId: string;
}>): DogConflict[] {
  const conflicts: DogConflict[] = [];
  const dogAssignments = new Map<string, Array<{ groupId: string; dogName: string }>>();

  // Grouper par chien
  assignments.forEach(a => {
    const existing = dogAssignments.get(a.dogId) || [];
    existing.push({ groupId: a.groupId, dogName: a.dogName });
    dogAssignments.set(a.dogId, existing);
  });

  // Vérifier chaque chien
  dogAssignments.forEach((groups, dogId) => {
    // Vérifier les doublons de groupe
    const groupIds = groups.map(g => g.groupId);
    const uniqueGroups = new Set(groupIds);
    if (uniqueGroups.size !== groupIds.length) {
      const duplicates = groupIds.filter((id, i) => groupIds.indexOf(id) !== i);
      conflicts.push({
        dogId,
        dogName: groups[0].dogName,
        conflictType: 'double_booking',
        details: `${groups[0].dogName} est inscrit plusieurs fois au même groupe`,
        affectedGroups: [...new Set(duplicates)],
      });
    }

    // Vérifier les balades consécutives
    const dayGroups = new Map<WorkDay, number[]>();
    groups.forEach(g => {
      const parsed = parseGroupId(g.groupId);
      if (parsed) {
        const existing = dayGroups.get(parsed.day) || [];
        existing.push(parsed.blockIndex);
        dayGroups.set(parsed.day, existing);
      }
    });

    dayGroups.forEach((blocks, day) => {
      blocks.sort((a, b) => a - b);
      for (let i = 0; i < blocks.length - 1; i++) {
        if (blocks[i + 1] - blocks[i] === 1) {
          const groupId1 = buildGroupId(day, TIME_BLOCKS[blocks[i]]);
          const groupId2 = buildGroupId(day, TIME_BLOCKS[blocks[i + 1]]);
          conflicts.push({
            dogId,
            dogName: groups[0].dogName,
            conflictType: 'consecutive_blocks',
            details: `${groups[0].dogName} a 2 balades consécutives le ${DAY_LABELS[day]}`,
            affectedGroups: [groupId1, groupId2],
          });
        }
      }
    });
  });

  return conflicts;
}

/**
 * Analyse la charge de travail hebdomadaire
 */
export function analyzeWeeklyLoad(params: {
  groups: Array<{
    id: string;
    sector: GeographicSector | null;
    capacity: number;
    isBlocked: boolean;
  }>;
  assignments: Array<{
    groupId: string;
    dogId: string;
  }>;
}): WeeklyLoadAnalysis {
  const { groups, assignments } = params;

  // Compter par groupe
  const groupCounts = new Map<string, number>();
  assignments.forEach(a => {
    groupCounts.set(a.groupId, (groupCounts.get(a.groupId) || 0) + 1);
  });

  const totalAssignments = assignments.length;
  const activeGroups = groups.filter(g => !g.isBlocked);
  const totalCapacity = activeGroups.reduce((sum, g) => sum + g.capacity, 0);
  const utilizationPercent = totalCapacity > 0 
    ? Math.round((totalAssignments / totalCapacity) * 100) 
    : 0;

  const overBookedGroups: string[] = [];
  const emptyGroups: string[] = [];
  const nearCapacityGroups: string[] = [];

  const sectorDistribution: Record<GeographicSector, number> = { S1: 0, S2: 0, S3: 0 };
  const dayDistribution: Record<WorkDay, number> = {
    lundi: 0, mardi: 0, mercredi: 0, jeudi: 0, vendredi: 0,
  };
  const blockDistribution: Record<TimeBlock, number> = { B1: 0, B2: 0, B3: 0 };

  groups.forEach(group => {
    const count = groupCounts.get(group.id) || 0;
    const parsed = parseGroupId(group.id);

    if (count > group.capacity) {
      overBookedGroups.push(group.id);
    } else if (count === 0 && !group.isBlocked) {
      emptyGroups.push(group.id);
    } else if (count >= group.capacity * (CAPACITY_WARNING_THRESHOLD / 100)) {
      nearCapacityGroups.push(group.id);
    }

    if (group.sector) {
      sectorDistribution[group.sector] += count;
    }

    if (parsed) {
      dayDistribution[parsed.day] += count;
      blockDistribution[parsed.block] += count;
    }
  });

  return {
    totalAssignments,
    totalCapacity,
    utilizationPercent,
    overBookedGroups,
    emptyGroups,
    nearCapacityGroups,
    sectorDistribution,
    dayDistribution,
    blockDistribution,
  };
}

/**
 * Vérifie la cohérence des routines pour tous les chiens
 */
export function checkRoutineCompliance(params: {
  dogs: Array<{
    id: string;
    name: string;
    routineType: RoutineType;
    sector?: GeographicSector | null;
  }>;
  assignments: Array<{
    dogId: string;
    groupId: string;
  }>;
}): Array<{
  dogId: string;
  dogName: string;
  routineType: RoutineType;
  expectedCount: number;
  actualCount: number;
  status: 'ok' | 'under' | 'over';
  message: string;
}> {
  const { dogs, assignments } = params;
  const results: Array<{
    dogId: string;
    dogName: string;
    routineType: RoutineType;
    expectedCount: number;
    actualCount: number;
    status: 'ok' | 'under' | 'over';
    message: string;
  }> = [];

  dogs.forEach(dog => {
    if (dog.routineType === 'PONCTUEL') return;

    const expected = ROUTINE_WALK_COUNT[dog.routineType];
    const actual = assignments.filter(a => a.dogId === dog.id).length;

    let status: 'ok' | 'under' | 'over' = 'ok';
    let message = `${dog.name}: ${actual}/${expected} balades (${dog.routineType})`;

    if (actual < expected) {
      status = 'under';
      message = `⚠️ ${dog.name} n'a que ${actual}/${expected} balades prévues`;
    } else if (actual > expected) {
      status = 'over';
      message = `📈 ${dog.name} a ${actual} balades (routine: ${expected})`;
    }

    results.push({
      dogId: dog.id,
      dogName: dog.name,
      routineType: dog.routineType,
      expectedCount: expected,
      actualCount: actual,
      status,
      message,
    });
  });

  return results;
}

// =====================================================
// UTILITAIRES
// =====================================================

/**
 * Parse un ID de groupe (ex: "LU-B1") pour extraire jour et bloc
 */
function parseGroupId(groupId: string): { day: WorkDay; block: TimeBlock; blockIndex: number } | null {
  const match = groupId.match(/^([A-Z]{2})-B([1-3])$/);
  if (!match) return null;

  const dayCode = match[1];
  const blockNum = parseInt(match[2], 10);
  const block = `B${blockNum}` as TimeBlock;

  const dayEntry = Object.entries(DAY_CODES).find(([_, code]) => code === dayCode);
  if (!dayEntry) return null;

  return {
    day: dayEntry[0] as WorkDay,
    block,
    blockIndex: blockNum - 1,
  };
}

/**
 * Construit un ID de groupe à partir du jour et du bloc
 */
function buildGroupId(day: WorkDay, block: TimeBlock): string {
  return `${DAY_CODES[day]}-${block}`;
}

/**
 * Calcule le prix total pour un ensemble d'affectations
 */
export function calculateWeeklyRevenue(assignments: Array<{
  walkType: WalkType;
  customPrice?: number;
}>): number {
  return assignments.reduce((total, a) => {
    const price = a.customPrice ?? DEFAULT_PRICES[a.walkType];
    return total + price;
  }, 0);
}

/**
 * Suggère les meilleurs créneaux pour un chien selon ses préférences
 */
export function suggestBestGroups(params: {
  dogSector: GeographicSector | null;
  dogPreferredDays: WorkDay[];
  dogTimePreference: TimePreference;
  availableGroups: Array<{
    id: string;
    sector: GeographicSector | null;
    currentCount: number;
    capacity: number;
    isBlocked: boolean;
  }>;
  maxSuggestions?: number;
}): Array<{ groupId: string; score: number; reasons: string[] }> {
  const { dogSector, dogPreferredDays, dogTimePreference, availableGroups, maxSuggestions = 5 } = params;

  const scored = availableGroups
    .filter(g => !g.isBlocked && g.currentCount < g.capacity)
    .map(group => {
      let score = 0;
      const reasons: string[] = [];
      const parsed = parseGroupId(group.id);

      if (!parsed) return { groupId: group.id, score: 0, reasons: [] };

      // Secteur correspondant (+10 points)
      if (dogSector && group.sector === dogSector) {
        score += 10;
        reasons.push('Même secteur');
      } else if (!dogSector || !group.sector) {
        score += 5;
        reasons.push('Secteur flexible');
      }

      // Jour préféré (+5 points)
      if (dogPreferredDays.length === 0 || dogPreferredDays.includes(parsed.day)) {
        score += 5;
        reasons.push('Jour disponible');
      }

      // Créneau horaire préféré (+3 points)
      const blockMatch = (
        dogTimePreference === 'INDIFFERENT' ||
        (dogTimePreference === 'MATIN' && parsed.block === 'B1') ||
        (dogTimePreference === 'MIDI' && parsed.block === 'B2') ||
        (dogTimePreference === 'APRESMIDI' && parsed.block === 'B3')
      );
      if (blockMatch) {
        score += 3;
        reasons.push('Créneau préféré');
      }

      // Bonus si groupe peu rempli (+2 points si < 50% plein)
      if (group.currentCount < group.capacity / 2) {
        score += 2;
        reasons.push('Groupe avec places');
      }

      return { groupId: group.id, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);

  return scored;
}

/**
 * Génère un résumé textuel de la semaine pour export/notification
 */
export function generateWeeklySummary(analysis: WeeklyLoadAnalysis): string {
  const lines: string[] = [
    `📊 RÉSUMÉ PLANNING SEMAINE`,
    ``,
    `Remplissage global: ${analysis.utilizationPercent}% (${analysis.totalAssignments}/${analysis.totalCapacity} places)`,
    ``,
    `Par jour:`,
  ];

  WORK_DAYS.forEach(day => {
    const count = analysis.dayDistribution[day];
    lines.push(`  ${DAY_LABELS[day]}: ${count} chien${count > 1 ? 's' : ''}`);
  });

  if (analysis.overBookedGroups.length > 0) {
    lines.push(``, `⚠️ ATTENTION - Groupes en surréservation:`);
    analysis.overBookedGroups.forEach(g => lines.push(`  - ${g}`));
  }

  if (analysis.emptyGroups.length > 0) {
    lines.push(``, `📭 Créneaux vides disponibles: ${analysis.emptyGroups.join(', ')}`);
  }

  return lines.join('\n');
}
