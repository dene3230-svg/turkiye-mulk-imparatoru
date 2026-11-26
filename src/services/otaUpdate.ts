import type { OtaCheckResult, OtaVersionManifest } from '../types/game';

export const APP_VERSION = '1.4.5';
export const APP_BUILD_DATE = '2026-11-26';

function parseSemverParts(v: string): { nums: number[]; fixRank: number } {
  const cleaned = v.trim().replace(/^v/i, '');
  const [corePart, ...suffixParts] = cleaned.split('-');
  const suffix = suffixParts.join('-').toLowerCase();

  const nums = corePart.split('.').map((part) => {
    const n = parseInt(part, 10);
    return Number.isNaN(n) ? 0 : n;
  });

  // Treat -fix / -hotfix / -patch suffixes as newer than the bare base version (e.g., 1.4.0-fix > 1.4.0)
  let fixRank = 0;
  if (suffix) {
    const fixMatch = suffix.match(/^(?:fix|hotfix|patch)(\d*)$/);
    if (fixMatch) {
      fixRank = Math.max(1, fixMatch[1] ? parseInt(fixMatch[1], 10) : 1);
    }
  }

  return { nums, fixRank };
}

export function compareSemver(current: string, remote: string): number {
  const a = parseSemverParts(current);
  const b = parseSemverParts(remote);
  const len = Math.max(a.nums.length, b.nums.length, 3);

  for (let i = 0; i < len; i += 1) {
    const av = a.nums[i] ?? 0;
    const bv = b.nums[i] ?? 0;
    if (bv > av) return 1; // remote is newer
    if (bv < av) return -1; // current is newer
  }

  if (b.fixRank > a.fixRank) return 1;
  if (b.fixRank < a.fixRank) return -1;
  return 0;
}

export async function checkForOtaUpdate(
  currentVersion = APP_VERSION,
  manifestUrl = './version.json'
): Promise<OtaCheckResult> {
  const checkedAt = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
  try {
    const separator = manifestUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${manifestUrl}${separator}t=${checkedAt}`, {
      cache: 'no-store',
      signal: controller?.signal,
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
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
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
