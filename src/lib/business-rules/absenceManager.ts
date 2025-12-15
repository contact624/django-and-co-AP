/**
 * =====================================================
 * GESTION DES ABSENCES & ANNULATIONS - DJANGO & CO
 * =====================================================
 * 
 * Ce module gère les cas spéciaux du planning :
 * - Absences planifiées (vacances client, chien malade, etc.)
 * - Annulations de dernière minute
 * - Remplacements et reports
 * - Calcul des rattrapages éventuels
 * - Historique pour facturation et statistiques
 * 
 * RÈGLES MÉTIER IMPORTANTES :
 * - Annulation > 24h : pas de facturation
 * - Annulation < 24h : facturation partielle (50%)
 * - Annulation le jour même : facturation complète
 * - Les forfaits ne sont pas remboursés mais peuvent être décalés
 */

import { format, differenceInHours, addWeeks, isSameWeek, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { WorkDay, TimeBlock, WalkType } from '@/lib/planningTypes';

// =====================================================
// TYPES
// =====================================================

export type AbsenceType = 
  | 'VACANCES_CLIENT'
  | 'CHIEN_MALADE' 
  | 'CHIEN_CHALEURS'
  | 'RENDEZ_VOUS_VETERINAIRE'
  | 'EVENEMENT_FAMILIAL'
  | 'PROMENEUR_ABSENT'
  | 'METEO_EXTREME'
  | 'AUTRE';

export type CancellationPolicy = 
  | 'FULL_REFUND'      // > 24h avant
  | 'PARTIAL_CHARGE'   // < 24h avant
  | 'FULL_CHARGE'      // Le jour même
  | 'RESCHEDULED'      // Reporté
  | 'PACKAGE_CREDIT';  // Crédit sur forfait

export interface AbsenceRecord {
  id: string;
  dogId: string;
  dogName: string;
  clientId: string;
  clientName: string;
  originalGroupId: string;
  originalDate: Date;
  absenceType: AbsenceType;
  reason?: string;
  cancellationTime: Date;
  policy: CancellationPolicy;
  chargeAmount: number;
  rescheduleInfo?: {
    newGroupId: string;
    newDate: Date;
    confirmed: boolean;
  };
  createdAt: Date;
  createdBy: string;
}

export interface VacationPeriod {
  id: string;
  dogId: string;
  dogName: string;
  clientId: string;
  startDate: Date;
  endDate: Date;
  reason: AbsenceType;
  notes?: string;
  affectedAssignments: string[]; // Group IDs affected
  createdAt: Date;
}

export interface AbsenceStats {
  totalAbsences: number;
  byType: Record<AbsenceType, number>;
  byPolicy: Record<CancellationPolicy, number>;
  totalLostRevenue: number;
  totalChargedAmount: number;
  mostFrequentClients: Array<{ clientName: string; absenceCount: number }>;
  byWeekday: Record<WorkDay, number>;
}

export interface RescheduleSuggestion {
  groupId: string;
  date: Date;
  day: WorkDay;
  block: TimeBlock;
  availableSlots: number;
  isPreferredSlot: boolean;
  priority: number;
}

// =====================================================
// CONSTANTES
// =====================================================

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  VACANCES_CLIENT: 'Vacances du client',
  CHIEN_MALADE: 'Chien malade',
  CHIEN_CHALEURS: 'Chien en chaleurs',
  RENDEZ_VOUS_VETERINAIRE: 'Rendez-vous vétérinaire',
  EVENEMENT_FAMILIAL: 'Événement familial',
  PROMENEUR_ABSENT: 'Promeneur absent',
  METEO_EXTREME: 'Météo extrême',
  AUTRE: 'Autre raison',
};

export const CANCELLATION_POLICY_LABELS: Record<CancellationPolicy, string> = {
  FULL_REFUND: 'Non facturé (annulation > 24h)',
  PARTIAL_CHARGE: 'Facturé 50% (annulation < 24h)',
  FULL_CHARGE: 'Facturé 100% (annulation jour même)',
  RESCHEDULED: 'Reporté',
  PACKAGE_CREDIT: 'Crédit forfait',
};

