// Local checks only: never invoke hosted smoke tests, link, push or reset.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--install')) {
  console.error('Usage: npm run verify OR npm run install:all');
  process.exit(1);
}
if (process.versions.node.split('.')[0] !== '22') {
  console.warn(`Node ${process.versions.node}: CI uses Node 22 (.nvmrc). Results do not prove Node 22 parity.`);
}
const env = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  VITE_SENTRY_DSN: '',
  VITE_SENTRY_ENVIRONMENT: 'baseline',
};
function run(label, cwd, argv) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, argv, {
    cwd: path.join(root, cwd), env, stdio: 'inherit', shell: false,
  });
  if (result.error || result.status !== 0) {
    console.error(`${label} failed${result.error ? `: ${result.error.message}` : ''}. Remaining steps were not run.`);
    process.exit(result.status || 1);
  }
}
if (args[0] === '--install') {
  const npm = process.env.npm_execpath;
  if (!npm || !existsSync(npm)) {
    console.error('Run installation through npm run install:all so the npm CLI path is available.');
    process.exit(1);
  }
  for (const dir of ['problem-hunt', 'supabase/tests', 'services/notifications']) {
    run(`Install locked dependencies: ${dir}`, dir, [npm, 'ci', '--no-audit', '--no-fund']);
  }
  console.log('Dependencies installed. Next: npm run verify');
} else {
  for (const file of ['problem-hunt/node_modules/typescript/bin/tsc',
    'problem-hunt/node_modules/vitest/vitest.mjs', 'problem-hunt/node_modules/vite/bin/vite.js',
    'supabase/tests/node_modules/@electric-sql/pglite/package.json']) {
    if (!existsSync(path.join(root, file))) {
      console.error('Missing baseline dependencies. Run npm run install:all first.');
      process.exit(1);
    }
  }
  run('TypeScript', 'problem-hunt', ['node_modules/typescript/bin/tsc', '--noEmit']);
  run('Frontend tests (mocked services)', 'problem-hunt', ['node_modules/vitest/vitest.mjs', 'run', '--maxWorkers=2']);
  run('Disposable database permissions and notification recovery', 'supabase/tests', ['--test', 'community.test.mjs', 'notifications.test.mjs']);
  run('Notification worker configuration tests', 'services/notifications', ['--test', 'test/config.test.mjs']);
  run('Production build with placeholder public configuration', 'problem-hunt', ['node_modules/vite/bin/vite.js', 'build']);
  console.log('\nLocal baseline passed. This does not verify hosted Auth, Storage, concurrency or deployment.');
}
