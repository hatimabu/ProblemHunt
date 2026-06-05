const TOKEN_KEY = 'problemhunt-token';

type ProfileRow = {
  user_id?: string;
  username?: string | null;
  user_type?: string | null;
  full_name?: string | null;
};

export async function getOrCreateProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const res = await fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      user_id: data.id,
      username: data.username,
      user_type: data.user_type,
      full_name: data.full_name,
    };
  } catch (e) {
    console.warn('getOrCreateProfile failed:', e);
    return null;
  }
}
