#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
require('dotenv').config();

const isDev = process.argv.includes('--dev');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Path to config.js
const configPath = path.join(__dirname, '..', 'lib', 'config.js');

// Read the current config.js
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace placeholders with actual values
configContent = configContent.replace(
  /SUPABASE_URL = 'YOUR_SUPABASE_URL'/g,
  `SUPABASE_URL = '${SUPABASE_URL}'`
);

configContent = configContent.replace(
  /SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'/g,
  `SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}'`
);

// For development, keep the fallback comments
if (!isDev) {
  // Remove development comments in production
  configContent = configContent.replace(
    /\/\/ For local development, you can set these in the browser console:[\s\S]*?\/\/ SUPABASE_ANON_KEY = 'your-anon-key-here';/g,
    ''
  );
}

// Write the updated config
fs.writeFileSync(configPath, configContent);

console.log('✅ Config built successfully!');
console.log(`SUPABASE_URL: ${SUPABASE_URL === 'YOUR_SUPABASE_URL' ? 'NOT SET' : 'SET'}`);
console.log(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' ? 'NOT SET' : 'SET'}`);