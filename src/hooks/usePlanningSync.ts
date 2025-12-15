/**
 * =====================================================
 * HOOK: SYNCHRONISATION PLANNING -> COMPTABILITÉ
 * =====================================================
 * 
 * Ce hook assure la synchronisation critique entre :
 * - Les affectations du planning (group_assignments)
 * - Les activités facturables (activities)
 * - La facturation (invoices)
 * 
 * WORKFLOW AUTOMATIQUE :
 * 1. Quand une balade est marquée "effectuée" dans le planning
 * 2. Une activité est automatiquement créée avec le bon prix
 * 3. L'activité est liée au client pour facturation future
 * 
 * GARANTIES :
 * - Aucune balade effectuée ne peut être oubliée
 * - Cohérence des prix entre planning et facturation
 * - Traçabilité complète (lien assignment -> activity)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { 
  WalkType, 
  TimeBlock, 
  WorkDay,
  BLOCK_SCHEDULES,
  getMondayOfWeek,
} from "@/lib/planningTypes";
import { DEFAULT_PRICES, ACTIVITY_DURATIONS } from "@/lib/business-rules";

// =====================================================
// TYPES
// =====================================================

interface SyncResult {
  success: boolean;
  activityId?: string;
  error?: string;
}

interface BatchSyncResult {
  total: number;
  success: number;
  failed: number;
  activities: string[];
  errors: string[];
}

// Mapping walk type -> service type
const WALK_TYPE_TO_SERVICE: Record<WalkType, string> = {
  COLLECTIVE: "group_walk",
  INDIVIDUELLE: "individual_walk",
  CANIRANDO: "custom_walk",
  SUR_MESURE: "custom_walk",
};

// Mapping jour -> index
const DAY_INDEX: Record<WorkDay, number> = {
  lundi: 0,
  mardi: 1,
  mercredi: 2,
  jeudi: 3,
  vendredi: 4,
};

// =====================================================
// HOOKS
// =====================================================

/**
 * Synchronise une balade complétée vers une activité
 */
export function useSyncAssignmentToActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      assignmentId: string;
      dogId: string;
      groupId: string;
      groupDay: WorkDay;
      groupBlock: TimeBlock;
      walkType: WalkType;
      year: number;
      weekNumber: number;
      customPrice?: number;
    }): Promise<SyncResult> => {
      if (!user) throw new Error("User not authenticated");

      const { 
        assignmentId, 
        dogId, 
        groupId, 
        groupDay, 
        groupBlock, 
        walkType, 
        year, 
        weekNumber,
        customPrice 
      } = params;

      try {
        // 1. Récupérer les infos du chien et client
        const { data: animal, error: animalError } = await supabase
          .from("animals")
          .select("id, name, client_id, clients(first_name, last_name)")
          .eq("id", dogId)
          .single();

        if (animalError) throw animalError;

        // 2. Calculer la date exacte
        const monday = getMondayOfWeek(year, weekNumber);
        const dayIndex = DAY_INDEX[groupDay];
        const activityDate = addDays(monday, dayIndex);
        const formattedDate = format(activityDate, "yyyy-MM-dd");

        // 3. Récupérer l'heure du bloc
        const schedule = BLOCK_SCHEDULES[groupBlock];
        const startTime = schedule.walk.split("-")[0];

        // 4. Déterminer le prix et la durée
        const serviceType = WALK_TYPE_TO_SERVICE[walkType];
        const unitPrice = customPrice ?? DEFAULT_PRICES[walkType];
        const durationMinutes = ACTIVITY_DURATIONS[walkType];

        // 5. Vérifier si une activité existe déjà pour cette date/chien
        const { data: existing } = await supabase
          .from("activities")
          .select("id")
          .eq("animal_id", dogId)
          .eq("scheduled_date", formattedDate)
          .eq("scheduled_time", startTime)
          .maybeSingle();

        if (existing) {
          return {
            success: true,
            activityId: existing.id,
            error: "Activité déjà existante",
          };
        }

        // 6. Créer l'activité
        const { data: activity, error: activityError } = await supabase
          .from("activities")
          .insert({
            user_id: user.id,
            client_id: animal.client_id,
            animal_id: dogId,
            service_type: serviceType,
            scheduled_date: formattedDate,
            scheduled_time: startTime,
            duration_minutes: durationMinutes,
            unit_price: unitPrice,
            quantity: 1,
            status: "done",
            notes: `Synchronisé depuis planning - ${groupId} - ${animal.name}`,
          })
          .select()
          .single();

        if (activityError) throw activityError;

        // 7. Marquer l'assignment comme complété
        await supabase
          .from("group_assignments")
          .update({ is_completed: true })
          .eq("id", assignmentId);

        return {
          success: true,
          activityId: activity.id,
        };
      } catch (error) {
        console.error("Sync error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      queryClient.invalidateQueries({ queryKey: ["group_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });

      if (result.success) {
        toast({
          title: "Balade synchronisée",
          description: "L'activité a été créée pour facturation.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de créer l'activité.",
        variant: "destructive",
      });
      console.error("Error syncing assignment:", error);
    },
  });
}

/**
 * Synchronise toutes les balades d'une semaine (batch)
 */
