import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserCheck, ArrowRightLeft, Download, X, FileText, FileArchive, AlertTriangle } from "lucide-react";
import { useEmployees, useLocations, useCreateTransaction } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { exportAssetReport, buildBinCardBlob } from "@/lib/pdf";
import { toast } from "sonner";
import JSZip from "jszip";

type Mode = "allocation" | "transfer";
const CONDITIONS = ["Good", "Fair", "Damaged", "Needs Repair", "New"];

interface Props {
  selected: any[];
  onClear: () => void;
}

export function BulkActionsBar({ selected, onClear }: Props) {
  const { user, profile, canWrite } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const createTx = useCreateTransaction();

  const [dialogMode, setDialogMode] = useState<Mode | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Strict validation: which assets are eligible for the chosen mode?
  const partition = useMemo(() => {
    if (!dialogMode) return { valid: [], invalid: [] };
    const required = dialogMode === "allocation" ? "available" : "allocated";
    const valid = selected.filter((a) => a.status === required);
    const invalid = selected.filter((a) => a.status !== required);
    return { valid, invalid };
  }, [selected, dialogMode]);

  const reset = () => {
    setDialogMode(null);
    setEmployeeId("");
    setLocationId("");
    setCondition("Good");
    setNotes("");
  };

  const submit = async () => {
    if (!canWrite) return toast.error("You don't have permission.");
    if (partition.invalid.length > 0) {
      return toast.error(
        `${partition.invalid.length} asset(s) have the wrong status. Deselect them or change the action.`
      );
    }
    if (!employeeId) return toast.error("Please select an employee.");
    if (!locationId) return toast.error("Please select a location.");

    setWorking(true);
    try {
      // Sequential to keep audit ordering deterministic
      for (const asset of partition.valid) {
        await createTx.mutateAsync({
          asset_id: asset.id,
          transaction_type: dialogMode!,
          from_employee_id: asset.current_employee_id || null,
          from_location_id: asset.current_location_id || null,
          to_employee_id: employeeId,
          to_location_id: locationId,
          condition_status: condition,
          notes: notes || null,
          performed_by: user?.id || null,
        });
      }
      toast.success(
        `${partition.valid.length} asset(s) ${dialogMode === "allocation" ? "allocated" : "transferred"} successfully`
      );
      reset();
      onClear();
    } catch (e: any) {
      toast.error(e.message || "Bulk action failed");
    } finally {
      setWorking(false);
    }
  };

  const exportRegister = () => {
    exportAssetReport(selected);
    toast.success(`Exported register for ${selected.length} asset(s)`);
  };

  const exportBinCardsZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      // Fetch transactions for all selected assets in parallel
      const txResults = await Promise.all(
        selected.map((a) =>
          supabase
            .from("asset_transactions")
            .select("*, employees!asset_transactions_to_employee_id_fkey(name), locations!asset_transactions_to_location_id_fkey(name)")
            .eq("asset_id", a.id)
            .order("created_at", { ascending: false })
        )
      );
      selected.forEach((asset, i) => {
        const txs = txResults[i].data || [];
        const blob = buildBinCardBlob(asset, txs);
        zip.file(`bin-card-${asset.sap_code}.pdf`, blob);
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bin-cards-${new Date().toISOString().split("T")[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Generated ${selected.length} bin cards`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate zip");
    } finally {
      setZipping(false);
    }
  };

  if (selected.length === 0) return null;

  const requiredStatus = dialogMode === "allocation" ? "available" : "allocated";

  return (
    <>
      <div className="sticky bottom-4 z-30 mx-auto max-w-3xl">
        <div className="flex items-center gap-2 rounded-xl border bg-card/95 backdrop-blur shadow-lg px-3 py-2">
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {selected.length} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {canWrite && (
              <>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setDialogMode("allocation")}>
                  <UserCheck className="h-3.5 w-3.5 mr-1" /> Allocate
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setDialogMode("transfer")}>
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transfer
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default" className="h-8" disabled={zipping}>
                  {zipping ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportRegister}>
                  <FileText className="h-4 w-4 mr-2" /> Asset register PDF (single)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportBinCardsZip}>
                  <FileArchive className="h-4 w-4 mr-2" /> Bin cards (one per asset, .zip)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={!!dialogMode} onOpenChange={(o) => { if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMode === "allocation" ? <UserCheck className="h-5 w-5 text-accent" /> : <ArrowRightLeft className="h-5 w-5 text-accent" />}
              Bulk {dialogMode === "allocation" ? "Allocate" : "Transfer"} — {selected.length} asset(s)
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "allocation"
                ? "Allocate all selected available assets to one employee."
                : "Transfer all selected allocated assets to one employee/location."}
            </DialogDescription>
          </DialogHeader>

          {partition.invalid.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {partition.invalid.length} asset(s) cannot be {dialogMode === "allocation" ? "allocated" : "transferred"}
              </div>
              <p className="text-muted-foreground">
                Only assets with status <span className="font-medium">{requiredStatus}</span> are allowed.
                Deselect these or change the action:
              </p>
              <ul className="max-h-24 overflow-y-auto pl-4 list-disc text-muted-foreground">
                {partition.invalid.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <span className="font-mono">{a.sap_code}</span> — {a.name} <span className="opacity-70">({a.status})</span>
                  </li>
                ))}
                {partition.invalid.length > 8 && <li>...and {partition.invalid.length - 8} more</li>}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>To Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} <span className="text-muted-foreground text-xs ml-1">({e.employee_code} • {e.department})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} <span className="text-muted-foreground text-xs ml-1">({l.code})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (applied to all)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes recorded on every transaction..." />
            </div>
            <div className="text-xs text-muted-foreground">
              Performed by: <span className="font-medium">{profile?.full_name || user?.email}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={working || partition.invalid.length > 0 || partition.valid.length === 0}
            >
              {working && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirm for {partition.valid.length} asset(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
