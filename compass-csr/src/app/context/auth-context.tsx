import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import supabase from "../../lib/supabase";

// Mirrors the `user_profiles` / `companies` tables in Supabase. `user_profiles.id`
// is assumed to equal the auth user's id (the standard Supabase "profiles" pattern).
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  company_id: string;
  role: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string | null;
  company_size?: string | null;
  mission?: string | null;
}

interface SignUpParams {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  company: Company | null;
  loading: boolean;
  signUp: (params: SignUpParams) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth for "does this user have a profile row" — fetches
  // it if it exists, or creates it (from the full_name/company_name captured
  // in user_metadata at signup) if it doesn't. Called and awaited directly
  // from signUp/signIn so the caller only redirects once the rows genuinely
  // exist, and also from the onAuthStateChange listener as a catch-all
  // safety net for sessions established outside those two paths (page
  // reloads, password-reset links, etc). Throws on failure so signUp/signIn
  // can surface a real error instead of silently leaving the tables empty.
  const ensureProfile = useCallback(async (authUser: User) => {
    const { data: profile, error: selectError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (selectError) {
      console.error("Couldn't check for an existing user_profile:", selectError);
      throw new Error(selectError.message);
    }

    if (profile) {
      setUserProfile(profile as UserProfile);
      const { data: companyRow } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .maybeSingle();
      setCompany((companyRow as Company) ?? null);
      return;
    }

    const meta = authUser.user_metadata as { full_name?: string; company_name?: string } | undefined;
    const fullName = meta?.full_name?.trim() || authUser.email?.split("@")[0] || "New User";
    const companyName = meta?.company_name?.trim() || "My Company";

    const { data: companyRow, error: companyError } = await supabase
      .from("companies")
      .insert({ name: companyName })
      .select()
      .single();
    if (companyError) {
      console.error("Couldn't create company row:", companyError);
      throw new Error(companyError.message);
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUser.id,
        full_name: fullName,
        email: authUser.email,
        company_id: companyRow.id,
        role: "admin",
      })
      .select()
      .single();
    if (profileError) {
      console.error("Couldn't create user_profile row:", profileError);
      throw new Error(profileError.message);
    }

    setUserProfile(profileRow as UserProfile);
    setCompany(companyRow as Company);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        try {
          await ensureProfile(initialSession.user);
        } catch (err) {
          console.error("Couldn't load or create profile on initial session:", err);
        }
      }
      if (active) setLoading(false);
    });

    // Safety net: whenever a session appears on this listener — a fresh
    // sign-in, a session restored on another tab, a password-reset link,
    // etc — make sure a profile row exists for it.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        ensureProfile(nextSession.user).catch((err) => {
          console.error("Couldn't load or create profile on auth state change:", err);
        });
      } else {
        setUserProfile(null);
        setCompany(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [ensureProfile]);

  const signUp = useCallback(async ({ fullName, companyName, email, password }: SignUpParams) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: companyName } },
    });
    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error("Sign up did not return a user");

    if (signUpData.session) {
      // Email confirmation is disabled — a session exists immediately, so
      // auth.uid() is already set for RLS. Create the company/profile rows
      // now and wait for it, so the caller only redirects to the Dashboard
      // once they genuinely exist.
      setSession(signUpData.session);
      setUser(signUpData.user);
      await ensureProfile(signUpData.user);
    }

    // No session means Supabase Auth has "confirm email" turned on — the
    // onAuthStateChange listener (and signIn's own ensureProfile check)
    // will finish the job once the user actually confirms and signs in.
    return { needsEmailConfirmation: !signUpData.session };
  }, [ensureProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      setSession(data.session);
      setUser(data.user);
      // Safety net for the edge case where signup succeeded but the
      // profile/company rows never got created — create them now, before
      // the caller proceeds.
      await ensureProfile(data.user);
    }
  }, [ensureProfile]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserProfile(null);
    setCompany(null);
  }, []);

  // Re-fetches the current company row — call this after writing to the
  // companies table (e.g. from Settings) so components reading company.name
  // (the sidebar/header, the Dashboard welcome card, etc.) pick up the
  // change without a full reload.
  const refreshCompany = useCallback(async () => {
    if (!userProfile?.company_id) return;
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", userProfile.company_id)
      .maybeSingle();
    if (error) {
      console.error("Couldn't refresh company:", error);
      return;
    }
    if (data) setCompany(data as Company);
  }, [userProfile?.company_id]);

  return (
    <AuthContext.Provider
      value={{ session, user, userProfile, company, loading, signUp, signIn, signOut, refreshCompany }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
