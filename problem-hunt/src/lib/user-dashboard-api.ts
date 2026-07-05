import { API_ENDPOINTS } from "./api-config";
import { authenticatedFetch, handleResponse } from "./auth-helper";
import type { NotificationRow, ProblemPost, ProposalRecord } from "./marketplace";

const TOKEN_KEY = 'problemhunt-token';

export interface DashboardProfile {
  username: string;
  full_name: string | null;
  bio: string | null;
  reputation_score: number;
  user_type: string;
  created_at: string;
  wallet_address?: string | null;
  avatar_url?: string | null;
}

export interface DashboardSnapshot {
  profile: DashboardProfile | null;
  walletCount: number;
  notifications: NotificationRow[];
  posts: ProblemPost[];
  proposals: ProposalRecord[];
}

export async function fetchDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const token = localStorage.getItem(TOKEN_KEY);
  const authHeaders = { Authorization: `Bearer ${token || ''}` };

<<<<<<< HEAD
  const [profileRes, walletsRes, notificationsRes, postsRes, proposalsRes] = await Promise.allSettled([
=======
  const [profileRes, walletsRes, notificationsRes, postsRes, proposalsRes] = await Promise.all([
>>>>>>> origin/main
    fetch('/api/user/profile', { headers: authHeaders }),
    fetch('/api/user/wallets', { headers: authHeaders }),
    fetch('/api/user/notifications', { headers: authHeaders }),
    authenticatedFetch(`${API_ENDPOINTS.USER_PROBLEMS}?sortBy=newest`, { method: 'GET' }),
    authenticatedFetch(API_ENDPOINTS.USER_PROPOSALS, { method: 'GET' }),
  ]);

<<<<<<< HEAD
  const safeJson = async (result: PromiseSettledResult<Response>, fallback: unknown) => {
    if (result.status !== 'fulfilled' || !result.value.ok) return fallback;
    try {
      return await result.value.json();
    } catch {
      return fallback;
    }
  };

  const profileData = await safeJson(profileRes, null);
  const walletsData = await safeJson(walletsRes, { wallets: [] });
  const notificationsData = await safeJson(notificationsRes, { notifications: [] });
  const postsData = await safeJson(postsRes, { problems: [] });
  const proposalsData = await safeJson(proposalsRes, { proposals: [] });
=======
  if (!postsRes.ok) throw new Error('Failed to load your posted briefs.');
  if (!proposalsRes.ok) throw new Error('Failed to load your bids.');

  const profileData = profileRes.ok ? await profileRes.json() : null;
  const walletsData = walletsRes.ok ? await walletsRes.json() : { wallets: [] };
  const notificationsData = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] };
  const postsData = await postsRes.json();
  const proposalsData = await proposalsRes.json();
>>>>>>> origin/main

  return {
    profile: profileData ? {
      username: profileData.username,
      full_name: profileData.full_name,
      bio: profileData.bio,
      reputation_score: profileData.reputation_score || 0,
      user_type: profileData.user_type,
      created_at: profileData.created_at,
      wallet_address: profileData.wallet_address,
      avatar_url: profileData.avatar_url,
    } : null,
    walletCount: (walletsData.wallets || []).length,
    notifications: notificationsData.notifications || [],
    posts: Array.isArray(postsData.problems) ? postsData.problems : [],
    proposals: Array.isArray(proposalsData.proposals) ? proposalsData.proposals : [],
  };
}

export async function updateDashboardProfile(
  userId: string,
  input: { full_name: string; bio: string }
): Promise<DashboardProfile> {
  const res = await authenticatedFetch('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = await handleResponse(res);
  return data;
}

export async function uploadDashboardAvatar(userId: string, file: File): Promise<string> {
  throw new Error('Avatar upload not yet supported in this version.');
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await authenticatedFetch(`/api/user/notifications/${notificationId}`, { method: 'PATCH' });
}

export async function deleteProblemById(problemId: string): Promise<void> {
  const response = await authenticatedFetch(API_ENDPOINTS.DELETE_PROBLEM(problemId), {
    method: 'DELETE',
  });
  await handleResponse(response);
}
