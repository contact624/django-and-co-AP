import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useInvoice, useInvoiceLines, useUpdateInvoiceStatus, PAYMENT_STATUS_LABELS } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { SERVICE_TYPE_LABELS } from "@/hooks/useActivities";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Send, Check, FileText, Building, User, Calendar, Download, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: invoice, isLoading: invoiceLoading } = useInvoice(id);
  const { data: lines = [], isLoading: linesLoading } = useInvoiceLines(id);
  const updateStatus = useUpdateInvoiceStatus();

  const isLoading = invoiceLoading || linesLoading;

  const handleMarkAsSent = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: "sent" });
  };

  const handleMarkAsPaid = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: "paid" });
  };

  const handleDownloadPdf = async () => {
    if (!invoice || !invoice.clients) return;

    try {
      await generateInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        subtotal: invoice.subtotal,
        taxRate: invoice.tax_rate,
        taxAmount: invoice.tax_amount,
        total: invoice.total,
        notes: invoice.notes,
        client: {
          firstName: invoice.clients.first_name,
          lastName: invoice.clients.last_name,
          email: invoice.clients.email,
          phone: invoice.clients.phone,
          address: invoice.clients.address,
        },
        company: {
          name: profile?.company_name || "Mon entreprise",
          ownerName: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : null,
          notes: (profile as any)?.company_notes || null,
          address: profile?.address || null,
          email: profile?.email || null,
          phone: profile?.phone || null,
          iban: profile?.iban || null,
          paymentDelayDays: profile?.payment_delay_days || 30,
        },
        lines: lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          total: line.total || line.unit_price * line.quantity,
        })),
      });

      toast({
        title: "PDF téléchargé",
        description: `La facture ${invoice.invoice_number} a été téléchargée.`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    }
  };

  // Determine display status (check overdue)
  const getDisplayStatus = () => {
    if (!invoice) return "draft";
    if (invoice.status !== "paid") {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        return "overdue";
      }
    }
    return invoice.status;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl animate-fade-up">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
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

  const displayStatus = getDisplayStatus();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/invoices")}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {invoice.invoice_number}
                </h1>
                <StatusBadge status={displayStatus} />
              </div>
              <p className="text-muted-foreground">
                {invoice.clients?.first_name} {invoice.clients?.last_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <GlassButton onClick={handleDownloadPdf}>
              <Download className="w-4 h-4" />
              Télécharger PDF
            </GlassButton>
            {(invoice.status === "draft" || invoice.status === "sent") && (
              <GlassButton
                onClick={() => navigate(`/invoices/${id}/edit`)}
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </GlassButton>
            )}
            {invoice.status === "draft" && (
              <GlassButton
                onClick={handleMarkAsSent}
                disabled={updateStatus.isPending}
              >
                <Send className="w-4 h-4" />
                Marquer comme envoyée
              </GlassButton>
            )}
            {(invoice.status === "sent" || displayStatus === "overdue") && (
              <GlassButton
                variant="primary"
                onClick={handleMarkAsPaid}
                disabled={updateStatus.isPending}
              >
                <Check className="w-4 h-4" />
                Marquer comme payée
              </GlassButton>
            )}
          </div>
        </div>

        {/* Invoice Document */}
        <GlassCard className="p-8">
          {/* Header with company and invoice info */}
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 pb-6 border-b border-border">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  {profile?.company_name || "Mon entreprise"}
                </h3>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {profile?.address && <p>{profile.address}</p>}
                {profile?.email && <p>{profile.email}</p>}
                {profile?.phone && <p>{profile.phone}</p>}
                {profile?.iban && (
                  <p className="font-mono text-xs mt-2">IBAN: {profile.iban}</p>
                )}
              </div>
            </div>

            {/* Invoice Info */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground text-xl">
                  FACTURE
                </h3>
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                {invoice.invoice_number}
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date: {format(new Date(invoice.issue_date), "dd MMMM yyyy", { locale: fr })}
                </p>
                <p>
                  Échéance: {format(new Date(invoice.due_date), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-accent" />
              <h4 className="font-medium text-muted-foreground uppercase text-sm tracking-wide">
                Facturer à
              </h4>
            </div>
            <div className="text-foreground">
              <p className="font-semibold text-lg">
                {invoice.clients?.first_name} {invoice.clients?.last_name}
              </p>
              {invoice.clients?.address && (
                <p className="text-muted-foreground">{invoice.clients.address}</p>
              )}
              {invoice.clients?.email && (
                <p className="text-muted-foreground text-sm">{invoice.clients.email}</p>
              )}
              {invoice.clients?.phone && (
                <p className="text-muted-foreground text-sm">{invoice.clients.phone}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-right py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Qté
                  </th>
                  <th className="text-right py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Prix unitaire
                  </th>
                  <th className="text-right py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {lines.map((line) => {
                  // Parse the description to get service type
                  const [serviceType, dateStr] = line.description.split(" - ");
                  const formattedService =
                    SERVICE_TYPE_LABELS[serviceType as keyof typeof SERVICE_TYPE_LABELS] ||
                    serviceType;

                  return (
                    <tr key={line.id}>
                      <td className="py-3">
                        <p className="text-foreground">{formattedService}</p>
                        {dateStr && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(dateStr), "dd/MM/yyyy", { locale: fr })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {line.quantity}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {line.unit_price.toFixed(2)} CHF
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {(line.total || line.unit_price * line.quantity).toFixed(2)} CHF
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="text-foreground">{invoice.subtotal.toFixed(2)} CHF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA ({invoice.tax_rate}%)</span>
                <span className="text-foreground">
                  {(invoice.tax_amount || 0).toFixed(2)} CHF
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border text-lg font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-primary">
                  {(invoice.total || invoice.subtotal).toFixed(2)} CHF
                </span>
              </div>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground italic text-center">
              Entreprise non assujettie à la TVA selon art. 10 LTVA.
            </p>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
              <p className="text-sm text-foreground">{invoice.notes}</p>
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
