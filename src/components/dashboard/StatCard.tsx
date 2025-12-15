import { GlassCard } from "@/components/ui/GlassCard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'accent' | 'success';
  sparkline?: { date: string; amount: number }[];
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = 'primary',
  sparkline,
}: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    accent: 'text-accent bg-accent/10 border-accent/20',
    success: 'text-success bg-success/10 border-success/20',
  };

  const glowClasses = {
    primary: 'group-hover:shadow-primary/20',
    accent: 'group-hover:shadow-accent/20',
    success: 'group-hover:shadow-success/20',
  };

  return (
    <GlassCard className={cn(
      "p-6 group cursor-default",
      "transition-all duration-300 ease-out",
      "hover:scale-[1.02] hover:shadow-xl",
      glowClasses[iconColor]
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors duration-200">{title}</p>
        </div>
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center border",
            "transition-all duration-300 ease-out",
            "group-hover:scale-110 group-hover:rotate-3",
            colorClasses[iconColor]
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-bold text-foreground transition-transform duration-200 group-hover:translate-x-1">{value}</p>
        
        {(change !== undefined || subtitle) && (
          <div className="flex items-center gap-2">
            {change !== undefined && (
              <span className={cn(
                "inline-flex items-center gap-1 text-sm font-medium transition-transform duration-200 group-hover:scale-105",
                change > 0 && "text-success",
                change < 0 && "text-destructive",
                change === 0 && "text-muted-foreground"
              )}>
                {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {change > 0 && '+'}
                {change.toFixed(1)}%
              </span>
            )}
            {subtitle && (
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}

        {/* Mini sparkline */}
        {sparkline && sparkline.length > 0 && (
          <div className="flex items-end gap-0.5 h-12 mt-4">
            {sparkline.map((point, i) => {
              const max = Math.max(...sparkline.map(p => p.amount), 1);
              const height = (point.amount / max) * 100;
              return (
                <div
                  key={point.date}
                  className="flex-1 bg-primary/30 rounded-t transition-all duration-300 hover:bg-primary group-hover:bg-primary/50"
                  style={{ 
                    height: `${Math.max(height, 4)}%`,
                    transitionDelay: `${i * 20}ms`
                  }}
                  title={`${point.date}: ${point.amount} CHF`}
                />
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
