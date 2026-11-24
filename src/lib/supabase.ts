import { createClient, type Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { EmpireState, UserProfile } from '../types/game';

const FALLBACK_SUPABASE_URL = 'https://uninkpbgcljtgndwetbw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_OgsNojQw3kT53iN3LKKS2w_OKolvn9_';

export const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_SUPABASE_ANON_KEY;

export const NATIVE_OAUTH_REDIRECT = 'com.fugames.turkiyemulkimparatoru://login-callback';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const GUEST_PROFILE_KEY = 'tmi_guest_profile_v1';
const EMPIRE_STORAGE_PREFIX = 'tmi_empire_state_v1_';

export function sessionToUserProfile(session: Session): UserProfile {
  const user = session.user;
  const meta = user.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    (user.email ? user.email.split('@')[0] : 'İmparator');

  return {
    id: user.id,
    name: fullName,
    email: user.email,
    avatarUrl: (meta.avatar_url as string | undefined) || (meta.picture as string | undefined),
    provider: 'google',
  };
}

export function createOrLoadGuestProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed?.id && parsed?.name) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  const profile: UserProfile = {
    id: `guest-${Date.now().toString(36)}`,
    name: 'Misafir Yatırımcı',
    provider: 'guest',
  };

  try {
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }

  return profile;
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? NATIVE_OAUTH_REDIRECT
      : `${window.location.origin}${window.location.pathname}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Google girişi başlatılamadı.',
    };
  }
}

export async function signOutAccount(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore offline signout error
  }
}

export function saveEmpireStateLocal(userId: string, state: EmpireState): void {
  try {
    localStorage.setItem(`${EMPIRE_STORAGE_PREFIX}${userId}`, JSON.stringify(state));
  } catch {
    // quota or private mode
  }
}

export function loadEmpireStateLocal(userId: string): EmpireState | null {
  try {
    const raw = localStorage.getItem(`${EMPIRE_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmpireState;
    if (typeof parsed?.cash === 'number' && Array.isArray(parsed?.businesses)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
