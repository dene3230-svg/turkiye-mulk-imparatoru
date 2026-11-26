import type { UserProfile } from '../types/game';
import {
  safeReadStorageJson,
  safeStorageRemoveItem,
  safeStorageSetItem,
  withSafeTimeout,
} from './safeStartup';

export const PLAYER_SESSION_STORAGE_KEY = 'tmi_player_session_v1';
const LOCAL_ACCOUNTS_STORAGE_KEY = 'tmi_local_accounts_v1';
const PBKDF2_ITERATIONS = 100_000;

export interface PlayerAccountRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  created_at?: string;
}

export interface AuthActionResult {
  ok: boolean;
  user?: UserProfile;
  error?: string;
  source?: 'supabase' | 'local';
}

export interface PlayerAccountsDbAdapter {
  findByUsername: (
    username: string
  ) => Promise<{ row: PlayerAccountRow | null; error?: { code?: string; message?: string } }>;
  createAccount: (payload: {
    id: string;
    username: string;
    password_hash: string;
    display_name: string;
  }) => Promise<{ row: PlayerAccountRow | null; error?: { code?: string; message?: string } }>;
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

export function normalizeUsername(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase();
}

export function sanitizeDisplayName(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateRegistrationInput(input: {
  username: string;
  password: string;
  displayName: string;
}): { ok: boolean; username: string; displayName: string; error?: string } {
  const username = normalizeUsername(input.username);
  const password = String(input.password ?? '');
  const displayName = sanitizeDisplayName(input.displayName);

  if (!username) {
    return { ok: false, username, displayName, error: 'Kullanıcı adı zorunludur.' };
  }
  if (username.length < 3 || username.length > 24) {
    return {
      ok: false,
      username,
      displayName,
      error: 'Kullanıcı adı en az 3, en fazla 24 karakter olmalıdır.',
    };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return {
      ok: false,
      username,
      displayName,
      error: 'Kullanıcı adı yalnızca küçük İngilizce harf (a-z), rakam (0-9) ve alt çizgi (_) içerebilir.',
    };
  }
  if (!password) {
    return { ok: false, username, displayName, error: 'Şifre zorunludur.' };
  }
  if (password.length < 4) {
    return { ok: false, username, displayName, error: 'Şifre en az 4 karakter olmalıdır.' };
  }
  if (password.length > 128) {
    return { ok: false, username, displayName, error: 'Şifre en fazla 128 karakter olabilir.' };
  }
  if (!displayName) {
    return {
      ok: false,
      username,
      displayName,
      error: 'Görünen İsim / Patron Adı zorunludur.',
    };
  }
  if (displayName.length < 2 || displayName.length > 32) {
    return {
      ok: false,
      username,
      displayName,
      error: 'Görünen İsim en az 2, en fazla 32 karakter olmalıdır.',
    };
  }

  return { ok: true, username, displayName };
}

export function validateLoginInput(input: {
  username: string;
  password: string;
}): { ok: boolean; username: string; error?: string } {
  const username = normalizeUsername(input.username);
  const password = String(input.password ?? '');

  if (!username) {
    return { ok: false, username, error: 'Lütfen kullanıcı adınızı girin.' };
  }
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return {
      ok: false,
      username,
      error: 'Geçersiz kullanıcı adı formatı (yalnızca küçük harf, rakam ve _).',
    };
  }
  if (!password || password.length < 4) {
    return { ok: false, username, error: 'Lütfen en az 4 karakterlik şifrenizi girin.' };
  }

  return { ok: true, username };
}

// ============================================================================
// PASSWORD HASHING (Web Crypto PBKDF2-SHA256 + Constant-Time Verification)
// ============================================================================

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function generateSaltBytes(length = 16): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i += 1) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

