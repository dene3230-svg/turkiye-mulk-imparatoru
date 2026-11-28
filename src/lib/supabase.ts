import { createClient } from '@supabase/supabase-js';
import type { EmpireState, UserProfile } from '../types/game';
import {
  createSafeWebStorageAdapter,
  safeReadStorageJson,
  safeStorageSetItem,
} from './safeStartup';
import {
  clearStoredPlayerSession,
  createGuestProfile,
  loadStoredPlayerSession,
  loginPlayerAccountWithAdapter,
  registerPlayerAccountWithAdapter,
  saveStoredPlayerSession,
  upgradeGuestToAccountWithAdapter,
  type AuthActionResult,
  type PlayerAccountRow,
  type PlayerAccountsDbAdapter,
} from './playerAuth';

const FALLBACK_SUPABASE_URL = 'https://uninkpbgcljtgndwetbw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_OgsNojQw3kT53iN3LKKS2w_OKolvn9_';

export const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createSafeWebStorageAdapter(),
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const EMPIRE_STORAGE_PREFIX = 'tmi_empire_state_v1_';

function isValidStoredEmpire(value: unknown): value is EmpireState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<EmpireState>;
  return (
    typeof candidate.cash === 'number' &&
    Number.isFinite(candidate.cash) &&
    Array.isArray(candidate.businesses)
  );
}

const supabaseAccountsAdapter: PlayerAccountsDbAdapter = {
  async findByUsername(username: string) {
    try {
      const { data, error } = await supabase
        .from('player_accounts')
        .select('id, username, password_hash, display_name, created_at')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        return { row: null, error: { code: error.code, message: error.message } };
      }
      return { row: (data as PlayerAccountRow | null) ?? null };
    } catch (err) {
      return {
        row: null,
        error: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  },

  async createAccount(payload) {
    try {
      const { data, error } = await supabase
        .from('player_accounts')
        .insert({
          id: payload.id,
          username: payload.username,
          password_hash: payload.password_hash,
          display_name: payload.display_name,
        })
        .select('id, username, password_hash, display_name, created_at')
        .single();

      if (error) {
        return { row: null, error: { code: error.code, message: error.message } };
      }
      return { row: (data as PlayerAccountRow | null) ?? null };
    } catch (err) {
      return {
        row: null,
        error: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  },
};

export async function registerPlayerAccount(input: {
  username: string;
  password: string;
  displayName: string;
}): Promise<AuthActionResult> {
  return registerPlayerAccountWithAdapter(input, supabaseAccountsAdapter, true);
}

export async function loginPlayerAccount(input: {
  username: string;
  password: string;
}): Promise<AuthActionResult> {
  return loginPlayerAccountWithAdapter(input, supabaseAccountsAdapter, true);
}

export function startGuestPlayerSession(displayName: string): AuthActionResult {
  return createGuestProfile(displayName, true);
}

export async function upgradeGuestToSupabaseAccount(
  guest: UserProfile,
  input: { username: string; password: string; displayName?: string }
): Promise<AuthActionResult> {
  return upgradeGuestToAccountWithAdapter(guest, input, supabaseAccountsAdapter, true);
}

export {
  loadStoredPlayerSession,
  saveStoredPlayerSession,
  clearStoredPlayerSession,
};

export async function signOutAccount(): Promise<void> {
  clearStoredPlayerSession();
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore offline signout error
  }
}

export function saveEmpireStateLocal(userId: string, state: EmpireState): void {
  try {
    safeStorageSetItem(`${EMPIRE_STORAGE_PREFIX}${userId}`, JSON.stringify(state));
  } catch {
    // quota or private mode
  }
}

export function loadEmpireStateLocal(userId: string): EmpireState | null {
  return safeReadStorageJson<EmpireState | null>(
    `${EMPIRE_STORAGE_PREFIX}${userId}`,
    null,
    isValidStoredEmpire
  );
}
