import { GlassCard } from "@/components/ui/GlassCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  'hsl(252, 75%, 64%)', // primary - violet
  'hsl(190, 100%, 50%)', // accent - cyan
  'hsl(135, 100%, 55%)', // success - green
  'hsl(45, 100%, 60%)',  // yellow
  'hsl(320, 70%, 60%)',  // pink
  'hsl(200, 70%, 50%)',  // blue
];

interface ServiceTypeChartProps {
  data: Record<string, number>;
}

export function ServiceTypeChart({ data }: ServiceTypeChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const hasData = chartData.length > 0;

  return (
    <GlassCard className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Répartition par type</h3>
        <p className="text-sm text-muted-foreground">CA par service</p>
      </div>

      <div className="h-64 flex items-center">
        {!hasData ? (
          <div className="flex items-center justify-center w-full text-muted-foreground text-sm">
            Aucune donnée pour cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 45%, 5%)',
                  border: '1px solid hsl(225, 25%, 18%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value.toFixed(0)} CHF`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {hasData && (
        <div className="mt-4 space-y-2">
          {chartData.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
              <span className="text-foreground font-medium">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
