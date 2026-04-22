import { useEffect, useState } from "react";
import { Award, Crown, Radar, Send, Signal, Trophy } from "lucide-react";
import { Navbar } from "./navbar";
import { Badge } from "./ui/badge";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
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

const TIER_STYLES: Record<string, string> = {
  Legend: "border-[color:rgba(201,168,76,0.36)] bg-[rgba(201,168,76,0.12)] text-[var(--board-gold)]",
  Expert: "border-[color:rgba(201,84,94,0.34)] bg-[rgba(201,84,94,0.14)] text-[var(--board-accent)]",
  Senior: "border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] text-[var(--board-ink)]",
  Builder: "border-[color:var(--board-line)] bg-[var(--board-panel)] text-[var(--board-muted)]",
  Newcomer: "border-[color:var(--board-line)] bg-[var(--board-bg)] text-[var(--board-soft)]",
};

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"alltime" | "week">("alltime");
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const response = await fetch(`${API_ENDPOINTS.LEADERBOARD}?period=${period}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`API Error ${response.status}: ${await response.text()}`);
        const data = await response.json();
        const entries: LeaderboardEntry[] = data.leaderboard || [];
        setLeaderboard(entries);
        setUserRank(user ? entries.find((entry) => entry.builderId === user.id) || null : null);
      } catch {
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [period, user]);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="grid gap-8 border-b border-[color:var(--board-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-[var(--board-metal-steel)]" />
              <p className="board-kicker">Leaderboard</p>
            </div>
            <h1 className="board-title mt-3">Who is earning trust on the board.</h1>
            <p className="board-copy mt-5">
              Rankings are driven by accepted proposals, reputation, and the work builders actually close. Use it as a quality signal, not a vanity wall.
            </p>
          </div>

          <div className="board-stat">
            <div className="flex items-center gap-2">
              <Signal className="h-3.5 w-3.5 text-emerald-500/80" />
              <div className="board-stat__value">{period === "alltime" ? "All time" : "This week"}</div>
            </div>
            <div className="board-stat__label">Ranking window</div>
          </div>
        </section>

        <section className="board-section px-0">
          <div className="mb-8 flex flex-wrap gap-2">
            {[
              { value: "alltime" as const, label: "All time" },
              { value: "week" as const, label: "This week" },
            ].map((item) => (
              <button key={item.value} onClick={() => setPeriod(item.value)} className={`board-pill ${period === item.value ? "board-pill--accent" : ""}`}>
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-16 w-full" />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="board-empty border-t border-[color:var(--board-line)]">
              <h2 className="board-subtitle">No rankings yet.</h2>
              <p>Once builders start submitting and winning work, the board will sort itself here.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 border-t border-[color:var(--board-line)] pt-8 md:grid-cols-3">
                {topThree.map((entry, index) => (
                  <article key={entry.builderId} className="board-panel relative overflow-hidden p-5 md:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(160,168,173,0.06),transparent_45%)]" />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="board-eyebrow">{index === 0 ? "Top builder" : `Rank ${entry.rank}`}</p>
                          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                            {entry.builderName}{entry.builderId === user?.id ? " (you)" : ""}
                          </h2>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] text-[var(--board-accent)]">
                          {index === 0 ? <Crown className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Badge className={`rounded-full border px-2.5 py-1 text-[12px] uppercase tracking-[0.14em] ${TIER_STYLES[entry.tier] || TIER_STYLES.Newcomer}`}>{entry.tier}</Badge>
                      </div>
                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="board-eyebrow">Reputation</p>
                          <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">{entry.reputationScore.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="board-eyebrow">Accepted</p>
                          <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">{entry.proposalsAccepted}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-10 border-t border-[color:var(--board-line)]">
                {rest.map((entry) => (
                  <article key={entry.builderId} className="board-row">
                    <div className="grid gap-4 md:grid-cols-[80px_minmax(0,1fr)_120px_120px] md:items-center">
                      <div className="font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-soft)]">{entry.rank}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">{entry.builderName}{entry.builderId === user?.id ? " (you)" : ""}</h2>
                          <Badge className={`rounded-full border px-2.5 py-1 text-[12px] uppercase tracking-[0.14em] ${TIER_STYLES[entry.tier] || TIER_STYLES.Newcomer}`}>{entry.tier}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--board-muted)]">
                          <span className="inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" />{entry.proposalsAccepted} accepted</span>
                          <span>${entry.tipsReceived.toFixed(0)} tips</span>
                          <span>{entry.proposalsSubmitted} submitted</span>
                        </div>
                      </div>
                      <div>
                        <p className="board-eyebrow">Reputation</p>
                        <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">{entry.reputationScore.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="board-eyebrow">Tier</p>
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]">{entry.tier}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!loading && user && userRank === null ? (
                <div className="mt-6 border-t border-[color:var(--board-line)] pt-5 text-sm text-[var(--board-muted)]">
                  <span className="inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[var(--board-gold)]" />
                    You are not in the top 20 yet. Submit proposals and close work to climb.
                  </span>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
