const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.trim().length === 0) {
      context.res = errorResponse(400, 'Search term is required');
      return;
    }

    // Cosmos DB doesn't have full-text search built-in
    // For production, consider Azure Cognitive Search
    // This is a simple contains search
    const querySpec = {
      query: `SELECT * FROM c WHERE CONTAINS(LOWER(c.title), LOWER(@term)) OR CONTAINS(LOWER(c.description), LOWER(@term))`,
      parameters: [{ name: "@term", value: searchTerm.trim() }]
    };

    const { resources: results } = await containers.problems.items
      .query(querySpec)
      .fetchAll();

    context.res = createResponse(200, {
      results,
      total: results.length,
      searchTerm
    });

  } catch (error) {
    context.log.error('SearchProblems error:', error);
    context.res = errorResponse(500, 'Search failed');
  }
};