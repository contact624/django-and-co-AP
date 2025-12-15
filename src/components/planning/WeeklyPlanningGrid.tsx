/**
 * =====================================================
 * GRILLE PLANNING HEBDOMADAIRE
 * =====================================================
 * 
 * Affiche une vue 5 colonnes (Lundi-Vendredi) × 3 lignes (B1, B2, B3)
 * avec les groupes de balades et leurs affectations.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Dog, MapPin, Clock, Users, Lock } from "lucide-react";
import {
  WeeklyGroupView,
  WORK_DAYS,
  TIME_BLOCKS,
  DAY_LABELS,
  BLOCK_LABELS,
  BLOCK_SCHEDULES,
  WALK_TYPE_LABELS,
  SECTOR_LABELS,
  getWalkTypeColor,
  getSectorColor,
  getMondayOfWeek,
  getISOWeekNumber,
} from "@/lib/planningTypes";
import { useWeeklyPlanning } from "@/hooks/usePlanning";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupDetailModal } from "./GroupDetailModal";

interface WeeklyPlanningGridProps {
  onGroupClick?: (groupView: WeeklyGroupView) => void;
}

export function WeeklyPlanningGrid({ onGroupClick }: WeeklyPlanningGridProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentWeek, setCurrentWeek] = useState(getISOWeekNumber(today));
  const [selectedGroup, setSelectedGroup] = useState<WeeklyGroupView | null>(null);

  const { data: weeklyView, isLoading } = useWeeklyPlanning(currentYear, currentWeek);

  const monday = getMondayOfWeek(currentYear, currentWeek);

  const navigateWeek = (delta: number) => {
    let newWeek = currentWeek + delta;
    let newYear = currentYear;

    if (newWeek < 1) {
      newYear -= 1;
      newWeek = 52;
    } else if (newWeek > 52) {
      newYear += 1;
      newWeek = 1;
    }

    setCurrentWeek(newWeek);
    setCurrentYear(newYear);
  };

  const goToCurrentWeek = () => {
    setCurrentYear(today.getFullYear());
    setCurrentWeek(getISOWeekNumber(today));
  };

  const handleGroupClick = (groupView: WeeklyGroupView) => {
    setSelectedGroup(groupView);
    onGroupClick?.(groupView);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(-1)}
            className="glass-button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              Semaine {currentWeek} - {currentYear}
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(monday, "d MMMM", { locale: fr })} - {format(addDays(monday, 4), "d MMMM yyyy", { locale: fr })}
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek(1)}
            className="glass-button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="secondary" onClick={goToCurrentWeek} size="sm">
          Aujourd'hui
        </Button>
      </div>

      {/* En-têtes des jours */}
      <div className="grid grid-cols-6 gap-3">
        <div className="text-sm font-medium text-muted-foreground p-2">
          Créneau
        </div>
        {WORK_DAYS.map((day, index) => {
          const dayDate = addDays(monday, index);
          const isToday = format(dayDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          
          return (
            <div
              key={day}
              className={`text-center p-2 rounded-lg ${
                isToday ? "bg-primary/20 border border-primary/30" : ""
              }`}
            >
              <div className="font-semibold">{DAY_LABELS[day]}</div>
              <div className="text-sm text-muted-foreground">
                {format(dayDate, "d MMM", { locale: fr })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grille des créneaux */}
      <div className="space-y-3">
        {TIME_BLOCKS.map(block => (
          <div key={block} className="grid grid-cols-6 gap-3">
            {/* Label du bloc */}
            <div className="flex flex-col justify-center p-3 rounded-lg bg-muted/30">
              <div className="font-medium text-sm">{BLOCK_LABELS[block]}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {BLOCK_SCHEDULES[block].start}-{BLOCK_SCHEDULES[block].end}
              </div>
            </div>

            {/* Cellules des groupes */}
            {WORK_DAYS.map(day => {
              const groupId = `${day.substring(0, 2).toUpperCase()}-${block}`;
              // Correction du mapping jour -> code
              const dayCode = day === 'lundi' ? 'LU' : day === 'mardi' ? 'MA' : day === 'mercredi' ? 'ME' : day === 'jeudi' ? 'JE' : 'VE';
              const correctGroupId = `${dayCode}-${block}`;
              const groupView = weeklyView?.[correctGroupId];

              if (!groupView) {
                return (
                  <Card
                    key={`${day}-${block}`}
                    className="p-3 bg-muted/10 border-dashed border-muted/30 opacity-50"
                  >
                    <div className="text-xs text-muted-foreground">
                      Non initialisé
                    </div>
                  </Card>
                );
              }

              const colors = getWalkTypeColor(groupView.effectiveType);
              const sectorColor = getSectorColor(groupView.effectiveSector);

              return (
                <TooltipProvider key={`${day}-${block}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card
                        className={`p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${colors.bg} ${colors.border} border ${
                          groupView.isBlocked ? "opacity-50" : ""
                        }`}
                        onClick={() => handleGroupClick(groupView)}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold">
                            {correctGroupId}
                          </span>
                          {groupView.isBlocked && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>

                        {/* Type et secteur */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge variant="outline" className={`text-[10px] ${colors.text}`}>
                            {WALK_TYPE_LABELS[groupView.effectiveType]}
                          </Badge>
                          {groupView.effectiveSector && (
                            <Badge variant="outline" className={`text-[10px] ${sectorColor}`}>
                              {groupView.effectiveSector}
                            </Badge>
                          )}
                        </div>

                        {/* Compteur */}
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          <span className={`font-medium ${
                            groupView.currentCount >= groupView.effectiveCapacity
                              ? "text-red-400"
                              : groupView.currentCount > 0
                              ? "text-green-400"
                              : "text-muted-foreground"
                          }`}>
                            {groupView.currentCount}/{groupView.effectiveCapacity}
                          </span>
                        </div>

                        {/* Liste des chiens */}
                        {groupView.assignments.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {groupView.assignments.slice(0, 3).map(assignment => (
                              <div
                                key={assignment.id}
                                className="text-xs truncate flex items-center gap-1"
                              >
                                <Dog className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">
                                  {assignment.animals.name}
                                </span>
                              </div>
                            ))}
                            {groupView.assignments.length > 3 && (
                              <div className="text-[10px] text-muted-foreground">
                                +{groupView.assignments.length - 3} autres
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-2">
                        <div className="font-semibold">
                          {correctGroupId} - {WALK_TYPE_LABELS[groupView.effectiveType]}
                        </div>
                        <div className="text-sm">
                          {BLOCK_SCHEDULES[block].pickup} ramassage<br />
                          {BLOCK_SCHEDULES[block].walk} balade<br />
                          {BLOCK_SCHEDULES[block].return} retour
                        </div>
                        {groupView.effectiveSector && (
                          <div className="text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {SECTOR_LABELS[groupView.effectiveSector]}
                          </div>
                        )}
                        {groupView.assignments.length > 0 && (
                          <div className="border-t pt-2">
                            <div className="text-xs font-medium mb-1">Chiens inscrits :</div>
                            {groupView.assignments.map(a => (
                              <div key={a.id} className="text-xs">
                                • {a.animals.name} ({a.animals.clients?.first_name})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/30">
        <span className="text-sm text-muted-foreground">Légende :</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/40" />
          <span className="text-xs">Collective</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500/40" />
          <span className="text-xs">Individuelle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/40" />
          <span className="text-xs">Cani-Rando</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/40" />
          <span className="text-xs">Sur mesure</span>
        </div>
      </div>

      {/* Modal détail groupe */}
      {selectedGroup && (
        <GroupDetailModal
          groupView={selectedGroup}
          year={currentYear}
          weekNumber={currentWeek}
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
