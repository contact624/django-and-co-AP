/**
 * =====================================================
 * MODAL: GESTION DES ABSENCES
 * =====================================================
 * 
 * Permet d'enregistrer une absence avec :
 * - Sélection du type d'absence
 * - Calcul automatique de la politique de facturation
 * - Proposition de dates de report
 * - Historique des absences du chien
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  DollarSign,
  RotateCcw,
  Clock,
  Info,
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import {
  determineCancellationPolicy,
  calculateCancellationCharge,
  ABSENCE_TYPE_LABELS,
  CANCELLATION_POLICY_LABELS,
  AbsenceType,
  CancellationPolicy,
} from "@/lib/business-rules";
import { useCreateAbsence } from "@/hooks/useAbsences";
import { WalkType, DAY_LABELS, TimeBlock, BLOCK_SCHEDULES } from "@/lib/planningTypes";

interface AbsenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    dogId: string;
    dogName: string;
    clientId: string;
    clientName: string;
    groupId: string;
    date: Date;
    day: string;
    block: TimeBlock;
  };
  walkType: WalkType;
  isPackageClient?: boolean;
}

const ABSENCE_TYPE_OPTIONS: Array<{ value: AbsenceType; label: string; icon: string }> = [
  { value: 'CHIEN_MALADE', label: 'Chien malade', icon: '🤒' },
  { value: 'VACANCES_CLIENT', label: 'Vacances', icon: '🏖️' },
  { value: 'RENDEZ_VOUS_VETERINAIRE', label: 'RDV vétérinaire', icon: '🏥' },
  { value: 'CHIEN_CHALEURS', label: 'Chaleurs', icon: '🐕' },
  { value: 'EVENEMENT_FAMILIAL', label: 'Événement familial', icon: '👨‍👩‍👧' },
  { value: 'PROMENEUR_ABSENT', label: 'Promeneur absent', icon: '🚫' },
  { value: 'METEO_EXTREME', label: 'Météo extrême', icon: '⛈️' },
  { value: 'AUTRE', label: 'Autre raison', icon: '📝' },
];

export function AbsenceModal({
  open,
  onOpenChange,
  assignment,
  walkType,
  isPackageClient = false,
}: AbsenceModalProps) {
  const [absenceType, setAbsenceType] = useState<AbsenceType>('CHIEN_MALADE');
  const [reason, setReason] = useState('');
  
  const createAbsence = useCreateAbsence();

  // Calculer la politique d'annulation
  const policyInfo = useMemo(() => {
    const now = new Date();
    const { policy, chargePercent, reason: policyReason } = determineCancellationPolicy({
      originalDate: assignment.date,
      cancellationTime: now,
      absenceType,
      isPackageClient,
    });

    const chargeAmount = calculateCancellationCharge({
      walkType,
      chargePercent,
    });

    const hoursUntilWalk = differenceInHours(assignment.date, now);

    return {
      policy,
      chargePercent,
      chargeAmount,
      policyReason,
      hoursUntilWalk,
    };
  }, [absenceType, assignment.date, walkType, isPackageClient]);

  const handleSubmit = async () => {
    await createAbsence.mutateAsync({
      dogId: assignment.dogId,
      clientId: assignment.clientId,
      groupId: assignment.groupId,
      date: assignment.date,
      absenceType,
      reason: reason || undefined,
      walkType,
      isPackageClient,
    });
    onOpenChange(false);
  };

  // Couleurs selon la politique
  const policyColors: Record<CancellationPolicy, { bg: string; text: string }> = {
    FULL_REFUND: { bg: 'bg-green-500/20', text: 'text-green-400' },
    PARTIAL_CHARGE: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    FULL_CHARGE: { bg: 'bg-red-500/20', text: 'text-red-400' },
    RESCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    PACKAGE_CREDIT: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  };

  const colors = policyColors[policyInfo.policy];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Enregistrer une absence
          </DialogTitle>
          <DialogDescription>
            {assignment.dogName} - {format(assignment.date, 'EEEE d MMMM', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Infos du créneau */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
            <div className="flex-1">
              <div className="font-medium">{assignment.groupId}</div>
              <div className="text-sm text-muted-foreground">
                {BLOCK_SCHEDULES[assignment.block].start} - {BLOCK_SCHEDULES[assignment.block].end}
              </div>
            </div>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {policyInfo.hoursUntilWalk}h avant
            </Badge>
          </div>

          {/* Type d'absence */}
          <div className="space-y-3">
            <Label>Raison de l'absence</Label>
            <RadioGroup
              value={absenceType}
              onValueChange={(v) => setAbsenceType(v as AbsenceType)}
              className="grid grid-cols-2 gap-2"
            >
              {ABSENCE_TYPE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    absenceType === option.value
                      ? 'bg-primary/20 border-primary/50'
                      : 'border-border/50 hover:bg-muted/30'
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <label
                    htmlFor={option.value}
                    className="flex-1 flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Note additionnelle */}
          {absenceType === 'AUTRE' && (
            <div className="space-y-2">
              <Label>Précisions</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Décrivez la raison de l'absence..."
                rows={2}
              />
            </div>
          )}

          <Separator />

          {/* Politique de facturation */}
          <div className={`p-4 rounded-lg ${colors.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${colors.text}`}>
                {CANCELLATION_POLICY_LABELS[policyInfo.policy]}
              </span>
              {policyInfo.chargeAmount > 0 && (
                <Badge variant="outline" className={colors.text}>
                  <DollarSign className="h-3 w-3 mr-1" />
                  {policyInfo.chargeAmount.toFixed(2)} CHF
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {policyInfo.policyReason}
            </p>

            {policyInfo.policy === 'RESCHEDULED' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
                <RotateCcw className="h-4 w-4" />
                Un report vous sera proposé après confirmation
              </div>
            )}
          </div>

          {/* Info sur la politique */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            <p>
              {policyInfo.hoursUntilWalk > 24 
                ? "Annulation gratuite si plus de 24h avant la balade."
                : policyInfo.hoursUntilWalk > 6
                ? "Annulation tardive (< 24h): facturation partielle de 50%."
                : "Annulation le jour même: facturation complète."
              }
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createAbsence.isPending}
            variant={policyInfo.chargeAmount > 0 ? "destructive" : "default"}
          >
            {createAbsence.isPending ? "Enregistrement..." : "Confirmer l'absence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
