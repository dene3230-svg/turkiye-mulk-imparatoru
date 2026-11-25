import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { BusinessTypeId, OwnedBusiness, RemoteBusinessRecord } from '../types/game';
import { isValidBusinessType } from '../game/catalog';
import { getProvinceByPlate } from '../game/provinces81';
import { checkLocalWaterShield } from '../game/waterShield';

export type RoomSyncStatus = 'connecting' | 'live' | 'offline';

const BROADCAST_CHANNEL_NAME = 'tmi-world-businesses-v1';

interface BroadcastBusinessEvent {
  type: 'upsert' | 'patch' | 'delete';
  record?: RemoteBusinessRecord;
  id?: string;
  patch?: Partial<RemoteBusinessRecord>;
}

function postLocalBusinessBroadcast(event: BroadcastBusinessEvent): void {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    ch.postMessage(event);
    ch.close();
  } catch {
    // ignore environments where BroadcastChannel is restricted
  }
}

const SEED_RIVAL_PROFILES: Array<{
  ownerId: string;
  ownerName: string;
  businessType: BusinessTypeId;
  suffix: string;
  level: number;
  hourlyIncome: number;
  valuation: number;
  offsetCandidates: Array<[number, number]>;
}> = [
  {
    ownerId: 'ai-rival-demirhan',
    ownerName: 'Demirhan Holding A.Ş.',
    businessType: 'avm',
    suffix: 'Plaza AVM',
    level: 4,
    hourlyIncome: 195_000,
    valuation: 4_850_000,
    offsetCandidates: [
      [0.011, 0.014],
      [-0.012, 0.012],
      [0.014, -0.011],
      [0.008, 0.009],
    ],
  },
  {
    ownerId: 'ai-rival-anadolu',
    ownerName: 'Anadolu Sanayi Grubu',
    businessType: 'supermarket',
    suffix: 'Merkez Market',
    level: 3,
    hourlyIncome: 68_000,
    valuation: 1_420_000,
    offsetCandidates: [
      [-0.01, -0.013],
      [0.013, -0.012],
      [-0.013, 0.01],
      [-0.008, -0.008],
    ],
  },
  {
    ownerId: 'ai-rival-ege',
    ownerName: 'Ege Yatırım & Turizm',
    businessType: 'otel',
    suffix: 'Grand Otel',
    level: 3,
    hourlyIncome: 112_000,
    valuation: 2_650_000,
    offsetCandidates: [
      [0.009, -0.014],
      [-0.011, 0.014],
      [0.015, 0.008],
      [-0.009, 0.008],
    ],
  },
];

export function isRealPlayerBusiness(
  rec: Pick<RemoteBusinessRecord, 'id' | 'owner_id'>
): boolean {
  return !rec.owner_id.startsWith('ai-rival-') && !rec.id.startsWith('seed-rival-');
}

export function formatOwnerDisplayName(
  playerName: string,
  holdingName?: string | null
): string {
  const cleanPlayer = playerName.trim() || 'Yatırımcı';
  const cleanHolding = (holdingName ?? '').trim();
  if (!cleanHolding) return cleanPlayer;
  if (
    cleanPlayer.toLocaleLowerCase('tr-TR').includes(cleanHolding.toLocaleLowerCase('tr-TR'))
  ) {
    return cleanPlayer;
  }
  return `${cleanPlayer} · ${cleanHolding}`;
}

export function parseOwnerAndHolding(
  ownerName: string,
  explicitHoldingName?: string | null
): { playerName: string; holdingName: string } {
  const raw = (ownerName ?? '').trim() || 'Rakip Yatırımcı';
  if (explicitHoldingName && explicitHoldingName.trim().length > 0) {
    const firstPart = raw.split(' · ')[0]?.trim() || raw;
    return {
      playerName: firstPart,
      holdingName: explicitHoldingName.trim(),
    };
  }
  const parts = raw.split(' · ').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      playerName: parts[0],
      holdingName: parts.slice(1).join(' · '),
    };
  }
  return {
    playerName: raw,
    holdingName: raw.toLocaleLowerCase('tr-TR').includes('holding') ||
      raw.toLocaleLowerCase('tr-TR').includes('grubu') ||
      raw.toLocaleLowerCase('tr-TR').includes('a.ş.')
      ? raw
      : `${raw} Girişim`,
  };
}

