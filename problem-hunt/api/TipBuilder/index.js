const { containers } = require('../shared/cosmos');
const { createResponse, errorResponse, generateId, timestamp, getUserId } = require('../shared/utils');

module.exports = async function (context, req) {
  try {
    const proposalId = req.params.id;
    const data = req.body;
    const userId = await getUserId(req);

    // Validate required fields
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      context.res = errorResponse(400, 'Valid amount is required');
      return;
    }

    // Check if proposal exists
    const { resource: proposal } = await containers.proposals.item(proposalId, proposalId).read();

    if (!proposal) {
      context.res = errorResponse(404, 'Proposal not found');
      return;
    }

    // Create tip record
    const tip = {
      id: generateId(),
      proposalId: proposalId,
      builderId: proposal.builderId,
      tipperId: userId,
      amount: parseFloat(data.amount),
      message: data.message || null,
      createdAt: timestamp()
    };

    await containers.tips.items.create(tip);

    // Update proposal with tip count (optional)
    // For now, just return success

    context.res = createResponse(201, tip);

  } catch (error) {
    context.log.error('TipBuilder error:', error);
    context.res = errorResponse(500, 'Internal server error');
  }
};