import { useState, useMemo } from "react";
import { useAuditLogV2, AuditLogV2Row } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCSV, exportJSON, exportXLSX, exportPDF, printTable, ExportColumn } from "@/lib/exporters";
import { toast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter,
  History,
  User,
  Calendar,
  Package,
  Plus,
  Edit3,
  Trash2,
  ArrowRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
  ChevronDown,
  RefreshCw,
  Globe,
  Monitor,
  Smartphone,
  MapPin,
  Building2,
  Key,
  Shield
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Comprehensive audit log entry with all details
interface AuditEntry {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  user: string;
  userId: string;
  userRole: string;
  userDepartment: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  tableLabel: string;
  recordId: string;
  recordName: string;
  recordCode: string;
  description: string;
  changes: {
    field: string;
    fieldLabel: string;
    oldValue: string;
    newValue: string;
    dataType: string;
  }[];
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  location: string;
  sessionId: string;
  requestMethod: string;
  apiEndpoint: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
  tags: string[];
}

// Comprehensive mock data with all details
const mockAuditData: AuditEntry[] = [
  {
    id: "1",
    timestamp: "2024-01-15 10:30:45",
    date: "2024-01-15",
    time: "10:30:45",
    user: "Sunny Sobhani",
    userId: "usr-001",
    userRole: "admin",
    userDepartment: "IT Administration",
    action: "INSERT",
    table: "assets",
    tableLabel: "Assets",
    recordId: "asset-001",
    recordName: "Dell OptiPlex 7090 Desktop",
    recordCode: "MCD-01",
    description: "Created new desktop asset for Mumbai office",
    changes: [],
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    deviceType: "desktop",
    browser: "Chrome 120",
    os: "Windows 11",
    location: "Mumbai Office - Floor 3",
    sessionId: "sess-20240115-001",
    requestMethod: "POST",
    apiEndpoint: "/api/assets",
    severity: "medium",
    notes: "Asset imported from SAP B1 CSV",
    tags: ["import", "desktop", "mumbai"]
  },
  {
    id: "2",
    timestamp: "2024-01-15 14:22:10",
    date: "2024-01-15",
    time: "14:22:10",
    user: "Rajesh Kumar",
    userId: "usr-002",
    userRole: "it",
    userDepartment: "IT Support",
    action: "UPDATE",
    table: "assets",
    tableLabel: "Assets",
    recordId: "asset-001",
    recordName: "Dell OptiPlex 7090 Desktop",
    recordCode: "MCD-01",
    description: "Assigned asset to employee and updated status",
    changes: [
      { field: "status", fieldLabel: "Status", oldValue: "available", newValue: "allocated", dataType: "enum" },
      { field: "assigned_to", fieldLabel: "Assigned To", oldValue: "—", newValue: "Amit Sharma (EMP-1023)", dataType: "relation" },
      { field: "location_id", fieldLabel: "Location", oldValue: "Storage Room A", newValue: "Finance Department - Desk 12", dataType: "relation" },
      { field: "assigned_date", fieldLabel: "Assigned Date", oldValue: "—", newValue: "2024-01-15", dataType: "date" }
    ],
    ipAddress: "192.168.1.105",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0",
    deviceType: "desktop",
    browser: "Edge 120",
    os: "Windows 10",
    location: "Mumbai Office - Floor 2",
    sessionId: "sess-20240115-045",
    requestMethod: "PATCH",
    apiEndpoint: "/api/assets/asset-001",
    severity: "high",
    notes: "Asset allocation for new finance team member",
    tags: ["allocation", "finance-dept", "new-employee"]
  },
  {
    id: "3",
    timestamp: "2024-01-16 09:15:33",
    date: "2024-01-16",
    time: "09:15:33",
    user: "Priya Patel",
    userId: "usr-003",
    userRole: "admin",
    userDepartment: "Human Resources",
    action: "INSERT",
    table: "employees",
    tableLabel: "Employees",
    recordId: "emp-001",
    recordName: "Amit Sharma",
    recordCode: "EMP-1023",
    description: "Created new employee record",
    changes: [],
    ipAddress: "192.168.1.110",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0",
    deviceType: "desktop",
    browser: "Chrome 119",
    os: "macOS Sonoma",
    location: "Mumbai Office - HR Department",
    sessionId: "sess-20240116-012",
    requestMethod: "POST",
    apiEndpoint: "/api/employees",
    severity: "medium",
    notes: "New joinee - Finance Department",
    tags: ["new-employee", "finance", "onboarding"]
  },
  {
    id: "4",
    timestamp: "2024-01-16 11:45:22",
    date: "2024-01-16",
    time: "11:45:22",
    user: "Vikram Mehta",
    userId: "usr-004",
    userRole: "manager",
    userDepartment: "Operations",
    action: "UPDATE",
    table: "licenses",
    tableLabel: "Licenses",
    recordId: "lic-001",
    recordName: "Microsoft Office 365 Business",
    recordCode: "MS-O365-001",
    description: "Renewed license and extended expiry date",
    changes: [
      { field: "expiry_date", fieldLabel: "Expiry Date", oldValue: "2024-01-31", newValue: "2025-01-31", dataType: "date" },
      { field: "status", fieldLabel: "Status", oldValue: "expiring_soon", newValue: "active", dataType: "enum" },
      { field: "renewal_cost", fieldLabel: "Renewal Cost", oldValue: "₹0", newValue: "₹12,000", dataType: "currency" }
    ],
    ipAddress: "192.168.1.115",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1) Version/17.1.1 Mobile/15E148 Safari/604.1",
    deviceType: "mobile",
    browser: "Safari Mobile",
    os: "iOS 17.1",
    location: "Remote - Mobile Access",
    sessionId: "sess-20240116-089",
    requestMethod: "PATCH",
    apiEndpoint: "/api/licenses/lic-001",
    severity: "high",
    notes: "Annual license renewal processed",
    tags: ["license-renewal", "microsoft", "expense-approved"]
  },
  {
    id: "5",
    timestamp: "2024-01-17 16:30:00",
    date: "2024-01-17",
    time: "16:30:00",
    user: "Sunny Sobhani",
    userId: "usr-001",
    userRole: "admin",
    userDepartment: "IT Administration",
    action: "DELETE",
    table: "vendors",
    tableLabel: "Vendors",
    recordId: "ven-005",
    recordName: "ABC Electronics (Duplicate Entry)",
    recordCode: "VEN-005",
    description: "Removed duplicate vendor record",
    changes: [
      { field: "is_deleted", fieldLabel: "Deleted", oldValue: "false", newValue: "true", dataType: "boolean" }
    ],
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    deviceType: "desktop",
    browser: "Chrome 120",
    os: "Windows 11",
    location: "Mumbai Office - Floor 3",
    sessionId: "sess-20240117-156",
    requestMethod: "DELETE",
    apiEndpoint: "/api/vendors/ven-005",
    severity: "low",
    notes: "Duplicate of VEN-003 - Tech Solutions Pvt Ltd",
    tags: ["cleanup", "duplicate-removal", "data-quality"]
  }
];

