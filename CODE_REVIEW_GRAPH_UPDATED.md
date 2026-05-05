# Asset Harmony — Updated Code Review Graph

## 1. Application Entry & Provider Tree

```mermaid
graph TD
    main["main.tsx\n(ReactDOM.createRoot + Sentry)"]
    App["App.tsx\n(ThemeProvider → QueryClientProvider → TooltipProvider → BrowserRouter → AuthProvider)"]
    main --> App

    App --> AuthProvider["AuthContext\nAuthProvider"]
    App --> ProtectedRoute["ProtectedRoute / AdminRoute"]
    App --> AppLayout["AppLayout"]
    App --> ErrorBoundary["ErrorBoundary"]

    AppLayout --> AppSidebar["AppSidebar"]
    AppLayout --> NotificationBell["NotificationBell"]
    AppLayout --> BrandingLoader["BrandingLoader"]

    AppSidebar --> NavLink["NavLink"]
    AppSidebar --> AuthContext2["useAuth()"]

    ProtectedRoute --> AuthContext3["useAuth()"]
    ErrorBoundary --> FallbackUI["Error Fallback UI"]
```

---

## 2. Page → Component Dependency Graph

```mermaid
graph LR
    subgraph Pages
        Dashboard["DashboardPage"]
        Assets["AssetsPage"]
        AssetDetail["AssetDetailPage"]
        BinCards["BinCardsPage"]
        Employees["EmployeesPage"]
        Locations["LocationsPage"]
        Licenses["LicensesPage"]
        BulkImport["BulkImportPage"]
        ImportHistory["ImportHistoryPage"]
        Settings["SettingsPage"]
        OrgSettings["OrganisationSettingsPage"]
        UserMgmt["UserManagementPage"]
        Activity["ActivityPage"]
        Reports["ReportsPage"]
        Auth["AuthPage"]
        ResetPassword["ResetPasswordPage"]
        NotFound["NotFound"]
    end

    subgraph CustomComponents["Custom Components"]
        KpiCard["KpiCard"]
        StatusBadge["StatusBadge"]
        AllocationDialog["AllocationDialog"]
        BulkActionsBar["BulkActionsBar"]
        DeactivateButton["DeactivateButton"]
        ErrorBoundary["ErrorBoundary"]
    end

    subgraph ShadcnUI["UI (shadcn/radix)"]
        Button; Card; Table; Dialog; Input; Select; Badge; Tabs; Checkbox; Textarea; ScrollArea; Tooltip; Popover; DropdownMenu; Sonner; Toaster
    end

    Dashboard --> KpiCard
    Dashboard --> Recharts["Recharts"]
    Dashboard --> ShadcnUI
    Assets --> StatusBadge
    Assets --> AllocationDialog
    Assets --> BulkActionsBar
    Assets --> ShadcnUI
    AssetDetail --> StatusBadge
    AssetDetail --> AllocationDialog
    AssetDetail --> ShadcnUI
    BinCards --> StatusBadge
    BinCards --> ShadcnUI
    Employees --> ShadcnUI
    Locations --> ShadcnUI
    Licenses --> ShadcnUI
    BulkImport --> ShadcnUI
    ImportHistory --> ShadcnUI
    Settings --> ShadcnUI
    Settings --> DeactivateButton
    OrgSettings --> ShadcnUI
    UserMgmt --> ShadcnUI
    Activity --> ShadcnUI
    Reports --> ShadcnUI
    Auth --> ShadcnUI
    ResetPassword --> ShadcnUI
```

---

## 3. Data Flow: Pages → Hooks → Supabase → DB

