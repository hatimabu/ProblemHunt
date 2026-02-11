# 🔴 SIGN-IN ISSUE DIAGNOSIS & FIX

## Problem Summary

**Issue:** When users click "Sign In", the page loads but nothing happens - no error, no navigation, just loading.

**Root Cause:** Users successfully authenticate with Supabase, but their profile record is missing from the `profiles` database table. When the app tries to fetch the profile, it fails and automatically signs the user out, causing the silent failure.

## Why This Happens

1. ✅ User credentials are correct (Supabase auth succeeds)
2. ❌ No profile record exists in `profiles` table
3. 🔄 `fetchUserProfile()` fails → signs user out
4. 🚫 Navigation to `/dashboard` is blocked → redirects to `/auth`
5. 😕 User sees nothing happen (happens too fast)

## The Code Flow (Before Fix)

```tsx
// AuthContext.tsx - fetchUserProfile()
const { data: profile, error } = await supabase
  .from('profiles')
  .select('username, user_type')
  .eq('id', supabaseUser.id)
  .single();

if (error) {
  console.error('Error fetching profile:', error);
  await supabase.auth.signOut(); // ⚠️ Signs user out!
  setUser(null);
  throw new Error('Profile not found. Please sign up again.');
}
```

## What Was Fixed

### 1. Better Error Messages (✅ Applied)

**Files Modified:**
- `problem-hunt/src/app/contexts/AuthContext.tsx`
- `problem-hunt/src/app/components/auth-page.tsx`

**Changes:**
- Added detailed console logging
- Shows user ID and error details
- Clear error message: "Profile not found in database"

### 2. Database Migration (📝 Created)

**File:** `problem-hunt/supabase/migrations/20260211_fix_profile_creation.sql`

**What It Does:**
- Creates `profiles` table (if missing)
- Adds automatic trigger to create profiles on signup
- Backfills profiles for existing auth users
- Sets up Row Level Security (RLS) policies

**To Apply:**
```bash
# If using Supabase CLI
cd problem-hunt
supabase db push

# Or run manually in Supabase SQL Editor
# Copy/paste the SQL from the migration file
```

### 3. Quick Fix Tools (🛠️ Created)

#### Option A: Browser Console Script
**File:** `problem-hunt/scripts/create-profile-fix.js`

Run in browser console while on your site:
```javascript
// Copy the entire content of create-profile-fix.js
// Paste in browser console (F12 → Console)
```

#### Option B: HTML Fix Page
**File:** `problem-hunt/fix-profile.html`

Navigate to: `http://localhost:5173/fix-profile.html`

## How To Fix Right Now (Choose One)

### 🚀 Fastest: Use the HTML Fix Page

1. Make sure you're signed in (or sign in at `/auth`)
2. Open `http://localhost:5173/fix-profile.html` in your browser
3. Fill in your username and account type
4. Click "Create Profile"
5. Go back and sign in

### 🔧 Alternative: Browser Console Method

1. Go to your site and open browser console (F12)
2. Make sure you're signed in (or sign in at `/auth`)
3. Paste this code:

```javascript
const { supabase } = await import('/lib/supabaseClient.js');

// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log('User ID:', session?.user?.id);

// Create profile
const username = prompt('Enter username:', session?.user?.email?.split('@')[0]);
const userType = prompt('Enter "builder" or "problem_poster":', 'builder');

const { data, error } = await supabase.from('profiles').insert({
  id: session.user.id,
  username: username || 'user_' + Date.now(),
  full_name: session.user.email?.split('@')[0] || 'User',
  user_type: userType === 'problem_poster' ? 'problem_poster' : 'builder',
  bio: '',
  reputation_score: 0
});

console.log(data ? '✅ Profile created!' : '❌ Error:', error);
```

### 🏗️ Long-term: Run Database Migration

1. Open Supabase SQL Editor
2. Copy content from `supabase/migrations/20260211_fix_profile_creation.sql`
3. Paste and run
4. This fixes it for all future users automatically

## Verify The Fix

After creating your profile, you can verify:

```javascript
// In browser console
const { supabase } = await import('/lib/supabaseClient.js');
const { data: session } = await supabase.auth.getSession();
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.data.session.user.id)
  .single();
  
console.log('Profile:', profile);
```

## What You'll See Now

Before Fix:
- ❌ Click "Sign In"
- ⏳ Button shows "Logging in..."
- ⏳ Page loads
- ❌ Nothing happens

After Fix:
- ✅ Click "Sign In"
- ⏳ Button shows "Logging in..."
- ✅ Console shows: "Login successful, navigating to dashboard"
- ✅ Redirected to `/dashboard`
- ✅ You're signed in!

## Prevention

The migration adds an automatic trigger that creates profiles for all new signups:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This means:
- ✅ New signups automatically get profiles
- ✅ No more "profile not found" errors
- ✅ Sign-in works immediately

## Troubleshooting

### Still Not Working?

1. **Check Console Logs:**
   - Open browser console (F12)
   - Try signing in
   - Look for red errors
   - Check for: "Profile not found", "Error fetching profile"

2. **Verify Environment Variables:**
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('Has Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
   ```

3. **Check Supabase Connection:**
   ```javascript
   const { data, error } = await supabase.from('profiles').select('count');
   console.log('Can query profiles:', !error);
   ```

4. **Verify Auth State:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Authenticated:', !!user);
   ```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Profile not found" | No profile record | Use fix tools above |
| "Username already taken" | Profile exists with that username | Choose different username |
| "Not authenticated" | Session expired | Sign in again |
| Network error | Supabase config wrong | Check .env variables |

## Files Changed Summary

### Modified (Error Handling)
- ✏️ `problem-hunt/src/app/contexts/AuthContext.tsx`
- ✏️ `problem-hunt/src/app/components/auth-page.tsx`

### Created (Fixes)
- ➕ `problem-hunt/supabase/migrations/20260211_fix_profile_creation.sql`
- ➕ `problem-hunt/scripts/create-profile-fix.js`
- ➕ `problem-hunt/fix-profile.html`
- ➕ `SIGN_IN_FIX_GUIDE.md` (this file)

## Next Steps

1. ✅ Try the HTML fix page or console method (immediate)
2. ✅ Run the database migration (long-term fix)
3. ✅ Test sign-in again
4. ✅ Check that dashboard loads correctly

## Need Help?

If you're still having issues:
1. Check browser console for errors (F12)
2. Share console output
3. Share any red error messages
4. Verify your .env file has correct Supabase credentials

---

**Last Updated:** 2026-02-11  
**Status:** ✅ Issue diagnosed and fixes provided
