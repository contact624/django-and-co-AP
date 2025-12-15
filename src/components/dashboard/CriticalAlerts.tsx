/**
 * =====================================================
 * WIDGET: ALERTES CRITIQUES DASHBOARD
 * =====================================================
 * 
 * Affiche les alertes importantes qui nécessitent
 * une action immédiate :
 * - Factures en retard
 * - Balades non synchronisées
 * - Conflits de planning
 * - Routines incomplètes
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CreditCard,
  Calendar,
  Dog,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingDown,
} from "lucide-react";
import { useOverdueInvoices, useReminderStats } from "@/hooks/usePaymentReminders";
import { useDogRoutines, useWeeklyPlanning } from "@/hooks/usePlanning";
import { getISOWeekNumber, ROUTINE_LABELS } from "@/lib/planningTypes";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AlertItem {
  id: string;
  type: 'overdue' | 'planning' | 'routine' | 'sync';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  icon: React.ReactNode;
}

export function CriticalAlertsWidget() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeek = getISOWeekNumber(today);

  const { data: overdueInvoices } = useOverdueInvoices();
  const { data: reminderStats } = useReminderStats();
  const { data: routines } = useDogRoutines();
  const { data: weeklyView } = useWeeklyPlanning(currentYear, currentWeek);

  // Construire la liste des alertes
  const alerts = useMemo(() => {
    const items: AlertItem[] = [];

    // 1. Factures en retard (critique)
    if (overdueInvoices && overdueInvoices.length > 0) {
      const totalAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);
      items.push({
        id: 'overdue-invoices',
        type: 'overdue',
        severity: 'critical',
        title: `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? 's' : ''} en retard`,
        description: `${totalAmount.toFixed(0)} CHF à récupérer`,
        actionLabel: 'Voir les factures',
        actionLink: '/invoices?status=overdue',
        icon: <CreditCard className="h-4 w-4 text-red-500" />,
      });
    }

    // 2. Vérifier les routines incomplètes cette semaine
    if (routines && weeklyView) {
      const incompleteRoutines = routines.filter(routine => {
        // Compter les assignations de cette semaine pour ce chien
        const dogAssignments = Object.values(weeklyView).filter(gv =>
          gv.assignments.some(a => a.animal_id === routine.animal_id)
        ).length;

        // Comparer avec la routine attendue
        const expected = 
          routine.routine_type === 'R1' ? 1 :
          routine.routine_type === 'R2' ? 2 :
          routine.routine_type === 'R3' ? 3 :
          routine.routine_type === 'ROUTINE_PLUS' ? 4 : 0;

        return expected > 0 && dogAssignments < expected;
      });

      if (incompleteRoutines.length > 0) {
        items.push({
          id: 'incomplete-routines',
          type: 'routine',
          severity: 'warning',
          title: `${incompleteRoutines.length} routine${incompleteRoutines.length > 1 ? 's' : ''} incomplète${incompleteRoutines.length > 1 ? 's' : ''}`,
          description: `Chiens: ${incompleteRoutines.slice(0, 3).map(r => r.animals.name).join(', ')}${incompleteRoutines.length > 3 ? '...' : ''}`,
          actionLabel: 'Compléter le planning',
          actionLink: '/planning',
          icon: <Dog className="h-4 w-4 text-amber-500" />,
        });
      }
    }

    // 3. Vérifier les groupes pleins ou surchargés
    if (weeklyView) {
      const overbooked = Object.values(weeklyView).filter(
        gv => gv.currentCount > gv.effectiveCapacity
      );
      const nearFull = Object.values(weeklyView).filter(
        gv => gv.currentCount >= gv.effectiveCapacity && gv.currentCount <= gv.effectiveCapacity
      );

      if (overbooked.length > 0) {
        items.push({
          id: 'overbooked-groups',
          type: 'planning',
          severity: 'critical',
          title: `${overbooked.length} groupe${overbooked.length > 1 ? 's' : ''} surchargé${overbooked.length > 1 ? 's' : ''}`,
          description: `Groupes: ${overbooked.map(g => g.group.id).join(', ')}`,
          actionLabel: 'Corriger',
          actionLink: '/planning',
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        });
      }
    }

    // 4. Vérifier les balades non complétées d'hier
    // (Simplification: on vérifie juste si aujourd'hui n'est pas lundi)
    if (today.getDay() > 1 && weeklyView) { // Si pas lundi
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDayName = format(yesterday, 'EEEE', { locale: fr }).toLowerCase();
      
      const yesterdayGroups = Object.values(weeklyView).filter(gv => 
        gv.group.day === yesterdayDayName &&
        gv.assignments.some(a => !a.is_completed)
      );

      if (yesterdayGroups.length > 0) {
        const notCompleted = yesterdayGroups.reduce(
          (count, gv) => count + gv.assignments.filter(a => !a.is_completed).length,
          0
        );
        
        if (notCompleted > 0) {
          items.push({
            id: 'not-completed-yesterday',
            type: 'sync',
            severity: 'info',
            title: `${notCompleted} balade${notCompleted > 1 ? 's' : ''} non marquée${notCompleted > 1 ? 's' : ''} hier`,
            description: 'Les balades non complétées ne seront pas facturées',
            actionLabel: 'Mettre à jour',
            actionLink: '/planning',
            icon: <Clock className="h-4 w-4 text-blue-500" />,
          });
        }
      }
    }

    return items;
  }, [overdueInvoices, routines, weeklyView, today]);

  // Si pas d'alertes, afficher un message positif
  if (alerts.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Tout est en ordre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune action urgente requise. Continuez comme ça ! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  // Trier par sévérité
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Actions requises
          </span>
          <Badge variant="destructive">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {sortedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// =====================================================
// SOUS-COMPOSANT: AlertCard
// =====================================================

function AlertCard({ alert }: { alert: AlertItem }) {
  const severityColors = {
    critical: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[alert.severity]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {alert.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{alert.title}</div>
          <div className="text-xs text-muted-foreground">{alert.description}</div>
        </div>
        {alert.actionLink && (
          <Link to={alert.actionLink}>
            <Button size="sm" variant="ghost" className="flex-shrink-0">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// =====================================================
// COMPOSANT: Quick Stats (pour le header du dashboard)
// =====================================================

export function QuickStatsBar() {
  const { data: reminderStats } = useReminderStats();
  const { data: weeklyView } = useWeeklyPlanning(
    new Date().getFullYear(),
    getISOWeekNumber(new Date())
  );

  // Calculer les stats rapides
  const totalAssignments = weeklyView
    ? Object.values(weeklyView).reduce((sum, gv) => sum + gv.currentCount, 0)
    : 0;

  const completedCount = weeklyView
    ? Object.values(weeklyView).reduce(
        (sum, gv) => sum + gv.assignments.filter(a => a.is_completed).length,
        0
      )
    : 0;

  const utilization = weeklyView
    ? Math.round(
        (totalAssignments / 
          Object.values(weeklyView).reduce((sum, gv) => sum + gv.effectiveCapacity, 0)) 
        * 100
      )
    : 0;

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Dog className="h-4 w-4 text-primary" />
        <span>{totalAssignments} chiens cette semaine</span>
        {completedCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {completedCount} fait{completedCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TrendingDown className={`h-4 w-4 ${utilization >= 75 ? 'text-green-500' : 'text-amber-500'}`} />
        <span>Remplissage: {utilization}%</span>
      </div>

      {reminderStats && reminderStats.totalOverdue > 0 && (
        <div className="flex items-center gap-2 text-red-400">
          <CreditCard className="h-4 w-4" />
          <span>{reminderStats.totalAmount.toFixed(0)} CHF à récupérer</span>
        </div>
      )}
    </div>
  );
}
