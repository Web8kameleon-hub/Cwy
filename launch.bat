@echo off
REM ================================================================
REM  CWY LICENSE SYSTEM - MASTER LAUNCHER
REM ================================================================

:MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║        🎉 CWY LICENSE SYSTEM - MASTER LAUNCHER 🎉           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  What would you like to do?
echo.
echo  1. 🧪 Run Tests (Automated)
echo  2. 🚀 Start Backend (Local)
echo  3. 📊 Check Database
echo  4. 🌐 Deploy to Production
echo  5. 📚 View Documentation
echo  6. ❌ Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto TEST
if "%choice%"=="2" goto START
if "%choice%"=="3" goto DATABASE
if "%choice%"=="4" goto DEPLOY
if "%choice%"=="5" goto DOCS
if "%choice%"=="6" goto EXIT
goto MENU

:TEST
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Running Automated Tests...                                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
call test-all.bat
pause
goto MENU

:START
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Starting Backend Server...                                  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
cd backend
call start.bat
pause
goto MENU

:DATABASE
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Database Contents                                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
if not exist "backend\cwy_licenses.db" (
    echo ⚠️  Database not found. Run backend first to create it.
) else (
    echo Licenses in database:
    echo.
    sqlite3 backend\cwy_licenses.db "SELECT license_key, tier, email, activated_at FROM licenses;" 2>nul
    if errorlevel 1 (
        echo ⚠️  sqlite3 not found. Install from: https://sqlite.org/download.html
        echo.
        echo Or view database file: backend\cwy_licenses.db
    )
)
echo.
pause
goto MENU

:DEPLOY
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Deploy to Production                                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo This will deploy CWY License Backend to kameleon.life
echo.
echo Prerequisites:
echo   ✅ SSH access to kameleon.life
echo   ✅ .env file with live Stripe keys
echo   ✅ All tests passing locally
echo.
set /p confirm="Continue with deployment? (y/n): "
if /i not "%confirm%"=="y" goto MENU

echo.
echo Opening deployment guide...
start DEPLOYMENT_CHECKLIST.md
echo.
echo Follow the checklist step by step.
echo Or run: bash backend/deploy.sh (if you have Git Bash)
echo.
pause
goto MENU

:DOCS
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Documentation                                               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Available documentation:
echo.
echo  📖 MASTER_SUMMARY.md           - Complete overview
echo  🚀 DEPLOYMENT_CHECKLIST.md     - Deployment steps
echo  🧪 backend\TESTING_GUIDE.md    - Testing procedures
echo  📊 DASHBOARD_INTEGRATION.md    - Dashboard integration
echo  📋 QUICK_REF_CARD.txt          - Quick reference
echo.
set /p doc="Enter filename to open (or press Enter to go back): "
if "%doc%"=="" goto MENU
if exist "%doc%" (
    start %doc%
) else (
    echo ❌ File not found: %doc%
)
pause
goto MENU

:EXIT
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  Thanks for using CWY License System! 🎉                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Quick commands for next time:
echo.
echo    test-all.bat           - Run automated tests
echo    backend\start.bat      - Start backend
echo    launch.bat             - Open this menu
echo.
echo  Documentation: MASTER_SUMMARY.md
echo.
timeout /t 3 /nobreak > nul
exit /b 0
