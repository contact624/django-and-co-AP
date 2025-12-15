import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Checkbox } from "@/components/ui/checkbox";
import { useClients } from "@/hooks/useClients";
import { useInvoice, useInvoiceActivities, useUpdateInvoice } from "@/hooks/useInvoices";
import { SERVICE_TYPE_LABELS } from "@/hooks/useActivities";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, FileText, Calendar, User, Check, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading: invoiceLoading } = useInvoice(id);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const updateInvoice = useUpdateInvoice();

  const [clientId, setClientId] = useState<string>("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: availableActivities = [], isLoading: activitiesLoading } = useInvoiceActivities(
    clientId || undefined,
    id
  );

  const isReadOnly = invoice?.status === "paid" || invoice?.status === "overdue";

  // Initialize form with invoice data
  useEffect(() => {
    if (invoice && !isInitialized) {
      setClientId(invoice.client_id);
      setIssueDate(invoice.issue_date);
      setDueDate(invoice.due_date);
      setNotes(invoice.notes || "");
      setIsInitialized(true);
    }
  }, [invoice, isInitialized]);

  // Set selected activities when available activities load
  useEffect(() => {
    if (availableActivities.length > 0 && isInitialized && selectedActivityIds.length === 0) {
      const linkedActivityIds = availableActivities
        .filter((a) => a.status === "invoiced")
        .map((a) => a.id);
      setSelectedActivityIds(linkedActivityIds);
    }
  }, [availableActivities, isInitialized, selectedActivityIds.length]);

  const handleActivityToggle = (activityId: string) => {
    if (isReadOnly) return;
    setSelectedActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleSelectAll = () => {
    if (isReadOnly) return;
    if (selectedActivityIds.length === availableActivities.length) {
      setSelectedActivityIds([]);
    } else {
      setSelectedActivityIds(availableActivities.map((a) => a.id));
    }
  };

  const { subtotal, taxRate, taxAmount, total } = useMemo(() => {
    const selected = availableActivities.filter((a) =>
      selectedActivityIds.includes(a.id)
    );
    const sub = selected.reduce(
      (sum, a) => sum + (a.total_price || a.unit_price * a.quantity),
      0
    );
    const rate = invoice?.tax_rate || 0;
    const tax = sub * (rate / 100);
    const tot = sub + tax;
    return { subtotal: sub, taxRate: rate, taxAmount: tax, total: tot };
  }, [availableActivities, selectedActivityIds, invoice?.tax_rate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !clientId || selectedActivityIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client et au moins une activité.",
        variant: "destructive",
      });
      return;
    }

    try {
      const previouslyLinkedIds = availableActivities
        .filter((a) => a.status === "invoiced")
        .map((a) => a.id);

      await updateInvoice.mutateAsync({
        id,
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
        activity_ids: selectedActivityIds,
        previous_activity_ids: previouslyLinkedIds,
      });

      navigate(`/invoices/${id}`);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la facture. Vérifiez votre connexion et réessayez.",
        variant: "destructive",
      });
    }
  };

  if (invoiceLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl animate-fade-up">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Facture non trouvée</p>
          <GlassButton onClick={() => navigate("/invoices")} className="mt-4">
            Retour aux factures
          </GlassButton>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/invoices/${id}`)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Modifier {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">
              {invoice.clients?.first_name} {invoice.clients?.last_name}
            </p>
          </div>
        </div>

        {isReadOnly && (
          <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Les factures payées ou en retard ne peuvent plus être modifiées.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <GlassCard className="p-6 space-y-6">
            {/* Client Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Client *
                </label>
                {clientsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    required
                    disabled={isReadOnly}
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de facture
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={issueDate}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Activities Selection */}
            {clientId && !isReadOnly && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Activités {!activitiesLoading && `(${availableActivities.length} disponibles)`}
                  </label>
                  {availableActivities.length > 0 && !activitiesLoading && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedActivityIds.length === availableActivities.length
                        ? "Tout désélectionner"
                        : "Tout sélectionner"}
                    </button>
                  )}
                </div>

                {activitiesLoading ? (
                  <div className="p-6 text-center bg-muted/30 rounded-lg border border-border">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-muted-foreground text-sm">Chargement des activités...</p>
                  </div>
                ) : availableActivities.length === 0 ? (
                  <div className="p-6 text-center bg-muted/30 rounded-lg border border-border">
                    <p className="text-muted-foreground">
                      Aucune activité disponible pour ce client
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="w-10 px-3 py-2"></th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                            Date
                          </th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                            Service
                          </th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                            Animal
                          </th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">
                            Durée
                          </th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {availableActivities.map((activity) => (
                          <tr
                            key={activity.id}
                            className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                              selectedActivityIds.includes(activity.id)
                                ? "bg-primary/10"
                                : ""
                            }`}
                            onClick={() => handleActivityToggle(activity.id)}
                          >
                            <td className="px-3 py-2">
                              <Checkbox
                                checked={selectedActivityIds.includes(activity.id)}
                                onCheckedChange={() => handleActivityToggle(activity.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {format(new Date(activity.scheduled_date), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {SERVICE_TYPE_LABELS[activity.service_type]}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {activity.animals?.name || "-"}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {activity.duration_minutes} min
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-foreground">
                              {(activity.total_price || activity.unit_price * activity.quantity).toFixed(2)} CHF
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {selectedActivityIds.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-3">Récapitulatif</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Sous-total ({selectedActivityIds.length} activité
                      {selectedActivityIds.length > 1 ? "s" : ""})
                    </span>
                    <span className="text-foreground">{subtotal.toFixed(2)} CHF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA ({taxRate}%)</span>
                    <span className="text-foreground">{taxAmount.toFixed(2)} CHF</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-semibold">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary text-lg">{total.toFixed(2)} CHF</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
                placeholder="Notes internes..."
                disabled={isReadOnly}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <GlassButton type="button" onClick={() => navigate(`/invoices/${id}`)}>
                {isReadOnly ? "Retour" : "Annuler"}
              </GlassButton>
              {!isReadOnly && (
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={
                    !clientId ||
                    selectedActivityIds.length === 0 ||
                    updateInvoice.isPending
                  }
                >
                  {updateInvoice.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Enregistrer
                </GlassButton>
              )}
            </div>
          </GlassCard>
        </form>
      </div>
    </DashboardLayout>
  );
}