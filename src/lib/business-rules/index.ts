/**
 * =====================================================
 * INDEX DES RÈGLES MÉTIER - DJANGO & CO
 * =====================================================
 * 
 * Point d'entrée unique pour tous les modules de logique métier.
 * Import simplifié : import { ... } from '@/lib/business-rules'
 */

// Moteur de planification
export * from './planningEngine';

// Moteur de facturation
export * from './invoicingEngine';

// Gestion des absences
export * from './absenceManager';

/**
 * DOCUMENTATION DES MODULES
 * 
 * 1. PLANNING ENGINE (planningEngine.ts)
 *    - Validation des contraintes de capacité
 *    - Détection des conflits de planning
 *    - Analyse de charge hebdomadaire
 *    - Vérification de conformité des routines
 *    - Suggestions de créneaux optimaux
 * 
 * 2. INVOICING ENGINE (invoicingEngine.ts)
 *    - Calcul automatique des factures
 *    - Gestion des forfaits mensuels
 *    - Génération des rappels de paiement
 *    - Rapports mensuels de revenus
 *    - Estimation des revenus
 * 
 * 3. ABSENCE MANAGER (absenceManager.ts)
 *    - Politique d'annulation
 *    - Gestion des vacances
 *    - Suggestions de report
 *    - Statistiques d'absences
 *    - Notifications d'annulation
 * 
 * UTILISATION TYPIQUE :
 * 
 * ```typescript
 * import { 
 *   validateDogAssignment,
 *   calculateInvoice,
 *   determineCancellationPolicy 
 * } from '@/lib/business-rules';
 * 
 * // Valider une affectation
 * const result = validateDogAssignment({
 *   dogId: '...',
 *   dogName: 'Rex',
 *   groupId: 'LU-B1',
 *   // ...
 * });
 * 
 * if (!result.isValid) {
 *   console.error(result.violations);
 * }
 * ```
 */
