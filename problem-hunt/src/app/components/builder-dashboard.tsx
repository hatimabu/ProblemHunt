import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Code,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  Send,
  Heart,
  Award,
  ChevronRight,
  Tag,
  Trash2,
  Wallet,
  User,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { authenticatedFetch, handleResponse } from "../../lib/auth-helper";
import { LinkWallet } from "./LinkWallet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface ProfileData {
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  reputation_score: number;
  user_type: string;
  created_at: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  budgetValue: number;
  upvotes: number;
  proposals: number;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export function BuilderDashboard() {
  const [updateText, setUpdateText] = useState("");
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProblems, setUserProblems] = useState<Problem[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [deletingProblemId, setDeletingProblemId] = useState<string | null>(null);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserProblems();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, bio, avatar_url, reputation_score, user_type, created_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        full_name: data.full_name || "",
        bio: data.bio || "",
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProblems = async () => {
    if (!user) return;

    try {
      setProblemsLoading(true);
      const response = await authenticatedFetch('/api/user/problems?sortBy=newest', {
        method: 'GET',
        headers: {},
        body: null,
      });

      const data = await handleResponse(response);
      setUserProblems(Array.isArray(data.problems) ? data.problems : []);
    } catch (error) {
      console.error('Error fetching user problems:', error);
      setUserProblems([]);
    } finally {
      setProblemsLoading(false);
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    try {
      setDeletingProblemId(problemId);
      const response = await authenticatedFetch(`/api/problems/${problemId}`, {
        method: 'DELETE',
        headers: {},
        body: null,
      });

      await handleResponse(response);
      // Remove the problem from the local state
      setUserProblems(prev => prev.filter(p => p.id !== problemId));
    } catch (error) {
      console.error('Error deleting problem:', error);
      alert('Error deleting problem. Please try again.');
    } finally {
      setDeletingProblemId(null);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false);
    if (profile) {
      setEditForm({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
      });
    }
    setProfileError("");
    setProfileSuccess("");
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    try {
      setIsSavingProfile(true);
      setProfileError("");
      setProfileSuccess("");

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      setIsEditingProfile(false);
      setProfileSuccess("Profile updated successfully!");

      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const displayName = profile?.full_name || profile?.username || user?.username || "Builder";
  const avatarInitials = displayName.substring(0, 2).toUpperCase();
  const reputationScore = profile?.reputation_score || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-50 bg-[#0a0a0f]/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              problemhunt.cc
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/browse">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Browse
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-white hover:text-cyan-400 hover:bg-gray-800">
                Dashboard
              </Button>
            </Link>
            {user ? (
              <Button 
                onClick={logout}
                variant="outline" 
                className="border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white"
              >
                Sign Out
              </Button>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
          <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="w-20 h-20 border-4 border-cyan-500/30">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-2xl">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      {profile?.user_type === 'builder' ? 'Builder' : 'Problem Poster'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      <span>⭐ {reputationScore} reputation</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">User Dashboard</h2>
            <Link to="/post">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0">
                Post New Problem
              </Button>
            </Link>
          </div>

          <TabsList className="bg-gray-900/50 border border-gray-800 p-1">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
            >
              <User className="w-4 h-4 mr-2" />
              Profile Info
            </TabsTrigger>
            <TabsTrigger
              value="wallets"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Crypto Wallets
            </TabsTrigger>
            <TabsTrigger
              value="problems"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
            >
              Posted Problems
            </TabsTrigger>
            <TabsTrigger
              value="proposals"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
            >
              Posted Proposals
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                {profileError && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                    {profileSuccess}
                  </div>
                )}

                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name" className="text-white mb-2 block">
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio" className="text-white mb-2 block">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white min-h-[120px] resize-none"
                        placeholder="Tell us about yourself..."
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {editForm.bio.length}/500 characters
                      </p>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSavingProfile ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        onClick={handleCancelProfileEdit}
                        disabled={isSavingProfile}
                        variant="outline"
                        className="border-gray-700 text-gray-400 hover:bg-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-6 mb-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Full Name</h3>
                        <p className="text-white text-lg">
                          {profile?.full_name || <span className="text-gray-500 text-sm">Not provided</span>}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Bio</h3>
                        <p className="text-white whitespace-pre-wrap">
                          {profile?.bio || <span className="text-gray-500 text-sm">No bio yet</span>}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Email</h3>
                        <p className="text-white font-mono text-sm bg-gray-800/50 px-3 py-2 rounded w-fit">
                          {user?.email}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Member Since</h3>
                        <p className="text-white text-sm">
                          {profile?.created_at && new Date(profile.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleEditProfile}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Crypto Wallets Tab */}
          <TabsContent value="wallets">
            <LinkWallet />
          </TabsContent>

          {/* Posted Problems Tab */}
          <TabsContent value="problems" className="space-y-6">
            {problemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              </div>
            ) : userProblems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Problems Posted Yet</h3>
                  <p className="text-sm">Start by posting a problem you need solved</p>
                </div>
                <Link to="/post">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 mt-4">
                    Post Your First Problem
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userProblems.map((problem) => (
                  <div key={problem.id} className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
                    <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <Link to={`/problem/${problem.id}`}>
                                <h3 className="text-2xl font-bold text-white mb-2 hover:text-cyan-400 transition-colors">
                                  {problem.title}
                                </h3>
                              </Link>
                              <p className="text-gray-400 mb-3 line-clamp-2">{problem.description}</p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Tag className="w-4 h-4" />
                                  <span>{problem.category}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4" />
                                  <span>{problem.upvotes} upvotes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Send className="w-4 h-4" />
                                  <span>{problem.proposals} proposals</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-2">
                                {problem.category}
                              </Badge>
                              <div className="text-sm text-gray-400 mb-1">Budget</div>
                              <div className="text-2xl font-bold text-cyan-400">
                                {problem.budget}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 lg:min-w-[180px]">
                          <Link to={`/problem/${problem.id}`}>
                            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 w-full">
                              View Details
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="border-gray-700 hover:bg-gray-800 text-white w-full"
                          >
                            View Proposals
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 w-full"
                                disabled={deletingProblemId === problem.id}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {deletingProblemId === problem.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Problem?</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete "{problem.title}"? This action cannot be undone and will remove all associated proposals and upvotes.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProblem(problem.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete Problem
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proposals" className="space-y-6">
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-white mb-2">No Proposals Posted Yet</h3>
                <p className="text-sm">Your proposals will show here once you submit them</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Hidden for now - will be populated with real data */}
        {false && (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="bg-gray-900/50 border border-gray-800 p-1">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
              >
                Active Projects (0)
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
              >
                Completed (0)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {[].map((project: any) => (
              <div key={project.id} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{project.deadline} left</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              <span>${project.tips} in tips</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400 mb-1">Bounty</div>
                          <div className="text-2xl font-bold text-cyan-400">
                            ${project.bounty.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-400">Your Progress</span>
                          <span className="text-white font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2 bg-gray-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </Progress>
                      </div>

                      {/* Post Update */}
                      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                        <div className="text-sm font-medium text-white mb-2">
                          Post Progress Update
                        </div>
                        <Textarea
                          placeholder="Share your progress to earn tips..."
                          value={updateText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpdateText(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500 mb-2 min-h-[80px]"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            Last updated: {project.lastUpdate}
                          </span>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Post Update
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-[180px]">
                      <Link to={`/problem/${project.id}`}>
                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 w-full">
                          View Problem
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-800 text-white w-full"
                      >
                        Submit Solution
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            {[].map((project: any) => (
              <div key={project.id} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                      <div className="text-sm text-gray-400">
                        Completed on {project.completedDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Total Earned</div>
                      <div className="text-2xl font-bold text-green-400">
                        ${project.earned.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Bounty: ${project.bounty.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
}
