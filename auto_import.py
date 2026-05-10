#!/usr/bin/env python3
"""
Auto CSV Import Script for Asset Harmony
Automatically detects CSV headers and maps to database columns
Usage: python auto_import.py <csv_file_path>
"""

import csv
import sys
import re
from datetime import datetime

# Header mapping configuration
# Maps variations of column names to database fields
HEADER_MAPPINGS = {
    'asset_code': [
        'asset code', 'asset_code', 'sap code', 'tag', 'asset tag', 
        'code', 'asset id', 'asset_id', 'sap_code', 'bin card no.',
        'bin card no', 's_no'
    ],
    'name': [
        'name', 'description', 'system information', 'system info',
        'asset name', 'product', 'item', 'system', 'info'
    ],
    'serial_number': [
        'serial number', 'serial_number', 'serial', 's.no', 'sno',
        's.no.', 'serial no', 'sr no', 'srno'
    ],
    'purchase_date': [
        'purchase date', 'purchase_date', 'date', 'purchase',
        'buy date', 'acquisition date', 'acquired'
    ],
    'purchase_cost': [
        'purchase cost', 'purchase_cost', 'cost', 'price', 'amount',
        'value', 'purchase price', 'rate'
    ],
    'sap_bill_no': [
        'purchase bill no', 'purchase_bill_no', 'bill no', 'bill_no',
        'bill number', 'pbn', 'purchase bill', 'bill', 'invoice',
        'purchase bill no. & grn no.', 'purchase bill no. & grn no'
    ],
    'grn_no': [
        'grn no', 'grn_no', 'grn', 'goods receipt', 'goods receipt no',
        'grn number', 'goods receipt note'
    ],
    'sap_vendor': [
        'vendor', 'supplier', 'seller', 'purchased from',
        'vendor_name', 'vendor name'
    ],
    'sap_employee_code': [
        'employee code', 'employee_code', 'emp code', 'emp_code',
        'employee id', 'emp id', 'emp_id', 'code', 'employee code:'
    ],
    'sap_employee_name': [
        'employee name', 'employee_name', 'emp name', 'emp_name',
        'assigned to', 'assigned_to', 'holder', 'user', 'employee'
    ],
    'sap_department': [
        'department', 'dept', 'department_name', 'dept name',
        'department code', 'dept_code'
    ],
    'location_code': [
        'location', 'location code', 'location_code', 'place',
        'branch', 'site'
    ],
    'status': [
        'status', 'condition', 'state', 'asset status'
    ],
    'notes': [
        'notes', 'note', 'remarks', 'remark', 'comments', 'comment',
        'import_notes', 'description'
    ]
}

def normalize_header(header):
    """Normalize header text for matching"""
    if not header:
        return ''
    # Convert to lowercase, remove special chars, extra spaces
    header = str(header).lower().strip()
    header = re.sub(r'[^\w\s]', ' ', header)  # Replace special chars with space
    header = re.sub(r'\s+', ' ', header)     # Collapse multiple spaces
    return header

def detect_header_mapping(headers):
    """Detect which CSV columns map to database fields"""
    mapping = {}
    normalized_headers = [normalize_header(h) for h in headers]
    
    for db_field, variations in HEADER_MAPPINGS.items():
        for i, csv_header in enumerate(normalized_headers):
            # Check for exact or partial match
            for variation in variations:
                if variation in csv_header or csv_header in variation:
                    # Check if already mapped (prefer exact matches)
                    if db_field not in mapping or variation == csv_header:
                        mapping[db_field] = i
                    break
    
    return mapping

def parse_date(date_str):
    """Try to parse various date formats"""
    if not date_str:
        return None
    
    date_formats = [
        '%Y-%m-%d',
        '%d-%m-%Y',
        '%d/%m/%Y',
        '%m/%d/%Y',
        '%d-%m-%y',
        '%d/%m/%y',
        '%Y/%m/%d'
    ]
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except:
            continue
    
    return None

def parse_cost(cost_str):
    """Parse cost value"""
    if not cost_str:
        return None
    
    # Remove currency symbols, commas
    cost_str = re.sub(r'[^\d.]', '', str(cost_str))
    
    try:
        return float(cost_str) if cost_str else None
    except:
        return None