/** Prix pour le calcul des pénalités d'annulation */
export const CANCELLATION_BASE_PRICE = 30; // CHF

// =====================================================
// CALCUL DE LA POLITIQUE D'ANNULATION
// =====================================================

/**
 * Détermine la politique d'annulation applicable selon le délai
 */
export function determineCancellationPolicy(params: {
  originalDate: Date;
  cancellationTime: Date;
  absenceType: AbsenceType;
  isPackageClient: boolean;
}): { policy: CancellationPolicy; chargePercent: number; reason: string } {
  const { originalDate, cancellationTime, absenceType, isPackageClient } = params;
  
  const hoursBeforeWalk = differenceInHours(originalDate, cancellationTime);

  // Cas spéciaux où on ne facture jamais
  const excusedTypes: AbsenceType[] = ['PROMENEUR_ABSENT', 'METEO_EXTREME'];
  if (excusedTypes.includes(absenceType)) {
    return {
      policy: 'FULL_REFUND',
      chargePercent: 0,
      reason: 'Annulation non imputable au client',
    };
  }

  // Cas maladie du chien : on propose un report sans pénalité
  if (absenceType === 'CHIEN_MALADE' || absenceType === 'RENDEZ_VOUS_VETERINAIRE') {
    return {
      policy: 'RESCHEDULED',
      chargePercent: 0,
      reason: 'Report proposé pour raison médicale',
    };
  }

  // Pour les clients au forfait
  if (isPackageClient) {
    return {
      policy: 'PACKAGE_CREDIT',
      chargePercent: 0,
      reason: 'Crédit appliqué sur le forfait mensuel',
    };
  }

  // Politique standard selon le délai
  if (hoursBeforeWalk >= 24) {
    return {
      policy: 'FULL_REFUND',
      chargePercent: 0,
      reason: 'Annulation avec plus de 24h de préavis',
    };
  } else if (hoursBeforeWalk >= 6) {
    return {
      policy: 'PARTIAL_CHARGE',
      chargePercent: 50,
      reason: 'Annulation tardive (< 24h)',
    };
  } else {
    return {
      policy: 'FULL_CHARGE',
      chargePercent: 100,
      reason: 'Annulation le jour même',
    };
  }
}

/**
 * Calcule le montant à facturer pour une annulation
 */
export function calculateCancellationCharge(params: {
  walkType: WalkType;
  customPrice?: number;
  chargePercent: number;
}): number {
  const { walkType, customPrice, chargePercent } = params;
  
  const basePrice = customPrice ?? CANCELLATION_BASE_PRICE;
  return Math.round(basePrice * (chargePercent / 100) * 100) / 100;
}

// =====================================================
// GESTION DES VACANCES
// =====================================================

/**
 * Génère les absences pour une période de vacances
 */
export function generateVacationAbsences(params: {
  dogId: string;
  dogName: string;
  clientId: string;
  clientName: string;
  startDate: Date;
  endDate: Date;
  reason: AbsenceType;
  regularAssignments: Array<{
    groupId: string;
    day: WorkDay;
  }>;
}): AbsenceRecord[] {
  const { dogId, dogName, clientId, clientName, startDate, endDate, reason, regularAssignments } = params;
  
  const absences: AbsenceRecord[] = [];
  const now = new Date();

  // Pour chaque semaine dans la période
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const vacationEndWeek = endOfWeek(endDate, { weekStartsOn: 1 });

  while (currentWeekStart <= vacationEndWeek) {
    // Pour chaque jour d'assignation régulière
    regularAssignments.forEach(assignment => {
      const dayIndex = getDayIndex(assignment.day);
      const assignmentDate = new Date(currentWeekStart);
      assignmentDate.setDate(assignmentDate.getDate() + dayIndex);

      // Vérifier que la date est dans la période de vacances
      if (assignmentDate >= startDate && assignmentDate <= endDate) {
        // Politique pour les vacances planifiées à l'avance
        const { policy, chargePercent } = determineCancellationPolicy({
          originalDate: assignmentDate,
          cancellationTime: now,
          absenceType: reason,
          isPackageClient: true, // Supposer forfait pour les vacances
        });

        absences.push({
          id: `absence-${dogId}-${format(assignmentDate, 'yyyy-MM-dd')}`,
          dogId,
          dogName,
          clientId,
          clientName,
          originalGroupId: assignment.groupId,
          originalDate: assignmentDate,
          absenceType: reason,
          reason: `Vacances du ${format(startDate, 'd MMM', { locale: fr })} au ${format(endDate, 'd MMM', { locale: fr })}`,
          cancellationTime: now,
          policy,
          chargeAmount: calculateCancellationCharge({
            walkType: 'COLLECTIVE',
            chargePercent,
          }),
          createdAt: now,
          createdBy: 'system',
        });
      }
    });

    currentWeekStart = addWeeks(currentWeekStart, 1);
  }

  return absences;
}

