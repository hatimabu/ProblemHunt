import { supabase } from "../../lib/supabaseClient";
import { API_ENDPOINTS } from "./api-config";
import { authenticatedFetch, handleResponse } from "./auth-helper";
import type { NotificationRow, ProblemPost, ProposalRecord } from "./marketplace";

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
  const [profileResult, walletCountResult, notificationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("wallets").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("notifications")
      .select("id, message, link, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }
  if (walletCountResult.error) {
    throw walletCountResult.error;
  }

  const [postsResponse, proposalsResponse] = await Promise.all([
    authenticatedFetch(`${API_ENDPOINTS.USER_PROBLEMS}?sortBy=newest`, { method: "GET" }),
    authenticatedFetch(API_ENDPOINTS.USER_PROPOSALS, { method: "GET" }),
  ]);

  if (!postsResponse.ok) {
    throw new Error("Failed to load your posted briefs.");
  }
  if (!proposalsResponse.ok) {
    throw new Error("Failed to load your bids.");
  }

  const postsData = await postsResponse.json();
  const proposalsData = await proposalsResponse.json();

  return {
    profile: profileResult.data,
    walletCount: walletCountResult.count || 0,
    notifications: notificationsResult.error ? [] : notificationsResult.data || [],
    posts: Array.isArray(postsData.problems) ? postsData.problems : [],
    proposals: Array.isArray(proposalsData.proposals) ? proposalsData.proposals : [],
  };
}

export async function updateDashboardProfile(
  userId: string,
  input: { full_name: string; bio: string }
): Promise<DashboardProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      bio: input.bio,
    })
    .eq("id", userId)
    .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address, avatar_url")
    .single();

  if (error || !data) {
    throw error || new Error("Failed to update profile.");
  }

  return data;
}

export async function uploadDashboardAvatar(userId: string, file: File): Promise<string> {
  const extRaw = (file.name.split(".").pop() || "").trim().toLowerCase();
  const safeExt = extRaw && extRaw.length <= 6 ? extRaw : "png";
  const objectPath = `${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

  const uploadResult = await supabase.storage.from("avatars").upload(objectPath, file, {
    upsert: true,
    contentType: file.type,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(objectPath);
  const publicUrl = publicUrlData.publicUrl;
  const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
  if (updateErr) {
    throw updateErr;
  }

  return publicUrl;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  if (error) {
    throw error;
  }
}

export async function deleteProblemById(problemId: string): Promise<void> {
  const response = await authenticatedFetch(API_ENDPOINTS.DELETE_PROBLEM(problemId), {
    method: "DELETE",
  });
  await handleResponse(response);
}
