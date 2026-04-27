import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";

interface UserRow {
  id: string;
  full_name: string | null;
  approval_status: "pending" | "approved" | "rejected";
  employee_id: string | null;
  created_at: string;
  email?: string;
  roles: AppRole[];
}

const ROLES: AppRole[] = ["admin", "it", "hr", "viewer"];

export default function UserManagementPage() {
  const { isAdmin, user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roleRows }, { data: emps }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, approval_status, employee_id, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("employees").select("id, name, employee_code").eq("is_active", true).order("name"),
    ]);
    const roleMap = new Map<string, AppRole[]>();
    (roleRows || []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    setUsers((profs || []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) || [] })));
    setEmployees(emps || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) return <div className="p-6">Admin access required.</div>;

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({
      approval_status: status, approved_by: me?.id, approved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`User ${status}`); load(); }
  };

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) toast.error(error.message); else { toast.success(`Removed ${role}`); load(); }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role, assigned_by: me?.id });
      if (error) toast.error(error.message); else { toast.success(`Added ${role}`); load(); }
    }
  };

  const linkEmployee = async (userId: string, employeeId: string) => {
    const { error } = await supabase.from("profiles").update({ employee_id: employeeId === "none" ? null : employeeId }).eq("id", userId);
    if (error) toast.error(error.message); else { toast.success("Employee linked"); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Shield className="h-7 w-7" /> User Management</h1>
        <p className="text-muted-foreground">Approve users, assign roles, link to employee records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users ({users.length})</CardTitle>
          <CardDescription>Pending users cannot access any data until approved.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Linked employee</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}…</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.approval_status === "approved" ? "default" : u.approval_status === "rejected" ? "destructive" : "secondary"}>
                          {u.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ROLES.map((r) => {
                            const has = u.roles.includes(r);
                            return (
                              <Badge key={r} variant={has ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleRole(u.id, r, has)}>
                                {r}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={u.employee_id || "none"} onValueChange={(v) => linkEmployee(u.id, v)}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {u.approval_status !== "approved" && (
                          <Button size="sm" onClick={() => setStatus(u.id, "approved")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                          </Button>
                        )}
                        {u.approval_status !== "rejected" && (
                          <Button size="sm" variant="destructive" onClick={() => setStatus(u.id, "rejected")}>
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