def generate_sql_insert(row, mapping, location_code='MUM', company_code='GEM'):
    """Generate SQL INSERT statement for a row"""
    
    def get_value(field, default=None):
        if field in mapping:
            idx = mapping[field]
            if idx < len(row):
                val = row[idx].strip() if row[idx] else None
                return val if val else default
        return default
    
    asset_code = get_value('asset_code')
    if not asset_code:
        return None, "Missing asset code"
    
    name = get_value('name', 'Unknown Asset')
    serial = get_value('serial_number')
    
    date_str = get_value('purchase_date')
    purchase_date = parse_date(date_str)
    
    cost_str = get_value('purchase_cost')
    purchase_cost = parse_cost(cost_str)
    
    sap_bill_no = get_value('sap_bill_no')
    grn_no = get_value('grn_no')
    
    # Combine bill and grn if both exist
    bill_and_grn = None
    if sap_bill_no and grn_no:
        bill_and_grn = f"{sap_bill_no} & {grn_no}"
    
    vendor = get_value('sap_vendor')
    emp_code = get_value('sap_employee_code')
    emp_name = get_value('sap_employee_name')
    dept = get_value('sap_department')
    loc_code = get_value('location_code', location_code)
    status = get_value('status', 'allocated')
    notes = get_value('notes')
    
    sql = f"""INSERT INTO public.assets (
    asset_code, name, description, serial_number,
    purchase_date, purchase_cost, sap_bill_no, grn_no, bill_and_grn,
    sap_vendor, sap_employee_code, sap_employee_name, sap_department,
    location_id, company_id, category_id, status, import_notes, import_source, created_at
) VALUES (
    {format_sql_value(asset_code)},
    {format_sql_value(name)},
    {format_sql_value(name)},
    {format_sql_value(serial)},
    {format_sql_value(purchase_date)},
    {format_sql_value(purchase_cost)},
    {format_sql_value(sap_bill_no)},
    {format_sql_value(grn_no)},
    {format_sql_value(bill_and_grn)},
    {format_sql_value(vendor)},
    {format_sql_value(emp_code)},
    {format_sql_value(emp_name)},
    {format_sql_value(dept)},
    (SELECT id FROM public.locations WHERE code = '{loc_code}' LIMIT 1),
    (SELECT id FROM public.companies WHERE code = '{company_code}' LIMIT 1),
    (SELECT id FROM public.categories WHERE code = 'DESKTOP' LIMIT 1),
    {format_sql_value(status)},
    {format_sql_value(notes)},
    'CSV_AUTO_IMPORT',
    NOW()
) ON CONFLICT (asset_code) DO NOTHING;"""
    
    return sql, None

def format_sql_value(value):
    """Format value for SQL"""
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)):
        return str(value)
    # Escape single quotes
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"

def process_csv(csv_file_path):
    """Process CSV file and generate SQL"""
    print(f"🔄 Processing: {csv_file_path}\n")
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as f:
            # Try to detect dialect
            sample = f.read(4096)
            f.seek(0)
            
            sniffer = csv.Sniffer()
            try:
                dialect = sniffer.sniff(sample)
            except:
                dialect = csv.excel  # Default
            
            reader = csv.reader(f, dialect)
            
            # Read headers
            headers = next(reader)
            print(f"📋 Found {len(headers)} columns: {headers}\n")
            
            # Detect mapping
            mapping = detect_header_mapping(headers)
            print(f"🗺️  Column Mapping:")
            for db_field, csv_idx in mapping.items():
                print(f"   {db_field:20} → {headers[csv_idx]}")
            print()
            
            # Generate SQL for each row
            sql_statements = []
            success_count = 0
            error_count = 0
            
            for row_num, row in enumerate(reader, start=2):
                if not row or all(not cell.strip() for cell in row):
                    continue
                
                sql, error = generate_sql_insert(row, mapping)
                
                if sql:
                    sql_statements.append(f"-- Row {row_num}: {row[0] if row else 'unknown'}")
                    sql_statements.append(sql)
                    success_count += 1
                else:
                    print(f"❌ Row {row_num}: {error}")
                    error_count += 1
            
            # Write SQL file
            output_file = csv_file_path.replace('.csv', '_import.sql')
            with open(output_file, 'w', encoding='utf-8') as out:
                out.write("-- Auto-generated import SQL\n")
                out.write(f"-- Source: {csv_file_path}\n")
                out.write(f"-- Generated: {datetime.now()}\n\n")
                out.write("BEGIN;\n\n")
                out.write('\n\n'.join(sql_statements))
                out.write("\n\nCOMMIT;\n")
            
            print(f"\n✅ Success! Generated {output_file}")
            print(f"   📊 {success_count} rows ready for import")
            print(f"   ❌ {error_count} errors")
            print(f"\n📤 Next step: Run the SQL file in Supabase SQL Editor")
            
    except FileNotFoundError:
        print(f"❌ Error: File not found: {csv_file_path}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python auto_import.py <csv_file_path>")
        print("Example: python auto_import.py mumbai_desktops.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    process_csv(csv_file)
