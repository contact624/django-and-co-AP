/**
 * =====================================================
 * FORMULAIRE ROUTINE CHIEN
 * =====================================================
 * 
 * Permet de configurer la routine d'un chien :
 * - Type de routine (R1, R2, R3, ponctuel)
 * - Secteur géographique
 * - Préférences de jours et créneaux
 * - Notes comportementales
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dog, MapPin, Calendar, Clock, AlertCircle } from "lucide-react";
import {
  RoutineType,
  GeographicSector,
  TimePreference,
  WalkType,
  WorkDay,
  ROUTINE_LABELS,
  SECTOR_LABELS,
  SECTOR_DESCRIPTIONS,
  TIME_PREFERENCE_LABELS,
  WALK_TYPE_LABELS,
  DAY_LABELS,
  WORK_DAYS,
  DogRoutine,
} from "@/lib/planningTypes";
import {
  useCreateDogRoutine,
  useUpdateDogRoutine,
  useDogRoutine,
} from "@/hooks/usePlanning";
import { AnimalWithClient } from "@/hooks/useAnimals";

interface DogRoutineFormProps {
  animal: AnimalWithClient;
  onSuccess?: () => void;
}

export function DogRoutineForm({ animal, onSuccess }: DogRoutineFormProps) {
  const { data: existingRoutine, isLoading } = useDogRoutine(animal.id);
  const createRoutine = useCreateDogRoutine();
  const updateRoutine = useUpdateDogRoutine();

  const [routineType, setRoutineType] = useState<RoutineType>("PONCTUEL");
  const [sector, setSector] = useState<GeographicSector | "">("");
  const [timePreference, setTimePreference] = useState<TimePreference>("INDIFFERENT");
  const [preferredDays, setPreferredDays] = useState<WorkDay[]>([]);
  const [walkTypePreference, setWalkTypePreference] = useState<WalkType>("COLLECTIVE");
  const [behaviorNotes, setBehaviorNotes] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");

  // Charger les données existantes
  useEffect(() => {
    if (existingRoutine) {
      setRoutineType(existingRoutine.routine_type as RoutineType);
      setSector((existingRoutine.sector as GeographicSector) || "");
      setTimePreference(existingRoutine.time_preference as TimePreference);
      setPreferredDays((existingRoutine.preferred_days as WorkDay[]) || []);
      setWalkTypePreference(existingRoutine.walk_type_preference as WalkType);
      setBehaviorNotes(existingRoutine.behavior_notes || "");
      setSpecialRequirements(existingRoutine.special_requirements || "");
    }
  }, [existingRoutine]);

  const handleDayToggle = (day: WorkDay) => {
    setPreferredDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      animal_id: animal.id,
      routine_type: routineType,
      sector: sector || null,
      time_preference: timePreference,
      preferred_days: preferredDays,
      walk_type_preference: walkTypePreference,
      behavior_notes: behaviorNotes || null,
      special_requirements: specialRequirements || null,
    };

    if (existingRoutine) {
      await updateRoutine.mutateAsync({ id: existingRoutine.id, ...data });
    } else {
      await createRoutine.mutateAsync(data);
    }

    onSuccess?.();
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted/20 rounded-lg" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <Dog className="h-8 w-8 text-primary" />
        <div>
          <h3 className="font-semibold">{animal.name}</h3>
          <p className="text-sm text-muted-foreground">
            {animal.clients?.first_name} {animal.clients?.last_name}
          </p>
        </div>
        {existingRoutine && (
          <Badge className="ml-auto" variant="secondary">
            Routine configurée
          </Badge>
        )}
      </div>

      {/* Type de routine */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Type de routine
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(Object.keys(ROUTINE_LABELS) as RoutineType[]).map(type => (
            <Button
              key={type}
              type="button"
              variant={routineType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setRoutineType(type)}
              className="w-full"
            >
              {ROUTINE_LABELS[type]}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {routineType === "R1" && "1 balade collective par semaine"}
          {routineType === "R2" && "2 balades collectives par semaine, espacées"}
          {routineType === "R3" && "3 balades collectives par semaine"}
          {routineType === "ROUTINE_PLUS" && "4-5 balades par semaine, sur devis"}
          {routineType === "PONCTUEL" && "Réservation à la demande"}
        </p>
      </div>

      {/* Secteur géographique */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Secteur géographique
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(SECTOR_LABELS) as GeographicSector[]).map(s => (
            <Card
              key={s}
              className={`cursor-pointer transition-all ${
                sector === s
                  ? "border-primary bg-primary/10"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSector(s)}
            >
              <CardContent className="p-4">
                <div className="font-semibold">{s} - {SECTOR_LABELS[s]}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {SECTOR_DESCRIPTIONS[s]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Préférence horaire */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Préférence horaire
        </Label>
        <Select value={timePreference} onValueChange={(v) => setTimePreference(v as TimePreference)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIME_PREFERENCE_LABELS) as TimePreference[]).map(pref => (
              <SelectItem key={pref} value={pref}>
                {TIME_PREFERENCE_LABELS[pref]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jours préférés */}
      <div className="space-y-3">
        <Label>Jours préférés (optionnel)</Label>
        <div className="flex flex-wrap gap-2">
          {WORK_DAYS.map(day => (
            <Button
              key={day}
              type="button"
              variant={preferredDays.includes(day) ? "default" : "outline"}
              size="sm"
              onClick={() => handleDayToggle(day)}
            >
              {DAY_LABELS[day]}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {preferredDays.length === 0
            ? "Tous les jours sont acceptés"
            : `Préférence : ${preferredDays.map(d => DAY_LABELS[d]).join(", ")}`}
        </p>
      </div>

      {/* Type de balade préféré */}
      <div className="space-y-3">
        <Label>Type de balade préféré</Label>
        <Select value={walkTypePreference} onValueChange={(v) => setWalkTypePreference(v as WalkType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLLECTIVE">Collective (groupe)</SelectItem>
            <SelectItem value="INDIVIDUELLE">Individuelle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes comportementales */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Notes comportementales
        </Label>
        <Textarea
          value={behaviorNotes}
          onChange={(e) => setBehaviorNotes(e.target.value)}
          placeholder="Ex: Réactif aux mâles, ok femelles, rappel moyen..."
          rows={3}
        />
      </div>

      {/* Besoins spéciaux */}
      <div className="space-y-3">
        <Label>Besoins particuliers</Label>
        <Textarea
          value={specialRequirements}
          onChange={(e) => setSpecialRequirements(e.target.value)}
          placeholder="Ex: Médicaments, alimentation spéciale, récupération clé..."
          rows={2}
        />
      </div>

      {/* Bouton de soumission */}
      <Button
        type="submit"
        className="w-full"
        disabled={createRoutine.isPending || updateRoutine.isPending}
      >
        {existingRoutine ? "Mettre à jour la routine" : "Créer la routine"}
      </Button>
    </form>
  );
}
