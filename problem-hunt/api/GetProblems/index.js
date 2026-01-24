const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = client.database("ProblemHuntDB");
const container = database.container("Problems");

module.exports = async function (context, req) {
    try {
        const { resources: problems } = await container.items
            .query("SELECT * FROM c ORDER BY c.upvotes DESC")
            .fetchAll();
        
        context.res = {
            status: 200,
            body: problems,
            headers: {
                "Content-Type": "application/json"
            }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
};