```mermaid
graph TD
    subgraph Pages
        Dashboard2["DashboardPage"]
        Assets2["AssetsPage"]
        AssetDetail2["AssetDetailPage"]
        Employees2["EmployeesPage"]
        Locations2["LocationsPage"]
        Licenses2["LicensesPage"]
        BinCards2["BinCardsPage"]
        Settings2["SettingsPage / OrgSettings"]
        UserMgmt2["UserManagementPage"]
        BulkImport2["BulkImportPage"]
        Activity2["ActivityPage"]
        Reports2["ReportsPage"]
    end

    subgraph Hooks["src/hooks/useSupabaseData.ts"]
        useDashboardStats
        useAssets / useAsset / useCreateAsset / useUpdateAsset / useDeleteAsset
        useEmployees / useCreateEmployee / useUpdateEmployee / useDeactivateEmployee
        useLocations / useCreateLocation / useUpdateLocation
        useLicenses / useCreateLicense / useUpdateLicense
        useCategories / useCreateCategory / useDeleteCategory
        useVendors / useCreateVendor / useDeactivateVendor
        useDepartments / useCreateDepartment
        useCompanies / useCreateCompany / useDeactivateCompany
        useAssetTransactions / useCreateTransaction
        useOrgSettings / useUpdateOrgSettings
    end

    subgraph Auth["src/hooks / contexts"]
        useAuth["useAuth() — AuthContext"]
        useNotifications["useNotifications()"]
        useToast["useToast()"]
    end

    subgraph SupabaseLayer["src/integrations/supabase"]
        SupabaseClient["client.ts\n(createClient + env validation)"]
        DBTypes["types.ts\n(Database — 1054 lines)"]
        SupabaseError["supabase-error.ts"]
    end

    subgraph DB["Supabase PostgreSQL"]
        assets_table["assets"]
        employees_table["employees"]
        locations_table["locations"]
        licenses_table["licenses"]
        companies_table["companies"]
        categories_table["categories"]
        vendors_table["vendors"]
        departments_table["departments"]
        transactions_table["asset_transactions"]
        profiles_table["profiles"]
        roles_table["user_roles"]
        org_table["organization_settings"]
    end

    Dashboard2 --> useDashboardStats
    Assets2 --> useAssets / useAsset / useCreateAsset / useUpdateAsset / useDeleteAsset
    AssetDetail2 --> useAssets / useAsset / useCreateAsset / useUpdateAsset
    AssetDetail2 --> useAssetTransactions / useCreateTransaction
    Employees2 --> useEmployees / useCreateEmployee / useUpdateEmployee / useDeactivateEmployee
    Locations2 --> useLocations / useCreateLocation / useUpdateLocation
    Licenses2 --> useLicenses / useCreateLicense / useUpdateLicense
    Settings2 --> useOrgSettings / useUpdateOrgSettings
    Settings2 --> useCompanies / useCreateCompany / useDeactivateCompany
    Settings2 --> useCategories / useCreateCategory / useDeleteCategory
    Settings2 --> useVendors / useCreateVendor / useDeactivateVendor
    BulkImport2 --> SupabaseClient
    Activity2 --> useAssetTransactions
    Reports2 --> useAssets / useEmployees / useLicenses

    Hooks --> SupabaseClient
    Auth --> SupabaseClient
    SupabaseClient --> DB
    SupabaseError -.->|"Error handling"| Hooks
    DBTypes -.->|"TypeScript types"| Hooks
```

---

## 4. Utility / Library Layer

```mermaid
graph LR
    subgraph LibUtils["src/lib/"]
        pdf["pdf.ts\n(exportAssetReport, exportBinCard,\nbuildBinCardBlob, exportHandoverSlip,\nsetPdfBranding)"]
        bulkImport["bulkImport.ts\n(parseExcel, parseCSV,\nclassifyRows, parseZip)"]
        importHelpers["importHelpers.ts\n(validateRow,\ntransformRow,\ndownloadCsv)"]
        utils["utils.ts\n(cn — clsx + tailwind-merge)"]
        supabaseError["supabase-error.ts\n(formatSupabaseError)"]
    end

    subgraph ExternalLibs["External Libraries"]
        jspdf["jsPDF + AutoTable"]
        xlsx["XLSX"]
        jszip["JSZip"]
        datefns["date-fns"]
        zod["Zod"]
        recharts["Recharts"]
        reactQuery["@tanstack/react-query"]
        lucide["Lucide React"]
        sonner["Sonner (toasts)"]
    end

    pdf --> jspdf
    bulkImport --> xlsx
    bulkImport --> jszip
    importHelpers --> zod
    importHelpers --> datefns

    AssetDetail3["AssetDetailPage"] --> pdf
    BinCards3["BinCardsPage"] --> pdf
    OrgSettings3["OrganisationSettingsPage"] --> pdf
    BulkImport3["BulkImportPage"] --> bulkImport
    BulkImport3 --> importHelpers
    BinCards3 --> importHelpers
    Dashboard3["DashboardPage"] --> recharts
    AuthPage3["AuthPage"] --> zod
    ResetPassword3["ResetPasswordPage"] --> zod
```

---

## 5. Authentication & RBAC Flow

