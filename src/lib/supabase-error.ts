export function parseDbError(err: unknown): string {
  if (!err) return "An unknown error occurred";

  // Always log the raw error so it appears in browser devtools
  console.error("[Supabase error]", err);

  const e = err as any;
  const code: string = e?.code ?? "";
  const msg: string = e?.message ?? String(err);
  const details: string = e?.details ?? "";
  const hint: string = e?.hint ?? "";

  const codes: Record<string, string> = {
    "23505": "A record with this code or name already exists",
    "23503": "Cannot delete — this record is referenced by other data",
    "23514": "Value violates a database constraint",
    "42501": "Permission denied — your account may need approval or a higher role",
    "PGRST116": "Record not found",
    "PGRST301": "Request timed out — please try again",
    // PGRST204 on UPDATE means 0 rows matched the WHERE clause (row hidden by RLS or doesn't exist)
    "PGRST204": "Save failed — the record could not be found. Try refreshing the page.",
  };

  if (codes[code]) return codes[code];
  if (msg.includes("duplicate key")) return "A record with this code or name already exists";
  if (msg.includes("violates foreign key")) return "Cannot delete — this record is in use elsewhere";
  if (msg.includes("violates row-level security") || msg.includes("new row violates row-level security"))
    return "Permission denied — ensure your account is approved and has the correct role";
  if (msg.includes("JWT expired") || msg.includes("invalid JWT"))
    return "Your session has expired — please sign in again";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch"))
    return "Network error — check your internet connection and try again";

  // Surface hint or details if present, otherwise fall back to raw message
  if (hint) return hint;
  if (details) return details;
  return msg;
}
