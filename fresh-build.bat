@echo off
REM Trigger a fresh build from the latest GitHub commit via Railway GraphQL API
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"mutation { deploymentTriggerCreate(input: { projectId: \\\"cffa4bd6-eb5f-4817-906c-828faf0daf31\\\", environmentId: \\\"a03d61e1-5f89-4e36-b0f7-156b5159f4f9\\\", serviceId: \\\"2850d76f-a67c-4b0f-824d-5bbe0f8cc1ac\\\" }) { id } }\"}"
echo.
echo ---
REM Also check latest deployment status
curl -s -X POST https://backboard.railway.com/graphql/v2 ^
  -H "Authorization: Bearer cQdmq7DjcQIw_Xcn5wWf-R7VwVbACNd1Nf7iCnK4l3b" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"{ deployments(first: 3, input: { serviceId: \\\"2850d76f-a67c-4b0f-824d-5bbe0f8cc1ac\\\" }) { edges { node { id status createdAt } } } }\"}"
echo.
echo DONE
