import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Dog,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Footprints,
  Sparkles,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import logoImage from "@/assets/logo.jpeg";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planning", label: "Planning", icon: CalendarDays },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/animals", label: "Animaux", icon: Dog },
  { to: "/activities", label: "Activités", icon: Footprints },
  { to: "/invoices", label: "Factures", icon: FileText },
  { to: "/expenses", label: "Dépenses", icon: Wallet },
  { to: "/calendar", label: "Calendrier", icon: Calendar },
  { to: "/analytics", label: "Analyses", icon: BarChart3 },
  { to: "/settings", label: "Paramètres", icon: Settings },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed = false, onCollapsedChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCollapse = () => {
    onCollapsedChange?.(!isCollapsed);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-lg bg-card border border-border"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-40",
          "flex flex-col transition-all duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src={logoImage} 
              alt="Activity Pilot Logo" 
              className="w-10 h-10 rounded-xl flex-shrink-0 object-cover"
            />
            <div className={cn(
              "transition-all duration-300 overflow-hidden whitespace-nowrap",
              isCollapsed ? "lg:w-0 lg:opacity-0" : "lg:w-auto lg:opacity-100"
            )}>
              <h1 className="font-bold text-foreground tracking-tight">Activity Pilot</h1>
              <p className="text-xs text-muted-foreground">Gestion d'activité</p>
            </div>
          </div>
        </div>

        {/* Collapse button - desktop only */}
        <button
          onClick={handleCollapse}
          className="hidden lg:flex items-center justify-center p-2 mx-2 mt-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                "text-muted-foreground transition-all duration-300",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "relative overflow-hidden",
                isCollapsed && "lg:justify-center lg:px-2"
              )}
              activeClassName="bg-primary/15 text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-6 before:bg-primary before:rounded-r-full"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-300 whitespace-nowrap",
                isCollapsed ? "lg:w-0 lg:opacity-0" : "lg:w-auto lg:opacity-100"
              )}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* AI Assistant */}
        <div className="p-2 border-t border-sidebar-border">
          <NavLink
            to="/assistant"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
              "bg-gradient-to-r from-primary/10 to-accent/10 text-foreground",
              "border border-primary/20 hover:border-primary/40 transition-all duration-300",
              "overflow-hidden",
              isCollapsed && "lg:justify-center lg:px-2"
            )}
            activeClassName="border-primary/50"
          >
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span className={cn(
              "transition-all duration-300 whitespace-nowrap",
              isCollapsed ? "lg:w-0 lg:opacity-0" : "lg:w-auto lg:opacity-100"
            )}>Assistant IA</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
