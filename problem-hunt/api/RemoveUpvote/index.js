const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, timestamp, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;
    const userId = await getUserId(req);
    const upvoteId = `${problemId}-${userId}`;

    // Check if upvote exists
    try {
      await containers.upvotes.item(upvoteId, problemId).read();
    } catch (err) {
      context.res = errorResponse(404, 'Upvote not found');
      return;
    }

    // Delete upvote
    await containers.upvotes.item(upvoteId, problemId).delete();

    // Decrement upvote count
    const { resource: problem } = await containers.problems.item(problemId, problemId).read();
    problem.upvotes = Math.max(0, problem.upvotes - 1);
    problem.updatedAt = timestamp();
    
    const { resource: updated } = await containers.problems.item(problemId, problemId).replace(problem);

    context.res = createResponse(200, {
      problem: updated,
      message: 'Upvote removed successfully'
    });

  } catch (error) {
    context.log.error('RemoveUpvote error:', error);
    context.res = errorResponse(500, 'Failed to remove upvote');
  }
};