```mermaid
graph TD
    SupabaseAuth["Supabase Auth\n(onAuthStateChange, getSession)"]
    AuthContext["AuthProvider\nAuthContext.tsx"]
    profiles_tbl["profiles table"]
    user_roles_tbl["user_roles table"]

    SupabaseAuth -->|"session / user"| AuthContext
    AuthContext -->|"loadProfile(uid)"| profiles_tbl
    AuthContext -->|"loadProfile(uid)"| user_roles_tbl

    AuthContext -->|"isAdmin, canWrite, canEditEmployees"| ProtectedRoute2["ProtectedRoute"]
    AuthContext -->|"isAdmin"| AdminRoute2["AdminRoute"]
    AuthContext -->|"roles, canWrite"| AppSidebar2["AppSidebar (menu visibility)"]
    AuthContext -->|"canWrite"| Assets4["AssetsPage (edit buttons)"]
    AuthContext -->|"canEditEmployees"| Employees4["EmployeesPage (edit buttons)"]

    subgraph Roles
        admin["admin — full access"]
        it["it — assets + employees (needs approval)"]
        hr["hr — employees only (needs approval)"]
        viewer["viewer — read only"]
    end

    subgraph ApprovalStatus
        approved["approved — full access based on role"]
        pending["pending — waiting for admin approval"]
        rejected["rejected — access denied"]
    end
```

---

## 6. Database Schema Relations

```mermaid
erDiagram
    assets {
        uuid id PK
        text sap_code
        text bin_card_no
        text name
        text asset_type
        text asset_subtype
        text status
        uuid current_employee_id FK
        uuid current_location_id FK
        uuid vendor_id FK
        uuid category_id FK
        uuid department_id FK
        date warranty_end
        numeric purchase_cost
        boolean is_deleted
        timestamptz created_at
        timestamptz updated_at
    }

    employees {
        uuid id PK
        text employee_code
        text name
        text designation
        text department
        uuid location_id FK
        uuid company_id FK
        uuid department_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    locations {
        uuid id PK
        text code
        text name
        text address
        uuid company_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    companies {
        uuid id PK
        text name
        text code
        text address
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    categories {
        uuid id PK
        text code
        text name
        text asset_type
    }

    vendors {
        uuid id PK
        text name
        text contact_person
        text email
        text phone
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    departments {
        uuid id PK
        text code
        text name
        uuid company_id FK
        uuid location_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    licenses {
        uuid id PK
        text license_type
        text status
        date validity_end
        uuid assigned_employee_id FK
        uuid assigned_asset_id FK
        uuid company_id FK
        uuid location_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    asset_transactions {
        uuid id PK
        uuid asset_id FK
        text transaction_type
        uuid from_employee_id FK
        uuid to_employee_id FK
        uuid from_location_id FK
        uuid to_location_id FK
        text condition_status
        text notes
        uuid performed_by FK
        timestamptz created_at
    }

    profiles {
        uuid id PK
        text full_name
        text email
        text username
        text avatar_url
        uuid employee_id FK
        text approval_status
        timestamptz created_at
        timestamptz updated_at
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        text role
        timestamptz created_at
    }

    organization_settings {
        uuid id PK
        text org_name
        text org_address
        text org_phone
        text org_email
        text org_website
        text logo_url
        text primary_color
        text pdf_footer_text
        boolean email_alerts_enabled
        json email_alert_recipients
        integer email_alert_days_before
        text email_alert_time
        timestamptz created_at
        timestamptz updated_at
    }

    assets }o--|| employees : "allocated to"
    assets }o--|| locations : "at location"
    assets }o--|| vendors : "from vendor"
    assets }o--|| categories : "in category"
    assets }o--|| departments : "owned by dept"
    employees }o--|| locations : "at location"
    employees }o--|| companies : "in company"
    employees }o--|| departments : "in dept"
    locations }o--|| companies : "belongs to"
    departments }o--|| companies : "belongs to"
    departments }o--|| locations : "at location"
    licenses }o--o| employees : "assigned to"
    licenses }o--o| assets : "assigned to"
    licenses }o--|| companies : "for company"
    asset_transactions }o--|| assets : "for asset"
    asset_transactions }o--o| employees : "from/to employee"
    asset_transactions }o--o| locations : "from/to location"
    asset_transactions }o--o| profiles : "performed by"
    user_roles }o--|| profiles : "user profile"
    profiles }o--o| employees : "linked to"
```

---

## 7. Build & Deployment Pipeline

```mermaid
graph LR
    src["src/ (TypeScript + TSX)"]
    vite["Vite 5\nvite.config.ts"]
    dist["dist/ (bundled)"]
    tailwind["Tailwind CSS\ntailwind.config.ts"]
    tscheck["TypeScript\ntsconfig.json"]
    eslint["ESLint\neslint.config.js"]
    vitest["Vitest\n(unit tests)"]
    sentry["Sentry\n(error tracking)"]
    supabase_db["Supabase\n(migrations/)"]

    src --> vite
    tailwind --> vite
    vite --> dist
    src --> tscheck
    src --> eslint
    src --> vitest
    src --> sentry
    supabase_db -.->|"DB schema"| src
```

