import type { OtaCheckResult, OtaVersionManifest } from '../types/game';

export const APP_VERSION = '1.2.0';
export const APP_BUILD_DATE = '2026-11-24';

export function compareSemver(current: string, remote: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isNaN(n) ? 0 : n;
      });

  const a = parse(current);
  const b = parse(remote);
  const len = Math.max(a.length, b.length, 3);

  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (bv > av) return 1; // remote is newer
    if (bv < av) return -1; // current is newer
  }
  return 0;
}

export async function checkForOtaUpdate(
  currentVersion = APP_VERSION,
  manifestUrl = './version.json'
): Promise<OtaCheckResult> {
  const checkedAt = Date.now();
  try {
    const separator = manifestUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${manifestUrl}${separator}t=${checkedAt}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        remoteManifest: null,
        checkedAt,
        error: `Sürüm sunucusuna ulaşılamadı (HTTP ${res.status}).`,
      };
    }

    const data = (await res.json()) as Partial<OtaVersionManifest>;
    if (!data?.version || !Array.isArray(data.notes)) {
      return {
        hasUpdate: false,
        currentVersion,
        remoteManifest: null,
        checkedAt,
        error: 'Geçersiz sürüm bildirim formatı.',
      };
    }

    const remoteManifest: OtaVersionManifest = {
      version: data.version,
      buildDate: data.buildDate || APP_BUILD_DATE,
      mandatory: Boolean(data.mandatory),
      notes: data.notes,
    };

    const hasUpdate = compareSemver(currentVersion, remoteManifest.version) > 0;
    return {
      hasUpdate,
      currentVersion,
      remoteManifest,
      checkedAt,
    };
  } catch {
    return {
      hasUpdate: false,
      currentVersion,
      remoteManifest: null,
      checkedAt,
      error: 'Bağlantı sağlanamadı. Çevrimdışı yedek modda çalışıyorsunuz.',
    };
  }
}

export async function applyOtaUpdate(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore cache clear failures
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    // ignore SW unregister failures
  }

  const url = new URL(window.location.href);
  url.searchParams.set('ota', String(Date.now()));
  window.location.replace(url.toString());
}
