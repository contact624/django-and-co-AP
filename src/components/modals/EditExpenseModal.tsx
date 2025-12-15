import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses, EXPENSE_CATEGORY_LABELS, ExpenseCategory, ExpenseFormData, Expense } from "@/hooks/useExpenses";
import { ReceiptLink } from "@/components/ui/ReceiptLink";
import { Upload, X } from "lucide-react";

interface EditExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}

export function EditExpenseModal({ open, onOpenChange, expense }: EditExpenseModalProps) {
  const { updateExpense, uploadReceipt } = useExpenses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: "other",
    date: "",
    amount: 0,
    description: "",
    receipt_url: null,
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category,
        date: expense.date,
        amount: expense.amount,
        description: expense.description,
        receipt_url: expense.receipt_url,
      });
    }
  }, [expense]);

  if (!open || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let receiptUrl = formData.receipt_url;
      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile);
      }

      await updateExpense.mutateAsync({
        id: expense.id,
        data: {
          ...formData,
          receipt_url: receiptUrl,
        },
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setFormData({ ...formData, receipt_url: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Modifier la dépense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Montant (CHF)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Justificatif</Label>
            {receiptFile ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <span className="text-sm text-foreground flex-1 truncate">{receiptFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeReceipt}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : formData.receipt_url ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <ReceiptLink receiptPath={formData.receipt_url} showText />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeReceipt}
                  className="ml-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez pour ajouter</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
