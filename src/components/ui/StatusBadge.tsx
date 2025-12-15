import { cn } from "@/lib/utils";

type StatusType = string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusStyles: Record<string, { style: string; label: string }> = {
  // Activity statuses (French)
  'Planifiée': { style: 'bg-primary/20 text-primary border-primary/30', label: 'Planifiée' },
  'Réalisée': { style: 'bg-accent/20 text-accent border-accent/30', label: 'Réalisée' },
  'Facturée': { style: 'bg-success/20 text-success border-success/30', label: 'Facturée' },
  'Annulée': { style: 'bg-muted text-muted-foreground border-border', label: 'Annulée' },
  // Activity statuses (English enum values)
  'planned': { style: 'bg-primary/20 text-primary border-primary/30', label: 'Planifiée' },
  'done': { style: 'bg-accent/20 text-accent border-accent/30', label: 'Réalisée' },
  'invoiced': { style: 'bg-success/20 text-success border-success/30', label: 'Facturée' },
  'cancelled': { style: 'bg-muted text-muted-foreground border-border', label: 'Annulée' },
  // Invoice statuses (French)
  'Brouillon': { style: 'bg-muted text-muted-foreground border-border', label: 'Brouillon' },
  'Envoyée': { style: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Envoyée' },
  'Payée': { style: 'bg-success/20 text-success border-success/30', label: 'Payée' },
  'En retard': { style: 'bg-destructive/20 text-destructive border-destructive/30', label: 'En retard' },
  // Invoice statuses (English enum values)
  'draft': { style: 'bg-muted text-muted-foreground border-border', label: 'Brouillon' },
  'sent': { style: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Envoyée' },
  'paid': { style: 'bg-success/20 text-success border-success/30', label: 'Payée' },
  'overdue': { style: 'bg-destructive/20 text-destructive border-destructive/30', label: 'En retard' },
};

const defaultStatus = { style: 'bg-muted text-muted-foreground border-border', label: '' };

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = statusStyles[status] || { ...defaultStatus, label: status };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusConfig.style,
        className
      )}
    >
      {statusConfig.label}
    </span>
  );
}
