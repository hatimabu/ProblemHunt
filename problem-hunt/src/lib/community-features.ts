// Enable only in a build with a verified notification delivery service.
export function replyNotificationsEnabled(): boolean {
  return import.meta.env.VITE_REPLY_NOTIFICATIONS_ENABLED === 'true';
}

export function supportContact(): string | null {
  const value = (import.meta.env.VITE_SUPPORT_CONTACT || '').trim();
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
    if (url.protocol === 'mailto:' && /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(url.pathname) && !url.search) return url.href;
  } catch { /* Unconfigured contact is an explicit release gate. */ }
  return null;
}
