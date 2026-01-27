# Tiny Node Backend for ProblemHunt

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables** in `.env`:
   ```
   SUPABASE_URL=your_url_here
   SUPABASE_ANON_KEY=your_key_here
   ```

3. **Run the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-rebuild:
   ```bash
   npm run build && npm run server
   ```

4. **Access the app:**
   - Open http://localhost:3000

## How It Works

The tiny Node backend (`server.js`):

✅ **Serves static files** from `dist/` folder  
✅ **Injects environment variables** via `/env.js` endpoint  
✅ **Zero secrets in code** - all sensitive values loaded from `.env`  
✅ **SPA routing support** - handles client-side routes  
✅ **Production ready** - works on any Node hosting platform  

## Environment Variables

The server automatically exposes these to the client:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key

Access them in your app via `window.env`:
```javascript
const supabaseUrl = window.env.SUPABASE_URL;
const supabaseKey = window.env.SUPABASE_ANON_KEY;
```

## Deployment

### Azure Static Web Apps
Add env vars in Azure Portal → Configuration → Application settings

### Vercel/Netlify/Railway
Add env vars in dashboard, they'll be injected at runtime

### Docker
```dockerfile
ENV SUPABASE_URL=your_url
ENV SUPABASE_ANON_KEY=your_key
CMD ["node", "server.js"]
```

## Security Notes

- Never commit `.env` file (already in `.gitignore`)
- Rotate keys before making repo public
- The `SUPABASE_ANON_KEY` is safe to expose client-side when Row Level Security (RLS) is properly configured
