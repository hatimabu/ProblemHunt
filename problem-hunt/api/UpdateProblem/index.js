const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, parseBudgetValue, timestamp, getAuthenticatedUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;
    const updates = req.body;
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      context.res = errorResponse(401, 'Authentication required');
      return;
    }

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
    if (updates.requirements !== undefined) {
      const rawRequirements = updates.requirements;
      const requirements = Array.isArray(rawRequirements)
        ? rawRequirements.map((req) => String(req).trim()).filter(Boolean)
        : typeof rawRequirements === 'string'
        ? rawRequirements.split('\n').map((req) => req.trim()).filter(Boolean)
        : [];
      problem.requirements = requirements;
    }
    if (updates.deadline !== undefined) {
      problem.deadline = updates.deadline || null;
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
