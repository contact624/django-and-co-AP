/**
 * =====================================================
 * SYSTÈME DE FACTURATION AUTOMATIQUE - DJANGO & CO
 * =====================================================
 * 
 * Ce module gère la logique de facturation avancée :
 * - Génération automatique de factures mensuelles
 * - Calcul des montants basé sur les routines
 * - Gestion des forfaits et réductions
 * - Rappels de paiement automatisés
 * - Export comptable
 * 
 * PRINCIPE : La facturation doit être automatique et sans erreur.
 * Le promeneur ne doit jamais oublier une prestation facturable.
 */

import { format, addDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RoutineType, WalkType, ROUTINE_WALK_COUNT, DEFAULT_PRICES } from './planningEngine';

// =====================================================
// TYPES FACTURATION
// =====================================================

export interface InvoiceLineItem {
  id?: string;
  description: string;
  serviceType: WalkType | 'FORFAIT';
  quantity: number;
  unitPrice: number;
  total: number;
  activityIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface InvoiceCalculation {
  clientId: string;
  clientName: string;
  period: { start: Date; end: Date };
  lines: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  dueDate: Date;
  notes: string;
}

export interface RoutinePackage {
  routineType: RoutineType;
  walkType: WalkType;
  walksPerWeek: number;
  monthlyPrice: number;
  pricePerWalk: number;
  description: string;
}

export interface PaymentReminder {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  dueDate: Date;
  daysPastDue: number;
  reminderLevel: 'first' | 'second' | 'final';
  templateMessage: string;
}

export interface MonthlyReport {
  month: Date;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  invoicesSent: number;
  invoicesPaid: number;
  invoicesOverdue: number;
  totalWalks: number;
  uniqueClients: number;
  averageRevenuePerClient: number;
  topClients: Array<{ clientName: string; revenue: number }>;
  revenueByServiceType: Record<WalkType, number>;
}

// =====================================================
// FORFAITS MENSUELS PAR ROUTINE
// =====================================================

/**
 * Définition des forfaits mensuels.
 * Basé sur 4.33 semaines par mois en moyenne.
 * 
 * HYPOTHÈSES DE PRIX :
 * - Balade collective: 30 CHF/balade
 * - Les forfaits offrent une légère réduction (5-10%)
 */
export const MONTHLY_PACKAGES: Record<RoutineType, RoutinePackage | null> = {
  R1: {
    routineType: 'R1',
    walkType: 'COLLECTIVE',
    walksPerWeek: 1,
    monthlyPrice: 115, // ~4.33 balades × 30 CHF - 5%
    pricePerWalk: 26.5,
    description: 'Forfait 1 balade/semaine',
  },
  R2: {
    routineType: 'R2',
    walkType: 'COLLECTIVE',
    walksPerWeek: 2,
    monthlyPrice: 220, // ~8.66 balades × 30 CHF - 8%
    pricePerWalk: 25.4,
    description: 'Forfait 2 balades/semaine',
  },
  R3: {
    routineType: 'R3',
    walkType: 'COLLECTIVE',
    walksPerWeek: 3,
    monthlyPrice: 315, // ~13 balades × 30 CHF - 10%
    pricePerWalk: 24.2,
    description: 'Forfait 3 balades/semaine',
  },
  ROUTINE_PLUS: {
    routineType: 'ROUTINE_PLUS',
    walkType: 'COLLECTIVE',
    walksPerWeek: 4,
    monthlyPrice: 400, // ~17 balades × 30 CHF - 12%
    pricePerWalk: 23.5,
    description: 'Forfait 4+ balades/semaine',
  },
  PONCTUEL: null, // Facturé à l'acte
};

// =====================================================
// CALCUL DE FACTURE
// =====================================================

/**
 * Calcule automatiquement une facture pour un client sur une période donnée
 */
export function calculateInvoice(params: {
  clientId: string;
  clientName: string;
  activities: Array<{
    id: string;
    dogName: string;
    serviceType: WalkType;
    date: Date;
    unitPrice?: number;
    quantity?: number;
    isFromRoutine?: boolean;
  }>;
  dogRoutines?: Array<{
    dogName: string;
    routineType: RoutineType;
    usePackage: boolean;
  }>;
  periodStart: Date;
  periodEnd: Date;
  taxRate?: number;
  paymentDelayDays?: number;
  applyPackageDiscount?: boolean;
}): InvoiceCalculation {
  const {
    clientId,
    clientName,
    activities,
    dogRoutines = [],
    periodStart,
    periodEnd,
    taxRate = 0,
    paymentDelayDays = 30,
    applyPackageDiscount = true,
  } = params;

  const lines: InvoiceLineItem[] = [];

  // Grouper les activités par chien et type
  const activitiesByDogAndType = new Map<string, {
    dogName: string;
    serviceType: WalkType;
    activities: typeof activities;
    totalQuantity: number;
  }>();

  activities.forEach(activity => {
    const key = `${activity.dogName}-${activity.serviceType}`;
    const existing = activitiesByDogAndType.get(key);
    const qty = activity.quantity || 1;
    
    if (existing) {
      existing.activities.push(activity);
      existing.totalQuantity += qty;
    } else {
      activitiesByDogAndType.set(key, {
        dogName: activity.dogName,
        serviceType: activity.serviceType,
        activities: [activity],
        totalQuantity: qty,
      });
    }
  });

  // Traiter chaque groupe
  activitiesByDogAndType.forEach(({ dogName, serviceType, activities, totalQuantity }) => {
    // Chercher si ce chien a un forfait
    const dogRoutine = dogRoutines.find(r => r.dogName === dogName);
    const hasPackage = dogRoutine && dogRoutine.usePackage && MONTHLY_PACKAGES[dogRoutine.routineType];
    const pkg = hasPackage ? MONTHLY_PACKAGES[dogRoutine.routineType] : null;

    let lineDescription: string;
    let unitPrice: number;
    let lineQuantity: number;
    let lineTotal: number;

    if (applyPackageDiscount && pkg && serviceType === 'COLLECTIVE') {
      // Appliquer le forfait mensuel
      const expectedWalks = pkg.walksPerWeek * 4.33;
      
      if (totalQuantity >= expectedWalks * 0.75) {
        // Facturer au forfait si le client a utilisé au moins 75% des balades prévues
        lineDescription = `${dogName} - ${pkg.description} (${format(periodStart, 'MMMM yyyy', { locale: fr })})`;
        unitPrice = pkg.monthlyPrice;
        lineQuantity = 1;
        lineTotal = pkg.monthlyPrice;
      } else {
        // Sinon facturer à l'unité au prix forfait
        lineDescription = `${dogName} - Balades collectives (${totalQuantity}x)`;
        unitPrice = pkg.pricePerWalk;
        lineQuantity = totalQuantity;
        lineTotal = unitPrice * lineQuantity;
      }
    } else {
      // Facturation à l'unité standard
      const basePrice = activities[0].unitPrice ?? DEFAULT_PRICES[serviceType];
      lineDescription = `${dogName} - ${formatServiceType(serviceType)} (${totalQuantity}x)`;
      unitPrice = basePrice;
      lineQuantity = totalQuantity;
      lineTotal = unitPrice * lineQuantity;
    }

    lines.push({
      description: lineDescription,
      serviceType: applyPackageDiscount && pkg ? 'FORFAIT' : serviceType,
      quantity: lineQuantity,
      unitPrice,
      total: lineTotal,
      activityIds: activities.map(a => a.id),
    });
  });

  // Calculer les totaux
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const dueDate = addDays(new Date(), paymentDelayDays);

  // Générer les notes
  const periodStr = `${format(periodStart, 'd MMMM', { locale: fr })} au ${format(periodEnd, 'd MMMM yyyy', { locale: fr })}`;
  const notes = `Prestations du ${periodStr}`;

  return {
    clientId,
    clientName,
    period: { start: periodStart, end: periodEnd },
    lines,
    subtotal,
    taxRate,
    taxAmount,
    total,
    dueDate,
    notes,
  };
}

/**
 * Génère toutes les factures mensuelles pour tous les clients
 */
export function generateMonthlyInvoices(params: {
  month: Date;
  clients: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  activities: Array<{
    id: string;
    clientId: string;
    dogName: string;
    serviceType: WalkType;
    date: Date;
    unitPrice?: number;
    quantity?: number;
  }>;
  dogRoutines: Array<{
    clientId: string;
    dogName: string;
    routineType: RoutineType;
    usePackage: boolean;
  }>;
  taxRate?: number;
  paymentDelayDays?: number;
}): InvoiceCalculation[] {
  const { month, clients, activities, dogRoutines, taxRate, paymentDelayDays } = params;
  
  const periodStart = startOfMonth(month);
  const periodEnd = endOfMonth(month);

  const invoices: InvoiceCalculation[] = [];

  clients.forEach(client => {
    // Filtrer les activités du client pour ce mois
    const clientActivities = activities.filter(a => 
      a.clientId === client.id &&
      a.date >= periodStart &&
      a.date <= periodEnd
    );

    if (clientActivities.length === 0) return;

    // Récupérer les routines des chiens de ce client
    const clientRoutines = dogRoutines.filter(r => r.clientId === client.id);

    const invoice = calculateInvoice({
      clientId: client.id,
      clientName: client.name,
      activities: clientActivities,
      dogRoutines: clientRoutines,
      periodStart,
      periodEnd,
      taxRate,
      paymentDelayDays,
    });

    invoices.push(invoice);
  });

  return invoices;
}

// =====================================================
// RAPPELS DE PAIEMENT
// =====================================================

/**
 * Génère les rappels de paiement pour les factures en retard
 */
export function generatePaymentReminders(params: {
  overdueInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientId: string;
    clientName: string;
    clientEmail: string;
    total: number;
    dueDate: Date;
    lastReminderDate?: Date;
    reminderCount: number;
  }>;
  reminderIntervalDays?: number;
}): PaymentReminder[] {
  const { overdueInvoices, reminderIntervalDays = 7 } = params;
  const today = new Date();
  const reminders: PaymentReminder[] = [];

  overdueInvoices.forEach(invoice => {
    const daysPastDue = differenceInDays(today, invoice.dueDate);
    
    // Déterminer si un rappel est nécessaire
    const daysSinceLastReminder = invoice.lastReminderDate
      ? differenceInDays(today, invoice.lastReminderDate)
      : daysPastDue;

    if (daysSinceLastReminder < reminderIntervalDays) return;

    // Déterminer le niveau de rappel
    let reminderLevel: 'first' | 'second' | 'final';
    if (invoice.reminderCount === 0) {
      reminderLevel = 'first';
    } else if (invoice.reminderCount === 1) {
      reminderLevel = 'second';
    } else {
      reminderLevel = 'final';
    }

    // Générer le message template
    const templateMessage = generateReminderTemplate({
      clientName: invoice.clientName,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      dueDate: invoice.dueDate,
      daysPastDue,
      reminderLevel,
    });

    reminders.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      amount: invoice.total,
      dueDate: invoice.dueDate,
      daysPastDue,
      reminderLevel,
      templateMessage,
    });
  });

  return reminders;
}

