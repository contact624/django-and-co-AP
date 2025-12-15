import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRecentInvoices } from "@/hooks/useDashboardStats";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentInvoices() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useRecentInvoices();

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Dernières factures</h3>
        <button
          onClick={() => navigate('/invoices')}
          className="text-sm text-primary hover:underline"
        >
          Voir tout
        </button>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => {
          const clientName = invoice.clients 
            ? `${invoice.clients.first_name} ${invoice.clients.last_name}`
            : "Client inconnu";
          const invoiceNum = invoice.invoice_number.split('-')[2] || invoice.invoice_number;

          return (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-medium text-accent">
                  {invoiceNum}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {invoice.invoice_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clientName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {(invoice.total || 0).toFixed(2)} CHF
                </p>
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          );
        })}

        {invoices.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucune facture récente
          </p>
        )}
      </div>
    </GlassCard>
  );
}
