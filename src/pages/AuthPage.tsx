import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, Lock, User, CheckCircle2, AtSign } from "lucide-react";

const emailSchema    = z.string().trim().email("Enter a valid email").max(255);
const pwSchema       = z.string().min(8, "Password must be at least 8 characters").max(72);
const nameSchema     = z.string().trim().min(2, "Name must be at least 2 characters").max(100);
const usernameSchema = z.string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or less")
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores");

type View = "login" | "signup" | "forgot" | "forgot_sent";

function suggestUsername(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 20);
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [view, setView]       = useState<View>("login");
  const [busy, setBusy]       = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Login — accepts email OR username
  const [loginId, setLoginId]   = useState("");
  const [loginPw, setLoginPw]   = useState("");

  // Signup
  const [signupName,     setSignupName]     = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail,    setSignupEmail]    = useState("");
  const [signupPw,       setSignupPw]       = useState("");
  const [signupPw2,      setSignupPw2]      = useState("");

  // Forgot
  const [forgotEmail, setForgotEmail] = useState("");

  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPw) { toast.error("Enter your credentials"); return; }
    setBusy(true);

    let email = loginId.trim();

    // Username login: no "@" → look up email via DB function
    if (!email.includes("@")) {
      const { data: found, error: rpcErr } = await supabase.rpc("get_email_by_username", { p_username: email });
      if (rpcErr || !found) {
        toast.error("No account found with that username");
        setBusy(false);
        return;
      }
      email = found as string;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPw });
    setBusy(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) toast.error("Incorrect credentials");
      else toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      nav("/");
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      usernameSchema.parse(signupUsername);
      emailSchema.parse(signupEmail);
      pwSchema.parse(signupPw);
    } catch (err: any) { toast.error(err.errors?.[0]?.message || "Invalid input"); return; }
    if (signupPw !== signupPw2) { toast.error("Passwords do not match"); return; }

    setBusy(true);

    // Check username availability
    const { data: avail } = await supabase.rpc("username_available", { p_username: signupUsername });
    if (!avail) {
      toast.error("Username is already taken — choose another");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPw,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: signupName, username: signupUsername.toLowerCase() },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Account created — an admin will approve your access shortly.");
      setView("login");
    }
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full tsi-gradient opacity-20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full tsi-gradient opacity-20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden tsi-gradient">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12 animate-fade-in">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-tight">TSI</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">The Studio Infinito</p>
              <p className="text-white/80 text-xs uppercase tracking-wider">Asset Management System</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4 animate-fade-in-up stagger-1">
            Manage your<br />
            <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">enterprise assets</span><br />
            intelligently.
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm animate-fade-in-up stagger-2">
            Track, allocate, and audit every asset across your organisation — from laptops to licenses — in one secure platform.
          </p>
        </div>
        <div className="relative space-y-3">
          {["Real-time asset tracking", "Role-based access control", "Complete audit trail", "Warranty & license alerts"].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </div>
              <span className="text-white/90 text-sm">{f}</span>
            </div>
          ))}
          <p className="text-muted-foreground/60 text-xs pt-6">© Personify Crafters – All Rights Reserved</p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl tsi-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-black text-xs">TSI</span>
            </div>
            <div>
              <p className="text-foreground font-bold text-sm">The Studio Infinito</p>
              <p className="text-primary text-xs">Asset Management System</p>
            </div>
          </div>

          {/* ── LOGIN ─────────────────────────────────────────────────────── */}
          {view === "login" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tsi-gradient-text">Welcome back</h2>
                <p className="text-muted-foreground text-sm mt-1">Use your email address or @username.</p>
              </div>
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Email or Username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      value={loginId} onChange={e => setLoginId(e.target.value)}
                      className="pl-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="you@example.com or your_username" required maxLength={255}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground text-sm font-medium">Password</Label>
                    <button type="button" onClick={() => setView("forgot")} className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      type={showPw ? "text" : "password"} value={loginPw} onChange={e => setLoginPw(e.target.value)}
                      className="pl-10 pr-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="••••••••" required maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={busy}
                  className="w-full tsi-gradient hover:opacity-90 text-white font-semibold h-11 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign in
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground/70">
                Don't have an account?{" "}
                <button type="button" onClick={() => setView("signup")} className="text-primary hover:text-primary/80 font-medium">
                  Sign up
                </button>
              </p>
            </div>
          )}

          {/* ── SIGNUP ────────────────────────────────────────────────────── */}
          {view === "signup" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tsi-gradient-text">Create account</h2>
                <p className="text-muted-foreground text-sm mt-1">New accounts require admin approval before access.</p>
              </div>
              <form onSubmit={onSignup} className="space-y-4">
                {/* Full name */}
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      value={signupName}
                      onChange={e => {
                        setSignupName(e.target.value);
                        if (!signupUsername) setSignupUsername(suggestUsername(e.target.value));
                      }}
                      className="pl-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Rahul Sharma" required maxLength={100}
                    />
                  </div>
                </div>
                {/* Username */}
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">
                    Username <span className="text-muted-foreground/70 text-xs">(used to sign in, lowercase, no spaces)</span>
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      value={signupUsername}
                      onChange={e => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="pl-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="rahul_sharma" required minLength={3} maxLength={20}
                    />
                  </div>
                </div>
                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                      className="pl-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="you@example.com" required maxLength={255}
                    />
                  </div>
                </div>
                {/* Password */}
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      type={showPw ? "text" : "password"} value={signupPw} onChange={e => setSignupPw(e.target.value)}
                      className="pl-10 pr-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Min 8 characters" required minLength={8} maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      type={showPw2 ? "text" : "password"} value={signupPw2} onChange={e => setSignupPw2(e.target.value)}
                      className="pl-10 pr-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Re-enter password" required minLength={8} maxLength={72}
                    />
                    <button type="button" onClick={() => setShowPw2(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground">
                      {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={busy}
                  className="w-full tsi-gradient hover:opacity-90 text-white font-semibold h-11 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create account
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground/70">
                Already have an account?{" "}
                <button type="button" onClick={() => setView("login")} className="text-primary hover:text-primary/80 font-medium">
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── FORGOT PASSWORD ───────────────────────────────────────────── */}
          {view === "forgot" && (
            <div className="space-y-6">
              <button type="button" onClick={() => setView("login")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
              <div>
                <h2 className="text-3xl font-bold tsi-gradient-text">Reset password</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter your account email and we'll send you a reset link.</p>
              </div>
              <form onSubmit={onForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      className="pl-10 bg-card/80 backdrop-blur-sm border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="you@example.com" required maxLength={255}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy}
                  className="w-full tsi-gradient hover:opacity-90 text-white font-semibold h-11 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send reset link
                </Button>
              </form>
            </div>
          )}

          {/* ── FORGOT SENT ───────────────────────────────────────────────── */}
          {view === "forgot_sent" && (
            <div className="space-y-6 text-center">
              <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center mx-auto animate-scale-in">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tsi-gradient-text">Check your inbox</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  We've sent a reset link to <span className="text-foreground font-semibold">{forgotEmail}</span>. The link expires in 1 hour.
                </p>
              </div>
              <Button type="button" variant="outline"
                className="w-full hover:bg-primary/5 hover:border-primary/40"
                onClick={() => { setForgotEmail(""); setView("login"); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back to sign in
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground/60 mt-10 lg:hidden">
            © Personify Crafters – All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
