const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, generateId, validateRequired, parseBudgetValue, timestamp, getAuthenticatedUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const data = req.body;
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      context.res = errorResponse(401, 'Authentication required');
      return;
    }

    // Validate required fields
    const validationError = validateRequired(data, ['title', 'description', 'category', 'budget']);
    if (validationError) {
      context.res = errorResponse(400, validationError);
      return;
    }

    // Validate category
    const validCategories = ['AI/ML', 'Web3', 'Finance', 'Governance', 'Trading', 'Infrastructure'];
    if (!validCategories.includes(data.category)) {
      context.res = errorResponse(400, 'Invalid category');
      return;
    }

    // Create problem object
    const rawRequirements = data.requirements;
    const requirements = Array.isArray(rawRequirements)
      ? rawRequirements.map((req) => String(req).trim()).filter(Boolean)
      : typeof rawRequirements === 'string'
      ? rawRequirements.split('\n').map((req) => req.trim()).filter(Boolean)
      : [];

    const problem = {
      id: generateId(),
      title: data.title.trim(),
      description: data.description.trim(),
      requirements,
      category: data.category,
      budget: data.budget,
      budgetValue: parseBudgetValue(data.budget),
      upvotes: 0,
      proposals: 0,
      author: data.author || 'Anonymous User',
      authorId: userId,
      deadline: data.deadline || null,
      createdAt: timestamp(),
      updatedAt: timestamp()
    };

    // Save to database
    const { resource: created } = await containers.problems.items.create(problem);

    context.res = createResponse(201, created);

  } catch (error) {
    context.log.error('CreateProblem error:', error);
    context.res = errorResponse(500, 'Failed to create problem');
  }
};
