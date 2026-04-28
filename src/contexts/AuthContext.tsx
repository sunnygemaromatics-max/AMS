import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "it" | "hr" | "viewer";
export type ApprovalStatus = "pending" | "approved" | "rejected";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  approval_status: ApprovalStatus;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  canEditEmployees: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadProfile = async (uid: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setProfile(p as Profile | null);
      setRoles((r ?? []).map((x: any) => x.role as AppRole));
    } catch {
      // Profile may not exist yet immediately after signup — trigger creates it async
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // getSession handles the initial session from localStorage (fast, synchronous-ish)
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await loadProfile(sess.user.id);
      }
      setLoading(false);
    });

    // onAuthStateChange handles subsequent sign-in / sign-out / token refresh
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadingRef.current = false; // allow reload on auth change
        await loadProfile(sess.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isApproved = profile?.approval_status === "approved";
  const canWrite = isApproved && (isAdmin || roles.includes("it"));
  const canEditEmployees = isApproved && (isAdmin || roles.includes("it") || roles.includes("hr"));

  return (
    <Ctx.Provider value={{
      user, session, profile, roles, loading, isAdmin, canWrite, canEditEmployees,
      signOut: async () => {
        setProfile(null);
        setRoles([]);
        await supabase.auth.signOut();
      },
      refresh: async () => {
        if (user) {
          loadingRef.current = false;
          await loadProfile(user.id);
        }
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
