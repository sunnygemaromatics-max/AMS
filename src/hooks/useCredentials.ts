import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CredentialType =
  | "email" | "qnap" | "router" | "firewall" | "switch" | "access_point"
  | "wifi" | "server" | "database" | "cloud" | "vpn" | "rdp" | "domain"
  | "ssl" | "ftp" | "vendor_portal" | "other";

export interface Credential {
  id: string;
  name: string;
  credential_type: CredentialType;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  asset_id: string | null;
  company_id: string | null;
  location_id: string | null;
  department_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type CredentialInsert = Omit<Credential, "id" | "created_at" | "updated_at">;

const tbl = () =>
  (supabase as unknown as { from: (t: string) => any }).from("credentials");

/** All credentials (vault view). Returns [] for non-admin/IT users (RLS-blocked). */
export function useAllCredentials() {
  return useQuery({
    queryKey: ["credentials"],
    queryFn: async (): Promise<Credential[]> => {
      const { data, error } = await tbl()
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01" || /credentials/.test(error.message || "")) return [];
        throw error;
      }
      return (data as Credential[]) ?? [];
    },
  });
}

/** Credentials linked to a specific asset. Returns [] for non-admin/IT. */
export function useAssetCredentials(assetId: string | null | undefined) {
  return useQuery({
    queryKey: ["credentials", "asset", assetId],
    queryFn: async (): Promise<Credential[]> => {
      if (!assetId) return [];
      const { data, error } = await tbl()
        .select("*")
        .eq("asset_id", assetId)
        .order("name");
      if (error) {
        if (error.code === "42P01" || /credentials/.test(error.message || "")) return [];
        throw error;
      }
      return (data as Credential[]) ?? [];
    },
    enabled: !!assetId,
  });
}

/**
 * Count of credentials for an asset — works for ALL roles via a SECURITY DEFINER
 * RPC, so non-admin users can see "3 credentials (Admin/IT only)" without
 * accessing the actual rows.
 */
export function useAssetCredentialCount(assetId: string | null | undefined) {
  return useQuery({
    queryKey: ["credentials_count", assetId],
    queryFn: async (): Promise<number> => {
      if (!assetId) return 0;
      const { data, error } = await (supabase as any).rpc("credentials_count_for_asset", {
        p_asset_id: assetId,
      });
      if (error) return 0;
      return (data as number) ?? 0;
    },
    enabled: !!assetId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["credentials"] });
  qc.invalidateQueries({ queryKey: ["credentials_count"] });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CredentialInsert) => {
      const { data, error } = await tbl().insert(input).select().single();
      if (error) throw error;
      return data as Credential;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Credential> & { id: string }) => {
      const { error } = await tbl().update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
