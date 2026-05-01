@echo off
REM ================================================================
REM  CWY LICENSE SYSTEM - COMPLETE TEST SUITE
REM ================================================================

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║        🎉 CWY LICENSE SYSTEM - AUTOMATED TESTS 🎉           ║
echo ║                                                              ║
echo ╔══════════════════════════════════════════════════════════════╝
echo.

REM Check Python
echo [CHECK] Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python not found!
    echo Please install Python from: https://python.org
    pause
    exit /b 1
)
python --version
echo ✅ Python OK
echo.

REM Check if backend directory exists
if not exist "backend" (
    echo ❌ ERROR: backend directory not found!
    echo Make sure you're in the CWY root directory.
    pause
    exit /b 1
)

cd backend

REM Create venv if needed
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install dependencies
echo [SETUP] Installing dependencies...
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo ✅ Dependencies installed
echo.

REM Check .env file
if not exist ".env" (
    echo ⚠️  WARNING: .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Edit .env and add STRIPE_SECRET_KEY!
    echo.
)

echo ================================================================
echo  STARTING TESTS
echo ================================================================
echo.

REM Test 1: Backend start check
echo [TEST 1/4] Backend Start Test
echo Starting backend in background...
start /B python stripe_webhook.py > nul 2>&1

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Test 2: Health check
echo [TEST 2/4] Health Check
curl -s http://localhost:8000/ > temp_health.json 2>nul
if exist temp_health.json (
    type temp_health.json
    del temp_health.json
    echo ✅ Health check passed
) else (
    echo ❌ Health check failed
)
echo.

REM Test 3: Stats API
echo [TEST 3/4] Stats API
curl -s http://localhost:8000/api/stats > temp_stats.json 2>nul
if exist temp_stats.json (
    type temp_stats.json
    del temp_stats.json
    echo ✅ Stats API passed
) else (
    echo ❌ Stats API failed
)
echo.

REM Test 4: Automated test script
echo [TEST 4/4] Running automated tests...
python test_backend.py
echo.

REM Kill backend process
echo Stopping backend...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq stripe_webhook*" > nul 2>&1

echo ================================================================
echo  TESTS COMPLETE
echo ================================================================
echo.
echo Next steps:
echo   1. Check that all tests passed ✅
echo   2. Get STRIPE_SECRET_KEY from dashboard
echo   3. Run: start.bat (to start backend normally)
echo   4. Test with Stripe CLI: stripe trigger checkout.session.completed
echo.
pause
