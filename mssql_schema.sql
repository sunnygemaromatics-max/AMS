-- ============================================================
-- MICROSOFT SQL SERVER SCHEMA
-- Conversion from PostgreSQL for SQL Server
-- ============================================================

-- ============================================================
-- SECTION 1: DATABASE CREATION
-- ============================================================
-- CREATE DATABASE AssetManagement;
-- GO
-- USE AssetManagement;
-- GO

-- ============================================================
-- SECTION 2: TABLES
-- ============================================================

-- Companies Table
CREATE TABLE companies (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    code NVARCHAR(50) NOT NULL UNIQUE,
    address NVARCHAR(500),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Locations Table
CREATE TABLE locations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    code NVARCHAR(50) NOT NULL UNIQUE,
    address NVARCHAR(500),
    company_id UNIQUEIDENTIFIER REFERENCES companies(id),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Departments Table
CREATE TABLE departments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    code NVARCHAR(50) NOT NULL UNIQUE,
    company_id UNIQUEIDENTIFIER REFERENCES companies(id),
    location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Categories Table (using VARCHAR for enum)
CREATE TABLE categories (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    code NVARCHAR(50) NOT NULL UNIQUE,
    parent_id UNIQUEIDENTIFIER REFERENCES categories(id),
    asset_type VARCHAR(20) NOT NULL DEFAULT 'tangible' CHECK (asset_type IN ('tangible','intangible')),
    is_consumable BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Vendors Table
CREATE TABLE vendors (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    contact_person NVARCHAR(255),
    email NVARCHAR(255),
    phone NVARCHAR(50),
    address NVARCHAR(500),
    gst_number NVARCHAR(50),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Employees Table
CREATE TABLE employees (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    phone NVARCHAR(50),
    department_id UNIQUEIDENTIFIER REFERENCES departments(id),
    location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    company_id UNIQUEIDENTIFIER REFERENCES companies(id),
    reporting_manager UNIQUEIDENTIFIER REFERENCES employees(id),
    employee_type NVARCHAR(50),
    designation NVARCHAR(100),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Assets Table
CREATE TABLE assets (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    sap_code NVARCHAR(100) NOT NULL UNIQUE,
    bin_card_no INT,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    category_id UNIQUEIDENTIFIER REFERENCES categories(id),
    vendor_id UNIQUEIDENTIFIER REFERENCES vendors(id),
    company_id UNIQUEIDENTIFIER REFERENCES companies(id),
    location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    current_employee_id UNIQUEIDENTIFIER REFERENCES employees(id),
    current_location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    purchase_date DATE,
    purchase_cost DECIMAL(15,2),
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available','allocated','under_maintenance','lost','damaged','scrapped')),
    asset_type VARCHAR(20) NOT NULL DEFAULT 'tangible' CHECK (asset_type IN ('tangible','intangible')),
    asset_subtype VARCHAR(50) CHECK (asset_subtype IN ('laptop','desktop','printer','scanner','server','mobile_device','tablet','antivirus','email_account','sap_license','software_license','networking','ups','other')),
    serial_number NVARCHAR(100),
    model_number NVARCHAR(100),
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2,
    deleted_by UNIQUEIDENTIFIER,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Licenses Table
CREATE TABLE licenses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    license_key NVARCHAR(255) NOT NULL,
    license_type NVARCHAR(100),
    software_name NVARCHAR(255) NOT NULL,
    vendor_id UNIQUEIDENTIFIER REFERENCES vendors(id),
    seats INT DEFAULT 1,
    assigned_employee_id UNIQUEIDENTIFIER REFERENCES employees(id),
    assigned_asset_id UNIQUEIDENTIFIER REFERENCES assets(id),
    company_id UNIQUEIDENTIFIER REFERENCES companies(id),
    location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    purchase_date DATE,
    expiry_date DATE,
    cost DECIMAL(15,2),
    notes NVARCHAR(MAX),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Asset Transactions Table
CREATE TABLE asset_transactions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    asset_id UNIQUEIDENTIFIER NOT NULL REFERENCES assets(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('allocation','return','transfer','maintenance_start','maintenance_end','lost','damaged','scrapped','purchase')),
    from_employee_id UNIQUEIDENTIFIER REFERENCES employees(id),
    to_employee_id UNIQUEIDENTIFIER REFERENCES employees(id),
    from_location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    to_location_id UNIQUEIDENTIFIER REFERENCES locations(id),
    performed_by UNIQUEIDENTIFIER,
    transaction_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    notes NVARCHAR(MAX),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Users Table (equivalent to auth.users in Supabase)
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255),
    full_name NVARCHAR(255),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Profiles Table
CREATE TABLE profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name NVARCHAR(255),
    avatar_url NVARCHAR(500),
    employee_id UNIQUEIDENTIFIER REFERENCES employees(id) ON DELETE SET NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    approved_by UNIQUEIDENTIFIER REFERENCES users(id),
    approved_at DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- User Roles Table
CREATE TABLE user_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin','it','hr','viewer')),
    UNIQUE(user_id, role)
);

-- Audit Log Table
CREATE TABLE audit_log (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    table_name NVARCHAR(100) NOT NULL,
    record_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(50) NOT NULL,
    old_data NVARCHAR(MAX),
    new_data NVARCHAR(MAX),
    performed_by UNIQUEIDENTIFIER,
    performed_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Organization Settings Table
CREATE TABLE organization_settings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    org_name NVARCHAR(255) NOT NULL DEFAULT 'Asset Management System',
    org_address NVARCHAR(500),
    org_phone NVARCHAR(50),
    org_email NVARCHAR(255),
    org_website NVARCHAR(255),
    logo_url NVARCHAR(500),
    primary_color NVARCHAR(20),
    pdf_footer_text NVARCHAR(500),
    email_alerts_enabled BIT DEFAULT 0,
    email_alert_days_before INT DEFAULT 30,
    email_alert_time NVARCHAR(10) DEFAULT '09:00',
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Import Runs Table
CREATE TABLE import_runs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    file_name NVARCHAR(255) NOT NULL,
    entity_type NVARCHAR(50) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    error_rows INT NOT NULL DEFAULT 0,
    errors NVARCHAR(MAX),
    started_by UNIQUEIDENTIFIER,
    started_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    completed_at DATETIME2
);

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

CREATE INDEX idx_assets_sap_code ON assets(sap_code);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_employee ON assets(current_employee_id);
CREATE INDEX idx_assets_location ON assets(current_location_id);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_manager ON employees(reporting_manager);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_location ON employees(location_id);
CREATE INDEX idx_locations_company ON locations(company_id);
CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_departments_location ON departments(location_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_transactions_asset ON asset_transactions(asset_id);
CREATE INDEX idx_licenses_expiry ON licenses(expiry_date);
CREATE INDEX idx_profiles_employee ON profiles(employee_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- ============================================================
-- SECTION 4: TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE TRIGGER trg_companies_updated
ON companies AFTER UPDATE
AS
BEGIN
    UPDATE companies SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_locations_updated
ON locations AFTER UPDATE
AS
BEGIN
    UPDATE locations SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_departments_updated
ON departments AFTER UPDATE
AS
BEGIN
    UPDATE departments SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_categories_updated
ON categories AFTER UPDATE
AS
BEGIN
    UPDATE categories SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_vendors_updated
ON vendors AFTER UPDATE
AS
BEGIN
    UPDATE vendors SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_employees_updated
ON employees AFTER UPDATE
AS
BEGIN
    UPDATE employees SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_assets_updated
ON assets AFTER UPDATE
AS
BEGIN
    UPDATE assets SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER trg_licenses_updated
ON licenses AFTER UPDATE
AS
BEGIN
    UPDATE licenses SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;

-- ============================================================
-- SECTION 5: SEED DATA
-- ============================================================

INSERT INTO organization_settings (org_name, pdf_footer_text)
VALUES ('Asset Management System', 'Generated by Asset Management System');

-- ============================================================
-- SECTION 6: STORED PROCEDURES (Security Functions)
-- ============================================================

CREATE PROCEDURE sp_HasRole
    @user_id UNIQUEIDENTIFIER,
    @role VARCHAR(20),
    @result BIT OUTPUT
AS
BEGIN
    SET @result = CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = @user_id AND role = @role) THEN 1 ELSE 0 END;
END;

CREATE PROCEDURE sp_IsApproved
    @user_id UNIQUEIDENTIFIER,
    @result BIT OUTPUT
AS
BEGIN
    SET @result = CASE WHEN EXISTS (SELECT 1 FROM profiles WHERE id = @user_id AND approval_status = 'approved') THEN 1 ELSE 0 END;
END;

CREATE PROCEDURE sp_CanWriteAssets
    @user_id UNIQUEIDENTIFIER,
    @result BIT OUTPUT
AS
BEGIN
    DECLARE @isApproved BIT, @isAdmin BIT, @isIT BIT;
    
    EXEC sp_IsApproved @user_id, @isApproved OUTPUT;
    EXEC sp_HasRole @user_id, 'admin', @isAdmin OUTPUT;
    EXEC sp_HasRole @user_id, 'it', @isIT OUTPUT;
    
    SET @result = CASE WHEN @isApproved = 1 AND (@isAdmin = 1 OR @isIT = 1) THEN 1 ELSE 0 END;
END;

SELECT 'SQL Server Schema created successfully!' as Status;
