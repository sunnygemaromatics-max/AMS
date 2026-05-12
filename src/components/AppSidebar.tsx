import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  MapPin,
  Building2,
  Settings,
  Key,
  Upload,
  History,
  Shield,
  ShieldCheck,
  Briefcase,
  Activity,
  BarChart3,
  QrCode,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TsiLogo } from "@/components/TsiLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Package },
  { title: "Bin Cards", url: "/bin-cards", icon: CreditCard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Locations", url: "/locations", icon: MapPin },
  { title: "Licenses", url: "/licenses", icon: Key },
];

const dataNav = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Bulk Import", url: "/import", icon: Upload },
  { title: "Import History", url: "/import/history", icon: History },
  { title: "Activity Timeline", url: "/activity", icon: Activity },
  { title: "Audit Trail", url: "/audit-trail", icon: History },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
];

const systemNav = [
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Organisation", url: "/organisation", icon: Briefcase },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminNav = [
  { title: "Users & Roles", url: "/users", icon: Shield },
  { title: "Rules & Permissions", url: "/rules", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAuth();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/import") return location.pathname === "/import";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        {!collapsed && (
          <div className="flex items-center gap-3 animate-fade-in">
            <TsiLogo size={36} />
            <div>
              <p className="font-bold text-sm tsi-gradient-text leading-tight">AMS</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Asset Management</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center animate-fade-in">
            <TsiLogo size={32} />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"} activeClassName="bg-primary/10 text-primary font-semibold">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} activeClassName="bg-primary/10 text-primary font-semibold">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} activeClassName="bg-primary/10 text-primary font-semibold">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} activeClassName="bg-primary/10 text-primary font-semibold">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        {!collapsed && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest tsi-gradient-text">
              Personify Crafters
            </p>
            <p className="text-[10px] text-sidebar-foreground/40">
              v2.0 Enterprise AMS
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
