import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandingLoader } from "@/components/BrandingLoader";
import { TsiLogo } from "@/components/TsiLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <BrandingLoader />
      <div className="min-h-screen flex w-full flex-col">
        <div className="flex flex-1 min-h-0">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 flex items-center px-4 gap-4 shrink-0 sticky top-0 z-30 glass-strong border-b border-border/50">
              <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-colors" />
              <div className="flex items-center gap-2.5 animate-fade-in">
                <TsiLogo size={32} />
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="font-bold text-sm tsi-gradient-text">{t("app.name")}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">The Studio Infinito</span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <NotificationBell />
                <LanguageSwitcher />
                <ThemeToggle />
                {roles.map((r) => (
                  <Badge
                    key={r}
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wider hidden md:flex bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                  >
                    {r}
                  </Badge>
                ))}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 rounded-xl pl-1 pr-3 hover:bg-primary/5">
                        <div className="h-8 w-8 rounded-full tsi-gradient text-white grid place-items-center text-xs font-bold shadow-sm ring-2 ring-white/50">
                          {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden md:inline text-sm font-medium">{profile?.full_name || user.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-strong">
                      <DropdownMenuLabel>
                        <div className="font-semibold">{profile?.full_name || "User"}</div>
                        <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />{t("auth.signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6 animate-fade-in">
              {children}
            </main>
            <footer className="shrink-0 border-t border-border/50 glass px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full tsi-gradient" />
                AMS v2.0 &mdash; The Studio Infinito
              </span>
              <span className="text-xs text-muted-foreground">
                Designed &amp; developed by{" "}
                <span className="font-semibold tsi-gradient-text">Personify Crafters</span>
                {" "}— All Rights Reserved
              </span>
            </footer>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
