import { useState, useMemo } from "react";
import { useAssets, useAssetTransactions, useBinCardEntries, BinCardEntryRow } from "@/hooks/useSupabaseData";
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
import { exportBinCard, exportMultipleBinCards } from "@/lib/pdf";
import { exportCSV, exportJSON, exportXLSX, printTable, ExportColumn } from "@/lib/exporters";
import { toast } from "@/hooks/use-toast";
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
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged' | '';
  warrantyInfo: string;
  attachments: string[];
  tags: string[];
}

export default function EnhancedBinCardsPage() {
  const { data: assets, isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BinCardEntry | null>(null);
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
  // Real bin-card entries from Supabase for the selected asset
  const { data: binRows = [] } = useBinCardEntries(selected ?? undefined);

  // ── Hooks must run on every render: keep all useMemo/useState above
  //    any conditional return. ──
  const selectedAsset = selected ? (assets || []).find((a: any) => a.id === selected) : null;

  // Real bin entries (was mockBinEntries — kept the variable name so the rest of the page works)
  const binEntries: BinCardEntry[] = useMemo(() => {
    if (!selectedAsset) return [];

    const rowToBin = (r: BinCardEntryRow, idx: number): BinCardEntry => {
      const ts = new Date(r.created_at);
      return {
        id: r.id,
        entryNo: idx + 1,
        date: r.entry_date,
        time: ts.toTimeString().split(" ")[0],
        type: (r.transaction_type === "opening" ? "adjustment" : r.transaction_type) as BinCardEntry["type"],
        referenceType: r.transaction_type === "receipt" ? "Receipt" : r.transaction_type === "issue" ? "Issue" : "Adjustment",
        reference: r.reference_no ?? "",
        receiptQty: r.receipt_qty ?? 0,
        issueQty: r.issue_qty ?? 0,
        balanceQty: r.balance_qty ?? 0,
        unitCost: Number(r.unit_cost ?? 0),
        totalValue: Number(r.total_value ?? 0),
        remarks: r.remarks ?? "",
        user: r.created_by_name ?? "System",
        userId: r.created_by_id ?? "",
        department: "",
        location: selectedAsset?.locations?.name ?? "",
        approvedBy: "",
        approvalDate: "",
        documentNo: r.reference_no ?? "",
        vendorName: selectedAsset?.vendors?.name ?? "",
        grnNo: "",
        poNo: "",
        employeeCode: selectedAsset?.employees?.employee_code ?? "",
        employeeName: selectedAsset?.employees?.name ?? "",
        condition: "",
        warrantyInfo: "",
        attachments: [],
        tags: [],
      };
    };

    if (binRows.length > 0) return binRows.map(rowToBin);

    // Fallback: synthesize a single "opening" entry from the asset record
    // so the UI isn't empty for assets that don't have bin_card_entries yet.
    const synthetic: BinCardEntry = {
      id: `synthetic-${selectedAsset.id}`,
      entryNo: 1,
      date: selectedAsset.purchase_date || selectedAsset.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      time: "00:00:00",
      type: "receipt",
      referenceType: "Opening Balance",
      reference: selectedAsset.purchase_bill_no || `INIT-${selectedAsset.sap_code}`,
      receiptQty: 1,
      issueQty: 0,
      balanceQty: 1,
      unitCost: Number(selectedAsset.purchase_cost ?? 0),
      totalValue: Number(selectedAsset.purchase_cost ?? 0),
      remarks: "Opening balance — no bin-card entries recorded yet for this asset.",
      user: "System",
      userId: "",
      department: selectedAsset.departments?.name ?? "",
      location: selectedAsset.locations?.name ?? "",
      approvedBy: "",
      approvalDate: "",
      documentNo: selectedAsset.purchase_bill_no ?? "",
      vendorName: selectedAsset.vendors?.name ?? "",
      grnNo: "",
      poNo: "",
      employeeCode: selectedAsset.employees?.employee_code ?? "",
      employeeName: selectedAsset.employees?.name ?? "",
      condition: "",
      warrantyInfo: selectedAsset.warranty_end ? `Warranty until ${selectedAsset.warranty_end}` : "",
      attachments: [],
      tags: [],
    };
    return [synthetic];
  }, [selectedAsset, binRows]);

  // Backwards-compat alias — the rest of the page still references mockBinEntries
  const mockBinEntries = binEntries;

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

  // Early return must come AFTER every hook
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

  const exportToExcel = async () => {
    const entriesToExport = selectedEntries.length > 0
      ? filteredEntries.filter(e => selectedEntries.includes(e.id))
      : filteredEntries;
    const { exportXLSX } = await import("@/lib/exporters");
    await exportXLSX(
      entriesToExport,
      [
        { key: "entryNo",      label: "Entry #",       width: 9  },
        { key: "date",         label: "Date",          width: 12 },
        { key: "time",         label: "Time",          width: 10 },
        { key: "type",         label: "Type",          width: 14 },
        { key: "referenceType",label: "Reference Type",width: 18 },
        { key: "reference",    label: "Reference",     width: 22 },
        { key: "receiptQty",   label: "Receipt",       width: 9  },
        { key: "issueQty",     label: "Issue",         width: 9  },
        { key: "balanceQty",   label: "Balance",       width: 9  },
        { key: "unitCost",     label: "Unit Cost",     width: 12 },
        { key: "totalValue",   label: "Total Value",   width: 14 },
        { key: "user",         label: "User",          width: 22 },
        { key: "department",   label: "Department",    width: 18 },
        { key: "location",     label: "Location",      width: 22 },
        { key: "vendorName",   label: "Vendor",        width: 22 },
        { key: "employeeCode", label: "Emp Code",      width: 12 },
        { key: "employeeName", label: "Employee",      width: 22 },
        { key: "remarks",      label: "Remarks",       width: 36 },
      ],
      `bin_card_${selectedAsset?.sap_code || "export"}`,
      "Bin Card Entries",
    );
  };

  const exportToPDF = () => {
    if (selectedAsset) {
      // Pass both the asset_transactions ledger AND the bin_card_entries
      // ledger (the page itself shows the latter, so the PDF should too).
      exportBinCard(selectedAsset, selectedTx || [], filteredEntries);
    }
  };

  // Used by the Multiple Bin Cards View dialog. Exports all selected assets
  // in the chosen format. PDF gets one card per page (with Asset Details +
  // Bin Card Entries + Transaction Ledger). The other formats render a
  // flat summary table.
  const exportMultiple = async (format: "csv" | "json" | "xlsx" | "pdf" | "print") => {
    const picked = (assets || []).filter((a: any) => selectedAssets.includes(a.id));
    if (picked.length === 0) {
      toast({ title: "Nothing selected", description: "Select at least one asset first.", variant: "destructive" });
      return;
    }
    try {
      if (format === "pdf") {
        exportMultipleBinCards(picked.map((a: any) => ({ asset: a, transactions: [], binEntries: [] })));
        toast({ title: "PDF ready", description: `${picked.length} bin cards exported.` });
        return;
      }

      const cols: ExportColumn<any>[] = [
        { key: "bin_card_no", label: "Bin Card #",  width: 12 },
        { key: "sap_code",    label: "SAP Code",    width: 14 },
        { key: "name",        label: "Asset Name",  width: 36 },
        { key: "asset_subtype",label:"Type",        width: 14 },
        { key: "categories",  label: "Category",    width: 22, get: (a: any) => a.categories?.name ?? "" },
        { key: "locations",   label: "Location",    width: 22, get: (a: any) => a.locations?.name ?? "" },
        { key: "departments", label: "Department",  width: 22, get: (a: any) => a.departments?.name ?? "" },
        { key: "employees",   label: "Assigned to", width: 22, get: (a: any) => a.employees?.name ?? "Unassigned" },
        { key: "vendors",     label: "Vendor",      width: 22, get: (a: any) => a.vendors?.name ?? "" },
        { key: "status",      label: "Status",      width: 14 },
        { key: "purchase_cost", label:"Cost",       width: 12 },
      ];
      const stem = `multiple_bin_cards_${picked.length}`;
      switch (format) {
        case "csv":   exportCSV(picked, cols, stem); break;
        case "json":  exportJSON(picked, stem); break;
        case "xlsx":  await exportXLSX(picked, cols, stem, "Bin Cards"); break;
        case "print": printTable(picked, cols, "Multiple Bin Cards", `${picked.length} assets`); break;
      }
      toast({ title: "Export ready", description: `${picked.length} assets exported as ${format.toUpperCase()}.` });
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" });
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON}>
                  <FileText className="h-4 w-4 mr-2 text-orange-600" />
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                                onClick={() => setSelectedEntry(entry)}
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
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Bin Card Entry Details
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Entry Number</p>
                  <p className="font-mono font-bold text-lg">#{selectedEntry.entryNo}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Date & Time</p>
                  <p className="font-medium">{selectedEntry.date}</p>
                  <p className="text-xs text-muted-foreground">{selectedEntry.time}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Transaction Type</p>
                  {getTypeBadge(selectedEntry.type)}
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
                    <p className="text-xl font-bold text-green-700">{selectedEntry.receiptQty || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 uppercase">Issue Qty</p>
                    <p className="text-xl font-bold text-blue-700">{selectedEntry.issueQty || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-accent/10 rounded-lg">
                    <p className="text-xs text-accent uppercase">Balance Qty</p>
                    <p className="text-xl font-bold text-accent">{selectedEntry.balanceQty}</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-600 uppercase">Total Value</p>
                    <p className="text-xl font-bold text-yellow-700">₹{selectedEntry.totalValue.toLocaleString()}</p>
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
                    <p className="font-medium">{selectedEntry.referenceType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Reference Number</p>
                    <p className="font-mono text-xs">{selectedEntry.reference}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Document Number</p>
                    <p className="font-mono text-xs">{selectedEntry.documentNo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">GRN Number</p>
                    <p className="font-mono text-xs">{selectedEntry.grnNo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">PO Number</p>
                    <p className="font-mono text-xs">{selectedEntry.poNo || '—'}</p>
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
                    <p className="font-medium">{selectedEntry.user}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedEntry.userId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Department</p>
                    <p className="font-medium">{selectedEntry.department}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Approved By</p>
                    <p className="font-medium">{selectedEntry.approvedBy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Approval Date</p>
                    <p className="font-medium">{selectedEntry.approvalDate}</p>
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
                    <p className="font-medium">{selectedEntry.vendorName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p className="font-medium">{selectedEntry.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Employee Code</p>
                    <p className="font-mono text-xs">{selectedEntry.employeeCode || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Employee Name</p>
                    <p className="font-medium">{selectedEntry.employeeName || '—'}</p>
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
                    {getConditionBadge(selectedEntry.condition)}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Warranty Information</p>
                    <p className="font-medium">{selectedEntry.warrantyInfo}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="border rounded-lg p-4 bg-yellow-50/50">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Remarks
                </h4>
                <p className="text-sm">{selectedEntry.remarks}</p>
              </div>

              {/* Tags */}
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4 text-accent" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              {selectedEntry.attachments.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    Attachments ({selectedEntry.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedEntry.attachments.map((file, idx) => (
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Export All
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{selectedAssets.length} asset{selectedAssets.length === 1 ? "" : "s"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => exportMultiple("xlsx")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportMultiple("pdf")}>
                    <FileText className="h-4 w-4 mr-2 text-red-600" />
                    PDF — one card per page
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportMultiple("csv")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportMultiple("json")}>
                    <FileText className="h-4 w-4 mr-2 text-orange-600" />
                    JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => exportMultiple("print")}>
                    <Printer className="h-4 w-4 mr-2 text-blue-600" />
                    Print Summary
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
