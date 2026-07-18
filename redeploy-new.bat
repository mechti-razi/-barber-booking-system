@echo off
REM Redeploy the railway up deployment (436fcac5) that has our new code
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"mutation { deploymentRedeploy(id: \\\"436fcac5-d9ca-4961-a753-1c3bfca3dc91\\\") { id status } }\"}"
echo.
echo DONE