function generateReminderTemplate(params: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  daysPastDue: number;
  reminderLevel: 'first' | 'second' | 'final';
}): string {
  const { clientName, invoiceNumber, amount, dueDate, daysPastDue, reminderLevel } = params;
  const dueDateStr = format(dueDate, 'd MMMM yyyy', { locale: fr });
  const amountStr = `${amount.toFixed(2)} CHF`;

  switch (reminderLevel) {
    case 'first':
      return `
Bonjour ${clientName},

Nous espérons que tout va bien !

Nous vous contactons au sujet de la facture ${invoiceNumber} d'un montant de ${amountStr}, 
dont la date d'échéance était le ${dueDateStr} (${daysPastDue} jours).

Si vous avez déjà effectué le paiement, veuillez ignorer ce message.

Merci pour votre confiance !

Cordialement,
Django & Co
      `.trim();

    case 'second':
      return `
Bonjour ${clientName},

Nous vous relançons concernant la facture ${invoiceNumber} d'un montant de ${amountStr}, 
en retard de ${daysPastDue} jours (échéance: ${dueDateStr}).

Pourriez-vous nous confirmer la réception de cette facture et 
nous indiquer quand nous pouvons attendre le règlement ?

N'hésitez pas à nous contacter si vous avez des questions.

Cordialement,
Django & Co
      `.trim();

    case 'final':
      return `
Bonjour ${clientName},

Malgré nos rappels précédents, la facture ${invoiceNumber} d'un montant de ${amountStr} 
reste impayée depuis ${daysPastDue} jours.

Sans règlement de votre part sous 7 jours, nous serons contraints de 
suspendre nos services et d'engager une procédure de recouvrement.

Nous restons à votre disposition pour trouver une solution.

Cordialement,
Django & Co
      `.trim();
  }
}

