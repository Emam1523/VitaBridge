@echo off
echo ========================================
echo VitaBridge Backend2 Setup Verification
echo ========================================
echo.

REM Check Python installation
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Python is not installed or not in PATH
    echo        Download from: https://www.python.org/downloads/
    goto :error
) else (
    python --version
    echo [OK] Python is installed
)
echo.

REM Check Tesseract installation
echo [2/5] Checking Tesseract OCR installation...
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    "C:\Program Files\Tesseract-OCR\tesseract.exe" --version 2>nul | findstr /C:"tesseract" >nul
    if %errorlevel% equ 0 (
        echo [OK] Tesseract is installed at: C:\Program Files\Tesseract-OCR\tesseract.exe
    ) else (
        echo [WARN] Tesseract executable found but may not be working correctly
    )
) else (
    echo [FAIL] Tesseract is not installed at the default location
    echo        Download from: https://github.com/UB-Mannheim/tesseract/wiki
    echo        Install to: C:\Program Files\Tesseract-OCR
    goto :error
)
echo.

REM Check .env file
echo [3/5] Checking .env configuration...
if exist ".env" (
    echo [OK] .env file exists
    findstr /C:"TESSERACT_CMD" .env >nul
    if %errorlevel% equ 0 (
        echo [OK] TESSERACT_CMD is configured
    ) else (
        echo [WARN] TESSERACT_CMD not found in .env
    )
    findstr /C:"DATABASE_URL" .env >nul
    if %errorlevel% equ 0 (
        echo [OK] DATABASE_URL is configured
    ) else (
        echo [FAIL] DATABASE_URL not found in .env
        goto :error
    )
) else (
    echo [FAIL] .env file not found
    echo        Create .env file with required configuration
    goto :error
)
echo.

REM Check virtual environment
echo [4/5] Checking virtual environment...
if exist ".venv" (
    echo [OK] Virtual environment exists
) else (
    echo [INFO] Virtual environment not found, will be created on first run
)
echo.

REM Check if port 8011 is available
echo [5/5] Checking if port 8011 is available...
netstat -ano | findstr :8011 >nul
if %errorlevel% equ 0 (
    echo [WARN] Port 8011 is already in use
    echo        You may need to stop the existing process or change the port
) else (
    echo [OK] Port 8011 is available
)
echo.

echo ========================================
echo Verification Complete!
echo ========================================
echo.
echo All checks passed! You can now start backend2 by running:
echo   start.bat
echo.
echo The service will be available at:
echo   http://localhost:8011
echo.
echo API documentation will be at:
echo   http://localhost:8011/docs
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo Verification Failed!
echo ========================================
echo.
echo Please fix the issues above and run this script again.
echo.
echo For detailed setup instructions, see:
echo   backend2\README.md
echo.
pause
exit /b 1
