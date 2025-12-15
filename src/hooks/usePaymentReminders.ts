/**
 * =====================================================
 * HOOK: RAPPELS DE PAIEMENT
 * =====================================================
 * 
 * Gère les rappels automatiques pour les factures en retard :
 * - Détection des factures overdue
 * - Génération des messages de rappel
 * - Historique des rappels envoyés
 * - Statistiques de recouvrement
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePaymentReminders, PaymentReminder } from "@/lib/business-rules";

// =====================================================
// TYPES
// =====================================================

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  total: number;
  dueDate: Date;
  daysPastDue: number;
  lastReminderDate?: Date;
  reminderCount: number;
}

export interface ReminderStats {
  totalOverdue: number;
  totalAmount: number;
  remindersSentToday: number;
  averageDaysOverdue: number;
  byReminderLevel: {
    first: number;
    second: number;
    final: number;
  };
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Récupère toutes les factures en retard
 */
export function useOverdueInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["overdue_invoices"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Récupérer les factures en retard
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          client_id,
          total,
          due_date,
          clients (
            first_name,
            last_name,
            email
          )
        `)
        .eq("status", "overdue")
        .lt("due_date", today)
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Récupérer les rappels existants
      const invoiceIds = invoices?.map(i => i.id) || [];
      
      let reminders: any[] = [];
      if (invoiceIds.length > 0) {
        const { data: reminderData } = await supabase
          .from("invoice_reminders")
          .select("invoice_id, sent_at, reminder_level")
          .in("invoice_id", invoiceIds)
          .order("sent_at", { ascending: false });
        
        reminders = reminderData || [];
      }

      // Transformer les données
      const overdueInvoices: OverdueInvoice[] = (invoices || []).map(invoice => {
        const dueDate = new Date(invoice.due_date);
        const daysPastDue = differenceInDays(new Date(), dueDate);
        
        // Trouver le dernier rappel
        const invoiceReminders = reminders.filter(r => r.invoice_id === invoice.id);
        const lastReminder = invoiceReminders[0];
        
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          clientId: invoice.client_id,
          clientName: invoice.clients 
            ? `${invoice.clients.first_name} ${invoice.clients.last_name}` 
            : 'Client inconnu',
          clientEmail: invoice.clients?.email || '',
          total: invoice.total || 0,
          dueDate,
          daysPastDue,
          lastReminderDate: lastReminder ? new Date(lastReminder.sent_at) : undefined,
          reminderCount: invoiceReminders.length,
        };
      });

      return overdueInvoices;
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  });
}

/**
 * Récupère les statistiques des rappels
 */
export function useReminderStats() {
  const { data: overdueInvoices } = useOverdueInvoices();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reminder_stats", overdueInvoices?.length],
    queryFn: async (): Promise<ReminderStats> => {
      if (!overdueInvoices) {
        return {
          totalOverdue: 0,
          totalAmount: 0,
          remindersSentToday: 0,
          averageDaysOverdue: 0,
          byReminderLevel: { first: 0, second: 0, final: 0 },
        };
      }

      const totalOverdue = overdueInvoices.length;
      const totalAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const averageDaysOverdue = totalOverdue > 0
        ? Math.round(overdueInvoices.reduce((sum, inv) => sum + inv.daysPastDue, 0) / totalOverdue)
        : 0;

      // Compter les rappels envoyés aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { count: remindersSentToday } = await supabase
        .from("invoice_reminders")
        .select("*", { count: 'exact', head: true })
        .gte("sent_at", `${today}T00:00:00`)
        .lte("sent_at", `${today}T23:59:59`);

      // Compter par niveau de rappel
      const byReminderLevel = { first: 0, second: 0, final: 0 };
      overdueInvoices.forEach(inv => {
        if (inv.reminderCount === 0) {
          byReminderLevel.first++;
        } else if (inv.reminderCount === 1) {
          byReminderLevel.second++;
        } else {
          byReminderLevel.final++;
        }
      });

      return {
        totalOverdue,
        totalAmount,
        remindersSentToday: remindersSentToday || 0,
        averageDaysOverdue,
        byReminderLevel,
      };
    },
    enabled: !!user && !!overdueInvoices,
  });
}

/**
 * Récupère l'historique des rappels pour une facture
 */
export function useInvoiceReminders(invoiceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invoice_reminders_history", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from("invoice_reminders")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!invoiceId,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Envoie un rappel de paiement
 */
export function useSendReminder() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      invoiceId: string;
      invoiceNumber: string;
      clientName: string;
      clientEmail: string;
      amount: number;
      dueDate: Date;
      reminderLevel: 'first' | 'second' | 'final';
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { invoiceId, invoiceNumber, clientName, clientEmail, amount, dueDate, reminderLevel } = params;

      // Générer le message de rappel
      const daysPastDue = differenceInDays(new Date(), dueDate);
      const reminder = generatePaymentReminders({
        overdueInvoices: [{
          id: invoiceId,
          invoiceNumber,
          clientId: '',
          clientName,
          clientEmail,
          total: amount,
          dueDate,
          lastReminderDate: undefined,
          reminderCount: reminderLevel === 'first' ? 0 : reminderLevel === 'second' ? 1 : 2,
        }],
      })[0];

      if (!reminder) throw new Error("Impossible de générer le rappel");

      // Enregistrer le rappel
      const { data, error } = await supabase
        .from("invoice_reminders")
        .insert({
          user_id: user.id,
          invoice_id: invoiceId,
          reminder_level: reminderLevel === 'first' ? 1 : reminderLevel === 'second' ? 2 : 3,
          sent_via: 'manual',
          recipient_email: clientEmail,
          message_content: reminder.templateMessage,
          delivery_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Ici, on pourrait intégrer l'envoi réel d'email via une Edge Function
      // Pour l'instant, on marque comme "sent" manuellement

      return { reminder: data, message: reminder.templateMessage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["overdue_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reminder_stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoice_reminders_history"] });

      toast({
        title: "Rappel préparé",
        description: "Le message de rappel est prêt à être envoyé.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel.",
        variant: "destructive",
      });
      console.error("Error sending reminder:", error);
    },
  });
}

/**
 * Marque une facture comme payée
 */
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overdue_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["reminder_stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });

      toast({
        title: "Facture payée",
        description: "La facture a été marquée comme payée.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
      console.error("Error marking invoice paid:", error);
    },
  });
}

/**
 * Met à jour automatiquement les factures en retard
 */
export function useUpdateOverdueStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const today = new Date().toISOString().split('T')[0];

      // Trouver les factures "sent" dont la date d'échéance est passée
      const { data: invoicesToUpdate, error: fetchError } = await supabase
        .from("invoices")
        .select("id")
        .eq("status", "sent")
        .lt("due_date", today);

      if (fetchError) throw fetchError;

      if (!invoicesToUpdate || invoicesToUpdate.length === 0) {
        return { updated: 0 };
      }

      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .in("id", invoicesToUpdate.map(i => i.id));

      if (updateError) throw updateError;

      return { updated: invoicesToUpdate.length };
    },
    onSuccess: (result) => {
      if (result.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ["overdue_invoices"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });

        toast({
          title: "Statuts mis à jour",
          description: `${result.updated} facture(s) marquée(s) en retard.`,
        });
      }
    },
  });
}
