import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

const emailSchema = z.string().trim().email().max(255);
const pwSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(1).max(100);

export default function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPw, setSignupPw] = useState("");

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (user) return <Navigate to="/" replace />;

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      pwSchema.parse(loginPw);
    } catch (err: any) { toast.error(err.errors?.[0]?.message || "Invalid input"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back"); nav("/"); }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      pwSchema.parse(signupPw);
    } catch (err: any) { toast.error(err.errors?.[0]?.message || "Invalid input"); return; }
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
    else { toast.success("Account created — awaiting admin approval"); nav("/"); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground grid place-items-center mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Asset Management System</CardTitle>
          <CardDescription>Enterprise asset intelligence platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required maxLength={255} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required maxLength={72} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Full name</Label><Input value={signupName} onChange={(e) => setSignupName(e.target.value)} required maxLength={100} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required maxLength={255} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={signupPw} onChange={(e) => setSignupPw(e.target.value)} required minLength={8} maxLength={72} /><p className="text-xs text-muted-foreground">Min 8 chars. Checked against breach database.</p></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</Button>
                <p className="text-xs text-center text-muted-foreground">New accounts require admin approval before access.</p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