---

## 8. Security & Error Handling

```mermaid
graph TD
    subgraph Security
        EnvValidation["Environment Variable Validation"]
        RLS["Row Level Security Policies"]
        RBAC["Role-Based Access Control"]
        ApprovalSystem["User Approval System"]
    end

    subgraph ErrorHandling
        ErrorBoundary["React Error Boundary"]
        SupabaseErrorHandling["formatSupabaseError"]
        ToastNotifications["Sonner Toasts"]
        ConsoleLogging["Console Error Logging"]
    end

    subgraph Validation
        ZodSchemas["Zod Validation Schemas"]
        FormValidation["React Hook Form"]
        TypeSafety["TypeScript Types"]
    end

    EnvValidation --> client_ts["client.ts"]
    RLS --> supabase_policies["Database Policies"]
    RBAC --> AuthContext["AuthContext"]
    ApprovalSystem --> ProtectedRoute["ProtectedRoute"]

    ErrorBoundary --> App["App.tsx"]
    SupabaseErrorHandling --> useSupabaseData["useSupabaseData.ts"]
    ToastNotifications --> Pages["All Pages"]
    ConsoleLogging --> ErrorBoundary

    ZodSchemas --> AuthPage["AuthPage"]
    ZodSchemas --> ResetPassword["ResetPasswordPage"]
    FormValidation --> Forms["All Forms"]
    TypeSafety --> EntireApp["Entire Application"]
```

---

## 9. Module Summary Table

| Layer | Files | Responsibility | Key Features |
|-------|-------|----------------|--------------|
| **Entry** | `main.tsx`, `App.tsx` | Bootstrap React, providers, routing | Sentry integration, lazy loading |
| **Auth** | `AuthContext.tsx`, `ProtectedRoute.tsx` | Session, RBAC, route guards | Approval system, role-based access |
| **Pages** (17) | `src/pages/*.tsx` | Feature views & business logic | Dashboard, assets, employees, reports |
| **Custom Components** (8) | `src/components/*.tsx` | Reusable UI | Error boundary, allocation dialog |
| **UI Primitives** (50+) | `src/components/ui/` | shadcn/radix components | Form controls, dialogs, tables |
| **Data Hooks** | `useSupabaseData.ts` | All CRUD via React Query + Supabase | Optimistic updates, caching |
| **Realtime Hook** | `useNotifications.ts` | Live notification feed | Real-time updates |
| **Utilities** | `src/lib/pdf.ts`, `bulkImport.ts`, `importHelpers.ts`, `utils.ts`, `supabase-error.ts` | PDF gen, bulk parsing, helpers, error handling | Export functionality, import processing |
| **Supabase Client** | `integrations/supabase/client.ts` | Single Supabase instance | Environment validation |
| **DB Types** | `integrations/supabase/types.ts` | Auto-generated TS types (1054 lines) | Type safety |
| **Database** | `supabase/migrations/` (11 files) | Schema evolution (Apr 11 - May 2 2026) | RLS policies, audit trails |
| **Testing** | `src/test/` | Unit tests | Vitest configuration |
| **Error Tracking** | Sentry integration | Production error monitoring | Performance tracking |

---

## 10. Issues & Recommendations

### Security Issues Found:
1. **High Priority**: 20 npm vulnerabilities (3 low, 7 moderate, 10 high)
   - React Router XSS vulnerability
   - XLSX prototype pollution
   - Multiple dependency vulnerabilities
   - **Recommendation**: Run `npm audit fix` and update dependencies

2. **Medium Priority**: Environment variable exposure
   - Supabase keys properly validated in client.ts
   - **Recommendation**: Ensure .env file is properly secured

### Code Quality Issues:
1. **No critical bugs found** in the application logic
2. **Good error handling** with ErrorBoundary and custom error formatting
3. **Proper TypeScript usage** with generated types
4. **Well-structured authentication** with approval system

### Performance Optimizations:
1. **Lazy loading** implemented for protected routes
2. **React Query** for efficient data caching
3. **Code splitting** with Vite bundling
4. **Optimistic updates** in mutations

### Recommendations:
1. Update vulnerable dependencies immediately
2. Add more comprehensive unit tests
3. Implement rate limiting for API calls
4. Add input sanitization for bulk imports
5. Consider implementing request caching for large datasets
