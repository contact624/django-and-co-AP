// Mock data for Activity Pilot V1

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone?: string;
  address?: string;
  iban?: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressStreet: string;
  addressZip: string;
  addressCity: string;
  addressCountry: string;
  notes?: string;
  createdAt: Date;
}

export interface Animal {
  id: string;
  name: string;
  species: 'Chien' | 'Chat' | 'Autre';
  breed: string;
  birthDate?: Date;
  clientId: string;
  notes?: string;
}

export type ActivityType = 'Balade individuelle' | 'Balade groupée' | 'Éducation' | 'Dog sitting' | 'Transport' | 'Autre';
export type ActivityStatus = 'Planifiée' | 'Réalisée' | 'Facturée';

export interface Activity {
  id: string;
  clientId: string;
  animalId?: string;
  date: Date;
  startTime: string;
  type: ActivityType;
  durationMinutes: number;
  unitPrice: number;
  quantity: number;
  totalLine: number;
  status: ActivityStatus;
  invoiceId?: string;
  notes?: string;
}

export type InvoiceStatus = 'Brouillon' | 'Envoyée' | 'Payée' | 'En retard';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  activityIds: string[];
}

// Mock user
export const mockUser: User = {
  id: '1',
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@dogwalk.ch',
  companyName: 'DogWalk Lausanne',
  phone: '+41 79 123 45 67',
  address: 'Rue de la Gare 15, 1003 Lausanne',
  iban: 'CH93 0076 2011 6238 5295 7',
  createdAt: new Date('2024-01-15'),
};

// Mock clients
export const mockClients: Client[] = [
  {
    id: 'c1',
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'jean.martin@email.ch',
    phone: '+41 79 111 22 33',
    addressStreet: 'Avenue de Cour 45',
    addressZip: '1007',
    addressCity: 'Lausanne',
    addressCountry: 'Suisse',
    notes: 'Client fidèle depuis 2023',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'c2',
    firstName: 'Sophie',
    lastName: 'Blanc',
    email: 'sophie.blanc@email.ch',
    phone: '+41 79 222 33 44',
    addressStreet: 'Chemin des Alpes 12',
    addressZip: '1004',
    addressCity: 'Lausanne',
    addressCountry: 'Suisse',
    createdAt: new Date('2024-03-15'),
  },
  {
    id: 'c3',
    firstName: 'Pierre',
    lastName: 'Rochat',
    email: 'p.rochat@email.ch',
    phone: '+41 79 333 44 55',
    addressStreet: 'Rue du Lac 8',
    addressZip: '1800',
    addressCity: 'Vevey',
    addressCountry: 'Suisse',
    notes: 'Préfère les balades matinales',
    createdAt: new Date('2024-04-20'),
  },
  {
    id: 'c4',
    firstName: 'Claire',
    lastName: 'Morel',
    email: 'claire.morel@email.ch',
    phone: '+41 79 444 55 66',
    addressStreet: 'Avenue de Beaulieu 23',
    addressZip: '1004',
    addressCity: 'Lausanne',
    addressCountry: 'Suisse',
    createdAt: new Date('2024-05-10'),
  },
  {
    id: 'c5',
    firstName: 'Marc',
    lastName: 'Favre',
    email: 'marc.favre@email.ch',
    phone: '+41 79 555 66 77',
    addressStreet: 'Route de Berne 156',
    addressZip: '1010',
    addressCity: 'Lausanne',
    addressCountry: 'Suisse',
    notes: 'Nouveau client',
    createdAt: new Date('2024-10-01'),
  },
];

