import { Package, Users, TrendingUp, Monitor, Loader2, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats, useAssets, useLicenses } from "@/hooks/useSupabaseData";
import { useNotifications } from "@/hooks/useNotifications";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

// TSI brand palette for charts (purple → magenta → rose → peach + accents)
const COLORS = [
  'hsl(265, 55%, 50%)',
  'hsl(320, 65%, 60%)',
  'hsl(340, 75%, 65%)',
  'hsl(20, 85%, 70%)',
  'hsl(220, 80%, 60%)',
  'hsl(152, 60%, 45%)',
  'hsl(35, 95%, 55%)',
  'hsl(280, 60%, 60%)',
];
const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function DashboardPage() {
  const { data: stats, isLoading, error: statsError } = useDashboardStats();
  const { data: assets, error: assetsError } = useAssets();
  const { data: licenses, error: licensesError } = useLicenses();
  const { data: notifications = [] } = useNotifications(60);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Compact alerts summary card shown on the Overview — clicking it jumps to /alerts
  const alertCounts = useMemo(() => {
    const expired = notifications.filter((n) => n.severity === "expired").length;
    const critical = notifications.filter((n) => n.severity === "critical").length;
    return { expired, critical, total: notifications.length, urgent: expired + critical };
  }, [notifications]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  // Surface query failures so we don't render an empty dashboard silently
  const queryError = statsError || assetsError || licensesError;
  if (queryError) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Could not load dashboard data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Supabase rejected one of the queries. Most common cause: your account is not approved yet,
            or the database is empty. Run <code className="px-1.5 py-0.5 rounded bg-muted text-xs">DEBUG_AND_FIX.sql</code> in
            the Supabase SQL Editor.
          </p>
          <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{JSON.stringify({
  stats:    statsError    ? (statsError    as Error).message : "ok",
  assets:   assetsError   ? (assetsError   as Error).message : "ok",
  licenses: licensesError ? (licensesError as Error).message : "ok",
}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  // No data at all? Help the user understand why.
  if ((assets ?? []).length === 0 && stats?.totalAssets === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" /> No data found
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>The queries succeeded, but every table is empty.</p>
          <p>Run <code className="px-1.5 py-0.5 rounded bg-muted text-xs">DEBUG_AND_FIX.sql</code> in the Supabase SQL Editor — it will insert a few sample rows so you can see the UI in action.</p>
        </CardContent>
      </Card>
    );
  }

  const totalValue = stats?.totalValue || 0;
  const allocated = stats?.allocated || 0;
  const total = stats?.totalAssets || 0;

  // Status stats
  const statusStats: Record<string, number> = {};
  (assets || []).forEach((a: any) => { statusStats[a.status] = (statusStats[a.status] || 0) + 1; });
  const statusData = Object.entries(statusStats).map(([name, value]) => ({ name: statusLabel(name), value }));

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="tsi-gradient-text">{t("nav.dashboard")}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("dashboard.totalAssets")} value={total} subtitle={t("dashboard.allLocations")} icon={Package} gradient="kpi-gradient-1" />
        <KpiCard title={t("dashboard.allocated")} value={allocated} subtitle={total > 0 ? t("dashboard.utilization", { percent: Math.round(allocated / total * 100) }) : '—'} icon={Monitor} gradient="kpi-gradient-2" />
        <KpiCard title={t("nav.employees")} value={stats?.employeeCount || 0} subtitle={`${stats?.locationCount || 0} ${t("nav.locations").toLowerCase()}`} icon={Users} gradient="kpi-gradient-3" />
        <KpiCard title={t("dashboard.totalValue")} value={`₹${(totalValue / 100000).toFixed(1)}L`} subtitle={`${stats?.licenseCount || 0} ${t("nav.licenses").toLowerCase()}`} icon={TrendingUp} gradient="kpi-gradient-4" />
      </div>

      {/* Compact alerts strip — clicking jumps to the full Alerts page */}
      {alertCounts.total > 0 && (
        <Card
          onClick={() => navigate("/alerts")}
          className="cursor-pointer border-warning/30 bg-warning/5 animate-fade-in-up stagger-2 hover:border-warning/50 transition-colors group"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {alertCounts.expired > 0 ? `${alertCounts.expired} expired` : "Expiring soon"}
                {alertCounts.critical > 0 && (
                  <span className="text-muted-foreground font-normal">• {alertCounts.critical} urgent</span>
                )}
                {alertCounts.total > alertCounts.urgent && (
                  <span className="text-muted-foreground font-normal">• {alertCounts.total - alertCounts.urgent} upcoming</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground font-normal group-hover:text-warning transition-colors">
                Open Alerts →
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {notifications.slice(0, 6).map((n) => (
                <Badge
                  key={n.id}
                  variant="outline"
                  className={
                    n.severity === "expired"
                      ? "text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                      : n.severity === "critical"
                      ? "text-[10px] bg-warning/10 text-warning border-warning/30"
                      : "text-[10px]"
                  }
                >
                  {n.title}
                </Badge>
              ))}
              {notifications.length > 6 && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  +{notifications.length - 6} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Status */}
        <Card className="glass-card animate-fade-in-up stagger-3">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full tsi-gradient" />Assets by Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(265 55% 50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet.</p>}
          </CardContent>
        </Card>

        {/* Assets by Type */}
        <Card className="glass-card animate-fade-in-up stagger-4">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full tsi-gradient" />Assets by Type</CardTitle></CardHeader>
          <CardContent>
            {(stats?.subtypeStats || []).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats!.subtypeStats} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ value }) => `${value}`} labelLine={false}>
                      {(stats!.subtypeStats).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {(stats!.subtypeStats).map((v: any, i: number) => (
                    <div key={v.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{v.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet.</p>}
          </CardContent>
        </Card>

        {/* Assets by Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Location</CardTitle></CardHeader>
          <CardContent>
            {(stats?.locationStats || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats!.locationStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet.</p>}
          </CardContent>
        </Card>

        {/* Assets by Department */}
        <Card>
          <CardHeader><CardTitle className="text-base">Employees by Department</CardTitle></CardHeader>
          <CardContent>
            {(stats?.departmentStats || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats!.departmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Assets */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Assets</CardTitle></CardHeader>
        <CardContent>
          {(assets || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">SAP Code</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Asset</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Employee</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Location</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(assets || []).slice(0, 10).map((asset: any) => (
                    <tr key={asset.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/assets/${asset.id}`)}>
                      <td className="py-2.5 px-3 font-mono text-xs font-medium text-accent">{asset.sap_code}</td>
                      <td className="py-2.5 px-3">{asset.name}</td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{statusLabel(asset.asset_subtype || 'other')}</Badge></td>
                      <td className="py-2.5 px-3">{asset.employees?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{asset.locations?.name || '—'}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={statusLabel(asset.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted-foreground text-sm text-center py-8">No assets yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
