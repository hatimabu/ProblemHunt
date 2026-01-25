#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

const isDev = process.argv.includes('--dev');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Path to config template and output
const templatePath = path.join(process.cwd(), 'lib', 'config.template.js');
const configPath = path.join(process.cwd(), 'lib', 'config.js');

console.log('Current working directory:', process.cwd());
console.log('Template path:', templatePath);
console.log('Config path:', configPath);
console.log('Template file exists:', fs.existsSync(templatePath));

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