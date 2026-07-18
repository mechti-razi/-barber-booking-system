@echo off
REM Use Railway API to trigger a redeploy of the latest deployment
REM Project: cffa4bd6-eb5f-4817-906c-828faf0daf31
REM Service: 745a309f-2889-4dd3-8208-071e7b270e52
REM Deployment from last railway up: 436fcac5-d9ca-4961-a753-1c3bfca3dc91

REM Get Railway token from config
type "%LOCALAPPDATA%\com.railway.cli\config.json" 2>nul
type "%APPDATA%\railway\config.json" 2>nul
type "%USERPROFILE%\.railway\config.json" 2>nul
