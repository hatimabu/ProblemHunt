const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, generateId, timestamp, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;
    const userId = getUserId(req);

    // Check if problem exists
    const { resource: problem } = await containers.problems.item(problemId, problemId).read();
    
    if (!problem) {
      context.res = errorResponse(404, 'Problem not found');
      return;
    }

    // Check if user already upvoted
    const upvoteId = `${problemId}-${userId}`;
    
    try {
      const { resource: existingUpvote } = await containers.upvotes.item(upvoteId, problemId).read();
      
      if (existingUpvote) {
        context.res = errorResponse(409, 'You already upvoted this problem');
        return;
      }
    } catch (err) {
      // Upvote doesn't exist, continue
    }

    // Create upvote record
    const upvote = {
      id: upvoteId,
      problemId: problemId,
      userId: userId,
      createdAt: timestamp()
    };

    await containers.upvotes.items.create(upvote);

    // Increment upvote count on problem
    problem.upvotes += 1;
    problem.updatedAt = timestamp();
    
    const { resource: updated } = await containers.problems.item(problemId, problemId).replace(problem);

    context.res = createResponse(200, {
      problem: updated,
      message: 'Upvoted successfully'
    });

  } catch (error) {
    context.log.error('UpvoteProblem error:', error);
    context.res = errorResponse(500, 'Failed to upvote problem');
  }
};