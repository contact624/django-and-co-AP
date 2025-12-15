import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Animal {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  microchip_number: string | null;
  allergies: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnimalWithClient extends Animal {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface CreateAnimalData {
  client_id: string;
  name: string;
  species?: string;
  breed?: string;
  birth_date?: string;
  microchip_number?: string;
  allergies?: string;
  notes?: string;
}

export function useAnimals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["animals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animals")
        .select(`
          *,
          clients (
            first_name,
            last_name
          )
        `)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as AnimalWithClient[];
    },
    enabled: !!user,
  });
}

export function useAnimalsByClient(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["animals", "client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .eq("client_id", clientId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Animal[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateAnimal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAnimalData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: animal, error } = await supabase
        .from("animals")
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return animal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Animal ajouté",
        description: "L'animal a été ajouté avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'animal.",
        variant: "destructive",
      });
      console.error("Error creating animal:", error);
    },
  });
}

export function useUpdateAnimal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Animal> & { id: string }) => {
      const { data: animal, error } = await supabase
        .from("animals")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return animal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Animal modifié",
        description: "Les informations ont été mises à jour.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'animal.",
        variant: "destructive",
      });
      console.error("Error updating animal:", error);
    },
  });
}

export function useDeleteAnimal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("animals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Animal supprimé",
        description: "L'animal a été supprimé.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'animal.",
        variant: "destructive",
      });
      console.error("Error deleting animal:", error);
    },
  });
}
