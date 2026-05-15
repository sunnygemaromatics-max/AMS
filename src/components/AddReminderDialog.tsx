import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { parseDbError } from "@/lib/supabase-error";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateCustomReminder,
  useUpdateCustomReminder,
  useReminderActivity,
  type CustomReminder,
  type ReminderActivity,
  type ReminderType,
} from "@/hooks/useCustomReminders";
import { Loader2, Calendar, Tag, Link2, Repeat, FileText, AlertCircle, History, CheckCircle2, AlarmClock, Plus, Edit3 } from "lucide-react";

const REMINDER_TYPES: { value: ReminderType; label: string; emoji: string }[] = [
  { value: "warranty", label: "Warranty", emoji: "🛡️" },
  { value: "amc", label: "AMC / Service Contract", emoji: "🔧" },
  { value: "license", label: "Software License", emoji: "🔑" },
  { value: "insurance", label: "Insurance", emoji: "📋" },
  { value: "subscription", label: "Subscription", emoji: "💳" },
  { value: "domain", label: "Domain / Hosting", emoji: "🌐" },
  { value: "certificate", label: "SSL / Certificate", emoji: "🔒" },
  { value: "audit", label: "Audit / Compliance", emoji: "📊" },
  { value: "other", label: "Other", emoji: "✨" },
];

interface AddReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a reminder to edit; omit to create. */
  reminder?: CustomReminder | null;
}

const today = () => new Date().toISOString().split("T")[0];

