# Phase 2: Asset Lifecycle Management - Detailed Specification

## Overview
Enhance the Asset Management System with advanced tracking, reporting, and asset lifecycle features.

---

## Feature 1: Bin Card System 📋

### What is a Bin Card?
A bin card is a physical/digital record that tracks all movements of an asset, similar to a ledger.

### Implementation Details

#### Database Schema
```sql
-- Bin cards table (already exists, verify columns)
ALTER TABLE public.bin_cards 
ADD COLUMN IF NOT EXISTS opening_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS receipts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS issues INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS closing_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_value DECIMAL(15,2);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bin_cards_asset ON public.bin_cards(asset_id);
CREATE INDEX IF NOT EXISTS idx_bin_cards_date ON public.bin_cards(transaction_date DESC);
```

#### UI Components Needed
1. **Bin Card Page** (`/bin-cards`)
   - List all assets with bin cards
   - Search by asset name/code
   - Filter by location/department

2. **Bin Card Detail View**
   - Asset info (name, code, category)
   - Running balance table
   - Transaction history
   - Opening/Closing balance display

3. **Add Transaction Dialog**
   - Transaction type (Receipt/Issue/Adjustment)
   - Quantity
   - Value (for receipts)
   - Reference number (GRN/Invoice)
   - Notes

#### Pages to Create
- `src/pages/BinCardsPage.tsx` - List view
- `src/pages/BinCardDetailPage.tsx` - Individual bin card
- `src/components/bin-card/BinCardTable.tsx` - Transaction table
- `src/components/bin-card/AddTransactionDialog.tsx` - Add entry

#### API/Hooks Needed
```typescript
// hooks/useBinCards.ts
export const useBinCards = () => {...}
export const useBinCardDetail = (assetId: string) => {...}
export const useCreateBinCardEntry = () => {...}
```

---

## Feature 2: QR Code Generation & Asset Tags 🏷️

### Implementation

#### New Dependencies
```bash
npm install qrcode react-qr-code
```

#### Database Changes
```sql
-- Add QR code fields to assets
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tag_printed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tag_printed_at TIMESTAMPTZ;

-- Index for barcode scanning
CREATE INDEX IF NOT EXISTS idx_assets_barcode ON public.assets(barcode);
CREATE INDEX IF NOT EXISTS idx_assets_qr ON public.assets(qr_code);
```

#### UI Components
1. **QR Code Generator**
   - Generate unique QR code per asset
   - Print-friendly asset tag layout
   - Batch generation for multiple assets

2. **Asset Tag Design**
   ```
   ┌─────────────────┐
   │  [QR CODE]      │
   │                 │
   │  Asset: LAP001  │
   │  Type: Laptop   │
   │  Loc: Mumbai    │
   └─────────────────┘
   ```

3. **Print Asset Tags Dialog**
   - Select assets to print
   - Preview tags
   - Print to PDF/Printer

#### Pages to Create
- `src/components/asset/QRCodeGenerator.tsx`
- `src/components/asset/AssetTagPrint.tsx`
- `src/components/asset/PrintTagsDialog.tsx`

---

## Feature 3: Asset Barcode Scanning 📱

### Implementation

#### New Dependencies
```bash
npm install html5-qrcode
```

#### UI Components
1. **Barcode Scanner Component**
   - Camera-based scanning
   - Manual barcode entry (fallback)
   - Scan history

2. **Quick Asset Lookup**
   - Scan → Show asset details
   - Option to allocate/transfer/return

3. **Mobile-Optimized Scanner Page**
   - Full-screen camera view
   - Torch/flashlight toggle
   - Scan counter

#### Pages to Create
- `src/pages/ScannerPage.tsx` - Main scanner
- `src/components/scanner/BarcodeScanner.tsx` - Scanner component
- `src/components/scanner/ScanResult.tsx` - Result display

#### Navigation
Add to sidebar: "Scanner" with camera icon

---

## Feature 4: Asset History & Audit Trail 📜

### Implementation

#### Database (Already exists - enhance)
```sql
-- Ensure audit_log has all needed columns
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON public.audit_log(created_at DESC);
```

#### UI Components
1. **Asset History Timeline**
   - Visual timeline of all changes
   - Filter by event type
   - Export to PDF

2. **Timeline Events to Show**
   - Asset created
   - Allocated to employee
   - Returned from employee
   - Transferred to location
   - Status changes
   - Maintenance records
   - Value adjustments

