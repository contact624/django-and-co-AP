/**
 * =====================================================
 * MODAL DÉTAIL D'UN GROUPE
 * =====================================================
 * 
 * Affiche les détails d'un créneau et permet :
 * - Voir les chiens affectés
 * - Ajouter/retirer des chiens
 * - Modifier le type (individuelle, cani-rando)
 * - Bloquer le créneau
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dog,
  Trash2,
  Plus,
  Clock,
  MapPin,
  Users,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  WeeklyGroupView,
  WalkType,
  GeographicSector,
  WALK_TYPE_LABELS,
  SECTOR_LABELS,
  BLOCK_SCHEDULES,
  DAY_LABELS,
  getWalkTypeColor,
  DEFAULT_CAPACITIES,
} from "@/lib/planningTypes";
import {
  useUpdateWeeklySchedule,
  useRemoveDogFromGroup,
  useMarkAssignmentCompleted,
} from "@/hooks/usePlanning";
import { useAnimals } from "@/hooks/useAnimals";
import { useAssignDogToGroup } from "@/hooks/usePlanning";
import { toast } from "@/hooks/use-toast";

interface GroupDetailModalProps {
  groupView: WeeklyGroupView;
  year: number;
  weekNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupDetailModal({
  groupView,
  year,
  weekNumber,
  open,
  onOpenChange,
}: GroupDetailModalProps) {
  const [walkType, setWalkType] = useState<WalkType>(groupView.effectiveType);
  const [sector, setSector] = useState<GeographicSector | "none">(groupView.effectiveSector || "none");
  const [capacity, setCapacity] = useState(groupView.effectiveCapacity);
  const [isBlocked, setIsBlocked] = useState(groupView.isBlocked);
  const [blockReason, setBlockReason] = useState(groupView.schedule?.block_reason || "");
  const [notes, setNotes] = useState(groupView.schedule?.notes || "");
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");

  const updateSchedule = useUpdateWeeklySchedule();
  const removeDog = useRemoveDogFromGroup();
  const markCompleted = useMarkAssignmentCompleted();
  const assignDog = useAssignDogToGroup();
  const { data: animals } = useAnimals();

  const colors = getWalkTypeColor(walkType);

  // Filtrer les animaux disponibles (non déjà affectés)
  const assignedAnimalIds = groupView.assignments.map(a => a.animal_id);
  const availableAnimals = animals?.filter(
    a => !assignedAnimalIds.includes(a.id)
  ) || [];

  const handleSave = async () => {
    await updateSchedule.mutateAsync({
      group_id: groupView.group.id,
      year,
      week_number: weekNumber,
      walk_type: walkType,
      sector: sector === "none" ? null : sector,
      capacity,
      is_blocked: isBlocked,
      block_reason: isBlocked ? blockReason : null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  const handleRemoveDog = async (assignmentId: string) => {
    await removeDog.mutateAsync(assignmentId);
  };

  const handleToggleCompleted = async (assignmentId: string, currentValue: boolean) => {
    await markCompleted.mutateAsync({ id: assignmentId, is_completed: !currentValue });
  };

  const handleAddDog = async () => {
    if (!selectedAnimalId) return;

    if (groupView.currentCount >= capacity) {
      toast({
        title: "Groupe complet",
        description: "Ce groupe a atteint sa capacité maximale.",
        variant: "destructive",
      });
      return;
    }

    await assignDog.mutateAsync({
      animal_id: selectedAnimalId,
      group_id: groupView.group.id,
      year,
      week_number: weekNumber,
    });

    setSelectedAnimalId("");
  };

  const handleWalkTypeChange = (value: WalkType) => {
    setWalkType(value);
    setCapacity(DEFAULT_CAPACITIES[value]);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-md ${colors.bg} ${colors.text} font-mono`}>
              {groupView.group.id}
            </span>
            <span>{DAY_LABELS[groupView.group.day]}</span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {BLOCK_SCHEDULES[groupView.group.block].start}-{BLOCK_SCHEDULES[groupView.group.block].end}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {groupView.currentCount}/{capacity} chiens
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 py-4">
            {/* Configuration du créneau */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Configuration
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de balade</Label>
                  <Select value={walkType} onValueChange={handleWalkTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(WALK_TYPE_LABELS) as WalkType[]).map(type => (
                        <SelectItem key={type} value={type}>
                          {WALK_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <Select value={sector} onValueChange={(v) => setSector(v as GeographicSector | "none")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Non défini" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non défini</SelectItem>
                      {(Object.keys(SECTOR_LABELS) as GeographicSector[]).map(s => (
                        <SelectItem key={s} value={s}>
                          {s} - {SECTOR_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Capacité maximale</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bloquer ce créneau</Label>
                  <p className="text-xs text-muted-foreground">
                    Empêche toute affectation
                  </p>
                </div>
                <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
              </div>

              {isBlocked && (
                <div className="space-y-2">
                  <Label>Raison du blocage</Label>
                  <Input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ex: Congé, formation..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes logistiques, point de RDV..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Chiens affectés */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Chiens affectés ({groupView.assignments.length})
              </h4>

              {groupView.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun chien affecté à ce créneau.
                </p>
              ) : (
                <div className="space-y-2">
                  {groupView.assignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Dog className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium text-sm">
                            {assignment.animals.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assignment.animals.clients?.first_name} {assignment.animals.clients?.last_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={assignment.is_completed ? "text-green-500" : "text-muted-foreground"}
                          onClick={() => handleToggleCompleted(assignment.id, assignment.is_completed)}
                        >
                          {assignment.is_completed ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveDog(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter un chien */}
              {!isBlocked && groupView.currentCount < capacity && (
                <div className="flex gap-2">
                  <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sélectionner un chien..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAnimals.map(animal => (
                        <SelectItem key={animal.id} value={animal.id}>
                          {animal.name} ({animal.clients?.first_name} {animal.clients?.last_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddDog}
                    disabled={!selectedAnimalId || assignDog.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={updateSchedule.isPending}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
