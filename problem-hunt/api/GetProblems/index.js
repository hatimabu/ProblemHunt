const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    // Parse query parameters
    const category = req.query.category || 'all';
    const sortBy = req.query.sortBy || 'upvotes'; // upvotes, newest, budget
    const budgetMin = parseInt(req.query.budgetMin) || 0;
    const budgetMax = parseInt(req.query.budgetMax) || 999999;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Build query
    let querySpec = {
      query: `SELECT * FROM c WHERE c.budgetValue >= @budgetMin AND c.budgetValue <= @budgetMax`,
      parameters: [
        { name: "@budgetMin", value: budgetMin },
        { name: "@budgetMax", value: budgetMax }
      ]
    };

    // Add category filter
    if (category !== 'all') {
      querySpec.query += ` AND c.category = @category`;
      querySpec.parameters.push({ name: "@category", value: category });
    }

    // Add sorting
    switch (sortBy) {
      case 'newest':
        querySpec.query += ` ORDER BY c.createdAt DESC`;
        break;
      case 'budget':
        querySpec.query += ` ORDER BY c.budgetValue DESC`;
        break;
      case 'upvotes':
      default:
        querySpec.query += ` ORDER BY c.upvotes DESC`;
        break;
    }

    // Execute query
    const { resources: problems } = await containers.problems.items
      .query(querySpec)
      .fetchAll();

    // Apply pagination
    const paginatedProblems = problems.slice(offset, offset + limit);

    // Return response
    context.res = createResponse(200, {
      problems: paginatedProblems,
      total: problems.length,
      limit,
      offset
    });

  } catch (error) {
    context.log.error('GetProblems error:', error);
    context.res = errorResponse(500, 'Failed to fetch problems');
  }
};