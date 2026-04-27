import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  kind: "warranty" | "amc" | "license";
  severity: "expired" | "critical" | "warning";
  title: string;
  subtitle: string;
  date: string;
  daysLeft: number;
  link: string;
}

const today = () => new Date().toISOString().split("T")[0];
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

function severityFor(daysLeft: number): AppNotification["severity"] {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "critical";
  return "warning";
}

export function useNotifications(windowDays = 10) {
  return useQuery({
    queryKey: ["notifications", windowDays],
    queryFn: async () => {
      const startWindow = addDays(-30); // include recently expired
      const endWindow = addDays(windowDays);

      const [assetsRes, licensesRes] = await Promise.all([
        supabase
          .from("assets")
          .select("id, sap_code, name, warranty_end, amc_end, amc_vendor")
          .eq("is_deleted", false)
          .or(`warranty_end.gte.${startWindow},amc_end.gte.${startWindow}`),
        supabase
          .from("licenses")
          .select("id, license_type, product_name, email_id, validity_end")
          .gte("validity_end", startWindow)
          .lte("validity_end", endWindow),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (licensesRes.error) throw licensesRes.error;

      const now = today();
      const list: AppNotification[] = [];

      (assetsRes.data || []).forEach((a: any) => {
        if (a.warranty_end && a.warranty_end >= startWindow && a.warranty_end <= endWindow) {
          const days = Math.ceil((new Date(a.warranty_end).getTime() - new Date(now).getTime()) / 86400000);
          list.push({
            id: `warranty-${a.id}`,
            kind: "warranty",
            severity: severityFor(days),
            title: `Warranty ${days < 0 ? "expired" : "expiring"} — ${a.sap_code}`,
            subtitle: `${a.name} • ${days < 0 ? `${-days}d ago` : `in ${days}d`}`,
            date: a.warranty_end,
            daysLeft: days,
            link: `/assets/${a.id}`,
          });
        }
        if (a.amc_end && a.amc_end >= startWindow && a.amc_end <= endWindow) {
          const days = Math.ceil((new Date(a.amc_end).getTime() - new Date(now).getTime()) / 86400000);
          list.push({
            id: `amc-${a.id}`,
            kind: "amc",
            severity: severityFor(days),
            title: `AMC ${days < 0 ? "expired" : "expiring"} — ${a.sap_code}`,
            subtitle: `${a.amc_vendor || a.name} • ${days < 0 ? `${-days}d ago` : `in ${days}d`}`,
            date: a.amc_end,
            daysLeft: days,
            link: `/assets/${a.id}`,
          });
        }
      });

      (licensesRes.data || []).forEach((l: any) => {
        const days = Math.ceil((new Date(l.validity_end).getTime() - new Date(now).getTime()) / 86400000);
        list.push({
          id: `license-${l.id}`,
          kind: "license",
          severity: severityFor(days),
          title: `License ${days < 0 ? "expired" : "expiring"} — ${l.license_type}`,
          subtitle: `${l.product_name || l.email_id || ""} • ${days < 0 ? `${-days}d ago` : `in ${days}d`}`,
          date: l.validity_end,
          daysLeft: days,
          link: `/licenses`,
        });
      });

      return list.sort((a, b) => a.daysLeft - b.daysLeft);
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
