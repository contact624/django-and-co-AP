import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceTypeChart } from "@/components/dashboard/ServiceTypeChart";
import { PlanningWidget } from "@/components/dashboard/PlanningWidget";
import { useDashboardStats, PeriodType } from "@/hooks/useDashboardStats";
import { TrendingUp, Footprints, Users, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "30d", label: "30 jours" },
  { value: "3m", label: "3 mois" },
  { value: "12m", label: "12 mois" },
];

function getPeriodLabel(period: PeriodType): string {
  switch (period) {
    case "30d": return "sur 30 jours";
    case "3m": return "sur 3 mois";
    case "12m": return "sur 12 mois";
    default: return "sur 30 jours";
  }
}

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>("30d");
  const { data: stats, isLoading } = useDashboardStats(period);

  const periodLabel = getPeriodLabel(period);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader 
            title="Dashboard" 
            subtitle="Vue d'ensemble de votre activité" 
          />
          
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </GlassCard>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 p-6">
              <Skeleton className="h-64 w-full" />
            </GlassCard>
            <GlassCard className="p-6">
              <Skeleton className="h-64 w-full" />
            </GlassCard>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Default values if no data
  const revenue = stats?.revenue || 0;
  const revenueChange = stats?.revenueChange || 0;
  const revenueByDay = stats?.revenueByDay || [];
  const activityCount = stats?.activityCount || 0;
  const totalHours = stats?.totalHours || 0;
  const activeClients = stats?.activeClients || 0;
  const topClient = stats?.topClient;
  const topClientRevenue = stats?.topClientRevenue || 0;
  const pendingInvoices = stats?.pendingInvoices || 0;
  const pendingAmount = stats?.pendingAmount || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Page Header with greeting */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <PageHeader 
            title="Dashboard" 
            subtitle="Vue d'ensemble de votre activité" 
          />
          
          {/* Period filter buttons */}
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-all duration-200",
                  period === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Chiffre d'affaires"
            value={`${revenue.toFixed(0)} CHF`}
            subtitle={periodLabel}
            change={revenueChange}
            icon={TrendingUp}
            iconColor="primary"
            sparkline={revenueByDay}
          />
          <StatCard
            title="Prestations"
            value={activityCount}
            subtitle={`${totalHours.toFixed(0)}h de travail`}
            icon={Footprints}
            iconColor="accent"
          />
          <StatCard
            title="Clients actifs"
            value={activeClients}
            subtitle={topClient ? `Top: ${topClient.firstName} (${topClientRevenue.toFixed(0)} CHF)` : periodLabel}
            icon={Users}
            iconColor="success"
          />
          <StatCard
            title="Factures en attente"
            value={pendingInvoices}
            subtitle={`${pendingAmount.toFixed(0)} CHF à encaisser`}
            icon={FileText}
            iconColor="primary"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={revenueByDay} />
          </div>
          <div>
            <ServiceTypeChart data={stats?.revenueByType || {}} />
          </div>
        </div>

        {/* Planning Widget + Recent data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PlanningWidget />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <RecentActivities />
            <RecentInvoices />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
