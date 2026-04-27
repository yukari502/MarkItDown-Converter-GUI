@echo off
chcp 65001 >nul
title MarkItDown Converter - Setup
echo ============================================
echo   MarkItDown Converter - Environment Setup
echo ============================================
echo.

REM Check Python
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)
python --version
echo.

REM Check Node.js
echo [2/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

REM Create Python virtual environment
echo [3/4] Creating Python virtual environment...
if exist ".venv\" (
    echo   Virtual environment already exists, skipping...
) else (
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   Virtual environment created successfully.
)
echo.

REM Install Python dependencies
echo [4/6] Installing Python dependencies...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

echo   Installing markitdown...
pip install "markitdown[all]"
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install markitdown. You may need to install it manually.
)

echo   Installing openai (optional, for LLM features)...
pip install openai
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install openai. LLM features will be unavailable.
)

echo   Python dependencies installed successfully.
echo.

REM Install Node.js dependencies
echo [5/6] Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo   Node.js dependencies installed successfully.
echo.

REM Cleanup
echo [6/6] Finalizing...
REM Deactivate venv (stays in subshell)
echo.

echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo   Run the application with:
echo     npm start
echo.
pause
