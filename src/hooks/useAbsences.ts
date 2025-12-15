/**
 * =====================================================
 * HOOK: GESTION DES ABSENCES - DJANGO & CO
 * =====================================================
 * 
 * Hook React Query pour la gestion des absences,
 * annulations et vacances des clients.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { 
  determineCancellationPolicy, 
  calculateCancellationCharge,
  generateVacationAbsences,
  suggestRescheduleDates,
  calculateAbsenceStats,
  AbsenceRecord,
  VacationPeriod,
  AbsenceType,
  CancellationPolicy,
  ABSENCE_TYPE_LABELS,
} from "@/lib/business-rules";
import { WalkType, WorkDay, TimeBlock, getISOWeekNumber } from "@/lib/planningTypes";

// =====================================================
// TYPES
// =====================================================

export interface AbsenceRecordDB {
  id: string;
  user_id: string;
  dog_id: string;
  client_id: string;
  original_group_id: string;
  original_date: string;
  original_year: number;
  original_week_number: number;
  absence_type: AbsenceType;
  reason: string | null;
  cancellation_time: string;
  policy: CancellationPolicy;
  charge_amount: number;
  rescheduled_group_id: string | null;
  rescheduled_date: string | null;
  rescheduled_confirmed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AbsenceWithRelations extends AbsenceRecordDB {
  animals: {
    id: string;
    name: string;
    clients: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

export interface VacationPeriodDB {
  id: string;
  user_id: string;
  dog_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  reason: AbsenceType;
  notes: string | null;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface VacationWithRelations extends VacationPeriodDB {
  animals: {
    id: string;
    name: string;
  } | null;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Récupère les absences pour une période donnée
 */
export function useAbsences(params: {
  startDate?: string;
  endDate?: string;
  dogId?: string;
  clientId?: string;
}) {
  const { user } = useAuth();
  const { startDate, endDate, dogId, clientId } = params;

  return useQuery({
    queryKey: ["absences", startDate, endDate, dogId, clientId],
    queryFn: async () => {
      let query = supabase
        .from("absence_records")
        .select(`
          *,
          animals (
            id,
            name,
            clients (
              first_name,
              last_name
            )
          )
        `)
        .order("original_date", { ascending: false });

      if (startDate) {
        query = query.gte("original_date", startDate);
      }
      if (endDate) {
        query = query.lte("original_date", endDate);
      }
      if (dogId) {
        query = query.eq("dog_id", dogId);
      }
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AbsenceWithRelations[];
    },
    enabled: !!user,
  });
}

/**
 * Récupère les absences d'une semaine spécifique
 */
export function useWeeklyAbsences(year: number, weekNumber: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weekly_absences", year, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence_records")
        .select(`
          *,
          animals (
            id,
            name,
            clients (
              first_name,
              last_name
            )
          )
        `)
        .eq("original_year", year)
        .eq("original_week_number", weekNumber);

      if (error) throw error;
      return data as AbsenceWithRelations[];
    },
    enabled: !!user,
  });
}

/**
 * Récupère les périodes de vacances
 */
