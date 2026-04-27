import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";

const pwSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

type PageState = "waiting" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [pageState, setPageState] = useState<PageState>("waiting");
  const [newPw, setNewPw]         = useState("");
  const [newPw2, setNewPw2]       = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [busy, setBusy]           = useState(false);
  const [errorMsg, setErrorMsg]   = useState("");

  useEffect(() => {
    // Supabase automatically parses the URL hash and fires onAuthStateChange.
    // When the user arrives from the reset email, the event is PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    // Also check if we already have an active session (e.g. page reload).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState("ready");
      else {
        // No session and no PASSWORD_RECOVERY event after a brief wait → invalid/expired link.
        setTimeout(() => {
          setPageState(prev => prev === "waiting" ? "error" : prev);
        }, 3000);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { pwSchema.parse(newPw); }
    catch (err: any) { toast.error(err.errors?.[0]?.message || "Invalid password"); return; }
    if (newPw !== newPw2) { toast.error("Passwords do not match"); return; }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      setErrorMsg(error.message);
    } else {
      setPageState("success");
      toast.success("Password updated successfully!");
      setTimeout(() => nav("/"), 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-sm">TSI</span>
          </div>
          <p className="text-slate-400 text-xs">The Studio Infinito · Asset Management System</p>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">

          {/* Waiting for Supabase auth state */}
          {pageState === "waiting" && (
            <div className="text-center space-y-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
              <p className="text-slate-300">Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {pageState === "error" && (
            <div className="text-center space-y-4 py-4">
              <div className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Link expired or invalid</h2>
                <p className="text-slate-400 text-sm mt-2">
                  This password reset link has expired or is invalid. Please request a new one.
                </p>
                {errorMsg && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
              </div>
              <Button onClick={() => nav("/auth")}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                Back to sign in
              </Button>
            </div>
          )}

          {/* Password form */}
          {pageState === "ready" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Set new password</h2>
                <p className="text-slate-400 text-sm mt-1">Choose a strong password for your account.</p>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Min 8 characters" required minLength={8} maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPw ? "text" : "password"} value={newPw2} onChange={e => setNewPw2(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Re-enter password" required minLength={8} maxLength={72}
                    />
                  </div>
                </div>

                {/* Password strength hint */}
                <ul className="text-xs text-slate-500 space-y-0.5">
                  <li className={newPw.length >= 8 ? "text-emerald-400" : ""}>✓ At least 8 characters</li>
                  <li className={/[A-Z]/.test(newPw) ? "text-emerald-400" : ""}>✓ One uppercase letter</li>
                  <li className={/[0-9]/.test(newPw) ? "text-emerald-400" : ""}>✓ One number</li>
                </ul>

                <Button type="submit" disabled={busy}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update password
                </Button>
              </form>
            </div>
          )}

          {/* Success */}
          {pageState === "success" && (
            <div className="text-center space-y-4 py-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Password updated!</h2>
                <p className="text-slate-400 text-sm mt-2">Redirecting you to the dashboard…</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400 mx-auto" />
            </div>
          )}

        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          © Personify Crafters – All Rights Reserved
        </p>
      </div>
    </div>
  );
}