// Convert a real audit_log row into the rich AuditEntry shape this UI expects.
// Fields the DB doesn't store (severity, device, browser, OS, location, tags)
// get sensible defaults so the UI keeps rendering.
function rowToEntry(r: AuditLogV2Row): AuditEntry {
  const ts = new Date(r.created_at);
  const date = ts.toISOString().split("T")[0];
  const time = ts.toTimeString().split(" ")[0];
  const tableLabel = r.table_name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  // Build per-field changes from old_values vs new_values
  const oldVals = (r.old_values ?? {}) as Record<string, unknown>;
  const newVals = (r.new_values ?? {}) as Record<string, unknown>;
  const fieldKeys = (r.changed_fields && r.changed_fields.length > 0)
    ? r.changed_fields
    : Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

  const changes = fieldKeys.map(field => ({
    field,
    fieldLabel: field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    oldValue: oldVals[field] === undefined || oldVals[field] === null ? "" : String(oldVals[field]),
    newValue: newVals[field] === undefined || newVals[field] === null ? "" : String(newVals[field]),
    dataType: typeof (newVals[field] ?? oldVals[field]),
  }));

  // Best-effort record name from new/old values
  const recName = (newVals.name ?? oldVals.name ?? newVals.full_name ?? oldVals.full_name ?? r.record_id) as string;
  const recCode = (newVals.sap_code ?? oldVals.sap_code ?? newVals.code ?? oldVals.code ?? "") as string;

  return {
    id: r.id,
    timestamp: r.created_at,
    date,
    time,
    user: r.user_name ?? "System",
    userId: r.user_id ?? "",
    userRole: r.user_role ?? "",
    userDepartment: "",
    action: r.action,
    table: r.table_name,
    tableLabel,
    recordId: r.record_id,
    recordName: String(recName ?? r.record_id),
    recordCode: String(recCode ?? ""),
    description: r.notes ?? `${r.action} on ${tableLabel}`,
    changes,
    ipAddress: r.ip_address ?? "",
    userAgent: r.user_agent ?? "",
    deviceType: "desktop",
    browser: "",
    os: "",
    location: "",
    sessionId: "",
    requestMethod: r.action === "INSERT" ? "POST" : r.action === "UPDATE" ? "PATCH" : "DELETE",
    apiEndpoint: `/rest/v1/${r.table_name}/${r.record_id}`,
    severity: "low",
    notes: r.notes ?? "",
    tags: [],
  };
}

