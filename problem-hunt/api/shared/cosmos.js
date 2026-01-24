const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || "ProblemHuntDB";

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

const containers = {
  problems: database.container(process.env.COSMOS_CONTAINER_PROBLEMS || "Problems"),
  proposals: database.container(process.env.COSMOS_CONTAINER_PROPOSALS || "Proposals"),
  upvotes: database.container(process.env.COSMOS_CONTAINER_UPVOTES || "Upvotes")
};

module.exports = { containers, database };