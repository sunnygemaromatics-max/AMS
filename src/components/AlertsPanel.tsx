import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle, BellRing, CheckCircle2, Clock, Plus, Search, Shield, Key, Wrench,
  ChevronRight, ExternalLink, Pencil, Trash2, Calendar, Filter as FilterIcon, Loader2, Globe, FileText, Lock, BarChart2, Sparkles,
  AlarmClock, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, type AppNotification, type NotificationKind } from "@/hooks/useNotifications";
import {
  useCustomReminders,
  useDeleteCustomReminder,
  useAcknowledgeReminder,
  useSnoozeReminder,
  useUnsnoozeReminder,
  type CustomReminder,
  type ReminderType,
} from "@/hooks/useCustomReminders";
import { AddReminderDialog } from "@/components/AddReminderDialog";
import { EmptyState } from "@/components/EmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { parseDbError } from "@/lib/supabase-error";

const REMINDER_ICONS: Record<ReminderType, typeof BellRing> = {
  warranty: Shield,
  amc: Wrench,
  license: Key,
  insurance: FileText,
  subscription: Sparkles,
  domain: Globe,
  certificate: Lock,
  audit: BarChart2,
  other: BellRing,
};

const KIND_ICONS = {
  warranty: Shield,
  amc: Wrench,
  license: Key,
  custom: BellRing,
} as const;

type SeverityFilter = "all" | "expired" | "critical" | "warning";
type KindFilter = "all" | NotificationKind;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const sevColors = {
  expired: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", left: "before:bg-destructive" },
  critical: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/40", left: "before:bg-warning" },
  warning: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30", left: "before:bg-accent" },
} as const;

interface AlertsPanelProps {
  /** Widen the lookahead window. Default 60 days; bell uses 10. */
  windowDays?: number;
}

