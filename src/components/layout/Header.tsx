import { GlassButton } from "@/components/ui/GlassButton";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, FileText, LogOut, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onNewActivity?: () => void;
  onNewClient?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onNewActivity, onNewClient, sidebarCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div 
        className={cn(
          "flex items-center justify-end px-6 py-3 transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <GlassButton size="sm" variant="primary" onClick={onNewActivity}>
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">Nouvelle activité</span>
            </GlassButton>
            
            <GlassButton size="sm" variant="outline" onClick={onNewClient}>
              <Users className="w-4 h-4" />
              <span className="hidden lg:inline">Nouveau client</span>
            </GlassButton>

            <GlassButton size="sm" variant="outline" onClick={() => navigate('/invoices/new')}>
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">Nouvelle facture</span>
            </GlassButton>
          </div>

          <GlassButton size="sm" variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>
    </header>
  );
}
