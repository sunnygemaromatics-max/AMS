import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eagerly load auth pages (not behind auth wall)
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

// Lazy load all protected pages for better initial load performance
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AssetsPage = lazy(() => import("./pages/AssetsPage"));
const AssetDetailPage = lazy(() => import("./pages/AssetDetailPage"));
const BinCardsPage = lazy(() => import("./pages/BinCardsPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const LocationsPage = lazy(() => import("./pages/LocationsPage"));
const LicensesPage = lazy(() => import("./pages/LicensesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const OrganisationSettingsPage = lazy(() => import("./pages/OrganisationSettingsPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const BulkImportPage = lazy(() => import("./pages/BulkImportPage"));
const ImportHistoryPage = lazy(() => import("./pages/ImportHistoryPage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="ams-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
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
                          <Route path="/activity" element={<ActivityPage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
                          <Route path="/companies" element={<SettingsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/organisation" element={<OrganisationSettingsPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