export function useVacationPeriods(params?: {
  dogId?: string;
  upcoming?: boolean;
}) {
  const { user } = useAuth();
  const dogId = params?.dogId;
  const upcoming = params?.upcoming;

  return useQuery({
    queryKey: ["vacation_periods", dogId, upcoming],
    queryFn: async () => {
      let query = supabase
        .from("vacation_periods")
        .select(`
          *,
          animals (
            id,
            name
          ),
          clients (
            first_name,
            last_name
          )
        `)
        .order("start_date", { ascending: true });

      if (dogId) {
        query = query.eq("dog_id", dogId);
      }
      if (upcoming) {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte("end_date", today);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VacationWithRelations[];
    },
    enabled: !!user,
  });
}

/**
 * Statistiques d'absences
 */
export function useAbsenceStats(params: {
  startDate?: string;
  endDate?: string;
}) {
  const { data: absences } = useAbsences(params);

  return useQuery({
    queryKey: ["absence_stats", params.startDate, params.endDate, absences?.length],
    queryFn: async () => {
      if (!absences) return null;

      // Convertir les absences DB en format business
      const businessAbsences = absences.map(a => ({
        id: a.id,
        dogId: a.dog_id,
        dogName: a.animals?.name || 'Inconnu',
        clientId: a.client_id,
        clientName: a.animals?.clients 
          ? `${a.animals.clients.first_name} ${a.animals.clients.last_name}` 
          : 'Inconnu',
        originalGroupId: a.original_group_id,
        originalDate: new Date(a.original_date),
        absenceType: a.absence_type,
        reason: a.reason || undefined,
        cancellationTime: new Date(a.cancellation_time),
        policy: a.policy,
        chargeAmount: a.charge_amount,
        rescheduleInfo: a.rescheduled_group_id ? {
          newGroupId: a.rescheduled_group_id,
          newDate: new Date(a.rescheduled_date || ''),
          confirmed: a.rescheduled_confirmed,
        } : undefined,
        createdAt: new Date(a.created_at),
        createdBy: a.user_id,
      }));

      return calculateAbsenceStats(businessAbsences);
    },
    enabled: !!absences,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Crée une nouvelle absence/annulation
 */
export function useCreateAbsence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      dogId: string;
      clientId: string;
      groupId: string;
      date: Date;
      absenceType: AbsenceType;
      reason?: string;
      walkType?: WalkType;
      isPackageClient?: boolean;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Calculer la politique d'annulation
      const { policy, chargePercent, reason: policyReason } = determineCancellationPolicy({
        originalDate: data.date,
        cancellationTime: new Date(),
        absenceType: data.absenceType,
        isPackageClient: data.isPackageClient || false,
      });

      // Calculer le montant
      const chargeAmount = calculateCancellationCharge({
        walkType: data.walkType || 'COLLECTIVE',
        chargePercent,
      });

      const year = data.date.getFullYear();
      const weekNumber = getISOWeekNumber(data.date);

      // Créer l'enregistrement d'absence
      const { data: absence, error } = await supabase
        .from("absence_records")
        .insert({
          user_id: user.id,
          dog_id: data.dogId,
          client_id: data.clientId,
          original_group_id: data.groupId,
          original_date: data.date.toISOString().split('T')[0],
          original_year: year,
          original_week_number: weekNumber,
          absence_type: data.absenceType,
          reason: data.reason || policyReason,
          policy,
          charge_amount: chargeAmount,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Supprimer l'assignation si elle existe
      await supabase
        .from("group_assignments")
        .delete()
        .eq("animal_id", data.dogId)
        .eq("group_id", data.groupId)
        .eq("year", year)
        .eq("week_number", weekNumber);

      return { absence, policy, chargeAmount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_absences"] });
      queryClient.invalidateQueries({ queryKey: ["group_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });

      const policyMessages: Record<CancellationPolicy, string> = {
        FULL_REFUND: "Non facturé (annulation > 24h)",
        PARTIAL_CHARGE: `Facturation partielle: ${result.chargeAmount.toFixed(2)} CHF`,
        FULL_CHARGE: `Facturation complète: ${result.chargeAmount.toFixed(2)} CHF`,
        RESCHEDULED: "Balade reportée - choisissez une nouvelle date",
        PACKAGE_CREDIT: "Crédit ajouté au forfait",
      };

      toast({
        title: "Absence enregistrée",
        description: policyMessages[result.policy],
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'absence.",
        variant: "destructive",
      });
      console.error("Error creating absence:", error);
    },
  });
}

/**
 * Crée une période de vacances
 */
export function useCreateVacation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      dogId: string;
      clientId: string;
      startDate: Date;
      endDate: Date;
      reason?: AbsenceType;
      notes?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: vacation, error } = await supabase
        .from("vacation_periods")
        .insert({
          user_id: user.id,
          dog_id: data.dogId,
          client_id: data.clientId,
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          reason: data.reason || 'VACANCES_CLIENT',
          notes: data.notes,
          is_processed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return vacation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacation_periods"] });
      toast({
        title: "Vacances enregistrées",
        description: "La période de vacances a été ajoutée.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les vacances.",
        variant: "destructive",
      });
      console.error("Error creating vacation:", error);
    },
  });
}

/**
 * Met à jour un reschedule (confirmation)
 */
export function useConfirmReschedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      absenceId: string;
      newGroupId: string;
      newDate: Date;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Mettre à jour l'absence
      const { error: updateError } = await supabase
        .from("absence_records")
        .update({
          rescheduled_group_id: data.newGroupId,
          rescheduled_date: data.newDate.toISOString().split('T')[0],
          rescheduled_confirmed: true,
        })
        .eq("id", data.absenceId);

      if (updateError) throw updateError;

      // Récupérer les infos de l'absence
      const { data: absence, error: fetchError } = await supabase
        .from("absence_records")
        .select("dog_id, original_year, original_week_number")
        .eq("id", data.absenceId)
        .single();

      if (fetchError) throw fetchError;

      // Créer la nouvelle assignation
      const newYear = data.newDate.getFullYear();
      const newWeek = getISOWeekNumber(data.newDate);

      const { error: assignError } = await supabase
        .from("group_assignments")
        .insert({
          user_id: user.id,
          animal_id: absence.dog_id,
          group_id: data.newGroupId,
          year: newYear,
          week_number: newWeek,
          is_confirmed: true,
          notes: "Report de balade",
        });

      if (assignError) throw assignError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["group_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });
      toast({
        title: "Report confirmé",
        description: "La balade a été reprogrammée.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de confirmer le report.",
        variant: "destructive",
      });
      console.error("Error confirming reschedule:", error);
    },
  });
}

/**
 * Supprime une absence
 */
export function useDeleteAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (absenceId: string) => {
      const { error } = await supabase
        .from("absence_records")
        .delete()
        .eq("id", absenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_absences"] });
      toast({
        title: "Absence supprimée",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'absence.",
        variant: "destructive",
      });
      console.error("Error deleting absence:", error);
    },
  });
}

/**
 * Supprime une période de vacances
 */
export function useDeleteVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vacationId: string) => {
      const { error } = await supabase
        .from("vacation_periods")
        .delete()
        .eq("id", vacationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacation_periods"] });
      toast({
        title: "Vacances supprimées",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les vacances.",
        variant: "destructive",
      });
      console.error("Error deleting vacation:", error);
    },
  });
}
