@echo off
echo === Knowledge Backlog Server Starter ===
echo ====================================

REM Check if port 3000 is in use
echo Checking if port 3000 is in use...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
  echo Process found running on port 3000 (PID: %%P)
  echo Killing process...
  taskkill /F /PID %%P
  echo Process killed.
)

REM Check if port 3001 is in use
echo Checking if port 3001 is in use...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') DO (
  echo Process found running on port 3001 (PID: %%P)
  echo Killing process...
  taskkill /F /PID %%P
  echo Process killed.
)

REM Create a temporary cleanup script
echo @echo off > cleanup.bat
echo echo Stopping servers... >> cleanup.bat
echo taskkill /F /FI "WINDOWTITLE eq Knowledge Backlog Backend" >> cleanup.bat
echo taskkill /F /FI "WINDOWTITLE eq Knowledge Backlog Frontend" >> cleanup.bat
echo echo Servers stopped. >> cleanup.bat
echo del cleanup.bat >> cleanup.bat

REM Install backend dependencies
echo.
echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
  echo Failed to install backend dependencies
  exit /b 1
)
cd ..

REM Start backend server in a new window
echo.
echo Starting backend server...
start "Knowledge Backlog Backend" cmd /c "cd backend && node index.js"

REM Wait a bit for backend to initialize
timeout /t 2 /nobreak > nul

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
  echo Failed to install frontend dependencies
  exit /b 1
)
cd ..

REM Start frontend server in a new window
echo.
echo Starting frontend server...
start "Knowledge Backlog Frontend" cmd /c "cd frontend && npm start"

echo.
echo All servers started.
echo Backend running on: http://localhost:3001
echo Frontend running on: http://localhost:3000
echo.
echo To stop all servers, run cleanup.bat or close this window and manually close the server windows
echo.

REM Keep the window open with a prompt to shut down servers
echo Press any key to stop all servers...
pause > nul
call cleanup.bat 