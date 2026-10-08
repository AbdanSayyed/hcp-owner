import {create} from 'zustand';
import * as SS from '../lib/storage';
import axios from 'axios';
import {SERVER_URL,OWNER_USERNAME,OWNER_PASSWORD,DEMO_MODE} from '../config';

const DEMO_USER = {id: 0, username: 'owner', full_name: 'Demo Owner', role: 'manager', can_access_manager: true};

// The Owner app is a dedicated device app. It silently authenticates as the
// manager account so the owner never has to see or enter a login form.

type S = {
  ready: boolean; baseUrl: string; token: string | null; user: any; authError: string | null;
  badges: {approvals: number; unread: number};
  load(): Promise<void>;
  signIn(): Promise<boolean>;
  login(b: string, t: string, u: any): Promise<void>;
  logout(): Promise<void>;
  setBadges(p: Partial<S['badges']>): void;
};

// One shared sign-in at a time, so several screens hitting a 401 together only log in once.
let pending: Promise<boolean> | null = null;

export const useAuth = create<S>((set, get) => ({
  ready: false, baseUrl: SERVER_URL, token: null, user: null, authError: null, badges: {approvals: 0, unread: 0},

  async load() {
    if (DEMO_MODE) { set({baseUrl: 'demo', token: 'demo', user: DEMO_USER, authError: null, ready: true}); return; }
    const [t, u] = await Promise.all([SS.getItemAsync('tok'), SS.getItemAsync('usr')]);
    if (t) {
      let user: any = null;
      try { user = u ? JSON.parse(u) : null; } catch {}
      set({baseUrl: SERVER_URL, token: t, user, ready: true});
      return; // an expired/invalid token is refreshed automatically on the first 401
    }
    await get().signIn();
    set({ready: true});
  },

  // Silent login with the built-in owner account. Safe to call any time (e.g. after a 401).
  signIn() {
    if (DEMO_MODE) { set({baseUrl: 'demo', token: 'demo', user: DEMO_USER, authError: null}); return Promise.resolve(true); }
    if (pending) return pending;
    pending = (async () => {
      try {
        const r = await axios.post(SERVER_URL.replace(/\/$/, '') + '/api/auth/login',
          {username: OWNER_USERNAME, password: OWNER_PASSWORD}, {timeout: 15000});
        const user = r.data?.user;
        if (!r.data?.token) throw new Error('The CRM did not return a login token.');
        if (!(user?.role === 'manager' || user?.can_access_manager)) throw new Error('Owner account does not have manager access.');
        await SS.setItemAsync('base', SERVER_URL);
        await SS.setItemAsync('tok', r.data.token);
        await SS.setItemAsync('usr', JSON.stringify(user));
        set({baseUrl: SERVER_URL, token: r.data.token, user, authError: null});
        return true;
      } catch (e: any) {
        const msg = e?.response?.data?.error || (!e?.response ? 'Cannot reach the CRM server.' : e?.message) || 'Sign-in failed.';
        // Keep whatever token we had cleared so the next request tries again.
        await SS.deleteItemAsync('tok').catch(() => {});
        await SS.deleteItemAsync('usr').catch(() => {});
        set({token: null, user: null, authError: msg});
        return false;
      } finally {
        pending = null;
      }
    })();
    return pending;
  },

  async login(b, t, u) { await SS.setItemAsync('base', SERVER_URL); await SS.setItemAsync('tok', t); await SS.setItemAsync('usr', JSON.stringify(u)); set({baseUrl: b, token: t, user: u}); },

  // There is no login screen, so "log out" means: drop the saved session and sign in fresh.
  async logout() {
    await SS.deleteItemAsync('tok').catch(() => {});
    await SS.deleteItemAsync('usr').catch(() => {});
    set({token: null, user: null});
    await get().signIn();
  },

  setBadges(p) { set({badges: {...get().badges, ...p}}); },
}));
