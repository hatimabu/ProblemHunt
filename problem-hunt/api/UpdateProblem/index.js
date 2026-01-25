const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, parseBudgetValue, timestamp, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;
    const updates = req.body;
    const userId = await getUserId(req);

    // Get existing problem
    const { resource: problem } = await containers.problems.item(problemId, problemId).read();

    if (!problem) {
      context.res = errorResponse(404, 'Problem not found');
      return;
    }

    // Check ownership (in production, use proper auth)
    if (problem.authorId !== userId) {
      context.res = errorResponse(403, 'You can only edit your own problems');
      return;
    }

    // Update fields
    if (updates.title) problem.title = updates.title.trim();
    if (updates.description) problem.description = updates.description.trim();
    if (updates.category) problem.category = updates.category;
    if (updates.budget) {
      problem.budget = updates.budget;
      problem.budgetValue = parseBudgetValue(updates.budget);
    }
    
    problem.updatedAt = timestamp();

    // Save updated problem
    const { resource: updated } = await containers.problems.item(problemId, problemId).replace(problem);

    context.res = createResponse(200, updated);

  } catch (error) {
    context.log.error('UpdateProblem error:', error);
    context.res = errorResponse(500, 'Failed to update problem');
  }
};