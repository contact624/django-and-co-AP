import { GlassCard } from "@/components/ui/GlassCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: { date: string; amount: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Group by week for cleaner display
  const weeklyData = data.reduce((acc, day, index) => {
    const weekIndex = Math.floor(index / 7);
    if (!acc[weekIndex]) {
      acc[weekIndex] = {
        name: `S${weekIndex + 1}`,
        revenue: 0,
      };
    }
    acc[weekIndex].revenue += day.amount;
    return acc;
  }, [] as { name: string; revenue: number }[]);

  const hasData = weeklyData.some((w) => w.revenue > 0);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Évolution du CA</h3>
          <p className="text-sm text-muted-foreground">30 derniers jours</p>
        </div>
      </div>

      <div className="h-64">
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Aucune donnée de revenu pour cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(252, 75%, 64%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(252, 75%, 64%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 25%, 18%)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="hsl(228, 15%, 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(228, 15%, 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 45%, 5%)',
                  border: '1px solid hsl(225, 25%, 18%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value.toFixed(0)} CHF`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(252, 75%, 64%)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}
