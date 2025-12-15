import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number | null;
  total: number | null;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithRelations extends Invoice {
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

export interface InvoiceLine {
  id: string;
  user_id: string;
  invoice_id: string;
  activity_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number | null;
  created_at: string;
}

export interface CreateInvoiceData {
  client_id: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  activity_ids: string[];
}

export interface UpdateInvoiceData {
  id: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  activity_ids: string[];
  previous_activity_ids: string[];
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
};

export function useInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            email,
            phone,
            address
          )
        `)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      return data as InvoiceWithRelations[];
    },
    enabled: !!user,
  });
}

export function useInvoice(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            email,
            phone,
            address
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as InvoiceWithRelations | null;
    },
    enabled: !!user && !!id,
  });
}

export function useInvoiceLines(invoiceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoice_lines", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as InvoiceLine[];
    },
    enabled: !!user && !!invoiceId,
  });
}

export function useNextInvoiceNumber() {
  const { user } = useAuth();
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["next_invoice_number"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const prefix = profile?.invoice_prefix || "F-";

      // Get all invoices from the current year
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", `${prefix}${currentYear}-%`)
        .order("invoice_number", { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].invoice_number;
        const parts = lastNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1;
        }
      }

      return `${prefix}${currentYear}-${nextNumber.toString().padStart(3, "0")}`;
    },
    enabled: !!user,
  });
}

export function useUnbilledActivities(clientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unbilled_activities", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          animals (name)
        `)
        .eq("client_id", clientId)
        .eq("status", "done")
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!clientId,
  });
}

