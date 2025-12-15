/**
 * =====================================================
 * VALIDATIONS MÉTIER - PROMENEUR CANIN
 * =====================================================
 * 
 * Validations spécifiques au domaine métier :
 * - Routines de chiens
 * - Affectations de groupes
 * - Absences et annulations
 * - Forfaits clients
 * - Données animaux
 */

import { z } from "zod";

// ===============================================
// SCHÉMAS DE BASE
// ===============================================

// Numéro de puce électronique (15 chiffres selon norme ISO)
export const microchipSchema = z
  .string()
  .trim()
  .regex(/^\d{15}$/, "Le numéro de puce doit contenir exactement 15 chiffres")
  .optional()
  .or(z.literal(""));

// Race de chien
export const breedSchema = z
  .string()
  .trim()
  .max(100, "Nom de race trop long")
  .regex(/^[\p{L}\p{M}\s\-']*$/u, "Caractères non autorisés dans le nom de race")
  .optional()
  .or(z.literal(""));

// Notes de comportement
export const behaviorNotesSchema = z
  .string()
  .trim()
  .max(2000, "Notes comportement trop longues (max 2000 caractères)")
  .optional()
  .or(z.literal(""));

// Format de groupe (ex: LU-B1, MA-B2)
export const groupIdSchema = z
  .string()
  .regex(
    /^(LU|MA|ME|JE|VE)-B[1-3]$/,
    "Format de groupe invalide. Attendu: XX-BN (ex: LU-B1, MA-B2)"
  );

// ===============================================
// ENUMS MÉTIER
// ===============================================

export const routineTypeEnum = z.enum(['R1', 'R2', 'R3', 'ROUTINE_PLUS', 'PONCTUEL']);
export const sectorEnum = z.enum(['S1', 'S2', 'S3']);
export const timePreferenceEnum = z.enum(['MATIN', 'MIDI', 'APRESMIDI', 'INDIFFERENT']);
export const walkTypeEnum = z.enum(['COLLECTIVE', 'INDIVIDUELLE', 'CANIRANDO', 'SUR_MESURE']);
export const workDayEnum = z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);
export const timeBlockEnum = z.enum(['B1', 'B2', 'B3']);
export const absenceTypeEnum = z.enum([
  'VACANCES_CLIENT',
  'CHIEN_MALADE',
  'CHIEN_CHALEURS',
  'RENDEZ_VOUS_VETERINAIRE',
  'EVENEMENT_FAMILIAL',
  'PROMENEUR_ABSENT',
  'METEO_EXTREME',
  'AUTRE',
]);
export const cancellationPolicyEnum = z.enum([
  'FULL_REFUND',
  'PARTIAL_CHARGE',
  'FULL_CHARGE',
  'RESCHEDULED',
  'PACKAGE_CREDIT',
]);

// ===============================================
// SCHÉMAS DE VALIDATION COMPLEXES
// ===============================================

/**
 * Validation de la routine d'un chien
 */
export const dogRoutineSchema = z.object({
  animal_id: z.string().uuid("ID animal invalide"),
  routine_type: routineTypeEnum,
  sector: sectorEnum.nullable().optional(),
  time_preference: timePreferenceEnum.default('INDIFFERENT'),
  preferred_days: z.array(workDayEnum).default([]),
  walk_type_preference: walkTypeEnum.default('COLLECTIVE'),
  behavior_notes: behaviorNotesSchema,
  special_requirements: z.string().trim().max(1000, "Exigences spéciales trop longues").optional(),
}).refine(
  (data) => {
    // Vérifier que les préférences sont cohérentes
    if (data.walk_type_preference === 'INDIVIDUELLE' && data.routine_type === 'R3') {
      return false; // 3 balades individuelles par semaine = trop cher, suspicieux
    }
    return true;
  },
  {
    message: "Configuration de routine incohérente",
    path: ["routine_type"],
  }
);

/**
 * Validation d'une affectation de groupe
 */
export const groupAssignmentSchema = z.object({
  animal_id: z.string().uuid("ID animal invalide"),
  group_id: groupIdSchema,
  year: z.number().int().min(2024, "Année trop ancienne").max(2100, "Année trop lointaine"),
  week_number: z.number().int().min(1, "Semaine invalide").max(53, "Semaine invalide"),
  notes: z.string().trim().max(500).optional(),
  is_confirmed: z.boolean().default(true),
}).refine(
  (data) => {
    // Vérifier que la semaine est valide pour l'année
    // (Les années ont 52 ou 53 semaines selon le calendrier ISO)
    const maxWeek = getMaxWeeksInYear(data.year);
    return data.week_number <= maxWeek;
  },
  {
    message: "Cette semaine n'existe pas dans cette année",
    path: ["week_number"],
  }
);

/**
 * Validation d'une absence/annulation
 */
export const absenceRecordSchema = z.object({
  dog_id: z.string().uuid("ID chien invalide"),
  client_id: z.string().uuid("ID client invalide"),
  original_group_id: groupIdSchema,
  original_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  absence_type: absenceTypeEnum,
  reason: z.string().trim().max(500, "Raison trop longue").optional(),
  policy: cancellationPolicyEnum.optional(), // Calculé automatiquement si non fourni
  charge_amount: z.number().min(0).max(500).optional(),
  rescheduled_group_id: groupIdSchema.optional().nullable(),
  rescheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

/**
 * Validation d'une période de vacances
 */
export const vacationPeriodSchema = z.object({
  dog_id: z.string().uuid("ID chien invalide"),
  client_id: z.string().uuid("ID client invalide"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  reason: absenceTypeEnum.default('VACANCES_CLIENT'),
  notes: z.string().trim().max(500).optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  {
    message: "La date de fin doit être après la date de début",
    path: ["end_date"],
  }
).refine(
  (data) => {
    // Limiter la durée des vacances à 90 jours
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  },
  {
    message: "Période de vacances trop longue (max 90 jours)",
    path: ["end_date"],
  }
);

/**
 * Validation d'un forfait client
 */
export const clientPackageSchema = z.object({
  client_id: z.string().uuid("ID client invalide"),
  dog_id: z.string().uuid("ID chien invalide"),
  routine_type: routineTypeEnum,
  monthly_price: z.number().min(0, "Prix négatif interdit").max(1000, "Prix trop élevé"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expected_monthly_walks: z.number().int().min(1).max(25),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Validation d'un animal (chien)
 */
export const animalSchema = z.object({
  client_id: z.string().uuid("ID client invalide"),
  name: z.string().trim().min(1, "Nom requis").max(50, "Nom trop long"),
  species: z.string().default('dog'),
  breed: breedSchema,
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  microchip_number: microchipSchema,
  allergies: z.string().trim().max(500, "Allergies trop longues").optional(),
  notes: z.string().trim().max(2000, "Notes trop longues").optional(),
}).refine(
  (data) => {
    // Vérifier que la date de naissance est dans le passé
    if (data.birth_date) {
      return new Date(data.birth_date) < new Date();
    }
    return true;
  },
  {
    message: "La date de naissance doit être dans le passé",
    path: ["birth_date"],
  }
);

/**
 * Validation des modifications du planning hebdomadaire
 */
export const weeklyScheduleSchema = z.object({
  group_id: groupIdSchema,
  year: z.number().int().min(2024).max(2100),
  week_number: z.number().int().min(1).max(53),
  walk_type: walkTypeEnum.default('COLLECTIVE'),
  sector: sectorEnum.nullable().optional(),
  capacity: z.number().int().min(1, "Capacité minimum: 1").max(6, "Capacité maximum: 6"),
  is_blocked: z.boolean().default(false),
  block_reason: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
}).refine(
  (data) => {
    // Si le groupe est bloqué, une raison devrait être fournie
    if (data.is_blocked && !data.block_reason) {
      return false;
    }
    return true;
  },
  {
    message: "Veuillez indiquer la raison du blocage",
    path: ["block_reason"],
  }
).refine(
  (data) => {
    // La capacité doit correspondre au type
    if (data.walk_type === 'INDIVIDUELLE' && data.capacity !== 1) {
      return false;
    }
    return true;
  },
  {
    message: "Une balade individuelle ne peut avoir qu'une capacité de 1",
    path: ["capacity"],
  }
);

// ===============================================
// FONCTIONS UTILITAIRES
// ===============================================

/**
 * Calcule le nombre maximum de semaines dans une année ISO
 */
function getMaxWeeksInYear(year: number): number {
  // Calculer la date du 28 décembre (toujours dans la dernière semaine)
  const dec28 = new Date(year, 11, 28);
  // Obtenir le jour de la semaine (0 = dimanche)
  const dayOfWeek = dec28.getDay();
  // Calculer le jeudi de cette semaine
  const thursdayDate = new Date(dec28);
  thursdayDate.setDate(dec28.getDate() - ((dayOfWeek + 6) % 7) + 3);
  // Calculer le numéro de semaine
  const jan4 = new Date(thursdayDate.getFullYear(), 0, 4);
  return Math.ceil((((thursdayDate.getTime() - jan4.getTime()) / 86400000) + 1) / 7);
}

/**
 * Valide un ID de groupe et extrait jour/bloc
 */
export function parseAndValidateGroupId(groupId: string): {
  isValid: boolean;
  day?: string;
  block?: string;
  error?: string;
} {
  const result = groupIdSchema.safeParse(groupId);
  
  if (!result.success) {
    return { isValid: false, error: result.error.errors[0]?.message };
  }

  const [dayCode, block] = groupId.split('-');
  const dayMapping: Record<string, string> = {
    LU: 'lundi',
    MA: 'mardi',
    ME: 'mercredi',
    JE: 'jeudi',
    VE: 'vendredi',
  };

  return {
    isValid: true,
    day: dayMapping[dayCode],
    block,
  };
}

/**
 * Valide un ensemble complet de données avant soumission
 */
export function validateBusinessData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map((err) => ({
    field: err.path.join(".") || "general",
    message: err.message,
  }));
  
  return { success: false, errors };
}

// ===============================================
// TYPES EXPORTÉS (inférés des schémas)
// ===============================================

export type DogRoutineInput = z.infer<typeof dogRoutineSchema>;
export type GroupAssignmentInput = z.infer<typeof groupAssignmentSchema>;
export type AbsenceRecordInput = z.infer<typeof absenceRecordSchema>;
export type VacationPeriodInput = z.infer<typeof vacationPeriodSchema>;
export type ClientPackageInput = z.infer<typeof clientPackageSchema>;
export type AnimalInput = z.infer<typeof animalSchema>;
export type WeeklyScheduleInput = z.infer<typeof weeklyScheduleSchema>;
