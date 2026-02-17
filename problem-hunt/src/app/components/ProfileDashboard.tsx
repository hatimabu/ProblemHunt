import { useState, useEffect } from "react";
import { User, Edit2, Save, X, Award, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LinkWallet } from "./LinkWallet";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

interface ProfileData {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  user_type: 'problem_poster' | 'builder';
  reputation_score: number;
  created_at: string;
}

export function ProfileDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form state for editing
  const [editForm, setEditForm] = useState({
    username: "",
    full_name: "",
    bio: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setProfile(data);
      setEditForm({
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
      });
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setEditForm({
        username: profile.username,
        full_name: profile.full_name || "",
        bio: profile.bio || "",
      });
    }
    setError("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      // Validate username
      if (editForm.username.length < 3 || editForm.username.length > 30) {
        throw new Error('Username must be between 3 and 30 characters');
      }

      // Check if username changed and if it's available
      if (editForm.username !== profile.username) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', editForm.username)
          .single();

        if (existingProfile) {
          throw new Error('Username already taken');
        }
      }

      // Update profile
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          full_name: editForm.full_name,
          bio: editForm.bio,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            <p className="text-gray-400">Profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userTypeLabel = profile.user_type === 'builder' ? 'Builder' : 'Problem Poster';
  const userTypeColor = profile.user_type === 'builder' ? 'cyan' : 'blue';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Profile Header */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
          <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-cyan-500/30 flex-shrink-0">
                <AvatarImage src={profile.avatar_url} alt={profile.username} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-2xl">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <Badge 
                    className={`bg-${userTypeColor}-500/20 text-${userTypeColor}-400 border-${userTypeColor}-500/30`}
                  >
                    {userTypeLabel}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span>⭐ {profile.reputation_score} reputation</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {!isEditing && (
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 whitespace-nowrap"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
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
          </TabsList>

          {/* Profile Info Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                    {successMessage}
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username" className="text-white mb-2 block">
                        Username
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                        minLength={3}
                        maxLength={30}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">3-30 characters</p>
                    </div>

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
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isSaving}
                        variant="outline"
                        className="border-gray-700 text-gray-400 hover:bg-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Full Name</h3>
                      <p className="text-white text-lg">
                        {profile.full_name || <span className="text-gray-500 text-sm">Not provided</span>}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Bio</h3>
                      <p className="text-white whitespace-pre-wrap">
                        {profile.bio || <span className="text-gray-500 text-sm">No bio yet</span>}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Email</h3>
                      <p className="text-white font-mono text-sm bg-gray-800/50 px-3 py-2 rounded w-fit">
                        {user?.email}
                      </p>
                    </div>

                    <div className="pt-2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Account Type</h3>
                      <Badge className={`bg-${userTypeColor}-500/20 text-${userTypeColor}-400 border-${userTypeColor}-500/30 w-fit`}>
                        {userTypeLabel}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Crypto Wallets Tab */}
          <TabsContent value="wallets">
            <LinkWallet />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
