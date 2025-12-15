/**
 * Widget Planning pour le Dashboard
 * Affiche un aperçu des balades de la semaine
 */

import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Dog, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { usePlanningStats } from "@/hooks/usePlanningStats";
import { DAY_LABELS } from "@/lib/planningTypes";

export function PlanningWidget() {
  const { data: stats, isLoading } = usePlanningStats();

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-4 w-full" />
      </GlassCard>
    );
  }

  if (!stats) return null;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Planning semaine
        </h3>
        <Link to="/planning">
          <Button variant="ghost" size="sm" className="text-primary">
            Voir <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Dog className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">
            {stats.totalDogsThisWeek}
          </div>
          <div className="text-xs text-muted-foreground">Balades prévues</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">
            {stats.completedWalksThisWeek}
          </div>
          <div className="text-xs text-muted-foreground">Effectuées</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-accent/10 border border-accent/20">
          <Clock className="h-5 w-5 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">
            {stats.pendingWalksThisWeek}
          </div>
          <div className="text-xs text-muted-foreground">En attente</div>
        </div>
      </div>

      {/* Capacité */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Capacité utilisée</span>
          <span className="font-medium text-foreground">{stats.capacityUsagePercent}%</span>
        </div>
        <Progress value={stats.capacityUsagePercent} className="h-2" />
      </div>

      {/* Mini graphe par jour */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex justify-between gap-1">
          {Object.entries(stats.walksByDay).map(([day, count]) => (
            <div key={day} className="flex-1 text-center">
              <div 
                className="mx-auto w-8 bg-primary/20 rounded-t"
                style={{ height: `${Math.max(4, count * 8)}px` }}
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                {day.substring(0, 2).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
