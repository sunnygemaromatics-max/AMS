import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye
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

// Mock audit log entry - will be replaced with real data
interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  recordName: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  ipAddress?: string;
}

const mockAuditData: AuditEntry[] = [
  {
    id: "1",
    timestamp: "2024-01-15 10:30:45",
    user: "Admin User",
    userRole: "admin",
    action: "INSERT",
    table: "assets",
    recordId: "asset-001",
    recordName: "MCD-01 - Dell Desktop",
    changes: [],
    ipAddress: "192.168.1.100"
  },
  {
    id: "2",
    timestamp: "2024-01-15 14:22:10",
    user: "IT Manager",
    userRole: "it",
    action: "UPDATE",
    table: "assets",
    recordId: "asset-001",
    recordName: "MCD-01 - Dell Desktop",
    changes: [
      { field: "status", oldValue: "available", newValue: "allocated" },
      { field: "assigned_to", oldValue: "—", newValue: "John Doe" }
    ],
    ipAddress: "192.168.1.105"
  },
  {
    id: "3",
    timestamp: "2024-01-16 09:15:33",
    user: "HR Admin",
    userRole: "admin",
    action: "INSERT",
    table: "employees",
    recordId: "emp-001",
    recordName: "Jane Smith",
    changes: [],
    ipAddress: "192.168.1.110"
  }
];

export default function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [dateRange, setDateRange] = useState("7");

  const filteredData = mockAuditData.filter((entry) => {
    const matchesSearch = 
      entry.recordName.toLowerCase().includes(search.toLowerCase()) ||
      entry.user.toLowerCase().includes(search.toLowerCase()) ||
      entry.table.toLowerCase().includes(search.toLowerCase());
    
    const matchesTable = tableFilter === "all" || entry.table === tableFilter;
    const matchesAction = actionFilter === "all" || entry.action === actionFilter;
    
    return matchesSearch && matchesTable && matchesAction;
  });

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
      default:
        return <History className="h-4 w-4 text-accent" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-accent" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete history of all changes in the system
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-muted/30 border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search records, users, or tables..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9 bg-white" 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="locations">Locations</SelectItem>
                  <SelectItem value="licenses">Licenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry && getActionIcon(selectedEntry.action)}
              Audit Entry Details
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Timestamp</p>
                  <p className="font-medium">{selectedEntry.timestamp}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">User</p>
                  <p className="font-medium">{selectedEntry.user} ({selectedEntry.userRole})</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Action</p>
                  <p className="font-medium">{selectedEntry.action}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase">Table</p>
                  <p className="font-medium capitalize">{selectedEntry.table}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase">Record</p>
                  <p className="font-medium">{selectedEntry.recordName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedEntry.recordId}</p>
                </div>
                {selectedEntry.ipAddress && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">IP Address</p>
                    <p className="font-mono text-xs">{selectedEntry.ipAddress}</p>
                  </div>
                )}
              </div>

              {selectedEntry.changes.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase mb-2">Changes</p>
                  <div className="space-y-2">
                    {selectedEntry.changes.map((change, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
                        <p className="font-medium capitalize mb-1">{change.field}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="line-through text-muted-foreground">{change.oldValue || '—'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-accent font-medium">{change.newValue || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
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
