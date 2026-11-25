/**
 * Startup resilience & safe storage utilities for Android WebView and desktop browsers.
 * Guarantees that corrupt localStorage JSON or slow/failing Supabase requests can never
 * freeze the splash screen or crash app initialization.
 */

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return fallback;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    if (typeof fallback === 'object' && fallback !== null) {
      if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        return fallback;
      }
      if (!Array.isArray(fallback) && (typeof parsed !== 'object' || Array.isArray(parsed))) {
        return fallback;
      }
    }
    return parsed as T;
  } catch (err) {
    console.warn('[SafeStorage] Bozuk JSON verisi yoksayıldı, varsayılan kullanılıyor:', err);
    return fallback;
  }
}

export function safeStorageGetItem(
  key: string,
  storage?: Pick<Storage, 'getItem'> | null
): string | null {
  try {
    const target =
      storage !== undefined
        ? storage
        : typeof window !== 'undefined'
        ? window.localStorage
        : null;
    if (!target) return null;
    return target.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] "${key}" okunamadı:`, err);
    return null;
  }
}

export function safeStorageSetItem(
  key: string,
  value: string,
  storage?: Pick<Storage, 'setItem'> | null
): boolean {
  try {
    const target =
      storage !== undefined
        ? storage
        : typeof window !== 'undefined'
        ? window.localStorage
        : null;
    if (!target) return false;
    target.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] "${key}" yazılamadı:`, err);
    return false;
  }
}

export function safeReadStorageJson<T>(
  key: string,
  fallback: T,
  validator?: (value: unknown) => value is T,
  storage?: Pick<Storage, 'getItem'> | null
): T {
  const raw = safeStorageGetItem(key, storage);
  if (raw === null || raw.trim().length === 0) {
    return fallback;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validator) {
      if (validator(parsed)) {
        return parsed;
      }
      console.warn(`[SafeStorage] "${key}" şeması uyumsuz, varsayılan değer kullanılıyor.`);
      return fallback;
    }
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.warn(`[SafeStorage] "${key}" bozuk JSON içeriyor, varsayılan değerle devam ediliyor:`, err);
    return fallback;
  }
}

/**
 * Runs an async operation with a hard timeout and complete try/catch protection.
 * Never rejects — logs silently to console on error/timeout and returns `fallback`.
 */
export async function withSafeTimeout<T>(
  task: PromiseLike<T> | (() => PromiseLike<T>),
  timeoutMs: number,
  fallback: T,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const promise = typeof task === 'function' ? Promise.resolve().then(() => task()) : Promise.resolve(task);
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`[SafeStartup] ${label} zaman aşımına uğradı (${timeoutMs}ms); yerel modda devam ediliyor.`);
        resolve(fallback);
      }, Math.max(100, timeoutMs));
    });

    const guardedTask = promise.catch((err) => {
      console.warn(`[SafeStartup] ${label} hata verdi; yerel modda devam ediliyor:`, err);
      return fallback;
    });

    return await Promise.race([guardedTask, timeoutPromise]);
  } catch (err) {
    console.warn(`[SafeStartup] ${label} başlatılamadı; yerel modda devam ediliyor:`, err);
    return fallback;
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

/**
 * Schedules a non-blocking background startup task off the critical UI render path.
 * Catches both synchronous exceptions and rejected promises silently to console.
 */
export function runInBackground(
  task: () => void | Promise<unknown>,
  label: string,
  delayMs = 0
): () => void {
  let cancelled = false;
  const timer = setTimeout(() => {
    if (cancelled) return;
    try {
      const result = task();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((err) => {
          console.warn(`[BackgroundSync] ${label} arka plan hatası:`, err);
        });
      }
    } catch (err) {
      console.warn(`[BackgroundSync] ${label} senkron hata:`, err);
    }
  }, Math.max(0, delayMs));

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/**
 * Safe WebStorage adapter for Supabase Auth on restricted Android WebViews.
 * Falls back to an in-memory map whenever window.localStorage throws.
 */
export function createSafeWebStorageAdapter() {
  const memoryFallback = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // fallback to memory
      }
      return memoryFallback.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      memoryFallback.set(key, value);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // keep in memory fallback
      }
    },
    removeItem(key: string): void {
      memoryFallback.delete(key);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    },
  };
}
