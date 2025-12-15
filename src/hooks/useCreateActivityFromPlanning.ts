/**
 * Hook pour convertir un assignment complété en activité
 * Workflow automatique : Planning -> Activité
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { GroupAssignmentWithAnimal, WalkType, BLOCK_SCHEDULES, TimeBlock } from "@/lib/planningTypes";
import { getMondayOfWeek } from "@/lib/planningTypes";
import { format, addDays } from "date-fns";

// Map walk types to service types
const WALK_TYPE_TO_SERVICE: Record<WalkType, "individual_walk" | "group_walk" | "custom_walk"> = {
  COLLECTIVE: "group_walk",
  INDIVIDUELLE: "individual_walk",
  CANIRANDO: "custom_walk",
  SUR_MESURE: "custom_walk",
};

// Map days to index
const DAY_INDEX: Record<string, number> = {
  lundi: 0,
  mardi: 1,
  mercredi: 2,
  jeudi: 3,
  vendredi: 4,
};

interface CreateActivityFromAssignmentParams {
  assignment: GroupAssignmentWithAnimal;
  walkType: WalkType;
  groupDay: string;
  groupBlock: TimeBlock;
  year: number;
  weekNumber: number;
}

export function useCreateActivityFromAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      assignment,
      walkType,
      groupDay,
      groupBlock,
      year,
      weekNumber,
    }: CreateActivityFromAssignmentParams) => {
      if (!user) throw new Error("User not authenticated");

      // Get the client_id from the animal
      const { data: animal, error: animalError } = await supabase
        .from("animals")
        .select("client_id")
        .eq("id", assignment.animal_id)
        .single();

      if (animalError) throw animalError;

      // Calculate the actual date
      const monday = getMondayOfWeek(year, weekNumber);
      const dayIndex = DAY_INDEX[groupDay] ?? 0;
      const activityDate = addDays(monday, dayIndex);
      const formattedDate = format(activityDate, "yyyy-MM-dd");

      // Get the schedule for timing
      const schedule = BLOCK_SCHEDULES[groupBlock];
      const startTime = schedule.walk.split("-")[0]; // Get start of walk time

      // Determine service type and pricing
      const serviceType = WALK_TYPE_TO_SERVICE[walkType];
      const unitPrice = walkType === "INDIVIDUELLE" ? 50 : walkType === "CANIRANDO" ? 70 : 30;
      const duration = walkType === "CANIRANDO" ? 180 : 60;

      // Create the activity
      const { data: activity, error } = await supabase
        .from("activities")
        .insert({
          user_id: user.id,
          client_id: animal.client_id,
          animal_id: assignment.animal_id,
          service_type: serviceType,
          scheduled_date: formattedDate,
          scheduled_time: startTime,
          duration_minutes: duration,
          unit_price: unitPrice,
          quantity: 1,
          status: "done",
          notes: `Balade automatique depuis planning - ${groupDay} ${groupBlock}`,
        })
        .select()
        .single();

      if (error) throw error;
      return activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      toast({
        title: "Activité créée",
        description: "Une activité a été automatiquement générée depuis le planning.",
      });
    },
    onError: (error) => {
      console.error("Error creating activity from assignment:", error);
      // Don't show error toast - activity creation is optional
    },
  });
}