// Get activities that are either already linked to this invoice OR are unbilled (done status)
export function useInvoiceActivities(clientId: string | undefined, invoiceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoice_activities", clientId, invoiceId],
    queryFn: async () => {
      if (!clientId) return [];

      // Get invoice lines to find linked activity IDs
      let linkedActivityIds: string[] = [];
      if (invoiceId) {
        const { data: lines, error: linesError } = await supabase
          .from("invoice_lines")
          .select("activity_id")
          .eq("invoice_id", invoiceId);

        if (linesError) throw linesError;
        linkedActivityIds = lines?.map((l) => l.activity_id).filter(Boolean) as string[];
      }

      // Get activities that are either linked to this invoice OR unbilled
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          animals (name)
        `)
        .eq("client_id", clientId)
        .or(`status.eq.done,id.in.(${linkedActivityIds.length > 0 ? linkedActivityIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      if (!user) throw new Error("User not authenticated");

      // Get next invoice number using profile prefix
      const currentYear = new Date().getFullYear();
      const prefix = profile?.invoice_prefix || "F-";

      const { data: existingInvoices, error: fetchError } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", `${prefix}${currentYear}-%`)
        .order("invoice_number", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let nextNumber = 1;
      if (existingInvoices && existingInvoices.length > 0) {
        const lastNumber = existingInvoices[0].invoice_number;
        const parts = lastNumber.split("-");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1;
        }
      }

      const invoiceNumber = `${prefix}${currentYear}-${nextNumber.toString().padStart(3, "0")}`;
      // Create the invoice (tax_amount and total are generated columns)
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          client_id: data.client_id,
          invoice_number: invoiceNumber,
          issue_date: data.issue_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          tax_rate: data.tax_rate,
          notes: data.notes || null,
          status: "draft",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Get activities data for creating invoice lines
      const { data: activities, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .in("id", data.activity_ids);

      if (activitiesError) throw activitiesError;

      // Create invoice lines (total is a generated column)
      if (activities && activities.length > 0) {
        const invoiceLines = activities.map((activity) => ({
          user_id: user.id,
          invoice_id: invoice.id,
          activity_id: activity.id,
          description: `${activity.service_type} - ${activity.scheduled_date}`,
          quantity: activity.quantity,
          unit_price: activity.unit_price,
        }));

        const { error: linesError } = await supabase
          .from("invoice_lines")
          .insert(invoiceLines);

        if (linesError) throw linesError;
      }

      // Update activities status to "invoiced"
      if (data.activity_ids.length > 0) {
        const { error: updateError } = await supabase
          .from("activities")
          .update({ status: "invoiced" })
          .in("id", data.activity_ids);

        if (updateError) throw updateError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recentInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["next_invoice_number"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      toast({
        title: "Facture créée",
        description: "La facture a été créée avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture.",
        variant: "destructive",
      });
      console.error("Error creating invoice:", error);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateInvoiceData) => {
      if (!user) throw new Error("User not authenticated");

      // Update the invoice (tax_amount and total are generated columns)
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .update({
          client_id: data.client_id,
          issue_date: data.issue_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          tax_rate: data.tax_rate,
          notes: data.notes,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Find activities to unlink (were linked but not anymore)
      const activitiesToUnlink = data.previous_activity_ids.filter(
        (id) => !data.activity_ids.includes(id)
      );

      // Find activities to link (new ones)
      const activitiesToLink = data.activity_ids.filter(
        (id) => !data.previous_activity_ids.includes(id)
      );

      // Unlink old activities: set status back to "done"
      if (activitiesToUnlink.length > 0) {
        const { error: unlinkError } = await supabase
          .from("activities")
          .update({ status: "done" })
          .in("id", activitiesToUnlink);

        if (unlinkError) throw unlinkError;

        // Delete old invoice lines for these activities
        const { error: deleteLinesError } = await supabase
          .from("invoice_lines")
          .delete()
          .eq("invoice_id", data.id)
          .in("activity_id", activitiesToUnlink);

        if (deleteLinesError) throw deleteLinesError;
      }

      // Link new activities: set status to "invoiced" and create invoice lines
      if (activitiesToLink.length > 0) {
        const { error: linkError } = await supabase
          .from("activities")
          .update({ status: "invoiced" })
          .in("id", activitiesToLink);

        if (linkError) throw linkError;

        // Get activities data for creating invoice lines
        const { data: activities, error: activitiesError } = await supabase
          .from("activities")
          .select("*")
          .in("id", activitiesToLink);

        if (activitiesError) throw activitiesError;

        if (activities && activities.length > 0) {
          const invoiceLines = activities.map((activity) => ({
            user_id: user.id,
            invoice_id: data.id,
            activity_id: activity.id,
            description: `${activity.service_type} - ${activity.scheduled_date}`,
            quantity: activity.quantity,
            unit_price: activity.unit_price,
          }));

          const { error: linesError } = await supabase
            .from("invoice_lines")
            .insert(invoiceLines);

          if (linesError) throw linesError;
        }
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recentInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      queryClient.invalidateQueries({ queryKey: ["invoice_activities"] });
      queryClient.invalidateQueries({ queryKey: ["invoice_lines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      toast({
        title: "Facture modifiée",
        description: "La facture a été mise à jour avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la facture.",
        variant: "destructive",
      });
      console.error("Error updating invoice:", error);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaymentStatus }) => {
      const { data: invoice, error } = await supabase
        .from("invoices")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recentInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la facture a été modifié.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut.",
        variant: "destructive",
      });
      console.error("Error updating invoice:", error);
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the invoice lines to find associated activities
      const { data: lines, error: linesError } = await supabase
        .from("invoice_lines")
        .select("activity_id")
        .eq("invoice_id", id);

      if (linesError) throw linesError;

      // Update activities back to "done" status
      const activityIds = lines?.map((l) => l.activity_id).filter(Boolean) as string[];
      if (activityIds.length > 0) {
        const { error: updateError } = await supabase
          .from("activities")
          .update({ status: "done" })
          .in("id", activityIds);

        if (updateError) throw updateError;
      }

      // Delete invoice lines
      const { error: deleteLinesError } = await supabase
        .from("invoice_lines")
        .delete()
        .eq("invoice_id", id);

      if (deleteLinesError) throw deleteLinesError;

      // Delete the invoice
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recentInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries({ queryKey: ["unbilled_activities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la facture.",
        variant: "destructive",
      });
      console.error("Error deleting invoice:", error);
    },
  });
}
