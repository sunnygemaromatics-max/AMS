@echo off
REM ============================================================
REM Windows Batch Script to Set Up Local PostgreSQL
REM Run this as Administrator
REM ============================================================

echo ================================================
echo Asset Harmony - Local PostgreSQL Setup
echo ================================================
echo.

REM Set PostgreSQL path - adjust if yours is different
set PGPATH=C:\Program Files\PostgreSQL\15\bin
set PGUSER=postgres
set DBNAME=asset_harmony

echo Step 1: Checking PostgreSQL...
if not exist "%PGPATH%\psql.exe" (
    echo ERROR: PostgreSQL not found at %PGPATH%
    echo Please update PGPATH in this script to your PostgreSQL bin folder
    pause
    exit /b 1
)
echo PostgreSQL found!
echo.

REM Get password from user
echo Step 2: Enter PostgreSQL password for user '%PGUSER%':
set /p PGPASSWORD=Password: 
echo.

set PGPASSWORD=%PGPASSWORD%

echo Step 3: Creating database '%DBNAME%'...
"%PGPATH%\createdb.exe" -U %PGUSER% %DBNAME% 2>nul
if %errorlevel% neq 0 (
    echo Database may already exist, continuing...
)
echo.

echo Step 4: Creating schema (tables, functions, policies)...
"%PGPATH%\psql.exe" -U %PGUSER% -d %DBNAME% -f "supabase_complete_schema.sql"
if %errorlevel% neq 0 (
    echo ERROR: Schema creation failed!
    pause
    exit /b 1
)
echo Schema created successfully!
echo.

echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Run 'export_from_supabase.sql' in Supabase SQL Editor
echo 2. Save the output to data files
echo 3. Import the data files using:
echo    psql -U %PGUSER% -d %DBNAME% -f your_data_file.sql
echo 4. Run 'verify_local_setup.sql' to check everything
echo 5. Update your app to connect to local database
echo.
echo Database: %DBNAME%
echo User: %PGUSER%
echo Host: localhost
echo Port: 5432
echo.
pause