export function AddReminderDialog({ open, onOpenChange, reminder }: AddReminderDialogProps) {
  const isEdit = !!reminder;
  const { profile, user } = useAuth();
  const create = useCreateCustomReminder();
  const update = useUpdateCustomReminder();
  const { data: activity = [] } = useReminderActivity(open && reminder ? reminder.id : null);
  const busy = create.isPending || update.isPending;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReminderType>("other");
  const [expiryDate, setExpiryDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceMonths, setRecurrenceMonths] = useState<number>(12);

  // Hydrate form when opening an edit
  useEffect(() => {
    if (open && reminder) {
      setTitle(reminder.title);
      setType(reminder.reminder_type);
      setExpiryDate(reminder.expiry_date);
      setNotes(reminder.notes ?? "");
      setReferenceCode(reminder.reference_code ?? "");
      setReferenceUrl(reminder.reference_url ?? "");
      setIsRecurring(reminder.is_recurring);
      setRecurrenceMonths(reminder.recurrence_months ?? 12);
    } else if (open && !reminder) {
      setTitle("");
      setType("other");
      setExpiryDate(today());
      setNotes("");
      setReferenceCode("");
      setReferenceUrl("");
      setIsRecurring(false);
      setRecurrenceMonths(12);
    }
  }, [open, reminder]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!expiryDate) {
      toast({ title: "Expiry date is required", variant: "destructive" });
      return;
    }

    const payload = {
      title: title.trim(),
      reminder_type: type,
      expiry_date: expiryDate,
      notes: notes.trim() || null,
      reference_code: referenceCode.trim() || null,
      reference_url: referenceUrl.trim() || null,
      is_recurring: isRecurring,
      recurrence_months: isRecurring ? recurrenceMonths : null,
      asset_id: null,
      license_id: null,
      company_id: null,
      location_id: null,
      department_id: null,
      created_by: user?.id ?? null,
      created_by_name: profile?.full_name ?? user?.email ?? null,
    };

    try {
      if (isEdit && reminder) {
        await update.mutateAsync({ id: reminder.id, ...payload });
        toast({ title: "Reminder updated" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Reminder added", description: "It'll show up in your alerts feed." });
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not save", description: parseDbError(err), variant: "destructive" });
    }
  };

  const daysFromNow = (() => {
    if (!expiryDate) return null;
    const ms = new Date(expiryDate).getTime() - new Date(today()).getTime();
    return Math.ceil(ms / 86400000);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg tsi-gradient flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            {isEdit ? "Edit reminder" : "Add expiry reminder"}
          </DialogTitle>
          <DialogDescription>
            Track anything with an expiry date — insurance, subs, domains, audits — even if it isn't in Assets or Licenses yet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office fire insurance renewal"
              maxLength={200}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="mr-2">{t.emoji}</span>{t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiry" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Expiry date *</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
              {daysFromNow !== null && (
                <Badge
                  variant="outline"
                  className={
                    daysFromNow < 0
                      ? "text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                      : daysFromNow <= 7
                      ? "text-[10px] bg-warning/10 text-warning border-warning/30"
                      : "text-[10px]"
                  }
                >
                  {daysFromNow < 0 ? `${-daysFromNow} day${-daysFromNow === 1 ? "" : "s"} overdue` : daysFromNow === 0 ? "Today" : `in ${daysFromNow} day${daysFromNow === 1 ? "" : "s"}`}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="refcode" className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Reference code</Label>
              <Input
                id="refcode"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="Policy #, license key, …"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refurl" className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> External link</Label>
              <Input
                id="refurl"
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vendor contact, what to do when this expires, where the contract lives…"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-start gap-3">
            <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
            <div className="flex-1">
              <Label htmlFor="recurring" className="cursor-pointer flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" /> Recurring
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Auto-roll the expiry forward after you acknowledge it.
              </p>
              {isRecurring && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={recurrenceMonths}
                    onChange={(e) => setRecurrenceMonths(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">months</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="tsi-gradient text-white hover:opacity-90">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Save changes" : "Add reminder"}
            </Button>
          </DialogFooter>

          <p className="text-[10px] text-muted-foreground flex items-start gap-1.5 pt-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            Reminders are stored in Supabase. If you see a save error, run <code className="px-1 py-0.5 bg-muted rounded">SETUP_CUSTOM_REMINDERS.sql</code> once.
          </p>
        </form>

        {isEdit && activity.length > 0 && (
          <div className="mt-2 border-t pt-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3 w-3" /> Activity ({activity.length})
            </h4>
            <ol className="relative space-y-2.5 pl-5">
              <div className="absolute left-1.5 top-1.5 bottom-1 w-px bg-border" />
              {activity.map((a) => (
                <ActivityLine key={a.id} activity={a} />
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityLine({ activity }: { activity: ReminderActivity }) {
  const { icon: Icon, color, label } = activityMeta(activity.action);
  const when = new Date(activity.created_at).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return (
    <li className="relative">
      <span className={`absolute -left-5 top-0.5 h-3 w-3 rounded-full ring-2 ring-background grid place-items-center ${color}`}>
        <Icon className="h-2 w-2 text-white" />
      </span>
      <div className="text-xs">
        <span className="font-medium">{label}</span>
        {activity.actor_name && (
          <span className="text-muted-foreground"> by {activity.actor_name}</span>
        )}
        <span className="text-muted-foreground/70 ml-1.5">• {when}</span>
        {activity.detail && Object.keys(activity.detail).length > 0 && (
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {formatActivityDetail(activity)}
          </div>
        )}
      </div>
    </li>
  );
}

function activityMeta(action: ReminderActivity["action"]) {
  switch (action) {
    case "created":      return { icon: Plus,         color: "bg-success",      label: "Created" };
    case "updated":      return { icon: Edit3,        color: "bg-primary",      label: "Updated" };
    case "snoozed":      return { icon: AlarmClock,   color: "bg-accent",       label: "Snoozed" };
    case "unsnoozed":    return { icon: AlarmClock,   color: "bg-muted-foreground", label: "Un-snoozed" };
    case "acknowledged": return { icon: CheckCircle2, color: "bg-success",      label: "Marked handled" };
    case "deleted":      return { icon: AlertCircle,  color: "bg-destructive",  label: "Deleted" };
  }
}

function formatActivityDetail(a: ReminderActivity): string {
  if (!a.detail) return "";
  const d = a.detail as Record<string, unknown>;
  if (a.action === "snoozed" && d.until) return `until ${d.until}`;
  if (a.action === "created") return `${d.reminder_type} • expires ${d.expiry_date}`;
  if (a.action === "updated" && d.before && d.after) {
    const before = d.before as Record<string, unknown>;
    const after = d.after as Record<string, unknown>;
    const changes: string[] = [];
    if (before.title !== after.title) changes.push(`title: "${before.title}" → "${after.title}"`);
    if (before.expiry_date !== after.expiry_date) changes.push(`expiry: ${before.expiry_date} → ${after.expiry_date}`);
    if (before.reminder_type !== after.reminder_type) changes.push(`type: ${before.reminder_type} → ${after.reminder_type}`);
    return changes.join(" • ");
  }
  return "";
}
