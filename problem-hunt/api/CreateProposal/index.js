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

    // Get builder name from Supabase profiles
    const supabase = require('../shared/utils').getSupabaseClient ? require('../shared/utils').getSupabaseClient() : null;
    let builderName = 'Anonymous Builder';
    
    if (supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', userId)
          .single();
        
        if (profile) {
          builderName = profile.full_name || profile.username || 'Anonymous Builder';
        }
      } catch (err) {
        context.log.warn('Could not fetch builder profile:', err);
      }
    }

    // Create proposal
    const proposal = {
      id: generateId(),
      problemId: problemId,
      title: data.title.trim(),
      description: data.description.trim(),
      timeline: data.timeline || 'Not specified',
      builderName: builderName,
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
