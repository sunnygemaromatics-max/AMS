import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  KeyRound, Plus, Search, Eye, EyeOff, Copy, ExternalLink, Lock, Loader2,
  Package, Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAllCredentials, type Credential, type CredentialType } from "@/hooks/useCredentials";
import { CredentialDialog } from "@/components/CredentialDialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";

export default function CredentialsPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canManage = roles.includes("admin") || roles.includes("it");

  const { data: creds = [], isLoading } = useAllCredentials();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CredentialType>("all");
  const [scope, setScope] = useState<"all" | "linked" | "standalone">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);

  const typeOptions = useMemo(() => {
    const set = new Set<CredentialType>();
    creds.forEach((c) => set.add(c.credential_type));
    return Array.from(set).sort();
  }, [creds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creds.filter((c) => {
      if (typeFilter !== "all" && c.credential_type !== typeFilter) return false;
      if (scope === "linked" && !c.asset_id) return false;
      if (scope === "standalone" && c.asset_id) return false;
      if (q) {
        const blob = `${c.name} ${c.username ?? ""} ${c.url ?? ""} ${c.notes ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [creds, search, typeFilter, scope]);

  if (!canManage) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-900/30">
          <CardContent className="p-8">
            <EmptyState
              icon={Lock}
              title="Restricted to Admin / IT"
              description="The Credentials vault stores passwords for email accounts, network devices, vendor portals and similar. Only Admin and IT roles can view, add or edit entries. Speak to your administrator if you need access."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, URL or note…" className="pl-9 h-9" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={(v) => setScope(v as any)}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All credentials</SelectItem>
              <SelectItem value="linked">Linked to an asset</SelectItem>
              <SelectItem value="standalone">Standalone (no asset)</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="tsi-gradient text-white hover:opacity-90">
              <Plus className="h-4 w-4 mr-1" /> Add credential
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={creds.length === 0 ? KeyRound : Search}
            title={creds.length === 0 ? "No credentials yet" : "No credentials match these filters"}
            description={creds.length === 0
              ? "Add your first credential — useful for any password your team needs to share securely (email accounts, QNAP, routers, vendor portals)."
              : "Try clearing the filters or widening your search."}
            action={creds.length === 0 && (
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="tsi-gradient text-white hover:opacity-90">
                <Plus className="h-4 w-4 mr-1" /> Add credential
              </Button>
            )}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <CredCard key={c.id} credential={c} onEdit={() => { setEditing(c); setDialogOpen(true); }} onOpenAsset={c.asset_id ? () => navigate(`/assets/${c.asset_id}`) : undefined} />
          ))}
        </ul>
      )}

      <CredentialDialog open={dialogOpen} onOpenChange={setDialogOpen} credential={editing} />
    </div>
  );
}

function Header() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-3xl font-bold tracking-tight">
        <span className="tsi-gradient-text">Credentials</span>
      </h1>
      <p className="text-muted-foreground text-sm mt-1">
        Secure vault for shared passwords — Admin &amp; IT only.
      </p>
    </div>
  );
}

function CredCard({
  credential, onEdit, onOpenAsset,
}: {
  credential: Credential;
  onEdit: () => void;
  onOpenAsset?: () => void;
}) {
  const [reveal, setReveal] = useState(false);

  const copy = async (value: string | null, label: string) => {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); toast({ title: `${label} copied` }); }
    catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  return (
    <li className="rounded-xl border bg-card hover:shadow-md transition-all">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{credential.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px] uppercase">{credential.credential_type.replace(/_/g, " ")}</Badge>
                {credential.asset_id && (
                  <button onClick={onOpenAsset} className="text-[10px] text-muted-foreground hover:text-accent inline-flex items-center gap-0.5">
                    <Package className="h-2.5 w-2.5" /> linked asset
                  </button>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 px-0" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-1.5 text-xs">
          {credential.username && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Username</span>
              <span className="font-mono truncate flex-1">{credential.username}</span>
              <Button variant="ghost" size="sm" onClick={() => copy(credential.username, "Username")} className="h-6 w-6 px-0">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {credential.password && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Password</span>
              <span className="font-mono truncate flex-1">
                {reveal ? credential.password : "•".repeat(Math.min(credential.password.length, 12))}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setReveal((r) => !r)} className="h-6 w-6 px-0" title={reveal ? "Hide" : "Reveal"}>
                {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => copy(credential.password, "Password")} className="h-6 w-6 px-0">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {credential.url && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 shrink-0">URL</span>
              <a href={credential.url} target="_blank" rel="noreferrer" className="font-mono truncate flex-1 hover:text-accent inline-flex items-center gap-1">
                {credential.url} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
          {credential.notes && (
            <p className="text-muted-foreground pt-1 italic line-clamp-2">{credential.notes}</p>
          )}
        </div>
      </div>
    </li>
  );
}
