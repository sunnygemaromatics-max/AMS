import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (!profile || profile.approval_status === "pending") {
    return (
      <div className="min-h-screen grid place-items-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 grid place-items-center mb-2">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Awaiting approval</CardTitle>
            <CardDescription>Your account is pending review by an administrator. You'll get access once approved.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" className="w-full" onClick={signOut}>Sign out</Button></CardContent>
        </Card>
      </div>
    );
  }

  if (profile.approval_status === "rejected") {
    return (
      <div className="min-h-screen grid place-items-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 grid place-items-center mb-2">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>Your account access has been rejected. Contact your administrator.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" className="w-full" onClick={signOut}>Sign out</Button></CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
