@echo off
REM ============================================================
REM Clean up temporary SQL files from project
REM Keeps only essential files
REM ============================================================

echo ================================================
echo Cleaning up temporary SQL files
echo ================================================
echo.

REM List of files to DELETE (temporary fixes)
set "FILES_TO_DELETE=^"
supabase_approve_final.sql ^
supabase_approve_me.sql ^
supabase_approve_user.sql ^
supabase_complete_fix.sql ^
supabase_debug_permissions.sql ^
supabase_fix_by_email.sql ^
supabase_fix_has_role.sql ^
supabase_fix_rls_complete.sql ^
supabase_fix_trigger.sql ^
supabase_user_check.sql ^
supabase_verify_fix.sql ^
MAKE_ADMIN_ALL_POWERFUL.sql ^
NUCLEAR_FIX.sql ^
EMERGENCY_DISABLE_RLS.sql ^
REENABLE_RLS.sql ^
FIND_ACTUAL_USER.sql ^
LOCAL_POSTGRES_SETUP.md ^
REMOTE_SERVER_SETUP.md ^
DATABASE_MIGRATION_GUIDE.md ^
mssql_schema.sql ^
supabase_complete_schema.sql ^
update_app_connection.md ^
CLEANUP_PROJECT.bat"

for %%f in (%FILES_TO_DELETE%) do (
    if exist "%%f" (
        echo Deleting: %%f
        del "%%f"
    )
)

echo.
echo ================================================
echo Files kept:
echo ================================================
echo.
echo ✅ COMPLETE_DATABASE_REPAIR.sql - Main repair script
echo ✅ export_from_supabase.sql - Data export utility
echo ✅ verify_local_setup.sql - Verification script
echo ✅ setup_remote_postgres.sh - Server setup
echo ✅ README.md - Project documentation
echo.
pause
