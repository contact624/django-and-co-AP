import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type ActivityStatus = Database["public"]["Enums"]["activity_status"];

export interface Activity {
  id: string;
  user_id: string;
  client_id: string;
  animal_id: string | null;
  service_type: ServiceType;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  unit_price: number;
  quantity: number;
  total_price: number;
  status: ActivityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityWithRelations extends Activity {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  animals: {
    name: string;
  } | null;
}

export interface CreateActivityData {
  client_id: string;
  animal_id?: string | null;
  service_type: ServiceType;
  scheduled_date: string;
  scheduled_time?: string;
  duration_minutes: number;
  unit_price: number;
  quantity?: number;
  notes?: string;
  status?: ActivityStatus;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  individual_walk: "Balade individuelle",
  group_walk: "Balade groupée",
  custom_walk: "Balade sur mesure",
  education: "Éducation",
  dog_sitting: "Dog sitting",
  transport: "Transport",
  other: "Autre",
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  planned: "Planifiée",
  done: "Réalisée",
  invoiced: "Facturée",
  cancelled: "Annulée",
};

export function useActivities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          clients (
            first_name,
            last_name
          ),
          animals (
            name
          )
        `)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data as ActivityWithRelations[];
    },
    enabled: !!user,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateActivityData) => {
      if (!user) throw new Error("User not authenticated");

      const { data: activity, error } = await supabase
        .from("activities")
        .insert({
          ...data,
          user_id: user.id,
          animal_id: data.animal_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      toast({
        title: "Activité créée",
        description: "L'activité a été ajoutée avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'activité.",
        variant: "destructive",
      });
      console.error("Error creating activity:", error);
    },
  });
}

export function useUpdateActivityStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ActivityStatus }) => {
      const { data: activity, error } = await supabase
        .from("activities")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      toast({
        title: "Statut modifié",
        description: "Le statut de l'activité a été mis à jour.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut.",
        variant: "destructive",
      });
      console.error("Error updating activity:", error);
    },
  });
}

export interface UpdateActivityData {
  id: string;
  client_id?: string;
  animal_id?: string | null;
  service_type?: ServiceType;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  unit_price?: number;
  quantity?: number;
  status?: ActivityStatus;
  notes?: string;
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateActivityData) => {
      const { data: activity, error } = await supabase
        .from("activities")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      toast({
        title: "Activité modifiée",
        description: "L'activité a été mise à jour.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'activité.",
        variant: "destructive",
      });
      console.error("Error updating activity:", error);
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      toast({
        title: "Activité supprimée",
        description: "L'activité a été supprimée.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'activité.",
        variant: "destructive",
      });
      console.error("Error deleting activity:", error);
    },
  });
}
