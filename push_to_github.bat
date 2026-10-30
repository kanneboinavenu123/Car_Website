@echo off
setlocal enabledelayedexpansion
echo ====================================================================
echo  PUSHING NOCTIS TO GITHUB
echo  Target: https://github.com/kanneboinavenu123/Car_Website.git
echo ====================================================================
echo.
echo [1/2] Connecting to GitHub and initiating upload...
echo NOTE: If a browser window opens, please click "Authorize Git" to proceed.
echo.

git push -u origin main --progress --verbose

if %errorlevel% equ 0 (
    echo.
    echo ====================================================================
    echo  SUCCESS! Code successfully pushed to GitHub.
    echo  View it at: https://github.com/kanneboinavenu123/Car_Website
    echo ====================================================================
    goto end
)

echo.
echo ====================================================================
echo  BROWSER AUTHENTICATION DID NOT COMPLETE OR TIMED OUT
echo  Follow these 2 quick steps to push directly with a Personal Token:
echo ====================================================================
echo  1. Open: https://github.com/settings/tokens
echo  2. Click "Generate new token (classic)", check "repo", click Generate.
echo  3. Copy your token (starts with ghp_...) and paste it below.
echo ====================================================================
echo.

set /p GITHUB_TOKEN="Paste GitHub Token here (then press Enter): "

if defined GITHUB_TOKEN (
    echo.
    echo Uploading with token...
    git push https://!GITHUB_TOKEN!@github.com/kanneboinavenu123/Car_Website.git main --progress
    if !errorlevel! equ 0 (
        echo.
        echo ====================================================================
        echo  SUCCESS! Pushed successfully to GitHub.
        echo ====================================================================
    )
)

:end
echo.
pause