// =====================================================
// RAPPORTS MENSUELS
// =====================================================

/**
 * Génère un rapport mensuel complet
 */
export function generateMonthlyReport(params: {
  month: Date;
  invoices: Array<{
    clientId: string;
    clientName: string;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
  }>;
  expenses: Array<{
    category: string;
    amount: number;
  }>;
  activities: Array<{
    clientId: string;
    serviceType: WalkType;
    total: number;
  }>;
}): MonthlyReport {
  const { month, invoices, expenses, activities } = params;

  // Revenus
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);

  // Dépenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Profit
  const netProfit = totalRevenue - totalExpenses;

  // Stats factures
  const invoicesSent = invoices.filter(i => i.status !== 'draft').length;
  const invoicesPaid = paidInvoices.length;
  const invoicesOverdue = invoices.filter(i => i.status === 'overdue').length;

  // Stats activités
  const totalWalks = activities.length;
  const uniqueClients = new Set(activities.map(a => a.clientId)).size;
  const averageRevenuePerClient = uniqueClients > 0 ? totalRevenue / uniqueClients : 0;

  // Top clients
  const revenueByClient = new Map<string, { name: string; revenue: number }>();
  paidInvoices.forEach(inv => {
    const existing = revenueByClient.get(inv.clientId);
    if (existing) {
      existing.revenue += inv.total;
    } else {
      revenueByClient.set(inv.clientId, { name: inv.clientName, revenue: inv.total });
    }
  });
  const topClients = Array.from(revenueByClient.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(c => ({ clientName: c.name, revenue: c.revenue }));

  // Revenu par type de service
  const revenueByServiceType: Record<WalkType, number> = {
    COLLECTIVE: 0,
    INDIVIDUELLE: 0,
    CANIRANDO: 0,
    SUR_MESURE: 0,
  };
  activities.forEach(a => {
    revenueByServiceType[a.serviceType] += a.total;
  });

  return {
    month,
    totalRevenue,
    totalExpenses,
    netProfit,
    invoicesSent,
    invoicesPaid,
    invoicesOverdue,
    totalWalks,
    uniqueClients,
    averageRevenuePerClient,
    topClients,
    revenueByServiceType,
  };
}

