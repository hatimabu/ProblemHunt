const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;

    if (!problemId) {
      context.res = errorResponse(400, 'Problem ID is required');
      return;
    }

    // Get problem
    const { resource: problem } = await containers.problems.item(problemId, problemId).read();

    if (!problem) {
      context.res = errorResponse(404, 'Problem not found');
      return;
    }

    context.res = createResponse(200, problem);

  } catch (error) {
    if (error.code === 404) {
      context.res = errorResponse(404, 'Problem not found');
    } else {
      context.log.error('GetProblemById error:', error);
      context.res = errorResponse(500, 'Failed to fetch problem');
    }
  }
};