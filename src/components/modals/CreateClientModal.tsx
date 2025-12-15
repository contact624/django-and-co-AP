import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClient, CreateClientData } from "@/hooks/useClients";
import { Loader2 } from "lucide-react";

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateClientForm({ onClose }: { onClose: () => void }) {
  const createClient = useCreateClient();
  const [formData, setFormData] = useState<CreateClientData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createClient.mutateAsync(formData);
    
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    onClose();
  };

  const handleChange = (field: keyof CreateClientData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange("first_name", e.target.value)}
            required
            placeholder="Jean"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nom *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange("last_name", e.target.value)}
            required
            placeholder="Dupont"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="jean.dupont@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          placeholder="+41 79 123 45 67"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="Rue de la Gare 12, 1000 Lausanne"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Informations supplémentaires..."
          rows={3}
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
          disabled={createClient.isPending || !formData.first_name || !formData.last_name}
        >
          {createClient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Créer le client
        </Button>
      </div>
    </form>
  );
}

export function CreateClientModal({ open, onOpenChange }: CreateClientModalProps) {
  if (!open) return null;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Nouveau client</DialogTitle>
        </DialogHeader>
        <CreateClientForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