/** Pure-JS fallback hash only when Web Crypto Subtle is unavailable (e.g. non-secure HTTP WebView) */
function fallbackSaltedHash(password: string, saltHex: string, rounds = 4096): string {
  let h1 = 0xdeadbeef ^ saltHex.length;
  let h2 = 0x41c6ce57 ^ password.length;
  let state = `${saltHex}:${password}:tmi-v143`;
  for (let r = 0; r < rounds; r += 1) {
    for (let i = 0; i < state.length; i += 1) {
      const ch = state.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    state = `${(h1 >>> 0).toString(16)}:${(h2 >>> 0).toString(16)}`;
  }
  const partA = (h1 >>> 0).toString(16).padStart(8, '0');
  const partB = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${partA}${partB}${(Math.imul(h1, 31) >>> 0).toString(16).padStart(8, '0')}${(Math.imul(h2, 17) >>> 0).toString(16).padStart(8, '0')}`;
}

async function derivePbkdf2Hex(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const enc = new TextEncoder();
    const keyMaterial = await subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    return bytesToHex(new Uint8Array(bits));
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = generateSaltBytes(16);
  const saltHex = bytesToHex(saltBytes);
  const derivedHex = await derivePbkdf2Hex(password, saltBytes, PBKDF2_ITERATIONS);
  if (derivedHex) {
    return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${saltHex}$${derivedHex}`;
  }
  const fallbackHex = fallbackSaltedHash(password, saltHex, 4096);
  return `salted_v1$4096$${saltHex}$${fallbackHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');

  if (parts.length === 4 && parts[0] === 'pbkdf2_sha256') {
    const iterations = Number(parts[1]);
    const saltHex = parts[2];
    const expectedHex = parts[3];
    if (!Number.isFinite(iterations) || iterations < 1000 || !saltHex || !expectedHex) return false;
    const derivedHex = await derivePbkdf2Hex(password, hexToBytes(saltHex), iterations);
    if (!derivedHex) return false;
    return constantTimeEqualHex(derivedHex, expectedHex);
  }

  if (parts.length === 4 && parts[0] === 'salted_v1') {
    const rounds = Number(parts[1]);
    const saltHex = parts[2];
    const expectedHex = parts[3];
    if (!Number.isFinite(rounds) || rounds < 1 || !saltHex || !expectedHex) return false;
    const derivedHex = fallbackSaltedHash(password, saltHex, rounds);
    return constantTimeEqualHex(derivedHex, expectedHex);
  }

  // Compatibility with raw SHA-256 hex rows if an account was seeded externally
  if (/^[a-f0-9]{64}$/i.test(storedHash) && globalThis.crypto?.subtle) {
    try {
      const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password)
      );
      return constantTimeEqualHex(bytesToHex(new Uint8Array(digest)), storedHash.toLowerCase());
    } catch {
      return false;
    }
  }

  return false;
}

// ============================================================================
// SESSION & LOCAL FALLBACK STORE (NEVER STORES PASSWORD OR HASH IN SESSION)
// ============================================================================

export function isValidStoredSession(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Partial<UserProfile>;
  return (
    typeof v.id === 'string' &&
    v.id.trim().length > 0 &&
    typeof v.username === 'string' &&
    v.username.trim().length >= 3 &&
    typeof v.name === 'string' &&
    v.name.trim().length >= 2 &&
    v.provider === 'account'
  );
}

export function loadStoredPlayerSession(): UserProfile | null {
  const session = safeReadStorageJson<UserProfile | null>(
    PLAYER_SESSION_STORAGE_KEY,
    null,
    isValidStoredSession
  );
  if (!session) return null;
  const displayName = sanitizeDisplayName(session.displayName || session.name);
  return {
    id: session.id,
    username: normalizeUsername(session.username),
    name: displayName,
    displayName,
    provider: 'account',
  };
}

export function saveStoredPlayerSession(profile: UserProfile): void {
  const safeSession: UserProfile = {
    id: profile.id,
    username: normalizeUsername(profile.username),
    name: sanitizeDisplayName(profile.displayName || profile.name),
    displayName: sanitizeDisplayName(profile.displayName || profile.name),
    provider: 'account',
  };
  safeStorageSetItem(PLAYER_SESSION_STORAGE_KEY, JSON.stringify(safeSession));
}

export function clearStoredPlayerSession(): void {
  safeStorageRemoveItem(PLAYER_SESSION_STORAGE_KEY);
}

function loadLocalAccountsCache(): PlayerAccountRow[] {
  return safeReadStorageJson<PlayerAccountRow[]>(
    LOCAL_ACCOUNTS_STORAGE_KEY,
    [],
    (val): val is PlayerAccountRow[] => Array.isArray(val)
  );
}

function saveLocalAccountCache(row: PlayerAccountRow): void {
  const existing = loadLocalAccountsCache().filter((a) => a.username !== row.username);
  safeStorageSetItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify([row, ...existing].slice(0, 50)));
}

function generateAccountId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const rand = bytesToHex(generateSaltBytes(12));
  return `acc-${Date.now().toString(36)}-${rand}`;
}

export function rowToUserProfile(row: Pick<PlayerAccountRow, 'id' | 'username' | 'display_name'>): UserProfile {
  const displayName = sanitizeDisplayName(row.display_name) || row.username;
  return {
    id: row.id,
    username: normalizeUsername(row.username),
    name: displayName,
    displayName,
    provider: 'account',
  };
}

// ============================================================================
// CORE REGISTER & LOGIN FLOWS (SUPABASE `public.player_accounts` + FALLBACK)
// ============================================================================

export async function registerPlayerAccountWithAdapter(
  input: { username: string; password: string; displayName: string },
  adapter: PlayerAccountsDbAdapter,
  persistSession = true
): Promise<AuthActionResult> {
  const validation = validateRegistrationInput(input);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const { username, displayName } = validation;
  const passwordHash = await hashPassword(input.password);
  const newId = generateAccountId();

  // 1) Check Supabase for existing username (with safe timeout)
  const lookup = await withSafeTimeout(
    adapter.findByUsername(username),
    5000,
    { row: null, error: { code: 'TIMEOUT', message: 'Bağlantı zaman aşımına uğradı' } },
    'player_accounts.findByUsername'
  );

  if (!lookup.error && lookup.row) {
    return {
      ok: false,
      error: 'Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı seçin.',
    };
  }

  // 2) Try inserting into Supabase `public.player_accounts`
  if (!lookup.error) {
    const created = await withSafeTimeout(
      adapter.createAccount({
        id: newId,
        username,
        password_hash: passwordHash,
        display_name: displayName,
      }),
      5000,
      { row: null, error: { code: 'TIMEOUT', message: 'Kayıt zaman aşımına uğradı' } },
      'player_accounts.createAccount'
    );

    if (!created.error && created.row) {
      const profile = rowToUserProfile(created.row);
      saveLocalAccountCache(created.row);
      if (persistSession) saveStoredPlayerSession(profile);
      return { ok: true, user: profile, source: 'supabase' };
    }

    const errCode = String(created.error?.code ?? '');
    const errMsg = String(created.error?.message ?? '').toLowerCase();
    if (errCode === '23505' || errMsg.includes('duplicate') || errMsg.includes('unique')) {
      return {
        ok: false,
        error: 'Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı seçin.',
      };
    }

    console.warn('[Auth] Supabase player_accounts kaydı başarısız, yerel hesap deposuna düşülüyor:', created.error);
  } else {
    console.warn('[Auth] Supabase player_accounts erişilemiyor, yerel hesap deposu kullanılıyor:', lookup.error);
  }

  // 3) Offline / fallback local store (never crashes mobile or preview if Supabase is unreachable)
  const localAccounts = loadLocalAccountsCache();
  if (localAccounts.some((a) => normalizeUsername(a.username) === username)) {
    return {
      ok: false,
      error: 'Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı seçin.',
    };
  }

  const localRow: PlayerAccountRow = {
    id: newId,
    username,
    password_hash: passwordHash,
    display_name: displayName,
    created_at: new Date().toISOString(),
  };
  saveLocalAccountCache(localRow);
  const profile = rowToUserProfile(localRow);
  if (persistSession) saveStoredPlayerSession(profile);
  return { ok: true, user: profile, source: 'local' };
}

export async function loginPlayerAccountWithAdapter(
  input: { username: string; password: string },
  adapter: PlayerAccountsDbAdapter,
  persistSession = true
): Promise<AuthActionResult> {
  const validation = validateLoginInput(input);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const { username } = validation;

  // 1) Query Supabase `public.player_accounts`
  const lookup = await withSafeTimeout(
    adapter.findByUsername(username),
    5000,
    { row: null, error: { code: 'TIMEOUT', message: 'Bağlantı zaman aşımına uğradı' } },
    'player_accounts.loginLookup'
  );

  if (!lookup.error) {
    if (lookup.row) {
      const valid = await verifyPassword(input.password, lookup.row.password_hash);
      if (!valid) {
        return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
      }
      const profile = rowToUserProfile(lookup.row);
      saveLocalAccountCache(lookup.row);
      if (persistSession) saveStoredPlayerSession(profile);
      return { ok: true, user: profile, source: 'supabase' };
    }

    // Also check local cache in case account was created while offline
    const localRow = loadLocalAccountsCache().find(
      (a) => normalizeUsername(a.username) === username
    );
    if (localRow) {
      const valid = await verifyPassword(input.password, localRow.password_hash);
      if (!valid) {
        return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
      }
      const profile = rowToUserProfile(localRow);
      if (persistSession) saveStoredPlayerSession(profile);
      return { ok: true, user: profile, source: 'local' };
    }

    return {
      ok: false,
      error: 'Bu kullanıcı adına ait bir hesap bulunamadı. Önce yeni hesap oluşturun.',
    };
  }

  // 2) Offline / Supabase unreachable -> check local hashed accounts cache
  console.warn('[Auth] Supabase giriş sorgusu başarısız, yerel hesap deposu kontrol ediliyor:', lookup.error);
  const localRow = loadLocalAccountsCache().find(
    (a) => normalizeUsername(a.username) === username
  );
  if (!localRow) {
    return {
      ok: false,
      error: 'Hesap doğrulanamadı. Kullanıcı adını kontrol edin veya yeni hesap oluşturun.',
    };
  }
  const valid = await verifyPassword(input.password, localRow.password_hash);
  if (!valid) {
    return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
  }
  const profile = rowToUserProfile(localRow);
  if (persistSession) saveStoredPlayerSession(profile);
  return { ok: true, user: profile, source: 'local' };
}
