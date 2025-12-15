/**
 * =====================================================
 * PAGE PLANNING HEBDOMADAIRE - DJANGO & CO
 * =====================================================
 * 
 * Vue principale du module de planification :
 * - Grille 5×3 (Lundi-Vendredi × B1/B2/B3)
 * - Statistiques de la semaine
 * - Affectation automatique
 * - Gestion des routines
 */

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarDays,
  Wand2,
  Dog,
  Settings,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { WeeklyPlanningGrid } from "@/components/planning/WeeklyPlanningGrid";
import { AutoAssignmentPanel } from "@/components/planning/AutoAssignmentPanel";
import { PlanningStats } from "@/components/planning/PlanningStats";
import { DogRoutineForm } from "@/components/planning/DogRoutineForm";
import {
  useWalkGroups,
  useInitializeWalkGroups,
  useWeeklyPlanning,
  useDogRoutines,
} from "@/hooks/usePlanning";
import { useAnimals } from "@/hooks/useAnimals";
import { getISOWeekNumber } from "@/lib/planningTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Planning() {
  const today = new Date();
  const [currentYear] = useState(today.getFullYear());
  const [currentWeek] = useState(getISOWeekNumber(today));
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");

  const { data: walkGroups, isLoading: groupsLoading } = useWalkGroups();
  const initializeGroups = useInitializeWalkGroups();
  const { data: weeklyView } = useWeeklyPlanning(currentYear, currentWeek);
  const { data: animals } = useAnimals();
  const { data: routines } = useDogRoutines();

  const needsInitialization = !groupsLoading && (!walkGroups || walkGroups.length === 0);
  const selectedAnimal = animals?.find(a => a.id === selectedAnimalId);

  // Chiens sans routine
  const animalsWithoutRoutine = animals?.filter(
    animal => !routines?.some(r => r.animal_id === animal.id)
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Planning Hebdomadaire</h1>
            <p className="text-muted-foreground">
              Organisez vos balades collectives et individuelles
            </p>
          </div>
        </div>

        {/* Initialisation nécessaire */}
        {needsInitialization && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Les 15 créneaux hebdomadaires doivent être initialisés.
              </span>
              <Button
                onClick={() => initializeGroups.mutate()}
                disabled={initializeGroups.isPending}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${initializeGroups.isPending ? 'animate-spin' : ''}`} />
                Initialiser les groupes
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistiques */}
        <PlanningStats weeklyView={weeklyView} />

        {/* Contenu principal */}
        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Affectation
            </TabsTrigger>
            <TabsTrigger value="routines" className="flex items-center gap-2">
              <Dog className="h-4 w-4" />
              Routines
            </TabsTrigger>
          </TabsList>

          {/* Onglet Planning */}
          <TabsContent value="grid" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <WeeklyPlanningGrid />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Affectation automatique */}
          <TabsContent value="assign" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <AutoAssignmentPanel />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chiens sans routine</CardTitle>
                  <CardDescription>
                    {animalsWithoutRoutine.length} chien(s) à configurer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {animalsWithoutRoutine.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tous les chiens ont une routine configurée.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {animalsWithoutRoutine.slice(0, 5).map(animal => (
                        <div
                          key={animal.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <Dog className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{animal.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({animal.clients?.first_name})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAnimalId(animal.id)}
                          >
                            Configurer
                          </Button>
                        </div>
                      ))}
                      {animalsWithoutRoutine.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{animalsWithoutRoutine.length - 5} autres
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onglet Routines */}
          <TabsContent value="routines" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Sélection du chien */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurer une routine
                  </CardTitle>
                  <CardDescription>
                    Définissez les préférences de balade pour chaque chien
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un chien..." />
                    </SelectTrigger>
                    <SelectContent>
                      {animals?.map(animal => (
                        <SelectItem key={animal.id} value={animal.id}>
                          {animal.name} ({animal.clients?.first_name} {animal.clients?.last_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAnimal && (
                    <DogRoutineForm
                      animal={selectedAnimal}
                      onSuccess={() => setSelectedAnimalId("")}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Liste des routines existantes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Routines configurées</CardTitle>
                  <CardDescription>
                    {routines?.length || 0} chien(s) avec routine
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!routines || routines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune routine configurée.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {routines.map(routine => (
                        <div
                          key={routine.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedAnimalId(routine.animal_id)}
                        >
                          <div className="flex items-center gap-3">
                            <Dog className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium text-sm">
                                {routine.animals.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {routine.animals.clients?.first_name} {routine.animals.clients?.last_name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {routine.routine_type}
                            </div>
                            {routine.sector && (
                              <div className="text-xs text-muted-foreground">
                                {routine.sector}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