export function useBatchSyncWeek() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      year: number;
      weekNumber: number;
      onlyCompleted?: boolean;
    }): Promise<BatchSyncResult> => {
      if (!user) throw new Error("User not authenticated");

      const { year, weekNumber, onlyCompleted = true } = params;

      // 1. Récupérer toutes les assignations de la semaine
      let query = supabase
        .from("group_assignments")
        .select(`
          id,
          animal_id,
          group_id,
          is_completed,
          walk_groups (
            id,
            day,
            block
          )
        `)
        .eq("year", year)
        .eq("week_number", weekNumber);

      if (onlyCompleted) {
        query = query.eq("is_completed", true);
      }

      const { data: assignments, error: assignmentsError } = await query;
      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        return {
          total: 0,
          success: 0,
          failed: 0,
          activities: [],
          errors: [],
        };
      }

      // 2. Récupérer les schedules pour connaître le type
      const { data: schedules } = await supabase
        .from("weekly_schedules")
        .select("group_id, walk_type")
        .eq("year", year)
        .eq("week_number", weekNumber);

      const scheduleMap = new Map(schedules?.map(s => [s.group_id, s.walk_type as WalkType]) || []);

      const results: BatchSyncResult = {
        total: assignments.length,
        success: 0,
        failed: 0,
        activities: [],
        errors: [],
      };

      // 3. Synchroniser chaque assignation
      for (const assignment of assignments) {
        const group = assignment.walk_groups as any;
        const walkType = scheduleMap.get(assignment.group_id) || "COLLECTIVE";

        try {
          // Récupérer les infos du chien
          const { data: animal } = await supabase
            .from("animals")
            .select("id, name, client_id")
            .eq("id", assignment.animal_id)
            .single();

          if (!animal) {
            results.failed++;
            results.errors.push(`Chien introuvable: ${assignment.animal_id}`);
            continue;
          }

          // Calculer la date
          const monday = getMondayOfWeek(year, weekNumber);
          const dayIndex = DAY_INDEX[group.day as WorkDay];
          const activityDate = addDays(monday, dayIndex);
          const formattedDate = format(activityDate, "yyyy-MM-dd");
          const startTime = BLOCK_SCHEDULES[group.block as TimeBlock].walk.split("-")[0];

          // Vérifier si l'activité existe
          const { data: existing } = await supabase
            .from("activities")
            .select("id")
            .eq("animal_id", assignment.animal_id)
            .eq("scheduled_date", formattedDate)
            .eq("scheduled_time", startTime)
            .maybeSingle();

          if (existing) {
            results.success++;
            results.activities.push(existing.id);
            continue;
          }

          // Créer l'activité
          const { data: activity, error } = await supabase
            .from("activities")
            .insert({
              user_id: user.id,
              client_id: animal.client_id,
              animal_id: animal.id,
              service_type: WALK_TYPE_TO_SERVICE[walkType],
              scheduled_date: formattedDate,
              scheduled_time: startTime,
              duration_minutes: ACTIVITY_DURATIONS[walkType],
              unit_price: DEFAULT_PRICES[walkType],
              quantity: 1,
              status: "done",
              notes: `Batch sync semaine ${weekNumber}/${year}`,
            })
            .select()
            .single();

          if (error) {
            results.failed++;
            results.errors.push(`${animal.name}: ${error.message}`);
          } else {
            results.success++;
            results.activities.push(activity.id);
          }
        } catch (err) {
          results.failed++;
          results.errors.push(err instanceof Error ? err.message : "Erreur inconnue");
        }
      }

      return results;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });

      toast({
        title: "Synchronisation terminée",
        description: `${result.success}/${result.total} balades synchronisées`,
        variant: result.failed > 0 ? "destructive" : "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser la semaine.",
        variant: "destructive",
      });
      console.error("Batch sync error:", error);
    },
  });
}

/**
 * Marque une balade comme effectuée et synchronise
 */
export function useCompleteAndSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const syncMutation = useSyncAssignmentToActivity();

  return useMutation({
    mutationFn: async (params: {
      assignmentId: string;
      dogId: string;
      groupId: string;
      groupDay: WorkDay;
      groupBlock: TimeBlock;
      walkType: WalkType;
      year: number;
      weekNumber: number;
      autoCreateActivity?: boolean;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { autoCreateActivity = true, ...rest } = params;

      // 1. Marquer comme complété
      const { error: updateError } = await supabase
        .from("group_assignments")
        .update({ is_completed: true })
        .eq("id", params.assignmentId);

      if (updateError) throw updateError;

      // 2. Créer l'activité si demandé
      if (autoCreateActivity) {
        return syncMutation.mutateAsync(rest);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });
    },
  });
}

/**
 * Vérifie s'il y a des balades non synchronisées
 */
export function useUnsyncedAssignments(year: number, weekNumber: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unsynced_assignments", year, weekNumber],
    queryFn: async () => {
      // Récupérer les assignations complétées
      const { data: assignments } = await supabase
        .from("group_assignments")
        .select(`
          id,
          animal_id,
          group_id,
          walk_groups (day, block)
        `)
        .eq("year", year)
        .eq("week_number", weekNumber)
        .eq("is_completed", true);

      if (!assignments || assignments.length === 0) return [];

      const monday = getMondayOfWeek(year, weekNumber);

      // Vérifier chaque assignation
      const unsynced = [];

      for (const assignment of assignments) {
        const group = assignment.walk_groups as any;
        const dayIndex = DAY_INDEX[group.day as WorkDay];
        const activityDate = addDays(monday, dayIndex);
        const formattedDate = format(activityDate, "yyyy-MM-dd");
        const startTime = BLOCK_SCHEDULES[group.block as TimeBlock].walk.split("-")[0];

        const { data: existing } = await supabase
          .from("activities")
          .select("id")
          .eq("animal_id", assignment.animal_id)
          .eq("scheduled_date", formattedDate)
          .eq("scheduled_time", startTime)
          .maybeSingle();

        if (!existing) {
          unsynced.push(assignment);
        }
      }

      return unsynced;
    },
    enabled: !!user,
  });
}

// Helper pour le query
import { useQuery } from "@tanstack/react-query";
