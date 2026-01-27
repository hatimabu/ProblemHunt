import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// Inject env vars endpoint
app.get('/env.js', (req, res) => {
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  };

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.env = ${JSON.stringify(envVars)};`);
});

// Serve index.html with env injection for all routes (SPA support)
app.get('*', (req, res) => {
  try {
    let html = readFileSync(join(__dirname, 'dist', 'index.html'), 'utf-8');
    
    // Inject env script tag before closing head
    const envScript = `<script src="/env.js"></script>`;
    html = html.replace('</head>', `${envScript}\n</head>`);
    
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Serving from: ${join(__dirname, 'dist')}`);
  console.log(`🔐 Supabase URL: ${process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set'}`);
  console.log(`🔑 Supabase Key: ${process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'}`);
});