// =====================================================
// UTILITAIRES
// =====================================================

function formatServiceType(type: WalkType): string {
  const labels: Record<WalkType, string> = {
    COLLECTIVE: 'Balade collective',
    INDIVIDUELLE: 'Balade individuelle',
    CANIRANDO: 'Cani-Rando',
    SUR_MESURE: 'Balade sur mesure',
  };
  return labels[type];
}

/**
 * Calcule la réduction applicable pour un volume de balades
 */
export function calculateVolumeDiscount(walkCount: number): { percent: number; description: string } {
  if (walkCount >= 16) return { percent: 12, description: '12% (4+ balades/semaine)' };
  if (walkCount >= 12) return { percent: 10, description: '10% (3 balades/semaine)' };
  if (walkCount >= 8) return { percent: 8, description: '8% (2 balades/semaine)' };
  if (walkCount >= 4) return { percent: 5, description: '5% (1 balade/semaine)' };
  return { percent: 0, description: 'Tarif standard' };
}

/**
 * Estime le revenu mensuel pour une configuration de routines
 */
export function estimateMonthlyRevenue(routines: Array<{
  routineType: RoutineType;
  count: number; // Nombre de chiens avec cette routine
}>): { 
  estimated: number;
  breakdown: Array<{ routine: RoutineType; count: number; revenue: number }>;
} {
  const breakdown: Array<{ routine: RoutineType; count: number; revenue: number }> = [];
  let total = 0;

  routines.forEach(({ routineType, count }) => {
    const pkg = MONTHLY_PACKAGES[routineType];
    if (pkg) {
      const revenue = pkg.monthlyPrice * count;
      breakdown.push({ routine: routineType, count, revenue });
      total += revenue;
    } else if (routineType === 'PONCTUEL') {
      // Estimation: 2 balades ponctuelles par mois en moyenne
      const revenue = DEFAULT_PRICES.COLLECTIVE * 2 * count;
      breakdown.push({ routine: routineType, count, revenue });
      total += revenue;
    }
  });

  return { estimated: total, breakdown };
}
