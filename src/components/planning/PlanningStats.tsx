/**
 * =====================================================
 * STATISTIQUES PLANNING
 * =====================================================
 * 
 * Affiche les métriques clés de la semaine :
 * - Nombre total de chiens planifiés
 * - Taux d'occupation
 * - Répartition par secteur
 * - Balades complétées
 */

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dog,
  Users,
  MapPin,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import {
  WeeklyGroupView,
  SECTOR_LABELS,
  GeographicSector,
} from "@/lib/planningTypes";

interface PlanningStatsProps {
  weeklyView: Record<string, WeeklyGroupView> | undefined;
}

export function PlanningStats({ weeklyView }: PlanningStatsProps) {
  if (!weeklyView) return null;

  const groups = Object.values(weeklyView);

  // Calculs
  const totalDogs = groups.reduce((sum, g) => sum + g.currentCount, 0);
  const totalCapacity = groups.reduce((sum, g) => sum + g.effectiveCapacity, 0);
  const occupancyRate = totalCapacity > 0 ? (totalDogs / totalCapacity) * 100 : 0;

  const completedWalks = groups.reduce(
    (sum, g) => sum + g.assignments.filter(a => a.is_completed).length,
    0
  );

  const blockedSlots = groups.filter(g => g.isBlocked).length;

  // Répartition par secteur
  const sectorCounts: Record<GeographicSector, number> = { S1: 0, S2: 0, S3: 0 };
  groups.forEach(g => {
    if (g.effectiveSector) {
      sectorCounts[g.effectiveSector] += g.currentCount;
    }
  });

  // Groupes pleins
  const fullGroups = groups.filter(g => g.currentCount >= g.effectiveCapacity).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total chiens */}
      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Dog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDogs}</p>
              <p className="text-xs text-muted-foreground">Chiens planifiés</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taux d'occupation */}
      <Card className="bg-emerald-500/10 border-emerald-500/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Taux d'occupation</p>
              <Progress value={occupancyRate} className="h-1 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balades effectuées */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <CheckCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {completedWalks}/{totalDogs}
              </p>
              <p className="text-xs text-muted-foreground">Balades effectuées</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groupes pleins */}
      <Card className="bg-orange-500/10 border-orange-500/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{fullGroups}/15</p>
              <p className="text-xs text-muted-foreground">Groupes complets</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
