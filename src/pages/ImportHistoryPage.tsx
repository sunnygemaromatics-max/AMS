import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  History, Download, FileText, Loader2, ArrowLeft, AlertCircle, CheckCircle2, Undo2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { downloadCsv } from "@/lib/importHelpers";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Run {
  id: string;
  created_at: string;
  performed_by_name: string | null;
  file_names: string[];
  total_rows: number;
  inserted: number;
  skipped: number;
  failed: number;
  details: any;
  snapshot: any;
  inserted_ids: any;
  rolled_back_at: string | null;
  rolled_back_by: string | null;
}

export default function ImportHistoryPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Run | null>(null);
  const [confirmRollback, setConfirmRollback] = useState<Run | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("import_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRuns((data as Run[]) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const downloadErrorReport = (run: Run) => {
    const flat: Record<string, any>[] = [];
    const details = Array.isArray(run.details) ? run.details : [];
    details.forEach((entry: any) => {
      (entry.errors || []).forEach((e: any) => {
        flat.push({
          file: entry.file || "",
          sheet: entry.sheet || "",
          kind: entry.kind || "",
          row_number: e.row ?? "",
          identifier: e.identifier ?? "",
          column: e.column ?? "",
          error: e.message ?? String(e),
        });
      });
    });
    if (!flat.length) flat.push({ note: "No errors recorded for this run." });
    downloadCsv(`import_errors_${run.id.slice(0, 8)}.csv`, flat);
  };

  const performRollback = async (run: Run) => {
    setRollingBack(true);
    try {
      const inserts: { table: string; id: string }[] = Array.isArray(run.inserted_ids) ? run.inserted_ids : [];
      const updates: { table: string; before: any }[] = run.snapshot?.updates || [];

      // 1) Delete inserted rows. Order matters for FK: transactions → assets/licenses → employees
      const order = ["asset_transactions", "licenses", "assets", "employees"];
      const grouped = new Map<string, string[]>();
      inserts.forEach((x) => {
        if (!grouped.has(x.table)) grouped.set(x.table, []);
        grouped.get(x.table)!.push(x.id);
      });
      let delErrors = 0;
      for (const tbl of order) {
        const ids = grouped.get(tbl);
        if (!ids?.length) continue;
        const { error } = await supabase.from(tbl as any).delete().in("id", ids);
        if (error) delErrors++;
      }

      // 2) Restore updated rows from before-state
      let updErrors = 0;
      for (const u of updates) {
        if (!u?.before?.id) continue;
        // Strip server-managed fields
        const { created_at, updated_at, ...payload } = u.before;
        const { error } = await supabase.from(u.table as any).update(payload).eq("id", u.before.id);
        if (error) updErrors++;
      }

      // 3) Mark run as rolled back
      const { error: rbErr } = await supabase
        .from("import_runs")
        .update({ rolled_back_at: new Date().toISOString(), rolled_back_by: user?.id || null })
        .eq("id", run.id);

      if (delErrors + updErrors + (rbErr ? 1 : 0) === 0) {
        toast.success(`Rolled back: deleted ${inserts.length} inserts, restored ${updates.length} updates`);
      } else {
        toast.warning(`Rollback completed with ${delErrors + updErrors} issues — check audit log`);
      }
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Rollback failed");
    } finally {
      setRollingBack(false);
      setConfirmRollback(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-7 w-7" /> Import History
          </h1>
          <p className="text-muted-foreground">Past bulk imports with downloadable error reports and one-click rollback.</p>
        </div>
        <Button asChild variant="outline"><Link to="/import"><ArrowLeft className="h-4 w-4 mr-2" />Back to Import</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs ({runs.length})</CardTitle>
          <CardDescription>Last 100 import operations across all users.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No imports yet. Run your first import from the Bulk Import page.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Applied</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => {
                    const isRolledBack = !!r.rolled_back_at;
                    const insertCount = Array.isArray(r.inserted_ids) ? r.inserted_ids.length : 0;
                    const updateCount = r.snapshot?.updates?.length || 0;
                    const canRollback = !isRolledBack && (insertCount + updateCount) > 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell className="text-sm">{r.performed_by_name || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate">{r.file_names.join(", ")}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{r.total_rows}</TableCell>
                        <TableCell className="text-right"><Badge variant="default" className="font-mono">{r.inserted}</Badge></TableCell>
                        <TableCell className="text-right"><Badge variant="secondary" className="font-mono">{r.skipped}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Badge variant={r.failed > 0 ? "destructive" : "outline"} className="font-mono">{r.failed}</Badge>
                        </TableCell>
                        <TableCell>
                          {isRolledBack ? (
                            <Badge variant="outline" className="text-[10px]">
                              <Undo2 className="h-3 w-3 mr-1" />rolled back
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px]">applied</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setSelected(r)} title="View details">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => downloadErrorReport(r)} disabled={r.failed === 0} title="Download error CSV">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmRollback(r)}
                              disabled={!canRollback}
                              title={canRollback ? "Roll back this run" : isRolledBack ? "Already rolled back" : "Nothing to roll back"}
                              className={canRollback ? "text-destructive hover:text-destructive" : ""}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import details</DialogTitle>
            <DialogDescription>
              {selected && format(new Date(selected.created_at), "PPpp")} · by {selected?.performed_by_name || "—"}
              {selected?.rolled_back_at && (
                <span className="ml-2 text-destructive">· rolled back {format(new Date(selected.rolled_back_at), "PPpp")}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                Snapshot stored: {Array.isArray(selected.inserted_ids) ? selected.inserted_ids.length : 0} new records,{" "}
                {selected.snapshot?.updates?.length || 0} pre-update backups.
              </div>
              {(Array.isArray(selected.details) ? selected.details : []).map((d: any, i: number) => (
                <div key={i} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{d.file} → {d.sheet}</div>
                    <div className="flex gap-1">
                      <Badge>{d.kind}</Badge>
                      {d.strategy && <Badge variant="outline" className="text-[10px]">dup: {d.strategy}</Badge>}
                    </div>
                  </div>
                  <div className="text-xs grid grid-cols-4 gap-2 mb-2">
                    <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> {d.inserted ?? 0} new</div>
                    <div>↻ {d.updated ?? 0} updated</div>
                    <div>{d.skipped ?? 0} skipped</div>
                    <div className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-destructive" /> {d.errors?.length ?? 0} errors</div>
                  </div>
                  {d.errors && d.errors.length > 0 && (
                    <div className="bg-muted/50 rounded p-2 max-h-40 overflow-y-auto text-xs space-y-1 font-mono">
                      {d.errors.slice(0, 50).map((e: any, j: number) => (
                        <div key={j}>Row {e.row} [{e.column || "—"}] {e.identifier}: {e.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRollback} onOpenChange={(o) => !o && setConfirmRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back this import?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  This will <b>delete</b>{" "}
                  {Array.isArray(confirmRollback?.inserted_ids) ? confirmRollback.inserted_ids.length : 0} newly-created records and{" "}
                  <b>restore</b> {confirmRollback?.snapshot?.updates?.length || 0} updated records to their previous state.
                </div>
                <div className="text-xs text-muted-foreground">
                  Run from {confirmRollback && format(new Date(confirmRollback.created_at), "PPpp")} by {confirmRollback?.performed_by_name || "—"}.
                </div>
                <div className="text-xs text-destructive">
                  This action cannot be undone. Any records modified manually after this import will be overwritten.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmRollback && performRollback(confirmRollback); }}
              disabled={rollingBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rollingBack && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Roll back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
