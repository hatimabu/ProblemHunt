import { createRefreshCoordinator, persistSessionTokens } from '../src/lib/refresh-utils.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testRefreshLockConcurrency() {
  let refreshCallCount = 0;

  const runRefresh = createRefreshCoordinator(async ({ requestId, reason }) => {
    refreshCallCount += 1;
    await delay(80);
    return {
      access_token: `access-${requestId}`,
      refresh_token: `refresh-${reason}`
    };
  });

  const [r1, r2, r3] = await Promise.all([
    runRefresh('parallel-1'),
    runRefresh('parallel-2'),
    runRefresh('parallel-3')
  ]);

  if (refreshCallCount !== 1) {
    throw new Error(`Expected exactly 1 refresh call, got ${refreshCallCount}`);
  }

  if (r1.access_token !== r2.access_token || r2.access_token !== r3.access_token) {
    throw new Error('Expected all callers to receive the same refresh result');
  }

  console.log('PASS: concurrent refresh calls collapse into a single in-flight request');
}

async function testPersistBeforeProfileFetch() {
  let persisted = false;
  const callOrder = [];

  const mockClient = {
    auth: {
      setSession: async () => {
        callOrder.push('setSession:start');
        await delay(20);
        persisted = true;
        callOrder.push('setSession:end');
        return { error: null };
      }
    }
  };

  const profileFetch = async () => {
    callOrder.push('profileFetch:start');
    if (!persisted) {
      throw new Error('Profile fetch started before token persistence finished');
    }
    callOrder.push('profileFetch:end');
  };

  await persistSessionTokens(
    { access_token: 'access-1', refresh_token: 'refresh-1' },
    mockClient
  );

  await profileFetch();

  const expected = ['setSession:start', 'setSession:end', 'profileFetch:start', 'profileFetch:end'];
  if (callOrder.join('|') !== expected.join('|')) {
    throw new Error(`Unexpected call order: ${callOrder.join(' -> ')}`);
  }

  console.log('PASS: sign-in flow persists tokens before profile fetch');
}

async function run() {
  await testRefreshLockConcurrency();
  await testPersistBeforeProfileFetch();
  console.log('All refresh lock tests passed');
}

run().catch((error) => {
  console.error('Test failed:', error);
  process.exitCode = 1;
});
