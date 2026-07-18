@echo off
cd /d "c:\Users\msi\OneDrive\Desktop\barbe\barber-booking-api"
railway status
railway up --service barber-api --detach
echo BUILD TRIGGERED
