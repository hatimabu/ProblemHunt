#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

const isDev = process.argv.includes('--dev');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('🔨 Building ProblemHunt...\n');

// Step 1: Build the Vite app
console.log('📦 Building React app with Vite...');
try {
  execSync('npx vite build', { 
    stdio: 'inherit', 
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Vite build complete!\n');
} catch (error) {
  console.error('❌ Vite build failed');
  process.exit(1);
}

// Step 2: Generate config.js (for backward compatibility with old HTML if needed)
const templatePath = path.join(process.cwd(), 'lib', 'config.template.js');
const configPath = path.join(process.cwd(), 'lib', 'config.js');

console.log('⚙️  Generating config.js...');
console.log('Template path:', templatePath);
console.log('Config path:', configPath);

// Read the template config.js
let configContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with actual values
configContent = configContent.replace(
  /SUPABASE_URL = 'YOUR_SUPABASE_URL'/g,
  `SUPABASE_URL = '${SUPABASE_URL}'`
);

configContent = configContent.replace(
  /SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'/g,
  `SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}'`
);

// Write the updated config
fs.writeFileSync(configPath, configContent);

console.log('✅ Config built successfully!');
console.log(`🔐 SUPABASE_URL: ${SUPABASE_URL === 'YOUR_SUPABASE_URL' ? 'NOT SET' : 'SET'}`);
console.log(`🔑 SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' ? 'NOT SET' : 'SET'}`);
console.log('\n✨ Build complete! Run `npm run server` to start.\n');