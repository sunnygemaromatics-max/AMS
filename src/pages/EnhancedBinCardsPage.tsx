import { useState } from "react";
import { useAssets, useAssetTransactions } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Printer, 
  CreditCard, 
  Loader2, 
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Package,
  User,
  Calendar,
  FileText
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { exportBinCard } from "@/lib/pdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Mock bin card entries - will be replaced with real data from database
interface BinCardEntry {
  id: string;
  date: string;
  type: 'receipt' | 'issue' | 'adjustment';
  reference: string;
  quantity: number;
  balance: number;
  remarks: string;
  user: string;
}

export default function EnhancedBinCardsPage() {
  const { data: assets, isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  
  const { data: selectedTx } = useAssetTransactions(selected ?? undefined);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const filtered = (assets || []).filter((a: any) => {
    const q = search.toLowerCase();
    return !q || 
      a.sap_code?.toLowerCase().includes(q) || 
      a.employees?.name?.toLowerCase().includes(q) || 
      a.name?.toLowerCase().includes(q);
  });

  const selectedAsset = selected ? (assets || []).find((a: any) => a.id === selected) : null;

  // Mock data for bin card entries - replace with real queries
  const mockBinEntries: BinCardEntry[] = [
    {
      id: "1",
      date: selectedAsset?.purchase_date || "2024-01-15",
      type: "receipt",
      reference: `PO-${selectedAsset?.sap_code || "001"}`,
      quantity: 1,
      balance: 1,
      remarks: "Initial purchase",
      user: "Admin"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-accent" />
            Bin Cards
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete asset transaction history and balance tracking
          </p>
        </div>
        {selectedAsset && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddEntry(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportBinCard(selectedAsset, selectedTx || [])}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Asset List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search assets..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
          
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {filtered.length} assets found
            </p>
            <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
              {filtered.map((asset: any) => (
                <button 
                  key={asset.id} 
                  onClick={() => setSelected(asset.id)} 
                  className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all ${
                    selected === asset.id 
                      ? 'bg-accent text-white shadow-md' 
                      : 'bg-white hover:bg-accent/10 border border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-semibold text-xs ${selected === asset.id ? 'text-white/90' : 'text-accent'}`}>
                      {asset.sap_code}
                    </span>
                    <Badge variant={selected === asset.id ? "secondary" : "outline"} className="text-xs">
                      #{asset.bin_card_no}
                    </Badge>
                  </div>
                  <p className={`font-medium ${selected === asset.id ? 'text-white' : 'text-foreground'}`}>
                    {asset.name}
                  </p>
                  <p className={`text-xs ${selected === asset.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {asset.employees?.name || 'Unassigned'} • {asset.locations?.name || 'No Location'}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assets found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Content - Bin Card Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAsset ? (
            <>
              {/* Asset Header Card */}
              <Card className="border-2 border-accent/20">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg">
                        <Package className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl">Bin Card #{selectedAsset.bin_card_no}</CardTitle>
                          <StatusBadge status={statusLabel(selectedAsset.status)} />
                        </div>
                        <p className="text-lg font-medium text-foreground">{selectedAsset.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedAsset.sap_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Current Balance</p>
                      <p className="text-3xl font-bold text-accent">1</p>
                      <p className="text-xs text-muted-foreground">Unit(s) in stock</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Asset Information Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard icon={FileText} label="Purchase Bill" value={selectedAsset.purchase_bill_no || '—'} />
                <InfoCard icon={Calendar} label="Purchase Date" value={selectedAsset.purchase_date || '—'} />
                <InfoCard icon={User} label="Assigned To" value={selectedAsset.employees?.name || 'Unassigned'} />
                <InfoCard icon={Package} label="Location" value={selectedAsset.locations?.name || '—'} />
              </div>

              {/* Bin Card Transaction History */}
              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-accent" />
                    <CardTitle className="text-lg">Transaction History</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <ArrowDownLeft className="h-3 w-3 mr-1" />
                      Receipts: 1
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      Issues: 0
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Traditional Bin Card Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Date</th>
                          <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Type</th>
                          <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Reference</th>
                          <th className="text-center py-3 px-3 font-semibold text-xs uppercase tracking-wider">Receipt</th>
                          <th className="text-center py-3 px-3 font-semibold text-xs uppercase tracking-wider">Issue</th>
                          <th className="text-center py-3 px-3 font-semibold text-xs uppercase tracking-wider">Balance</th>
                          <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Remarks</th>
                          <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* Opening Balance Row */}
                        <tr className="bg-yellow-50/50">
                          <td className="py-3 px-3 font-mono text-xs">{selectedAsset.purchase_date || '—'}</td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              Opening
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">—</td>
                          <td className="py-3 px-3 text-center">—</td>
                          <td className="py-3 px-3 text-center">—</td>
                          <td className="py-3 px-3 text-center font-bold text-accent">0</td>
                          <td className="py-3 px-3 text-muted-foreground">Opening balance</td>
                          <td className="py-3 px-3 text-xs">System</td>
                        </tr>
                        
                        {/* Transaction Rows */}
                        {mockBinEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 font-mono text-xs">{entry.date}</td>
                            <td className="py-3 px-3">
                              {entry.type === 'receipt' ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <ArrowDownLeft className="h-3 w-3 mr-1" />
                                  Receipt
                                </Badge>
                              ) : entry.type === 'issue' ? (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  Issue
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Adjustment</Badge>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs">{entry.reference}</td>
                            <td className="py-3 px-3 text-center font-medium text-green-600">
                              {entry.type === 'receipt' ? entry.quantity : '—'}
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-blue-600">
                              {entry.type === 'issue' ? entry.quantity : '—'}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-accent">{entry.balance}</td>
                            <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">{entry.remarks}</td>
                            <td className="py-3 px-3 text-xs">{entry.user}</td>
                          </tr>
                        ))}
                        
                        {/* Current Balance Row */}
                        <tr className="bg-accent/5 font-medium">
                          <td className="py-3 px-3 font-mono text-xs">{new Date().toISOString().split('T')[0]}</td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="bg-accent/20 text-accent border-accent">
                              Current
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">—</td>
                          <td className="py-3 px-3 text-center">—</td>
                          <td className="py-3 px-3 text-center">—</td>
                          <td className="py-3 px-3 text-center font-bold text-accent text-lg">1</td>
                          <td className="py-3 px-3 text-muted-foreground">Current balance</td>
                          <td className="py-3 px-3 text-xs">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Receipts</p>
                      <p className="text-2xl font-bold text-green-600">1</p>
                    </div>
                    <div className="text-center border-x">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Issues</p>
                      <p className="text-2xl font-bold text-blue-600">0</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Balance</p>
                      <p className="text-2xl font-bold text-accent">1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-200px)] text-muted-foreground">
              <div className="text-center">
                <div className="h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-10 w-10 text-accent/50" />
                </div>
                <p className="text-lg font-medium mb-1">Select an Asset</p>
                <p className="text-sm text-muted-foreground">Choose an asset from the list to view its bin card</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bin Card Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt (In)</SelectItem>
                  <SelectItem value="issue">Issue (Out)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Number</label>
              <Input placeholder="e.g., PO-2024-001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input type="number" defaultValue={1} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Input placeholder="Enter remarks..." />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancel</Button>
              <Button onClick={() => setShowAddEntry(false)}>Add Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for info cards
function InfoCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <Card className="bg-muted/30 border-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-accent" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
        <p className="font-medium text-sm truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