// =====================================================
// SUGGESTIONS DE REPORT
// =====================================================

/**
 * Suggère des créneaux de report pour une balade annulée
 */
export function suggestRescheduleDates(params: {
  originalGroupId: string;
  originalDate: Date;
  dogPreferredDays?: WorkDay[];
  dogPreferredBlock?: TimeBlock;
  availableGroups: Array<{
    id: string;
    day: WorkDay;
    block: TimeBlock;
    currentCount: number;
    capacity: number;
    isBlocked: boolean;
  }>;
  maxSuggestions?: number;
}): RescheduleSuggestion[] {
  const { 
    originalDate, 
    dogPreferredDays = [], 
    dogPreferredBlock,
    availableGroups, 
    maxSuggestions = 5 
  } = params;

  const suggestions: RescheduleSuggestion[] = [];
  
  // Générer des dates pour les 2 prochaines semaines
  const nextWeekStart = addWeeks(startOfWeek(originalDate, { weekStartsOn: 1 }), 1);
  const twoWeeksLater = addWeeks(nextWeekStart, 2);

  availableGroups
    .filter(g => !g.isBlocked && g.currentCount < g.capacity)
    .forEach(group => {
      const dayIndex = getDayIndex(group.day);
      
      // Pour chaque semaine
      let weekStart = nextWeekStart;
      while (weekStart < twoWeeksLater) {
        const suggestionDate = new Date(weekStart);
        suggestionDate.setDate(suggestionDate.getDate() + dayIndex);

        // Calculer la priorité
        let priority = 0;
        const isPreferredDay = dogPreferredDays.length === 0 || dogPreferredDays.includes(group.day);
        const isPreferredBlock = !dogPreferredBlock || dogPreferredBlock === group.block;

        if (isPreferredDay) priority += 5;
        if (isPreferredBlock) priority += 3;
        if (group.currentCount < group.capacity / 2) priority += 2; // Groupe peu rempli

        suggestions.push({
          groupId: group.id,
          date: suggestionDate,
          day: group.day,
          block: group.block,
          availableSlots: group.capacity - group.currentCount,
          isPreferredSlot: isPreferredDay && isPreferredBlock,
          priority,
        });

        weekStart = addWeeks(weekStart, 1);
      }
    });

  // Trier par priorité et limiter
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxSuggestions);
}

// =====================================================
// STATISTIQUES
// =====================================================

/**
 * Calcule les statistiques d'absences sur une période
 */
