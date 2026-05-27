import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, KeyRound, Eye, EyeOff, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseDbError } from "@/lib/supabase-error";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateCredential, useUpdateCredential, useDeleteCredential,
  type Credential, type CredentialType,
} from "@/hooks/useCredentials";

const TYPES: { value: CredentialType; label: string }[] = [
  { value: "email", label: "Email Account" },
  { value: "qnap", label: "QNAP / NAS" },
  { value: "router", label: "Router" },
  { value: "firewall", label: "Firewall" },
  { value: "switch", label: "Network Switch" },
  { value: "access_point", label: "Access Point / WiFi" },
  { value: "wifi", label: "WiFi Network" },
  { value: "server", label: "Server" },
  { value: "database", label: "Database" },
  { value: "cloud", label: "Cloud Console" },
  { value: "vpn", label: "VPN" },
  { value: "rdp", label: "RDP / Remote Desktop" },
  { value: "domain", label: "Domain Registrar" },
  { value: "ssl", label: "SSL Certificate" },
  { value: "ftp", label: "FTP / SFTP" },
  { value: "vendor_portal", label: "Vendor Portal" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: Credential | null;
  defaultAssetId?: string | null;
}

const EMPTY = {
  name: "", credential_type: "other" as CredentialType,
  username: "", password: "", url: "", notes: "",
};

function generatePassword(len = 16): string {
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => charset[n % charset.length]).join("");
}

export function CredentialDialog({ open, onOpenChange, credential, defaultAssetId }: Props) {
  const isEdit = !!credential;
  const { profile, user } = useAuth();
  const create = useCreateCredential();
  const update = useUpdateCredential();
  const del    = useDeleteCredential();
  const busy   = create.isPending || update.isPending || del.isPending;

  const [form, setForm] = useState(EMPTY);
  const [reveal, setReveal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open && credential) {
      setForm({
        name: credential.name,
        credential_type: credential.credential_type,
        username: credential.username ?? "",
        password: credential.password ?? "",
        url: credential.url ?? "",
        notes: credential.notes ?? "",
      });
    } else if (open) {
      setForm(EMPTY);
    }
    setReveal(false);
    setConfirmDelete(false);
  }, [open, credential]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.credential_type) { toast({ title: "Type is required", variant: "destructive" }); return; }

    const payload = {
      name: form.name.trim(),
      credential_type: form.credential_type,
      username: form.username.trim() || null,
      password: form.password || null,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
      asset_id: credential?.asset_id ?? defaultAssetId ?? null,
      company_id: credential?.company_id ?? null,
      location_id: credential?.location_id ?? null,
      department_id: credential?.department_id ?? null,
      created_by: user?.id ?? null,
      created_by_name: profile?.full_name ?? user?.email ?? null,
    };

    try {
      if (isEdit && credential) {
        await update.mutateAsync({ id: credential.id, ...payload });
        toast({ title: "Credential updated" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Credential added" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not save", description: parseDbError(err), variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!credential) return;
    try {
      await del.mutateAsync(credential.id);
      toast({ title: "Credential deleted" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not delete", description: parseDbError(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg tsi-gradient flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-white" />
            </div>
            {isEdit ? "Edit credential" : "Add credential"}
          </DialogTitle>
          <DialogDescription>
            Credentials are visible only to Admin and IT roles. Stored as-is at rest; protected by row-level security.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cname">Name *</Label>
              <Input id="cname" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. QNAP admin, Mumbai Office WiFi" maxLength={200} autoFocus required />
            </div>

            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.credential_type} onValueChange={(v) => setForm((f) => ({ ...f, credential_type: v as CredentialType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="curl">URL / IP</Label>
              <Input id="curl" type="url" value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://… or 192.168.1.1" maxLength={500} />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cuser">Username</Label>
              <Input id="cuser" value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                maxLength={200} />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cpw" className="flex items-center justify-between">
                <span>Password</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setReveal((r) => !r)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {reveal ? "hide" : "reveal"}
                  </button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <Wand2 className="h-3 w-3" /> generate
                  </button>
                </div>
              </Label>
              <Input id="cpw" type={reveal ? "text" : "password"} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="font-mono" maxLength={500} />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cnotes">Notes</Label>
              <Textarea id="cnotes" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Two-factor recovery, security questions, where the backup token lives…"
                rows={3} maxLength={2000} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:justify-between">
            {isEdit ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
                    {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Confirm delete
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive">
                  Delete
                </Button>
              )
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy} className="tsi-gradient text-white hover:opacity-90">
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Save changes" : "Add credential"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
