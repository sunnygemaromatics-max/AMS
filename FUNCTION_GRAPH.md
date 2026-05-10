# Asset Harmony - Function Graph & Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth Pages  │  │  Dashboard   │  │  Entity CRUD │  │   Reports    │  │
│  │  /auth       │  │  /           │  │  /locations  │  │  /reports    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      SHARED COMPONENTS                               │  │
│  │  • Sidebar Navigation    • Data Tables    • Modal Dialogs          │  │
│  │  • Form Inputs           • Toast Alerts   • Charts/Graphs          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        CONTEXT PROVIDERS                           │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  AuthContext          │  Manages user auth, roles, permissions     │  │
│  │  ToastContext         │  Global notification system                │  │
│  │  ThemeContext         │  Dark/light mode management                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         CUSTOM HOOKS                               │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  useSupabaseData()    │  Data fetching with React Query caching    │  │
│  │  useAuth()            │  Authentication state & permissions        │  │
│  │  useToast()           │  Toast notifications                       │  │
│  │  useRateLimiter()     │  API rate limiting protection              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        UTILITY FUNCTIONS                           │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  parseDbError()       │  Database error parsing & user messages      │  │
│  │  cn()                 │  Tailwind class merging (clsx + tw-merge)    │  │
│  │  formatDate()         │  Date formatting utilities                   │  │
│  │  generateId()         │  UUID generation                             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE INTEGRATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      SUPABASE CLIENT                                 │  │
│  │  • Authentication (auth)                                             │  │
│  │  • Database Queries (from)                                           │  │
│  │  • Real-time Subscriptions (channel)                                 │  │
│  │  • File Storage (storage)                                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      CORE TABLES                                   │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  companies            │  Organization units                          │  │
│  │  locations            │  Office/warehouse locations                  │  │
│  │  departments          │  Company departments                         │  │
│  │  categories           │  Asset classification (hierarchical)         │  │
│  │  vendors              │  Suppliers and service providers             │  │
│  │  employees            │  Staff/employee records                      │  │
│  │  assets               │  Main asset register                         │  │
│  │  licenses             │  Software license tracking                 │  │
│  │  asset_transactions   │  Asset movement history                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     SECURITY TABLES                                │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  profiles             │  User profiles linked to auth.users          │  │
│  │  user_roles           │  Role assignments (admin, it, hr, viewer)   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                   SUPPORTING TABLES                                │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │  audit_log            │  Change tracking                             │  │
│  │  organization_settings│  System configuration                        │  │
│  │  import_runs          │  Bulk import tracking                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────►│  Check Auth │────►│  Load Roles │────►│   Access    │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │ JWT Token   │     │ has_role()  │     │ RLS Policy  │
                    │ Valid?      │     │ admin?      │     │ Check       │
                    └─────────────┘     │ it?         │     │             │
                                        │ hr?         │     └─────────────┘
                                        │ viewer?     │           │
                                        └─────────────┘           │
                                              │                     │
                                              ▼                     ▼
                                       ┌─────────────┐     ┌─────────────┐
                                       │ is_approved │     │  ALLOWED    │
                                       │ ()          │     │  or         │
                                       │             │     │  DENIED     │
                                       └─────────────┘     └─────────────┘
```

---

## Data Flow: Asset Creation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User Fills │────►│  Frontend   │────►│  Supabase   │────►│  PostgreSQL │
│  Form       │     │  Validation │     │  Insert     │     │  RLS Check  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────┐
                                                        │  has_role() │
                                                        │  check      │
                                                        └─────────────┘
                                                               │
                                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Success   │◄────│  Toast      │◄────│  Return     │◄────│  Insert     │
│   Message   │     │  Alert      │     │  Data       │     │  Record     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Component Hierarchy

```
App
├── AuthProvider
│   └── ProtectedRoute
│       ├── Layout (with Sidebar)
│       │   ├── Dashboard
│       │   ├── CompaniesPage
│       │   ├── LocationsPage
│       │   │   └── DataTable
│       │   │       └── LocationRow
│       │   │           └── Edit/Delete buttons
│       │   ├── DepartmentsPage
│       │   ├── CategoriesPage
│       │   ├── VendorsPage
│       │   ├── EmployeesPage
│       │   ├── AssetsPage
│       │   ├── LicensesPage
│       │   ├── ReportsPage
│       │   ├── BulkImportPage
│       │   ├── ImportHistoryPage
│       │   ├── ActivityTimelinePage
│       │   ├── UserManagementPage
│       │   ├── CompanySettingsPage
│       │   └── SystemSettingsPage
│       └── AuthPage
└── ToastProvider
    └── Toaster (notifications)
