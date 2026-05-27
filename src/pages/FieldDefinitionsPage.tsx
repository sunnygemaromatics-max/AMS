import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wrench, Plus, Loader2, Pencil, Trash2, Type, Hash, Calendar, ToggleLeft, List, Link2, Mail, AlignLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAllFieldDefinitions,
  useCreateFieldDefinition,
  useUpdateFieldDefinition,
  useDeleteFieldDefinition,
  type EntityType, type FieldType, type FieldDefinition, type FieldDefinitionInsert,
} from "@/hooks/useFieldDefinitions";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import { parseDbError } from "@/lib/supabase-error";

const FIELD_TYPES: { value: FieldType; label: string; icon: any }[] = [
  { value: "text",     label: "Single-line text", icon: Type },
  { value: "textarea", label: "Multi-line text",  icon: AlignLeft },
  { value: "number",   label: "Number",           icon: Hash },
  { value: "date",     label: "Date",             icon: Calendar },
  { value: "boolean",  label: "Yes / No",         icon: ToggleLeft },
  { value: "dropdown", label: "Dropdown",         icon: List },
  { value: "url",      label: "URL",              icon: Link2 },
  { value: "email",    label: "Email",            icon: Mail },
];

const ENTITY_TABS: { value: EntityType; label: string }[] = [
  { value: "asset",      label: "Assets" },
  { value: "employee",   label: "Employees" },
  { value: "license",    label: "Licenses" },
  { value: "credential", label: "Credentials" },
];

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

