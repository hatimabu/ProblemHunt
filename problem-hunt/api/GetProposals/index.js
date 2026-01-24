const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const problemId = req.params.id;

    // Query proposals for this problem
    const querySpec = {
      query: "SELECT * FROM c WHERE c.problemId = @problemId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@problemId", value: problemId }]
    };

    const { resources: proposals } = await containers.proposals.items
      .query(querySpec)
      .fetchAll();

    context.res = createResponse(200, {
      proposals,
      total: proposals.length
    });

  } catch (error) {
    context.log.error('GetProposals error:', error);
    context.res = errorResponse(500, 'Failed to fetch proposals');
  }
};