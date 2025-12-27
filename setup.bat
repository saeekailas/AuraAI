@echo off
REM AuraAI Quick Start Script for Windows
REM This script helps you set up and run AuraAI

setlocal enabledelayedexpansion
color 0A

echo.
echo ========================================
echo  AuraAI Quick Start Setup
echo ========================================
echo.

REM Check prerequisites
echo Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 20+
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.11+
    echo Download from: https://www.python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION%

REM Check Docker (optional)
where docker >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version') do echo [OK] %%i
) else (
    echo [WARNING] Docker not found (optional for containerized deployment)
)

echo.
echo Setting up environment variables...

REM Create .env if it doesn't exist
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo [OK] Created .env from .env.example
        echo [ERROR] Please update GEMINI_API_KEY in .env with your actual API key
        pause
        exit /b 1
    ) else (
        echo [ERROR] .env.example not found
        pause
        exit /b 1
    )
) else (
    echo [OK] .env already exists
)

echo.
echo Installing dependencies...

REM Frontend dependencies
echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

REM Backend dependencies
echo Installing backend dependencies...
cd backend

REM Create virtual environment
if not exist venv (
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

REM Deactivate virtual environment
call venv\Scripts\deactivate.bat

cd ..
echo [OK] Backend dependencies installed

REM Build frontend
echo.
echo Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build frontend
    pause
    exit /b 1
)
echo [OK] Frontend built successfully

REM Show next steps
echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Start Backend (Command Prompt 1):
echo    cd backend
echo    venv\Scripts\activate
echo    python main.py
echo.
echo 2. Start Frontend (Command Prompt 2):
echo    npm run dev
echo.
echo 3. Open in browser:
echo    http://localhost:3000
echo.
echo 4. API Documentation:
echo    http://localhost:8000/docs
echo.
echo For Docker deployment:
echo    docker-compose up -d
echo.
echo Resources:
echo    - Documentation: PRODUCTION_README.md
echo    - Environment Template: .env.example
echo    - Gemini API: https://ai.google.dev
echo.

pause
