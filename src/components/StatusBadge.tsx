import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { className: string }> = {
  Occupied: { className: "bg-accent/15 text-accent border-accent/30" },
  Available: { className: "bg-info/15 text-info border-info/30" },
  "Under Maintenance": { className: "bg-warning/15 text-warning border-warning/30" },
  Lost: { className: "bg-destructive/15 text-destructive border-destructive/30" },
  Damaged: { className: "bg-warning/15 text-warning border-warning/30" },
  Scrapped: { className: "bg-muted text-muted-foreground border-muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.Available;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {status}
    </Badge>
  );
}
