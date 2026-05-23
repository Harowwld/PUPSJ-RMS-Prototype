@echo off
echo ===================================================
echo   Compiling Windows Native Offline OCR CLI Tool
echo ===================================================
echo.

:: Resolve paths relative to this batch file's own directory (works from any CWD)
set "SCRIPT_DIR=%~dp0"
set "BIN_DIR=%SCRIPT_DIR%..\..\bin"
set "PROJECT_FILE=%SCRIPT_DIR%windows-media-ocr.csproj"

:: Ensure binary output directory exists
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

:: Trigger self-contained single-file native compilation
dotnet publish "%PROJECT_FILE%" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "%BIN_DIR%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Compilation failed. Ensure the .NET SDK (8.0 or newer) is installed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Compiled windows-media-ocr.exe successfully in next-app/bin/!
echo.
pause
