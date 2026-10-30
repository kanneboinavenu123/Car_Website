@echo off
echo ========================================================
echo Starting NOCTIS Local Web Server at http://localhost:8000
echo ========================================================
start http://localhost:8000/index.html
python -m http.server 8000
pause
