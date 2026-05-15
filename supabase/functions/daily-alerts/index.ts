// ============================================================
// Daily Alert Digest — Supabase Edge Function
//
// Sends a single HTML email per org listing everything expiring in the
// configured window (org_settings.email_alert_days_before).
//
// Aggregates across:
//   - assets.warranty_end
//   - assets.amc_end
//   - licenses.validity_end
//   - custom_reminders.expiry_date (skipping acknowledged / snoozed)
//
// SETUP
//   1. supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
//   2. supabase secrets set ALERT_FROM_EMAIL="alerts@yourdomain.com"
//   3. supabase functions deploy daily-alerts
//   4. Schedule daily via pg_cron — see SCHEDULE.sql in the same folder.
//
// WhatsApp:
//   This function is email-only. WhatsApp via Twilio / Meta Business is
//   straightforward to bolt on — call its API in `sendDigest()` alongside Resend.
// ============================================================

// @ts-ignore - Deno standard import map, available at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// Deno provides this at runtime; the directive below silences the local TS check.
// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get: (name: string) => string | undefined } };

interface AlertItem {
  kind: "warranty" | "amc" | "license" | "custom";
  title: string;
  subtitle: string;
  expiry: string;
  daysLeft: number;
  sapCode?: string;
}

interface OrgSettings {
  organisation_id: string | null;
  email_alerts_enabled: boolean;
  email_alert_recipients: string[];
  email_alert_days_before: number;
  org_name: string | null;
}

const today = () => new Date().toISOString().split("T")[0];
const addDaysIso = (d: number) =>
  new Date(Date.now() + d * 86400000).toISOString().split("T")[0];

function daysBetween(iso: string): number {
  const ms = new Date(iso).getTime() - new Date(today()).getTime();
  return Math.ceil(ms / 86400000);
}

function severity(days: number): { rank: number; label: string; color: string } {
  if (days < 0) return { rank: 0, label: "EXPIRED", color: "#dc2626" };
  if (days <= 3) return { rank: 1, label: "URGENT", color: "#ea580c" };
  if (days <= 14) return { rank: 2, label: "SOON", color: "#d97706" };
  return { rank: 3, label: "UPCOMING", color: "#0891b2" };
}

