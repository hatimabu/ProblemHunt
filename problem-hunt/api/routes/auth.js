import { Router } from 'express';
import { query } from '../db.js';
import { signToken, hashPassword, comparePassword, authenticate } from '../auth.js';
import { generateId, getTimestamp } from '../helpers.js';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, full_name, user_type = 'builder' } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'email, password, and username are required' });
    }
    const existing = await query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }
    const passwordHash = await hashPassword(password);
    const id = generateId();
    const now = getTimestamp();
    await query(
      `INSERT INTO users (id, email, username, full_name, user_type, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, email, username, full_name || username, user_type, passwordHash, now, now]
    );
    const token = signToken({ sub: id, email, username, user_type });
    return res.status(201).json({
      user: { id, email, username, full_name: full_name || username, user_type },
      access_token: token,
    });
  } catch (e) {
    console.error('Signup error:', e);
    return res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const result = await query(
      'SELECT id, email, username, full_name, user_type, password_hash FROM users WHERE email=$1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken({ sub: user.id, email: user.email, username: user.username, user_type: user.user_type });
    return res.json({
      user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name, user_type: user.user_type },
      access_token: token,
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/wallet — create/authenticate user via wallet signature
router.post('/wallet', async (req, res) => {
  try {
    const { chain, address, signature, statement } = req.body;
    if (!chain || !address) return res.status(400).json({ error: 'chain and address are required' });

    // Find or create user by wallet address
    let user = null;
    const walletResult = await query(
      'SELECT u.id, u.email, u.username, u.full_name, u.user_type FROM wallets w JOIN users u ON u.id=w.user_id WHERE w.address=$1 AND w.chain=$2 LIMIT 1',
      [address, chain]
    );
    if (walletResult.rows.length > 0) {
      user = walletResult.rows[0];
    } else {
      // Create new user from wallet
      const id = generateId();
      const now = getTimestamp();
      const username = `user_${address.slice(0, 8).toLowerCase()}`;
      const email = `${username}@wallet.local`;
      const fakeHash = await hashPassword(generateId()); // placeholder password
      await query(
        `INSERT INTO users (id, email, username, full_name, user_type, password_hash, wallet_address, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'builder',$5,$6,$7,$8)`,
        [id, email, username, username, fakeHash, address, now, now]
      );
      // Save wallet
      const wid = generateId();
      await query(
        'INSERT INTO wallets (id, user_id, chain, address, is_primary, created_at) VALUES ($1,$2,$3,$4,true,$5)',
        [wid, id, chain, address, now]
      );
      user = { id, email, username, full_name: username, user_type: 'builder' };
    }

    const token = signToken({ sub: user.id, email: user.email, username: user.username, user_type: user.user_type });
    return res.json({ user, token });
  } catch (e) {
    console.error('Wallet auth error:', e);
    return res.status(500).json({ error: 'Wallet authentication failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, full_name, user_type, bio, avatar_url, wallet_address, reputation_score, created_at FROM users WHERE id=$1',
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (e) {
    console.error('Get me error:', e);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
