import { useState, useMemo } from "react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Users, KeyRound, Search, Check, X, AlertTriangle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseDbError } from "@/lib/supabase-error";

const ROLES: AppRole[] = ["admin", "it", "hr", "viewer"];

const ROLE_DESC: Record<AppRole, string> = {
  admin:  "Full access to everything — bypasses the approval gate, can read, write, delete and manage every section.",
  it:     "Manages assets, locations, vendors, categories, licenses, asset types.",
  hr:     "Manages employees, departments, designations.",
  viewer: "Read-only access — can browse data but cannot create, edit, or delete.",
};

type Capability = {
  key: string;
  label: string;
  allowed: AppRole[];
};

// Mirror of the logic in AuthContext.tsx. Edit BOTH places if rules change.
const CAPABILITIES: Capability[] = [
  { key: "approval_bypass",   label: "Bypass approval gate",      allowed: ["admin"] },
  { key: "delete",            label: "Delete any record",         allowed: ["admin"] },
  { key: "manage_users",      label: "Manage users & roles",      allowed: ["admin"] },
  { key: "manage_companies",  label: "Manage companies",          allowed: ["admin"] },
  { key: "manage_org",        label: "Manage organisation settings", allowed: ["admin"] },
  { key: "write_assets",      label: "Create / edit assets",      allowed: ["admin", "it"] },
  { key: "manage_locations",  label: "Manage locations",          allowed: ["admin", "it"] },
  { key: "manage_vendors",    label: "Manage vendors",            allowed: ["admin", "it"] },
  { key: "manage_categories", label: "Manage asset categories",   allowed: ["admin", "it"] },
  { key: "manage_licenses",   label: "Manage licenses",           allowed: ["admin", "it"] },
  { key: "manage_asset_types",label: "Manage asset types",        allowed: ["admin", "it"] },
  { key: "edit_employees",    label: "Create / edit employees",   allowed: ["admin", "it", "hr"] },
  { key: "manage_departments",label: "Manage departments",        allowed: ["admin", "hr"] },
  { key: "manage_designations", label: "Manage designations",     allowed: ["admin", "hr"] },
  { key: "view_data",         label: "View data (read-only)",     allowed: ["admin", "it", "hr", "viewer"] },
];

function roleBadgeColor(role: AppRole) {
  switch (role) {
    case "admin":  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300";
    case "it":     return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300";
    case "hr":     return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300";
    case "viewer": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
  }
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: string;
  roles: AppRole[];
}

function useUsersWithRoles() {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profs, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, approval_status, email").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole[]>();
      (roleRows ?? []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        roleMap.set(r.user_id, arr);
      });

      return (profs ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        approval_status: p.approval_status,
        roles: roleMap.get(p.id) ?? [],
      }));
    },
  });
}

export default function RulesPage() {
  const { isAdmin, user: me } = useAuth();
  const qc = useQueryClient();
  const { data: users = [], isLoading, error } = useUsersWithRoles();
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  if (!isAdmin) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" /> Admin access required
          </CardTitle>
          <CardDescription>You need the admin role to view or change permission rules.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function toggleRole(userId: string, role: AppRole, has: boolean) {
    try {
      if (has) {
        const { error: e } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (e) throw e;
        toast({ title: "Role removed", description: `${role} removed` });
      } else {
        const { error: e } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (e) throw e;
        toast({ title: "Role granted", description: `${role} granted` });
      }
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (err: any) {
      toast({ title: "Failed", description: parseDbError(err), variant: "destructive" });
    }
  }

  async function setApproval(userId: string, status: "approved" | "rejected" | "pending") {
    try {
      const { error: e } = await supabase
        .from("profiles")
        .update({ approval_status: status, approved_by: me?.id, approved_at: new Date().toISOString() })
        .eq("id", userId);
      if (e) throw e;
      toast({ title: "Status updated", description: `Set to ${status}` });
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (err: any) {
      toast({ title: "Failed", description: parseDbError(err), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent" />
          Rules & Permissions
        </h1>
        <p className="text-muted-foreground text-sm">
          Configure who can do what across the system. Admin always has full access.
        </p>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix"><KeyRound className="h-4 w-4 mr-2" />Capability Matrix</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Users & Roles</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-2" />Role Reference</TabsTrigger>
        </TabsList>

        {/* ── Capability matrix ─────────────────────────────────────────── */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Capability Matrix</CardTitle>
              <CardDescription>
                Which roles get which capability. Currently read-only — driven by the rules baked into{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/contexts/AuthContext.tsx</code>.
                To change the matrix in production, edit the file and redeploy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[260px]">Capability</TableHead>
                      {ROLES.map(r => (
                        <TableHead key={r} className="text-center capitalize">{r}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CAPABILITIES.map(cap => (
                      <TableRow key={cap.key}>
                        <TableCell className="font-medium">{cap.label}</TableCell>
                        {ROLES.map(r => (
                          <TableCell key={r} className="text-center">
                            {cap.allowed.includes(r) ? (
                              <Check className="h-4 w-4 text-emerald-600 inline" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/30 inline" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Admin bypasses the approval gate — so even a fresh admin account works without
                anyone clicking "approve".
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users tab — assign roles + approve ────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Users & Roles</CardTitle>
                  <CardDescription>Toggle a role on/off, or change approval status.</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name or email"
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <p className="text-sm text-destructive mb-3">{(error as Error).message}</p>
              )}
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No users found.</p>
              ) : (
                <div className="rounded border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        {ROLES.map(r => (
                          <TableHead key={r} className="text-center capitalize">{r}</TableHead>
                        ))}
                        <TableHead className="text-right">Approval</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => {
                        const isMe = u.id === me?.id;
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {u.full_name || u.email || u.id.slice(0, 8)}
                                  {isMe && <Badge variant="secondary" className="ml-2 text-[10px]">you</Badge>}
                                </span>
                                {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {u.approval_status}
                              </Badge>
                            </TableCell>
                            {ROLES.map(r => {
                              const has = u.roles.includes(r);
                              const disabled = isMe && r === "admin";
                              return (
                                <TableCell key={r} className="text-center">
                                  <Checkbox
                                    checked={has}
                                    disabled={disabled}
                                    onCheckedChange={() => !disabled && toggleRole(u.id, r, has)}
                                  />
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {u.approval_status !== "approved" && (
                                  <Button size="sm" variant="outline" onClick={() => setApproval(u.id, "approved")}>
                                    Approve
                                  </Button>
                                )}
                                {u.approval_status !== "rejected" && !isMe && (
                                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setApproval(u.id, "rejected")}>
                                    Reject
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                You cannot remove your own admin role — that's a safety lock.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Role reference ────────────────────────────────────────────── */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map(r => {
              const caps = CAPABILITIES.filter(c => c.allowed.includes(r));
              return (
                <Card key={r}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline" className={`capitalize ${roleBadgeColor(r)}`}>{r}</Badge>
                    </CardTitle>
                    <CardDescription>{ROLE_DESC[r]}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      {caps.length} capabilit{caps.length === 1 ? "y" : "ies"}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {caps.map(c => (
                        <li key={c.key} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {c.label}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
