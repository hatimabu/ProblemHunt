import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Bell, Briefcase, CheckCircle, Coins, Edit2, Loader2, Save, User, Wallet } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { LinkWallet } from "./LinkWallet";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { formatBudget, formatJobStatus, formatSol, shortWallet, type NotificationRow, type ProblemPost, type ProposalRecord } from "../../lib/marketplace";

interface ProfileData {
  username: string;
  full_name: string | null;
  bio: string | null;
  reputation_score: number;
  user_type: string;
  created_at: string;
  wallet_address?: string | null;
}

export function BuilderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<ProblemPost[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [walletCount, setWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", bio: "" });

  const activeJobs = useMemo(
    () => proposals.filter((proposal) => proposal.problemType === "job" && proposal.isAcceptedBuilder),
    [proposals]
  );

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [profileResult, walletCountResult, notificationsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address")
            .eq("user_id", user.id)
            .single(),
          supabase.from("wallets").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("notifications")
            .select("id, message, link, is_read, created_at")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (profileResult.data) {
          setProfile(profileResult.data);
          setProfileForm({
            full_name: profileResult.data.full_name || "",
            bio: profileResult.data.bio || "",
          });
        }
        setWalletCount(walletCountResult.count || 0);
        setNotifications(notificationsResult.data || []);

        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const [postsResponse, proposalsResponse] = await Promise.all([
          fetch(`${API_ENDPOINTS.USER_PROBLEMS}?sortBy=newest`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ENDPOINTS.USER_PROPOSALS, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setPosts(Array.isArray(postsData.problems) ? postsData.problems : []);
        }
        if (proposalsResponse.ok) {
          const proposalsData = await proposalsResponse.json();
          setProposals(Array.isArray(proposalsData.proposals) ? proposalsData.proposals : []);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSavingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          bio: profileForm.bio,
        })
        .eq("user_id", user.id)
        .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address")
        .single();
      if (data) {
        setProfile(data);
      }
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.username || user?.username || "Builder";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  {profile?.user_type === "builder" ? "Builder" : "Problem Poster"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <span>{profile?.reputation_score || 0} reputation</span>
                <span>{walletCount} wallet{walletCount === 1 ? "" : "s"} linked</span>
                <span>{activeJobs.length} active accepted job{activeJobs.length === 1 ? "" : "s"}</span>
              </div>
              {profile?.wallet_address && (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 inline-block">
                  Primary SOL wallet: {shortWallet(profile.wallet_address)}
                </div>
              )}
            </div>
            <Button onClick={() => setWalletModalOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
              <Wallet className="w-4 h-4 mr-2" />
              Manage Wallets
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800 p-1 flex flex-wrap h-auto">
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
            <TabsTrigger value="posts"><Briefcase className="w-4 h-4 mr-2" />My Posts</TabsTrigger>
            <TabsTrigger value="proposals"><Coins className="w-4 h-4 mr-2" />My Proposals</TabsTrigger>
            <TabsTrigger value="active-jobs"><CheckCircle className="w-4 h-4 mr-2" />Active Jobs</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
              {editingProfile ? (
                <>
                  <div><Label className="mb-2 block">Full Name</Label><Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
                  <div><Label className="mb-2 block">Bio</Label><Textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} className="bg-gray-800 border-gray-700 text-white min-h-[120px]" /></div>
                  <div className="flex gap-3"><Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0"><Save className="w-4 h-4 mr-2" />{savingProfile ? "Saving..." : "Save"}</Button><Button variant="outline" onClick={() => setEditingProfile(false)} className="border-gray-700 text-white hover:bg-gray-800">Cancel</Button></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1">Profile Details</h2>
                      <p className="text-gray-400 text-sm">Keep your builder profile and payout wallet up to date.</p>
                    </div>
                    <Button variant="outline" onClick={() => setEditingProfile(true)} className="border-gray-700 text-white hover:bg-gray-800"><Edit2 className="w-4 h-4 mr-2" />Edit</Button>
                  </div>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div><span className="text-gray-500 block mb-1">Username</span>{profile?.username}</div>
                    <div><span className="text-gray-500 block mb-1">Full Name</span>{profile?.full_name || "Not set"}</div>
                    <div><span className="text-gray-500 block mb-1">Bio</span>{profile?.bio || "No bio yet"}</div>
                    <div><span className="text-gray-500 block mb-1">Primary Solana Wallet</span>{profile?.wallet_address ? shortWallet(profile.wallet_address) : "Not linked"}</div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="posts">
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-gray-400">No posts yet.</div>
              ) : posts.map((post) => (
                <div key={post.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className="bg-gray-800 text-gray-300 border-gray-700">{post.type === "job" ? "Job" : "Problem"}</Badge>
                        {post.type === "job" && post.jobStatus && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{formatJobStatus(post.jobStatus)}</Badge>}
                      </div>
                      <Link to={`/problem/${post.id}`} className="text-lg font-semibold text-white hover:text-cyan-300">{post.title}</Link>
                      <p className="text-sm text-gray-400 mt-1">{post.description}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <div className="text-cyan-300 font-semibold">{formatBudget(post)}</div>
                      <div>{post.proposals} proposals</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="proposals">
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-gray-400">No proposals submitted yet.</div>
              ) : proposals.map((proposal) => (
                <div key={proposal.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className="bg-gray-800 text-gray-300 border-gray-700">{proposal.problemType === "job" ? "Job" : "Problem"}</Badge>
                        <Badge className="bg-gray-800 text-gray-300 border-gray-700">{proposal.status || "pending"}</Badge>
                        {proposal.jobStatus && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{formatJobStatus(proposal.jobStatus)}</Badge>}
                      </div>
                      <Link to={`/problem/${proposal.problemId}`} className="text-lg font-semibold text-white hover:text-cyan-300">{proposal.problemTitle || "Untitled Post"}</Link>
                      <p className="text-sm text-gray-400 mt-1">{proposal.briefSolution || proposal.description}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      {proposal.proposedPriceSol ? <div className="text-cyan-300 font-semibold">{formatSol(proposal.proposedPriceSol)} SOL</div> : proposal.cost ? <div>{proposal.cost}</div> : null}
                      {proposal.tipTotal ? <div>{formatSol(proposal.tipTotal)} tipped</div> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active-jobs">
            <div className="space-y-4">
              {activeJobs.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-gray-400">No accepted jobs yet.</div>
              ) : activeJobs.map((job) => (
                <div key={job.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-2">{formatJobStatus(job.jobStatus)}</Badge>
                      <Link to={`/problem/${job.problemId}`} className="text-lg font-semibold text-white hover:text-cyan-300">{job.problemTitle || "Untitled Job"}</Link>
                      <p className="text-sm text-gray-400 mt-1">{job.estimatedDelivery || job.timeline || "Timeline pending"}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      {job.proposedPriceSol ? <div className="text-cyan-300 font-semibold">{formatSol(job.proposedPriceSol)} SOL</div> : null}
                      <Link to={`/problem/${job.problemId}`} className="text-cyan-300 hover:text-cyan-200">Open job</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-gray-400">No notifications yet.</div>
              ) : notifications.map((notification) => (
                <div key={notification.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-white">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                    {notification.link ? <Link to={notification.link} className="text-cyan-300 hover:text-cyan-200 text-sm">Open</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="bg-gray-900 border border-gray-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-cyan-400" />Manage Wallets</DialogTitle></DialogHeader>
          <LinkWallet onWalletsChange={setWalletCount} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
