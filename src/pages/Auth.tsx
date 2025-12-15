import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Footprints, Mail, Lock, User, Building, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { loginSchema, signupSchema, resetPasswordSchema, emailSchema, validateFormData } from "@/lib/validation";
import { MFAVerification } from "@/components/auth/MFAVerification";

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'mfa';

// Helper function to detect recovery mode from URL hash (runs synchronously)
const getInitialMode = (): AuthMode => {
  if (typeof window !== 'undefined') {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      return 'reset-password';
    }
  }
  return 'login';
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, requiresMFA, completeMFA } = useAuth();
  const { toast } = useToast();
  
  // Initialize mode synchronously to prevent redirect before detecting recovery mode
  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in (but NOT if in reset-password or mfa mode)
  if (user && mode !== 'reset-password' && mode !== 'mfa' && !requiresMFA) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
    return null;
  }

  // Show MFA verification screen if required
  if (requiresMFA || mode === 'mfa') {
    const handleMFAVerified = () => {
      completeMFA();
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur Activity Pilot !",
      });
      navigate('/dashboard');
    };

    const handleMFACancel = async () => {
      await supabase.auth.signOut();
      completeMFA();
      setMode('login');
    };

    return <MFAVerification onVerified={handleMFAVerified} onCancel={handleMFACancel} />;
  }

  const handleResetPassword = async () => {
    // Validate with Zod schema
    const validation = validateFormData(resetPasswordSchema, { newPassword, confirmPassword });
    if (!validation.success && 'errors' in validation) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message,
        });
      } else {
        toast({
          title: "Mot de passe modifié",
          description: "Votre mot de passe a été réinitialisé avec succès.",
        });
        // Clear URL hash and redirect
        window.history.replaceState(null, '', '/auth');
        navigate('/dashboard');
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
      });
    }
    setIsLoading(false);
  };

  const validateForm = () => {
    if (mode === 'login') {
      const validation = validateFormData(loginSchema, {
        email: formData.email,
        password: formData.password,
      });
      if (!validation.success && 'errors' in validation) {
        setErrors(validation.errors);
        return false;
      }
    } else if (mode === 'signup') {
      const validation = validateFormData(signupSchema, {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
      });
      if (!validation.success && 'errors' in validation) {
        setErrors(validation.errors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handleForgotPassword = async () => {
    const validation = emailSchema.safeParse(formData.email);
    if (!validation.success) {
      setErrors({ email: "Veuillez entrer un email valide" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message,
        });
      } else {
        toast({
          title: "Email envoyé",
          description: "Consultez votre boîte mail pour réinitialiser votre mot de passe.",
        });
        setMode('login');
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot-password') {
      await handleForgotPassword();
      return;
    }

    if (mode === 'reset-password') {
      await handleResetPassword();
      return;
    }
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error, mfaRequired } = await signIn(formData.email, formData.password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: "Erreur de connexion",
              description: "Email ou mot de passe incorrect",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erreur",
              description: error.message,
            });
          }
          setIsLoading(false);
          return;
        }

        // If MFA is required, the component will switch to MFA mode via the requiresMFA state
        if (mfaRequired) {
          setMode('mfa');
          setIsLoading(false);
          return;
        }

        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur Activity Pilot !",
        });
        
        navigate('/dashboard');
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company_name: formData.companyName,
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              variant: "destructive",
              title: "Compte existant",
              description: "Un compte existe déjà avec cet email. Essayez de vous connecter.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erreur",
              description: error.message,
            });
          }
          setIsLoading(false);
          return;
        }

        toast({
          title: "Compte créé !",
          description: "Bienvenue sur Activity Pilot !",
        });
        
        navigate('/dashboard');
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background bg-animated-shapes flex items-center justify-center p-6">
      {/* Background decorations */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl opacity-50" />

      <div className="relative w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </button>

        <GlassCard hover={false} className="p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/30">
              <Footprints className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {mode === 'login' && 'Connexion'}
              {mode === 'signup' && 'Créer un compte'}
              {mode === 'forgot-password' && 'Mot de passe oublié'}
              {mode === 'reset-password' && 'Nouveau mot de passe'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' && 'Connectez-vous à votre espace Activity Pilot'}
              {mode === 'signup' && 'Commencez à piloter votre activité'}
              {mode === 'forgot-password' && 'Entrez votre email pour recevoir un lien de réinitialisation'}
              {mode === 'reset-password' && 'Choisissez votre nouveau mot de passe'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'reset-password' && (
              <>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nouveau mot de passe"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                </div>
              </>
            )}

            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Prénom"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                    {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Nom de l'entreprise"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  {errors.companyName && <p className="text-xs text-destructive mt-1">{errors.companyName}</p>}
                </div>
              </>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            {mode !== 'forgot-password' && mode !== 'reset-password' && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setErrors({});
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === 'login' ? (
                'Se connecter'
              ) : mode === 'signup' ? (
                'Créer mon compte'
              ) : mode === 'reset-password' ? (
                'Réinitialiser le mot de passe'
              ) : (
                'Envoyer le lien'
              )}
            </GlassButton>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm">
            {mode === 'forgot-password' ? (
              <button
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
              >
                Retour à la connexion
              </button>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
                </span>{' '}
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setErrors({});
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
                </button>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
