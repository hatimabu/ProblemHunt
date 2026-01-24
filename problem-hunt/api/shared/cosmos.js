// Check if we're in local development mode without Cosmos DB
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

// Use mock if no Cosmos credentials
if (!endpoint || !key || endpoint.includes('your-account')) {
  console.log('⚠️  Using MOCK in-memory database (local development mode)');
  console.log('   To use real Cosmos DB, set COSMOS_ENDPOINT and COSMOS_KEY in local.settings.json');
  module.exports = require('./cosmos-mock');
} else {
  // Use real Cosmos DB
  const { CosmosClient } = require("@azure/cosmos");
  const databaseId = process.env.COSMOS_DATABASE || "ProblemHuntDB";

  const client = new CosmosClient({ endpoint, key });
  const database = client.database(databaseId);

  const containers = {
    problems: database.container(process.env.COSMOS_CONTAINER_PROBLEMS || "Problems"),
    proposals: database.container(process.env.COSMOS_CONTAINER_PROPOSALS || "Proposals"),
    upvotes: database.container(process.env.COSMOS_CONTAINER_UPVOTES || "Upvotes")
  };

  console.log('✅ Connected to Cosmos DB');
  module.exports = { containers, database };
}