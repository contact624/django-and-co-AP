import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActivityWithRelations, SERVICE_TYPE_LABELS } from "@/hooks/useActivities";
import { Clock, User, PawPrint, Calendar, DollarSign, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityWithRelations | null;
}

function ActivityDetailContent({ 
  activity, 
  onClose 
}: { 
  activity: ActivityWithRelations;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleViewInActivities = () => {
    onClose();
    navigate("/activities");
  };

  const formattedDate = format(new Date(activity.scheduled_date), "EEEE d MMMM yyyy", { locale: fr });
  const clientName = activity.clients 
    ? `${activity.clients.first_name} ${activity.clients.last_name}` 
    : "Client inconnu";
  const animalName = activity.animals?.name || "Aucun animal";

  return (
    <div className="space-y-4">
      {/* Service type badge */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground">
          {SERVICE_TYPE_LABELS[activity.service_type]}
        </span>
        <StatusBadge status={activity.status} />
      </div>

      {/* Date and time */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="capitalize">{formattedDate}</span>
        </div>
        {activity.scheduled_time && (
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{activity.scheduled_time.slice(0, 5)}</span>
          </div>
        )}
      </div>

      {/* Client and animal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <User className="w-3.5 h-3.5" />
            Client
          </div>
          <p className="text-foreground font-medium">{clientName}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <PawPrint className="w-3.5 h-3.5" />
            Animal
          </div>
          <p className="text-foreground font-medium">{animalName}</p>
        </div>
      </div>

      {/* Duration and price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="w-3.5 h-3.5" />
            Durée
          </div>
          <p className="text-foreground font-medium">{activity.duration_minutes} min</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Total
          </div>
          <p className="text-foreground font-medium">{activity.total_price?.toFixed(2) || "0.00"} CHF</p>
        </div>
      </div>

      {/* Notes */}
      {activity.notes && (
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-muted-foreground text-sm mb-1">Notes</p>
          <p className="text-foreground text-sm">{activity.notes}</p>
        </div>
      )}

      {/* Action button */}
      <Button 
        onClick={handleViewInActivities}
        className="w-full"
        variant="outline"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Voir dans Activités
      </Button>
    </div>
  );
}

export function ActivityDetailModal({
  open,
  onOpenChange,
  activity,
}: ActivityDetailModalProps) {
  if (!open || !activity) return null;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Détail de l'activité
          </DialogTitle>
        </DialogHeader>
        <ActivityDetailContent activity={activity} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}