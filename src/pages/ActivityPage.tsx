import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  PackagePlus,
  UserCheck,
  UserMinus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";

const TX_ICONS: Record<string, React.ElementType> = {
  allocation: UserCheck,
  return: UserMinus,
  transfer: ArrowRightLeft,
  maintenance_start: Wrench,
  maintenance_end: CheckCircle2,
  lost: AlertTriangle,
  damaged: AlertTriangle,
  scrapped: AlertTriangle,
  purchase: ShoppingCart,
};

const TX_COLORS: Record<string, string> = {
  allocation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  return: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  transfer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  maintenance_start: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  maintenance_end: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  damaged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scrapped: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  purchase: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function txLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-timeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_transactions")
        .select(`
          id, transaction_type, notes, condition_status, created_at,
          asset:assets(sap_code, name),
          from_employee:employees!asset_transactions_from_employee_id_fkey(name),
          to_employee:employees!asset_transactions_to_employee_id_fkey(name),
          from_location:locations!asset_transactions_from_location_id_fkey(name),
          to_location:locations!asset_transactions_to_location_id_fkey(name)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full audit trail of asset movements and lifecycle events
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <PackagePlus className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No activity recorded yet.</p>
            <p className="text-xs text-muted-foreground/60">
              Transactions will appear here as assets are allocated, transferred, and maintained.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {data.length} event{data.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              {/* timeline vertical line */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
              <ul className="space-y-0">
                {data.map((tx: any, idx: number) => {
                  const Icon = TX_ICONS[tx.transaction_type] ?? PackagePlus;
                  const colorClass = TX_COLORS[tx.transaction_type] ?? "bg-muted text-muted-foreground";
                  return (
                    <li key={tx.id} className={`flex gap-4 px-4 py-3 ${idx !== data.length - 1 ? "border-b" : ""}`}>
                      <div className="relative z-10 flex-shrink-0 mt-0.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{tx.asset?.name || "Unknown asset"}</span>
                          <span className="text-xs text-muted-foreground font-mono">{tx.asset?.sap_code}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {txLabel(tx.transaction_type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {tx.from_employee?.name && (
                            <span>From: <span className="text-foreground">{tx.from_employee.name}</span></span>
                          )}
                          {tx.to_employee?.name && (
                            <span>To: <span className="text-foreground">{tx.to_employee.name}</span></span>
                          )}
                          {tx.from_location?.name && (
                            <span>From: <span className="text-foreground">{tx.from_location.name}</span></span>
                          )}
                          {tx.to_location?.name && (
                            <span>To: <span className="text-foreground">{tx.to_location.name}</span></span>
                          )}
                          {tx.notes && <span className="italic">{tx.notes}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                        {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
