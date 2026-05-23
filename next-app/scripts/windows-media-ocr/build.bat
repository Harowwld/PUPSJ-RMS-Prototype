@echo off
echo ===================================================
echo   Compiling Windows Native Offline OCR CLI Tool
echo ===================================================
echo.

:: Ensure binary output directory exists
if not exist "..\..\bin" mkdir "..\..\bin"

:: Trigger self-contained single-file native compilation
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o "..\..\bin"

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
