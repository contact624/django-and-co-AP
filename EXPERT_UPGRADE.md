# Service Pilot HQ - Django & Co 🐕

## Version Expert++ - Guide des améliorations

Ce document détaille toutes les améliorations apportées pour transformer l'application en solution professionnelle de niveau expert pour la gestion d'une activité de promeneur canin.

---

## 📋 Table des matières

1. [Architecture des améliorations](#architecture-des-améliorations)
2. [Nouvelles fonctionnalités](#nouvelles-fonctionnalités)
3. [Sécurité renforcée](#sécurité-renforcée)
4. [Logique métier](#logique-métier)
5. [Base de données](#base-de-données)
6. [Utilisation](#utilisation)
7. [Configuration](#configuration)

---

## 🏗️ Architecture des améliorations

### Structure des nouveaux fichiers

```
src/
├── lib/
│   ├── business-rules/           # ⭐ NOUVEAU: Moteur de règles métier
│   │   ├── index.ts              # Export centralisé
│   │   ├── planningEngine.ts     # Validation et analyse du planning
│   │   ├── invoicingEngine.ts    # Facturation automatique
│   │   └── absenceManager.ts     # Gestion des absences
│   ├── businessValidation.ts     # ⭐ NOUVEAU: Validations métier Zod
│   └── validation.ts             # Validations de base (amélioré)
├── hooks/
│   ├── useAbsences.ts            # ⭐ NOUVEAU: Gestion des absences
│   ├── usePlanningSync.ts        # ⭐ NOUVEAU: Sync planning → activités
│   └── usePaymentReminders.ts    # ⭐ NOUVEAU: Rappels de paiement
├── components/
│   ├── planning/
│   │   └── advanced/             # ⭐ NOUVEAU: Composants avancés
│   │       ├── PlanningAlerts.tsx
│   │       ├── AbsenceModal.tsx
│   │       └── index.ts
│   └── dashboard/
│       └── CriticalAlerts.tsx    # ⭐ NOUVEAU: Widget alertes
└── supabase/
    └── migrations/
        └── 20251214210000_expert_features.sql  # ⭐ NOUVELLE MIGRATION
```

---

## ✨ Nouvelles fonctionnalités

### 1. Moteur de règles métier (`planningEngine.ts`)

**Validations automatiques :**
- Vérification de capacité des groupes
- Détection des doubles réservations
- Validation des routines (R1, R2, R3)
- Analyse de charge hebdomadaire

**Fonctions clés :**
```typescript
// Valider une affectation de chien
const result = validateDogAssignment({
  dogId: '...',
  dogName: 'Rex',
  groupId: 'LU-B1',
  walkType: 'COLLECTIVE',
  currentAssignments: [...],
  currentGroupCount: 3,
  maxCapacity: 4,
});

if (!result.isValid) {
  console.log(result.violations); // Erreurs
  console.log(result.warnings);   // Avertissements
}

// Analyser la charge de la semaine
const analysis = analyzeWeeklyLoad({ groups, assignments });
console.log(analysis.utilizationPercent); // 75%
console.log(analysis.overBookedGroups);   // ['LU-B2']
```

### 2. Gestion des absences (`absenceManager.ts`)

**Politiques d'annulation automatiques :**
- **> 24h avant** : Non facturé
- **< 24h avant** : 50% facturé
- **Jour même** : 100% facturé
- **Maladie/Vétérinaire** : Report proposé

**Types d'absence :**
- Vacances client
- Chien malade
- Chaleurs
- RDV vétérinaire
- Événement familial
- Promeneur absent
- Météo extrême

### 3. Facturation automatique (`invoicingEngine.ts`)

**Forfaits mensuels :**
| Routine | Balades/sem | Prix mensuel | Prix/balade |
|---------|-------------|--------------|-------------|
| R1      | 1           | 115 CHF      | 26.50 CHF   |
| R2      | 2           | 220 CHF      | 25.40 CHF   |
| R3      | 3           | 315 CHF      | 24.20 CHF   |
| R+      | 4+          | 400 CHF      | 23.50 CHF   |

**Fonctionnalités :**
- Génération automatique des factures mensuelles
- Application des réductions forfait
- Rappels de paiement automatisés (3 niveaux)
- Rapports mensuels de revenus

### 4. Synchronisation Planning → Activités

**Workflow automatique :**
1. Balade marquée "effectuée" dans le planning
2. Activité créée automatiquement avec le bon prix
3. Activité disponible pour facturation

```typescript
// Synchroniser une balade
const { mutateAsync: syncAssignment } = useSyncAssignmentToActivity();

await syncAssignment({
  assignmentId: '...',
  dogId: '...',
  groupId: 'LU-B1',
  walkType: 'COLLECTIVE',
  year: 2024,
  weekNumber: 51,
});

// Synchroniser toute une semaine
const { mutateAsync: batchSync } = useBatchSyncWeek();
const result = await batchSync({ year: 2024, weekNumber: 51 });
console.log(`${result.success}/${result.total} balades synchronisées`);
```

---

## 🔒 Sécurité renforcée

### Validations côté serveur (PostgreSQL)

**Triggers de protection :**
```sql
-- Vérifie la capacité avant insertion
CREATE TRIGGER check_capacity_before_insert
  BEFORE INSERT ON group_assignments
  FOR EACH ROW EXECUTE FUNCTION check_group_capacity();

-- Vérifie que le groupe n'est pas bloqué
CREATE TRIGGER check_blocked_before_insert
  BEFORE INSERT ON group_assignments
  FOR EACH ROW EXECUTE FUNCTION check_group_not_blocked();

-- Audit automatique des modifications
CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

### Row Level Security (RLS)

Toutes les nouvelles tables sont protégées par RLS :
- `absence_records`
- `vacation_periods`
- `client_packages`
- `audit_log`
- `invoice_reminders`

### Validations côté client (Zod)

```typescript
// Validation stricte des routines
const dogRoutineSchema = z.object({
  animal_id: z.string().uuid(),
  routine_type: z.enum(['R1', 'R2', 'R3', 'ROUTINE_PLUS', 'PONCTUEL']),
  sector: z.enum(['S1', 'S2', 'S3']).nullable(),
  // ... avec règles métier
}).refine(/* validation croisée */);

// Validation des mots de passe renforcée
const passwordSchema = z.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), "Majuscule requise")
  .refine(val => /[a-z]/.test(val), "Minuscule requise")
  .refine(val => /[0-9]/.test(val), "Chiffre requis")
  .refine(val => /[!@#$%^&*]/.test(val), "Caractère spécial requis");
```

---

## 📊 Logique métier

### Constantes importantes

```typescript
// Capacités
ABSOLUTE_MAX_CAPACITY = 6;        // Max absolu par groupe
MAX_WALKS_PER_DOG_PER_WEEK = 5;   // Max balades/chien/semaine

// Durées (minutes)
ACTIVITY_DURATIONS = {
  COLLECTIVE: 120,    // 2h (30+60+30)
  INDIVIDUELLE: 120,
  CANIRANDO: 240,     // 4h
  SUR_MESURE: 120,
};

// Prix par défaut (CHF)
DEFAULT_PRICES = {
  COLLECTIVE: 30,
  INDIVIDUELLE: 50,
  CANIRANDO: 70,
  SUR_MESURE: 45,
};
```

### Secteurs géographiques

| Secteur | Zone | Communes |
|---------|------|----------|
| S1 | Nyon & proches | Nyon, Prangins, Crans, Eysins, Duillier |
| S2 | Lac / Genève | Gland, Vich, Rolle, Coppet, Founex |
| S3 | Jura / Campagne | Begnins, Genolier, Bassins, Arzier |

---

## 🗄️ Base de données

### Nouvelles tables

#### `absence_records`
Enregistre toutes les absences et annulations avec :
- Type d'absence
- Politique appliquée
- Montant facturé
- Informations de report

#### `vacation_periods`
Périodes de vacances planifiées :
- Date début/fin
- Raison
- Traitement automatique des absences

#### `client_packages`
Forfaits mensuels :
- Type de routine
- Prix mensuel
- Compteur de balades
- Crédits reportés

#### `audit_log`
Traçabilité complète :
- Actions (CREATE, UPDATE, DELETE)
- Valeurs avant/après
- Métadonnées (IP, user agent)

#### `invoice_reminders`
Historique des rappels :
- Niveau de rappel (1, 2, 3)
- Message envoyé
- Statut de livraison

---

## 🚀 Utilisation

### Appliquer les migrations

```bash
# Avec Supabase CLI
supabase db push

# Ou manuellement dans le SQL Editor de Supabase
# Copier le contenu de: supabase/migrations/20251214210000_expert_features.sql
```

### Activer les alertes sur le dashboard

```tsx
// Dans Dashboard.tsx, ajouter :
import { CriticalAlertsWidget, QuickStatsBar } from '@/components/dashboard/CriticalAlerts';

// Dans le JSX :
<QuickStatsBar />
<CriticalAlertsWidget />
```

### Utiliser la gestion des absences

```tsx
import { useCreateAbsence, useAbsences } from '@/hooks/useAbsences';
import { AbsenceModal } from '@/components/planning/advanced';

// Dans un composant
const createAbsence = useCreateAbsence();
const { data: absences } = useAbsences({ startDate: '2024-01-01' });

// Créer une absence
await createAbsence.mutateAsync({
  dogId: '...',
  clientId: '...',
  groupId: 'LU-B1',
  date: new Date(),
  absenceType: 'CHIEN_MALADE',
});
```

---

## ⚙️ Configuration

### Variables d'environnement

```env
# Déjà configurées
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Personnalisation des prix

Modifier dans `src/lib/business-rules/planningEngine.ts` :

```typescript
export const DEFAULT_PRICES = {
  COLLECTIVE: 30,      // ← Modifier ici
  INDIVIDUELLE: 50,
  CANIRANDO: 70,
  SUR_MESURE: 45,
};

export const MONTHLY_PACKAGES: Record<RoutineType, RoutinePackage | null> = {
  R1: {
    monthlyPrice: 115,  // ← Modifier ici
    // ...
  },
  // ...
};
```

---

## 📝 Notes importantes

### Ce qui n'est PAS encore implémenté

1. **Envoi réel d'emails** - Les rappels sont préparés mais l'envoi nécessite une Edge Function
2. **SMS** - Nécessite un service tiers (Twilio, etc.)
3. **Export comptable** - Format CSV/Excel à ajouter
4. **Application mobile** - Le front est responsive mais pas PWA complète
5. **Notifications push** - Nécessite Service Worker

### Recommandations

1. **Testez en staging d'abord** - Les triggers SQL peuvent bloquer des insertions
2. **Sauvegardez régulièrement** - L'audit log peut devenir volumineux
3. **Formez-vous** - La logique métier est complexe, prenez le temps de la comprendre

---

## 🆘 Support

Pour toute question sur ces améliorations :
1. Consultez le code source documenté
2. Les commentaires dans les fichiers expliquent chaque fonction
3. Les types TypeScript sont explicites et servent de documentation

---

*Version Expert++ - Développé pour Django & Co* 🐕
