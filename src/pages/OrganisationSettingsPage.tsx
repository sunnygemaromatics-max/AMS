import { useEffect, useRef, useState } from "react";
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { setPdfBranding } from "@/lib/pdf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Image as ImageIcon, Mail, Loader2, Upload, X, Save, Bell } from "lucide-react";
import { toast } from "sonner";

export default function OrganisationSettingsPage() {
  const { isAdmin } = useAuth();
  const { data: settings, isLoading } = useOrgSettings();
  const update = useUpdateOrgSettings();

  const [form, setForm] = useState<any>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const readOnly = !isAdmin;

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: form.id,
        org_name: form.org_name,
        org_address: form.org_address || null,
        org_phone: form.org_phone || null,
        org_email: form.org_email || null,
        org_website: form.org_website || null,
        primary_color: form.primary_color || "#1e293b",
        pdf_footer_text: form.pdf_footer_text || null,
        email_alerts_enabled: form.email_alerts_enabled,
        email_alert_recipients: form.email_alert_recipients || [],
        email_alert_days_before: Number(form.email_alert_days_before) || 10,
        email_alert_time: form.email_alert_time || "09:00:00",
      });
      await setPdfBranding(form);
      toast.success("Organisation settings saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      const newUrl = pub.publicUrl;
      await update.mutateAsync({ id: form.id, logo_url: newUrl });
      setForm((f: any) => ({ ...f, logo_url: newUrl }));
      await setPdfBranding({ ...form, logo_url: newUrl });
      toast.success("Logo uploaded");
    } catch (e: any) {
      toast.error(e.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      await update.mutateAsync({ id: form.id, logo_url: null });
      setForm((f: any) => ({ ...f, logo_url: null }));
      await setPdfBranding({ ...form, logo_url: null });
      toast.success("Logo removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove logo");
    }
  };

  const addRecipient = () => {
    const email = recipientInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if ((form.email_alert_recipients || []).includes(email)) return;
    setForm((f: any) => ({
      ...f,
      email_alert_recipients: [...(f.email_alert_recipients || []), email],
    }));
    setRecipientInput("");
  };

  const removeRecipient = (email: string) => {
    setForm((f: any) => ({
      ...f,
      email_alert_recipients: (f.email_alert_recipients || []).filter((e: string) => e !== email),
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-accent" /> Organisation
          </h1>
          <p className="text-muted-foreground text-sm">
            Branding shown on PDFs and the email-alerts schedule for expiring assets &amp; licenses.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save changes
          </Button>
        )}
      </div>

      {readOnly && (
        <Card className="border-amber-300/60 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3 text-xs text-amber-800 dark:text-amber-300">
            Read-only view — only Admin users can edit organisation settings.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding"><ImageIcon className="h-4 w-4 mr-1" /> Branding</TabsTrigger>
          <TabsTrigger value="alerts"><Mail className="h-4 w-4 mr-1" /> Email Alerts</TabsTrigger>
        </TabsList>

        {/* BRANDING */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Identity</CardTitle>
              <CardDescription>Used on every PDF report header &amp; footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Organisation Name *</Label>
                  <Input
                    value={form.org_name || ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, org_name: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Primary Color (hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.primary_color || "#1e293b"}
                      onChange={(e) => setForm((f: any) => ({ ...f, primary_color: e.target.value }))}
                      disabled={readOnly}
                    />
                    <div
                      className="h-10 w-10 rounded border shrink-0"
                      style={{ backgroundColor: form.primary_color || "#1e293b" }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.org_phone || ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, org_phone: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.org_email || ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, org_email: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Website</Label>
                  <Input
                    value={form.org_website || ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, org_website: e.target.value }))}
                    placeholder="https://example.com"
                    disabled={readOnly}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    rows={2}
                    value={form.org_address || ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, org_address: e.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>PDF Footer Text</Label>
                  <Input
                    value={form.pdf_footer_text || ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, pdf_footer_text: e.target.value }))}
                    placeholder="CONFIDENTIAL — Internal use only"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo</CardTitle>
              <CardDescription>PNG / JPG, square preferred, under 2 MB. Appears in PDF headers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div
                  className="h-24 w-24 rounded-lg border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0"
                  style={{ backgroundColor: form.primary_color || "#1e293b" }}
                >
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="logo" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-10 w-10 text-white/60" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={readOnly || uploading}
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                      {form.logo_url ? "Replace" : "Upload"} logo
                    </Button>
                    {form.logo_url && (
                      <Button variant="ghost" size="sm" onClick={removeLogo} disabled={readOnly}>
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Saved automatically when uploaded.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" /> Daily expiry email alerts
              </CardTitle>
              <CardDescription>
                Configure here now — actual email delivery requires a verified sender domain (set up later under Email infrastructure).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Enable daily alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Sends a summary of warranties &amp; licenses expiring soon.
                  </p>
                </div>
                <Switch
                  checked={!!form.email_alerts_enabled}
                  onCheckedChange={(v) => setForm((f: any) => ({ ...f, email_alerts_enabled: v }))}
                  disabled={readOnly}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Days before expiry</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={form.email_alert_days_before ?? 10}
                    onChange={(e) =>
                      setForm((f: any) => ({ ...f, email_alert_days_before: parseInt(e.target.value) || 10 }))
                    }
                    disabled={readOnly}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Items expiring within this window will be included in the daily email.
                  </p>
                </div>
                <div>
                  <Label>Send time (UTC)</Label>
                  <Input
                    type="time"
                    value={(form.email_alert_time || "09:00:00").slice(0, 5)}
                    onChange={(e) =>
                      setForm((f: any) => ({ ...f, email_alert_time: `${e.target.value}:00` }))
                    }
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div>
                <Label>Recipients</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                    placeholder="admin@yourcompany.com"
                    disabled={readOnly}
                  />
                  <Button variant="outline" onClick={addRecipient} disabled={readOnly}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(form.email_alert_recipients || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recipients added yet.</p>
                  ) : (
                    (form.email_alert_recipients || []).map((email: string) => (
                      <Badge key={email} variant="secondary" className="gap-1.5 pr-1">
                        {email}
                        {!readOnly && (
                          <button
                            onClick={() => removeRecipient(email)}
                            className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                            aria-label={`remove ${email}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">📬 What happens next?</p>
                <p>
                  Settings are saved now. To start delivering emails, ask the Admin to set up the email sender
                  domain — once verified, the daily cron will pick up these settings automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
