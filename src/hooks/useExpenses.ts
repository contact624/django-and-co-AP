import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ExpenseCategory = 
  | "fuel"
  | "vehicle_maintenance"
  | "dog_equipment"
  | "insurance"
  | "phone"
  | "accounting"
  | "training"
  | "other";

export interface Expense {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  date: string;
  amount: number;
  description: string;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFormData {
  category: ExpenseCategory;
  date: string;
  amount: number;
  description: string;
  receipt_url?: string | null;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Carburant",
  vehicle_maintenance: "Entretien véhicule",
  dog_equipment: "Matériel canin",
  insurance: "Assurances",
  phone: "Téléphone",
  accounting: "Comptabilité",
  training: "Formation",
  other: "Autre",
};

export function useExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const { data: newExpense, error } = await supabase
        .from("expenses")
        .insert({
          ...data,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return newExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Dépense ajoutée");
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast.error("Erreur lors de l'ajout de la dépense");
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseFormData }) => {
      const { data: updatedExpense, error } = await supabase
        .from("expenses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Dépense modifiée");
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      toast.error("Erreur lors de la modification");
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      // First, get the expense to check for receipt
      const { data: expense } = await supabase
        .from("expenses")
        .select("receipt_url")
        .eq("id", id)
        .single();

      // Delete receipt from storage if exists
      if (expense?.receipt_url) {
        // receipt_url now stores just the file path, not the full URL
        await supabase.storage.from("receipts").remove([expense.receipt_url]);
      }

      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsStats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Dépense supprimée");
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  // Upload receipt and return the file path (not a public URL)
  const uploadReceipt = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Error uploading receipt:", uploadError);
      toast.error("Erreur lors de l'upload du justificatif");
      return null;
    }

    // Return the file path, not a public URL
    return fileName;
  };

  // Generate a signed URL for viewing a receipt (valid for 1 hour)
  const getReceiptSignedUrl = async (filePath: string): Promise<string | null> => {
    if (!filePath) return null;

    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  };

  return {
    expenses: expensesQuery.data || [],
    isLoading: expensesQuery.isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    uploadReceipt,
    getReceiptSignedUrl,
  };
}
