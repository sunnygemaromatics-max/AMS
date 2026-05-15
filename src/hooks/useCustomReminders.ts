import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReminderType =
  | "warranty"
  | "amc"
  | "license"
  | "insurance"
  | "subscription"
  | "domain"
  | "certificate"
  | "audit"
  | "other";

export interface CustomReminder {
  id: string;
  title: string;
  notes: string | null;
  reminder_type: ReminderType;
  expiry_date: string;
  reference_code: string | null;
  reference_url: string | null;
  asset_id: string | null;
  license_id: string | null;
  company_id: string | null;
  location_id: string | null;
  department_id: string | null;
  is_recurring: boolean;
  recurrence_months: number | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  snoozed_until: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomReminderInsert = Omit<
  CustomReminder,
  "id" | "created_at" | "updated_at" | "acknowledged_at" | "acknowledged_by" | "acknowledged_by_name" | "snoozed_until"
> & {
  acknowledged_at?: string | null;
  snoozed_until?: string | null;
};

// custom_reminders is created by SETUP_CUSTOM_REMINDERS.sql and not yet in generated types.
// All Supabase calls cast through `unknown` until the types are regenerated.
const tbl = () => (supabase as unknown as { from: (t: string) => any }).from("custom_reminders");

export function useCustomReminders() {
  return useQuery({
    queryKey: ["custom_reminders"],
    queryFn: async (): Promise<CustomReminder[]> => {
      const { data, error } = await tbl().select("*").order("expiry_date", { ascending: true });
      if (error) {
        // Gracefully handle "table doesn't exist" — the SQL migration hasn't been run yet.
        if (error.code === "42P01" || /custom_reminders/.test(error.message || "")) return [];
        throw error;
      }
      return (data as CustomReminder[]) ?? [];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomReminderInsert) => {
      const { data, error } = await tbl().insert(input).select().single();
      if (error) throw error;
      return data as CustomReminder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_reminders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomReminder> & { id: string }) => {
      const { error } = await tbl().update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_reminders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteCustomReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_reminders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Add N calendar months to an ISO date (YYYY-MM-DD). Pure, no timezone surprises. */
function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, d));
  return target.toISOString().split("T")[0];
}

export function useAcknowledgeReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userName }: { id: string; userName: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Read the row first so we can decide whether to roll a recurring one forward
      const { data: existing, error: readErr } = await tbl().select("*").eq("id", id).single();
      if (readErr) throw readErr;
      const row = existing as CustomReminder;

      const nowIso = new Date().toISOString();
      const { error } = await tbl()
        .update({
          acknowledged_at: nowIso,
          acknowledged_by: user?.id ?? null,
          acknowledged_by_name: userName,
        })
        .eq("id", id);
      if (error) throw error;

      // For recurring reminders, immediately insert the next occurrence so the
      // user never loses track of the cycle.
      if (row?.is_recurring && row.recurrence_months && row.recurrence_months > 0) {
        const nextExpiry = addMonthsIso(row.expiry_date, row.recurrence_months);
        const seed: CustomReminderInsert = {
          title: row.title,
          notes: row.notes,
          reminder_type: row.reminder_type,
          expiry_date: nextExpiry,
          reference_code: row.reference_code,
          reference_url: row.reference_url,
          asset_id: row.asset_id,
          license_id: row.license_id,
          company_id: row.company_id,
          location_id: row.location_id,
          department_id: row.department_id,
          is_recurring: true,
          recurrence_months: row.recurrence_months,
          created_by: user?.id ?? null,
          created_by_name: userName,
        };
        const { error: insertErr } = await tbl().insert(seed);
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_reminders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSnoozeReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      const { error } = await tbl().update({ snoozed_until: until }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_reminders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export interface ReminderActivity {
  id: string;
  reminder_id: string;
  action: "created" | "updated" | "snoozed" | "unsnoozed" | "acknowledged" | "deleted";
  detail: Record<string, unknown> | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
}

const activityTbl = () =>
  (supabase as unknown as { from: (t: string) => any }).from("reminder_activity");

export function useReminderActivity(reminderId: string | null | undefined) {
  return useQuery({
    queryKey: ["reminder_activity", reminderId],
    queryFn: async (): Promise<ReminderActivity[]> => {
      if (!reminderId) return [];
      const { data, error } = await activityTbl()
        .select("*")
        .eq("reminder_id", reminderId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        if (error.code === "42P01" || /reminder_activity/.test(error.message || "")) return [];
        throw error;
      }
      return (data as ReminderActivity[]) ?? [];
    },
    enabled: !!reminderId,
  });
}

export function useUnsnoozeReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl().update({ snoozed_until: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_reminders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
