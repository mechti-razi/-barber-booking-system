@echo off
cd /d "c:\Users\msi\OneDrive\Desktop\barbe"
git add -f barber-booking-api/Dockerfile barber-booking-api/docker/start.sh
git diff --cached --name-only
git commit -m "fix: ensure optimize:clear runs in start.sh to bust stale S3 config cache" --allow-empty
git push origin main
echo DONE
