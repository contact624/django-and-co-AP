import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, subMonths, format, startOfWeek, getISOWeek, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  individual_walk: "Balade individuelle",
  group_walk: "Balade groupée",
  custom_walk: "Balade sur mesure",
  education: "Éducation",
  dog_sitting: "Dog sitting",
  transport: "Transport",
  other: "Autre",
};

export interface PeriodOption {
  label: string;
  value: "30d" | "3m" | "12m" | "custom";
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsStats {
  // Summary
  totalRevenue: number;
  activityCount: number;
  activeClients: number;
  totalHours: number;
  
  // Profit/Loss
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  
  // Revenue over time
  revenueOverTime: { date: string; label: string; amount: number }[];
  
  // Expenses over time
  expensesOverTime: { date: string; label: string; amount: number }[];
  
  // Revenue by service type
  revenueByType: { name: string; value: number; color: string }[];
  
  // Top 5 clients
  topClients: { name: string; revenue: number }[];
  topClientsTotal: number;
  
  // Hours by week
  hoursByWeek: { week: string; hours: number }[];
  avgHoursPerWeek: number;
}

const COLORS = [
  'hsl(252, 75%, 64%)', // primary - violet
  'hsl(190, 100%, 50%)', // accent - cyan
  'hsl(135, 100%, 55%)', // success - green
  'hsl(45, 100%, 60%)',  // yellow
  'hsl(320, 70%, 60%)',  // pink
  'hsl(200, 70%, 50%)',  // blue
];

export function useAnalyticsStats(startDate: Date, endDate: Date, periodType: "30d" | "3m" | "12m" | "custom") {
  const { user } = useAuth();
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["analyticsStats", startDateStr, endDateStr, periodType],
    queryFn: async (): Promise<AnalyticsStats> => {
      // Fetch data in parallel
      const [invoicesResult, activitiesResult, expensesResult] = await Promise.all([
        supabase
          .from("invoices")
          .select("*, clients(first_name, last_name)")
          .gte("issue_date", startDateStr)
          .lte("issue_date", endDateStr)
          .eq("status", "paid"),
        
        supabase
          .from("activities")
          .select("*, clients(first_name, last_name)")
          .gte("scheduled_date", startDateStr)
          .lte("scheduled_date", endDateStr)
          .in("status", ["done", "invoiced"]),
        
        supabase
          .from("expenses")
          .select("*")
          .gte("date", startDateStr)
          .lte("date", endDateStr),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const invoices = invoicesResult.data || [];
      const activities = activitiesResult.data || [];
      const expenses = expensesResult.data || [];

      // === Summary stats ===
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      const activityCount = activities.length;
      const activeClients = new Set(activities.map((a) => a.client_id)).size;
      const totalMinutes = activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
      const totalHours = totalMinutes / 60;

      // === Revenue over time ===
      const revenueOverTime: { date: string; label: string; amount: number }[] = [];
      
      if (periodType === "30d") {
        // Group by day
        for (let i = 29; i >= 0; i--) {
          const date = subDays(endDate, i);
          const dateStr = format(date, "yyyy-MM-dd");
          const dayRevenue = invoices
            .filter((inv) => inv.issue_date === dateStr)
            .reduce((sum, inv) => sum + (inv.total || 0), 0);
          revenueOverTime.push({
            date: dateStr,
            label: format(date, "dd/MM"),
            amount: dayRevenue,
          });
        }
      } else {
        // Group by month
        const monthsCount = periodType === "3m" ? 3 : 12;
        for (let i = monthsCount - 1; i >= 0; i--) {
          const monthDate = subMonths(endDate, i);
          const monthStart = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), "yyyy-MM-dd");
          const monthEnd = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), "yyyy-MM-dd");
          
          const monthRevenue = invoices
            .filter((inv) => inv.issue_date >= monthStart && inv.issue_date <= monthEnd)
            .reduce((sum, inv) => sum + (inv.total || 0), 0);
          
          revenueOverTime.push({
            date: monthStart,
            label: format(monthDate, "MMM", { locale: fr }),
            amount: monthRevenue,
          });
        }
      }

      // === Expenses over time ===
      const expensesOverTime: { date: string; label: string; amount: number }[] = [];
      
      if (periodType === "30d") {
        for (let i = 29; i >= 0; i--) {
          const date = subDays(endDate, i);
          const dateStr = format(date, "yyyy-MM-dd");
          const dayExpenses = expenses
            .filter((exp) => exp.date === dateStr)
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);
          expensesOverTime.push({
            date: dateStr,
            label: format(date, "dd/MM"),
            amount: dayExpenses,
          });
        }
      } else {
        const monthsCount = periodType === "3m" ? 3 : 12;
        for (let i = monthsCount - 1; i >= 0; i--) {
          const monthDate = subMonths(endDate, i);
          const monthStart = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), "yyyy-MM-dd");
          const monthEnd = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), "yyyy-MM-dd");
          
          const monthExpenses = expenses
            .filter((exp) => exp.date >= monthStart && exp.date <= monthEnd)
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);
          
          expensesOverTime.push({
            date: monthStart,
            label: format(monthDate, "MMM", { locale: fr }),
            amount: monthExpenses,
          });
        }
      }

      // === Revenue by service type ===
      const revenueByTypeMap: Record<string, number> = {};
      activities.forEach((act) => {
        const label = SERVICE_TYPE_LABELS[act.service_type];
        revenueByTypeMap[label] = (revenueByTypeMap[label] || 0) + (act.total_price || 0);
      });
      
      const revenueByType = Object.entries(revenueByTypeMap)
        .filter(([_, value]) => value > 0)
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

      // === Top 5 clients ===
      const revenueByClient: Record<string, { name: string; revenue: number }> = {};
      invoices.forEach((inv) => {
        if (inv.clients) {
          const name = `${inv.clients.first_name} ${inv.clients.last_name}`;
          if (!revenueByClient[inv.client_id]) {
            revenueByClient[inv.client_id] = { name, revenue: 0 };
          }
          revenueByClient[inv.client_id].revenue += inv.total || 0;
        }
      });
      
      const topClients = Object.values(revenueByClient)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      const topClientsTotal = topClients.reduce((sum, c) => sum + c.revenue, 0);

      // === Hours by week ===
      const hoursByWeekMap: Record<string, { weekStart: Date; hours: number }> = {};
      activities.forEach((act) => {
        const actDate = parseISO(act.scheduled_date);
        const weekStart = startOfWeek(actDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, "yyyy-MM-dd");
        
        if (!hoursByWeekMap[weekKey]) {
          hoursByWeekMap[weekKey] = { weekStart, hours: 0 };
        }
        hoursByWeekMap[weekKey].hours += (act.duration_minutes || 0) / 60;
      });
      
      const hoursByWeek = Object.entries(hoursByWeekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, data]) => ({
          week: `S${getISOWeek(data.weekStart)}`,
          hours: Math.round(data.hours * 10) / 10,
        }));
      
      const avgHoursPerWeek = hoursByWeek.length > 0
        ? hoursByWeek.reduce((sum, w) => sum + w.hours, 0) / hoursByWeek.length
        : 0;

      return {
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin,
        activityCount,
        activeClients,
        totalHours,
        revenueOverTime,
        expensesOverTime,
        revenueByType,
        topClients,
        topClientsTotal,
        hoursByWeek,
        avgHoursPerWeek,
      };
    },
    enabled: !!user,
  });
}
