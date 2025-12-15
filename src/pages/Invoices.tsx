import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { useInvoices, useDeleteInvoice, useInvoiceLines, InvoiceWithRelations } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, Plus, Eye, FileText, Pencil, Trash2, Download, 
  CalendarIcon, Archive, CheckSquare, Square, Loader2, X 
} from "lucide-react";
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ExportInvoice, 
  ExportPeriod, 
  getPeriodLabel, 
  generateInvoicesZip, 
  generateInvoicesCsv, 
  downloadBlob, 
  downloadCsv 
} from "@/lib/exportUtils";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export default function Invoices() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<ExportPeriod | "all">("all");
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const { data: invoices = [], isLoading } = useInvoices();
  const deleteInvoice = useDeleteInvoice();

  // Get display status (check overdue)
  const getDisplayStatus = (invoice: typeof invoices[0]): PaymentStatus => {
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

  // Get period date range
  const getPeriodRange = (period: ExportPeriod | "all"): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (period) {
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        if (customDateStart && customDateEnd) {
          return { start: customDateStart, end: customDateEnd };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter - by name, invoice number, or date
      const clientName = `${invoice.clients?.first_name || ""} ${invoice.clients?.last_name || ""}`.toLowerCase();
      const invoiceDate = format(new Date(invoice.issue_date), "dd/MM/yyyy");
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.includes(searchTerm.toLowerCase()) ||
        invoiceDate.includes(searchTerm);
      
      // Status filter
      const displayStatus = getDisplayStatus(invoice);
      const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
      
      // Period filter
      let matchesPeriod = true;
      const periodRange = getPeriodRange(periodFilter);
      if (periodRange) {
        const invoiceDate = new Date(invoice.issue_date);
        matchesPeriod = isWithinInterval(invoiceDate, { start: periodRange.start, end: periodRange.end });
      }
      
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [invoices, searchTerm, statusFilter, periodFilter, customDateStart, customDateEnd]);

  // Summary stats
  const pendingInvoices = filteredInvoices.filter((i) => {
    const status = getDisplayStatus(i);
    return status === "sent" || status === "overdue" || status === "draft";
  });
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.total || i.subtotal), 0);
  
  const paidInvoices = filteredInvoices.filter((i) => i.status === "paid");
  const paidAmount = paidInvoices.reduce((sum, i) => sum + (i.total || i.subtotal), 0);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Prepare invoice data for export
  const prepareExportData = async (invoiceIds: string[]): Promise<ExportInvoice[]> => {
    const exportData: ExportInvoice[] = [];
    
    for (const id of invoiceIds) {
      const invoice = invoices.find((i) => i.id === id);
      if (!invoice) continue;
      
      // Fetch lines for this invoice
      const { data: lines } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", id);
      
      exportData.push({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        subtotal: invoice.subtotal,
        taxRate: invoice.tax_rate,
        taxAmount: invoice.tax_amount,
        total: invoice.total,
        status: getDisplayStatus(invoice),
        notes: invoice.notes,
        client: {
          firstName: invoice.clients?.first_name || "",
          lastName: invoice.clients?.last_name || "",
          email: invoice.clients?.email || null,
          address: invoice.clients?.address || null,
        },
        company: {
          name: profile?.company_name || "",
          ownerName: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : null,
          notes: (profile as any)?.company_notes || null,
          address: profile?.address || null,
          email: profile?.email || null,
          phone: profile?.phone || null,
          iban: profile?.iban || null,
        },
        lines: (lines || []).map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          total: line.total || line.quantity * line.unit_price,
        })),
      });
    }
    
    return exportData;
  };

  // Export handlers
  const handleExportZip = async () => {
    const idsToExport = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : filteredInvoices.map((i) => i.id);
    
    if (idsToExport.length === 0) {
      toast({ title: "Aucune facture à exporter", variant: "destructive" });
      return;
    }
    
    setIsExporting(true);
    setExportProgress({ current: 0, total: idsToExport.length });
    
    try {
      const exportData = await prepareExportData(idsToExport);
      const zipBlob = await generateInvoicesZip(exportData, (current, total) => {
        setExportProgress({ current, total });
      });
      
      const periodLabel = periodFilter !== "all" 
        ? getPeriodLabel(periodFilter, customDateStart, customDateEnd).replace(/\//g, "-") 
        : "toutes";
      downloadBlob(zipBlob, `factures_${periodLabel}.zip`);
      
      toast({ 
        title: "Export terminé", 
        description: `${idsToExport.length} facture(s) exportée(s)` 
      });
      clearSelection();
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Erreur lors de l'export", variant: "destructive" });
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const handleExportCsv = async () => {
    const idsToExport = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : filteredInvoices.map((i) => i.id);
    
    if (idsToExport.length === 0) {
      toast({ title: "Aucune facture à exporter", variant: "destructive" });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const exportData = await prepareExportData(idsToExport);
      const csvContent = generateInvoicesCsv(exportData);
      
      const periodLabel = periodFilter !== "all" 
        ? getPeriodLabel(periodFilter, customDateStart, customDateEnd).replace(/\//g, "-") 
        : "toutes";
      downloadCsv(csvContent, `factures_${periodLabel}.csv`);
      
      toast({ 
        title: "Export terminé", 
        description: `${idsToExport.length} facture(s) exportée(s) en CSV` 
      });
      clearSelection();
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Erreur lors de l'export", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditClick = (invoice: InvoiceWithRelations, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/invoices/${invoice.id}/edit`);
  };

  const handleDeleteClick = (invoice: InvoiceWithRelations, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;

    if (selectedInvoice.status === "paid") {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer une facture déjà payée.",
        variant: "destructive",
      });
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      await deleteInvoice.mutateAsync(selectedInvoice.id);
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      // Error handled by the mutation
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Factures</h1>
            <p className="text-muted-foreground">Gérez vos factures et paiements</p>
          </div>
          <GlassButton variant="primary" onClick={() => navigate("/invoices/new")}>
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </GlassButton>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-5 hover:border-yellow-500/30 transition-colors">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">En attente</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl lg:text-3xl font-bold text-yellow-400">{pendingAmount.toFixed(0)} CHF</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {pendingInvoices.length} facture{pendingInvoices.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </GlassCard>
          <GlassCard className="p-5 hover:border-success/30 transition-colors">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Payées</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl lg:text-3xl font-bold text-success">{paidAmount.toFixed(0)} CHF</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {paidInvoices.length} facture{paidInvoices.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </GlassCard>
          <GlassCard className="p-5 hover:border-primary/30 transition-colors">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total période</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl lg:text-3xl font-bold text-foreground">
                  {(pendingAmount + paidAmount).toFixed(0)} CHF
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {filteredInvoices.length} facture{filteredInvoices.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </GlassCard>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-col gap-4">
          {/* First row: Search and filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="N° facture, client, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as ExportPeriod | "all")}
              className="px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="all">Toutes les périodes</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
              <option value="custom">Période personnalisée</option>
            </select>
            
            {periodFilter === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {customDateStart ? format(customDateStart, "dd/MM/yyyy") : "Début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateStart}
                      onSelect={setCustomDateStart}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {customDateEnd ? format(customDateEnd, "dd/MM/yyyy") : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateEnd}
                      onSelect={setCustomDateEnd}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Second row: Selection and export buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSelectAll}
                className="gap-2"
              >
                {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedIds.size > 0 ? `${selectedIds.size} sélectionnée(s)` : "Tout sélectionner"}
              </Button>
              {selectedIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isExporting || filteredInvoices.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportZip}
                disabled={isExporting || filteredInvoices.length === 0}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {exportProgress.total > 0 
                      ? `${exportProgress.current}/${exportProgress.total}` 
                      : "Préparation..."}
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Export PDF (ZIP)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Invoices table */}
        <GlassCard className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent hover:shadow-none">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Échéance</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const displayStatus = getDisplayStatus(invoice);
                  const canEdit = invoice.status === "draft" || invoice.status === "sent";
                  const canDelete = invoice.status !== "paid";
                  const isSelected = selectedIds.has(invoice.id);

                  return (
                    <TableRow
                      key={invoice.id}
                      className={`group cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(invoice.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground">
                            {invoice.invoice_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {invoice.clients?.first_name} {invoice.clients?.last_name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-foreground">
                          {(invoice.total || invoice.subtotal).toFixed(0)} CHF
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={displayStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${invoice.id}`);
                            }}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleEditClick(invoice, e)}
                            className={`p-2 rounded-lg transition-colors ${
                              canEdit
                                ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                                : "text-muted-foreground/30 cursor-not-allowed"
                            }`}
                            title={canEdit ? "Modifier" : "Modification impossible"}
                            disabled={!canEdit}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(invoice, e)}
                            className={`p-2 rounded-lg transition-colors ${
                              canDelete
                                ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                : "text-muted-foreground/30 cursor-not-allowed"
                            }`}
                            title={canDelete ? "Supprimer" : "Suppression impossible"}
                            disabled={!canDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune facture trouvée</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all" || periodFilter !== "all"
                  ? "Essayez de modifier vos filtres"
                  : "Créez votre première facture en cliquant sur \"Nouvelle facture\""}
              </p>
            </div>
          )}
        </GlassCard>
      </div>

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setSelectedInvoice(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la facture ?"
        description={`Confirmez-vous la suppression de la facture ${selectedInvoice?.invoice_number} ? Cette action est définitive.`}
        isPending={deleteInvoice.isPending}
      />
    </DashboardLayout>
  );
}
