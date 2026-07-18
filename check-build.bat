@echo off
REM Get deployment logs for the latest deployment to see what code it ran
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"{ deployment(id: \\\"7c2f6c3a-a9df-4f36-bb34-459752364e2b\\\") { id status meta } }\"}"
echo.
echo DONE
