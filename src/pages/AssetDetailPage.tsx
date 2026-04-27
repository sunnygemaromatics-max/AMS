import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAsset, useAssetTransactions } from "@/hooks/useSupabaseData";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Printer, CreditCard, History, FileText, Loader2, Download, UserCheck, ArrowRightLeft, UserX } from "lucide-react";
import { exportBinCard } from "@/lib/pdf";
import { AllocationDialog } from "@/components/AllocationDialog";
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
