@echo off
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"{ deploymentLogs(deploymentId: \\\"3251d548-dc15-45ee-978e-c02893d51e36\\\", limit: 100) { message severity timestamp } }\"}"
echo.
echo DONE
