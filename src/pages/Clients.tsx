import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useClients, useDeleteClient, Client } from "@/hooks/useClients";
import { useAnimals } from "@/hooks/useAnimals";
import { useActivities, SERVICE_TYPE_LABELS } from "@/hooks/useActivities";
import { useInvoices } from "@/hooks/useInvoices";
import { CreateClientModal } from "@/components/modals/CreateClientModal";
import { EditClientModal } from "@/components/modals/EditClientModal";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";
import { CreateAnimalModal } from "@/components/modals/CreateAnimalModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { Search, Plus, Mail, Phone, MapPin, Dog, FileText, Footprints, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [animalModalOpen, setAnimalModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  const { data: clients, isLoading: clientsLoading, refetch: refetchClients } = useClients();
  const { data: animals, refetch: refetchAnimals } = useAnimals();
  const { data: activities, refetch: refetchActivities } = useActivities();
  const { data: invoices } = useInvoices();

  const filteredClients = clients?.filter(
    (client) =>
      client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  ) ?? [];

  const selectedClientData = selectedClient
    ? clients?.find((c) => c.id === selectedClient)
    : null;

  const getClientAnimals = (clientId: string) => 
    animals?.filter((a) => a.client_id === clientId) ?? [];

  const getClientActivities = (clientId: string) => 
    activities?.filter((a) => a.client_id === clientId) ?? [];

  const getClientRevenue = (clientId: string) => 
    getClientActivities(clientId)
      .filter((a) => a.status === "invoiced")
      .reduce((sum, a) => sum + Number(a.total_price), 0);

  const handleEdit = (client: Client) => {
    setClientToEdit(client);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (client: Client) => {
    // Check if client has invoices
    const clientInvoices = invoices?.filter((i) => i.client_id === client.id) ?? [];
    if (clientInvoices.length > 0) {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer un client lié à des factures. (Fonction d'archivage à prévoir.)",
        variant: "destructive",
      });
      return;
    }
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete all activities for this client first
      const { error: activitiesError } = await supabase
        .from("activities")
        .delete()
        .eq("client_id", clientToDelete.id);
      
      if (activitiesError) throw activitiesError;

      // Delete all animals for this client
      const { error: animalsError } = await supabase
        .from("animals")
        .delete()
        .eq("client_id", clientToDelete.id);
      
      if (animalsError) throw animalsError;

      // Delete the client
      const { error: clientError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);
      
      if (clientError) throw clientError;

      toast({
        title: "Client supprimé",
        description: "Le client et toutes ses données associées ont été supprimés.",
      });

      // Refresh all data and invalidate all related queries
      await Promise.all([refetchClients(), refetchAnimals(), refetchActivities()]);
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["recentInvoices"] });
      
      if (selectedClient === clientToDelete.id) {
        setSelectedClient(null);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
      console.error("Error deleting client:", error);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground">Gérez vos clients et leurs informations</p>
          </div>
          <GlassButton variant="primary" onClick={() => setClientModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nouveau client
          </GlassButton>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client list */}
          <div className="lg:col-span-2 space-y-3">
            {clientsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <GlassCard key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const clientAnimals = getClientAnimals(client.id);
                const clientActivities = getClientActivities(client.id);
                const totalRevenue = getClientRevenue(client.id);

                return (
                  <div key={client.id} className="group">
                    <GlassCard
                      key={client.id}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 ${
                        selectedClient === client.id 
                          ? "border-primary/50 bg-primary/5 shadow-[inset_3px_0_0_0_hsl(var(--primary))]" 
                          : "hover:border-border/80"
                      }`}
                      onClick={() => setSelectedClient(client.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-semibold flex-shrink-0 border border-primary/20">
                            {client.first_name[0]}{client.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {client.first_name} {client.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">{client.email || "Pas d'email"}</p>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-full">
                                <Dog className="w-3 h-3" />
                                {clientAnimals.length}
                              </span>
                              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-full">
                                <Footprints className="w-3 h-3" />
                                {clientActivities.length}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{totalRevenue.toFixed(0)} CHF</p>
                            <p className="text-xs text-muted-foreground">Facturé</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(client);
                              }}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(client);
                              }}
                              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                );
              })
            ) : (
              <GlassCard className="p-12 text-center">
                <Dog className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Aucun client trouvé" : "Aucun client pour le moment"}
                </p>
                {!searchTerm && (
                  <GlassButton variant="primary" onClick={() => setClientModalOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Ajouter votre premier client
                  </GlassButton>
                )}
              </GlassCard>
            )}
          </div>

          {/* Client details */}
          <div>
            {selectedClientData ? (
              <GlassCard className="p-6 sticky top-24">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-2xl font-semibold text-primary">
                    {selectedClientData.first_name[0]}{selectedClientData.last_name[0]}
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedClientData.first_name} {selectedClientData.last_name}
                  </h2>
                </div>

                <div className="space-y-4">
                  {selectedClientData.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{selectedClientData.email}</span>
                    </div>
                  )}
                  {selectedClientData.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{selectedClientData.phone}</span>
                    </div>
                  )}
                  {selectedClientData.address && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-foreground whitespace-pre-line">
                        {selectedClientData.address}
                      </span>
                    </div>
                  )}
                </div>

                {selectedClientData.notes && (
                  <div className="mt-6 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    {selectedClientData.notes}
                  </div>
                )}

                {/* Animals list */}
                {getClientAnimals(selectedClientData.id).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Animaux</h4>
                    <div className="space-y-2">
                      {getClientAnimals(selectedClientData.id).map((animal) => (
                        <div key={animal.id} className="flex items-center gap-2 text-sm">
                          <Dog className="w-4 h-4 text-accent" />
                          <span className="text-foreground">{animal.name}</span>
                          {animal.breed && (
                            <span className="text-muted-foreground">({animal.breed})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-border space-y-2">
                  <GlassButton 
                    className="w-full" 
                    size="sm"
                    onClick={() => setAnimalModalOpen(true)}
                  >
                    <Dog className="w-4 h-4" />
                    Ajouter un animal
                  </GlassButton>
                  <GlassButton 
                    className="w-full" 
                    size="sm"
                    onClick={() => setActivityModalOpen(true)}
                  >
                    <Footprints className="w-4 h-4" />
                    Ajouter une activité
                  </GlassButton>
                  <GlassButton className="w-full" size="sm" variant="primary">
                    <FileText className="w-4 h-4" />
                    Créer une facture
                  </GlassButton>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-12 text-center">
                <p className="text-muted-foreground">
                  Sélectionnez un client pour voir ses détails
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>

      <CreateClientModal 
        open={clientModalOpen} 
        onOpenChange={setClientModalOpen} 
      />
      <EditClientModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        client={clientToEdit}
      />
      <CreateAnimalModal 
        open={animalModalOpen} 
        onOpenChange={setAnimalModalOpen}
        defaultClientId={selectedClient || undefined}
      />
      <CreateActivityModal 
        open={activityModalOpen} 
        onOpenChange={setActivityModalOpen}
        defaultClientId={selectedClient || undefined}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Supprimer le client"
        description="Confirmez-vous la suppression de ce client ? Cette action supprimera également tous les animaux et activités associés. Cette action est définitive."
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </DashboardLayout>
  );
}
