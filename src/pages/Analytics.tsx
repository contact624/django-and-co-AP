import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAnalyticsStats } from "@/hooks/useAnalyticsStats";
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, TrendingDown, Users, Clock, Sparkles, Calendar, Wallet, PiggyBank } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, subMonths, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { fr } from "date-fns/locale";

const COLORS = [
  'hsl(252, 75%, 64%)',
  'hsl(190, 100%, 50%)',
  'hsl(135, 100%, 55%)',
  'hsl(45, 100%, 60%)',
  'hsl(320, 70%, 60%)',
  'hsl(200, 70%, 50%)',
];

type PeriodType = "30d" | "3m" | "12m" | "custom";

export default function Analytics() {
  const today = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>("30d");
  const [customStart, setCustomStart] = useState<Date | undefined>(subDays(today, 30));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(today);
  
  const { startDate, endDate } = useMemo(() => {
    switch (periodType) {
      case "30d":
        return { startDate: subDays(today, 30), endDate: today };
      case "3m":
        return { startDate: subMonths(today, 3), endDate: today };
      case "12m":
        return { startDate: subMonths(today, 12), endDate: today };
      case "custom":
        return { startDate: customStart || subDays(today, 30), endDate: customEnd || today };
    }
  }, [periodType, customStart, customEnd, today]);

  const { data: stats, isLoading } = useAnalyticsStats(startDate, endDate, periodType);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriodType(newPeriod);
  };

  const PeriodFilters = () => (
    <>
      <GlassButton
        size="sm"
        variant={periodType === "30d" ? "primary" : "default"}
        onClick={() => handlePeriodChange("30d")}
      >
        30 jours
      </GlassButton>
      <GlassButton
        size="sm"
        variant={periodType === "3m" ? "primary" : "default"}
        onClick={() => handlePeriodChange("3m")}
      >
        3 mois
      </GlassButton>
      <GlassButton
        size="sm"
        variant={periodType === "12m" ? "primary" : "default"}
        onClick={() => handlePeriodChange("12m")}
      >
        12 mois
      </GlassButton>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={periodType === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Personnalisé
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 bg-card border-border" align="end">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Date de début</p>
              <CalendarComponent
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                locale={fr}
                className="rounded-md border border-border"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Date de fin</p>
              <CalendarComponent
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                locale={fr}
                className="rounded-md border border-border"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => handlePeriodChange("custom")}
            >
              Appliquer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Analyses" subtitle="Statistiques et rapports détaillés">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </PageHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i} className="p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-24" />
              </GlassCard>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6"><Skeleton className="h-72 w-full" /></GlassCard>
            <GlassCard className="p-6"><Skeleton className="h-72 w-full" /></GlassCard>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalRevenue = stats?.totalRevenue || 0;
  const totalExpenses = stats?.totalExpenses || 0;
  const profit = stats?.profit || 0;
  const profitMargin = stats?.profitMargin || 0;
  const activityCount = stats?.activityCount || 0;
  const activeClients = stats?.activeClients || 0;
  const totalHours = stats?.totalHours || 0;
  const revenueOverTime = stats?.revenueOverTime || [];
  const expensesOverTime = stats?.expensesOverTime || [];
  const revenueByType = stats?.revenueByType || [];
  const topClients = stats?.topClients || [];
  const topClientsTotal = stats?.topClientsTotal || 0;
  const hoursByWeek = stats?.hoursByWeek || [];
  const avgHoursPerWeek = stats?.avgHoursPerWeek || 0;

  const totalByType = revenueByType.reduce((sum, t) => sum + t.value, 0);
  const isProfitable = profit >= 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Analyses" subtitle="Statistiques et rapports détaillés">
          <PeriodFilters />
        </PageHeader>

        {/* Period indicator */}
        <p className="text-xs text-muted-foreground -mt-2">
          Période : {format(startDate, "dd MMM yyyy", { locale: fr })} - {format(endDate, "dd MMM yyyy", { locale: fr })}
        </p>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 group hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                <TrendingUp className="w-4 h-4 text-primary group-hover:rotate-3 transition-transform duration-300" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">CA Total</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{totalRevenue.toFixed(0)} CHF</p>
            <p className="text-xs text-muted-foreground mt-2">Sur la période sélectionnée</p>
          </GlassCard>
          
          <GlassCard className="p-5 group hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/10 transition-all duration-300" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20 group-hover:scale-110 group-hover:bg-accent/20 transition-all duration-300">
                <Clock className="w-4 h-4 text-accent group-hover:rotate-3 transition-transform duration-300" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Heures</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground group-hover:text-accent transition-colors duration-300">{totalHours.toFixed(0)}h</p>
            <p className="text-xs text-muted-foreground mt-2">Sur la période sélectionnée</p>
          </GlassCard>
          
          <GlassCard className="p-5 group hover:scale-[1.02] hover:shadow-xl hover:shadow-success/10 transition-all duration-300" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center border border-success/20 group-hover:scale-110 group-hover:bg-success/20 transition-all duration-300">
                <Users className="w-4 h-4 text-success group-hover:rotate-3 transition-transform duration-300" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Clients actifs</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground group-hover:text-success transition-colors duration-300">{activeClients}</p>
            <p className="text-xs text-muted-foreground mt-2">Sur la période sélectionnée</p>
          </GlassCard>
          
          <GlassCard className="p-5 group hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 group-hover:bg-yellow-500/20 transition-all duration-300">
                <Sparkles className="w-4 h-4 text-yellow-400 group-hover:rotate-3 transition-transform duration-300" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Prestations</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-foreground group-hover:text-yellow-400 transition-colors duration-300">{activityCount}</p>
            <p className="text-xs text-muted-foreground mt-2">Sur la période sélectionnée</p>
          </GlassCard>
        </div>

        {/* Profit/Loss Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="p-5 group hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Revenus</span>
            </div>
            <p className="text-2xl font-bold text-primary">{totalRevenue.toFixed(0)} CHF</p>
            <p className="text-xs text-muted-foreground mt-1">Factures payées</p>
          </GlassCard>

          <GlassCard className="p-5 group hover:scale-[1.02] hover:shadow-xl hover:shadow-destructive/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <Wallet className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Dépenses</span>
            </div>
            <p className="text-2xl font-bold text-destructive">-{totalExpenses.toFixed(0)} CHF</p>
            <p className="text-xs text-muted-foreground mt-1">Total des dépenses</p>
          </GlassCard>

          <GlassCard className={`p-5 group hover:scale-[1.02] transition-all duration-300 ${isProfitable ? 'hover:shadow-xl hover:shadow-success/10 border-success/30' : 'hover:shadow-xl hover:shadow-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${isProfitable ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                <PiggyBank className={`w-4 h-4 ${isProfitable ? 'text-success' : 'text-destructive'}`} />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Bilan</span>
            </div>
            <p className={`text-2xl font-bold ${isProfitable ? 'text-success' : 'text-destructive'}`}>
              {isProfitable ? '+' : ''}{profit.toFixed(0)} CHF
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isProfitable ? 'Profit' : 'Perte'} ({profitMargin.toFixed(1)}% de marge)
            </p>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue over time */}
          <GlassCard className="p-5 lg:p-6 group hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">Évolution du CA</h3>
                <p className="text-sm text-muted-foreground">
                  Total : {totalRevenue.toFixed(0)} CHF
                </p>
              </div>
            </div>
            <div className="h-64 lg:h-72">
              {revenueOverTime.length === 0 || revenueOverTime.every(r => r.amount === 0) ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Aucune donnée pour cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(252, 75%, 64%)" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="hsl(252, 75%, 64%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(252, 75%, 64%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 18%)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="hsl(228, 15%, 55%)" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      interval={periodType === "30d" ? 4 : 0}
                    />
                    <YAxis 
                      stroke="hsl(228, 15%, 55%)" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `${v}`}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220, 45%, 8%)',
                        border: '1px solid hsl(225, 25%, 18%)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 10px 40px -10px hsl(252, 75%, 64% / 0.3)',
                      }}
                      formatter={(value: number) => [`${value.toFixed(0)} CHF`, 'CA']}
                      cursor={{ stroke: 'hsl(252, 75%, 64%)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(252, 75%, 64%)"
                      strokeWidth={2.5}
                      fill="url(#revenueGradientAnalytics)"
                      animationDuration={1000}
                      animationEasing="ease-out"
                      dot={{ r: 0 }}
                      activeDot={{ r: 6, fill: 'hsl(252, 75%, 64%)', stroke: 'hsl(220, 45%, 8%)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          {/* Revenue by service type */}
          <GlassCard className="p-5 lg:p-6 group hover:shadow-lg hover:shadow-accent/5 hover:border-accent/30 transition-all duration-300" style={{ animationDelay: '250ms' }}>
            <h3 className="text-base font-semibold text-foreground mb-5 group-hover:text-accent transition-colors duration-300">Répartition par service</h3>
            <div className="h-56 flex items-center">
              {revenueByType.length === 0 ? (
                <div className="flex items-center justify-center w-full text-sm text-muted-foreground">
                  Aucune donnée pour cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {revenueByType.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="hsl(220, 45%, 12%)"
                          strokeWidth={2}
                          className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220, 45%, 8%)',
                        border: '1px solid hsl(225, 25%, 18%)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 10px 40px -10px hsl(190, 100%, 50% / 0.3)',
                      }}
                      formatter={(value: number, name: string) => [`${value.toFixed(0)} CHF`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {revenueByType.length > 0 && (
              <div className="mt-4 space-y-2">
                {revenueByType.map((item, index) => (
                  <div 
                    key={item.name} 
                    className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/30 transition-all duration-200 cursor-pointer group/item"
                    style={{ animationDelay: `${300 + index * 50}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full group-hover/item:scale-125 transition-transform duration-200" 
                        style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}40` }} 
                      />
                      <span className="text-muted-foreground text-sm group-hover/item:text-foreground transition-colors duration-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium text-sm">{item.value.toFixed(0)} CHF</span>
                      <span className="text-muted-foreground text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                        {totalByType > 0 ? ((item.value / totalByType) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 clients */}
          <GlassCard className="p-5 lg:p-6 group hover:shadow-lg hover:shadow-success/5 hover:border-success/30 transition-all duration-300" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground group-hover:text-success transition-colors duration-300">Top 5 clients</h3>
              {topClientsTotal > 0 && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  Total : {topClientsTotal.toFixed(0)} CHF
                </span>
              )}
            </div>
            {topClients.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">
                Aucune donnée pour cette période
              </div>
            ) : (
              <div className="space-y-4">
                {topClients.map((client, index) => {
                  const maxRevenue = topClients[0]?.revenue || 1;
                  const percentage = (client.revenue / maxRevenue) * 100;
                  
                  return (
                    <div 
                      key={client.name} 
                      className="group/client p-2 -mx-2 rounded-lg hover:bg-muted/20 transition-all duration-200 cursor-pointer"
                      style={{ animationDelay: `${350 + index * 80}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-background"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground group-hover/client:translate-x-1 transition-transform duration-200">
                            {client.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {client.revenue.toFixed(0)} CHF
                        </span>
                      </div>
                      <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden ml-7">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out group-hover/client:shadow-lg"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                            boxShadow: `0 0 12px ${COLORS[index % COLORS.length]}50`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Hours by week */}
          <GlassCard className="p-5 lg:p-6 group hover:shadow-lg hover:shadow-accent/5 hover:border-accent/30 transition-all duration-300" style={{ animationDelay: '350ms' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors duration-300">Heures par semaine</h3>
              {avgHoursPerWeek > 0 && (
                <span className="text-xs text-muted-foreground bg-accent/10 text-accent px-2 py-1 rounded-full border border-accent/20">
                  Moy. {avgHoursPerWeek.toFixed(1)}h/sem
                </span>
              )}
            </div>
            <div className="h-56">
              {hoursByWeek.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Aucune donnée pour cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursByWeek} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="hoursBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(190, 100%, 55%)" />
                        <stop offset="100%" stopColor="hsl(190, 100%, 40%)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 18%)" vertical={false} />
                    <XAxis 
                      dataKey="week" 
                      stroke="hsl(228, 15%, 55%)" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(228, 15%, 55%)" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => `${v}h`}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220, 45%, 8%)',
                        border: '1px solid hsl(225, 25%, 18%)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 10px 40px -10px hsl(190, 100%, 50% / 0.3)',
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}h`, 'Heures']}
                      cursor={{ fill: 'hsl(190, 100%, 50% / 0.1)' }}
                    />
                    <Bar 
                      dataKey="hours" 
                      fill="url(#hoursBarGradient)" 
                      radius={[6, 6, 0, 0]}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </div>

        {/* AI Summary */}
        <GlassCard 
          className="p-5 lg:p-6 border-primary/20 group hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 transition-all duration-300 relative overflow-hidden" 
          style={{ animationDelay: '400ms' }}
        >
          {/* Subtle animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30 flex-shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
              <Sparkles className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">Résumé IA</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                {totalRevenue > 0 ? (
                  <>
                    <p className="leading-relaxed">
                      Sur cette période, vous avez réalisé un chiffre d'affaires de <span className="text-primary font-semibold">{totalRevenue.toFixed(0)} CHF</span> avec <span className="text-accent font-semibold">{activityCount} prestations</span> pour <span className="text-success font-semibold">{activeClients} clients actifs</span>.
                    </p>
                    {revenueByType.length > 0 && (
                      <p className="leading-relaxed">
                        Votre service le plus rentable est <span className="text-foreground font-medium">{revenueByType[0]?.name}</span> avec {revenueByType[0]?.value.toFixed(0)} CHF ({totalByType > 0 ? ((revenueByType[0]?.value / totalByType) * 100).toFixed(0) : 0}% du CA).
                      </p>
                    )}
                    {topClients.length > 0 && (
                      <p className="leading-relaxed">
                        Votre meilleur client est <span className="text-foreground font-medium">{topClients[0]?.name}</span> avec {topClients[0]?.revenue.toFixed(0)} CHF sur la période.
                      </p>
                    )}
                  </>
                ) : (
                  <p>Aucune donnée disponible pour cette période. Créez des activités pour voir vos statistiques.</p>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