/**
 * Idempotent upsert reducer for incoming Supabase Realtime INSERT/UPDATE events.
 */
export function applyRealtimeBusinessUpsert(
  list: RemoteBusinessRecord[],
  incoming: RemoteBusinessRecord
): RemoteBusinessRecord[] {
  const exists = list.some((r) => r.id === incoming.id);
  if (exists) {
    return list.map((r) => (r.id === incoming.id ? incoming : r));
  }
  return [incoming, ...list];
}

/**
 * Idempotent patch reducer for partial Realtime updates.
 */
export function applyRealtimeBusinessPatch(
  list: RemoteBusinessRecord[],
  id: string,
  patch: Partial<RemoteBusinessRecord>
): RemoteBusinessRecord[] {
  if (!list.some((r) => r.id === id)) return list;
  return list.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

/**
 * Idempotent delete reducer for incoming Supabase Realtime DELETE events.
 */
export function applyRealtimeBusinessDelete(
  list: RemoteBusinessRecord[],
  id: string
): RemoteBusinessRecord[] {
  if (!list.some((r) => r.id === id)) return list;
  return list.filter((r) => r.id !== id);
}

/**
 * Combines nationwide real-player businesses with active city seed AI rivals,
 * excluding current player's own branches and already acquired rivals.
 */
export function mergeWorldAndSeedRivals(
  worldRecords: RemoteBusinessRecord[],
  seedCityRivals: RemoteBusinessRecord[],
  currentUserId: string | undefined,
  ownIds: Set<string>,
  acquiredRivalIds: Set<string>
): RemoteBusinessRecord[] {
  const byId = new Map<string, RemoteBusinessRecord>();

  // 1) All real players across Turkey always take priority
  for (const rec of worldRecords) {
    if (rec.owner_id === currentUserId || ownIds.has(rec.id) || acquiredRivalIds.has(rec.id)) {
      continue;
    }
    byId.set(rec.id, rec);
  }

  // 2) Keep active-city AI seed rivals available alongside real players so the city map is never empty
  for (const seed of seedCityRivals) {
    if (ownIds.has(seed.id) || acquiredRivalIds.has(seed.id) || byId.has(seed.id)) {
      continue;
    }
    byId.set(seed.id, seed);
  }

  return Array.from(byId.values());
}

export function generateSeedCityRivals(cityPlate: number): RemoteBusinessRecord[] {
  const prov = getProvinceByPlate(cityPlate);
  return SEED_RIVAL_PROFILES.map((profile, idx) => {
    let lat = prov.lat + profile.offsetCandidates[0][0];
    let lng = prov.lng + profile.offsetCandidates[0][1];

    for (const [dLat, dLng] of profile.offsetCandidates) {
      const candidateLat = prov.lat + dLat;
      const candidateLng = prov.lng + dLng;
      if (!checkLocalWaterShield(candidateLat, candidateLng)) {
        lat = candidateLat;
        lng = candidateLng;
        break;
      }
    }

    const district = prov.districts[idx % prov.districts.length] || prov.name;
    return {
      id: `seed-rival-${cityPlate}-${idx + 1}`,
      owner_id: profile.ownerId,
      owner_name: profile.ownerName,
      city_plate: prov.plate,
      city_name: prov.name,
      district,
      business_name: `${district} ${profile.suffix}`,
      business_type: profile.businessType,
      lat,
      lng,
      level: profile.level,
      hourly_income: Math.round(profile.hourlyIncome * prov.landMultiplier),
      valuation: Math.round(profile.valuation * prov.landMultiplier),
      created_at: '2026-11-24T06:00:00.000Z',
    };
  });
}

export function normalizeRecord(row: Record<string, unknown>): RemoteBusinessRecord | null {
  const id = String(row.id ?? '');
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!id || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const rawType = String(row.business_type ?? 'kafe');
  const businessType = isValidBusinessType(rawType) ? rawType : 'kafe';

  return {
    id,
    owner_id: String(row.owner_id ?? 'unknown'),
    owner_name: String(row.owner_name ?? 'Rakip Yatırımcı'),
    city_plate: Number(row.city_plate ?? 34),
    city_name: String(row.city_name ?? 'İstanbul'),
    district: String(row.district ?? ''),
    business_name: String(row.business_name ?? 'İşletme'),
    business_type: businessType,
    lat,
    lng,
    level: Math.max(1, Number(row.level ?? 1)),
    hourly_income: Number(row.hourly_income ?? 3600),
    valuation: Number(row.valuation ?? 60000),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export function ownedToRemoteRecord(
  biz: OwnedBusiness,
  hourlyIncome: number,
  valuation: number,
  holdingName?: string | null
): RemoteBusinessRecord {
  return {
    id: biz.id,
    owner_id: biz.ownerId,
    owner_name: formatOwnerDisplayName(biz.ownerName, holdingName),
    city_plate: biz.cityPlate,
    city_name: biz.cityName,
    district: biz.districtName,
    business_name: biz.customName,
    business_type: biz.blueprintId,
    lat: biz.lat,
    lng: biz.lng,
    level: biz.level,
    hourly_income: Math.max(0, Math.round(hourlyIncome)),
    valuation: Math.max(0, Math.round(valuation)),
    created_at: new Date(biz.createdAt).toISOString(),
  };
}

const BUSINESS_SELECT_COLUMNS =
  'id, owner_id, owner_name, city_plate, city_name, district, business_name, business_type, lat, lng, level, hourly_income, valuation, created_at';

/**
 * Fetches active player businesses across ALL 81 Turkish provinces from `public.businesses`.
 */
export async function fetchAllWorldBusinesses(): Promise<{
  records: RemoteBusinessRecord[];
  connected: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(BUSINESS_SELECT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error || !Array.isArray(data)) {
      return { records: [], connected: false };
    }

    const records = data
      .map((row) => normalizeRecord(row as Record<string, unknown>))
      .filter((item): item is RemoteBusinessRecord => item !== null);

    return { records, connected: true };
  } catch {
    return { records: [], connected: false };
  }
}

export async function fetchCityBusinesses(
  cityPlate: number
): Promise<{ records: RemoteBusinessRecord[]; connected: boolean }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(BUSINESS_SELECT_COLUMNS)
      .eq('city_plate', cityPlate)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error || !Array.isArray(data)) {
      return { records: [], connected: false };
    }

    const records = data
      .map((row) => normalizeRecord(row as Record<string, unknown>))
      .filter((item): item is RemoteBusinessRecord => item !== null);

    return { records, connected: true };
  } catch {
    return { records: [], connected: false };
  }
}

