import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFieldDefinitions, type EntityType, type FieldDefinition } from "@/hooks/useFieldDefinitions";

interface Props {
  entityType: EntityType;
  /** Asset subtype (or similar) — definitions can be subtype-scoped. */
  subtype?: string | null;
  /** Current JSONB values: { field_key: value }. */
  values: Record<string, unknown>;
  /** Update one field at a time. */
  onChange: (key: string, value: unknown) => void;
}

export function DynamicCustomFields({ entityType, subtype, values, onChange }: Props) {
  const { data: defs = [], isLoading } = useFieldDefinitions(entityType, subtype);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Loading custom fields…
      </div>
    );
  }
  if (defs.length === 0) return null;

  return (
    <div className="col-span-2 space-y-3 rounded-xl border border-dashed border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        <Sparkles className="h-3 w-3" /> Custom fields
      </div>
      <div className="grid grid-cols-2 gap-3">
        {defs.map((def) => (
          <FieldInput key={def.id} def={def} value={values[def.field_key]} onChange={(v) => onChange(def.field_key, v)} />
        ))}
      </div>
    </div>
  );
}

function FieldInput({
  def, value, onChange,
}: {
  def: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const colSpan = def.field_type === "textarea" ? "col-span-2" : "";
  const label = (
    <Label className="flex items-center gap-1">
      {def.field_label}
      {def.is_required && <span className="text-destructive">*</span>}
    </Label>
  );

  if (def.field_type === "textarea") {
    return (
      <div className={`space-y-1.5 ${colSpan}`}>
        {label}
        <Textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder ?? ""} rows={3} required={def.is_required} />
        {def.help_text && <p className="text-[10px] text-muted-foreground">{def.help_text}</p>}
      </div>
    );
  }

  if (def.field_type === "boolean") {
    return (
      <div className={`space-y-1.5 ${colSpan}`}>
        <div className="flex items-center gap-2">
          <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
          <Label className="text-sm cursor-pointer">{def.field_label}</Label>
        </div>
        {def.help_text && <p className="text-[10px] text-muted-foreground">{def.help_text}</p>}
      </div>
    );
  }

  if (def.field_type === "dropdown") {
    return (
      <div className={`space-y-1.5 ${colSpan}`}>
        {label}
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue placeholder={def.placeholder ?? "Select…"} /></SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
        {def.help_text && <p className="text-[10px] text-muted-foreground">{def.help_text}</p>}
      </div>
    );
  }

  const inputType =
    def.field_type === "number" ? "number" :
    def.field_type === "date"   ? "date"   :
    def.field_type === "url"    ? "url"    :
    def.field_type === "email"  ? "email"  : "text";

  return (
    <div className={`space-y-1.5 ${colSpan}`}>
      {label}
      <Input
        type={inputType}
        value={(value as string | number) ?? ""}
        onChange={(e) => onChange(def.field_type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
        placeholder={def.placeholder ?? ""}
        required={def.is_required}
      />
      {def.help_text && <p className="text-[10px] text-muted-foreground">{def.help_text}</p>}
    </div>
  );
}
