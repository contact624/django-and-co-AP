/**
 * =====================================================
 * COMPOSANT: ALERTES ET VALIDATION PLANNING
 * =====================================================
 * 
 * Affiche les alertes en temps réel sur le planning :
 * - Surréservations
 * - Routines non respectées
 * - Conflits de chiens
 * - Suggestions d'optimisation
 */

import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Users,
  Dog,
  Calendar,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  analyzeWeeklyLoad,
  checkRoutineCompliance,
  detectDoubleBookings,
  WeeklyLoadAnalysis,
} from "@/lib/business-rules";
import { WeeklyGroupView, RoutineType, GeographicSector, DAY_LABELS } from "@/lib/planningTypes";

interface PlanningAlertsProps {
  weeklyView: Record<string, WeeklyGroupView> | undefined;
  dogRoutines?: Array<{
    id: string;
    dogName: string;
    routineType: RoutineType;
    sector?: GeographicSector | null;
  }>;
  className?: string;
}

export function PlanningAlerts({ weeklyView, dogRoutines = [], className }: PlanningAlertsProps) {
  // Analyser les données du planning
  const analysis = useMemo(() => {
    if (!weeklyView) return null;

    // Transformer les données pour l'analyse
    const groups = Object.values(weeklyView).map(gv => ({
      id: gv.group.id,
      sector: gv.effectiveSector,
      capacity: gv.effectiveCapacity,
      isBlocked: gv.isBlocked,
    }));

    const assignments = Object.values(weeklyView).flatMap(gv =>
      gv.assignments.map(a => ({
        groupId: gv.group.id,
        dogId: a.animal_id,
        dogName: a.animals.name,
      }))
    );

    // Analyser la charge
    const loadAnalysis = analyzeWeeklyLoad({ groups, assignments });

    // Détecter les doubles réservations
    const conflicts = detectDoubleBookings(assignments);

    // Vérifier la conformité des routines
    const dogs = dogRoutines.map(r => ({
      id: r.id,
      name: r.dogName,
      routineType: r.routineType,
      sector: r.sector,
    }));
    const routineCheck = checkRoutineCompliance({ dogs, assignments });

    return {
      loadAnalysis,
      conflicts,
      routineCheck,
    };
  }, [weeklyView, dogRoutines]);

  if (!analysis) return null;

  const { loadAnalysis, conflicts, routineCheck } = analysis;

  // Compter les alertes par niveau
  const errorCount = loadAnalysis.overBookedGroups.length + conflicts.length;
  const warningCount = routineCheck.filter(r => r.status === 'under').length;
  const infoCount = routineCheck.filter(r => r.status === 'over').length;

  // Si aucune alerte, afficher un message positif
  if (errorCount === 0 && warningCount === 0) {
    return (
      <Alert className={`bg-green-500/10 border-green-500/30 ${className}`}>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-500">Planning validé</AlertTitle>
        <AlertDescription className="text-green-400/80">
          Aucun conflit détecté. Remplissage: {loadAnalysis.utilizationPercent}%
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`bg-card/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertes Planning
          </span>
          <div className="flex gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive">{errorCount} critique{errorCount > 1 ? 's' : ''}</Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400">{warningCount} attention</Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="secondary">{infoCount} info</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {/* Surréservations */}
            {loadAnalysis.overBookedGroups.map(groupId => (
              <AlertItem
                key={`overbooked-${groupId}`}
                severity="error"
                icon={<Users className="h-4 w-4" />}
                title={`Groupe ${groupId} surchargé`}
                description="Ce groupe dépasse sa capacité maximale"
                action={
                  <Button size="sm" variant="destructive">
                    Résoudre
                  </Button>
                }
              />
            ))}

            {/* Conflits de chiens */}
            {conflicts.map((conflict, i) => (
              <AlertItem
                key={`conflict-${i}`}
                severity="error"
                icon={<Dog className="h-4 w-4" />}
                title={`Conflit: ${conflict.dogName}`}
                description={conflict.details}
                action={
                  <span className="text-xs text-muted-foreground">
                    Groupes: {conflict.affectedGroups.join(', ')}
                  </span>
                }
              />
            ))}

            {/* Routines non respectées */}
            {routineCheck
              .filter(r => r.status === 'under')
              .map(check => (
                <AlertItem
                  key={`routine-${check.dogId}`}
                  severity="warning"
                  icon={<Calendar className="h-4 w-4" />}
                  title={check.dogName}
                  description={`${check.actualCount}/${check.expectedCount} balades (${check.routineType})`}
                  action={
                    <Button size="sm" variant="outline">
                      Compléter
                    </Button>
                  }
                />
              ))}

            {/* Groupes presque pleins */}
            {loadAnalysis.nearCapacityGroups.length > 0 && (
              <AlertItem
                severity="info"
                icon={<TrendingUp className="h-4 w-4" />}
                title="Groupes presque complets"
                description={loadAnalysis.nearCapacityGroups.join(', ')}
              />
            )}

            {/* Statistiques rapides */}
            <div className="pt-2 border-t border-border/30">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold">{loadAnalysis.totalAssignments}</div>
                  <div className="text-xs text-muted-foreground">Chiens</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{loadAnalysis.utilizationPercent}%</div>
                  <div className="text-xs text-muted-foreground">Remplissage</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{loadAnalysis.emptyGroups.length}</div>
                  <div className="text-xs text-muted-foreground">Créneaux vides</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// =====================================================
// COMPOSANT INTERNE: AlertItem
// =====================================================

interface AlertItemProps {
  severity: 'error' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function AlertItem({ severity, icon, title, description, action }: AlertItemProps) {
  const colors = {
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const icons = {
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />,
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[severity]}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icon || icons[severity]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{description}</div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPOSANT: Quick Actions
// =====================================================

interface QuickActionsProps {
  onAutoAssign?: () => void;
  onSyncWeek?: () => void;
  onOptimize?: () => void;
  isLoading?: boolean;
}

export function PlanningQuickActions({ 
  onAutoAssign, 
  onSyncWeek, 
  onOptimize,
  isLoading 
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onAutoAssign && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onAutoAssign}
          disabled={isLoading}
        >
          <Zap className="h-4 w-4 mr-1" />
          Affectation auto
        </Button>
      )}
      {onSyncWeek && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onSyncWeek}
          disabled={isLoading}
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Sync activités
        </Button>
      )}
      {onOptimize && (
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={onOptimize}
          disabled={isLoading}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Optimiser
        </Button>
      )}
    </div>
  );
}

// =====================================================
// COMPOSANT: Stats rapides du jour
// =====================================================

interface DayStatsProps {
  day: string;
  assignments: number;
  capacity: number;
  completedCount: number;
}

export function DayStats({ day, assignments, capacity, completedCount }: DayStatsProps) {
  const percent = capacity > 0 ? Math.round((assignments / capacity) * 100) : 0;
  const completedPercent = assignments > 0 ? Math.round((completedCount / assignments) * 100) : 0;

  return (
    <div className="text-center p-2 rounded-lg bg-muted/20">
      <div className="text-xs text-muted-foreground mb-1">{day}</div>
      <div className="text-lg font-bold">{assignments}/{capacity}</div>
      <div className="flex justify-center gap-1 mt-1">
        <Badge 
          variant="outline" 
          className={`text-[10px] ${percent >= 75 ? 'border-amber-500 text-amber-400' : ''}`}
        >
          {percent}%
        </Badge>
        {completedCount > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {completedPercent}% fait
          </Badge>
        )}
      </div>
    </div>
  );
}