/**
 * Subscribes nationwide to Supabase Realtime INSERT, UPDATE, and DELETE events on `public.businesses`,
 * plus same-origin BroadcastChannel relay for instantaneous multi-tab sync.
 */
export function subscribeToGlobalBusinesses(callbacks: {
  onInsert?: (record: RemoteBusinessRecord) => void;
  onUpdate?: (record: RemoteBusinessRecord) => void;
  onUpsert: (record: RemoteBusinessRecord) => void;
  onPatch?: (id: string, patch: Partial<RemoteBusinessRecord>) => void;
  onDelete: (id: string) => void;
  onStatus?: (status: RoomSyncStatus) => void;
  onReconnect?: () => void;
}): () => void {
  callbacks.onStatus?.('connecting');

  let channel: RealtimeChannel | null = null;
  let hasSubscribedOnce = false;
  let localBroadcast: BroadcastChannel | null = null;

  try {
    channel = supabase
      .channel('world-businesses-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          const rec = normalizeRecord((payload.new ?? {}) as Record<string, unknown>);
          if (!rec) return;
          callbacks.onUpsert(rec);
          callbacks.onInsert?.(rec);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          const rec = normalizeRecord((payload.new ?? {}) as Record<string, unknown>);
          if (!rec) return;
          callbacks.onUpsert(rec);
          callbacks.onUpdate?.(rec);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (oldId) callbacks.onDelete(String(oldId));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callbacks.onStatus?.('live');
          if (hasSubscribedOnce) {
            callbacks.onReconnect?.();
          }
          hasSubscribedOnce = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          callbacks.onStatus?.('offline');
        }
      });
  } catch {
    callbacks.onStatus?.('offline');
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      localBroadcast = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      localBroadcast.onmessage = (evt: MessageEvent<BroadcastBusinessEvent>) => {
        const msg = evt.data;
        if (!msg) return;
        if (msg.type === 'upsert' && msg.record) {
          const rec = normalizeRecord(msg.record as unknown as Record<string, unknown>);
          if (rec) {
            callbacks.onUpsert(rec);
            callbacks.onInsert?.(rec);
          }
        } else if (msg.type === 'patch' && msg.id && msg.patch) {
          callbacks.onPatch?.(msg.id, msg.patch);
        } else if (msg.type === 'delete' && msg.id) {
          callbacks.onDelete(msg.id);
        }
      };
    } catch {
      localBroadcast = null;
    }
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel).catch(() => {});
    }
    if (localBroadcast) {
      try {
        localBroadcast.close();
      } catch {
        // ignore close errors
      }
    }
  };
}

