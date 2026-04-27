import { Bell, Shield, Key, Wrench, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ICONS = { warranty: Shield, amc: Wrench, license: Key } as const;

const SEV_CLASS: Record<AppNotification["severity"], string> = {
  expired: "bg-destructive/10 text-destructive border-destructive/30",
  critical: "bg-warning/15 text-warning border-warning/40",
  warning: "bg-accent/10 text-accent border-accent/30",
};

const SEV_LABEL: Record<AppNotification["severity"], string> = {
  expired: "Expired",
  critical: "Urgent",
  warning: "Soon",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: items = [], isLoading } = useNotifications(10);
  const navigate = useNavigate();

  const urgentCount = items.filter((i) => i.severity !== "warning").length;
  const totalCount = items.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold grid place-items-center text-white",
                urgentCount > 0 ? "bg-destructive" : "bg-accent"
              )}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">Expiring in next 10 days</p>
          </div>
          {totalCount > 0 && <Badge variant="secondary" className="text-xs">{totalCount}</Badge>}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="h-12 w-12 mx-auto rounded-full bg-muted grid place-items-center mb-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground mt-1">No expiring items in the next 10 days.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = ICONS[n.kind];
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => { setOpen(false); navigate(n.link); }}
                      className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors flex gap-3"
                    >
                      <div className={cn("h-8 w-8 rounded-lg border grid place-items-center shrink-0", SEV_CLASS[n.severity])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <Badge variant="outline" className={cn("text-[9px] shrink-0", SEV_CLASS[n.severity])}>
                            {SEV_LABEL[n.severity]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{n.subtitle}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {totalCount > 0 && (
          <div className="border-t p-2 bg-muted/30 flex items-center gap-2 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            Email alerts can be enabled later from Settings.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
