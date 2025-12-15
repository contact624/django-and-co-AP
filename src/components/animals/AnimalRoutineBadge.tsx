/**
 * Composant Badge Routine pour afficher sur la carte Animal
 */

import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { useDogRoutine } from "@/hooks/usePlanning";
import { ROUTINE_LABELS, RoutineType } from "@/lib/planningTypes";

interface AnimalRoutineBadgeProps {
  animalId: string;
}

export function AnimalRoutineBadge({ animalId }: AnimalRoutineBadgeProps) {
  const { data: routine, isLoading } = useDogRoutine(animalId);

  if (isLoading) {
    return null;
  }

  if (!routine) {
    return (
      <Link to="/planning" className="inline-block">
        <Badge 
          variant="outline" 
          className="text-xs cursor-pointer hover:bg-primary/10 transition-colors border-dashed"
        >
          <CalendarDays className="h-3 w-3 mr-1" />
          Configurer routine
        </Badge>
      </Link>
    );
  }

  return (
    <Link to="/planning" className="inline-block">
      <Badge 
        variant="secondary" 
        className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
      >
        <CalendarDays className="h-3 w-3 mr-1" />
        {ROUTINE_LABELS[routine.routine_type as RoutineType]}
      </Badge>
    </Link>
  );
}
