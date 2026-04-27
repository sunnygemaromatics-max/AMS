import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import AssetsPage from "./pages/AssetsPage";
import AssetDetailPage from "./pages/AssetDetailPage";
import BinCardsPage from "./pages/BinCardsPage";
import EmployeesPage from "./pages/EmployeesPage";
import LocationsPage from "./pages/LocationsPage";
import LicensesPage from "./pages/LicensesPage";
import SettingsPage from "./pages/SettingsPage";
import OrganisationSettingsPage from "./pages/OrganisationSettingsPage";
import AuthPage from "./pages/AuthPage";
import UserManagementPage from "./pages/UserManagementPage";
import BulkImportPage from "./pages/BulkImportPage";
import ImportHistoryPage from "./pages/ImportHistoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route path="/assets/:id" element={<AssetDetailPage />} />
                    <Route path="/bin-cards" element={<BinCardsPage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/locations" element={<LocationsPage />} />
                    <Route path="/licenses" element={<LicensesPage />} />
                    <Route path="/import" element={<BulkImportPage />} />
                    <Route path="/import/history" element={<ImportHistoryPage />} />
                    <Route path="/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
                    <Route path="/companies" element={<SettingsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/organisation" element={<OrganisationSettingsPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
