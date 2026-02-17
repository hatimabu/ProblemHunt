// Backward compatibility re-export
// Use ProfileDashboard component instead for the new dashboard UI
export { ProfileDashboard as Profile } from "./ProfileDashboard";
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

  const fetchWallets = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setWallets(data || []);
    } catch (err: any) {
      console.error('Error fetching wallets:', err);
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
          .neq('id', user.id)
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

  const saveWalletToDatabase = async (chain: ChainType, address: string) => {
    if (!user) return;

    // Check if wallet already exists
    const { data: existing } = await supabase
      .from('wallets')
      .select('id')
      .eq('chain', chain)
      .eq('address', address)
      .single();

    if (existing) {
      setLinkSuccess("Wallet already linked.");
      return;
    }

    // Check if user has any wallets
    const { data: userWallets } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id);

    const isPrimary = !userWallets || userWallets.length === 0;

    const { error: insertError } = await supabase
      .from('wallets')
      .insert({
        user_id: user.id,
        chain,
        address,
        is_primary: isPrimary
      });

    if (insertError) {
      throw insertError;
    }

    await fetchWallets();
  };

  const linkEthereumWallet = async (chain: ChainType = 'ethereum') => {
    if (!user) return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setLinkError("Please install MetaMask or another Ethereum wallet");
      return;
    }

    try {
      setLinkingChain(chain);
      setLinkError("");
      setLinkSuccess("");

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const walletAddress = accounts[0].toLowerCase();
      const statement = `Link wallet to ProblemHunt profile\n\nWallet: ${walletAddress}\nTimestamp: ${new Date().toISOString()}`;

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [statement, walletAddress],
      }) as string;

      const recoveredAddress = ethers.verifyMessage(statement, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress) {
        throw new Error("Signature verification failed");
      }

      await saveWalletToDatabase(chain, walletAddress);
      setLinkSuccess(`${chain.toUpperCase()} wallet linked successfully.`);
    } catch (err: any) {
      console.error('Error linking Ethereum wallet:', err);
      setLinkError(err.message || 'Failed to link wallet');
    } finally {
      setLinkingChain(null);
    }
  };

  const linkSolanaWallet = async () => {
    if (!user) return;
    const solana = (window as any).solana;
    if (!solana) {
      setLinkError("Please install Phantom or another Solana wallet");
      return;
    }

    try {
      setLinkingChain('solana');
      setLinkError("");
      setLinkSuccess("");

      const resp = await solana.connect();
      const walletAddress = resp.publicKey.toString();

      const statement = `Link wallet to ProblemHunt profile\n\nWallet: ${walletAddress}\nTimestamp: ${new Date().toISOString()}`;
      const encodedMessage = new TextEncoder().encode(statement);
      await solana.signMessage(encodedMessage, 'utf8');

      await saveWalletToDatabase('solana', walletAddress);
      setLinkSuccess("SOLANA wallet linked successfully.");
    } catch (err: any) {
      console.error('Error linking Solana wallet:', err);
      setLinkError(err.message || 'Failed to link wallet');
    } finally {
      setLinkingChain(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
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
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-cyan-500/20">
                  <AvatarImage src={profile.avatar_url} alt={profile.username} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-2xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    {profile.username}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`bg-${userTypeColor}-500/10 border-${userTypeColor}-500/30 text-${userTypeColor}-400`}
                    >
                      {userTypeLabel}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span>{profile.reputation_score} reputation</span>
                    </div>
                  </div>
                </div>
              </div>
              {!isEditing && (
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
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
                    className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white min-h-[100px] resize-none"
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.bio.length}/500 characters
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
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
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Full Name</h3>
                  <p className="text-white">
                    {profile.full_name || <span className="text-gray-500">Not provided</span>}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Bio</h3>
                  <p className="text-white whitespace-pre-wrap">
                    {profile.bio || <span className="text-gray-500">No bio yet</span>}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Email</h3>
                  <p className="text-white">{user?.email}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Member Since</h3>
                  <p className="text-white">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link Wallet Card */}
        <LinkWallet />
      </div>
    </div>
  );
}
