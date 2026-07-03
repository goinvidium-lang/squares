@echo off
echo ========================================
echo   Gridiron Squares - Deploy to Vercel
echo ========================================
echo.
set /p msg="What did you change? (short description): "
echo.
git add .
git commit -m "%msg%"
git push
echo.
echo ========================================
echo   Pushed! Check Vercel dashboard for build status.
echo ========================================
pause
