let authState = {
  isLoading: true,
  user: null
};

const subscribers = new Set();

export function setAuthState(nextState) {
  authState = {
    ...authState,
    ...nextState
  };

  subscribers.forEach((subscriber) => {
    try {
      subscriber(authState);
    } catch (error) {
      console.error('auth-state subscriber failed:', error);
    }
  });
}

export function getAuthState() {
  return authState;
}

export function waitForAuthReady(timeoutMs = 10000) {
  const current = getAuthState();
  if (!current.isLoading) {
    if (!current.user) {
      throw new Error('User is not authenticated');
    }
    return Promise.resolve(current);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscribers.delete(onStateChange);
      reject(new Error('Timed out waiting for auth initialization'));
    }, timeoutMs);

    const onStateChange = (nextState) => {
      if (!nextState.isLoading) {
        clearTimeout(timeout);
        subscribers.delete(onStateChange);

        if (!nextState.user) {
          reject(new Error('User is not authenticated'));
          return;
        }

        resolve(nextState);
      }
    };

    subscribers.add(onStateChange);
  });
}