export default function FieldDefinitionsPage() {
  const { isAdmin } = useAuth();
  const { data: defs = [], isLoading } = useAllFieldDefinitions();
  const [activeTab, setActiveTab] = useState<EntityType>("asset");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDefinition | null>(null);

  const grouped = useMemo(() => {
    const m: Record<EntityType, FieldDefinition[]> = { asset: [], employee: [], license: [], credential: [] };
    defs.forEach((d) => m[d.entity_type]?.push(d));
    return m;
  }, [defs]);

  if (!isAdmin) {
    return (
      <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-900/30">
        <CardContent className="p-8">
          <EmptyState
            icon={Wrench}
            title="Admin only"
            description="Custom field definitions control what extra fields appear on entity forms across the app. Only Admin users can manage them."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="tsi-gradient-text">Field Definitions</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define extra fields that appear on Asset / Employee / License / Credential forms. Changes show up instantly across the app.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="tsi-gradient text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" /> New field
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <TabsList className="bg-card border border-border/60 p-1 h-auto">
          {ENTITY_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2 px-4">
              {t.label}
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">{grouped[t.value]?.length ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {ENTITY_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grouped[t.value].length === 0 ? (
              <Card>
                <EmptyState
                  icon={Wrench}
                  title={`No custom fields on ${t.label.toLowerCase()} yet`}
                  description="Add a field to extend what users can capture on this entity. Useful for organisation-specific data the default form doesn't cover."
                  action={
                    <Button onClick={() => { setEditing(null); setDialogOpen(true); setActiveTab(t.value); }} className="tsi-gradient text-white hover:opacity-90">
                      <Plus className="h-4 w-4 mr-1" /> Add first field
                    </Button>
                  }
                />
              </Card>
            ) : (
              <ul className="space-y-2">
                {grouped[t.value]
                  .sort((a, b) => a.sort_order - b.sort_order || a.field_label.localeCompare(b.field_label))
                  .map((d) => (
                    <FieldRow
                      key={d.id}
                      definition={d}
                      onEdit={() => { setEditing(d); setDialogOpen(true); }}
                    />
                  ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        definition={editing}
        defaultEntity={activeTab}
      />
    </div>
  );
}

function FieldRow({ definition, onEdit }: { definition: FieldDefinition; onEdit: () => void }) {
  const meta = FIELD_TYPES.find((t) => t.value === definition.field_type);
  const Icon = meta?.icon ?? Type;
  const del = useDeleteFieldDefinition();
  const [confirmDel, setConfirmDel] = useState(false);

  const handleDelete = async () => {
    try {
      await del.mutateAsync(definition.id);
      toast({ title: "Field deleted" });
    } catch (e) {
      toast({ title: "Could not delete", description: parseDbError(e), variant: "destructive" });
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{definition.field_label}</p>
          <Badge variant="outline" className="text-[10px]">{meta?.label ?? definition.field_type}</Badge>
          {definition.is_required && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">required</Badge>}
          {!definition.is_active && <Badge variant="outline" className="text-[10px] bg-muted">inactive</Badge>}
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{definition.field_key}</p>
        {definition.applies_to_subtypes?.length ? (
          <p className="text-[10px] text-muted-foreground mt-1">
            Only on: {definition.applies_to_subtypes.join(", ")}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground mt-1">All subtypes</p>
        )}
      </div>
      {confirmDel ? (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Confirm
          </Button>
        </div>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 px-0" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDel(true)} className="h-8 w-8 px-0 hover:bg-destructive/10 hover:text-destructive" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </li>
  );
}

const EMPTY: FieldDefinitionInsert = {
  entity_type: "asset", field_key: "", field_label: "", field_type: "text",
  options: null, applies_to_subtypes: null, placeholder: null, help_text: null,
  is_required: false, is_active: true, sort_order: 0,
};

function FieldDialog({
  open, onOpenChange, definition, defaultEntity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  definition: FieldDefinition | null;
  defaultEntity: EntityType;
}) {
  const isEdit = !!definition;
  const create = useCreateFieldDefinition();
  const update = useUpdateFieldDefinition();
  const busy = create.isPending || update.isPending;

  const [form, setForm] = useState<FieldDefinitionInsert>(EMPTY);
  const [optionsRaw, setOptionsRaw] = useState("");
  const [subtypesRaw, setSubtypesRaw] = useState("");

  // Hydrate on open
  useMemo(() => {
    if (open && definition) {
      setForm({
        entity_type: definition.entity_type,
        field_key: definition.field_key,
        field_label: definition.field_label,
        field_type: definition.field_type,
        options: definition.options,
        applies_to_subtypes: definition.applies_to_subtypes,
        placeholder: definition.placeholder,
        help_text: definition.help_text,
        is_required: definition.is_required,
        is_active: definition.is_active,
        sort_order: definition.sort_order,
      });
      setOptionsRaw((definition.options ?? []).join("\n"));
      setSubtypesRaw((definition.applies_to_subtypes ?? []).join(", "));
    } else if (open && !definition) {
      setForm({ ...EMPTY, entity_type: defaultEntity });
      setOptionsRaw("");
      setSubtypesRaw("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, definition?.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.field_label.trim()) { toast({ title: "Label is required", variant: "destructive" }); return; }
    const finalKey = form.field_key.trim() || slug(form.field_label);
    if (!finalKey) { toast({ title: "Field key is required", variant: "destructive" }); return; }

    const opts = form.field_type === "dropdown"
      ? optionsRaw.split("\n").map((s) => s.trim()).filter(Boolean)
      : null;
    if (form.field_type === "dropdown" && opts!.length === 0) {
      toast({ title: "Dropdown needs at least one option", variant: "destructive" });
      return;
    }
    const subtypes = subtypesRaw.split(",").map((s) => s.trim()).filter(Boolean);

    const payload: FieldDefinitionInsert = {
      ...form,
      field_key: finalKey,
      field_label: form.field_label.trim(),
      options: opts,
      applies_to_subtypes: subtypes.length > 0 ? subtypes : null,
      placeholder: form.placeholder?.trim() || null,
      help_text: form.help_text?.trim() || null,
    };

    try {
      if (isEdit && definition) {
        await update.mutateAsync({ id: definition.id, ...payload });
        toast({ title: "Field updated" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Field added" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not save", description: parseDbError(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg tsi-gradient flex items-center justify-center">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            {isEdit ? "Edit field" : "New custom field"}
          </DialogTitle>
          <DialogDescription>
            Customise what data your team captures on each entity. Field appears on the relevant form immediately after saving.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Applies to *</Label>
              <Select value={form.entity_type} onValueChange={(v) => setForm((f) => ({ ...f, entity_type: v as EntityType }))} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TABS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.field_type} onValueChange={(v) => setForm((f) => ({ ...f, field_type: v as FieldType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="flabel">Label *</Label>
              <Input id="flabel" value={form.field_label}
                onChange={(e) => setForm((f) => ({ ...f, field_label: e.target.value, field_key: f.field_key || slug(e.target.value) }))}
                placeholder="e.g. Asset Tag Color, Office Floor, MAC Address" maxLength={100} autoFocus required />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="fkey">Field key (database / API)</Label>
              <Input id="fkey" value={form.field_key} disabled={isEdit}
                onChange={(e) => setForm((f) => ({ ...f, field_key: slug(e.target.value) }))}
                placeholder="auto-generated from label" className="font-mono" maxLength={60} />
              <p className="text-[10px] text-muted-foreground">
                Auto-derived from the label. Can't change after creation. Used as the JSONB key.
              </p>
            </div>

            {form.field_type === "dropdown" && (
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="fopts">Dropdown options *</Label>
                <Textarea id="fopts" value={optionsRaw}
                  onChange={(e) => setOptionsRaw(e.target.value)}
                  placeholder="One option per line"
                  rows={4} className="font-mono text-sm" />
              </div>
            )}

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="fsubtypes">Limit to specific asset subtypes (optional)</Label>
              <Input id="fsubtypes" value={subtypesRaw}
                onChange={(e) => setSubtypesRaw(e.target.value)}
                placeholder="e.g. laptop, desktop  (comma-separated, leave blank for all)"
                className="font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground">
                Use the asset_subtype value (e.g. <code>laptop</code>, <code>mobile_device</code>). Leave blank to show on every {form.entity_type}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fplace">Placeholder</Label>
              <Input id="fplace" value={form.placeholder ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))} maxLength={200} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forder">Sort order</Label>
              <Input id="forder" type="number" value={form.sort_order ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))} />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="fhelp">Help text (shown under the field)</Label>
              <Input id="fhelp" value={form.help_text ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, help_text: e.target.value }))} maxLength={200} />
            </div>

            <div className="col-span-2 flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.is_required} onCheckedChange={(v) => setForm((f) => ({ ...f, is_required: v }))} />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                Active (visible on forms)
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="tsi-gradient text-white hover:opacity-90">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Create field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
