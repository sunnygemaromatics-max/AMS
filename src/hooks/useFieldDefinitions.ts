import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EntityType = "asset" | "employee" | "license" | "credential";
export type FieldType = "text" | "textarea" | "number" | "date" | "boolean" | "dropdown" | "url" | "email";

export interface FieldDefinition {
  id: string;
  entity_type: EntityType;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  options: string[] | null;
  applies_to_subtypes: string[] | null;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type FieldDefinitionInsert = Omit<FieldDefinition, "id" | "created_at" | "updated_at">;

const tbl = () =>
  (supabase as unknown as { from: (t: string) => any }).from("custom_field_definitions");

/** All active field definitions for an entity type, optionally filtered to a subtype. */
export function useFieldDefinitions(entityType: EntityType, subtype?: string | null) {
  return useQuery({
    queryKey: ["custom_field_definitions", entityType],
    queryFn: async (): Promise<FieldDefinition[]> => {
      const { data, error } = await tbl()
        .select("*")
        .eq("entity_type", entityType)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        if (error.code === "42P01" || /custom_field_definitions/.test(error.message || "")) return [];
        throw error;
      }
      return (data as FieldDefinition[]) ?? [];
    },
    // Local subtype filter — we cache all defs for the entity then narrow,
    // because subtype filtering is a TEXT[] containment check.
    select: (defs) => subtype
      ? defs.filter(d => !d.applies_to_subtypes || d.applies_to_subtypes.length === 0 || d.applies_to_subtypes.includes(subtype))
      : defs,
  });
}

/** Admin-only: full list including inactive, for management UI. */
export function useAllFieldDefinitions() {
  return useQuery({
    queryKey: ["custom_field_definitions_all"],
    queryFn: async (): Promise<FieldDefinition[]> => {
      const { data, error } = await tbl()
        .select("*")
        .order("entity_type")
        .order("sort_order");
      if (error) {
        if (error.code === "42P01" || /custom_field_definitions/.test(error.message || "")) return [];
        throw error;
      }
      return (data as FieldDefinition[]) ?? [];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["custom_field_definitions"] });
  qc.invalidateQueries({ queryKey: ["custom_field_definitions_all"] });
}

export function useCreateFieldDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FieldDefinitionInsert) => {
      const { data, error } = await tbl().insert(input).select().single();
      if (error) throw error;
      return data as FieldDefinition;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateFieldDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FieldDefinition> & { id: string }) => {
      const { error } = await tbl().update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteFieldDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
