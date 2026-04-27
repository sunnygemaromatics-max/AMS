import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRightLeft, UserCheck, UserX, MapPin } from "lucide-react";
import { useEmployees, useLocations, useCreateTransaction } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { exportHandoverSlip } from "@/lib/pdf";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TxType = Database["public"]["Enums"]["transaction_type"];
type Mode = Extract<TxType, "allocation" | "return" | "transfer">;

interface Props {
  asset: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultMode?: Mode;
}

const CONDITIONS = ["Good", "Fair", "Damaged", "Needs Repair", "New"];

export function AllocationDialog({ asset, open, onOpenChange, defaultMode = "allocation" }: Props) {
  const { profile, user, canWrite } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const createTx = useCreateTransaction();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>(asset?.current_location_id || "");
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  const [downloadSlip, setDownloadSlip] = useState(true);

  const currentEmp = useMemo(
    () => employees.find((e: any) => e.id === asset?.current_employee_id),
    [employees, asset]
  );
  const selectedEmp = useMemo(
    () => employees.find((e: any) => e.id === employeeId),
    [employees, employeeId]
  );
  const selectedLoc = useMemo(
    () => locations.find((l: any) => l.id === locationId),
    [locations, locationId]
  );

  const reset = () => {
    setEmployeeId("");
    setLocationId(asset?.current_location_id || "");
    setCondition("Good");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!canWrite) {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    if (mode !== "return" && !employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!locationId) {
      toast.error("Please select a location.");
      return;
    }

    try {
      await createTx.mutateAsync({
        asset_id: asset.id,
        transaction_type: mode,
        from_employee_id: asset.current_employee_id || null,
        from_location_id: asset.current_location_id || null,
        to_employee_id: mode === "return" ? null : employeeId,
        to_location_id: locationId,
        condition_status: condition,
        notes: notes || null,
        performed_by: user?.id || null,
      });

      toast.success(
        mode === "allocation" ? "Asset allocated successfully" :
        mode === "return" ? "Asset returned successfully" :
        "Asset transferred successfully"
      );

      if (downloadSlip) {
        exportHandoverSlip({
          asset,
          mode,
          fromEmployee: currentEmp,
          toEmployee: mode === "return" ? null : selectedEmp,
          location: selectedLoc,
          condition,
          notes,
          performedBy: profile?.full_name || user?.email || "System",
          date: new Date(),
        });
      }

      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to record transaction");
    }
  };

  const title = mode === "allocation" ? "Allocate Asset" : mode === "return" ? "Return Asset" : "Transfer Asset";
  const Icon = mode === "allocation" ? UserCheck : mode === "return" ? UserX : ArrowRightLeft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-accent" /> {title}
          </DialogTitle>
          <DialogDescription>
            {asset?.sap_code} — {asset?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="allocation"><UserCheck className="h-3.5 w-3.5 mr-1" />Allocate</TabsTrigger>
            <TabsTrigger value="transfer"><ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Transfer</TabsTrigger>
            <TabsTrigger value="return"><UserX className="h-3.5 w-3.5 mr-1" />Return</TabsTrigger>
          </TabsList>
        </Tabs>

        {currentEmp && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Currently with: </span>
            <span className="font-medium">{currentEmp.name}</span>
            {asset.locations?.name && <Badge variant="outline" className="ml-2 text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{asset.locations.name}</Badge>}
          </div>
        )}

        <div className="space-y-4">
          {mode !== "return" && (
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
          )}

          <div className="space-y-1.5">
            <Label>{mode === "return" ? "Return to Location *" : "Location *"}</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} <span className="text-muted-foreground text-xs ml-1">({l.code})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label>Performed By</Label>
              <Input value={profile?.full_name || user?.email || ""} disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Handover details, accessories, observations..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={downloadSlip}
              onChange={(e) => setDownloadSlip(e.target.checked)}
              className="rounded border-input"
            />
            Generate signed handover slip (PDF)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTx.isPending || !canWrite}>
            {createTx.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirm {mode === "allocation" ? "Allocation" : mode === "return" ? "Return" : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
