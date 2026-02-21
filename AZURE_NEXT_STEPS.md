# Azure Next Steps After Deployment

## 1. Cosmos DB Containers to Create

In your Azure Cosmos DB account (`ProblemHuntDB` database), ensure these containers exist:

| Container | Partition Key | Description |
|-----------|--------------|-------------|
| `Problems` | `/user_id` | All posted problems |
| `Proposals` | `/problemId` | Builder proposals |
| `Upvotes` | `/userId` | Problem upvote tracking |
| `Tips` | `/proposalId` | Tip transactions |

### Create Tips container (if not yet created):
```bash
az cosmosdb sql container create \
  --account-name <your-cosmos-account> \
  --resource-group <your-rg> \
  --database-name ProblemHuntDB \
  --name Tips \
  --partition-key-path /proposalId \
  --throughput 400
```

## 2. New Function App Settings to Add

In Azure Portal > Function App > Configuration > Application Settings:

```
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_primary_key_here
COSMOS_DATABASE=ProblemHuntDB
COSMOS_CONTAINER_PROBLEMS=Problems
COSMOS_CONTAINER_PROPOSALS=Proposals
COSMOS_CONTAINER_UPVOTES=Upvotes
COSMOS_CONTAINER_TIPS=Tips
JWT_SECRET=your_supabase_jwt_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

To set via CLI:
```bash
az functionapp config appsettings set \
  --name <your-function-app> \
  --resource-group <your-rg> \
  --settings \
    "COSMOS_ENDPOINT=..." \
    "COSMOS_KEY=..." \
    "JWT_SECRET=..."
```

## 3. Deploy New Python Functions

The following new handlers were added and need to be deployed:

```bash
# From the python-function/ directory:
func azure functionapp publish <your-function-app> --python

# Or using Azure CLI:
cd problem-hunt/python-function
func azure functionapp publish <your-function-app>
```

New routes added to `router.py`:
- `GET /api/user/proposals` → `get_user_proposals.handle`
- `GET /api/leaderboard` → `get_leaderboard.handle`
- `POST /api/proposals/{id}/tip` → `tip_builder.handle` (updated)

## 4. CORS Configuration

In Azure Portal > Function App > CORS, add:
```
https://problemhunt.cc
https://www.problemhunt.cc
http://localhost:5173
http://localhost:5174
```

Or via CLI:
```bash
az functionapp cors add \
  --name <your-function-app> \
  --resource-group <your-rg> \
  --allowed-origins "https://problemhunt.cc" "http://localhost:5173"
```

## 5. Monitoring Setup

### Application Insights queries to set up:

**API Error Rate:**
```kusto
requests
| where success == false
| summarize errorCount=count() by name, resultCode
| order by errorCount desc
```

**Slow endpoints (>2s):**
```kusto
requests
| where duration > 2000
| summarize avgDuration=avg(duration), count() by name
| order by avgDuration desc
```

**Top routes by usage:**
```kusto
requests
| summarize count() by name
| order by count_ desc
| take 10
```

**Tips recorded per day:**
```kusto
customEvents
| where name == "TipRecorded"
| summarize count() by bin(timestamp, 1d)
```

## 6. Scaling Considerations

- **Cosmos DB RU/s**: Start at 400 RU/s per container, scale up based on traffic
- **Function App**: Use Consumption plan for cost-efficiency, switch to Premium if cold starts are an issue
- **Enable Cosmos DB analytical store** for leaderboard queries if dataset grows large

## 7. Backup Strategy

```bash
# Enable periodic backups in Cosmos DB
az cosmosdb update \
  --name <your-cosmos-account> \
  --resource-group <your-rg> \
  --backup-interval 240 \
  --backup-retention 8
```
