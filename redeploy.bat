@echo off
REM Trigger Railway redeploy via GraphQL API
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"mutation { serviceInstanceRedeploy(environmentId: \\\"a03d61e1-5f89-4e36-b0f7-156b5159f4f9\\\", serviceId: \\\"2850d76f-a67c-4b0f-824d-5bbe0f8cc1ac\\\") }\"}"
echo.
echo DONE
