import { useState, useEffect } from "react";
import { Trophy, Star, DollarSign, Send, RefreshCw } from "lucide-react";
import { Navbar } from "./navbar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { authenticatedFetch, handleResponse } from "../../lib/auth-helper";
import { useAuth } from "../contexts/AuthContext";

interface LeaderboardEntry {
  rank: number;
  builderId: string;
  builderName: string;
  proposalsSubmitted: number;
  proposalsAccepted: number;
  tipsReceived: number;
  reputationScore: number;
  tier: string;
}

const TIER_COLORS: Record<string, string> = {
  Legend: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  Expert: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  Senior: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  Builder: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  Newcomer: "text-gray-400 bg-gray-500/10 border-gray-600/30",
};

const TIER_ICONS: Record<string, string> = {
  Legend: "🌟",
  Expert: "💎",
  Senior: "🔥",
  Builder: "⚡",
  Newcomer: "🌱",
};

const RANK_STYLES = [
  "text-yellow-400",
  "text-gray-300",
  "text-orange-400",
];

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"alltime" | "week">("alltime");
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  const fetchLeaderboard = async (p: string) => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/leaderboard?period=${p}&limit=20`, { method: "GET" });
      const data = await handleResponse(res);
      const entries: LeaderboardEntry[] = data.leaderboard || [];
      setLeaderboard(entries);

      // Find current user's rank
      if (user) {
        const found = entries.find((e) => e.builderId === user.id);
        setUserRank(found || null);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />

      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10 fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Builder Rankings</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <p className="text-gray-400">
            Top builders ranked by reputation, accepted proposals, and tips received.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex justify-center gap-2 mb-8 fade-in stagger-1">
          {[
            { val: "alltime" as const, label: "All Time" },
            { val: "week" as const, label: "This Week" },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
                period === val
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-2xl" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-white mb-2">No rankings yet</h3>
              <p className="text-gray-400 mb-6">Be the first to submit proposals and earn a spot!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.builderId}
                  className={`card-hover flex items-center gap-4 bg-gray-900/50 border rounded-2xl px-5 py-4 fade-in stagger-${Math.min(i + 1, 5)} ${
                    entry.builderId === user?.id
                      ? "border-cyan-500/40 bg-cyan-500/5"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Rank */}
                  <div
                    className={`w-9 text-center font-bold text-lg shrink-0 ${
                      i < 3 ? RANK_STYLES[i] : "text-gray-500"
                    }`}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : entry.rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(entry.builderName || "A").substring(0, 2).toUpperCase()}
                  </div>

                  {/* Name + tier */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white truncate">
                        {entry.builderName}
                        {entry.builderId === user?.id && (
                          <span className="ml-1.5 text-xs text-cyan-400">(you)</span>
                        )}
                      </span>
                      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${TIER_COLORS[entry.tier] || TIER_COLORS.Newcomer}`}>
                        {TIER_ICONS[entry.tier]} {entry.tier}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        {entry.proposalsAccepted} accepted
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${entry.tipsReceived.toFixed(0)} tips
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      {entry.reputationScore.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pinned user rank if not in top 20 */}
          {!loading && user && userRank === null && leaderboard.length > 0 && (
            <div className="mt-4 border-t border-gray-800/50 pt-4">
              <p className="text-center text-sm text-gray-500">
                You're not in the top 20 yet. Submit proposals to climb the rankings!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
