# Knowledge Backlog Setup Script
Write-Host "=== Knowledge Backlog Setup Script ===" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Function to check if a command exists
function Test-CommandExists {
    param (
        [string]$Command
    )
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Function to install project dependencies
function Install-ProjectDependencies {
    Write-Host "Installing project dependencies..." -ForegroundColor Yellow

    # Install backend dependencies
    if (Test-Path "backend") {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install backend dependencies" -ForegroundColor Red
            return $false
        }
        Set-Location ..
    } else {
        Write-Host "Backend directory not found" -ForegroundColor Red
        return $false
    }

    # Install frontend dependencies
    if (Test-Path "frontend") {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Set-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install frontend dependencies" -ForegroundColor Red
            return $false
        }
        Set-Location ..
    } else {
        Write-Host "Frontend directory not found" -ForegroundColor Red
        return $false
    }

    return $true
}

# Check for Node.js
Write-Host "Checking for Node.js..." -ForegroundColor Yellow
if (-not (Test-CommandExists "node")) {
    Write-Host "Node.js is not installed" -ForegroundColor Yellow
    Write-Host "Installing Node.js..." -ForegroundColor Yellow

    try {
        # Download Node.js installer - using LTS version 20.x
        $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
        $installerPath = Join-Path $PWD.Path "node-installer.msi"

        Write-Host "Downloading Node.js installer..." -ForegroundColor Yellow
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing

        # Install Node.js
        Write-Host "Installing Node.js..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i", $installerPath, "/qn" -Wait

        # Clean up installer
        Remove-Item $installerPath -Force

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    }
    catch {
        Write-Host "Failed to install Node.js: $_" -ForegroundColor Red
        Write-Host "Please download and install Node.js manually from https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "After installing Node.js, run this script again" -ForegroundColor Yellow
        exit 1
    }
} else {
    $nodeVersion = node --version
    Write-Host "Node.js is already installed: $nodeVersion" -ForegroundColor Green
    
    # Check if Node.js version is compatible
    $version = [Version]($nodeVersion -replace 'v', '')
    $minVersion = [Version]"20.0.0"
    if ($version -lt $minVersion) {
        Write-Host "Warning: Node.js version is older than recommended (v20.x)" -ForegroundColor Yellow
        Write-Host "Some features might not work correctly" -ForegroundColor Yellow
        Write-Host "Consider updating to Node.js v20.x LTS" -ForegroundColor Yellow
    }
}

# Check for npm
Write-Host "Checking for npm..." -ForegroundColor Yellow
if (-not (Test-CommandExists "npm")) {
    Write-Host "npm is not installed" -ForegroundColor Red
    Write-Host "Please run the Node.js installer again" -ForegroundColor Yellow
    exit 1
} else {
    $npmVersion = npm --version
    Write-Host "npm is already installed: $npmVersion" -ForegroundColor Green
}

# Check for Git
Write-Host "Checking for Git..." -ForegroundColor Yellow
if (-not (Test-CommandExists "git")) {
    Write-Host "Git is not installed" -ForegroundColor Yellow
    Write-Host "Installing Git..." -ForegroundColor Yellow

    try {
        # Download Git installer
        $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/Git-2.41.0-64-bit.exe"
        $installerPath = Join-Path $PWD.Path "git-installer.exe"

        Write-Host "Downloading Git installer..." -ForegroundColor Yellow
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $gitUrl -OutFile $installerPath -UseBasicParsing

        # Install Git
        Write-Host "Installing Git..." -ForegroundColor Yellow
        Start-Process $installerPath -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-", "/CLOSEAPPLICATIONS", "/RESTARTAPPLICATIONS", "/COMPONENTS=`"icons,ext\reg\shellhere,assoc,assoc_sh`"" -Wait

        # Clean up installer
        Remove-Item $installerPath -Force

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    }
    catch {
        Write-Host "Failed to install Git: $_" -ForegroundColor Red
        Write-Host "Please download and install Git manually from https://git-scm.com/download/win" -ForegroundColor Yellow
        Write-Host "After installing Git, run this script again" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Git is already installed: $(git --version)" -ForegroundColor Green
}

# Install global npm packages
Write-Host "Installing global npm packages..." -ForegroundColor Yellow
# Install a compatible version of npm based on Node.js version
$nodeVersion = node --version
$version = [Version]($nodeVersion -replace 'v', '')
if ($version -ge [Version]"20.0.0") {
    npm install -g npm@latest
} else {
    # Use a version compatible with Node.js 18.x
    npm install -g npm@9.8.1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update npm" -ForegroundColor Red
    Write-Host "Continuing with current npm version..." -ForegroundColor Yellow
}

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "Repository not found. Please make sure you're in the correct directory." -ForegroundColor Red
    exit 1
}

# Install project dependencies
if (-not (Install-ProjectDependencies)) {
    Write-Host "Failed to install project dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "You can now run start-servers.ps1 to start the application" -ForegroundColor Green

# Keep the window open
Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 
