# Database Migration Guide

This guide provides complete SQL schemas for migrating your Asset Management System to a new database server.

## Files Included

| File | Description | Use For |
|------|-------------|---------|
| `supabase_complete_schema.sql` | Full PostgreSQL schema with all tables, functions, RLS policies | PostgreSQL, Supabase, AWS RDS |
| `mssql_schema.sql` | Microsoft SQL Server compatible schema | SQL Server 2016+, Azure SQL |

## Schema Overview

### Core Tables
- **companies** - Organization companies
- **locations** - Office/warehouse locations
- **departments** - Company departments
- **categories** - Asset categories (with hierarchy)
- **vendors** - Suppliers and vendors
- **employees** - Employee records
- **assets** - Main assets register
- **licenses** - Software licenses
- **asset_transactions** - Asset movement history

### User Management Tables
- **users/profiles** - User accounts and profiles
- **user_roles** - Role assignments (admin, it, hr, viewer)

### Supporting Tables
- **audit_log** - Change tracking
- **organization_settings** - System configuration
- **import_runs** - Bulk import tracking

## Migration Steps

### To PostgreSQL (Supabase, AWS RDS, etc.)

1. Create new database
2. Run the schema script:
   ```bash
   psql -U username -d database_name -f supabase_complete_schema.sql
   ```
3. Migrate your data using pg_dump/pg_restore or custom ETL scripts

### To Microsoft SQL Server

1. Create new database:
   ```sql
   CREATE DATABASE AssetManagement;
   GO
   USE AssetManagement;
   ```
2. Run the schema script:
   ```bash
   sqlcmd -S server_name -U username -P password -d AssetManagement -i mssql_schema.sql
   ```
3. Migrate data using SQL Server Integration Services (SSIS) or custom scripts

## Key Differences Between PostgreSQL and SQL Server

| Feature | PostgreSQL | SQL Server |
|---------|-----------|------------|
| UUID Generation | `gen_random_uuid()` | `NEWID()` |
| Auto-timestamp | `DEFAULT now()` | `DEFAULT GETDATE()` |
| Boolean | `BOOLEAN` | `BIT` |
| JSON | `JSONB` | `NVARCHAR(MAX)` |
| Text | `TEXT` | `NVARCHAR` |
| Timestamps | `TIMESTAMPTZ` | `DATETIME2` |
| Enums | Native `ENUM` type | `VARCHAR` with CHECK constraint |
| Functions | `plpgsql` | Stored Procedures |
| Row Level Security | Native RLS policies | Application-layer or views |

## Data Migration Tips

1. **Export Data**: Use your current database's export tools
   - Supabase: Use pg_dump or the Table Editor export
   
2. **Transform Data**: Adjust for type differences
   - Convert `TIMESTAMPTZ` to `DATETIME2` for SQL Server
   - Convert `BOOLEAN` to `BIT` (true=1, false=0)
   - Convert `JSONB` to `NVARCHAR(MAX)` for SQL Server

3. **Import Data**: Load in dependency order
   1. companies
   2. locations, categories, vendors
   3. departments, employees
   4. assets, licenses
   5. asset_transactions, audit_log

## Sample Data Export Query (PostgreSQL)

```sql
-- Export companies
COPY (SELECT * FROM companies) TO '/tmp/companies.csv' WITH CSV HEADER;

-- Export locations with company names
COPY (
  SELECT l.*, c.name as company_name 
  FROM locations l 
  JOIN companies c ON l.company_id = c.id
) TO '/tmp/locations.csv' WITH CSV HEADER;
```

## Post-Migration Checklist

- [ ] All tables created successfully
- [ ] All indexes created
- [ ] All foreign key constraints working
- [ ] Sample data loaded
- [ ] Test user created with admin role
- [ ] Test adding a location/asset
- [ ] Verify RLS policies (PostgreSQL) or implement equivalent (SQL Server)
- [ ] Update app connection strings
- [ ] Test all CRUD operations

## Security Notes

### PostgreSQL RLS
The PostgreSQL schema includes Row Level Security policies that:
- Require `approval_status = 'approved'` for SELECT
- Require `admin` or `it` role for INSERT/UPDATE/DELETE

### SQL Server
SQL Server version uses stored procedures for permission checks. Implement these at the application layer or use SQL Server's native row-level security features (2016+ Enterprise Edition).

## Support

If you encounter issues during migration:
1. Check the error logs for specific table/column issues
2. Verify data types match between source and target
3. Ensure foreign key references are loaded in correct order
4. Check for null values in required fields

## License

This schema is part of the Asset Management System project.
