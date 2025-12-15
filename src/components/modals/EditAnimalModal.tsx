import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateAnimal, AnimalWithClient } from "@/hooks/useAnimals";
import { useClients } from "@/hooks/useClients";
import { Loader2 } from "lucide-react";

interface EditAnimalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: AnimalWithClient | null;
}

function EditAnimalForm({ 
  animal, 
  onClose 
}: { 
  animal: AnimalWithClient; 
  onClose: () => void; 
}) {
  const updateAnimal = useUpdateAnimal();
  const { data: clients } = useClients();
  
  const [formData, setFormData] = useState({
    client_id: animal.client_id,
    name: animal.name,
    species: animal.species,
    breed: animal.breed || "",
    birth_date: animal.birth_date || "",
    microchip_number: animal.microchip_number || "",
    allergies: animal.allergies || "",
    notes: animal.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateAnimal.mutateAsync({
      id: animal.id,
      ...formData,
    });
    
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="client_id">Client *</Label>
        <Select
          value={formData.client_id}
          onValueChange={(value) => handleChange("client_id", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.first_name} {client.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="species">Espèce</Label>
          <Select
            value={formData.species}
            onValueChange={(value) => handleChange("species", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dog">Chien</SelectItem>
              <SelectItem value="cat">Chat</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="breed">Race</Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={(e) => handleChange("breed", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birth_date">Date de naissance</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleChange("birth_date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="microchip_number">Numéro de puce</Label>
        <Input
          id="microchip_number"
          value={formData.microchip_number}
          onChange={(e) => handleChange("microchip_number", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergies">Allergies / Particularités</Label>
        <Textarea
          id="allergies"
          value={formData.allergies}
          onChange={(e) => handleChange("allergies", e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={updateAnimal.isPending || !formData.client_id || !formData.name}
        >
          {updateAnimal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function EditAnimalModal({ open, onOpenChange, animal }: EditAnimalModalProps) {
  if (!open || !animal) return null;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Modifier l'animal</DialogTitle>
        </DialogHeader>
        <EditAnimalForm animal={animal} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}