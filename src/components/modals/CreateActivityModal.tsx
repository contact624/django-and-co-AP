import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateActivity, CreateActivityData, SERVICE_TYPE_LABELS } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useAnimalsByClient } from "@/hooks/useAnimals";
import { Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type ActivityStatus = Database["public"]["Enums"]["activity_status"];

interface CreateActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

const SERVICE_TYPES: ServiceType[] = [
  "individual_walk",
  "group_walk",
  "custom_walk",
  "education",
  "dog_sitting",
  "transport",
  "other",
];

const getDefaultStatus = (dateStr: string): ActivityStatus => {
  const today = new Date().toISOString().split("T")[0];
  return dateStr > today ? "planned" : "done";
};

function CreateActivityForm({ 
  onClose, 
  defaultClientId 
}: { 
  onClose: () => void;
  defaultClientId?: string;
}) {
  const createActivity = useCreateActivity();
  const { data: clients } = useClients();
  
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || "");
  const { data: clientAnimals } = useAnimalsByClient(selectedClientId || null);
  
  const initialDate = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState<CreateActivityData & { status: ActivityStatus }>({
    client_id: defaultClientId || "",
    animal_id: null,
    service_type: "individual_walk",
    scheduled_date: initialDate,
    scheduled_time: "09:00",
    duration_minutes: 60,
    unit_price: 30,
    quantity: 1,
    notes: "",
    status: getDefaultStatus(initialDate),
  });

  useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId);
      setFormData((prev) => ({ ...prev, client_id: defaultClientId }));
    }
  }, [defaultClientId]);

  const handleDateChange = (newDate: string) => {
    setFormData((prev) => ({
      ...prev,
      scheduled_date: newDate,
      status: prev.status === "cancelled" ? "cancelled" : getDefaultStatus(newDate),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createActivity.mutateAsync({
      ...formData,
      client_id: selectedClientId,
    });
    
    onClose();
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setFormData((prev) => ({ ...prev, client_id: clientId, animal_id: null }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client_id">Client *</Label>
          <Select
            value={selectedClientId}
            onValueChange={handleClientChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
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
        <div className="space-y-2">
          <Label htmlFor="animal_id">Animal</Label>
          <Select
            value={formData.animal_id || "none"}
            onValueChange={(value) => 
              setFormData((prev) => ({ ...prev, animal_id: value === "none" ? null : value }))
            }
            disabled={!selectedClientId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optionnel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {clientAnimals?.map((animal) => (
                <SelectItem key={animal.id} value={animal.id}>
                  {animal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_type">Type de prestation *</Label>
        <Select
          value={formData.service_type}
          onValueChange={(value) => 
            setFormData((prev) => ({ ...prev, service_type: value as ServiceType }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Date *</Label>
          <Input
            id="scheduled_date"
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => handleDateChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_time">Heure</Label>
          <Input
            id="scheduled_time"
            type="time"
            value={formData.scheduled_time}
            onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_time: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as ActivityStatus }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planifiée</SelectItem>
            <SelectItem value="done">Réalisée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Durée (min)</Label>
          <Input
            id="duration_minutes"
            type="number"
            min="15"
            step="15"
            value={formData.duration_minutes}
            onChange={(e) => setFormData((prev) => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_price">Prix unitaire (CHF)</Label>
          <Input
            id="unit_price"
            type="number"
            min="0"
            step="0.50"
            value={formData.unit_price}
            onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantité</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold text-primary">
            {((formData.unit_price || 0) * (formData.quantity || 1)).toFixed(2)} CHF
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Remarques..."
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
          disabled={createActivity.isPending || !selectedClientId || !formData.scheduled_date}
        >
          {createActivity.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Créer l'activité
        </Button>
      </div>
    </form>
  );
}

export function CreateActivityModal({ open, onOpenChange, defaultClientId }: CreateActivityModalProps) {
  if (!open) return null;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Nouvelle activité</DialogTitle>
        </DialogHeader>
        <CreateActivityForm onClose={() => onOpenChange(false)} defaultClientId={defaultClientId} />
      </DialogContent>
    </Dialog>
  );
}