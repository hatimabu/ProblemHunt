const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;
    const userId = await getUserId(req);

    // Get problem to verify ownership
    const { resource: problem } = await containers.problems.item(problemId, problemId).read();

    if (!problem) {
      context.res = errorResponse(404, 'Problem not found');
      return;
    }

    // Check ownership
    if (problem.authorId !== userId) {
      context.res = errorResponse(403, 'You can only delete your own problems');
      return;
    }

    // Delete problem
    await containers.problems.item(problemId, problemId).delete();

    // TODO: Also delete associated upvotes and proposals

    context.res = createResponse(200, { 
      message: 'Problem deleted successfully',
      id: problemId 
    });

  } catch (error) {
    context.log.error('DeleteProblem error:', error);
    context.res = errorResponse(500, 'Failed to delete problem');
  }
};