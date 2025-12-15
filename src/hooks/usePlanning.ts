/**
 * =====================================================
 * HOOKS PLANIFICATION - DJANGO & CO
 * =====================================================
 * 
 * Hooks React Query pour la gestion du planning hebdomadaire.
 * Inclut la logique d'affectation automatique des chiens.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  WalkGroup,
  WeeklySchedule,
  DogRoutine,
  GroupAssignment,
  GroupAssignmentWithAnimal,
  DogRoutineWithAnimal,
  WeeklyGroupView,
  WalkType,
  WorkDay,
  TimeBlock,
  GeographicSector,
  RoutineType,
  TimePreference,
  WORK_DAYS,
  TIME_BLOCKS,
  BLOCK_SCHEDULES,
  generateGroupId,
  getRequiredGroupCount,
  blockMatchesPreference,
  DEFAULT_CAPACITIES,
} from "@/lib/planningTypes";

// =====================================================
// WALK GROUPS (Templates)
// =====================================================

export function useWalkGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["walk_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("walk_groups")
        .select("*")
        .order("day", { ascending: true });

      if (error) throw error;
      return data as WalkGroup[];
    },
    enabled: !!user,
  });
}

export function useInitializeWalkGroups() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Vérifier si les groupes existent déjà
      const { data: existing } = await supabase
        .from("walk_groups")
        .select("id")
        .limit(1);

      if (existing && existing.length > 0) {
        return { message: "Groups already initialized" };
      }

      // Créer les 15 groupes
      const groups: Omit<WalkGroup, 'created_at' | 'updated_at'>[] = [];

      for (const day of WORK_DAYS) {
        for (const block of TIME_BLOCKS) {
          const schedule = BLOCK_SCHEDULES[block];
          groups.push({
            id: generateGroupId(day, block),
            user_id: user.id,
            day,
            block,
            start_time: schedule.start,
            end_time: schedule.end,
            pickup_duration_minutes: 30,
            walk_duration_minutes: 60,
            return_duration_minutes: 30,
            default_sector: null,
            default_capacity: 4,
            notes: null,
          });
        }
      }

      const { error } = await supabase.from("walk_groups").insert(groups);
      if (error) throw error;

      return { message: "15 groups created successfully" };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walk_groups"] });
      toast({
        title: "Groupes initialisés",
        description: "Les 15 créneaux hebdomadaires ont été créés.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'initialiser les groupes.",
        variant: "destructive",
      });
      console.error("Error initializing groups:", error);
    },
  });
}

// =====================================================
// WEEKLY SCHEDULES
// =====================================================

export function useWeeklySchedules(year: number, weekNumber: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weekly_schedules", year, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("year", year)
        .eq("week_number", weekNumber);

      if (error) throw error;
      return data as WeeklySchedule[];
    },
    enabled: !!user,
  });
}

export function useUpdateWeeklySchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      group_id: string;
      year: number;
      week_number: number;
      walk_type?: WalkType;
      sector?: GeographicSector | null;
      capacity?: number;
      is_blocked?: boolean;
      block_reason?: string | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("weekly_schedules")
        .select("id")
        .eq("group_id", data.group_id)
        .eq("year", data.year)
        .eq("week_number", data.week_number)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("weekly_schedules")
          .update({
            walk_type: data.walk_type,
            sector: data.sector,
            capacity: data.capacity,
            is_blocked: data.is_blocked,
            block_reason: data.block_reason,
            notes: data.notes,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("weekly_schedules").insert({
          user_id: user.id,
          group_id: data.group_id,
          year: data.year,
          week_number: data.week_number,
          walk_type: data.walk_type || 'COLLECTIVE',
          sector: data.sector,
          capacity: data.capacity || 4,
          is_blocked: data.is_blocked || false,
          block_reason: data.block_reason,
          notes: data.notes,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["weekly_schedules", variables.year, variables.week_number] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });
      toast({
        title: "Planning mis à jour",
        description: "Le créneau a été modifié.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le créneau.",
        variant: "destructive",
      });
      console.error("Error updating schedule:", error);
    },
  });
}

// =====================================================
// DOG ROUTINES
// =====================================================

export function useDogRoutines() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dog_routines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dog_routines")
        .select(`
          *,
          animals (
            id,
            name,
            species,
            breed,
            clients (
              first_name,
              last_name,
              address
            )
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DogRoutineWithAnimal[];
    },
    enabled: !!user,
  });
}

export function useDogRoutine(animalId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dog_routine", animalId],
    queryFn: async () => {
      if (!animalId) return null;
      
      const { data, error } = await supabase
        .from("dog_routines")
        .select(`
          *,
          animals (
            id,
            name,
            species,
            breed,
            clients (
              first_name,
              last_name,
              address
            )
          )
        `)
        .eq("animal_id", animalId)
        .maybeSingle();

      if (error) throw error;
      return data as DogRoutineWithAnimal | null;
    },
    enabled: !!user && !!animalId,
  });
}

export function useCreateDogRoutine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      animal_id: string;
      routine_type: RoutineType;
      sector?: GeographicSector | null;
      time_preference?: TimePreference;
      preferred_days?: WorkDay[];
      walk_type_preference?: WalkType;
      behavior_notes?: string | null;
      special_requirements?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: routine, error } = await supabase
        .from("dog_routines")
        .insert({
          user_id: user.id,
          animal_id: data.animal_id,
          routine_type: data.routine_type,
          sector: data.sector || null,
          time_preference: data.time_preference || 'INDIFFERENT',
          preferred_days: data.preferred_days || [],
          walk_type_preference: data.walk_type_preference || 'COLLECTIVE',
          behavior_notes: data.behavior_notes || null,
          special_requirements: data.special_requirements || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return routine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dog_routines"] });
      queryClient.invalidateQueries({ queryKey: ["dog_routine"] });
      toast({
        title: "Routine créée",
        description: "La routine du chien a été configurée.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la routine.",
        variant: "destructive",
      });
      console.error("Error creating routine:", error);
    },
  });
}

export function useUpdateDogRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DogRoutine> & { id: string }) => {
      const { error } = await supabase
        .from("dog_routines")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dog_routines"] });
      queryClient.invalidateQueries({ queryKey: ["dog_routine"] });
      toast({
        title: "Routine mise à jour",
        description: "Les préférences ont été modifiées.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la routine.",
        variant: "destructive",
      });
      console.error("Error updating routine:", error);
    },
  });
}

// =====================================================
// GROUP ASSIGNMENTS
// =====================================================

export function useGroupAssignments(year: number, weekNumber: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["group_assignments", year, weekNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_assignments")
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
        .eq("year", year)
        .eq("week_number", weekNumber);

      if (error) throw error;
      return data as GroupAssignmentWithAnimal[];
    },
    enabled: !!user,
  });
}

export function useAssignDogToGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      animal_id: string;
      group_id: string;
      year: number;
      week_number: number;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("group_assignments").insert({
        user_id: user.id,
        animal_id: data.animal_id,
        group_id: data.group_id,
        year: data.year,
        week_number: data.week_number,
        notes: data.notes || null,
        is_confirmed: true,
        is_completed: false,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group_assignments", variables.year, variables.week_number] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });
      toast({
        title: "Chien affecté",
        description: "Le chien a été ajouté au groupe.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'affecter le chien.",
        variant: "destructive",
      });
      console.error("Error assigning dog:", error);
    },
  });
}

export function useRemoveDogFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("group_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });
      toast({
        title: "Chien retiré",
        description: "Le chien a été retiré du groupe.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le chien.",
        variant: "destructive",
      });
      console.error("Error removing dog:", error);
    },
  });
}

export function useMarkAssignmentCompleted() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("group_assignments")
        .update({ is_completed })
        .eq("id", id);

      if (error) throw error;
      return { id, is_completed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["group_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning"] });
      // Invalider aussi les activités pour synchroniser
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast({
        title: result.is_completed ? "Balade effectuée" : "Statut mis à jour",
        description: result.is_completed 
          ? "La balade a été marquée comme effectuée." 
          : "Le statut a été réinitialisé.",
      });
    },
  });
}

// =====================================================
// WEEKLY PLANNING VIEW (Combined Data)
// =====================================================

export function useWeeklyPlanning(year: number, weekNumber: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weekly_planning", year, weekNumber],
    queryFn: async () => {
      // Fetch all data in parallel
      const [groupsRes, schedulesRes, assignmentsRes] = await Promise.all([
        supabase.from("walk_groups").select("*"),
        supabase
          .from("weekly_schedules")
          .select("*")
          .eq("year", year)
          .eq("week_number", weekNumber),
        supabase
          .from("group_assignments")
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
          .eq("year", year)
          .eq("week_number", weekNumber),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      const groups = groupsRes.data as WalkGroup[];
      const schedules = schedulesRes.data as WeeklySchedule[];
      const assignments = assignmentsRes.data as GroupAssignmentWithAnimal[];

      // Build the weekly view
      const weeklyView: Record<string, WeeklyGroupView> = {};

      for (const group of groups) {
        const schedule = schedules.find(s => s.group_id === group.id) || null;
        const groupAssignments = assignments.filter(a => a.group_id === group.id);
        
        const effectiveType = schedule?.walk_type || 'COLLECTIVE';
        const effectiveCapacity = schedule?.capacity || group.default_capacity;
        const effectiveSector = schedule?.sector || group.default_sector;
        const isBlocked = schedule?.is_blocked || false;

        weeklyView[group.id] = {
          group,
          schedule,
          assignments: groupAssignments,
          effectiveType,
          effectiveCapacity,
          effectiveSector,
          currentCount: groupAssignments.length,
          availableSlots: effectiveCapacity - groupAssignments.length,
          isBlocked,
        };
      }

      return weeklyView;
    },
    enabled: !!user,
  });
}

// =====================================================
// LOGIQUE D'AFFECTATION AUTOMATIQUE
// =====================================================

/**
 * Pseudo-code de l'algorithme d'affectation :
 * 
 * 1. Récupérer la routine du chien (secteur, préférences jours/créneaux, type de routine)
 * 2. Calculer le nombre de groupes requis (R1=1, R2=2, R3=3)
 * 3. Filtrer les groupes disponibles :
 *    - Même secteur OU secteur non défini
 *    - Jour correspondant aux préférences (ou tous si indifférent)
 *    - Créneau correspondant à la préférence horaire
 *    - Type = COLLECTIVE
 *    - Capacité non atteinte
 *    - Non bloqué
 * 4. Sélectionner N groupes espacés dans la semaine
 * 5. Créer les affectations
 */