export function subscribeToCityRoom(
  cityPlate: number,
  callbacks: {
    onUpsert: (record: RemoteBusinessRecord) => void;
    onDelete: (id: string) => void;
    onStatus?: (status: RoomSyncStatus) => void;
  }
): () => void {
  callbacks.onStatus?.('connecting');

  let channel: RealtimeChannel | null = null;
  try {
    channel = supabase
      .channel(`city-room-${cityPlate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses',
          filter: `city_plate=eq.${cityPlate}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string } | null)?.id;
            if (oldId) callbacks.onDelete(String(oldId));
            return;
          }
          const rec = normalizeRecord((payload.new ?? {}) as Record<string, unknown>);
          if (rec) callbacks.onUpsert(rec);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callbacks.onStatus?.('live');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          callbacks.onStatus?.('offline');
        }
      });
  } catch {
    callbacks.onStatus?.('offline');
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel).catch(() => {});
    }
  };
}

export async function publishBusinessToRoom(
  record: RemoteBusinessRecord
): Promise<{ ok: boolean; error?: string }> {
  postLocalBusinessBroadcast({ type: 'upsert', record });
  try {
    const { error } = await supabase.from('businesses').upsert(record, { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sunucu senkronizasyon hatası',
    };
  }
}

/**
 * Batch-syncs a player's active portfolio to `public.businesses` on startup or reconnect.
 */
export async function syncPlayerBusinessesToWorld(
  records: RemoteBusinessRecord[]
): Promise<{ ok: boolean; syncedCount: number; error?: string }> {
  if (records.length === 0) return { ok: true, syncedCount: 0 };
  for (const rec of records) {
    postLocalBusinessBroadcast({ type: 'upsert', record: rec });
  }
  try {
    const { error } = await supabase.from('businesses').upsert(records, { onConflict: 'id' });
    if (error) return { ok: false, syncedCount: 0, error: error.message };
    return { ok: true, syncedCount: records.length };
  } catch (err) {
    return {
      ok: false,
      syncedCount: 0,
      error: err instanceof Error ? err.message : 'Portföy senkronizasyon hatası',
    };
  }
}

export async function updateBusinessInRoom(
  id: string,
  patch: Partial<
    Pick<
      RemoteBusinessRecord,
      'owner_id' | 'owner_name' | 'level' | 'hourly_income' | 'valuation' | 'business_name'
    >
  >
): Promise<{ ok: boolean; error?: string }> {
  postLocalBusinessBroadcast({ type: 'patch', id, patch });
  try {
    const { error } = await supabase.from('businesses').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Güncelleme hatası' };
  }
}

export async function removeBusinessFromRoom(id: string): Promise<{ ok: boolean }> {
  postLocalBusinessBroadcast({ type: 'delete', id });
  try {
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
