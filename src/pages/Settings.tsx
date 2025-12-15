import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Building, FileText, CreditCard, Save, Shield, Eye, EyeOff, LogOut, Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { resetPasswordSchema, validateFormData } from "@/lib/validation";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";

export default function Settings() {
  const navigate = useNavigate();
  const {
    profile,
    refreshProfile,
    isLoading: authLoading,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    companyNotes: '',
    address: '',
    phone: '',
    iban: '',
    currency: 'CHF',
    invoicePrefix: 'F-',
    paymentDelayDays: 30,
    taxRate: 0
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        companyName: profile.company_name || '',
        companyNotes: (profile as any).company_notes || '',
        address: profile.address || '',
        phone: profile.phone || '',
        iban: profile.iban || '',
        currency: profile.currency || 'CHF',
        invoicePrefix: profile.invoice_prefix || 'F-',
        paymentDelayDays: profile.payment_delay_days || 30,
        taxRate: profile.tax_rate || 0
      });
    }
  }, [profile]);
  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    const {
      error
    } = await supabase.from('profiles').update({
      first_name: formData.firstName,
      last_name: formData.lastName,
      company_name: formData.companyName,
      company_notes: formData.companyNotes,
      address: formData.address,
      phone: formData.phone,
      iban: formData.iban,
      currency: formData.currency,
      invoice_prefix: formData.invoicePrefix,
      payment_delay_days: formData.paymentDelayDays,
      tax_rate: formData.taxRate
    } as any).eq('id', profile.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres"
      });
    } else {
      await refreshProfile();
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos modifications ont été enregistrées"
      });
    }
    setIsLoading(false);
  };
  const handlePasswordChange = async () => {
    // Validate with Zod schema for stronger security
    const validation = validateFormData(resetPasswordSchema, {
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword,
    });
    
    if (!validation.success && 'errors' in validation) {
      setPasswordErrors(validation.errors);
      return;
    }
    
    setPasswordErrors({});
    setIsPasswordLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message
        });
      } else {
        toast({
          title: "Mot de passe modifié",
          description: "Votre mot de passe a été mis à jour avec succès"
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue s'est produite"
      });
    }
    setIsPasswordLoading(false);
  };
  if (authLoading) {
    return <DashboardLayout>
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
            <p className="text-muted-foreground">Configurez votre compte et votre entreprise</p>
          </div>
          {[1, 2, 3, 4].map(i => <GlassCard key={i} className="p-6">
              <Skeleton className="h-6 w-48 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </GlassCard>)}
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="space-y-6 animate-fade-up max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
            <p className="text-muted-foreground">Configurez votre compte et votre entreprise</p>
          </div>
          <GlassButton variant="primary" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </GlassButton>
        </div>

        {/* Profile */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Profil utilisateur</h2>
              <p className="text-sm text-muted-foreground">Vos informations personnelles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Prénom</label>
              <input type="text" value={formData.firstName} onChange={e => setFormData({
              ...formData,
              firstName: e.target.value
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Nom</label>
              <input type="text" value={formData.lastName} onChange={e => setFormData({
              ...formData,
              lastName: e.target.value
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <input type="email" value={formData.email} disabled className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-muted-foreground cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
            </div>
          </div>
        </GlassCard>

        {/* Company */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
              <Building className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Entreprise</h2>
              <p className="text-sm text-muted-foreground">Informations de votre entreprise</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Nom de l'entreprise</label>
              <input type="text" value={formData.companyName} onChange={e => setFormData({
              ...formData,
              companyName: e.target.value
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Notes (apparaît sur les factures)</label>
              <input type="text" value={formData.companyNotes} onChange={e => setFormData({
              ...formData,
              companyNotes: e.target.value
            })} placeholder="Ex: Éducateur canin certifié" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
              
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Adresse</label>
              <textarea 
                value={formData.address} 
                onChange={e => setFormData({
                  ...formData,
                  address: e.target.value
                })} 
                rows={2}
                placeholder="Rue et numéro&#10;Code postal Ville"
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none" 
              />
              <p className="text-xs text-muted-foreground mt-1">Une ligne par élément (rue, puis code postal et ville)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Téléphone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({
              ...formData,
              phone: e.target.value
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Devise</label>
              <select value={formData.currency} onChange={e => setFormData({
              ...formData,
              currency: e.target.value
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors">
                <option value="CHF">CHF - Franc suisse</option>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollar américain</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Banking */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center border border-success/20">
              <CreditCard className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Coordonnées bancaires</h2>
              <p className="text-sm text-muted-foreground">Pour vos factures</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">IBAN</label>
            <input type="text" value={formData.iban} onChange={e => setFormData({
            ...formData,
            iban: e.target.value
          })} placeholder="CH00 0000 0000 0000 0000 0" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors font-mono" />
          </div>
        </GlassCard>

        {/* Invoicing */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
              <FileText className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Facturation</h2>
              <p className="text-sm text-muted-foreground">Paramètres de facturation par défaut</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Préfixe facture</label>
              <input type="text" value={formData.invoicePrefix} onChange={e => setFormData({
              ...formData,
              invoicePrefix: e.target.value
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Délai de paiement (jours)</label>
              <input type="number" value={formData.paymentDelayDays} onChange={e => setFormData({
              ...formData,
              paymentDelayDays: parseInt(e.target.value) || 30
            })} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Taux TVA (%)</label>
              <input type="number" value={formData.taxRate} onChange={e => setFormData({
              ...formData,
              taxRate: parseFloat(e.target.value) || 0
            })} step="0.1" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
        </GlassCard>

        {/* Security - Password */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Mot de passe</h2>
              <p className="text-sm text-muted-foreground">Modifier votre mot de passe</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <input type={showPasswords ? 'text' : 'password'} value={passwordData.newPassword} onChange={e => setPasswordData({
                ...passwordData,
                newPassword: e.target.value
              })} placeholder="Min. 8 caractères avec lettres et chiffres" className="w-full px-4 py-2.5 pr-10 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors" />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.newPassword && <p className="text-xs text-destructive mt-1">{passwordErrors.newPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Confirmer le mot de passe</label>
              <input type={showPasswords ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={e => setPasswordData({
              ...passwordData,
              confirmPassword: e.target.value
            })} placeholder="Confirmez le nouveau mot de passe" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors" />
              {passwordErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{passwordErrors.confirmPassword}</p>}
            </div>

            <GlassButton variant="ghost" onClick={handlePasswordChange} disabled={isPasswordLoading} className="mt-2">
              {isPasswordLoading ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
              Modifier le mot de passe
            </GlassButton>
          </div>
        </GlassCard>

        {/* Security - 2FA */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Authentification à deux facteurs</h2>
              <p className="text-sm text-muted-foreground">Protégez votre compte avec une app Authenticator</p>
            </div>
          </div>

          <TwoFactorSetup />
        </GlassCard>

        {/* Logout */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center border border-border">
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Déconnexion</h2>
                <p className="text-sm text-muted-foreground">Se déconnecter de votre compte</p>
              </div>
            </div>
            <GlassButton 
              variant="ghost" 
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>;
}