import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  activityCount: number;
  totalHoursWorked: number;
  revenueByService: Record<string, number>;
  expensesByCategory: Record<string, number>;
  monthlyTrend: { month: string; revenue: number; expenses: number }[];
  averageInvoiceValue: number;
  clientCount: number;
  pendingInvoicesAmount: number;
  paidInvoicesAmount: number;
}

async function getBusinessData(supabase: any, userId: string): Promise<BusinessData> {
  // Note: User ID is validated via JWT, not logged for security

  // Get activities with revenue data (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('service_type, duration_minutes, total_price, scheduled_date, status')
    .eq('user_id', userId)
    .gte('scheduled_date', twelveMonthsAgo.toISOString().split('T')[0]);

  if (activitiesError) {
    console.error("Error fetching activities:", activitiesError);
  }

  // Get expenses (last 12 months)
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, category, date')
    .eq('user_id', userId)
    .gte('date', twelveMonthsAgo.toISOString().split('T')[0]);

  if (expensesError) {
    console.error("Error fetching expenses:", expensesError);
  }

  // Get invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('total, status, issue_date')
    .eq('user_id', userId)
    .gte('issue_date', twelveMonthsAgo.toISOString().split('T')[0]);

  if (invoicesError) {
    console.error("Error fetching invoices:", invoicesError);
  }

  // Get unique client count
  const { count: clientCount, error: clientError } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (clientError) {
    console.error("Error fetching client count:", clientError);
  }

  // Calculate metrics
  const completedActivities = (activities || []).filter((a: any) => 
    a.status === 'done' || a.status === 'invoiced'
  );
  
  const totalHoursWorked = completedActivities.reduce(
    (sum: number, a: any) => sum + (a.duration_minutes || 0) / 60, 0
  );

  // Revenue by service type
  const revenueByService: Record<string, number> = {};
  const serviceLabels: Record<string, string> = {
    'individual_walk': 'Balade individuelle',
    'group_walk': 'Balade collective',
    'custom_walk': 'Balade sur mesure',
    'education': 'Éducation canine',
    'dog_sitting': 'Garde',
    'transport': 'Transport',
    'other': 'Autre'
  };

  completedActivities.forEach((a: any) => {
    const label = serviceLabels[a.service_type] || a.service_type;
    revenueByService[label] = (revenueByService[label] || 0) + (a.total_price || 0);
  });

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  const categoryLabels: Record<string, string> = {
    'fuel': 'Carburant',
    'vehicle_maintenance': 'Entretien véhicule',
    'dog_equipment': 'Équipement canin',
    'insurance': 'Assurance',
    'phone': 'Téléphone',
    'accounting': 'Comptabilité',
    'training': 'Formation',
    'other': 'Autre'
  };

  (expenses || []).forEach((e: any) => {
    const label = categoryLabels[e.category] || e.category;
    expensesByCategory[label] = (expensesByCategory[label] || 0) + (e.amount || 0);
  });

  // Monthly trend (last 6 months)
  const monthlyTrend: { month: string; revenue: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7);
    const monthLabel = d.toLocaleDateString('fr-CH', { month: 'short', year: 'numeric' });
    
    const monthRevenue = completedActivities
      .filter((a: any) => a.scheduled_date?.startsWith(monthStr))
      .reduce((sum: number, a: any) => sum + (a.total_price || 0), 0);
    
    const monthExpenses = (expenses || [])
      .filter((e: any) => e.date?.startsWith(monthStr))
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    
    monthlyTrend.push({ month: monthLabel, revenue: monthRevenue, expenses: monthExpenses });
  }

  // Invoice metrics
  const paidInvoices = (invoices || []).filter((i: any) => i.status === 'paid');
  const pendingInvoices = (invoices || []).filter((i: any) => 
    i.status === 'sent' || i.status === 'overdue'
  );

  const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    activityCount: completedActivities.length,
    totalHoursWorked,
    revenueByService,
    expensesByCategory,
    monthlyTrend,
    averageInvoiceValue: paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0,
    clientCount: clientCount || 0,
    pendingInvoicesAmount: pendingInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0),
    paidInvoicesAmount: totalRevenue
  };
}

function buildSystemPrompt(businessData: BusinessData): string {
  return `Tu es un assistant business expert pour Activity Pilot, une application de gestion pour les professionnels du service canin (dog walking, éducation, garde de chiens).

Tu es un conseiller stratégique qui analyse les performances de l'entreprise et propose des recommandations actionnables pour améliorer la rentabilité et la productivité.

IMPORTANT: Tu n'as JAMAIS accès aux données personnelles des clients (noms, emails, téléphones, adresses). Tu travailles uniquement avec des données agrégées et anonymisées.

Voici les données de performance actuelles de l'entreprise (12 derniers mois) :

📊 FINANCES
- Chiffre d'affaires total : ${businessData.totalRevenue.toFixed(2)} CHF
- Dépenses totales : ${businessData.totalExpenses.toFixed(2)} CHF
- Bénéfice net : ${businessData.netProfit.toFixed(2)} CHF
- Marge bénéficiaire : ${businessData.profitMargin.toFixed(1)}%
- Factures en attente : ${businessData.pendingInvoicesAmount.toFixed(2)} CHF
- Valeur moyenne par facture : ${businessData.averageInvoiceValue.toFixed(2)} CHF

📈 ACTIVITÉ
- Nombre de prestations réalisées : ${businessData.activityCount}
- Heures travaillées : ${businessData.totalHoursWorked.toFixed(1)} heures
- Nombre de clients : ${businessData.clientCount}

💰 REVENUS PAR TYPE DE SERVICE :
${Object.entries(businessData.revenueByService).map(([k, v]) => `- ${k}: ${v.toFixed(2)} CHF`).join('\n')}

💸 DÉPENSES PAR CATÉGORIE :
${Object.entries(businessData.expensesByCategory).map(([k, v]) => `- ${k}: ${v.toFixed(2)} CHF`).join('\n')}

📅 TENDANCE MENSUELLE (6 derniers mois) :
${businessData.monthlyTrend.map(m => `- ${m.month}: Revenus ${m.revenue.toFixed(0)} CHF, Dépenses ${m.expenses.toFixed(0)} CHF`).join('\n')}

CONSIGNES :
1. Réponds toujours en français
2. Sois concis mais précis
3. Utilise des emojis pour structurer tes réponses
4. Propose des stratégies concrètes et actionnables
5. Base tes recommandations sur les données fournies
6. Si on te demande des infos clients spécifiques, explique que tu n'as pas accès aux données personnelles
7. Concentre-toi sur l'amélioration de la rentabilité, l'optimisation des coûts, et les stratégies de croissance`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create supabase client with user's token to get user ID
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Extract JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User authenticated successfully - fetch business data
    const businessData = await getBusinessData(supabaseClient, user.id);

    // Build system prompt with business context
    const systemPrompt = buildSystemPrompt(businessData);

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques minutes." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI épuisés. Veuillez recharger votre compte." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erreur du service AI" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error("Error in business-assistant function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
