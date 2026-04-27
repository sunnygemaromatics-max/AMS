import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, Lock, User, CheckCircle2 } from "lucide-react";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const pwSchema   = z.string().min(8, "Password must be at least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(100);

type View = "login" | "signup" | "forgot" | "forgot_sent";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [view, setView]         = useState<View>("login");
  const [busy, setBusy]         = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [showPw2, setShowPw2]   = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw]       = useState("");

  // Signup fields
  const [signupName,  setSignupName]  = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPw,    setSignupPw]    = useState("");
  const [signupPw2,   setSignupPw2]   = useState("");

  // Forgot fields
  const [forgotEmail, setForgotEmail] = useState("");

  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(loginEmail); pwSchema.parse(loginPw); }
    catch (err: any) { toast.error(err.errors?.[0]?.message || "Invalid input"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
    setBusy(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) toast.error("Incorrect email or password");
      else toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      nav("/");
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try { nameSchema.parse(signupName); emailSchema.parse(signupEmail); pwSchema.parse(signupPw); }
    catch (err: any) { toast.error(err.errors?.[0]?.message || "Invalid input"); return; }
    if (signupPw !== signupPw2) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPw,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: signupName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — an admin will approve your access shortly.");
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(forgotEmail); }
    catch (err: any) { toast.error(err.errors?.[0]?.message || "Enter a valid email"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else setView("forgot_sent");
  };

  // ── Shared layout wrappers ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-transparent to-blue-600/10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-tight">TSI</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">The Studio Infinito</p>
              <p className="text-emerald-400 text-xs">Asset Management System</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage your<br />
            <span className="text-emerald-400">enterprise assets</span><br />
            intelligently.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Track, allocate, and audit every asset across your organisation — from laptops to licenses — in one secure platform.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative space-y-3">
          {[
            { label: "Real-time asset tracking" },
            { label: "Role-based access control" },
            { label: "Bulk import & audit logs" },
            { label: "Warranty & license alerts" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-slate-300 text-sm">{f.label}</span>
            </div>
          ))}
          <p className="text-slate-600 text-xs pt-6">
            © Personify Crafters – All Rights Reserved<br />
            Designed &amp; Developed by Personify Crafters
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">TSI</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">The Studio Infinito</p>
              <p className="text-emerald-400 text-xs">Asset Management System</p>
            </div>
          </div>

          {/* ── LOGIN ─────────────────────────────────────────────────────── */}
          {view === "login" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Sign in</h2>
                <p className="text-slate-400 text-sm mt-1">Enter your credentials to access the system.</p>
              </div>
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="you@example.com" required maxLength={255}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300 text-sm">Password</Label>
                    <button type="button" onClick={() => setView("forgot")} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPw ? "text" : "password"} value={loginPw} onChange={e => setLoginPw(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="••••••••" required maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={busy}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign in
                </Button>
              </form>
              <p className="text-center text-sm text-slate-500">
                Don't have an account?{" "}
                <button type="button" onClick={() => setView("signup")} className="text-emerald-400 hover:text-emerald-300 font-medium">
                  Sign up
                </button>
              </p>
            </div>
          )}

          {/* ── SIGNUP ────────────────────────────────────────────────────── */}
          {view === "signup" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Create account</h2>
                <p className="text-slate-400 text-sm mt-1">New accounts require admin approval before access.</p>
              </div>
              <form onSubmit={onSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={signupName} onChange={e => setSignupName(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Rahul Sharma" required maxLength={100}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="you@example.com" required maxLength={255}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPw ? "text" : "password"} value={signupPw} onChange={e => setSignupPw(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Min 8 characters" required minLength={8} maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPw2 ? "text" : "password"} value={signupPw2} onChange={e => setSignupPw2(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Re-enter password" required minLength={8} maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw2(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={busy}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create account
                </Button>
              </form>
              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button type="button" onClick={() => setView("login")} className="text-emerald-400 hover:text-emerald-300 font-medium">
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── FORGOT PASSWORD ───────────────────────────────────────────── */}
          {view === "forgot" && (
            <div className="space-y-6">
              <button type="button" onClick={() => setView("login")}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">Reset password</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Enter your account email and we'll send you a reset link.
                </p>
              </div>
              <form onSubmit={onForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="you@example.com" required maxLength={255}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send reset link
                </Button>
              </form>
            </div>
          )}

          {/* ── FORGOT SENT ───────────────────────────────────────────────── */}
          {view === "forgot_sent" && (
            <div className="space-y-6 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Check your inbox</h2>
                <p className="text-slate-400 text-sm mt-2">
                  We've sent a password reset link to <span className="text-white font-medium">{forgotEmail}</span>.
                  The link expires in 1 hour.
                </p>
              </div>
              <Button type="button" variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full"
                onClick={() => { setForgotEmail(""); setView("login"); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back to sign in
              </Button>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-700 mt-10 lg:hidden">
            © Personify Crafters – All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
