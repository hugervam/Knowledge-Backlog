@echo off
setlocal enabledelayedexpansion

echo [DEBUG] Script started
echo === Knowledge Backlog Setup Script ===
echo ====================================
echo [DEBUG] After header
pause

echo Current directory: %CD%
echo Command prompt version: %CMDCMDLINE%
echo [DEBUG] After directory info
pause

REM Test if we can execute basic commands
echo Testing basic command execution...
echo Test 1: dir
dir
echo.
echo Test 2: echo
echo This is a test
echo.

echo [DEBUG] About to check command_exists function
echo [DEBUG] Current errorlevel: %errorlevel%

REM Function to check if a command exists
:command_exists
echo [DEBUG] Inside command_exists function
where %1 >nul 2>nul
if %errorlevel% neq 0 (
    echo [DEBUG] Command %1 not found
    exit /b 1
) else (
    echo [DEBUG] Command %1 found
    exit /b 0
)

echo [DEBUG] After command_exists function definition

REM Function to install project dependencies
:install_dependencies
echo Installing project dependencies...

REM Install backend dependencies
if exist "backend" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    if !errorlevel! neq 0 (
        echo Failed to install backend dependencies
        exit /b 1
    )
    cd ..
) else (
    echo Backend directory not found
    exit /b 1
)

REM Install frontend dependencies
if exist "frontend" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    if !errorlevel! neq 0 (
        echo Failed to install frontend dependencies
        exit /b 1
    )
    cd ..
) else (
    echo Frontend directory not found
    exit /b 1
)
goto :eof

REM Check for Node.js
echo Checking for Node.js...
call :command_exists node
if %errorlevel% neq 0 (
    echo Node.js is not installed
    echo Installing Node.js...
    
    REM Download Node.js installer
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.17.0/node-v18.17.0-x64.msi' -OutFile 'node-installer.msi'}"
    if %errorlevel% neq 0 (
        echo Failed to download Node.js installer
        pause
        exit /b 1
    )
    
    REM Install Node.js silently
    msiexec /i node-installer.msi /qn
    if %errorlevel% neq 0 (
        echo Failed to install Node.js
        pause
        exit /b 1
    )
    
    REM Wait for installation to complete
    timeout /t 30 /nobreak > nul
    
    REM Clean up installer
    del node-installer.msi
    
    REM Refresh environment variables
    call refreshenv.cmd
) else (
    echo Node.js is already installed
    node --version
)

REM Check for npm
echo Checking for npm...
call :command_exists npm
if %errorlevel% neq 0 (
    echo npm is not installed
    echo Please run the Node.js installer again
    pause
    exit /b 1
) else (
    echo npm is already installed
    npm --version
)

REM Check for Git
echo Checking for Git...
call :command_exists git
if %errorlevel% neq 0 (
    echo Git is not installed
    echo Installing Git...
    
    REM Download Git installer
    powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/Git-2.41.0-64-bit.exe' -OutFile 'git-installer.exe'}"
    if %errorlevel% neq 0 (
        echo Failed to download Git installer
        pause
        exit /b 1
    )
    
    REM Install Git silently
    git-installer.exe /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
    if %errorlevel% neq 0 (
        echo Failed to install Git
        pause
        exit /b 1
    )
    
    REM Wait for installation to complete
    timeout /t 30 /nobreak > nul
    
    REM Clean up installer
    del git-installer.exe
    
    REM Refresh environment variables
    call refreshenv.cmd
) else (
    echo Git is already installed
    git --version
)

REM Install global npm packages
echo Installing global npm packages...
call npm install -g npm@latest
if %errorlevel% neq 0 (
    echo Failed to update npm
    pause
    exit /b 1
)

REM Check if we're in a git repository
if not exist ".git" (
    echo Repository not found. Please make sure you're in the correct directory.
    pause
    exit /b 1
)

REM Install project dependencies
call :install_dependencies
if %errorlevel% neq 0 (
    echo Failed to install project dependencies
    pause
    exit /b 1
)

echo.
echo === Setup Complete ===
echo You can now run start-servers.bat to start the application
echo.

REM Keep the window open
pause 
