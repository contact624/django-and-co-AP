import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassButton } from "@/components/ui/GlassButton";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Download, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type MFAStatus = 'loading' | 'disabled' | 'enrolling' | 'show-recovery-codes' | 'enabled';

interface Factor {
  id: string;
  status: string;
  factor_type: string;
}

// Generate a simple hash for recovery codes (client-side)
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random recovery codes
function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const code = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

export function TwoFactorSetup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<MFAStatus>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [hasRecoveryCodes, setHasRecoveryCodes] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error("Error checking MFA status:", error);
        setStatus('disabled');
        return;
      }

      const totpFactor = data?.totp?.find((f: Factor) => f.status === 'verified');
      
      if (totpFactor) {
        setStatus('enabled');
        setFactorId(totpFactor.id);
        
        // Check if user has recovery codes
        if (user) {
          const { count } = await supabase
            .from('recovery_codes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('used', false);
          setHasRecoveryCodes((count || 0) > 0);
        }
      } else {
        setStatus('disabled');
      }
    } catch {
      setStatus('disabled');
    }
  };

  const handleEnroll = async () => {
    try {
      setStatus('enrolling');
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Activity Pilot',
        friendlyName: 'Activity Pilot 2FA'
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message
        });
        setStatus('disabled');
        return;
      }

      if (data?.totp?.qr_code) {
        setQrCode(data.totp.qr_code);
        setFactorId(data.id);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'activer le 2FA"
      });
      setStatus('disabled');
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6 || !user) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Veuillez entrer un code à 6 chiffres"
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
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
        factorId,
        challengeId: challengeData.id,
        code: verifyCode
      });

      if (verifyError) {
        toast({
          variant: "destructive",
          title: "Code incorrect",
          description: "Le code entré est invalide. Réessayez."
        });
        setVerifyCode('');
        setIsVerifying(false);
        return;
      }

      // Generate recovery codes
      const codes = generateRecoveryCodes(8);
      setRecoveryCodes(codes);

      // Delete any existing recovery codes for this user
      await supabase
        .from('recovery_codes')
        .delete()
        .eq('user_id', user.id);

      // Store hashed recovery codes
      for (const code of codes) {
        const codeHash = await hashCode(code.replace('-', '').toLowerCase());
        await supabase
          .from('recovery_codes')
          .insert({
            user_id: user.id,
            code_hash: codeHash
          });
      }

      setStatus('show-recovery-codes');
      setQrCode(null);
      setVerifyCode('');
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vérifier le code"
      });
    }

    setIsVerifying(false);
  };

  const handleDisable = async () => {
    if (!factorId || !user) return;

    setIsDisabling(true);

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message
        });
        setIsDisabling(false);
        return;
      }

      // Delete recovery codes
      await supabase
        .from('recovery_codes')
        .delete()
        .eq('user_id', user.id);

      toast({
        title: "2FA désactivé",
        description: "L'authentification à deux facteurs a été désactivée"
      });

      setStatus('disabled');
      setFactorId(null);
      setHasRecoveryCodes(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de désactiver le 2FA"
      });
    }

    setIsDisabling(false);
  };

  const cancelEnrollment = async () => {
    if (factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch {
        // Ignore error
      }
    }
    setStatus('disabled');
    setQrCode(null);
    setFactorId(null);
    setVerifyCode('');
  };

  const copyRecoveryCodes = async () => {
    const text = recoveryCodes.join('\n');
    await navigator.clipboard.writeText(text);
    setCodesCopied(true);
    toast({
      title: "Codes copiés",
      description: "Les codes de récupération ont été copiés dans le presse-papier"
    });
  };

  const downloadRecoveryCodes = () => {
    const text = `CODES DE RÉCUPÉRATION ACTIVITY PILOT\n${'='.repeat(40)}\n\nGardez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.\n\n${recoveryCodes.join('\n')}\n\nGénéré le: ${new Date().toLocaleDateString('fr-FR')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-pilot-codes-recuperation.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCodesCopied(true);
  };

  const finishSetup = () => {
    if (!codesCopied) {
      toast({
        variant: "destructive",
        title: "Attention",
        description: "Veuillez copier ou télécharger vos codes avant de continuer"
      });
      return;
    }
    
    toast({
      title: "2FA activé !",
      description: "L'authentification à deux facteurs est maintenant active"
    });
    
    setStatus('enabled');
    setRecoveryCodes([]);
    setHasRecoveryCodes(true);
    setCodesCopied(false);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (status === 'show-recovery-codes') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Sauvegardez vos codes de récupération</p>
            <p className="text-sm text-muted-foreground">
              Ces codes vous permettront de vous connecter si vous perdez l'accès à votre téléphone.
              <strong className="text-foreground"> Ils ne seront affichés qu'une seule fois.</strong>
            </p>
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((code, index) => (
              <div 
                key={index}
                className="font-mono text-sm bg-background/50 px-3 py-2 rounded border border-border text-center"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <GlassButton variant="ghost" onClick={copyRecoveryCodes} className="flex-1">
            <Copy className="w-4 h-4" />
            Copier
          </GlassButton>
          <GlassButton variant="ghost" onClick={downloadRecoveryCodes} className="flex-1">
            <Download className="w-4 h-4" />
            Télécharger
          </GlassButton>
        </div>

        <GlassButton
          variant="primary"
          onClick={finishSetup}
          className="w-full"
          disabled={!codesCopied}
        >
          <ShieldCheck className="w-4 h-4" />
          J'ai sauvegardé mes codes
        </GlassButton>
      </div>
    );
  }

  if (status === 'enabled') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
          <ShieldCheck className="w-6 h-6 text-success" />
          <div className="flex-1">
            <p className="font-medium text-foreground">2FA activé</p>
            <p className="text-sm text-muted-foreground">
              Votre compte est protégé par l'authentification à deux facteurs
              {hasRecoveryCodes && " • Codes de récupération configurés"}
            </p>
          </div>
        </div>
        
        <GlassButton
          variant="ghost"
          onClick={handleDisable}
          disabled={isDisabling}
          className="text-destructive hover:bg-destructive/10"
        >
          {isDisabling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldOff className="w-4 h-4" />
          )}
          Désactiver le 2FA
        </GlassButton>
      </div>
    );
  }

  if (status === 'enrolling' && qrCode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Scannez ce QR code avec votre application Authenticator
            <br />
            <span className="text-xs">(Google Authenticator, Authy, Microsoft Authenticator...)</span>
          </p>
          
          <div className="inline-block p-4 bg-white rounded-xl">
            <img 
              src={qrCode} 
              alt="QR Code 2FA" 
              className="w-48 h-48"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-muted-foreground">
            Entrez le code à 6 chiffres de votre application
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <GlassButton
            variant="ghost"
            onClick={cancelEnrollment}
            className="flex-1"
          >
            Annuler
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleVerify}
            disabled={verifyCode.length !== 6 || isVerifying}
            className="flex-1"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Vérifier
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ajoutez une couche de sécurité supplémentaire avec une application Authenticator.
        À chaque connexion, vous devrez entrer un code généré par votre téléphone.
      </p>
      
      <GlassButton variant="primary" onClick={handleEnroll}>
        <Shield className="w-4 h-4" />
        Activer l'authentification à deux facteurs
      </GlassButton>
    </div>
  );
}
