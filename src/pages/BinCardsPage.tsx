import { useState } from "react";
import { useAssets, useAssetTransactions } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Printer, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { exportBinCard } from "@/lib/pdf";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function BinCardsPage() {
  const { data: assets, isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  // Must be above any early return — React rules of hooks
  const { data: selectedTx } = useAssetTransactions(selected ?? undefined);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const filtered = (assets || []).filter((a: any) => {
    const q = search.toLowerCase();
    return !q || a.sap_code?.toLowerCase().includes(q) || a.employees?.name?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q);
  });

  const selectedAsset = selected ? (assets || []).find((a: any) => a.id === selected) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bin Cards</h1>
        <p className="text-muted-foreground text-sm">Digital bin card system — select an asset to view</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filtered.map((asset: any) => (
              <button key={asset.id} onClick={() => setSelected(asset.id)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selected === asset.id ? 'bg-accent/10 border border-accent/30' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-xs text-accent">{asset.sap_code}</span>
                  <span className="text-xs text-muted-foreground">#{asset.bin_card_no}</span>
                </div>
                <p className="text-sm mt-0.5">{asset.name}</p>
                <p className="text-xs text-muted-foreground">{asset.employees?.name || 'Unassigned'}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No assets found</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedAsset ? (
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Bin Card #{(selectedAsset as any).bin_card_no}</CardTitle>
                    <p className="text-sm text-muted-foreground">{(selectedAsset as any).sap_code}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportBinCard(selectedAsset, selectedTx || [])}>
                  <Printer className="h-4 w-4 mr-1" /> Download PDF
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <BinField label="SAP Code" value={(selectedAsset as any).sap_code} />
                  <BinField label="Bin Card No." value={String((selectedAsset as any).bin_card_no)} />
                  <div className="col-span-2"><BinField label="System (Asset) Info" value={(selectedAsset as any).system_info || '—'} /></div>
                  <BinField label="S.No. (TAG)" value={(selectedAsset as any).serial_number} />
                  <BinField label="Vendor" value={(selectedAsset as any).vendors?.name} />
                  <BinField label="Purchase Bill No." value={(selectedAsset as any).purchase_bill_no} />
                  <BinField label="Purchase Date" value={(selectedAsset as any).purchase_date} />
                  <BinField label="Location" value={(selectedAsset as any).locations?.name} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <StatusBadge status={statusLabel((selectedAsset as any).status)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3">Current Assignment</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Emp Code</th>
                        <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Employee</th>
                        <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Department</th>
                        <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedAsset as any).employees ? (
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs">{(selectedAsset as any).employees.employee_code}</td>
                          <td className="py-2 px-2">{(selectedAsset as any).employees.name}</td>
                          <td className="py-2 px-2 text-muted-foreground">{(selectedAsset as any).employees.department}</td>
                          <td className="py-2 px-2"><StatusBadge status={statusLabel((selectedAsset as any).status)} /></td>
                        </tr>
                      ) : (
                        <tr><td colSpan={4} className="py-4 text-center text-muted-foreground text-xs">No current assignment</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an asset to view its bin card</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BinField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium whitespace-pre-wrap">{value || '—'}</p>
    </div>
  );
}
