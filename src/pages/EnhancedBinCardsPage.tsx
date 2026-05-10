import { useState, useMemo } from "react";
import { useAssets, useAssetTransactions } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileText,
  Download,
  FileSpreadsheet,
  Eye,
  Filter,
  X,
  ChevronDown,
  MapPin,
  Building2,
  Tag,
  DollarSign,
  Barcode,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  QrCode,
  ArrowRight
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Comprehensive bin card entry interface
interface BinCardEntry {
  id: string;
  entryNo: number;
  date: string;
  time: string;
  type: 'receipt' | 'issue' | 'adjustment' | 'return' | 'transfer' | 'disposal';
  reference: string;
  referenceType: string;
  receiptQty: number;
  issueQty: number;
  balanceQty: number;
  unitCost: number;
  totalValue: number;
  remarks: string;
  user: string;
  userId: string;
  department: string;
  location: string;
  approvedBy: string;
  approvalDate: string;
  documentNo: string;
  vendorName: string;
  grnNo: string;
  poNo: string;
  employeeCode: string;
  employeeName: string;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  warrantyInfo: string;
  attachments: string[];
  tags: string[];
}

export default function EnhancedBinCardsPage() {
  const { data: assets, isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showEntryDetail, setShowEntryDetail] = useState<BinCardEntry | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'multiple'>('single');
  const [showMultipleView, setShowMultipleView] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
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

  // Comprehensive mock bin card entries with full details
  const mockBinEntries: BinCardEntry[] = useMemo(() => {
    if (!selectedAsset) return [];
    return [
      {
        id: "entry-001",
        entryNo: 1,
        date: selectedAsset.purchase_date || "2024-01-15",
        time: "10:30:45",
        type: "receipt",
        referenceType: "Purchase Order",
        reference: selectedAsset.purchase_bill_no || `PO-${selectedAsset.sap_code}`,
        receiptQty: 1,
        issueQty: 0,
        balanceQty: 1,
        unitCost: selectedAsset.purchase_cost || 45000,
        totalValue: selectedAsset.purchase_cost || 45000,
        remarks: "Initial purchase - New asset procurement from vendor",
        user: "Sunny Sobhani",
        userId: "usr-001",
        department: "IT Administration",
        location: selectedAsset.locations?.name || "Mumbai Office",
        approvedBy: "IT Manager",
        approvalDate: "2024-01-14",
        documentNo: selectedAsset.grn_no || `GRN-${selectedAsset.sap_code}`,
        vendorName: selectedAsset.vendors?.name || "Tech Solutions Pvt Ltd",
        grnNo: selectedAsset.grn_no || "GRN-2024-001",
        poNo: `PO-${selectedAsset.sap_code}`,
        employeeCode: "",
        employeeName: "",
        condition: "new",
        warrantyInfo: "3 Years Manufacturer Warranty",
        attachments: ["invoice.pdf", "grn_scan.pdf", "warranty_card.pdf"],
        tags: ["purchase", "new-asset", "mumbai-office"]
      },
      {
        id: "entry-002",
        entryNo: 2,
        date: "2024-01-20",
        time: "14:15:30",
        type: "issue",
        referenceType: "Asset Allocation",
        reference: `AA-${selectedAsset.sap_code}-001`,
        receiptQty: 0,
        issueQty: 1,
        balanceQty: 0,
        unitCost: 0,
        totalValue: 0,
        remarks: "Asset allocated to employee - Finance Department",
        user: "Rajesh Kumar",
        userId: "usr-002",
        department: "IT Support",
        location: "Finance Department - Floor 2",
        approvedBy: "Finance Head",
        approvalDate: "2024-01-19",
        documentNo: `AA-${selectedAsset.sap_code}-001`,
        vendorName: "",
        grnNo: "",
        poNo: "",
        employeeCode: "EMP-1023",
        employeeName: selectedAsset.employees?.name || "Amit Sharma",
        condition: "new",
        warrantyInfo: "Warranty transferred to employee",
        attachments: ["allocation_form.pdf", "employee_acknowledgement.pdf"],
        tags: ["allocation", "finance-dept", "employee-assignment"]
      },
      {
        id: "entry-003",
        entryNo: 3,
        date: "2024-02-15",
        time: "11:45:00",
        type: "return",
        referenceType: "Asset Return",
        reference: `AR-${selectedAsset.sap_code}-001`,
        receiptQty: 1,
        issueQty: 0,
        balanceQty: 1,
        unitCost: 0,
        totalValue: 0,
        remarks: "Asset returned by employee - Department transfer",
        user: "Priya Patel",
        userId: "usr-003",
        department: "HR Department",
        location: "IT Storage - Floor 1",
        approvedBy: "IT Manager",
        approvalDate: "2024-02-14",
        documentNo: `AR-${selectedAsset.sap_code}-001`,
        vendorName: "",
        grnNo: "",
        poNo: "",
        employeeCode: "EMP-1023",
        employeeName: selectedAsset.employees?.name || "Amit Sharma",
        condition: "good",
        warrantyInfo: "Warranty intact - 2 years 11 months remaining",
        attachments: ["return_form.pdf", "condition_report.pdf"],
        tags: ["return", "transfer", "storage"]
      },
      {
        id: "entry-004",
        entryNo: 4,
        date: "2024-02-20",
        time: "09:30:15",
        type: "transfer",
        referenceType: "Inter-Department Transfer",
        reference: `IDT-${selectedAsset.sap_code}-001`,
        receiptQty: 0,
        issueQty: 0,
        balanceQty: 1,
        unitCost: 0,
        totalValue: 0,
        remarks: "Asset transferred to Operations Department",
        user: "Vikram Mehta",
        userId: "usr-004",
        department: "Operations",
        location: "Operations Department - Floor 3",
        approvedBy: "Operations Head",
        approvalDate: "2024-02-19",
        documentNo: `IDT-${selectedAsset.sap_code}-001`,
        vendorName: "",
        grnNo: "",
        poNo: "",
        employeeCode: "EMP-2045",
        employeeName: "Suresh Kumar",
        condition: "good",
        warrantyInfo: "Warranty continues - 2 years 11 months remaining",
        attachments: ["transfer_form.pdf", "approval_email.pdf"],
        tags: ["transfer", "operations", "reassignment"]
      }
    ];
  }, [selectedAsset]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return mockBinEntries.filter(entry => {
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      let matchesDate = true;
      if (dateRange === "custom" && startDate && endDate) {
        matchesDate = entry.date >= startDate && entry.date <= endDate;
      }
      return matchesType && matchesDate;
    });
  }, [mockBinEntries, typeFilter, dateRange, startDate, endDate]);

  // Export functions
  const exportToJSON = () => {
    const entriesToExport = selectedEntries.length > 0 
      ? filteredEntries.filter(e => selectedEntries.includes(e.id))
      : filteredEntries;
    
    const data = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        assetCode: selectedAsset?.sap_code,
        assetName: selectedAsset?.name,
        totalEntries: entriesToExport.length,
        exportedBy: "Asset Harmony System"
      },
      assetDetails: selectedAsset ? {
        id: selectedAsset.id,
        sapCode: selectedAsset.sap_code,
        name: selectedAsset.name,
        category: selectedAsset.categories?.name,
        location: selectedAsset.locations?.name,
        assignedTo: selectedAsset.employees?.name,
        binCardNo: selectedAsset.bin_card_no
      } : null,
      entries: entriesToExport
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bin_card_${selectedAsset?.sap_code || "export"}_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const exportToCSV = () => {
    const entriesToExport = selectedEntries.length > 0 
      ? filteredEntries.filter(e => selectedEntries.includes(e.id))
      : filteredEntries;
    
    const headers = [
      "Entry No", "Date", "Time", "Type", "Reference Type", "Reference", "Receipt Qty",
      "Issue Qty", "Balance Qty", "Unit Cost", "Total Value", "User", "Department",
      "Location", "Approved By", "Document No", "Vendor", "GRN No", "PO No",
      "Employee Code", "Employee Name", "Condition", "Warranty Info", "Remarks", "Tags"
    ];
    
    const rows = entriesToExport.map(entry => [
      entry.entryNo,
      entry.date,
      entry.time,
      entry.type,
      entry.referenceType,
      entry.reference,
      entry.receiptQty,
      entry.issueQty,
      entry.balanceQty,
      entry.unitCost,
      entry.totalValue,
      entry.user,
      entry.department,
      entry.location,
      entry.approvedBy,
      entry.documentNo,
      entry.vendorName,
      entry.grnNo,
      entry.poNo,
      entry.employeeCode,
      entry.employeeName,
      entry.condition,
      entry.warrantyInfo,
      entry.remarks,
      entry.tags.join(", ")
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bin_card_${selectedAsset?.sap_code || "export"}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (selectedAsset) {
      exportBinCard(selectedAsset, selectedTx || []);
    }
  };

  const printBinCard = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && selectedAsset) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bin Card - ${selectedAsset.sap_code}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #0066cc; color: white; }
              .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
              .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>BIN CARD - ${selectedAsset.bin_card_no}</h1>
            <div class="header-info">
              <div class="info-box">
                <strong>Asset:</strong> ${selectedAsset.name}<br>
                <strong>SAP Code:</strong> ${selectedAsset.sap_code}<br>
                <strong>Category:</strong> ${selectedAsset.categories?.name || "N/A"}
              </div>
              <div class="info-box">
                <strong>Location:</strong> ${selectedAsset.locations?.name || "N/A"}<br>
                <strong>Current Balance:</strong> 1 Unit<br>
                <strong>Print Date:</strong> ${new Date().toLocaleDateString()}
              </div>
            </div>
            <table>
              <tr>
                <th>Entry No</th>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Receipt</th>
                <th>Issue</th>
                <th>Balance</th>
                <th>Remarks</th>
                <th>User</th>
              </tr>
              ${filteredEntries.map(entry => `
                <tr>
                  <td>${entry.entryNo}</td>
                  <td>${entry.date}</td>
                  <td>${entry.type.toUpperCase()}</td>
                  <td>${entry.reference}</td>
                  <td>${entry.receiptQty || '-'}</td>
                  <td>${entry.issueQty || '-'}</td>
                  <td><strong>${entry.balanceQty}</strong></td>
                  <td>${entry.remarks}</td>
                  <td>${entry.user}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleAssetDoubleClick = (assetId: string) => {
    setSelected(assetId);
    setViewMode('single');
    setShowMultipleView(false);
  };

  const selectAllEntries = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map(e => e.id));
    }
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setDateRange("all");
    setStartDate("");
    setEndDate("");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'issue': return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      case 'return': return <ArrowDownLeft className="h-4 w-4 text-orange-600" />;
      case 'transfer': return <Package className="h-4 w-4 text-purple-600" />;
      case 'disposal': return <X className="h-4 w-4 text-red-600" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'receipt':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300">
          <ArrowDownLeft className="h-3 w-3 mr-1" />Receipt
        </Badge>;
      case 'issue':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300">
          <ArrowUpRight className="h-3 w-3 mr-1" />Issue
        </Badge>;
      case 'return':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300">
          <ArrowDownLeft className="h-3 w-3 mr-1" />Return
        </Badge>;
      case 'transfer':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-300">
          <Package className="h-3 w-3 mr-1" />Transfer
        </Badge>;
      case 'disposal':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300">
          <X className="h-3 w-3 mr-1" />Disposal
        </Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'new':
        return <Badge className="bg-green-100 text-green-800">New</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
      case 'fair':
        return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
      case 'poor':
        return <Badge className="bg-orange-100 text-orange-800">Poor</Badge>;
      case 'damaged':
        return <Badge className="bg-red-100 text-red-800">Damaged</Badge>;
      default:
        return <Badge variant="secondary">{condition}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-accent" />
            Bin Cards
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete asset transaction history with detailed tracking
          </p>
        </div>
        {selectedAsset && (
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'multiple' ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                if (viewMode === 'single' && selectedAssets.length > 0) {
                  setViewMode('multiple');
                  setShowMultipleView(true);
                } else if (viewMode === 'multiple') {
                  setViewMode('single');
                  setShowMultipleView(false);
                } else {
                  alert('Please select at least one asset first (use checkboxes)');
                }
              }}
            >
              <Package className="h-4 w-4 mr-1" /> 
              {viewMode === 'multiple' ? "Single View" : "Multiple Bin Cards"}
              {selectedAssets.length > 0 && ` (${selectedAssets.length})`}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" /> 
              {showFilters ? "Hide Filters" : "Filters"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddEntry(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Entry
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                  Export as CSV (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON}>
                  <FileText className="h-4 w-4 mr-2 text-orange-600" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={printBinCard}>
                  <Printer className="h-4 w-4 mr-2 text-blue-600" />
                  Print Bin Card
                </DropdownMenuItem>
                {selectedEntries.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected ({selectedEntries.length})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && selectedAsset && (
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Entries
              </h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Transaction Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="receipt">Receipt</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="disposal">Disposal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 3 Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dateRange === "custom" && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Custom Range</label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white"
                    />
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset List Sidebar */}
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {filtered.length} assets found
              </p>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs px-2"
                  onClick={() => {
                    if (selectedAssets.length === filtered.length) {
                      setSelectedAssets([]);
                    } else {
                      setSelectedAssets(filtered.map((a: any) => a.id));
                    }
                  }}
                >
                  {selectedAssets.length === filtered.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>
            <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
              {filtered.map((asset: any) => (
                <div
                  key={asset.id}
                  onDoubleClick={() => handleAssetDoubleClick(asset.id)}
                  className={`group relative flex items-start gap-2 p-3 rounded-lg text-sm transition-all cursor-pointer ${
                    selected === asset.id 
                      ? 'bg-accent text-white shadow-md' 
                      : 'bg-white hover:bg-accent/10 border border-border/50'
                  }`}
                >
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => toggleAssetSelection(asset.id)}
                    />
                  </div>
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => setSelected(asset.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono font-semibold text-xs ${selected === asset.id ? 'text-white/90' : 'text-accent'}`}>
                        {asset.sap_code}
                      </span>
                      <Badge variant={selected === asset.id ? "secondary" : "outline"} className="text-xs">
                        #{asset.bin_card_no}
                      </Badge>
                    </div>
                    <p className={`font-medium truncate ${selected === asset.id ? 'text-white' : 'text-foreground'}`}>
                      {asset.name}
                    </p>
                    <p className={`text-xs truncate ${selected === asset.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {asset.employees?.name || 'Unassigned'} • {asset.locations?.name || 'No Location'}
                    </p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assets found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bin Card Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAsset ? (
            <>
              {/* Asset Header */}
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

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard icon={FileText} label="Purchase Bill" value={selectedAsset.purchase_bill_no || '—'} />
                <InfoCard icon={Calendar} label="Purchase Date" value={selectedAsset.purchase_date || '—'} />
                <InfoCard icon={User} label="Assigned To" value={selectedAsset.employees?.name || 'Unassigned'} />
                <InfoCard icon={Package} label="Location" value={selectedAsset.locations?.name || '—'} />
              </div>

              {/* Transaction History */}
              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-accent" />
                    <CardTitle className="text-lg">Transaction History</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    {selectedEntries.length > 0 && (
                      <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="h-3 w-3 mr-1" />
                        Export Selected ({selectedEntries.length})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={selectAllEntries}>
                      {selectedEntries.length === filteredEntries.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Bin Card Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-2 w-8">
                            <Checkbox 
                              checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                              onCheckedChange={selectAllEntries}
                            />
                          </th>
                          <th className="text-left py-3 px-2 font-semibold text-xs uppercase">Entry</th>
                          <th className="text-left py-3 px-2 font-semibold text-xs uppercase">Date</th>
                          <th className="text-left py-3 px-2 font-semibold text-xs uppercase">Type</th>
                          <th className="text-left py-3 px-2 font-semibold text-xs uppercase">Reference</th>
                          <th className="text-center py-3 px-2 font-semibold text-xs uppercase">In</th>
                          <th className="text-center py-3 px-2 font-semibold text-xs uppercase">Out</th>
                          <th className="text-center py-3 px-2 font-semibold text-xs uppercase">Balance</th>
                          <th className="text-left py-3 px-2 font-semibold text-xs uppercase">Remarks</th>
                          <th className="text-center py-3 px-2 font-semibold text-xs uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* Opening Balance */}
                        <tr className="bg-yellow-50/50">
                          <td className="py-3 px-2"></td>
                          <td className="py-3 px-2 font-mono text-xs">—</td>
                          <td className="py-3 px-2 font-mono text-xs">{selectedAsset.purchase_date || '—'}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                              Opening
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">—</td>
                          <td className="py-3 px-2 text-center">—</td>
                          <td className="py-3 px-2 text-center">—</td>
                          <td className="py-3 px-2 text-center font-bold text-accent">0</td>
                          <td className="py-3 px-2 text-muted-foreground text-xs">Opening balance</td>
                          <td className="py-3 px-2"></td>
                        </tr>
                        
                        {/* Transaction Rows */}
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-2">
                              <Checkbox 
                                checked={selectedEntries.includes(entry.id)}
                                onCheckedChange={() => toggleEntrySelection(entry.id)}
                              />
                            </td>
                            <td className="py-3 px-2 font-mono text-xs">#{entry.entryNo}</td>
                            <td className="py-3 px-2 font-mono text-xs">{entry.date}</td>
                            <td className="py-3 px-2">
                              {getTypeBadge(entry.type)}
                            </td>
                            <td className="py-3 px-2 font-mono text-xs">{entry.reference}</td>
                            <td className="py-3 px-2 text-center font-medium text-green-600">
                              {entry.receiptQty > 0 ? entry.receiptQty : '—'}
                            </td>
                            <td className="py-3 px-2 text-center font-medium text-blue-600">
                              {entry.issueQty > 0 ? entry.issueQty : '—'}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-accent">{entry.balanceQty}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs max-w-[150px] truncate">{entry.remarks}</td>
                            <td className="py-3 px-2 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowEntryDetail(entry)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        
                        {/* Current Balance */}
                        <tr className="bg-accent/5 font-medium">
                          <td className="py-3 px-2"></td>
                          <td className="py-3 px-2 font-mono text-xs">—</td>
                          <td className="py-3 px-2 font-mono text-xs">{new Date().toISOString().split('T')[0]}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="bg-accent/20 text-accent border-accent text-xs">
                              Current
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">—</td>
                          <td className="py-3 px-2 text-center">—</td>
                          <td className="py-3 px-2 text-center">—</td>
                          <td className="py-3 px-2 text-center font-bold text-accent text-lg">1</td>
                          <td className="py-3 px-2 text-muted-foreground text-xs">Current balance</td>
                          <td className="py-3 px-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Receipts</p>
                      <p className="text-2xl font-bold text-green-600">
                        {filteredEntries.filter(e => e.receiptQty > 0).reduce((sum, e) => sum + e.receiptQty, 0)}
                      </p>
                    </div>
                    <div className="text-center border-x">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Issues</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {filteredEntries.filter(e => e.issueQty > 0).reduce((sum, e) => sum + e.issueQty, 0)}
                      </p>
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

      {/* Entry Detail Dialog - Comprehensive */}
      <Dialog open={!!showEntryDetail} onOpenChange={() => setShowEntryDetail(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showEntryDetail && getTypeIcon(showEntryDetail.type)}
              Bin Card Entry Details
            </DialogTitle>
          </DialogHeader>
          {showEntryDetail && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Entry Number</p>
                  <p className="font-mono font-bold text-lg">#{showEntryDetail.entryNo}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Date & Time</p>
                  <p className="font-medium">{showEntryDetail.date}</p>
                  <p className="text-xs text-muted-foreground">{showEntryDetail.time}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Transaction Type</p>
                  {getTypeBadge(showEntryDetail.type)}
                </div>
              </div>

              {/* Quantities */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" />
                  Quantity & Value
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 uppercase">Receipt Qty</p>
                    <p className="text-xl font-bold text-green-700">{showEntryDetail.receiptQty || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 uppercase">Issue Qty</p>
                    <p className="text-xl font-bold text-blue-700">{showEntryDetail.issueQty || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-accent/10 rounded-lg">
                    <p className="text-xs text-accent uppercase">Balance Qty</p>
                    <p className="text-xl font-bold text-accent">{showEntryDetail.balanceQty}</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-600 uppercase">Total Value</p>
                    <p className="text-xl font-bold text-yellow-700">₹{showEntryDetail.totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Reference Info */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Reference Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Reference Type</p>
                    <p className="font-medium">{showEntryDetail.referenceType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Reference Number</p>
                    <p className="font-mono text-xs">{showEntryDetail.reference}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Document Number</p>
                    <p className="font-mono text-xs">{showEntryDetail.documentNo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">GRN Number</p>
                    <p className="font-mono text-xs">{showEntryDetail.grnNo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">PO Number</p>
                    <p className="font-mono text-xs">{showEntryDetail.poNo || '—'}</p>
                  </div>
                </div>
              </div>

              {/* User & Department */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  User & Department
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Created By</p>
                    <p className="font-medium">{showEntryDetail.user}</p>
                    <p className="text-xs text-muted-foreground">ID: {showEntryDetail.userId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Department</p>
                    <p className="font-medium">{showEntryDetail.department}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Approved By</p>
                    <p className="font-medium">{showEntryDetail.approvedBy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Approval Date</p>
                    <p className="font-medium">{showEntryDetail.approvalDate}</p>
                  </div>
                </div>
              </div>

              {/* Vendor & Employee */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent" />
                  Vendor & Employee Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Vendor Name</p>
                    <p className="font-medium">{showEntryDetail.vendorName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p className="font-medium">{showEntryDetail.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Employee Code</p>
                    <p className="font-mono text-xs">{showEntryDetail.employeeCode || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Employee Name</p>
                    <p className="font-medium">{showEntryDetail.employeeName || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Condition & Warranty */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  Condition & Warranty
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Asset Condition</p>
                    {getConditionBadge(showEntryDetail.condition)}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Warranty Information</p>
                    <p className="font-medium">{showEntryDetail.warrantyInfo}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="border rounded-lg p-4 bg-yellow-50/50">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Remarks
                </h4>
                <p className="text-sm">{showEntryDetail.remarks}</p>
              </div>

              {/* Tags */}
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4 text-accent" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {showEntryDetail.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              {showEntryDetail.attachments.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    Attachments ({showEntryDetail.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {showEntryDetail.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file}</span>
                        <Button variant="ghost" size="sm" className="ml-auto">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Multiple Bin Cards View */}
      <Dialog open={showMultipleView && selectedAssets.length > 0} onOpenChange={() => { setShowMultipleView(false); setViewMode('single'); }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Multiple Bin Cards View ({selectedAssets.length} assets)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const data = {
                    exportedAt: new Date().toISOString(),
                    assetCount: selectedAssets.length,
                    assets: selectedAssets.map(id => {
                      const asset = (assets || []).find((a: any) => a.id === id);
                      return {
                        sapCode: asset?.sap_code,
                        name: asset?.name,
                        binCardNo: asset?.bin_card_no,
                        category: asset?.categories?.name,
                        location: asset?.locations?.name,
                        status: asset?.status
                      };
                    })
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `multiple_bin_cards_${new Date().toISOString().split("T")[0]}.json`;
                  link.click();
                }}>
                  <Download className="h-3 w-3 mr-1" />
                  Export All (JSON)
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const csvContent = [
                    "SAP Code,Asset Name,Bin Card No,Category,Location,Status",
                    ...selectedAssets.map(id => {
                      const asset = (assets || []).find((a: any) => a.id === id);
                      return `"${asset?.sap_code}","${asset?.name}","${asset?.bin_card_no}","${asset?.categories?.name || ''}","${asset?.locations?.name || ''}","${asset?.status}"`;
                    })
                  ].join("\n");
                  const blob = new Blob([csvContent], { type: "text/csv" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `multiple_bin_cards_${new Date().toISOString().split("T")[0]}.csv`;
                  link.click();
                }}>
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  Export All (CSV)
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedAssets.map(id => {
                const asset = (assets || []).find((a: any) => a.id === id);
                if (!asset) return null;
                return (
                  <Card key={id} className="border-2 hover:border-accent transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono text-xs">#{asset.bin_card_no}</Badge>
                        <StatusBadge status={statusLabel(asset.status)} />
                      </div>
                      <p className="font-mono text-sm text-accent font-semibold">{asset.sap_code}</p>
                      <p className="font-medium text-sm leading-tight">{asset.name}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {asset.employees?.name || 'Unassigned'}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {asset.locations?.name || '—'}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {asset.purchase_bill_no || '—'}
                        </p>
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Balance: <strong className="text-accent">1</strong></span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelected(id);
                            setShowMultipleView(false);
                            setViewMode('single');
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Summary Table */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-sm">Summary Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-2 px-3">Bin Card #</th>
                        <th className="text-left py-2 px-3">SAP Code</th>
                        <th className="text-left py-2 px-3">Asset Name</th>
                        <th className="text-left py-2 px-3">Category</th>
                        <th className="text-left py-2 px-3">Location</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-center py-2 px-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedAssets.map(id => {
                        const asset = (assets || []).find((a: any) => a.id === id);
                        if (!asset) return null;
                        return (
                          <tr key={id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 font-mono">#{asset.bin_card_no}</td>
                            <td className="py-2 px-3 font-mono text-accent">{asset.sap_code}</td>
                            <td className="py-2 px-3">{asset.name}</td>
                            <td className="py-2 px-3">{asset.categories?.name || '—'}</td>
                            <td className="py-2 px-3">{asset.locations?.name || '—'}</td>
                            <td className="py-2 px-3">
                              <StatusBadge status={statusLabel(asset.status)} />
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-accent">1</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-accent/5 font-medium">
                      <tr>
                        <td colSpan={6} className="py-2 px-3 text-right">Total Assets:</td>
                        <td className="py-2 px-3 text-center font-bold text-accent">{selectedAssets.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Bin Card Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt (In)</SelectItem>
                    <SelectItem value="issue">Issue (Out)</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="po">Purchase Order</SelectItem>
                    <SelectItem value="grn">GRN</SelectItem>
                    <SelectItem value="allocation">Asset Allocation</SelectItem>
                    <SelectItem value="return">Asset Return</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Number</label>
              <Input placeholder="e.g., PO-2024-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input type="number" defaultValue={1} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Cost (₹)</label>
                <Input type="number" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Input placeholder="Enter remarks..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <Input type="file" multiple />
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
