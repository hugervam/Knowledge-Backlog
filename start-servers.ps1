# Knowledge Backlog Server Starter
Write-Host "=== Knowledge Backlog Server Starter ===" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Function to check and kill process on a port
function Stop-ProcessOnPort {
    param (
        [int]$Port
    )
    Write-Host "Checking if port $Port is in use..." -ForegroundColor Yellow
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
               Where-Object State -eq 'Listen' | 
               Select-Object -ExpandProperty OwningProcess
    
    if ($process) {
        Write-Host "Process found running on port $Port (PID: $process)" -ForegroundColor Yellow
        Write-Host "Killing process..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force
        Write-Host "Process killed." -ForegroundColor Green
    }
}

# Function to start a server
function Start-Server {
    param (
        [string]$Name,
        [string]$Directory,
        [string]$Command,
        [string]$Url
    )
    
    Write-Host "`nStarting $Name server..." -ForegroundColor Yellow
    if (-not (Test-Path $Directory)) {
        Write-Host "Error: $Directory directory not found!" -ForegroundColor Red
        return $false
    }
    
    # Install dependencies if needed
    if (Test-Path (Join-Path $Directory "package.json")) {
        Write-Host "Installing $Name dependencies..." -ForegroundColor Yellow
        Set-Location $Directory
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install $Name dependencies" -ForegroundColor Red
            return $false
        }
        Set-Location ..
    }
    
    # Start the server
    $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Directory'; $Command" -PassThru
    if ($process) {
        Write-Host "$Name server started successfully" -ForegroundColor Green
        Write-Host "Running on: $Url" -ForegroundColor Green
        return $true
    } else {
        Write-Host "Failed to start $Name server" -ForegroundColor Red
        return $false
    }
}

# Function to create cleanup script
function New-CleanupScript {
    $cleanupScript = @"
# Knowledge Backlog Server Cleanup
Write-Host "Stopping servers..." -ForegroundColor Yellow

# Stop backend server
Get-Process | Where-Object { `$_.MainWindowTitle -eq 'Knowledge Backlog Backend' } | Stop-Process -Force
Write-Host "Backend server stopped" -ForegroundColor Green

# Stop frontend server
Get-Process | Where-Object { `$_.MainWindowTitle -eq 'Knowledge Backlog Frontend' } | Stop-Process -Force
Write-Host "Frontend server stopped" -ForegroundColor Green

Write-Host "All servers stopped" -ForegroundColor Green
Remove-Item `$MyInvocation.MyCommand.Path -Force
"@
    
    Set-Content -Path "cleanup.ps1" -Value $cleanupScript
}

# Check and kill any existing processes on required ports
Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 3001

# Create cleanup script
New-CleanupScript

# Start backend server
$backendStarted = Start-Server -Name "Backend" -Directory "backend" -Command "node index.js" -Url "http://localhost:3001"
if (-not $backendStarted) {
    Write-Host "Failed to start backend server" -ForegroundColor Red
    exit 1
}

# Wait for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Start frontend server
$frontendStarted = Start-Server -Name "Frontend" -Directory "frontend" -Command "npm start" -Url "http://localhost:3000"
if (-not $frontendStarted) {
    Write-Host "Failed to start frontend server" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll servers started successfully!" -ForegroundColor Green
Write-Host "Backend running on: http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend running on: http://localhost:3000" -ForegroundColor Green
Write-Host "`nTo stop all servers, run cleanup.ps1 or close the server windows manually" -ForegroundColor Yellow

# Keep the window open with a prompt to shut down servers
Write-Host "`nPress any key to stop all servers..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
& .\cleanup.ps1 