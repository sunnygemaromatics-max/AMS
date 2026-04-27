# Asset Harmony — Code Review Graph

## 1. Application Entry & Provider Tree

```mermaid
graph TD
    main["main.tsx\n(ReactDOM.createRoot)"]
    App["App.tsx\n(QueryClientProvider → TooltipProvider → BrowserRouter → AuthProvider)"]
    main --> App

    App --> AuthProvider["AuthContext\nAuthProvider"]
    App --> ProtectedRoute["ProtectedRoute / AdminRoute"]
    App --> AppLayout["AppLayout"]

    AppLayout --> AppSidebar["AppSidebar"]
    AppLayout --> NotificationBell["NotificationBell"]
    AppLayout --> BrandingLoader["BrandingLoader"]

    AppSidebar --> NavLink["NavLink"]
    AppSidebar --> AuthContext2["useAuth()"]

    ProtectedRoute --> AuthContext3["useAuth()"]
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
        Auth["AuthPage"]
    end

    subgraph CustomComponents["Custom Components"]
        KpiCard["KpiCard"]
        StatusBadge["StatusBadge"]
        AllocationDialog["AllocationDialog"]
        BulkActionsBar["BulkActionsBar"]
    end

    subgraph ShadcnUI["UI (shadcn/radix)"]
        Button; Card; Table; Dialog; Input; Select; Badge; Tabs; Checkbox; Textarea; ScrollArea; Tooltip; Popover; DropdownMenu
    end

    Dashboard --> KpiCard
    Dashboard --> ShadcnUI
    Assets --> StatusBadge
    Assets --> AllocationDialog
    Assets --> BulkActionsBar
    Assets --> ShadcnUI
    AssetDetail --> StatusBadge
    AssetDetail --> AllocationDialog
    AssetDetail --> ShadcnUI
    BinCards --> ShadcnUI
    Employees --> ShadcnUI
    Locations --> ShadcnUI
    Licenses --> ShadcnUI
    BulkImport --> ShadcnUI
    ImportHistory --> ShadcnUI
    Settings --> ShadcnUI
    OrgSettings --> ShadcnUI
    UserMgmt --> ShadcnUI
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
    end

    subgraph Hooks["src/hooks/useSupabaseData.ts"]
        useDashboardStats
        useAssets / useAsset / useCreateAsset / useUpdateAsset
        useEmployees / useCreateEmployee / useUpdateEmployee
        useLocations / useCreateLocation
        useLicenses / useCreateLicense / useUpdateLicense
        useCategories / useCreateCategory
        useVendors / useCreateVendor
        useDepartments / useCreateDepartment
        useCompanies / useCreateCompany
        useAssetTransactions / useCreateTransaction
        useOrgSettings / useUpdateOrgSettings
    end

    subgraph Auth["src/hooks / contexts"]
        useAuth["useAuth() — AuthContext"]
        useNotifications["useNotifications()"]
    end

    subgraph SupabaseLayer["src/integrations/supabase"]
        SupabaseClient["client.ts\n(createClient)"]
        DBTypes["types.ts\n(Database — 1053 lines)"]
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
    Assets2 --> useAssets / useAsset / useCreateAsset / useUpdateAsset
    AssetDetail2 --> useAssets / useAsset / useCreateAsset / useUpdateAsset
    AssetDetail2 --> useAssetTransactions / useCreateTransaction
    Employees2 --> useEmployees / useCreateEmployee / useUpdateEmployee
    Locations2 --> useLocations / useCreateLocation
    Licenses2 --> useLicenses / useCreateLicense / useUpdateLicense
    Settings2 --> useOrgSettings / useUpdateOrgSettings
    Settings2 --> useCompanies / useCreateCompany
    Settings2 --> useCategories / useCreateCategory
    Settings2 --> useVendors / useCreateVendor
    BulkImport2 --> SupabaseClient

    Hooks --> SupabaseClient
    Auth --> SupabaseClient
    SupabaseClient --> DB
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
    end

    subgraph ExternalLibs["External Libraries"]
        jspdf["jsPDF + AutoTable"]
        xlsx["XLSX"]
        jszip["JSZip"]
        datefns["date-fns"]
        zod["Zod"]
        recharts["Recharts"]
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
    }

    locations {
        uuid id PK
        text code
        text name
        uuid company_id FK
        boolean is_active
    }

    companies {
        uuid id PK
        text name
        boolean is_active
    }

    categories {
        uuid id PK
        text code
        text name
    }

    vendors {
        uuid id PK
        text name
        boolean is_active
    }

    departments {
        uuid id PK
        text code
        text name
        uuid company_id FK
        uuid location_id FK
        boolean is_active
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
    }

    asset_transactions {
        uuid id PK
        uuid asset_id FK
        text transaction_type
        uuid to_employee_id FK
        uuid to_location_id FK
        timestamptz created_at
    }

    profiles {
        uuid id PK
        text full_name
        text approval_status
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        text role
    }

    organization_settings {
        uuid id PK
        text org_name
        boolean email_alerts_enabled
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
    asset_transactions }o--o| employees : "to employee"
    asset_transactions }o--o| locations : "to location"
    user_roles }o--|| profiles : "user profile"
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
    supabase_db["Supabase\n(migrations/)"]

    src --> vite
    tailwind --> vite
    vite --> dist
    src --> tscheck
    src --> eslint
    src --> vitest
    supabase_db -.->|"DB schema"| src
```

---

## 8. Module Summary Table

| Layer | Files | Responsibility |
|-------|-------|----------------|
| **Entry** | `main.tsx`, `App.tsx` | Bootstrap React, providers, routing |
| **Auth** | `AuthContext.tsx`, `ProtectedRoute.tsx` | Session, RBAC, route guards |
| **Pages** (15) | `src/pages/*.tsx` | Feature views & business logic |
| **Custom Components** (8) | `src/components/*.tsx` | Reusable UI (Sidebar, AllocationDialog, etc.) |
| **UI Primitives** (50+) | `src/components/ui/` | shadcn/radix components |
| **Data Hooks** | `useSupabaseData.ts` | All CRUD via React Query + Supabase |
| **Realtime Hook** | `useNotifications.ts` | Live notification feed |
| **Utilities** | `src/lib/pdf.ts`, `bulkImport.ts`, `importHelpers.ts`, `utils.ts` | PDF gen, bulk parsing, helpers |
| **Supabase Client** | `integrations/supabase/client.ts` | Single Supabase instance |
| **DB Types** | `integrations/supabase/types.ts` | Auto-generated TS types (1053 lines) |
| **Database** | `supabase/migrations/` (7 files) | Schema evolution (Apr 11–22 2026) |
