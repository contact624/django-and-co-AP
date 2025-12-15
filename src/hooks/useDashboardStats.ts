import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, subMonths, format, startOfWeek } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];
type ActivityStatus = Database["public"]["Enums"]["activity_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type PeriodType = "30d" | "3m" | "12m";

export interface DashboardStats {
  // Revenue stats
  revenue: number;
  revenueChange: number;
  revenueByDay: { date: string; amount: number }[];
  
  // Activity stats
  activityCount: number;
  totalHours: number;
  activityByType: Record<ServiceType, number>;
  
  // Client stats
  activeClients: number;
  topClient: { firstName: string; lastName: string } | null;
  topClientRevenue: number;
  
  // Invoice stats
  pendingInvoices: number;
  pendingAmount: number;
  
  // Revenue by type (for pie chart)
  revenueByType: Record<string, number>;
  
  // Weekly hours (for bar chart)
  hoursByWeek: { week: string; hours: number }[];
}

export interface RecentActivity {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  service_type: ServiceType;
  duration_minutes: number;
  total_price: number | null;
  status: ActivityStatus;
  clients: { first_name: string; last_name: string } | null;
  animals: { name: string } | null;
}

export interface RecentInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number | null;
  status: PaymentStatus;
  clients: { first_name: string; last_name: string } | null;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  individual_walk: "Balade individuelle",
  group_walk: "Balade groupée",
  custom_walk: "Balade sur mesure",
  education: "Éducation",
  dog_sitting: "Dog sitting",
  transport: "Transport",
  other: "Autre",
};

function getPeriodDates(period: PeriodType) {
  const today = new Date();
  let startDate: Date;
  let previousStartDate: Date;

  switch (period) {
    case "30d":
      startDate = subDays(today, 30);
      previousStartDate = subDays(today, 60);
      break;
    case "3m":
      startDate = subMonths(today, 3);
      previousStartDate = subMonths(today, 6);
      break;
    case "12m":
      startDate = subMonths(today, 12);
      previousStartDate = subMonths(today, 24);
      break;
    default:
      startDate = subDays(today, 30);
      previousStartDate = subDays(today, 60);
  }

  return { today, startDate, previousStartDate };
}

