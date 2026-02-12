// Check if we're in local development mode without Cosmos DB
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

// Use mock if no Cosmos credentials or if using placeholder values
if (!endpoint || !key || 
    endpoint.includes('your-account') || 
    key.includes('PASTE_YOUR') || 
    key === 'placeholder-key' ||
    key.length < 20) {
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
    upvotes: database.container(process.env.COSMOS_CONTAINER_UPVOTES || "Upvotes"),
    tips: database.container(process.env.COSMOS_CONTAINER_TIPS || "Tips")
  };

  console.log('✅ Connected to Cosmos DB');
  module.exports = { containers, database };
}