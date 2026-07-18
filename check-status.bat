@echo off
REM Check status of the new deployment
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"{ deployment(id: \\\"3251d548-dc15-45ee-978e-c02893d51e36\\\") { id status } }\"}"
echo.
echo DONE
