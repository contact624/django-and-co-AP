import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExpenses, EXPENSE_CATEGORY_LABELS, Expense } from "@/hooks/useExpenses";
import { CreateExpenseModal } from "@/components/modals/CreateExpenseModal";
import { EditExpenseModal } from "@/components/modals/EditExpenseModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { ReceiptLink } from "@/components/ui/ReceiptLink";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  FileText,
  Fuel,
  Wrench,
  Dog,
  Shield,
  Phone,
  Calculator,
  GraduationCap,
  HelpCircle,
  Download,
  CalendarIcon
} from "lucide-react";
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { ExportPeriod, getPeriodLabel, generateExpensesCsv, downloadCsv } from "@/lib/exportUtils";
import { toast } from "@/hooks/use-toast";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  fuel: Fuel,
  vehicle_maintenance: Wrench,
  dog_equipment: Dog,
  insurance: Shield,
  phone: Phone,
  accounting: Calculator,
  training: GraduationCap,
  other: HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  fuel: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  vehicle_maintenance: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  dog_equipment: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  insurance: "bg-green-500/20 text-green-400 border-green-500/30",
  phone: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  accounting: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  training: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function Expenses() {
  const { expenses, isLoading, deleteExpense } = useExpenses();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<ExportPeriod | "all">("all");
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Search filter
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        EXPENSE_CATEGORY_LABELS[expense.category].toLowerCase().includes(searchQuery.toLowerCase()) ||
        format(new Date(expense.date), "dd/MM/yyyy").includes(searchQuery);
      
      // Category filter
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      
      // Period filter
      let matchesPeriod = true;
      const periodRange = getPeriodRange(periodFilter);
      if (periodRange) {
        const expenseDate = new Date(expense.date);
        matchesPeriod = isWithinInterval(expenseDate, { start: periodRange.start, end: periodRange.end });
      }
      
      return matchesSearch && matchesCategory && matchesPeriod;
    });
  }, [expenses, searchQuery, categoryFilter, periodFilter, customDateStart, customDateEnd]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach((expense) => {
      breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [filteredExpenses]);

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditModalOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedExpense) {
      await deleteExpense.mutateAsync(selectedExpense.id);
      setDeleteModalOpen(false);
      setSelectedExpense(null);
    }
  };

  const handleExportCsv = () => {
    if (filteredExpenses.length === 0) {
      toast({ title: "Aucune dépense à exporter", variant: "destructive" });
      return;
    }
    
    const exportData = filteredExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
      receipt_url: e.receipt_url,
    }));
    
    const csvContent = generateExpensesCsv(exportData);
    const periodLabel = periodFilter !== "all" 
      ? getPeriodLabel(periodFilter, customDateStart, customDateEnd).replace(/\//g, "-") 
      : "toutes";
    downloadCsv(csvContent, `depenses_${periodLabel}.csv`);
    
    toast({ 
      title: "Export terminé", 
      description: `${filteredExpenses.length} dépense(s) exportée(s)` 
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Dépenses" subtitle="Gérez vos dépenses professionnelles">
            <Skeleton className="h-10 w-32" />
          </PageHeader>
          <GlassCard className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Dépenses" subtitle="Gérez vos dépenses professionnelles">
          <GlassButton onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle dépense
          </GlassButton>
        </PageHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total dépenses</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalExpenses.toFixed(2)} CHF</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredExpenses.length} dépense{filteredExpenses.length !== 1 ? "s" : ""}
            </p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Moyenne par dépense</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toFixed(2) : "0.00"} CHF
            </p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Top catégorie</p>
            {categoryBreakdown.length > 0 ? (
              <>
                <p className="text-lg font-bold text-foreground mt-1">
                  {EXPENSE_CATEGORY_LABELS[categoryBreakdown[0][0]]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {categoryBreakdown[0][1].toFixed(2)} CHF
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-muted-foreground mt-1">-</p>
            )}
          </GlassCard>
        </div>

        {/* Filters */}
        <GlassCard className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Description, catégorie, date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="all">Toutes catégories</option>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as ExportPeriod | "all")}
                className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
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
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={filteredExpenses.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Expenses table */}
        <GlassCard className="p-6">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== "all" || periodFilter !== "all" 
                  ? "Aucune dépense trouvée pour ces filtres" 
                  : "Aucune dépense enregistrée"}
              </p>
              {!searchQuery && categoryFilter === "all" && periodFilter === "all" && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter votre première dépense
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-center">Justificatif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => {
                    const CategoryIcon = CATEGORY_ICONS[expense.category] || HelpCircle;
                    return (
                      <TableRow key={expense.id} className="group">
                        <TableCell className="font-medium">
                          {format(new Date(expense.date), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`gap-1.5 ${CATEGORY_COLORS[expense.category]}`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                            {EXPENSE_CATEGORY_LABELS[expense.category]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {expense.amount.toFixed(2)} CHF
                        </TableCell>
                        <TableCell className="text-center">
                          {expense.receipt_url ? (
                            <ReceiptLink receiptPath={expense.receipt_url} />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(expense)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(expense)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      </div>

      <CreateExpenseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <EditExpenseModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        expense={selectedExpense}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Supprimer la dépense"
        description="Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible."
      />
    </DashboardLayout>
  );
}
