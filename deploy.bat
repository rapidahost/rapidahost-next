@echo off
set /p commitMsg="Enter commit message: "

:: ตรวจสอบสถานะไฟล์
git status

:: เพิ่มไฟล์ทั้งหมด
git add .

:: commit
git commit -m "%commitMsg%"

:: push
git push origin main

:: แจ้งว่าเสร็จ
echo.
echo ==== PUSH DONE ====
pause
