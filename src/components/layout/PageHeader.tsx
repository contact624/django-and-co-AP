import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  const { profile } = useAuth();
  const today = new Date();
  
  const displayName = profile?.first_name || 'Utilisateur';
  const dateStr = format(today, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-4 mb-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Bonjour, {displayName}
        </h2>
        <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
      </div>
      
      {/* Page title with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