export interface AutoAssignResult {
  success: boolean;
  assignedGroups: string[];
  message: string;
  fallbackOptions?: string[];
}

export function useAutoAssignDog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      animal_id: string;
      year: number;
      week_number: number;
    }): Promise<AutoAssignResult> => {
      if (!user) throw new Error("User not authenticated");

      // 1. Récupérer la routine du chien
      const { data: routine, error: routineError } = await supabase
        .from("dog_routines")
        .select("*")
        .eq("animal_id", data.animal_id)
        .maybeSingle();

      if (routineError) throw routineError;
      if (!routine) {
        return {
          success: false,
          assignedGroups: [],
          message: "Aucune routine configurée pour ce chien. Veuillez d'abord définir sa routine.",
        };
      }

      // 2. Calculer le nombre de groupes requis
      const requiredCount = getRequiredGroupCount(routine.routine_type as RoutineType);
      if (requiredCount === 0) {
        return {
          success: false,
          assignedGroups: [],
          message: "Ce chien est en mode ponctuel. Affectez-le manuellement à un créneau.",
        };
      }

      // 3. Récupérer le planning actuel
      const [groupsRes, schedulesRes, assignmentsRes] = await Promise.all([
        supabase.from("walk_groups").select("*"),
        supabase
          .from("weekly_schedules")
          .select("*")
          .eq("year", data.year)
          .eq("week_number", data.week_number),
        supabase
          .from("group_assignments")
          .select("*")
          .eq("year", data.year)
          .eq("week_number", data.week_number),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      const groups = groupsRes.data as WalkGroup[];
      const schedules = schedulesRes.data as WeeklySchedule[];
      const assignments = assignmentsRes.data as GroupAssignment[];

      // 4. Filtrer les groupes disponibles
      const availableGroups: { group: WalkGroup; score: number }[] = [];

      for (const group of groups) {
        const schedule = schedules.find(s => s.group_id === group.id);
        const groupAssignments = assignments.filter(a => a.group_id === group.id);
        
        // Vérifier si bloqué
        if (schedule?.is_blocked) continue;

        // Vérifier le type
        const effectiveType = schedule?.walk_type || 'COLLECTIVE';
        if (effectiveType !== 'COLLECTIVE') continue;

        // Vérifier la capacité
        const effectiveCapacity = schedule?.capacity || group.default_capacity;
        if (groupAssignments.length >= effectiveCapacity) continue;

        // Vérifier si déjà assigné
        if (groupAssignments.some(a => a.animal_id === data.animal_id)) continue;

        // Score basé sur les préférences
        let score = 0;

        // Secteur
        const effectiveSector = schedule?.sector || group.default_sector;
        if (effectiveSector === routine.sector) {
          score += 10;
        } else if (!routine.sector || !effectiveSector) {
          score += 5;
        }

        // Jour préféré
        const preferredDays = routine.preferred_days as WorkDay[] || [];
        if (preferredDays.length === 0 || preferredDays.includes(group.day)) {
          score += 5;
        } else {
          score -= 2;
        }

        // Créneau préféré
        if (blockMatchesPreference(group.block, routine.time_preference as TimePreference)) {
          score += 3;
        }

        availableGroups.push({ group, score });
      }

      if (availableGroups.length === 0) {
        return {
          success: false,
          assignedGroups: [],
          message: "Aucun créneau disponible correspondant aux critères.",
        };
      }

      // 5. Sélectionner les groupes (espacés dans la semaine)
      availableGroups.sort((a, b) => b.score - a.score);

      const selectedGroups: WalkGroup[] = [];
      const usedDays = new Set<WorkDay>();

      // D'abord, essayer de prendre un groupe par jour différent
      for (const { group } of availableGroups) {
        if (selectedGroups.length >= requiredCount) break;
        if (!usedDays.has(group.day)) {
          selectedGroups.push(group);
          usedDays.add(group.day);
        }
      }

      // Si pas assez, compléter avec les meilleurs scores restants
      if (selectedGroups.length < requiredCount) {
        for (const { group } of availableGroups) {
          if (selectedGroups.length >= requiredCount) break;
          if (!selectedGroups.includes(group)) {
            selectedGroups.push(group);
          }
        }
      }

      if (selectedGroups.length < requiredCount) {
        return {
          success: false,
          assignedGroups: [],
          message: `Seulement ${selectedGroups.length} créneaux disponibles sur ${requiredCount} requis.`,
          fallbackOptions: selectedGroups.map(g => g.id),
        };
      }

      // 6. Créer les affectations
      const newAssignments = selectedGroups.map(group => ({
        user_id: user.id,
        animal_id: data.animal_id,
        group_id: group.id,
        year: data.year,
        week_number: data.week_number,
        is_confirmed: true,
        is_completed: false,
        notes: null,
      }));

      const { error: insertError } = await supabase
        .from("group_assignments")
        .insert(newAssignments);

      if (insertError) throw insertError;

      return {
        success: true,
        assignedGroups: selectedGroups.map(g => g.id),
        message: `${selectedGroups.length} créneaux attribués avec succès.`,
      };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["group_assignments", variables.year, variables.week_number] });
        queryClient.invalidateQueries({ queryKey: ["weekly_planning", variables.year, variables.week_number] });
        toast({
          title: "Affectation réussie",
          description: result.message,
        });
      } else {
        toast({
          title: "Affectation partielle",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'affecter automatiquement le chien.",
        variant: "destructive",
      });
      console.error("Error auto-assigning dog:", error);
    },
  });
}

