import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authRateLimiter } from "@/lib/rateLimiter";
import { toast } from "@/hooks/use-toast";

export type AppRole = "admin" | "it" | "hr" | "viewer";
export type ApprovalStatus = "pending" | "approved" | "rejected";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  approval_status: ApprovalStatus;
  username?: string | null;
  email?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  canDelete: boolean;
  canManageUsers: boolean;
  canManageCompanies: boolean;
  canManageLocations: boolean;
  canManageVendors: boolean;
  canManageCategories: boolean;
  canManageLicenses: boolean;
  canManageOrganisation: boolean;
  canManageDepartments: boolean;
  canManageDesignations: boolean;
  canManageAssetTypes: boolean;
  isFullAdmin: boolean;
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

  const loadProfile = async (uid: string) => {
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setProfile(p as Profile | null);
      setRoles((r ?? []).map((x: any) => x.role as AppRole));
    } catch {
      // Profile may not exist immediately after signup
    }
  };

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange fires INITIAL_SESSION immediately with current session.
    // We await profile load before clearing the loading flag so ProtectedRoute
    // never renders with user=set but profile=null.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await loadProfile(sess.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");

  // ⚠ Admin bypasses the approval gate entirely. Whatever the DB says, an
  // admin is treated as approved so they never see the 'Awaiting approval'
  // screen and never lose write/manage permissions because of it.
  const isApproved = isAdmin || profile?.approval_status === "approved";

  // Admin has FULL access to everything
  const isFullAdmin = isAdmin;
  const canWrite          = isApproved && (isAdmin || roles.includes("it"));
  const canEditEmployees  = isApproved && (isAdmin || roles.includes("it") || roles.includes("hr"));

  // Admin can delete any record
  const canDelete = isAdmin;

  // Admin can manage all master data
  const canManageUsers        = isAdmin;
  const canManageCompanies    = isAdmin;
  const canManageLocations    = isAdmin || roles.includes("it");
  const canManageVendors      = isAdmin || roles.includes("it");
  const canManageCategories   = isAdmin || roles.includes("it");
  const canManageLicenses     = isAdmin || roles.includes("it");
  const canManageOrganisation = isAdmin;
  const canManageDepartments  = isAdmin || roles.includes("hr");
  const canManageDesignations = isAdmin || roles.includes("hr");
  const canManageAssetTypes   = isAdmin || roles.includes("it");

  return (
    <Ctx.Provider value={{
      user, session, profile, roles, loading, isAdmin, canWrite, canEditEmployees,
      canDelete, canManageUsers, canManageCompanies, canManageLocations, 
      canManageVendors, canManageCategories, canManageLicenses, canManageOrganisation,
      canManageDepartments, canManageDesignations, canManageAssetTypes, isFullAdmin,
      signOut: async () => {
        const rateLimitKey = user?.email || 'anonymous';
        const { allowed } = authRateLimiter.isAllowed(`signout-${rateLimitKey}`);
        
        if (!allowed) {
          toast({
            title: "Rate limit exceeded",
            description: "Please wait before trying again.",
            variant: "destructive",
          });
          return;
        }
        
        setProfile(null);
        setRoles([]);
        await supabase.auth.signOut();
      },
      refresh: async () => {
        if (user) await loadProfile(user.id);
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