async function fetchAlerts(
  supabase: any,
  orgId: string | null,
  windowDays: number,
): Promise<AlertItem[]> {
  const startWindow = addDaysIso(-7); // include recently expired
  const endWindow = addDaysIso(windowDays);
  const items: AlertItem[] = [];

  // Helper to scope each query by org if multi-tenant is enabled
  const scoped = (q: any) => (orgId ? q.eq("organisation_id", orgId) : q);

  const [assetsRes, licensesRes, remindersRes] = await Promise.all([
    scoped(
      supabase
        .from("assets")
        .select("id, sap_code, name, warranty_end, amc_end, amc_vendor")
        .eq("is_deleted", false)
        .or(`warranty_end.lte.${endWindow},amc_end.lte.${endWindow}`),
    ),
    scoped(
      supabase
        .from("licenses")
        .select("id, license_type, product_name, email_id, validity_end")
        .gte("validity_end", startWindow)
        .lte("validity_end", endWindow),
    ),
    scoped(
      supabase
        .from("custom_reminders")
        .select("id, title, reminder_type, expiry_date, reference_code, acknowledged_at, snoozed_until")
        .is("acknowledged_at", null)
        .lte("expiry_date", endWindow),
    ),
  ]);

  for (const a of assetsRes.data ?? []) {
    if (a.warranty_end && a.warranty_end >= startWindow && a.warranty_end <= endWindow) {
      items.push({
        kind: "warranty",
        title: `Warranty — ${a.sap_code}`,
        subtitle: a.name ?? "",
        expiry: a.warranty_end,
        daysLeft: daysBetween(a.warranty_end),
        sapCode: a.sap_code,
      });
    }
    if (a.amc_end && a.amc_end >= startWindow && a.amc_end <= endWindow) {
      items.push({
        kind: "amc",
        title: `AMC — ${a.sap_code}`,
        subtitle: a.amc_vendor ?? a.name ?? "",
        expiry: a.amc_end,
        daysLeft: daysBetween(a.amc_end),
        sapCode: a.sap_code,
      });
    }
  }

  for (const l of licensesRes.data ?? []) {
    items.push({
      kind: "license",
      title: `License — ${l.license_type}`,
      subtitle: l.product_name ?? l.email_id ?? "",
      expiry: l.validity_end,
      daysLeft: daysBetween(l.validity_end),
    });
  }

  for (const r of remindersRes.data ?? []) {
    if (r.snoozed_until && r.snoozed_until >= today()) continue;
    items.push({
      kind: "custom",
      title: r.title,
      subtitle: `${r.reminder_type}${r.reference_code ? " • " + r.reference_code : ""}`,
      expiry: r.expiry_date,
      daysLeft: daysBetween(r.expiry_date),
    });
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function renderHtml(orgName: string, items: AlertItem[]): string {
  const expired = items.filter(i => i.daysLeft < 0).length;
  const urgent = items.filter(i => i.daysLeft >= 0 && i.daysLeft <= 3).length;
  const soon = items.filter(i => i.daysLeft > 3 && i.daysLeft <= 14).length;
  const upcoming = items.filter(i => i.daysLeft > 14).length;

  const rows = items.map(i => {
    const sev = severity(i.daysLeft);
    const dayLabel = i.daysLeft < 0
      ? `${-i.daysLeft}d overdue`
      : i.daysLeft === 0 ? "Today" : `in ${i.daysLeft}d`;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          <div style="font-weight:600;color:#111827;">${escapeHtml(i.title)}</div>
          <div style="color:#6b7280;font-size:12px;margin-top:2px;">${escapeHtml(i.subtitle)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;white-space:nowrap;">${i.expiry}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
          <span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;background:${sev.color};">
            ${dayLabel}
          </span>
        </td>
      </tr>`;
  }).join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#db2777 50%,#f59e0b 100%);padding:28px 24px;color:#fff;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">${escapeHtml(orgName)}</div>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;">Daily Expiry Digest</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}</p>
    </div>

    <div style="padding:18px 24px;background:#f3f4f6;display:flex;gap:8px;flex-wrap:wrap;">
      ${kpiPill("Expired", expired, "#dc2626")}
      ${kpiPill("Urgent", urgent, "#ea580c")}
      ${kpiPill("Soon", soon, "#d97706")}
      ${kpiPill("Upcoming", upcoming, "#0891b2")}
    </div>

    <div style="padding:0 24px 24px;">
      ${items.length === 0 ? `
        <p style="color:#6b7280;font-size:14px;text-align:center;padding:32px 0;">
          ✅ Nothing is expiring soon. You're all clear.
        </p>` : `
        <table style="width:100%;border-collapse:collapse;margin-top:18px;">
          ${rows}
        </table>`}
    </div>

    <div style="padding:18px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#6b7280;font-size:11px;">
        Sent automatically by your Asset Management System.<br>
        Manage recipients in <strong>Organisation Settings → Email Alerts</strong>.
      </p>
    </div>
  </div>
</body></html>`;
}

function kpiPill(label: string, value: number, color: string): string {
  return `<div style="flex:1;min-width:110px;background:#fff;border-radius:10px;padding:10px 12px;border-left:3px solid ${color};">
    <div style="font-size:18px;font-weight:700;color:#111827;line-height:1;">${value}</div>
    <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;margin-top:4px;">${label}</div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendEmail(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${text}` };
  }
  return { ok: true };
}

// ─── Main handler ──────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
Deno.serve = (Deno as any).serve ?? (() => {});
(Deno as any).serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey   = Deno.env.get("RESEND_API_KEY");
  const fromEmail   = Deno.env.get("ALERT_FROM_EMAIL") ?? "alerts@example.com";

  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
  }
  if (!resendKey) {
    return new Response("Missing RESEND_API_KEY secret", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Fetch every org's email settings. If the org_settings table is single-row
  // (single-tenant deploy), this still works — orgs.length will be 1.
  const { data: settingsRows, error: settingsErr } = await supabase
    .from("org_settings")
    .select("*");

  if (settingsErr) {
    return new Response(`Failed to load org_settings: ${settingsErr.message}`, { status: 500 });
  }

  const results: Array<{ org: string; sent: number; error?: string }> = [];

  for (const s of (settingsRows ?? []) as OrgSettings[]) {
    if (!s.email_alerts_enabled) {
      results.push({ org: s.org_name ?? "—", sent: 0, error: "alerts disabled" });
      continue;
    }
    if (!s.email_alert_recipients?.length) {
      results.push({ org: s.org_name ?? "—", sent: 0, error: "no recipients" });
      continue;
    }

    const items = await fetchAlerts(supabase, s.organisation_id, s.email_alert_days_before ?? 10);

    // Skip orgs with nothing to report (don't spam empty digests)
    if (items.length === 0) {
      results.push({ org: s.org_name ?? "—", sent: 0, error: "nothing expiring" });
      continue;
    }

    const subject = `[${s.org_name ?? "AMS"}] ${items.length} expiring — daily digest`;
    const html = renderHtml(s.org_name ?? "Asset Management", items);
    const send = await sendEmail(resendKey, fromEmail, s.email_alert_recipients, subject, html);

    results.push({
      org: s.org_name ?? "—",
      sent: send.ok ? s.email_alert_recipients.length : 0,
      error: send.error,
    });
  }

  return new Response(JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