```

---

## Database Function Reference

### Security Functions

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `has_role()` | user_id UUID, role app_role | boolean | Check if user has specific role |
| `is_approved()` | user_id UUID | boolean | Check if user profile is approved |
| `can_write_assets()` | user_id UUID | boolean | Check if user can write assets |

### Utility Functions

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `update_updated_at_column()` | - | trigger | Auto-update timestamps |
| `handle_new_user()` | - | trigger | Auto-create profile on signup |
| `next_bin_card_no()` | - | integer | Generate next bin card number |

### RLS Policies

| Table | Policy | Operation | Condition |
|-------|--------|-----------|-----------|
| companies | Approved view | SELECT | is_approved(auth.uid()) |
| companies | Admin IT insert | INSERT | has_role(auth.uid(), 'admin'/'it') |
| locations | Admin full access | ALL | has_role(auth.uid(), 'admin') |
| assets | Approved view | SELECT | is_approved(auth.uid()) |
| profiles | Users view own | SELECT | id = auth.uid() |
| user_roles | Admins manage | ALL | has_role(auth.uid(), 'admin') |

---

## API Endpoints (Supabase/PostgREST)

### Authentication
```
POST /auth/v1/token?grant_type=password     # Login
POST /auth/v1/token?grant_type=refresh_token # Refresh
POST /auth/v1/logout                         # Logout
POST /auth/v1/signup                         # Register
```

### REST API
```
GET    /rest/v1/companies            # List all
GET    /rest/v1/companies?id=eq.123 # Get one
POST   /rest/v1/companies            # Create
PATCH  /rest/v1/companies?id=eq.123  # Update
DELETE /rest/v1/companies?id=eq.123  # Delete
```

### Real-time
```
ws://.../realtime/v1/websocket       # WebSocket connection
channel: public:assets                # Subscribe to changes
```

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── toast.tsx
│   ├── DataTable.tsx
│   ├── EntityTable.tsx
│   ├── Layout.tsx
│   ├── Modal.tsx
│   ├── ProtectedRoute.tsx
│   ├── Sidebar.tsx
│   └── StatCard.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
├── hooks/
│   ├── useSupabaseData.ts
│   ├── useAuth.ts
│   └── useToast.ts
├── lib/
│   ├── supabase-error.ts
│   ├── rateLimiter.ts
│   └── utils.ts
├── pages/
│   ├── AuthPage.tsx
│   ├── Dashboard.tsx
│   ├── LocationsPage.tsx
│   ├── AssetsPage.tsx
│   └── ... (other entity pages)
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx

supabase/
└── migrations/
    └── SETUP_NEW_PROJECT.sql

public/
└── (static assets)

Root Files:
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── .env
```

---

## Color Scheme (TSI Branding)

```css
/* Primary Colors */
--primary: #9333ea;        /* Purple-600 */
--primary-light: #a855f7;   /* Purple-500 */
--primary-dark: #7e22ce;    /* Purple-700 */

/* Secondary Colors */
--secondary: #3b82f6;       /* Blue-500 */
--secondary-light: #60a5fa; /* Blue-400 */

/* Accent Colors */
--accent: #f59e0b;          /* Amber-500 */
--accent-light: #fbbf24;    /* Amber-400 */

/* Background */
--bg-light: #f8f9fc;        /* Light gray-blue */
--bg-dark: #0f172a;         /* Slate-900 */

/* Text */
--text-primary: #1e293b;    /* Slate-800 */
--text-secondary: #64748b;  /* Slate-500 */
```

---

## Performance Optimizations

1. **React Query Caching**: Automatic caching with stale-while-revalidate
2. **Virtual Scrolling**: For large data tables
3. **Lazy Loading**: Route-based code splitting
4. **Image Optimization**: WebP format with fallbacks
5. **Debouncing**: Search inputs debounced 300ms

---

**Last Updated**: May 10, 2026  
**Version**: 2.0
