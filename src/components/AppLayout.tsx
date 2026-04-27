import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, Sun, Moon } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandingLoader } from "@/components/BrandingLoader";
import { useTheme } from "next-themes";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <SidebarProvider>
      <BrandingLoader />
      <div className="min-h-screen flex w-full flex-col">
        <div className="flex flex-1 min-h-0">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <span className="text-sidebar-primary-foreground font-bold text-xs">TSI</span>
                </div>
                <span className="font-semibold text-sm hidden sm:inline">Asset Management System</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs uppercase hidden md:flex">{r}</Badge>
                ))}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">
                          {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden md:inline text-sm">{profile?.full_name || user.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="font-medium">{profile?.full_name || "User"}</div>
                        <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
            <footer className="shrink-0 border-t bg-card px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                AMS v2.0 &mdash; The Studio Infinito
              </span>
              <span className="text-xs text-muted-foreground">
                Designed &amp; developed by{" "}
                <span className="font-medium text-foreground">Personify Crafters</span>
                {" "}— All Rights Reserved
              </span>
            </footer>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
