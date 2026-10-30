@echo off
echo ========================================================
echo Pushing NOCTIS to GitHub:
echo https://github.com/kanneboinavenu123/Car_Website.git
echo ========================================================
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo If authentication failed, you can generate a Personal Access Token (PAT) with 'repo' scope at:
    echo https://github.com/settings/tokens
    echo.
    echo Then run:
    echo git push https://YOUR_TOKEN@github.com/kanneboinavenu123/Car_Website.git main
    echo.
)
pause
