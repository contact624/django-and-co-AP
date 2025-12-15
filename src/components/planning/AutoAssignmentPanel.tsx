/**
 * =====================================================
 * PANNEAU D'AFFECTATION AUTOMATIQUE
 * =====================================================
 * 
 * Permet d'affecter automatiquement un chien aux groupes
 * en fonction de sa routine et des disponibilités.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dog,
  Wand2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  ROUTINE_LABELS,
  SECTOR_LABELS,
  TIME_PREFERENCE_LABELS,
  DAY_LABELS,
  getISOWeekNumber,
  getMondayOfWeek,
} from "@/lib/planningTypes";
import {
  useDogRoutines,
  useAutoAssignDog,
  AutoAssignResult,
} from "@/hooks/usePlanning";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

export function AutoAssignmentPanel() {
  const today = new Date();
  const [selectedYear] = useState(today.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(getISOWeekNumber(today));
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");
  const [result, setResult] = useState<AutoAssignResult | null>(null);

  const { data: routines, isLoading } = useDogRoutines();
  const autoAssign = useAutoAssignDog();

  const monday = getMondayOfWeek(selectedYear, selectedWeek);

  // Générer les options de semaines (8 prochaines semaines)
  const weekOptions = Array.from({ length: 8 }, (_, i) => {
    const weekNum = getISOWeekNumber(today) + i;
    const adjustedWeek = weekNum > 52 ? weekNum - 52 : weekNum;
    const weekMonday = getMondayOfWeek(
      weekNum > 52 ? selectedYear + 1 : selectedYear,
      adjustedWeek
    );
    return {
      value: adjustedWeek,
      label: `Semaine ${adjustedWeek} (${format(weekMonday, "d MMM", { locale: fr })})`,
    };
  });

  const selectedRoutine = routines?.find(r => r.animal_id === selectedAnimalId);

  const handleAutoAssign = async () => {
    if (!selectedAnimalId) return;

    const assignResult = await autoAssign.mutateAsync({
      animal_id: selectedAnimalId,
      year: selectedYear,
      week_number: selectedWeek,
    });

    setResult(assignResult);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Affectation automatique
          </CardTitle>
          <CardDescription>
            Affectez automatiquement un chien aux créneaux disponibles selon sa routine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection de la semaine */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Semaine cible
            </label>
            <Select
              value={selectedWeek.toString()}
              onValueChange={(v) => setSelectedWeek(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection du chien */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Dog className="h-4 w-4" />
              Chien à affecter
            </label>
            <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un chien avec routine..." />
              </SelectTrigger>
              <SelectContent>
                {routines?.map(routine => (
                  <SelectItem key={routine.animal_id} value={routine.animal_id}>
                    {routine.animals.name} - {routine.animals.clients?.first_name} ({ROUTINE_LABELS[routine.routine_type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aperçu de la routine sélectionnée */}
          {selectedRoutine && (
            <div className="p-4 rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{selectedRoutine.animals.name}</span>
                <Badge variant="outline">
                  {ROUTINE_LABELS[selectedRoutine.routine_type]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {selectedRoutine.sector
                      ? SECTOR_LABELS[selectedRoutine.sector]
                      : "Secteur non défini"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Créneau :</span>
                  <span>{TIME_PREFERENCE_LABELS[selectedRoutine.time_preference]}</span>
                </div>
              </div>

              {selectedRoutine.preferred_days && selectedRoutine.preferred_days.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground mr-2">Jours préférés :</span>
                  {selectedRoutine.preferred_days.map(day => (
                    <Badge key={day} variant="secondary" className="text-xs">
                      {DAY_LABELS[day]}
                    </Badge>
                  ))}
                </div>
              )}

              {selectedRoutine.behavior_notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes : </span>
                  {selectedRoutine.behavior_notes}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Bouton d'affectation */}
          <Button
            onClick={handleAutoAssign}
            disabled={!selectedAnimalId || autoAssign.isPending}
            className="w-full"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Affecter automatiquement
          </Button>
        </CardContent>
      </Card>

      {/* Résultat de l'affectation */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <div className="space-y-2">
              <AlertDescription className="font-medium">
                {result.message}
              </AlertDescription>

              {result.success && result.assignedGroups.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Créneaux attribués :</span>
                  {result.assignedGroups.map(groupId => (
                    <Badge key={groupId} variant="outline">
                      {groupId}
                    </Badge>
                  ))}
                </div>
              )}

              {!result.success && result.fallbackOptions && result.fallbackOptions.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm">Créneaux partiellement disponibles :</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.fallbackOptions.map(groupId => (
                      <Badge key={groupId} variant="secondary">
                        {groupId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Liste des chiens sans routine */}
      {routines && routines.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucun chien n'a de routine configurée. Configurez d'abord les routines dans la section Animaux.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
