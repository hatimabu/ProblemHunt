// Quick Fix: Create Profile for Current User
// Run this in your browser console (F12) when on your site

(async function createProfile() {
  console.log('🔧 Starting profile creation fix...');
  
  // Import supabase client (assumes it's available globally)
  const { supabase } = await import('../../lib/supabaseClient.js');
  
  try {
    // Step 1: Get current session
    console.log('📡 Checking authentication...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Not authenticated. Please sign in first.');
      return;
    }
    
    console.log('✅ Authenticated as:', session.user.email);
    console.log('User ID:', session.user.id);
    
    // Step 2: Check if profile exists
    console.log('🔍 Checking if profile exists...');
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      console.log('✨ You should be able to sign in now!');
      return;
    }
    
    // Step 3: Create profile
    console.log('📝 Profile not found. Creating one...');
    
    // Generate username from email or ask user
    const defaultUsername = session.user.email?.split('@')[0] + '_' + Math.random().toString(36).substring(7);
    
    const username = prompt('Enter your username (3-30 characters):', defaultUsername) || defaultUsername;
    const fullName = prompt('Enter your full name:', session.user.email?.split('@')[0] || 'User');
    const userTypeInput = prompt('Are you a builder or problem_poster? (Type "builder" or "problem_poster"):', 'builder');
    const userType = userTypeInput === 'problem_poster' ? 'problem_poster' : 'builder';
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        username: username,
        full_name: fullName,
        user_type: userType,
        bio: '',
        reputation_score: 0
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create profile:', createError);
      if (createError.code === '23505') {
        console.error('💡 Username already taken. Try a different one.');
      }
      return;
    }
    
    console.log('✅ Profile created successfully:', newProfile);
    console.log('✨ You can now sign in! Please refresh the page and try again.');
    
    // Step 4: Verify we can fetch it
    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (verifyProfile) {
      console.log('✅ Profile verified:', verifyProfile);
      console.log('🎉 All set! Refresh the page and sign in.');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
})();
