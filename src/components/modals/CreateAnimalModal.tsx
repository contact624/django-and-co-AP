import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAnimal, CreateAnimalData } from "@/hooks/useAnimals";
import { useClients } from "@/hooks/useClients";
import { Loader2 } from "lucide-react";

interface CreateAnimalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

function CreateAnimalForm({ 
  onClose, 
  defaultClientId 
}: { 
  onClose: () => void;
  defaultClientId?: string;
}) {
  const createAnimal = useCreateAnimal();
  const { data: clients } = useClients();
  
  const [formData, setFormData] = useState<CreateAnimalData>({
    client_id: defaultClientId || "",
    name: "",
    species: "dog",
    breed: "",
    birth_date: "",
    microchip_number: "",
    allergies: "",
    notes: "",
  });

  useEffect(() => {
    if (defaultClientId) {
      setFormData((prev) => ({ ...prev, client_id: defaultClientId }));
    }
  }, [defaultClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createAnimal.mutateAsync(formData);
    onClose();
  };

  const handleChange = (field: keyof CreateAnimalData, value: string) => {
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
            placeholder="Max"
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
            placeholder="Labrador"
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
          placeholder="756 0000 0000 0000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergies">Allergies / Particularités</Label>
        <Textarea
          id="allergies"
          value={formData.allergies}
          onChange={(e) => handleChange("allergies", e.target.value)}
          placeholder="Allergies, problèmes de santé..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Comportement, préférences..."
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
          disabled={createAnimal.isPending || !formData.client_id || !formData.name}
        >
          {createAnimal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Ajouter l'animal
        </Button>
      </div>
    </form>
  );
}

export function CreateAnimalModal({ open, onOpenChange, defaultClientId }: CreateAnimalModalProps) {
  if (!open) return null;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Nouvel animal</DialogTitle>
        </DialogHeader>
        <CreateAnimalForm onClose={() => onOpenChange(false)} defaultClientId={defaultClientId} />
      </DialogContent>
    </Dialog>
  );
}