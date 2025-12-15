/**
 * =====================================================
 * STATISTIQUES PLANNING
 * =====================================================
 * 
 * Hook pour récupérer les statistiques du planning
 * pour affichage dans le dashboard et ailleurs.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getISOWeekNumber } from "@/lib/planningTypes";

export interface PlanningStats {
  totalDogsThisWeek: number;
  completedWalksThisWeek: number;
  pendingWalksThisWeek: number;
  routinesConfigured: number;
  capacityUsagePercent: number;
  walksByDay: Record<string, number>;
}

export function usePlanningStats() {
  const { user } = useAuth();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeek = getISOWeekNumber(today);

  return useQuery({
    queryKey: ["planning_stats", currentYear, currentWeek],
    queryFn: async (): Promise<PlanningStats> => {
      // Fetch assignments for this week
      const { data: assignments, error: assignError } = await supabase
        .from("group_assignments")
        .select("*, animals(name)")
        .eq("year", currentYear)
        .eq("week_number", currentWeek);

      if (assignError) throw assignError;

      // Fetch routines
      const { data: routines, error: routineError } = await supabase
        .from("dog_routines")
        .select("id")
        .eq("is_active", true);

      if (routineError) throw routineError;

      // Fetch walk groups for capacity calculation
      const { data: groups, error: groupError } = await supabase
        .from("walk_groups")
        .select("id, default_capacity");

      if (groupError) throw groupError;

      // Calculate stats
      const totalDogsThisWeek = assignments?.length || 0;
      const completedWalksThisWeek = assignments?.filter(a => a.is_completed).length || 0;
      const pendingWalksThisWeek = assignments?.filter(a => !a.is_completed).length || 0;
      const routinesConfigured = routines?.length || 0;
      
      // Capacity: 15 groups × 4 dogs = 60 max per week
      const totalCapacity = (groups?.reduce((sum, g) => sum + (g.default_capacity || 4), 0) || 60);
      const capacityUsagePercent = totalCapacity > 0 
        ? Math.round((totalDogsThisWeek / totalCapacity) * 100) 
        : 0;

      // Walks by day (simplified - would need group data for accuracy)
      const walksByDay: Record<string, number> = {
        lundi: 0,
        mardi: 0,
        mercredi: 0,
        jeudi: 0,
        vendredi: 0,
      };

      // Get group info to map assignments to days
      const { data: groupsWithDay } = await supabase
        .from("walk_groups")
        .select("id, day");

      if (groupsWithDay && assignments) {
        for (const assignment of assignments) {
          const group = groupsWithDay.find(g => g.id === assignment.group_id);
          if (group && walksByDay[group.day] !== undefined) {
            walksByDay[group.day]++;
          }
        }
      }

      return {
        totalDogsThisWeek,
        completedWalksThisWeek,
        pendingWalksThisWeek,
        routinesConfigured,
        capacityUsagePercent,
        walksByDay,
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
}
