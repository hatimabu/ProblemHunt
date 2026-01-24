const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, generateId, validateRequired, parseBudgetValue, timestamp, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const data = req.body;

    // Validate required fields
    const validationError = validateRequired(data, ['title', 'description', 'category', 'budget']);
    if (validationError) {
      context.res = errorResponse(400, validationError);
      return;
    }

    // Validate category
    const validCategories = ['Productivity', 'Social', 'Finance', 'Health', 'Developer Tools', 'Entertainment'];
    if (!validCategories.includes(data.category)) {
      context.res = errorResponse(400, 'Invalid category');
      return;
    }

    // Create problem object
    const problem = {
      id: generateId(),
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      budget: data.budget,
      budgetValue: parseBudgetValue(data.budget),
      upvotes: 0,
      proposals: 0,
      author: data.author || 'Anonymous User',
      authorId: getUserId(req),
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