export function calculateAbsenceStats(absences: AbsenceRecord[]): AbsenceStats {
  const byType: Record<AbsenceType, number> = {
    VACANCES_CLIENT: 0,
    CHIEN_MALADE: 0,
    CHIEN_CHALEURS: 0,
    RENDEZ_VOUS_VETERINAIRE: 0,
    EVENEMENT_FAMILIAL: 0,
    PROMENEUR_ABSENT: 0,
    METEO_EXTREME: 0,
    AUTRE: 0,
  };

  const byPolicy: Record<CancellationPolicy, number> = {
    FULL_REFUND: 0,
    PARTIAL_CHARGE: 0,
    FULL_CHARGE: 0,
    RESCHEDULED: 0,
    PACKAGE_CREDIT: 0,
  };

  const byWeekday: Record<WorkDay, number> = {
    lundi: 0,
    mardi: 0,
    mercredi: 0,
    jeudi: 0,
    vendredi: 0,
  };

  const clientAbsences = new Map<string, { name: string; count: number }>();
  let totalLostRevenue = 0;
  let totalChargedAmount = 0;

  absences.forEach(absence => {
    byType[absence.absenceType]++;
    byPolicy[absence.policy]++;

    // Compter par jour de la semaine
    const dayName = getDayName(absence.originalDate);
    if (dayName) byWeekday[dayName]++;

    // Comptabiliser les montants
    const basePrice = CANCELLATION_BASE_PRICE;
    if (absence.policy === 'FULL_REFUND' || absence.policy === 'RESCHEDULED' || absence.policy === 'PACKAGE_CREDIT') {
      totalLostRevenue += basePrice;
    } else {
      totalChargedAmount += absence.chargeAmount;
      totalLostRevenue += basePrice - absence.chargeAmount;
    }

    // Compter par client
    const existing = clientAbsences.get(absence.clientId);
    if (existing) {
      existing.count++;
    } else {
      clientAbsences.set(absence.clientId, { name: absence.clientName, count: 1 });
    }
  });

  const mostFrequentClients = Array.from(clientAbsences.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(c => ({ clientName: c.name, absenceCount: c.count }));

  return {
    totalAbsences: absences.length,
    byType,
    byPolicy,
    totalLostRevenue,
    totalChargedAmount,
    mostFrequentClients,
    byWeekday,
  };
}

// =====================================================
// UTILITAIRES
// =====================================================

function getDayIndex(day: WorkDay): number {
  const mapping: Record<WorkDay, number> = {
    lundi: 0,
    mardi: 1,
    mercredi: 2,
    jeudi: 3,
    vendredi: 4,
  };
  return mapping[day];
}

function getDayName(date: Date): WorkDay | null {
  const dayOfWeek = date.getDay();
  const mapping: Record<number, WorkDay> = {
    1: 'lundi',
    2: 'mardi',
    3: 'mercredi',
    4: 'jeudi',
    5: 'vendredi',
  };
  return mapping[dayOfWeek] ?? null;
}

/**
 * Vérifie si une date est dans une période de vacances
 */
export function isDateInVacation(date: Date, vacations: VacationPeriod[]): VacationPeriod | null {
  return vacations.find(v => date >= v.startDate && date <= v.endDate) ?? null;
}

/**
 * Génère un message de notification pour une annulation
 */
export function generateCancellationNotification(absence: AbsenceRecord): string {
  const dateStr = format(absence.originalDate, 'EEEE d MMMM', { locale: fr });
  const typeLabel = ABSENCE_TYPE_LABELS[absence.absenceType];
  const policyLabel = CANCELLATION_POLICY_LABELS[absence.policy];

  let message = `📅 Balade annulée\n\n`;
  message += `Chien: ${absence.dogName}\n`;
  message += `Date: ${dateStr}\n`;
  message += `Raison: ${typeLabel}\n`;
  message += `Facturation: ${policyLabel}\n`;

  if (absence.chargeAmount > 0) {
    message += `Montant: ${absence.chargeAmount.toFixed(2)} CHF\n`;
  }

  if (absence.rescheduleInfo) {
    const newDateStr = format(absence.rescheduleInfo.newDate, 'EEEE d MMMM', { locale: fr });
    message += `\n🔄 Report proposé: ${newDateStr}`;
    if (absence.rescheduleInfo.confirmed) {
      message += ' ✅ Confirmé';
    } else {
      message += ' ⏳ En attente de confirmation';
    }
  }

  return message;
}
