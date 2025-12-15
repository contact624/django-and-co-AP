import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  currency: string;
  invoice_prefix: string;
  payment_delay_days: number;
  tax_rate: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  requiresMFA: boolean;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; company_name?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; mfaRequired?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeMFA: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresMFA, setRequiresMFA] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle token refresh errors by signing out
        if (event === 'TOKEN_REFRESHED' && !session) {
          setUser(null);
          setSession(null);
          setProfile(null);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile after auth state change (deferred)
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // If there's an error getting the session (e.g., invalid refresh token), clear state
      if (error) {
        console.error("Session error:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsLoading(false);
        // Clear any stored tokens
        supabase.auth.signOut();
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to get session:", error);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata?: { first_name?: string; last_name?: string; company_name?: string }
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error, mfaRequired: false };
    }

    // Check if user has MFA factors enrolled
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === 'verified');
    
    if (hasVerifiedTOTP) {
      // Check current AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If user has TOTP but hasn't completed 2FA verification for this session
      if (aalData?.currentLevel === 'aal1') {
        setRequiresMFA(true);
        return { error: null, mfaRequired: true };
      }
    }

    return { error: null, mfaRequired: false };
  };

  const completeMFA = () => {
    setRequiresMFA(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        requiresMFA,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        completeMFA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
