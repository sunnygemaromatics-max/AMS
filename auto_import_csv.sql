-- ============================================================
-- AUTO CSV IMPORT - Smart Header Mapping
-- This function automatically maps CSV columns to database
-- ============================================================

-- First, ensure we have all possible column variations
DO $$
BEGIN
    -- SAP B1 columns
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_bill_no TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS grn_no TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS bill_and_grn TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_employee_code TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_employee_name TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_department TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sap_vendor TEXT;
    
    -- Alternative column names (for different CSV formats)
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS bill_no TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS purchase_bill TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS grn TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS goods_receipt_no TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS emp_code TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS emp_name TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS dept TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS vendor TEXT;
    
    -- Import tracking
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'CSV';
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS import_notes TEXT;
END $$;

-- Create the auto-mapping import function
CREATE OR REPLACE FUNCTION auto_import_csv(
    p_csv_data TEXT,
    p_location_code TEXT DEFAULT 'MUM',
    p_company_code TEXT DEFAULT 'GEM'
)
RETURNS TABLE(
    row_number INT,
    asset_code TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    v_row RECORD;
    v_line TEXT;
    v_headers TEXT[];
    v_values TEXT[];
    v_line_num INT := 0;
    v_location_id UUID;
    v_company_id UUID;
    v_category_id UUID;
    
    -- Header mapping
    v_asset_code_col INT := 0;
    v_name_col INT := 0;
    v_serial_col INT := 0;
    v_date_col INT := 0;
    v_cost_col INT := 0;
    v_bill_col INT := 0;
    v_grn_col INT := 0;
    v_vendor_col INT := 0;
    v_emp_code_col INT := 0;
    v_emp_name_col INT := 0;
    v_dept_col INT := 0;
    v_status_col INT := 0;
    v_notes_col INT := 0;
BEGIN
    -- Get location, company, category IDs
    SELECT id INTO v_location_id FROM public.locations WHERE code = p_location_code LIMIT 1;
    SELECT id INTO v_company_id FROM public.companies WHERE code = p_company_code LIMIT 1;
    SELECT id INTO v_category_id FROM public.categories WHERE code = 'DESKTOP' LIMIT 1;
    
    -- Split CSV into lines
    FOR v_line IN SELECT * FROM regexp_split_to_table(p_csv_data, '\n') LOOP
        v_line_num := v_line_num + 1;
        
        -- Skip empty lines
        CONTINUE WHEN trim(v_line) = '';
        
        -- Parse CSV line (simple split by comma)
        v_values := string_to_array(v_line, ',');
        
        -- First line is headers
        IF v_line_num = 1 THEN
            v_headers := v_values;
            
            -- Auto-map headers to column positions
            FOR i IN 1..array_length(v_headers, 1) LOOP
                v_headers[i] := lower(trim(v_headers[i]));
                
                -- Asset code variations
                IF v_headers[i] LIKE '%asset%' OR v_headers[i] LIKE '%sap code%' OR v_headers[i] LIKE '%tag%' THEN
                    v_asset_code_col := i;
                END IF;
                
                -- Name/Description variations
                IF v_headers[i] LIKE '%name%' OR v_headers[i] LIKE '%description%' OR v_headers[i] LIKE '%system%' OR v_headers[i] LIKE '%info%' THEN
                    v_name_col := i;
                END IF;
                
                -- Serial number variations
                IF v_headers[i] LIKE '%serial%' OR v_headers[i] LIKE '%s.no%' OR v_headers[i] LIKE '%sno%' THEN
                    v_serial_col := i;
                END IF;
                
                -- Date variations
                IF v_headers[i] LIKE '%date%' OR v_headers[i] LIKE '%purchase%' THEN
                    v_date_col := i;
                END IF;
                
                -- Cost variations
                IF v_headers[i] LIKE '%cost%' OR v_headers[i] LIKE '%price%' OR v_headers[i] LIKE '%amount%' THEN
                    v_cost_col := i;
                END IF;
                
                -- Bill number variations
                IF v_headers[i] LIKE '%bill%' OR v_headers[i] LIKE '%pbn%' OR v_headers[i] LIKE '%purchase bill%' THEN
                    v_bill_col := i;
                END IF;
                
                -- GRN variations
                IF v_headers[i] LIKE '%grn%' OR v_headers[i] LIKE '%goods%' OR v_headers[i] LIKE '%receipt%' THEN
                    v_grn_col := i;
                END IF;
                
                -- Vendor variations
                IF v_headers[i] LIKE '%vendor%' OR v_headers[i] LIKE '%supplier%' OR v_headers[i] LIKE '%seller%' THEN
                    v_vendor_col := i;
                END IF;
                
                -- Employee code variations
                IF v_headers[i] LIKE '%employee code%' OR v_headers[i] LIKE '%emp code%' OR v_headers[i] LIKE '%emp_code%' THEN
                    v_emp_code_col := i;
                END IF;
                
                -- Employee name variations
                IF v_headers[i] LIKE '%employee name%' OR v_headers[i] LIKE '%emp name%' OR v_headers[i] LIKE '%assigned%' THEN
                    v_emp_name_col := i;
                END IF;
                
                -- Department variations
                IF v_headers[i] LIKE '%department%' OR v_headers[i] LIKE '%dept%' THEN
                    v_dept_col := i;
                END IF;
                
                -- Status variations
                IF v_headers[i] LIKE '%status%' THEN
                    v_status_col := i;
                END IF;
                
                -- Notes variations
                IF v_headers[i] LIKE '%note%' OR v_headers[i] LIKE '%remark%' OR v_headers[i] LIKE '%comment%' THEN
                    v_notes_col := i;
                END IF;
            END LOOP;
            
            -- Return header mapping info
            RETURN QUERY SELECT 
                0::INT,
                'HEADERS FOUND'::TEXT,
                'SUCCESS'::TEXT,
                format('asset_code:%s, name:%s, serial:%s, bill:%s, grn:%s, vendor:%s, emp_code:%s, emp_name:%s, dept:%s',
                       v_asset_code_col, v_name_col, v_serial_col, v_bill_col, v_grn_col, 
                       v_vendor_col, v_emp_code_col, v_emp_name_col, v_dept_col)::TEXT;
            CONTINUE;
        END IF;
        
        -- Skip if missing required fields
        CONTINUE WHEN v_asset_code_col = 0 OR v_values[v_asset_code_col] IS NULL OR trim(v_values[v_asset_code_col]) = '';
        
        -- Build dynamic insert
        BEGIN
            INSERT INTO public.assets (
                asset_code,
                name,
                description,
                serial_number,
                purchase_date,
                purchase_cost,
                sap_bill_no,
                grn_no,
                bill_and_grn,
                sap_vendor,
                sap_employee_code,
                sap_employee_name,
                sap_department,
                location_id,
                company_id,
                category_id,
                status,
                import_notes,
                import_source,
                created_at
            ) VALUES (
                trim(v_values[v_asset_code_col]),
                CASE WHEN v_name_col > 0 THEN trim(v_values[v_name_col]) ELSE 'Unknown' END,
                CASE WHEN v_name_col > 0 THEN trim(v_values[v_name_col]) ELSE 'Unknown' END,
                CASE WHEN v_serial_col > 0 THEN trim(v_values[v_serial_col]) ELSE NULL END,
                CASE WHEN v_date_col > 0 AND trim(v_values[v_date_col]) != '' 
                     THEN trim(v_values[v_date_col])::DATE 
                     ELSE NULL END,
                CASE WHEN v_cost_col > 0 AND trim(v_values[v_cost_col]) != '' 
                     THEN trim(v_values[v_cost_col])::DECIMAL 
                     ELSE NULL END,
                CASE WHEN v_bill_col > 0 THEN trim(v_values[v_bill_col]) ELSE NULL END,
                CASE WHEN v_grn_col > 0 THEN trim(v_values[v_grn_col]) ELSE NULL END,
                CASE WHEN v_bill_col > 0 AND v_grn_col > 0 
                     THEN trim(v_values[v_bill_col]) || ' & ' || trim(v_values[v_grn_col])
                     ELSE NULL END,
                CASE WHEN v_vendor_col > 0 THEN trim(v_values[v_vendor_col]) ELSE NULL END,
                CASE WHEN v_emp_code_col > 0 THEN trim(v_values[v_emp_code_col]) ELSE NULL END,
                CASE WHEN v_emp_name_col > 0 THEN trim(v_values[v_emp_name_col]) ELSE NULL END,
                CASE WHEN v_dept_col > 0 THEN trim(v_values[v_dept_col]) ELSE NULL END,
                v_location_id,
                v_company_id,
                v_category_id,
                CASE WHEN v_status_col > 0 THEN trim(v_values[v_status_col]) ELSE 'allocated' END,
                CASE WHEN v_notes_col > 0 THEN trim(v_values[v_notes_col]) ELSE NULL END,
                'CSV_AUTO_IMPORT',
                NOW()
            )
            ON CONFLICT (asset_code) DO NOTHING;
            
            RETURN QUERY SELECT v_line_num, trim(v_values[v_asset_code_col]), 'SUCCESS', 'Imported';
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT v_line_num, trim(v_values[v_asset_code_col]), 'ERROR', SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT '✅ Auto-import function created!' as status;
SELECT 'Usage example:' as info;
SELECT $$SELECT * FROM auto_import_csv('asset_code,name,serial_number
MCD-01,Dell Desktop,ABC123
MCD-02,HP Laptop,XYZ789');$$ as example;
