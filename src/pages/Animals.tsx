import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAnimals, useDeleteAnimal, AnimalWithClient } from "@/hooks/useAnimals";
import { useActivities } from "@/hooks/useActivities";
import { useDogRoutine } from "@/hooks/usePlanning";
import { CreateAnimalModal } from "@/components/modals/CreateAnimalModal";
import { EditAnimalModal } from "@/components/modals/EditAnimalModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { Search, Plus, Dog, Cat, User, AlertTriangle, Pencil, Trash2, Calendar, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ROUTINE_LABELS, RoutineType } from "@/lib/planningTypes";

import { AnimalRoutineBadge } from "@/components/animals/AnimalRoutineBadge";

export default function Animals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [animalModalOpen, setAnimalModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalWithClient | null>(null);

  const { data: animals, isLoading } = useAnimals();
  const { data: activities } = useActivities();
  const deleteAnimal = useDeleteAnimal();

  const filteredAnimals = animals?.filter(
    (animal) =>
      animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (animal.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  ) ?? [];

  const getAge = (birthDate?: string | null) => {
    if (!birthDate) return "Âge inconnu";
    const birth = new Date(birthDate);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    if (years === 0) {
      const months = today.getMonth() - birth.getMonth();
      return `${Math.max(1, months)} mois`;
    }
    return `${years} an${years > 1 ? 's' : ''}`;
  };

  const getSpeciesLabel = (species: string) => {
    switch (species) {
      case "dog": return "Chien";
      case "cat": return "Chat";
      default: return species;
    }
  };

  const handleEdit = (animal: AnimalWithClient) => {
    setSelectedAnimal(animal);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (animal: AnimalWithClient) => {
    // Check if animal has activities
    const animalActivities = activities?.filter((a) => a.animal_id === animal.id) ?? [];
    if (animalActivities.length > 0) {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer un animal lié à des activités. Supprimez d'abord ou modifiez les activités concernées.",
        variant: "destructive",
      });
      return;
    }
    setSelectedAnimal(animal);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAnimal) return;
    await deleteAnimal.mutateAsync(selectedAnimal.id);
    setDeleteModalOpen(false);
    setSelectedAnimal(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Animaux</h1>
            <p className="text-muted-foreground">Tous les animaux de vos clients</p>
          </div>
          <GlassButton variant="primary" onClick={() => setAnimalModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nouvel animal
          </GlassButton>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un animal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Animals grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <GlassCard key={i} className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-14 h-14 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </GlassCard>
            ))
          ) : filteredAnimals.length > 0 ? (
            filteredAnimals.map((animal) => {
              const Icon = animal.species === 'cat' ? Cat : Dog;

              return (
                <GlassCard 
                  key={animal.id} 
                  className="group p-5 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-lg">{animal.name}</h3>
                      <p className="text-sm text-muted-foreground">{animal.breed || "Race non spécifiée"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{getSpeciesLabel(animal.species)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{getAge(animal.birth_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleEdit(animal)}
                        className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(animal)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {animal.microchip_number && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <span className="font-medium">Puce :</span> {animal.microchip_number}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>
                          {animal.clients?.first_name} {animal.clients?.last_name}
                        </span>
                      </div>
                      <AnimalRoutineBadge animalId={animal.id} />
                    </div>
                  </div>

                  {animal.allergies && (
                    <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{animal.allergies}</span>
                    </div>
                  )}

                  {animal.notes && !animal.allergies && (
                    <div className="mt-3 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                      {animal.notes}
                    </div>
                  )}
                </GlassCard>
              );
            })
          ) : (
            <GlassCard className="col-span-full p-12 text-center">
              <Dog className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Aucun animal trouvé" : "Aucun animal pour le moment"}
              </p>
              {!searchTerm && (
                <GlassButton variant="primary" onClick={() => setAnimalModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Ajouter un animal
                </GlassButton>
              )}
            </GlassCard>
          )}
        </div>
      </div>

      <CreateAnimalModal 
        open={animalModalOpen} 
        onOpenChange={setAnimalModalOpen} 
      />
      <EditAnimalModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        animal={selectedAnimal}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Supprimer l'animal"
        description="Confirmez-vous la suppression de cet animal ? Cette action est définitive."
        onConfirm={handleDeleteConfirm}
        isPending={deleteAnimal.isPending}
      />
    </DashboardLayout>
  );
}
