const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    // Get user ID from authentication token
    const userId = await getUserId(req);
    
    if (!userId) {
      context.res = errorResponse(401, 'Authentication required');
      return;
    }

    // Parse query parameters
    const sortBy = req.query.sortBy || 'newest'; // newest, upvotes, budget
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Build query to get user's problems
    let querySpec = {
      query: `SELECT * FROM c WHERE c.authorId = @authorId`,
      parameters: [
        { name: "@authorId", value: userId }
      ]
    };

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
    context.log.error('GetUserProblems error:', error);
    context.res = errorResponse(500, 'Failed to fetch user problems');
  }
};
