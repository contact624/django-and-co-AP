import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRecentActivities, SERVICE_TYPE_LABELS } from "@/hooks/useDashboardStats";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentActivities() {
  const navigate = useNavigate();
  const { data: activities = [], isLoading } = useRecentActivities();

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Activités récentes</h3>
        <button
          onClick={() => navigate('/activities')}
          className="text-sm text-primary hover:underline"
        >
          Voir tout
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => {
          const date = new Date(activity.scheduled_date);
          const clientName = activity.clients 
            ? `${activity.clients.first_name} ${activity.clients.last_name}`
            : "Client inconnu";
          const animalName = activity.animals?.name;

          return (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate('/activities')}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {date.getDate()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {SERVICE_TYPE_LABELS[activity.service_type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clientName}
                    {animalName && ` • ${animalName}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {(activity.total_price || 0).toFixed(0)} CHF
                </p>
                <StatusBadge status={activity.status} />
              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucune activité récente
          </p>
        )}
      </div>
    </GlassCard>
  );
}
