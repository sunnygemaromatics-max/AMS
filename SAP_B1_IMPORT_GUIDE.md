# SAP B1 Import Guide for Asset Harmony

## Overview
This guide helps you import asset data from SAP Business One (SAP B1) into the Asset Management System while preserving all your historical data including Bill Numbers and GRN numbers.

---

## Step 1: Database Setup (One-Time)

### Run SQL Setup Script
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run: `@SETUP_SAP_IMPORT.sql`
3. This creates all necessary columns for SAP B1 data

**What it creates:**
- `sap_bill_no` - Purchase bill number
- `grn_no` - Goods Receipt Note number
- `bill_and_grn` - Combined field (as it appears in SAP)
- `sap_employee_code` - Employee code from SAP
- `sap_employee_name` - Employee name from SAP
- `sap_department` - Department from SAP
- `sap_vendor` - Vendor from SAP
- `import_batch_id` - Track which import batch
- `import_source` - Always "SAP B1"

---

## Step 2: Prepare Your SAP B1 Export

### Option A: Use the Template
1. Open: `@SAP_B1_IMPORT_TEMPLATE.csv`
2. Copy your data from SAP B1 into this format
3. **Required columns** (must match exactly):
   - `asset_code` - Your asset tag number (MCD-01, etc.)
   - `name` - Asset description
   - `serial_number` - Serial number
   - `purchase_date` - Purchase date (YYYY-MM-DD format)
   - `purchase_cost` - Purchase cost (optional)
   - `sap_bill_no` - Bill number from SAP
   - `grn_no` - GRN number from SAP
   - `bill_and_grn` - Combined bill & GRN text
   - `sap_vendor` - Vendor name
   - `sap_employee_code` - Employee code
   - `sap_employee_name` - Employee name
   - `sap_department` - Department
   - `location_code` - MUM for Mumbai
   - `status` - "allocated" or "available"
   - `import_notes` - Any notes

### Option B: Export from SAP B1
From SAP B1, export your asset data with these fields:
- Asset Code
- Description
- Serial Number
- Purchase Date
- Purchase Cost
- Bill Number
- GRN Number
- Vendor
- Employee Code
- Employee Name
- Department
- Location

---

## Step 3: Import to Supabase

### Method 1: CSV Upload (Easiest)
1. Go to **Supabase Dashboard** → **Table Editor** → **assets**
2. Click **"Insert"** → **"Import data from CSV"**
3. Upload your prepared CSV
4. Map the columns:
   - Your CSV `asset_code` → Database `asset_code`
   - Your CSV `name` → Database `name`
   - Your CSV `sap_bill_no` → Database `sap_bill_no`
   - Your CSV `grn_no` → Database `grn_no`
   - (And so on...)
5. Click **"Import"**

### Method 2: SQL Insert (For Large Data)
If CSV import fails for many rows, use SQL:
```sql
-- Example for one asset
INSERT INTO public.assets (
    asset_code, name, serial_number, purchase_date,
    sap_bill_no, grn_no, bill_and_grn,
    sap_vendor, sap_employee_code, sap_employee_name, sap_department,
    location_id, status, import_source
) VALUES (
    'MCD-01', 'Dell vostro 3670', '7G118Q2', '2018-12-13',
    'PBN-PSI/19-20/469', 'GRN-1042/19-20', 'PBN-PSI/19-20/469 & GRN-1042/19-20',
    'Regalia Worldwide', '001', 'Saloni Kasare', 'Sales',
    (SELECT id FROM public.locations WHERE code = 'MUM'),
    'allocated', 'SAP B1'
);
```

---

## Step 4: Link to Actual Records

After importing, run this to link SAP data to actual database records:

```sql
-- This links employees, vendors, and departments
SELECT link_sap_data();
```

**What it does:**
- Finds employees by `sap_employee_code` and links them
- Finds vendors by `sap_vendor` name and links them
- Finds departments by `sap_department` name and links them

---

## Step 5: Verify Import

```sql
-- Check imported assets
SELECT 
    asset_code,
    name,
    sap_bill_no,
    grn_no,
    sap_employee_name,
    sap_department,
    import_date
FROM public.assets
WHERE import_source = 'SAP B1'
ORDER BY asset_code;

-- Count by location
SELECT 
    l.name as location,
    COUNT(*) as asset_count
FROM public.assets a
JOIN public.locations l ON a.location_id = l.id
WHERE a.import_source = 'SAP B1'
GROUP BY l.name;
```

---

## Future Imports (Monthly/Quarterly)

### Process for New SAP B1 Exports:

1. **Export from SAP B1** with same format
2. **Save as CSV** with column headers matching the template
3. **Upload to Supabase** using CSV import
4. **Run linking function**: `SELECT link_sap_data();`
5. **Verify** the import worked

### Important Notes:
- Always use `location_code: MUM` for Mumbai assets
- Keep `import_source: SAP B1` for tracking
- Bill numbers and GRN numbers are preserved forever
- Employee names are stored even before linking to actual employee records

---

## Troubleshooting

### Issue: Column names don't match
**Solution:** Rename CSV headers to match database columns exactly

### Issue: Dates not importing
**Solution:** Use format: `YYYY-MM-DD` (e.g., `2018-12-13`)

### Issue: Employees not linking
**Solution:** Ensure employee codes in SAP match `employee_code` in database

### Issue: Duplicate asset codes
**Solution:** Check for existing assets before import, or use UPDATE instead of INSERT

---

## Data Preservation

**Your SAP B1 data is now permanently stored:**
- ✅ Bill numbers (PBN-XXXXX)
- ✅ GRN numbers (GRN-XXXXX)
- ✅ Purchase dates
- ✅ Original employee assignments
- ✅ Original department assignments
- ✅ Vendor information
- ✅ Import history

**All data is searchable and reportable!**

---

## Next Steps

1. ✅ Run setup script
2. ✅ Prepare your CSV
3. ✅ Import data
4. ✅ Link records
5. ✅ Start using the system!

**Need help?** Check the browser console for errors, or verify column names match exactly.
