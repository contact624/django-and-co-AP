import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { HeroTyping } from "@/components/landing/HeroTyping";
import { useNavigate } from "react-router-dom";
import { Footprints, Users, FileText, Calendar, BarChart3, Sparkles, ArrowRight, Check } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Suivi client & animaux",
    description: "Fiches clients détaillées, animaux avec historique complet des prestations.",
  },
  {
    icon: FileText,
    title: "Facturation simplifiée",
    description: "Génération de factures professionnelles, suivi des paiements en temps réel.",
  },
  {
    icon: Calendar,
    title: "Calendrier d'activité",
    description: "Visualisez toutes vos balades et prestations sur un calendrier intuitif.",
  },
  {
    icon: Sparkles,
    title: "Analyses & IA",
    description: "Graphiques modernes, tendances, résumés intelligents de votre activité.",
  },
];

const steps = [
  { number: "01", title: "Créez un compte", description: "Inscription gratuite en 30 secondes" },
  { number: "02", title: "Ajoutez vos données", description: "Clients, animaux et activités" },
  { number: "03", title: "Pilotez votre activité", description: "Factures, analyses et insights" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-animated-shapes">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Footprints className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">Activity Pilot</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Se connecter
            </button>
            <GlassButton variant="primary" size="sm" onClick={() => navigate('/auth')}>
              Créer un compte
            </GlassButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Pour indépendants & petites entreprises</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-up stagger-1 leading-tight">
            Pilotez votre activité
            <br />
            <span className="text-gradient-primary">de service.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-up stagger-2 h-8">
            <HeroTyping />
          </p>

          <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10 animate-fade-up stagger-3">
            Gérez vos clients, animaux, balades et factures — en un seul endroit.
            Simple, moderne, efficace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-4">
            <GlassButton
              variant="primary"
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="group"
            >
              Accéder au dashboard
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </GlassButton>
            <GlassButton size="lg" onClick={() => navigate('/auth')}>
              Créer un compte
            </GlassButton>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Une solution complète pour gérer votre activité de services animaliers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <GlassCard key={feature.title} className="p-6 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-card/30 border-y border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Comment ça marche
            </h2>
            <p className="text-muted-foreground text-lg">
              Commencez en quelques minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.number} className="relative animate-fade-up" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="text-6xl font-bold text-primary/10 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-primary/20 p-12 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-20" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Prêt à piloter votre activité ?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Rejoignez les professionnels qui gèrent leur activité avec Activity Pilot
              </p>
              <GlassButton variant="primary" size="lg" onClick={() => navigate('/auth')}>
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Footprints className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Activity Pilot</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
            <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">
              Se connecter
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Activity Pilot
          </p>
        </div>
      </footer>
    </div>
  );
}
