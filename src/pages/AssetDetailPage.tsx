import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAsset, useAssetTransactions, useSubAssets } from "@/hooks/useSupabaseData";
import { useAssetCredentials, useAssetCredentialCount } from "@/hooks/useCredentials";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Printer, CreditCard, History, FileText, Loader2, Download, UserCheck, ArrowRightLeft, UserX, KeyRound, Plus, Eye, EyeOff, Lock, ExternalLink, ChevronRight } from "lucide-react";
import { exportBinCard } from "@/lib/pdf";
import { AllocationDialog } from "@/components/AllocationDialog";
import { CredentialDialog } from "@/components/CredentialDialog";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "allocation" | "return" | "transfer";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const txLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-sm">{value || '—'}</p>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id || '');
  const { data: transactions } = useAssetTransactions(id);
  const { canWrite } = useAuth();
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocMode, setAllocMode] = useState<Mode>("allocation");
  const openDialog = (mode: Mode) => { setAllocMode(mode); setAllocOpen(true); };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!asset) return <div className="text-center py-20 text-muted-foreground">Asset not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-xl font-bold">{asset.sap_code} — {asset.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{statusLabel(asset.asset_subtype || 'other')}</Badge>
                <StatusBadge status={statusLabel(asset.status)} />
                <span className="text-xs text-muted-foreground">Bin Card #{asset.bin_card_no}</span>
              </div>
            </div>
          </div>
        </div>
        {canWrite && asset.status === 'available' && (
          <Button size="sm" onClick={() => openDialog("allocation")}>
            <UserCheck className="h-4 w-4 mr-1" /> Allocate
          </Button>
        )}
        {canWrite && asset.status === 'allocated' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => openDialog("transfer")}>
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("return")}>
              <UserX className="h-4 w-4 mr-1" /> Return
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => exportBinCard(asset, transactions || [])}>
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
      </div>

      <AllocationDialog asset={asset} open={allocOpen} onOpenChange={setAllocOpen} defaultMode={allocMode} />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details"><FileText className="h-4 w-4 mr-1" /> Details</TabsTrigger>
          <TabsTrigger value="subassets"><Package className="h-4 w-4 mr-1" /> Sub-assets</TabsTrigger>
          <TabsTrigger value="credentials"><KeyRound className="h-4 w-4 mr-1" /> Credentials</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Transaction History</TabsTrigger>
          <TabsTrigger value="bincard"><CreditCard className="h-4 w-4 mr-1" /> Bin Card</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Identification</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Detail label="SAP Code" value={asset.sap_code} />
                <Detail label="Bin Card No." value={String(asset.bin_card_no)} />
                <Detail label="Asset Type" value={statusLabel(asset.asset_subtype || 'other')} />
                <Detail label="Category" value={asset.categories?.name} />
                <Detail label="Serial Number" value={asset.serial_number} />
                <Detail label="Brand / Model" value={[asset.brand, asset.model].filter(Boolean).join(' ') || '—'} />
                {asset.imei && <Detail label="IMEI 1" value={asset.imei} />}
                {asset.imei2 && <Detail label="IMEI 2" value={asset.imei2} />}
                {asset.mobile_number && <Detail label="Mobile Number" value={asset.mobile_number} />}
                {asset.sim_provider && <Detail label="SIM Provider" value={asset.sim_provider} />}
                {asset.license_key && <Detail label="License Key" value={asset.license_key} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Assignment & Location</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Detail label="Status" value={statusLabel(asset.status)} />
                <Detail label="Location" value={asset.locations?.name} />
                <Detail label="Assigned To" value={asset.employees?.name} />
                <Detail label="Employee Code" value={asset.employees?.employee_code} />
                <Detail label="Department" value={asset.employees?.department || asset.departments?.name} />
                <Detail label="Company" value={undefined} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Purchase & Financial</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Detail label="Vendor" value={asset.vendors?.name} />
                <Detail label="Purchase Date" value={asset.purchase_date} />
                <Detail label="Purchase Cost" value={asset.purchase_cost ? `₹${Number(asset.purchase_cost).toLocaleString()}` : '—'} />
                <Detail label="Invoice No." value={asset.purchase_bill_no} />
                <Detail label="Depreciation Rate" value={asset.depreciation_rate ? `${asset.depreciation_rate}%` : '—'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Warranty & AMC</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Detail label="Warranty Start" value={asset.warranty_start} />
                <Detail label="Warranty End" value={asset.warranty_end} />
                <Detail label="AMC Start" value={asset.amc_start} />
                <Detail label="AMC End" value={asset.amc_end} />
                <Detail label="AMC Vendor" value={asset.amc_vendor} />
              </CardContent>
            </Card>
          </div>

          {asset.system_info && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">System Info / Specifications</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted/50 rounded-lg p-4 whitespace-pre-wrap font-mono">{asset.system_info}</pre>
                {asset.specifications && <pre className="text-sm bg-muted/50 rounded-lg p-4 mt-2 whitespace-pre-wrap font-mono">{asset.specifications}</pre>}
              </CardContent>
            </Card>
          )}

          {asset.notes && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{asset.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subassets" className="mt-4">
          <SubAssetsSection parentAssetId={asset.id} parentName={asset.name} />
        </TabsContent>

        <TabsContent value="credentials" className="mt-4">
          <CredentialsSection assetId={asset.id} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Transaction History</CardTitle></CardHeader>
            <CardContent>
              {(transactions || []).length > 0 ? (
                <div className="space-y-3">
                  {(transactions || []).map((tx: any) => (
                    <div key={tx.id} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <History className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{txLabel(tx.transaction_type)}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {tx.employees?.name && <p className="text-sm mt-1">To: {tx.employees.name}</p>}
                        {tx.locations?.name && <p className="text-xs text-muted-foreground">Location: {tx.locations.name}</p>}
                        {tx.notes && <p className="text-xs text-muted-foreground mt-1">{tx.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No transaction history yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bincard" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Bin Card #{asset.bin_card_no}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportBinCard(asset, transactions || [])}>
                <Printer className="h-4 w-4 mr-1" /> Download PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="SAP Code" value={asset.sap_code} />
                <Detail label="Bin Card No." value={String(asset.bin_card_no)} />
                <div className="col-span-2"><Detail label="System (Asset) Info" value={asset.system_info || '—'} /></div>
                <Detail label="S.No. (TAG)" value={asset.serial_number} />
                <Detail label="Vendor" value={asset.vendors?.name} />
                <Detail label="Purchase Bill No." value={asset.purchase_bill_no} />
                <Detail label="Purchase Date" value={asset.purchase_date} />
                <Detail label="Location" value={asset.locations?.name} />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={statusLabel(asset.status)} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Assignment Ledger</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground">Date</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground">Type</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground">Employee</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground">Location</th>
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(transactions || []).map((tx: any) => (
                      <tr key={tx.id} className="border-b border-border/50">
                        <td className="py-2 px-2 text-xs">{new Date(tx.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{txLabel(tx.transaction_type)}</Badge></td>
                        <td className="py-2 px-2 text-xs">{tx.employees?.name || '—'}</td>
                        <td className="py-2 px-2 text-xs">{tx.locations?.name || '—'}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{tx.notes || '—'}</td>
                      </tr>
                    ))}
                    {(transactions || []).length === 0 && (
                      <tr><td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">No entries</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-assets section ─────────────────────────────────────────────────────
function SubAssetsSection({ parentAssetId, parentName }: { parentAssetId: string; parentName: string }) {
  const navigate = useNavigate();
  const { data: subs = [], isLoading } = useSubAssets(parentAssetId);
  const { canWrite } = useAuth();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm">Sub-assets of {parentName}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Components, drives, modules or accessories that belong to this asset.
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => navigate(`/assets?parent=${parentAssetId}`)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add sub-asset
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No sub-assets yet. Use the Add Sub-asset button to attach components to this asset.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {(subs as any[]).map((s) => (
              <li
                key={s.id}
                onClick={() => navigate(`/assets/${s.id}`)}
                className="py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 -mx-3 px-3 rounded-md transition-colors"
              >
                <Package className="h-4 w-4 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.sap_code} · Bin #{s.bin_card_no}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{(s.asset_subtype || 'other').replace(/_/g, ' ')}</Badge>
                <StatusBadge status={s.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Credentials section (admin/IT only — RLS-gated) ────────────────────────
function CredentialsSection({ assetId }: { assetId: string }) {
  const { roles } = useAuth();
  const canViewCredentials = roles.includes("admin") || roles.includes("it");
  const { data: creds = [], isLoading } = useAssetCredentials(canViewCredentials ? assetId : null);
  const { data: count = 0 } = useAssetCredentialCount(assetId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  if (!canViewCredentials) {
    return (
      <Card className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600" /> Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {count > 0
              ? <>This asset has <strong>{count}</strong> stored credential{count === 1 ? "" : "s"}. Only Admin and IT roles can view or edit passwords.</>
              : <>No credentials stored on this asset. Only Admin and IT roles can manage credentials.</>}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" /> Credentials
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Stored passwords for this asset (Admin / IT only).
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add credential
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
          ) : creds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No credentials stored yet.</p>
          ) : (
            <ul className="space-y-2">
              {creds.map((c) => (
                <CredentialRow key={c.id} credential={c} onEdit={() => { setEditing(c); setDialogOpen(true); }} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        credential={editing}
        defaultAssetId={assetId}
      />
    </>
  );
}

function CredentialRow({ credential, onEdit }: { credential: any; onEdit: () => void }) {
  const [reveal, setReveal] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <KeyRound className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{credential.name}</p>
          <Badge variant="outline" className="text-[10px] uppercase">{credential.credential_type}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {credential.username && <span className="font-mono">{credential.username}</span>}
          {credential.password && (
            <span className="font-mono">
              {reveal ? credential.password : "•".repeat(Math.min(credential.password.length, 10))}
            </span>
          )}
          {credential.url && (
            <a href={credential.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
              <ExternalLink className="h-3 w-3" /> link
            </a>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setReveal((r) => !r)} title={reveal ? "Hide" : "Reveal"}>
        {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
    </li>
  );
}