// =====================================================
// BALADE INDIVIDUELLE
// =====================================================

export function useBookIndividualWalk() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      animal_id: string;
      group_id: string;
      year: number;
      week_number: number;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // 1. Mettre le groupe en mode individuel
      const { data: existing } = await supabase
        .from("weekly_schedules")
        .select("id")
        .eq("group_id", data.group_id)
        .eq("year", data.year)
        .eq("week_number", data.week_number)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("weekly_schedules")
          .update({
            walk_type: 'INDIVIDUELLE',
            capacity: 1,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("weekly_schedules").insert({
          user_id: user.id,
          group_id: data.group_id,
          year: data.year,
          week_number: data.week_number,
          walk_type: 'INDIVIDUELLE',
          capacity: 1,
        });
      }

      // 2. Supprimer les affectations existantes
      await supabase
        .from("group_assignments")
        .delete()
        .eq("group_id", data.group_id)
        .eq("year", data.year)
        .eq("week_number", data.week_number);

      // 3. Affecter le chien
      const { error } = await supabase.from("group_assignments").insert({
        user_id: user.id,
        animal_id: data.animal_id,
        group_id: data.group_id,
        year: data.year,
        week_number: data.week_number,
        is_confirmed: true,
        is_completed: false,
        notes: "Balade individuelle",
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["weekly_schedules", variables.year, variables.week_number] });
      queryClient.invalidateQueries({ queryKey: ["group_assignments", variables.year, variables.week_number] });
      queryClient.invalidateQueries({ queryKey: ["weekly_planning", variables.year, variables.week_number] });
      toast({
        title: "Balade individuelle réservée",
        description: "Le créneau a été converti en balade individuelle.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de réserver la balade individuelle.",
        variant: "destructive",
      });
      console.error("Error booking individual walk:", error);
    },
  });
}

