import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, ArrowLeft, Key } from "lucide-react";

interface MFAVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

// Hash function matching the one used in TwoFactorSetup
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function MFAVerification({ onVerified, onCancel }: MFAVerificationProps) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const handleVerifyTOTP = async () => {
    if (code.length !== 6) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Veuillez entrer un code à 6 chiffres"
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Get the TOTP factor
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: factorsError.message
        });
        setIsVerifying(false);
        return;
      }

      const totpFactor = factorsData?.totp?.find((f) => f.status === 'verified');

      if (!totpFactor) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Aucun facteur 2FA trouvé"
        });
        setIsVerifying(false);
        return;
      }

      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: challengeError.message
        });
        setIsVerifying(false);
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) {
        toast({
          variant: "destructive",
          title: "Code incorrect",
          description: "Le code entré est invalide. Réessayez."
        });
        setCode('');
        setIsVerifying(false);
        return;
      }

      onVerified();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vérifier le code"
      });
    }

    setIsVerifying(false);
  };

  const handleVerifyRecoveryCode = async () => {
    const cleanCode = recoveryCode.replace('-', '').toLowerCase();
    
    if (cleanCode.length !== 8) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Veuillez entrer un code de récupération valide (format XXXX-XXXX)"
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Utilisateur non trouvé"
        });
        setIsVerifying(false);
        return;
      }

      // Hash the recovery code
      const codeHash = await hashCode(cleanCode);

      // Check if recovery code exists and is not used
      const { data: recoveryData, error: recoveryError } = await supabase
        .from('recovery_codes')
        .select('id')
        .eq('user_id', user.id)
        .eq('code_hash', codeHash)
        .eq('used', false)
        .single();

      if (recoveryError || !recoveryData) {
        toast({
          variant: "destructive",
          title: "Code invalide",
          description: "Ce code de récupération est invalide ou a déjà été utilisé"
        });
        setRecoveryCode('');
        setIsVerifying(false);
        return;
      }

      // Mark the recovery code as used
      await supabase
        .from('recovery_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', recoveryData.id);

      // Get remaining codes count
      const { count } = await supabase
        .from('recovery_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('used', false);

      toast({
        title: "Code accepté",
        description: count && count <= 2 
          ? `Attention: Il ne vous reste que ${count} code(s) de récupération` 
          : "Connexion réussie avec le code de récupération"
      });

      onVerified();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vérifier le code"
      });
    }

    setIsVerifying(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (useRecoveryCode && recoveryCode.replace('-', '').length === 8) {
        handleVerifyRecoveryCode();
      } else if (!useRecoveryCode && code.length === 6) {
        handleVerifyTOTP();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background bg-animated-shapes flex items-center justify-center p-6">
      {/* Background decorations */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl opacity-50" />

      <div className="relative w-full max-w-md">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <GlassCard hover={false} className="p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/30">
              {useRecoveryCode ? (
                <Key className="w-7 h-7 text-primary" />
              ) : (
                <Shield className="w-7 h-7 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {useRecoveryCode ? 'Code de récupération' : 'Vérification 2FA'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {useRecoveryCode 
                ? 'Entrez un de vos codes de récupération'
                : 'Entrez le code de votre application Authenticator'
              }
            </p>
          </div>

          <div className="space-y-6">
            {useRecoveryCode ? (
              <div>
                <input
                  type="text"
                  maxLength={9}
                  value={recoveryCode}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, '');
                    // Auto-add hyphen after 4 characters
                    if (value.length === 4 && !value.includes('-')) {
                      value = value + '-';
                    }
                    setRecoveryCode(value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX"
                  autoFocus
                  className="w-full px-4 py-4 bg-muted/50 border border-border rounded-lg text-foreground text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKeyDown}
                  placeholder="000000"
                  autoFocus
                  className="w-full px-4 py-4 bg-muted/50 border border-border rounded-lg text-foreground text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            )}

            <GlassButton
              variant="primary"
              size="lg"
              onClick={useRecoveryCode ? handleVerifyRecoveryCode : handleVerifyTOTP}
              disabled={
                (useRecoveryCode ? recoveryCode.replace('-', '').length !== 8 : code.length !== 6) 
                || isVerifying
              }
              className="w-full"
            >
              {isVerifying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Vérifier'
              )}
            </GlassButton>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setCode('');
                setRecoveryCode('');
              }}
              className="text-sm text-primary hover:underline"
            >
              {useRecoveryCode 
                ? "Utiliser l'application Authenticator"
                : "Utiliser un code de récupération"
              }
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {useRecoveryCode
              ? "Les codes de récupération ne peuvent être utilisés qu'une seule fois"
              : "Ouvrez votre application Authenticator pour obtenir le code"
            }
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
