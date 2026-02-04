const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, generateId, validateRequired, timestamp, getAuthenticatedUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;
    const data = req.body;
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      context.res = errorResponse(401, 'Authentication required');
      return;
    }

    // Validate required fields
    const validationError = validateRequired(data, ['title', 'description']);
    if (validationError) {
      context.res = errorResponse(400, validationError);
      return;
    }

    // Check if problem exists
    const { resource: problem } = await containers.problems.item(problemId, problemId).read();
    
    if (!problem) {
      context.res = errorResponse(404, 'Problem not found');
      return;
    }

    // Create proposal
    const proposal = {
      id: generateId(),
      problemId: problemId,
      title: data.title.trim(),
      description: data.description.trim(),
      timeline: data.timeline || 'Not specified',
      builderName: data.builderName || 'Anonymous Builder',
      builderId: userId,
      githubUrl: data.githubUrl || null,
      demoUrl: data.demoUrl || null,
      status: 'pending', // pending, accepted, rejected
      createdAt: timestamp()
    };

    await containers.proposals.items.create(proposal);

    // Increment proposal count on problem
    problem.proposals += 1;
    problem.updatedAt = timestamp();
    await containers.problems.item(problemId, problemId).replace(problem);

    context.res = createResponse(201, proposal);

  } catch (error) {
    context.log.error('CreateProposal error:', error);
    context.res = errorResponse(500, 'Failed to create proposal');
  }
};
