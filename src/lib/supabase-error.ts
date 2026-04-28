export function parseDbError(err: unknown): string {
  if (!err) return "An unknown error occurred";
  const e = err as any;
  const code: string = e?.code ?? "";
  const msg: string = e?.message ?? String(err);

  const codes: Record<string, string> = {
    "23505": "A record with this code or name already exists",
    "23503": "Cannot delete — this record is referenced by other data",
    "23514": "Value violates a database constraint (check allowed values)",
    "42501": "Permission denied — your account may need approval or a higher role",
    "PGRST116": "Record not found",
    "PGRST301": "Request timed out — please try again",
    "PGRST204": "Nothing was updated — record may not exist",
  };

  if (codes[code]) return codes[code];
  if (msg.includes("duplicate key")) return "A record with this code or name already exists";
  if (msg.includes("violates foreign key")) return "Cannot delete — this record is in use elsewhere";
  if (msg.includes("violates row-level security")) return "Permission denied — ensure your account is approved and has the correct role";
  if (msg.includes("JWT expired")) return "Your session has expired — please sign in again";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "Network error — check your connection";
  return msg;
}
