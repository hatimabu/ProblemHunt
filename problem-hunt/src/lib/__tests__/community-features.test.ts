import {afterEach,expect,it,vi} from 'vitest';
import {supportContact,replyNotificationsEnabled} from '../community-features';
afterEach(()=>vi.unstubAllEnvs());
it('requires explicit notification enablement',()=>{
 vi.stubEnv('VITE_REPLY_NOTIFICATIONS_ENABLED','');expect(replyNotificationsEnabled()).toBe(false);
 vi.stubEnv('VITE_REPLY_NOTIFICATIONS_ENABLED','true');expect(replyNotificationsEnabled()).toBe(true);
});
it('accepts contact links without allowing script URLs or embedded credentials',()=>{
 for(const value of ['', 'javascript:alert(1)','https://user:secret@example.com','mailto:help@example.com?bcc=other@example.com']){
  vi.stubEnv('VITE_SUPPORT_CONTACT',value);expect(supportContact()).toBeNull();
 }
 for(const value of ['mailto:help@example.com','https://example.com/contact']){
  vi.stubEnv('VITE_SUPPORT_CONTACT',value);expect(supportContact()).toBe(value);
 }
});