export function useDashboardStats(period: PeriodType = "30d") {
  const { user } = useAuth();
  const { today, startDate, previousStartDate } = getPeriodDates(period);

  return useQuery({
    queryKey: ["dashboardStats", period],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch all required data in parallel
      const [invoicesResult, activitiesResult, previousInvoicesResult] = await Promise.all([
        // Invoices for the period
        supabase
          .from("invoices")
          .select("*, clients(first_name, last_name)")
          .gte("issue_date", format(startDate, "yyyy-MM-dd")),
        
        // Activities for the period
        supabase
          .from("activities")
          .select("*, clients(first_name, last_name)")
          .gte("scheduled_date", format(startDate, "yyyy-MM-dd"))
          .in("status", ["done", "invoiced"]),
        
        // Previous period invoices (for comparison)
        supabase
          .from("invoices")
          .select("total, status")
          .gte("issue_date", format(previousStartDate, "yyyy-MM-dd"))
          .lt("issue_date", format(startDate, "yyyy-MM-dd"))
          .eq("status", "paid"),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (previousInvoicesResult.error) throw previousInvoicesResult.error;

      const invoices = invoicesResult.data || [];
      const activities = activitiesResult.data || [];
      const previousInvoices = previousInvoicesResult.data || [];

      // Calculate revenue (paid invoices in period)
      const paidInvoices = invoices.filter((inv) => inv.status === "paid");
      const revenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Previous period revenue for comparison
      const previousRevenue = previousInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const revenueChange = previousRevenue > 0 
        ? ((revenue - previousRevenue) / previousRevenue) * 100 
        : revenue > 0 ? 100 : 0;

      // Revenue by day (for sparkline) - always last 30 points for visibility
      const revenueByDay: { date: string; amount: number }[] = [];
      const daysToShow = period === "30d" ? 30 : period === "3m" ? 90 : 365;
      const pointsToShow = Math.min(daysToShow, 30);
      const dayStep = Math.ceil(daysToShow / pointsToShow);
      
      for (let i = pointsToShow - 1; i >= 0; i--) {
        const date = subDays(today, i * dayStep);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayRevenue = paidInvoices
          .filter((inv) => inv.issue_date === dateStr)
          .reduce((sum, inv) => sum + (inv.total || 0), 0);
        revenueByDay.push({ date: format(date, "dd/MM"), amount: dayRevenue });
      }

      // Activity count and breakdown
      const activityCount = activities.length;
      const totalMinutes = activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0);
      const totalHours = totalMinutes / 60;

      // Activity by type
      const activityByType: Record<ServiceType, number> = {
        individual_walk: 0,
        group_walk: 0,
        custom_walk: 0,
        education: 0,
        dog_sitting: 0,
        transport: 0,
        other: 0,
      };
      activities.forEach((act) => {
        activityByType[act.service_type] = (activityByType[act.service_type] || 0) + 1;
      });

      // Revenue by type (using activities' total_price)
      const revenueByType: Record<string, number> = {};
      activities.forEach((act) => {
        const label = SERVICE_TYPE_LABELS[act.service_type];
        revenueByType[label] = (revenueByType[label] || 0) + (act.total_price || 0);
      });

      // Active clients (distinct clients with activities in period)
      const clientIds = new Set(activities.map((act) => act.client_id));
      const activeClients = clientIds.size;

      // Top client by revenue
      const revenueByClient: Record<string, { revenue: number; firstName: string; lastName: string }> = {};
      activities.forEach((act) => {
        if (act.clients) {
          const key = act.client_id;
          if (!revenueByClient[key]) {
            revenueByClient[key] = {
              revenue: 0,
              firstName: act.clients.first_name,
              lastName: act.clients.last_name,
            };
          }
          revenueByClient[key].revenue += act.total_price || 0;
        }
      });

      let topClient: { firstName: string; lastName: string } | null = null;
      let topClientRevenue = 0;
      Object.values(revenueByClient).forEach((client) => {
        if (client.revenue > topClientRevenue) {
          topClientRevenue = client.revenue;
          topClient = { firstName: client.firstName, lastName: client.lastName };
        }
      });

      // Pending invoices
      const pendingInvoicesData = invoices.filter((inv) => 
        inv.status === "draft" || inv.status === "sent"
      );
      const pendingInvoices = pendingInvoicesData.length;
      const pendingAmount = pendingInvoicesData.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Hours by week (last 4 weeks)
      const hoursByWeek: { week: string; hours: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = startOfWeek(subDays(today, w * 7), { weekStartsOn: 1 });
        const weekEnd = subDays(weekStart, -6);
        const weekActivities = activities.filter((act) => {
          const actDate = new Date(act.scheduled_date);
          return actDate >= weekStart && actDate <= weekEnd;
        });
        const weekMinutes = weekActivities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0);
        hoursByWeek.push({
          week: `S${4 - w}`,
          hours: Math.round((weekMinutes / 60) * 10) / 10,
        });
      }

      return {
        revenue,
        revenueChange,
        revenueByDay,
        activityCount,
        totalHours,
        activityByType,
        activeClients,
        topClient,
        topClientRevenue,
        pendingInvoices,
        pendingAmount,
        revenueByType,
        hoursByWeek,
      };
    },
    enabled: !!user,
  });
}

export function useRecentActivities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recentActivities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          service_type,
          duration_minutes,
          total_price,
          status,
          clients (first_name, last_name),
          animals (name)
        `)
        .order("scheduled_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as RecentActivity[];
    },
    enabled: !!user,
  });
}

export function useRecentInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recentInvoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          issue_date,
          total,
          status,
          clients (first_name, last_name)
        `)
        .order("issue_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as RecentInvoice[];
    },
    enabled: !!user,
  });
}