// =====================================================
// CANI-RANDO
// =====================================================

export function useCanirandoEvents(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["canirando_events", startDate, endDate],
    queryFn: async () => {
      let query = supabase.from("canirando_events").select(`
        *,
        canirando_participants (
          *,
          animals (
            id,
            name,
            clients (
              first_name,
              last_name
            )
          )
        )
      `);

      if (startDate) {
        query = query.gte("event_date", startDate);
      }
      if (endDate) {
        query = query.lte("event_date", endDate);
      }

      const { data, error } = await query.order("event_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useBookCaniRando() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      animal_ids: string[];
      event_date: string;
      day: WorkDay;
      start_block: TimeBlock;
      location?: string;
      description?: string;
      price_per_dog?: number;
    }) => {
      if (!user) throw new Error("User not authenticated");
      if (data.start_block === 'B3') throw new Error("Cannot start Cani-Rando at B3");

      // 1. Créer l'événement
      const { data: event, error: eventError } = await supabase
        .from("canirando_events")
        .insert({
          user_id: user.id,
          event_date: data.event_date,
          day: data.day,
          start_block: data.start_block,
          duration_hours: 3,
          capacity: 3,
          location: data.location || null,
          description: data.description || null,
          price_per_dog: data.price_per_dog || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Ajouter les participants
      const participants = data.animal_ids.map(animal_id => ({
        user_id: user.id,
        canirando_id: event.id,
        animal_id,
        is_confirmed: true,
      }));

      const { error: participantsError } = await supabase
        .from("canirando_participants")
        .insert(participants);

      if (participantsError) throw participantsError;

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canirando_events"] });
      toast({
        title: "Cani-Rando créée",
        description: "L'événement a été créé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la Cani-Rando.",
        variant: "destructive",
      });
      console.error("Error booking cani-rando:", error);
    },
  });
}