// Mock animals
export const mockAnimals: Animal[] = [
  { id: 'a1', name: 'Rex', species: 'Chien', breed: 'Berger Allemand', birthDate: new Date('2020-05-15'), clientId: 'c1', notes: 'Très énergique' },
  { id: 'a2', name: 'Luna', species: 'Chien', breed: 'Golden Retriever', birthDate: new Date('2021-08-20'), clientId: 'c1' },
  { id: 'a3', name: 'Max', species: 'Chien', breed: 'Labrador', birthDate: new Date('2019-03-10'), clientId: 'c2', notes: 'Calme et affectueux' },
  { id: 'a4', name: 'Bella', species: 'Chien', breed: 'Border Collie', birthDate: new Date('2022-01-05'), clientId: 'c3' },
  { id: 'a5', name: 'Oscar', species: 'Chien', breed: 'Bouledogue Français', birthDate: new Date('2021-11-30'), clientId: 'c4', notes: 'Attention à la chaleur' },
  { id: 'a6', name: 'Coco', species: 'Chien', breed: 'Caniche', birthDate: new Date('2020-07-22'), clientId: 'c4' },
  { id: 'a7', name: 'Rocky', species: 'Chien', breed: 'Boxer', birthDate: new Date('2022-04-18'), clientId: 'c5' },
  { id: 'a8', name: 'Milo', species: 'Chat', breed: 'Maine Coon', birthDate: new Date('2021-09-12'), clientId: 'c2' },
];

// Generate activities for the last 3 months
const generateActivities = (): Activity[] => {
  const activities: Activity[] = [];
  const types: ActivityType[] = ['Balade individuelle', 'Balade groupée', 'Éducation', 'Dog sitting', 'Transport'];
  const prices: Record<ActivityType, number> = {
    'Balade individuelle': 25,
    'Balade groupée': 15,
    'Éducation': 60,
    'Dog sitting': 40,
    'Transport': 20,
    'Autre': 30,
  };
  const durations: Record<ActivityType, number> = {
    'Balade individuelle': 60,
    'Balade groupée': 90,
    'Éducation': 60,
    'Dog sitting': 480,
    'Transport': 30,
    'Autre': 60,
  };

  const today = new Date();
  let activityId = 1;

  // Generate activities for the last 90 days
  for (let daysAgo = 0; daysAgo < 90; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    
    // Skip some days randomly
    if (Math.random() < 0.3) continue;
    
    // Generate 1-4 activities per day
    const activitiesPerDay = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < activitiesPerDay; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const clientIndex = Math.floor(Math.random() * mockClients.length);
      const client = mockClients[clientIndex];
      const clientAnimals = mockAnimals.filter(a => a.clientId === client.id);
      const animal = clientAnimals.length > 0 ? clientAnimals[Math.floor(Math.random() * clientAnimals.length)] : undefined;
      
      const unitPrice = prices[type];
      const quantity = type === 'Dog sitting' ? Math.floor(Math.random() * 2) + 1 : 1;
      const totalLine = unitPrice * quantity;
      
      const hours = 8 + Math.floor(Math.random() * 10);
      const minutes = Math.random() < 0.5 ? '00' : '30';
      
      let status: ActivityStatus = 'Réalisée';
      if (daysAgo < 7 && Math.random() < 0.2) {
        status = 'Planifiée';
      } else if (daysAgo > 14 && Math.random() < 0.7) {
        status = 'Facturée';
      }
      
      activities.push({
        id: `act${activityId++}`,
        clientId: client.id,
        animalId: animal?.id,
        date,
        startTime: `${hours.toString().padStart(2, '0')}:${minutes}`,
        type,
        durationMinutes: durations[type],
        unitPrice,
        quantity,
        totalLine,
        status,
        notes: Math.random() < 0.2 ? 'Séance très bien passée' : undefined,
      });
    }
  }
  
  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const mockActivities: Activity[] = generateActivities();

