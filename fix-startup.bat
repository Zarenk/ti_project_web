@echo off
echo ============================================
echo    Fix Frontend & Backend Startup Issues
echo ============================================
echo.

echo [1/4] Stopping all Node.js processes...
taskkill /F /IM node.exe /T 2>nul
if %errorlevel% equ 0 (
    echo ✓ Node processes stopped
) else (
    echo ℹ No Node processes to stop
)
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Cleaning frontend build cache...
cd /d "%~dp0fronted"
if exist .next (
    echo ℹ Deleting .next directory...
    rmdir /s /q .next 2>nul
    timeout /t 1 /nobreak >nul
    if exist .next (
        echo ⚠ Could not delete .next, trying alternative method...
        rd /s /q .next 2>nul || (
            echo ⚠ Manual deletion required: Right-click fronted\.next, delete, then run script again
            pause
            exit /b 1
        )
    )
    echo ✓ .next directory cleaned
) else (
    echo ℹ .next directory already clean
)

echo.
echo [3/4] Cleaning backend build cache...
cd /d "%~dp0backend"
if exist dist (
    echo ℹ Deleting dist directory...
    rmdir /s /q dist 2>nul
    echo ✓ dist directory cleaned
) else (
    echo ℹ dist directory already clean
)

echo.
echo [4/4] Ready to start services!
echo.
echo ============================================
echo  Next Steps:
echo ============================================
echo  1. Start Backend:  cd backend  ^&^& npm run start:dev
echo  2. Start Frontend: cd fronted  ^&^& npm run dev
echo ============================================
echo.
pause