export function AlertsPanel({ windowDays = 60 }: AlertsPanelProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile, user, canWrite } = useAuth();
  const { data: notifications = [], isLoading: notifLoading } = useNotifications(windowDays);
  const { data: reminders = [], isLoading: remLoading } = useCustomReminders();
  const ackMutation = useAcknowledgeReminder();
  const deleteMutation = useDeleteCustomReminder();
  const snoozeMutation = useSnoozeReminder();
  const unsnoozeMutation = useUnsnoozeReminder();

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<SeverityFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomReminder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomReminder | null>(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [showSnoozed, setShowSnoozed] = useState(false);
  // Selection set (notification.id, not reminder.id, because users can multi-select any alert)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loading = notifLoading || remLoading;

  // Build a quick lookup of reminders by id (for inline edit/delete on custom rows)
  const reminderById = useMemo(() => {
    const m = new Map<string, CustomReminder>();
    reminders.forEach((r) => m.set(r.id, r));
    return m;
  }, [reminders]);

  const acknowledgedReminders = useMemo(
    () => reminders.filter((r) => !!r.acknowledged_at).sort((a, b) =>
      (b.acknowledged_at ?? "").localeCompare(a.acknowledged_at ?? "")
    ),
    [reminders],
  );

  const todayIso = new Date().toISOString().split("T")[0];
  const snoozedReminders = useMemo(
    () => reminders.filter(
      (r) => !r.acknowledged_at && r.snoozed_until && r.snoozed_until >= todayIso,
    ).sort((a, b) => (a.snoozed_until ?? "").localeCompare(b.snoozed_until ?? "")),
    [reminders, todayIso],
  );

  // Filter the active list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (sevFilter !== "all" && n.severity !== sevFilter) return false;
      if (kindFilter !== "all" && n.kind !== kindFilter) return false;
      if (q) {
        const blob = `${n.title} ${n.subtitle}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, search, sevFilter, kindFilter]);

  // Severity counts (from the unfiltered list — chips always show full picture)
  const counts = useMemo(() => {
    const c = { all: notifications.length, expired: 0, critical: 0, warning: 0 };
    notifications.forEach((n) => { c[n.severity]++; });
    return c;
  }, [notifications]);

  const kindCounts = useMemo(() => {
    const c: Record<KindFilter, number> = { all: notifications.length, warranty: 0, amc: 0, license: 0, custom: 0 };
    notifications.forEach((n) => { c[n.kind]++; });
    return c;
  }, [notifications]);

  const userName = profile?.full_name ?? user?.email ?? "Unknown";

  const handleAcknowledge = async (sourceId?: string) => {
    if (!sourceId) return;
    try {
      await ackMutation.mutateAsync({ id: sourceId, userName });
      toast({ title: "Marked as handled" });
    } catch (err) {
      toast({ title: "Could not acknowledge", description: parseDbError(err), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast({ title: "Reminder deleted" });
      setConfirmDelete(null);
    } catch (err) {
      toast({ title: "Could not delete", description: parseDbError(err), variant: "destructive" });
    }
  };

  /** Snooze a custom reminder by N days from today. */
  const handleSnooze = async (sourceId: string | undefined, days: number) => {
    if (!sourceId) return;
    const until = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
    try {
      await snoozeMutation.mutateAsync({ id: sourceId, until });
      toast({ title: `Snoozed for ${days}d`, description: `Will reappear ${until}` });
    } catch (err) {
      toast({ title: "Could not snooze", description: parseDbError(err), variant: "destructive" });
    }
  };

  const handleUnsnooze = async (sourceId: string) => {
    try {
      await unsnoozeMutation.mutateAsync(sourceId);
      toast({ title: "Reminder re-activated" });
    } catch (err) {
      toast({ title: "Could not unsnooze", description: parseDbError(err), variant: "destructive" });
    }
  };

  /** Bulk acknowledge every selected custom reminder. Non-custom rows are silently skipped. */
  const handleBulkAcknowledge = async () => {
    const customIds = filtered
      .filter((n) => n.kind === "custom" && selected.has(n.id) && n.sourceId)
      .map((n) => n.sourceId as string);
    if (customIds.length === 0) {
      toast({ title: "Only custom reminders can be acknowledged in bulk", variant: "destructive" });
      return;
    }
    try {
      // Sequential — keeps recurring-row auto-renew inserts deterministic
      for (const id of customIds) {
        await ackMutation.mutateAsync({ id, userName });
      }
      toast({ title: `Handled ${customIds.length} reminder${customIds.length === 1 ? "" : "s"}` });
      setSelected(new Set());
    } catch (err) {
      toast({ title: "Could not acknowledge all", description: parseDbError(err), variant: "destructive" });
    }
  };

  const toggleSelect = (notifId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(notifId) ? next.delete(notifId) : next.add(notifId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const visibleCustom = filtered.filter((n) => n.kind === "custom").map((n) => n.id);
      if (visibleCustom.every((id) => prev.has(id)) && visibleCustom.length > 0) {
        return new Set();
      }
      return new Set(visibleCustom);
    });
  };

  const visibleCustomCount = filtered.filter((n) => n.kind === "custom").length;
  const selectedCount = filtered.filter((n) => selected.has(n.id)).length;

  return (
    <div className="space-y-5">
      {/* Header band with gradient + summary stats */}
      <div className="relative overflow-hidden rounded-2xl tsi-gradient p-5 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BellRing className="h-6 w-6" /> {t("alerts.title")}
            </h2>
            <p className="text-sm text-white/85 mt-1">
              {t("alerts.subtitle", { days: windowDays })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SummaryStat label={t("alerts.expired")} value={counts.expired} tone="destructive" />
            <SummaryStat label={t("alerts.urgent")} value={counts.critical} tone="warning" />
            <SummaryStat label={t("alerts.upcoming")} value={counts.warning} tone="info" />
            {canWrite && (
              <Button
                size="sm"
                onClick={() => { setEditing(null); setDialogOpen(true); }}
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-md"
              >
                <Plus className="h-4 w-4 mr-1" /> {t("alerts.addReminder")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts…"
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {(["all", "expired", "critical", "warning"] as SeverityFilter[]).map((s) => (
                <Chip
                  key={s}
                  active={sevFilter === s}
                  onClick={() => setSevFilter(s)}
                  className={
                    s === "expired" ? "data-[active=true]:bg-destructive/15 data-[active=true]:text-destructive data-[active=true]:border-destructive/40" :
                    s === "critical" ? "data-[active=true]:bg-warning/15 data-[active=true]:text-warning data-[active=true]:border-warning/40" :
                    s === "warning" ? "data-[active=true]:bg-accent/15 data-[active=true]:text-accent data-[active=true]:border-accent/40" :
                    "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border-primary/30"
                  }
                >
                  {s === "all" ? "All" : s === "expired" ? "Expired" : s === "critical" ? "Urgent" : "Upcoming"}
                  <span className="ml-1.5 text-[10px] opacity-80">{s === "all" ? counts.all : counts[s]}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "warranty", "amc", "license", "custom"] as KindFilter[]).map((k) => (
              <Chip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
                {k === "all" ? "All types" : k.charAt(0).toUpperCase() + k.slice(1)}
                <span className="ml-1.5 text-[10px] opacity-80">{k === "all" ? kindCounts.all : kindCounts[k]}</span>
              </Chip>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar — only shows when something is selected */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 animate-fade-in">
          <Checkbox
            checked={visibleCustomCount > 0 && selectedCount === visibleCustomCount}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <span className="text-xs text-muted-foreground">
            (custom reminders only — system alerts use the source row)
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleBulkAcknowledge}
              disabled={ackMutation.isPending}
              className="tsi-gradient text-white hover:opacity-90"
            >
              {ackMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Mark {selectedCount} as handled
            </Button>
          </div>
        </div>
      )}

      {/* "Select all custom reminders in view" hint — only when there are custom rows and none selected */}
      {selectedCount === 0 && visibleCustomCount > 0 && (
        <button
          onClick={toggleSelectAll}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <CheckCircle2 className="h-3 w-3" />
          Select all {visibleCustomCount} custom reminder{visibleCustomCount === 1 ? "" : "s"} in view
        </button>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <EmptyState
            icon={notifications.length === 0 ? CheckCircle2 : Search}
            title={notifications.length === 0 ? t("alerts.allClear") : t("alerts.noMatch")}
            description={
              notifications.length === 0
                ? t("alerts.allClearDesc", { days: windowDays })
                : t("alerts.noMatchDesc")
            }
            action={canWrite && (
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="tsi-gradient text-white hover:opacity-90">
                <Plus className="h-4 w-4 mr-1" /> {t("alerts.addReminder")}
              </Button>
            )}
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <AlertRow
              key={n.id}
              notification={n}
              reminder={n.kind === "custom" && n.sourceId ? reminderById.get(n.sourceId) ?? null : null}
              isSelected={selected.has(n.id)}
              onToggleSelect={() => toggleSelect(n.id)}
              onOpen={() => {
                if (n.kind === "custom") return; // custom rows have their own actions
                navigate(n.link);
              }}
              onEdit={(r) => { setEditing(r); setDialogOpen(true); }}
              onDelete={(r) => setConfirmDelete(r)}
              onAcknowledge={() => handleAcknowledge(n.sourceId)}
              onSnooze={(days) => handleSnooze(n.sourceId, days)}
              ackBusy={ackMutation.isPending}
              snoozeBusy={snoozeMutation.isPending}
            />
          ))}
        </ul>
      )}

      {/* Snoozed reminders toggle */}
      {snoozedReminders.length > 0 && (
        <div>
          <button
            onClick={() => setShowSnoozed((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", showSnoozed && "rotate-90")} />
            {showSnoozed ? "Hide" : "Show"} snoozed ({snoozedReminders.length})
          </button>
          {showSnoozed && (
            <ul className="mt-3 space-y-1.5">
              {snoozedReminders.map((r) => {
                const Icon = REMINDER_ICONS[r.reminder_type];
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground/80 truncate flex-1">{r.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      <AlarmClock className="h-2.5 w-2.5 mr-1" />
                      until {formatDate(r.snoozed_until!)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => handleUnsnooze(r.id)}
                      disabled={unsnoozeMutation.isPending}
                    >
                      Wake now
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Acknowledged history toggle */}
      {acknowledgedReminders.length > 0 && (
        <div>
          <button
            onClick={() => setShowAcknowledged((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", showAcknowledged && "rotate-90")} />
            {showAcknowledged
              ? t("alerts.hideAcknowledged", { count: acknowledgedReminders.length })
              : t("alerts.showAcknowledged", { count: acknowledgedReminders.length })}
          </button>
          {showAcknowledged && (
            <ul className="mt-3 space-y-1.5">
              {acknowledgedReminders.map((r) => {
                const Icon = REMINDER_ICONS[r.reminder_type];
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-foreground/80 truncate">{r.title}</span>
                    <span className="ml-auto">handled by {r.acknowledged_by_name || "—"} on {formatDate(r.acknowledged_at!)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <AddReminderDialog open={dialogOpen} onOpenChange={setDialogOpen} reminder={editing} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reminder.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{confirmDelete?.title}</span><br />
              {t("reminder.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "destructive" | "warning" | "info" }) {
  const bg =
    tone === "destructive" ? "bg-white/20" :
    tone === "warning" ? "bg-white/15" :
    "bg-white/10";
  return (
    <div className={cn("rounded-xl px-3 py-2 backdrop-blur-sm", bg)}>
      <div className="text-2xl font-bold leading-none tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/85 mt-1">{label}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        "border-border/60 text-muted-foreground bg-background",
        "hover:bg-muted/50 transition-colors",
        "data-[active=true]:font-semibold",
        className,
      )}
    >
      {children}
    </button>
  );
}

function AlertRow({
  notification,
  reminder,
  isSelected,
  onToggleSelect,
  onOpen,
  onEdit,
  onDelete,
  onAcknowledge,
  onSnooze,
  ackBusy,
  snoozeBusy,
}: {
  notification: AppNotification;
  reminder: CustomReminder | null;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onEdit: (r: CustomReminder) => void;
  onDelete: (r: CustomReminder) => void;
  onAcknowledge: () => void;
  onSnooze: (days: number) => void;
  ackBusy: boolean;
  snoozeBusy: boolean;
}) {
  const sev = sevColors[notification.severity];
  const Icon =
    notification.kind === "custom" && notification.reminderType
      ? REMINDER_ICONS[notification.reminderType]
      : KIND_ICONS[notification.kind as keyof typeof KIND_ICONS];

  const daysLabel =
    notification.daysLeft < 0
      ? `${-notification.daysLeft}d overdue`
      : notification.daysLeft === 0
      ? "Today"
      : `in ${notification.daysLeft}d`;

  const isCustom = notification.kind === "custom" && reminder;

  return (
    <li
      onClick={onOpen}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-card pl-4 pr-3 py-3 transition-all",
        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r",
        sev.left,
        notification.kind !== "custom" && "cursor-pointer hover:shadow-md hover:border-accent/40",
        isSelected && "ring-2 ring-primary/40 border-primary/40",
      )}
    >
      {isCustom && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
        </div>
      )}

      <div className={cn("h-10 w-10 rounded-xl border grid place-items-center shrink-0", sev.bg, sev.border)}>
        <Icon className={cn("h-4.5 w-4.5", sev.text)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{notification.title}</p>
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider shrink-0", sev.bg, sev.text, sev.border)}>
            {daysLabel}
          </Badge>
          {reminder?.is_recurring && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" /> recurring
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.subtitle}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          <Calendar className="h-2.5 w-2.5 inline mr-1" />
          {formatDate(notification.date)}
        </p>
      </div>

      {isCustom && reminder ? (
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAcknowledge}
            disabled={ackBusy}
            className="h-8 text-xs hover:bg-success/10 hover:text-success"
            title="Mark handled"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1">Done</span>
          </Button>

          {/* Snooze menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={snoozeBusy}
                className="h-8 w-8 px-0"
                title="Snooze"
              >
                <AlarmClock className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Snooze for
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSnooze(1)} className="cursor-pointer">
                1 day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(3)} className="cursor-pointer">
                3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(7)} className="cursor-pointer">
                1 week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(14)} className="cursor-pointer">
                2 weeks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(30)} className="cursor-pointer">
                1 month
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {reminder.reference_url && (
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="h-8 w-8 px-0"
              title="Open external link"
            >
              <a href={reminder.reference_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(reminder)}
            className="h-8 w-8 px-0"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(reminder)}
            className="h-8 w-8 px-0 hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </li>
  );
}