export default function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Pull real audit_log rows from Supabase and convert to UI shape
  const { data: rows = [], isLoading, error } = useAuditLogV2({ limit: 500 });
  const auditData: AuditEntry[] = useMemo(() => rows.map(rowToEntry), [rows]);

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Map();
    auditData.forEach(entry => {
      if (entry.userId) users.set(entry.userId, { id: entry.userId, name: entry.user, role: entry.userRole });
    });
    return Array.from(users.values());
  }, [auditData]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    auditData.forEach(entry => entry.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [auditData]);

  // Filter data with all criteria
  const filteredData = useMemo(() => {
    return auditData.filter((entry) => {
      // Search across multiple fields
      const matchesSearch = !search || 
        entry.recordName.toLowerCase().includes(search.toLowerCase()) ||
        entry.recordCode.toLowerCase().includes(search.toLowerCase()) ||
        entry.user.toLowerCase().includes(search.toLowerCase()) ||
        entry.userDepartment.toLowerCase().includes(search.toLowerCase()) ||
        entry.tableLabel.toLowerCase().includes(search.toLowerCase()) ||
        entry.description.toLowerCase().includes(search.toLowerCase()) ||
        entry.ipAddress.includes(search) ||
        entry.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      
      const matchesTable = tableFilter === "all" || entry.table === tableFilter;
      const matchesAction = actionFilter === "all" || entry.action === actionFilter;
      const matchesUser = userFilter === "all" || entry.userId === userFilter;
      const matchesSeverity = severityFilter === "all" || entry.severity === severityFilter;
      const matchesDevice = deviceFilter === "all" || entry.deviceType === deviceFilter;
      
      // Date range filter
      let matchesDate = true;
      if (dateRange === "custom" && startDate && endDate) {
        matchesDate = entry.date >= startDate && entry.date <= endDate;
      }
      
      // Tags filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => entry.tags.includes(tag));
      
      return matchesSearch && matchesTable && matchesAction && matchesUser && 
             matchesSeverity && matchesDevice && matchesDate && matchesTags;
    });
  }, [auditData, search, tableFilter, actionFilter, userFilter, severityFilter, deviceFilter, dateRange, startDate, endDate, selectedTags]);

  // ── Unified column definition consumed by every export format ──
  const exportCols: ExportColumn<AuditEntry>[] = [
    { key: "timestamp",   label: "Timestamp",   width: 22 },
    { key: "user",        label: "User",        width: 24 },
    { key: "userRole",    label: "Role",        width: 12 },
    { key: "action",      label: "Action",      width: 10 },
    { key: "tableLabel",  label: "Table",       width: 16 },
    { key: "recordName",  label: "Record",      width: 28 },
    { key: "recordCode",  label: "Code",        width: 16 },
    { key: "description", label: "Description", width: 36 },
    {
      key: "changes",
      label: "Changes",
      width: 50,
      get: r => r.changes.map(c => `${c.fieldLabel}: ${c.oldValue || "(empty)"} → ${c.newValue || "(empty)"}`).join("; "),
    },
    { key: "ipAddress",   label: "IP Address",  width: 16 },
    { key: "notes",       label: "Notes",       width: 30 },
  ];

  const STEM = "audit_trail";
  const TITLE = "Audit Trail Report";

  const handleExport = async (
    format: "csv" | "json" | "xlsx" | "pdf" | "print",
  ) => {
    if (filteredData.length === 0) {
      toast({ title: "Nothing to export", description: "No rows match the current filters.", variant: "destructive" });
      return;
    }
    try {
      switch (format) {
        case "csv":   exportCSV(filteredData, exportCols, STEM); break;
        case "json":  exportJSON(filteredData, STEM); break;
        case "xlsx":  await exportXLSX(filteredData, exportCols, STEM, "Audit Trail"); break;
        case "pdf":   await exportPDF(filteredData, exportCols, STEM, TITLE, `${filteredData.length} events — ${new Date().toLocaleDateString()}`); break;
        case "print": printTable(filteredData, exportCols, TITLE, `${filteredData.length} events`); break;
      }
      toast({ title: "Export ready", description: `${filteredData.length} rows exported as ${format.toUpperCase()}.` });
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  // Legacy aliases — kept so any leftover refs still compile
  const exportToCSV   = () => handleExport("csv");
  const exportToJSON  = () => handleExport("json");
  const printAuditLog = () => handleExport("print");

  const clearFilters = () => {
    setSearch("");
    setTableFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setSeverityFilter("all");
    setDeviceFilter("all");
    setDateRange("all");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Edit3 className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300">
            <Plus className="h-3 w-3 mr-1" />
            Created
          </Badge>
        );
      case 'UPDATE':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300">
            <Edit3 className="h-3 w-3 mr-1" />
            Updated
          </Badge>
        );
      case 'DELETE':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300">
            <Trash2 className="h-3 w-3 mr-1" />
            Deleted
          </Badge>
        );
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getTableIcon = (table: string) => {
    switch (table) {
      case 'assets':
        return <Package className="h-4 w-4 text-accent" />;
      case 'employees':
        return <User className="h-4 w-4 text-accent" />;
      case 'locations':
        return <MapPin className="h-4 w-4 text-accent" />;
      case 'licenses':
        return <Key className="h-4 w-4 text-accent" />;
      case 'vendors':
        return <Building2 className="h-4 w-4 text-accent" />;
      case 'companies':
        return <Globe className="h-4 w-4 text-accent" />;
      default:
        return <History className="h-4 w-4 text-accent" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Low</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Could not load audit log</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
            {(error as Error).message}
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure <code>SETUP_BIN_CARDS_SAFE.sql</code> has been run in the Supabase SQL Editor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-accent" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm">
            {auditData.length === 0
              ? "No audit events recorded yet — actions you take in the app will appear here."
              : `Complete history of all changes with detailed tracking — ${auditData.length} event${auditData.length === 1 ? "" : "s"} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Download {filteredData.length} row{filteredData.length === 1 ? "" : "s"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleExport("xlsx")}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport("pdf")}>
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport("csv")}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport("json")}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                JSON (.json)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleExport("print")}>
                <Printer className="h-4 w-4 mr-2 text-purple-600" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by record name, user, department, IP address, or tags..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-9" 
        />
      </div>

      {/* Comprehensive Filters */}
      {showFilters && (
        <Card className="bg-muted/30 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Table Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Table</label>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Tables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    <SelectItem value="assets">Assets</SelectItem>
                    <SelectItem value="employees">Employees</SelectItem>
                    <SelectItem value="locations">Locations</SelectItem>
                    <SelectItem value="licenses">Licenses</SelectItem>
                    <SelectItem value="vendors">Vendors</SelectItem>
                    <SelectItem value="companies">Companies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Action</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="INSERT">Created</SelectItem>
                    <SelectItem value="UPDATE">Updated</SelectItem>
                    <SelectItem value="DELETE">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">User</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Severity</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Device Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Device</label>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Date Range */}
            {dateRange === "custom" && (
              <div className="flex gap-3 mt-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Tags Filter */}
            <div className="mt-4">
              <label className="text-xs text-muted-foreground mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge 
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Total Changes" 
          value={filteredData.length.toString()} 
          icon={History}
          color="bg-accent/10 text-accent"
        />
        <StatCard 
          title="Created" 
          value={filteredData.filter(e => e.action === 'INSERT').length.toString()} 
          icon={Plus}
          color="bg-green-100 text-green-700"
        />
        <StatCard 
          title="Updated" 
          value={filteredData.filter(e => e.action === 'UPDATE').length.toString()} 
          icon={Edit3}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard 
          title="Deleted" 
          value={filteredData.filter(e => e.action === 'DELETE').length.toString()} 
          icon={Trash2}
          color="bg-red-100 text-red-700"
        />
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-accent" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[180px]">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[100px]">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Table</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Record</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[100px]">Changes</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[80px]">View</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{entry.timestamp}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center">
                          <User className="h-3 w-3 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.user}</p>
                          <p className="text-xs text-muted-foreground capitalize">{entry.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(entry.action)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTableIcon(entry.table)}
                        <span className="capitalize text-sm">{entry.table}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{entry.recordName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{entry.recordId}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.changes.length > 0 ? (
                        <Badge variant="secondary" className="cursor-pointer hover:bg-accent/20">
                          {entry.changes.length} field{entry.changes.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No audit log entries found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Entry Detail Dialog - Comprehensive */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry && getActionIcon(selectedEntry.action)}
              Audit Entry Details
              {selectedEntry && getSeverityBadge(selectedEntry.severity)}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Timestamp</p>
                  <p className="font-medium">{selectedEntry.date}</p>
                  <p className="text-xs text-muted-foreground">{selectedEntry.time}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Action</p>
                  {getActionBadge(selectedEntry.action)}
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs uppercase mb-1">Table</p>
                  <div className="flex items-center gap-2">
                    {getTableIcon(selectedEntry.table)}
                    <span className="font-medium">{selectedEntry.tableLabel}</span>
                  </div>
                </div>
              </div>

              {/* Record Info */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" />
                  Record Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Record Name</p>
                    <p className="font-medium">{selectedEntry.recordName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Record Code</p>
                    <p className="font-mono text-xs">{selectedEntry.recordCode}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Description</p>
                    <p className="text-sm">{selectedEntry.description}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Record ID</p>
                    <p className="font-mono text-xs text-muted-foreground">{selectedEntry.recordId}</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  User Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">User Name</p>
                    <p className="font-medium">{selectedEntry.user}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">User ID</p>
                    <p className="font-mono text-xs text-muted-foreground">{selectedEntry.userId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Role</p>
                    <p className="font-medium capitalize">{selectedEntry.userRole}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Department</p>
                    <p className="font-medium">{selectedEntry.userDepartment}</p>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-accent" />
                  Technical Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">IP Address</p>
                    <p className="font-mono text-xs">{selectedEntry.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Device Type</p>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(selectedEntry.deviceType)}
                      <span className="capitalize">{selectedEntry.deviceType}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Browser</p>
                    <p className="font-medium">{selectedEntry.browser}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Operating System</p>
                    <p className="font-medium">{selectedEntry.os}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p className="font-medium">{selectedEntry.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Session ID</p>
                    <p className="font-mono text-xs text-muted-foreground">{selectedEntry.sessionId}</p>
                  </div>
                </div>
              </div>

              {/* API Details */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  API Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Request Method</p>
                    <Badge variant="outline" className="font-mono">{selectedEntry.requestMethod}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">API Endpoint</p>
                    <p className="font-mono text-xs">{selectedEntry.apiEndpoint}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">User Agent</p>
                    <p className="text-xs text-muted-foreground break-all">{selectedEntry.userAgent}</p>
                  </div>
                </div>
              </div>

              {/* Changes */}
              {selectedEntry.changes.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Field Changes</h4>
                  <div className="space-y-3">
                    {selectedEntry.changes.map((change, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{change.fieldLabel}</p>
                          <Badge variant="outline" className="text-xs">{change.dataType}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex-1 bg-red-50 rounded p-2">
                            <p className="text-xs text-red-600 mb-1">Old Value</p>
                            <p className="text-red-700 line-through">{change.oldValue || '—'}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 bg-green-50 rounded p-2">
                            <p className="text-xs text-green-600 mb-1">New Value</p>
                            <p className="text-green-700 font-medium">{change.newValue || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedEntry.notes && (
                <div className="border rounded-lg p-4 bg-yellow-50/50">
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    Notes
                  </h4>
                  <p className="text-sm">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for statistics
function StatCard({ 
  title, 
  value, 
  icon: Icon,
  color
}: { 
  title: string; 
  value: string; 
  icon: any;
  color: string;
}) {
  return (
    <Card className="border-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
