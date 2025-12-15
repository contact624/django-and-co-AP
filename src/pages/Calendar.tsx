import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useActivities, ActivityWithRelations, SERVICE_TYPE_LABELS } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useAnimals } from "@/hooks/useAnimals";
import { ActivityDetailModal } from "@/components/modals/ActivityDetailModal";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek, addDays, isSameDay, isSameMonth, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type ServiceType = Database["public"]["Enums"]["service_type"];

const typeColors: Record<ServiceType, { bg: string; border: string; text: string; label: string; glow: string }> = {
  individual_walk: { bg: "bg-primary", border: "border-primary/50", text: "text-white", label: "Balade individuelle", glow: "shadow-primary/30" },
  group_walk: { bg: "bg-primary/70", border: "border-primary/40", text: "text-white", label: "Balade groupée", glow: "shadow-primary/20" },
  custom_walk: { bg: "bg-violet-500", border: "border-violet-400/50", text: "text-white", label: "Balade sur mesure", glow: "shadow-violet-500/30" },
  education: { bg: "bg-cyan-500", border: "border-cyan-400/50", text: "text-white", label: "Éducation", glow: "shadow-cyan-500/30" },
  dog_sitting: { bg: "bg-emerald-500", border: "border-emerald-400/50", text: "text-white", label: "Dog sitting", glow: "shadow-emerald-500/30" },
  transport: { bg: "bg-amber-500", border: "border-amber-400/50", text: "text-white", label: "Transport", glow: "shadow-amber-500/30" },
  other: { bg: "bg-muted-foreground", border: "border-muted-foreground/50", text: "text-white", label: "Autre", glow: "shadow-muted-foreground/20" },
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Filters
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [animalFilter, setAnimalFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: clients = [] } = useClients();
  const { data: animals = [] } = useAnimals();

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (clientFilter !== "all" && activity.client_id !== clientFilter) return false;
      if (animalFilter !== "all" && activity.animal_id !== animalFilter) return false;
      if (typeFilter !== "all" && activity.service_type !== typeFilter) return false;
      return true;
    });
  }, [activities, clientFilter, animalFilter, typeFilter]);

  // Navigation
  const goToPrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get activities for a specific day
  const getActivitiesForDay = (date: Date) => {
    return filteredActivities.filter((activity) => {
      const actDate = new Date(activity.scheduled_date);
      return isSameDay(actDate, date);
    });
  };

  // Handle activity click
  const handleActivityClick = (activity: ActivityWithRelations) => {
    setSelectedActivity(activity);
    setModalOpen(true);
  };

  // Generate calendar days for month view
  const generateMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay() || 7;
    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthDays = startingDayOfWeek - 1;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    for (let i = prevMonthDays; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  // Generate days for week view
  const generateWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const monthDays = generateMonthDays();
  const weekDays = generateWeekDays();
  const today = new Date();

  const monthName = format(currentDate, "MMMM yyyy", { locale: fr });
  const weekRange = view === "week" 
    ? `${format(weekDays[0], "d MMM", { locale: fr })} - ${format(weekDays[6], "d MMM yyyy", { locale: fr })}`
    : "";

  const renderActivityPill = (activity: ActivityWithRelations) => {
    const colors = typeColors[activity.service_type];
    const clientName = activity.clients 
      ? `${activity.clients.first_name} ${activity.clients.last_name.charAt(0)}.` 
      : "";
    const animalName = activity.animals?.name || "";
    const time = activity.scheduled_time?.slice(0, 5) || "";

    return (
      <button
        key={activity.id}
        onClick={() => handleActivityClick(activity)}
        className={cn(
          "text-[10px] px-1.5 py-1 rounded-md truncate font-medium text-left w-full",
          "transition-all duration-200 ease-out",
          "hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]",
          "border",
          colors.bg,
          colors.border,
          colors.text,
          `hover:${colors.glow}`
        )}
        title={`${time} - ${SERVICE_TYPE_LABELS[activity.service_type]} - ${clientName} ${animalName ? `(${animalName})` : ""}`}
      >
        {time} {clientName}
      </button>
    );
  };

  if (activitiesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              Calendrier
            </h1>
            <p className="text-muted-foreground mt-1">Visualisez toutes vos activités</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border">
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                view === "month" 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Mois
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                view === "week" 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Semaine
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={animalFilter} onValueChange={setAnimalFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Tous les animaux" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Tous les animaux</SelectItem>
              {animals.map((animal) => (
                <SelectItem key={animal.id} value={animal.id}>
                  {animal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation and title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted hover:border-primary/30 transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all duration-200"
            >
              Aujourd'hui
            </button>
            <button
              onClick={goToNext}
              className="p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted hover:border-primary/30 transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <h2 className="text-xl font-semibold text-foreground capitalize bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
            {view === "month" ? monthName : weekRange}
          </h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border">
          {Object.entries(typeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground group cursor-default">
              <div className={cn(
                "w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-125",
                colors.bg
              )} />
              <span className="group-hover:text-foreground transition-colors">{colors.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <GlassCard className="p-4 overflow-hidden backdrop-blur-xl">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, i) => (
              <div
                key={day}
                className={cn(
                  "text-center text-xs font-semibold uppercase tracking-wider py-2 rounded-lg",
                  i >= 5 ? "text-primary/70" : "text-muted-foreground"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Month view */}
          {view === "month" && (
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((dayInfo, index) => {
                const dayActivities = getActivitiesForDay(dayInfo.date);
                const isCurrentDay = isSameDay(dayInfo.date, today);

                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-24 p-1.5 rounded-xl border transition-all duration-200 group",
                      dayInfo.isCurrentMonth
                        ? "bg-muted/20 hover:bg-muted/40 hover:shadow-md border-border/50 hover:border-primary/20"
                        : "bg-transparent opacity-30 border-transparent",
                      isCurrentDay && dayInfo.isCurrentMonth && "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                    )}
                    style={{ animationDelay: `${index * 10}ms` }}
                  >
                    <div
                      className={cn(
                        "text-sm font-medium mb-1.5 transition-colors",
                        isCurrentDay && dayInfo.isCurrentMonth
                          ? "text-primary font-bold"
                          : dayInfo.isCurrentMonth
                          ? "text-foreground group-hover:text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {isCurrentDay && dayInfo.isCurrentMonth ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                          {dayInfo.date.getDate()}
                        </span>
                      ) : (
                        dayInfo.date.getDate()
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {dayActivities.slice(0, 3).map((activity) => renderActivityPill(activity))}
                      {dayActivities.length > 3 && (
                        <div className="text-[10px] text-primary font-medium pl-1 hover:underline cursor-pointer">
                          +{dayActivities.length - 3} autres
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week view */}
          {view === "week" && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date, index) => {
                const dayActivities = getActivitiesForDay(date);
                const isCurrentDay = isSameDay(date, today);

                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[400px] p-3 rounded-xl border transition-all duration-200",
                      "bg-muted/20 hover:bg-muted/40 border-border/50 hover:border-primary/20 hover:shadow-md",
                      isCurrentDay && "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="text-center mb-3 pb-2 border-b border-border/50">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        {format(date, "EEE", { locale: fr })}
                      </div>
                      <div
                        className={cn(
                          "text-2xl font-bold mt-1",
                          isCurrentDay ? "text-primary" : "text-foreground"
                        )}
                      >
                        {isCurrentDay ? (
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                            {date.getDate()}
                          </span>
                        ) : (
                          date.getDate()
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {dayActivities.map((activity) => {
                        const colors = typeColors[activity.service_type];
                        return (
                          <button
                            key={activity.id}
                            onClick={() => handleActivityClick(activity)}
                            className={cn(
                              "text-xs px-3 py-2 rounded-lg w-full text-left border",
                              "transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
                              colors.bg,
                              colors.border,
                              colors.text
                            )}
                          >
                            <div className="font-bold text-sm">
                              {activity.scheduled_time?.slice(0, 5) || "—"}
                            </div>
                            <div className="truncate font-medium mt-0.5">
                              {SERVICE_TYPE_LABELS[activity.service_type]}
                            </div>
                            <div className="truncate opacity-80 mt-0.5">
                              {activity.clients?.first_name} {activity.animals?.name ? `(${activity.animals.name})` : ""}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Empty state */}
        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucune activité</h3>
            <p className="text-muted-foreground">
              Ajoutez des activités pour les voir apparaître dans le calendrier.
            </p>
          </div>
        )}
      </div>

      {/* Activity detail modal */}
      <ActivityDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        activity={selectedActivity}
      />
    </DashboardLayout>
  );
}