// Generate invoices
const generateInvoices = (): Invoice[] => {
  const invoices: Invoice[] = [];
  const facturableActivities = mockActivities.filter(a => a.status === 'Facturée');
  
  // Group by client and month
  const groups: Record<string, Activity[]> = {};
  facturableActivities.forEach(act => {
    const month = `${act.date.getFullYear()}-${act.date.getMonth()}`;
    const key = `${act.clientId}-${month}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(act);
  });
  
  let invoiceNum = 1;
  Object.entries(groups).forEach(([key, activities]) => {
    const clientId = key.split('-')[0];
    const subtotal = activities.reduce((sum, a) => sum + a.totalLine, 0);
    const taxRate = 0;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    
    const issueDate = new Date(activities[0].date);
    issueDate.setDate(issueDate.getDate() + 7);
    
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const today = new Date();
    let status: InvoiceStatus = 'Envoyée';
    if (Math.random() < 0.6) {
      status = 'Payée';
    } else if (dueDate < today) {
      status = 'En retard';
    }
    
    invoices.push({
      id: `inv${invoiceNum}`,
      invoiceNumber: `F-2024-${invoiceNum.toString().padStart(3, '0')}`,
      clientId,
      issueDate,
      dueDate,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      currency: 'CHF',
      status,
      activityIds: activities.map(a => a.id),
    });
    
    // Update activities with invoice ID
    activities.forEach(a => {
      const activity = mockActivities.find(ma => ma.id === a.id);
      if (activity) activity.invoiceId = `inv${invoiceNum}`;
    });
    
    invoiceNum++;
  });
  
  return invoices.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());
};

export const mockInvoices: Invoice[] = generateInvoices();

// Helper functions
export const getClientById = (id: string): Client | undefined => mockClients.find(c => c.id === id);
export const getAnimalById = (id: string): Animal | undefined => mockAnimals.find(a => a.id === id);
export const getAnimalsByClientId = (clientId: string): Animal[] => mockAnimals.filter(a => a.clientId === clientId);
export const getActivitiesByClientId = (clientId: string): Activity[] => mockActivities.filter(a => a.clientId === clientId);
export const getInvoicesByClientId = (clientId: string): Invoice[] => mockInvoices.filter(i => i.clientId === clientId);

// Calculate metrics
export const calculateMetrics = (days: number = 30) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  
  const periodActivities = mockActivities.filter(a => a.date >= startDate && a.date <= today);
  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - days);
  const previousActivities = mockActivities.filter(a => a.date >= previousStart && a.date < startDate);
  
  const revenue = periodActivities.reduce((sum, a) => sum + a.totalLine, 0);
  const previousRevenue = previousActivities.reduce((sum, a) => sum + a.totalLine, 0);
  const revenueChange = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
  
  const activeClients = new Set(periodActivities.map(a => a.clientId)).size;
  
  const activityCount = periodActivities.length;
  const activityBreakdown = periodActivities.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const pendingInvoices = mockInvoices.filter(i => i.status === 'Envoyée' || i.status === 'En retard');
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  
  const paidInvoices = mockInvoices.filter(i => {
    const paidThisMonth = i.status === 'Payée' && i.issueDate >= startDate;
    return paidThisMonth;
  });
  const paidAmount = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  
  // Top client
  const clientRevenue = periodActivities.reduce((acc, a) => {
    acc[a.clientId] = (acc[a.clientId] || 0) + a.totalLine;
    return acc;
  }, {} as Record<string, number>);
  
  const topClientId = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topClient = topClientId ? getClientById(topClientId) : undefined;
  const topClientRevenue = topClientId ? clientRevenue[topClientId] : 0;
  
  // Revenue by day for sparkline
  const revenueByDay: { date: string; amount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayActivities = periodActivities.filter(a => a.date.toISOString().split('T')[0] === dayStr);
    revenueByDay.push({
      date: dayStr,
      amount: dayActivities.reduce((sum, a) => sum + a.totalLine, 0),
    });
  }
  
  // Revenue by service type
  const revenueByType = periodActivities.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + a.totalLine;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    revenue,
    revenueChange,
    activityCount,
    activityBreakdown,
    activeClients,
    pendingInvoices: pendingInvoices.length,
    pendingAmount,
    paidInvoices: paidInvoices.length,
    paidAmount,
    topClient,
    topClientRevenue,
    revenueByDay,
    revenueByType,
    totalHours: periodActivities.reduce((sum, a) => sum + a.durationMinutes, 0) / 60,
  };
};

// Top clients calculation
export const getTopClients = (limit: number = 5) => {
  const clientRevenue = mockActivities.reduce((acc, a) => {
    acc[a.clientId] = (acc[a.clientId] || 0) + a.totalLine;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(clientRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([clientId, revenue]) => ({
      client: getClientById(clientId)!,
      revenue,
    }));
};
