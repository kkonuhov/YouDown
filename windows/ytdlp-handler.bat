@echo off
REM ==========================================
REM YouDown — yt-dlp handler for Windows
REM Called by the browser via custom protocol ytdlp://
REM ==========================================
REM This .bat sets the URL as an environment variable
REM and delegates the actual work to handler.ps1.
REM Using env var avoids problems with & and other
REM special characters in the YouTube URL.
REM ==========================================

setlocal enabledelayedexpansion

REM Store the URL in a variable first (quoting protects special chars)
set "YOUTUBE_URL=%~1"

REM Debug: uncomment next line to see the raw URL in a log
REM echo %DATE% %TIME% - %YOUTUBE_URL% >> "%TEMP%\youdown-debug.log"

REM Check that we got something
if not defined YOUTUBE_URL (
    echo YouDown: no URL received from browser.
    echo.
    echo Make sure the custom protocol ytdlp:// is registered.
    echo Run register-protocol.reg to fix this.
    echo.
    pause
    exit /b 1
)

REM Export to environment for PowerShell to pick up
set "YOUTUBE_URL=%YOUTUBE_URL%"

REM Launch the PowerShell handler
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0handler.ps1"

REM If PowerShell exited with error, pause so user can see
if errorlevel 1 (
    echo.
    echo YouDown finished with errors (code: %ERRORLEVEL%^).
    pause
)
