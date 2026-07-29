import type { NotificationRow, ProblemPost, ProposalRecord } from "./marketplace";
import {
  deleteProblem,
  deleteAvatar,
  getDashboardSnapshot as getSupabaseDashboardSnapshot,
  markNotificationRead as markSupabaseNotificationRead,
  updateProfile as updateSupabaseProfile,
  uploadAvatar,
  type DashboardProfile,
} from "./supabase-marketplace";

export type { DashboardProfile };

export interface DashboardSnapshot {
  profile: DashboardProfile | null;
  walletCount: number;
  notifications: NotificationRow[];
  posts: ProblemPost[];
  proposals: ProposalRecord[];
}

export async function fetchDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  return getSupabaseDashboardSnapshot(userId);
}

export async function updateDashboardProfile(_userId: string, input: { full_name: string; bio: string }): Promise<DashboardProfile> {
  return updateSupabaseProfile(input);
}

export async function uploadDashboardAvatar(userId: string, file: File): Promise<string> {
  return uploadAvatar(userId, file);
}

export async function deleteDashboardAvatar(userId: string, avatarUrl?: string | null): Promise<void> {
  await deleteAvatar(userId, avatarUrl);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await markSupabaseNotificationRead(notificationId);
}

export async function deleteProblemById(problemId: string): Promise<void> {
  await deleteProblem(problemId);
}
