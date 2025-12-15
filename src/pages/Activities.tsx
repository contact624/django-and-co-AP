import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useActivities, SERVICE_TYPE_LABELS, ACTIVITY_STATUS_LABELS, useDeleteActivity, useUpdateActivityStatus, ActivityWithRelations } from "@/hooks/useActivities";
import { useInvoices } from "@/hooks/useInvoices";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";
import { EditActivityModal } from "@/components/modals/EditActivityModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { Search, Plus, Clock, Footprints, Pencil, Trash2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type ServiceType = Database["public"]["Enums"]["service_type"];
type ActivityStatus = Database["public"]["Enums"]["activity_status"];

const SERVICE_TYPES: ServiceType[] = [
  "individual_walk",
  "group_walk",
  "custom_walk",
  "education",
  "dog_sitting",
  "transport",
  "other",
];

export default function Activities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithRelations | null>(null);

  const { data: activities, isLoading } = useActivities();
  const { data: invoices } = useInvoices();
  const deleteActivity = useDeleteActivity();
  const updateStatus = useUpdateActivityStatus();

  const filteredActivities = activities?.filter((activity) => {
    const clientName = `${activity.clients?.first_name || ""} ${activity.clients?.last_name || ""}`.toLowerCase();
    const matchesSearch =
      clientName.includes(searchTerm.toLowerCase()) ||
      SERVICE_TYPE_LABELS[activity.service_type].toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || activity.service_type === typeFilter;
    const matchesStatus = statusFilter === "all" || activity.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }) ?? [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleEdit = (activity: ActivityWithRelations) => {
    setSelectedActivity(activity);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (activity: ActivityWithRelations) => {
    // Check if activity is invoiced (status === "invoiced")
    if (activity.status === "invoiced") {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer une activité déjà liée à une facture.",
        variant: "destructive",
      });
      return;
    }
    setSelectedActivity(activity);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedActivity) return;
    await deleteActivity.mutateAsync(selectedActivity.id);
    setDeleteModalOpen(false);
    setSelectedActivity(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activités</h1>
            <p className="text-muted-foreground">Toutes vos prestations et balades</p>
          </div>
          <GlassButton variant="primary" onClick={() => setActivityModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nouvelle activité
          </GlassButton>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Tous les types</option>
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>{SERVICE_TYPE_LABELS[type]}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Tous les statuts</option>
            <option value="planned">Planifiée</option>
            <option value="done">Réalisée</option>
            <option value="invoiced">Facturée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>

        {/* Activities table */}
        <GlassCard className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : filteredActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent hover:shadow-none">
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Animal</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Durée</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.slice(0, 50).map((activity) => (
                  <TableRow key={activity.id} className="group cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {formatDate(activity.scheduled_date)}
                          </div>
                          {activity.scheduled_time && (
                            <div className="text-xs text-muted-foreground">{activity.scheduled_time.slice(0, 5)}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {activity.clients?.first_name} {activity.clients?.last_name}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {activity.animals?.name || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/50 text-xs font-medium text-foreground">
                        {SERVICE_TYPE_LABELS[activity.service_type]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{activity.duration_minutes} min</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-foreground">
                        {Number(activity.total_price).toFixed(0)} CHF
                      </span>
                    </TableCell>
                    <TableCell>
                      {activity.status !== "invoiced" && activity.status !== "cancelled" ? (
                        <button
                          onClick={() => {
                            const newStatus = activity.status === "planned" ? "done" : "planned";
                            updateStatus.mutate({ id: activity.id, status: newStatus });
                          }}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          title="Cliquez pour changer le statut"
                        >
                          <StatusBadge status={activity.status} />
                        </button>
                      ) : (
                        <StatusBadge status={activity.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(activity)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(activity)}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Footprints className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter !== "all" || statusFilter !== "all" 
                  ? "Aucune activité trouvée" 
                  : "Aucune activité pour le moment"}
              </p>
              {!searchTerm && typeFilter === "all" && statusFilter === "all" && (
                <GlassButton variant="primary" onClick={() => setActivityModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Créer votre première activité
                </GlassButton>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      <CreateActivityModal 
        open={activityModalOpen} 
        onOpenChange={setActivityModalOpen} 
      />
      <EditActivityModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        activity={selectedActivity}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Supprimer l'activité"
        description="Confirmez-vous la suppression de cette activité ? Cette action est définitive."
        onConfirm={handleDeleteConfirm}
        isPending={deleteActivity.isPending}
      />
    </DashboardLayout>
  );
}
