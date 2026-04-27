import { Package, Users, MapPin, TrendingUp, Monitor, Loader2, Shield, Key, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats, useAssets, useLicenses } from "@/hooks/useSupabaseData";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";

const COLORS = ['hsl(220, 60%, 20%)', 'hsl(160, 60%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(210, 80%, 52%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)', 'hsl(30, 80%, 55%)', 'hsl(190, 70%, 45%)'];
const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: assets } = useAssets();
  const { data: licenses } = useLicenses();
  const navigate = useNavigate();

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const totalValue = stats?.totalValue || 0;
  const allocated = stats?.allocated || 0;
  const total = stats?.totalAssets || 0;

  // Status stats
  const statusStats: Record<string, number> = {};
  (assets || []).forEach((a: any) => { statusStats[a.status] = (statusStats[a.status] || 0) + 1; });
  const statusData = Object.entries(statusStats).map(([name, value]) => ({ name: statusLabel(name), value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Asset Management Overview</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Assets" value={total} subtitle="Across all locations" icon={Package} gradient="kpi-gradient-1" />
        <KpiCard title="Allocated" value={allocated} subtitle={total > 0 ? `${Math.round(allocated / total * 100)}% utilization` : '—'} icon={Monitor} gradient="kpi-gradient-2" />
        <KpiCard title="Employees" value={stats?.employeeCount || 0} subtitle={`${stats?.locationCount || 0} locations`} icon={Users} gradient="kpi-gradient-3" />
        <KpiCard title="Total Value" value={`₹${(totalValue / 100000).toFixed(1)}L`} subtitle={`${stats?.licenseCount || 0} licenses tracked`} icon={TrendingUp} gradient="kpi-gradient-4" />
      </div>

      {/* Expiring Alerts */}
      {((stats?.expiringWarranties || []).length > 0 || (stats?.expiringLicenses || []).length > 0) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Expiring Soon (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(stats?.expiringWarranties || []).map((a: any) => (
                <Badge key={a.id} variant="outline" className="text-xs cursor-pointer" onClick={() => navigate(`/assets/${a.id}`)}>
                  <Shield className="h-3 w-3 mr-1" /> {a.sap_code} warranty expires {a.warranty_end}
                </Badge>
              ))}
              {(stats?.expiringLicenses || []).map((l: any) => (
                <Badge key={l.id} variant="outline" className="text-xs">
                  <Key className="h-3 w-3 mr-1" /> {l.license_type} license expires {l.validity_end}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">No data yet.</p>}
          </CardContent>
        </Card>

        {/* Assets by Type */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Type</CardTitle></CardHeader>
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
