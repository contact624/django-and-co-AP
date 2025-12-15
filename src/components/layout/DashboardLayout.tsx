import { Sidebar } from "./Sidebar";
import { ReactNode, useState } from "react";
import { CreateClientModal } from "@/components/modals/CreateClientModal";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onCollapsedChange={setSidebarCollapsed} 
      />
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <main className="p-4 lg:p-6 pt-16 lg:pt-6">{children}</main>
      </div>

      <CreateClientModal 
        open={clientModalOpen} 
        onOpenChange={setClientModalOpen} 
      />
      <CreateActivityModal 
        open={activityModalOpen} 
        onOpenChange={setActivityModalOpen} 
      />
    </div>
  );
}