3. **Activity Timeline Page** (Already exists - enhance)
   - Add filtering
   - Add export
   - Add search

#### Pages to Enhance
- `src/pages/ActivityTimelinePage.tsx` - Add filters & export
- `src/components/asset/AssetHistory.tsx` - New component

---

## Feature 5: Reports & Analytics 📊

### Report Types to Implement

#### 1. Asset Register Report
```typescript
interface AssetRegisterReport {
  assetCount: number;
  totalValue: number;
  byCategory: { category: string; count: number; value: number }[];
  byLocation: { location: string; count: number }[];
  byStatus: { status: string; count: number }[];
}
```

#### 2. Asset Allocation Report
- Currently allocated assets
- Allocation by department
- Allocation by employee
- Pending returns

#### 3. Maintenance Schedule Report
- Upcoming maintenance
- Overdue maintenance
- Maintenance history
- Cost analysis

#### 4. License Expiry Report
- Expiring in 30 days
- Expiring in 90 days
- Already expired
- Renewal cost estimate

#### 5. Employee Asset Assignment Report
- Assets per employee
- Department-wise summary
- High-value asset holders

#### 6. Custom Report Builder
- Select fields to include
- Filter criteria
- Group by options
- Export to Excel/PDF

### Database Views (for performance)
```sql
-- Asset summary view
CREATE OR REPLACE VIEW public.asset_summary AS
SELECT 
  a.id,
  a.name,
  a.asset_code,
  c.name as category,
  l.name as location,
  d.name as department,
  e.name as assigned_to,
  a.purchase_cost,
  a.current_value,
  a.status,
  a.created_at
FROM public.assets a
LEFT JOIN public.categories c ON a.category_id = c.id
LEFT JOIN public.locations l ON a.location_id = l.id
LEFT JOIN public.departments d ON a.department_id = d.id
LEFT JOIN public.employees e ON a.assigned_to = e.id;
```

### UI Components
1. **Reports Dashboard** (`/reports`)
   - Report cards with preview
   - Quick stats
   - Recent reports

2. **Individual Report Pages**
   - Filters (date range, location, etc.)
   - Data table
   - Charts/graphs
   - Export buttons

3. **Report Builder**
   - Drag-drop field selector
   - Filter builder
   - Preview panel

#### Pages to Create
- `src/pages/ReportsPage.tsx` - Reports dashboard
- `src/pages/reports/AssetRegisterReport.tsx`
- `src/pages/reports/AllocationReport.tsx`
- `src/pages/reports/MaintenanceReport.tsx`
- `src/pages/reports/LicenseExpiryReport.tsx`
- `src/pages/reports/EmployeeAssetsReport.tsx`
- `src/pages/reports/CustomReportBuilder.tsx`

#### Charts Library
```bash
npm install recharts  # Already installed, enhance usage
```

---

## Implementation Priority

### Week 1: QR Codes & Asset Tags
1. Add barcode/QR fields to database
2. Create QR code generator component
3. Design and implement asset tag print layout
4. Add "Print Tags" button to Assets page

### Week 2: Barcode Scanner
1. Install html5-qrcode library
2. Create scanner component
3. Build scanner page
4. Integrate with asset lookup

### Week 3: Bin Card System
1. Enhance bin_cards table
2. Create bin card list page
3. Create bin card detail view
4. Add transaction dialog
5. Integrate with asset allocation flow

### Week 4: Reports & Audit Trail
1. Create database views
2. Build reports dashboard
3. Implement asset register report
4. Implement allocation report
5. Enhance activity timeline

### Week 5: Polish & Testing
1. Mobile responsiveness for scanner
2. Report export functionality
3. Testing all features
4. Bug fixes
5. Documentation

---

## New Dependencies Summary

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "react-qr-code": "^2.0.12",
    "html5-qrcode": "^2.3.8",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "xlsx": "^0.18.5"
  }
}
```

---

## Database Migrations Needed

1. `migrations/20260510_add_asset_tracking_fields.sql`
2. `migrations/20260510_enhance_audit_log.sql`
3. `migrations/20260510_create_report_views.sql`

---

## Navigation Updates

Add to sidebar:
```typescript
{
  name: "Bin Cards",
  path: "/bin-cards",
  icon: ClipboardList
},
{
  name: "Scanner",
  path: "/scanner",
  icon: ScanLine
},
{
  name: "Reports",
  path: "/reports",
  icon: BarChart3
}
```

---

**Ready to start? Which feature first: QR codes, Scanner, or Bin Cards?**
