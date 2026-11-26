import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { withSafeTimeout } from '../lib/safeStartup';
import type { BusinessTypeId, OwnedBusiness, RemoteBusinessRecord } from '../types/game';
import { isValidBusinessType } from '../game/catalog';
import { getProvinceByPlate } from '../game/provinces81';
import { checkLocalWaterShield } from '../game/waterShield';

export type RoomSyncStatus = 'connecting' | 'live' | 'offline';

export interface WorldDbSyncSnapshot {
  records: RemoteBusinessRecord[];
  dbTotal: number;
  rivalCount: number;
  status: RoomSyncStatus;
  error: string | null;
  loading: boolean;
  lastSyncedAt: number | null;
}

const BROADCAST_CHANNEL_NAME = 'tmi-world-businesses-v1';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Runtime schema cache so optional alias columns (e.g. `name` if table uses `business_name`)
// are stripped automatically without repeating failed requests.
const missingBusinessesColumns = new Set<string>();

/**
 * Ensures any local business ID (including legacy `biz-...` strings) becomes a valid,
 * 100% deterministic RFC-4122 UUID so PostgreSQL `uuid` primary keys never reject it (`22P02`).
 */
export function ensureUuidForBusinessId(rawId: string): string {
  const clean = String(rawId ?? '').trim();
  if (UUID_REGEX.test(clean)) {
    return clean.toLowerCase();
  }
  const seed = clean || 'tmi-fallback-business';
  const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  for (let round = 0; round < 4; round += 1) {
    let h = words[round];
    for (let i = 0; i < seed.length; i += 1) {
      h = Math.imul(h ^ (seed.charCodeAt(i) + round * 31 + i), 16777619) >>> 0;
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    words[round] = (h ^ (h >>> 16)) >>> 0;
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 4; i += 1) {
    const w = words[i];
    bytes[i * 4] = (w >>> 24) & 0xff;
    bytes[i * 4 + 1] = (w >>> 16) & 0xff;
    bytes[i * 4 + 2] = (w >>> 8) & 0xff;
    bytes[i * 4 + 3] = w & 0xff;
  }
  // Set RFC-4122 version 4 and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
}

/**
 * Extracts missing column name from PostgREST PGRST204 or Postgres 42703 error messages.
 */
export function extractMissingColumnName(message: string): string | null {
  if (!message) return null;
  const pgrst = message.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
  if (pgrst?.[1]) return pgrst[1];
  const pgCol = message.match(/column (?:[a-zA-Z0-9_]+\.)?['"]?([a-zA-Z0-9_]+)['"]? does not exist/i);
  if (pgCol?.[1]) return pgCol[1];
  return null;
}

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
    holdingName:
      raw.toLocaleLowerCase('tr-TR').includes('holding') ||
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
  const incomingUuid = ensureUuidForBusinessId(incoming.id);
  const exists = list.some(
    (r) => r.id === incoming.id || ensureUuidForBusinessId(r.id) === incomingUuid
  );
  if (exists) {
    return list.map((r) =>
      r.id === incoming.id || ensureUuidForBusinessId(r.id) === incomingUuid ? incoming : r
    );
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
  const targetUuid = ensureUuidForBusinessId(id);
  if (!list.some((r) => r.id === id || ensureUuidForBusinessId(r.id) === targetUuid)) return list;
  return list.map((r) =>
    r.id === id || ensureUuidForBusinessId(r.id) === targetUuid ? { ...r, ...patch } : r
  );
}

/**
 * Idempotent delete reducer for incoming Supabase Realtime DELETE events.
 */
export function applyRealtimeBusinessDelete(
  list: RemoteBusinessRecord[],
  id: string
): RemoteBusinessRecord[] {
  const targetUuid = ensureUuidForBusinessId(id);
  if (!list.some((r) => r.id === id || ensureUuidForBusinessId(r.id) === targetUuid)) return list;
  return list.filter((r) => r.id !== id && ensureUuidForBusinessId(r.id) !== targetUuid);
}

/**
 * Computes exact live DB counts for the map status box ("DB Toplam: X | Rakip: Y").
 */
export function computeWorldDbStats(
  dbRecords: RemoteBusinessRecord[],
  currentUserId: string | undefined,
  ownIds: Set<string> = new Set()
): { dbTotal: number; rivalCount: number } {
  const normalizedUserId = (currentUserId ?? '').trim();
  const ownUuidSet = new Set<string>();
  for (const id of ownIds) {
    ownUuidSet.add(id);
    ownUuidSet.add(ensureUuidForBusinessId(id));
  }

  let rivalCount = 0;
  for (const rec of dbRecords) {
    if (!isRealPlayerBusiness(rec)) continue;
    const recOwner = String(rec.owner_id ?? '').trim();
    const recUuid = ensureUuidForBusinessId(rec.id);
    const isOwnByOwner = Boolean(normalizedUserId && recOwner === normalizedUserId);
    const isOwnById = ownUuidSet.has(rec.id) || ownUuidSet.has(recUuid);
    if (!isOwnByOwner && !isOwnById) {
      rivalCount += 1;
    }
  }

  return {
    dbTotal: dbRecords.length,
    rivalCount,
  };
}

/**
 * Combines nationwide real-player businesses with active city seed AI rivals,
 * excluding current player's own branches (by raw ID, UUID, or owner_id) and acquired rivals.
 */
export function mergeWorldAndSeedRivals(
  worldRecords: RemoteBusinessRecord[],
  seedCityRivals: RemoteBusinessRecord[],
  currentUserId: string | undefined,
  ownIds: Set<string>,
  acquiredRivalIds: Set<string>
): RemoteBusinessRecord[] {
  const byId = new Map<string, RemoteBusinessRecord>();
  const ownLookup = new Set<string>();
  for (const id of ownIds) {
    ownLookup.add(id);
    ownLookup.add(ensureUuidForBusinessId(id));
  }
  const acquiredLookup = new Set<string>();
  for (const id of acquiredRivalIds) {
    acquiredLookup.add(id);
    acquiredLookup.add(ensureUuidForBusinessId(id));
  }

  // 1) All real players across Turkey (`owner_id !== currentUserId`) always take priority
  const normalizedCurrentId = (currentUserId ?? '').trim();
  for (const rec of worldRecords) {
    const recOwnerId = String(rec.owner_id ?? '').trim();
    const recUuid = ensureUuidForBusinessId(rec.id);
    if (
      (normalizedCurrentId && recOwnerId === normalizedCurrentId) ||
      ownLookup.has(rec.id) ||
      ownLookup.has(recUuid) ||
      acquiredLookup.has(rec.id) ||
      acquiredLookup.has(recUuid)
    ) {
      continue;
    }
    byId.set(rec.id, rec);
  }

  // 2) Keep active-city AI seed rivals available alongside real players
  for (const seed of seedCityRivals) {
    if (ownLookup.has(seed.id) || acquiredLookup.has(seed.id) || byId.has(seed.id)) {
      continue;
    }
    byId.set(seed.id, seed);
  }

  return Array.from(byId.values());
}

/**
 * Finds local player businesses that are missing from `public.businesses` or have outdated level/owner/name.
 */
export function findUnsyncedLocalBusinesses(
  localRecords: RemoteBusinessRecord[],
  remoteRecords: RemoteBusinessRecord[]
): RemoteBusinessRecord[] {
  const remoteByKey = new Map<string, RemoteBusinessRecord>();
  for (const r of remoteRecords) {
    remoteByKey.set(r.id, r);
    remoteByKey.set(ensureUuidForBusinessId(r.id), r);
  }
  return localRecords.filter((local) => {
    const remote = remoteByKey.get(local.id) ?? remoteByKey.get(ensureUuidForBusinessId(local.id));
    if (!remote) return true;
    return (
      remote.owner_id !== local.owner_id ||
      remote.owner_name !== local.owner_name ||
      remote.level !== local.level ||
      remote.business_name !== local.business_name ||
      Math.abs(remote.hourly_income - local.hourly_income) > 50
    );
  });
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
      company_name: profile.ownerName,
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

export function formatSupabaseError(err: unknown, fallback = 'Supabase bağlantı hatası'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const obj = err as { message?: string; code?: string; status?: number; details?: string };
    const parts: string[] = [];
    if (obj.code) parts.push(`[${obj.code}]`);
    else if (obj.status) parts.push(`[HTTP ${obj.status}]`);
    if (obj.message) parts.push(obj.message);
    if (obj.details && !obj.message?.includes(obj.details)) parts.push(obj.details);
    const joined = parts.join(' ').trim();
    if (joined) return joined.slice(0, 180);
  }
  return fallback;
}

export function normalizeRecord(row: Record<string, unknown>): RemoteBusinessRecord | null {
  const id = String(row.id ?? '').trim();
  const rawLat = row.lat ?? row.latitude;
  const rawLng = row.lng ?? row.longitude;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!id || rawLat === undefined || rawLat === null || rawLng === undefined || rawLng === null) {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const rawType = String(row.business_type ?? row.sector ?? row.type ?? 'kafe');
  const businessType = isValidBusinessType(rawType) ? rawType : 'kafe';

  const rawPlate = Number(row.city_plate ?? row.plate ?? 34);
  const safePlate = Number.isFinite(rawPlate) && rawPlate >= 1 && rawPlate <= 81 ? rawPlate : 34;
  const prov = getProvinceByPlate(safePlate);

  const rawOwnerName = String(
    row.owner_name ?? row.player_name ?? row.company_name ?? row.holding_name ?? 'Rakip Oyuncu'
  ).trim();
  const separateHolding = String(row.company_name ?? row.holding_name ?? row.owner_holding ?? '').trim();
  const ownerName = separateHolding
    ? formatOwnerDisplayName(rawOwnerName, separateHolding)
    : rawOwnerName || 'Rakip Oyuncu';

  const hourly =
    Number(row.hourly_revenue ?? row.hourly_income ?? row.revenue_per_hour ?? 3600) || 3600;

  return {
    id,
    owner_id: String(row.owner_id ?? row.user_id ?? row.player_id ?? 'unknown').trim(),
    owner_name: ownerName,
    company_name: separateHolding || undefined,
    city_plate: safePlate,
    city_name: String(row.city_name ?? prov.name),
    district: String(row.district ?? ''),
    business_name: String(row.name ?? row.business_name ?? 'İşletme'),
    business_type: businessType,
    lat,
    lng,
    level: Math.max(1, Number(row.level ?? 1) || 1),
    hourly_income: hourly,
    valuation: Number(row.valuation ?? row.market_value ?? Math.max(60000, hourly * 24)) || 60000,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export function ownedToRemoteRecord(
  biz: OwnedBusiness,
  hourlyIncome: number,
  valuation: number,
  holdingName?: string | null,
  overrideOwner?: { id: string; name: string }
): RemoteBusinessRecord {
  const ownerId = (overrideOwner?.id || biz.ownerId || 'unknown-player').trim();
  const ownerBaseName = (overrideOwner?.name || biz.ownerName || 'Patron').trim();
  const cleanCompany = (holdingName ?? '').trim() || ownerBaseName;
  const safePlate = Number.isFinite(biz.cityPlate)
    ? Math.max(1, Math.min(81, Math.round(biz.cityPlate)))
    : 34;
  const fallbackProv = getProvinceByPlate(safePlate);
  const safeHourly = Number.isFinite(hourlyIncome) ? Math.max(0, Math.round(hourlyIncome)) : 0;
  const safeValuation = Number.isFinite(valuation) ? Math.max(0, Math.round(valuation)) : 0;
  const safeLevel = Number.isFinite(biz.level) ? Math.max(1, Math.round(biz.level)) : 1;
  const safeLat = Number.isFinite(biz.lat) ? biz.lat : fallbackProv.lat;
  const safeLng = Number.isFinite(biz.lng) ? biz.lng : fallbackProv.lng;
  const safeCreatedAt = Number.isFinite(biz.createdAt) ? biz.createdAt : Date.now();
  const rawType = String(biz.blueprintId || 'kafe');
  const safeType = isValidBusinessType(rawType) ? rawType : 'kafe';
  return {
    id: ensureUuidForBusinessId(biz.id),
    owner_id: ownerId,
    owner_name: formatOwnerDisplayName(ownerBaseName, holdingName),
    company_name: cleanCompany,
    city_plate: safePlate,
    city_name: (biz.cityName ?? '').trim() || fallbackProv.name,
    district: (biz.districtName ?? '').trim() || fallbackProv.districts[0] || fallbackProv.name,
    business_name: (biz.customName ?? '').trim() || 'İşletme',
    business_type: safeType,
    lat: safeLat,
    lng: safeLng,
    level: safeLevel,
    hourly_income: safeHourly,
    valuation: safeValuation,
    created_at: new Date(safeCreatedAt).toISOString(),
  };
}

/**
 * Builds the canonical `public.businesses` upsert row including all required fields:
 * `id, owner_id, owner_name, company_name, name, sector, level, hourly_revenue, lat, lng`
 * alongside compatible columns (`business_name, business_type, hourly_income, valuation, city_plate, city_name, district`).
 */
export function buildBusinessesUpsertPayload(rec: RemoteBusinessRecord): Record<string, unknown> {
  const parsed = parseOwnerAndHolding(rec.owner_name, rec.company_name);
  const safeHourly = Number.isFinite(rec.hourly_income)
    ? Math.max(0, Math.round(rec.hourly_income))
    : 0;
  const safeValuation = Number.isFinite(rec.valuation)
    ? Math.max(0, Math.round(rec.valuation))
    : 0;
  const safeLevel = Number.isFinite(rec.level) ? Math.max(1, Math.round(rec.level)) : 1;
  const safePlate = Number.isFinite(rec.city_plate)
    ? Math.max(1, Math.min(81, Math.round(rec.city_plate)))
    : 34;
  const fallbackProv = getProvinceByPlate(safePlate);
  const safeBusinessName = (rec.business_name ?? '').trim() || 'İşletme';
  const safeSector = (rec.business_type ?? '').trim() || 'kafe';
  const safeCityName = (rec.city_name ?? '').trim() || fallbackProv.name;
  const safeDistrict = (rec.district ?? '').trim() || safeCityName;
  const safeLat = Number.isFinite(rec.lat) ? rec.lat : fallbackProv.lat;
  const safeLng = Number.isFinite(rec.lng) ? rec.lng : fallbackProv.lng;
  return {
    id: ensureUuidForBusinessId(rec.id),
    owner_id: (rec.owner_id ?? '').trim() || 'unknown-player',
    owner_name: parsed.playerName || 'Patron',
    company_name: rec.company_name?.trim() || parsed.holdingName || parsed.playerName || 'Girişim',
    name: safeBusinessName,
    business_name: safeBusinessName,
    sector: safeSector,
    business_type: safeSector,
    level: safeLevel,
    hourly_revenue: safeHourly,
    hourly_income: safeHourly,
    valuation: safeValuation,
    city_plate: safePlate,
    city_name: safeCityName,
    district: safeDistrict,
    lat: safeLat,
    lng: safeLng,
  };
}

function stripMissingColumnsFromRow(
  row: Record<string, unknown>,
  missingSet: ReadonlySet<string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (missingSet.has(k)) continue;
    out[k] = v;
  }
  // If `lat`/`lng` were reported missing, automatically map to `latitude`/`longitude`
  if ((missingSet.has('lat') || missingSet.has('lng')) && !missingSet.has('latitude')) {
    out.latitude = row.lat;
    out.longitude = row.lng;
  }
  return out;
}

async function upsertBusinessesWithSchemaFallback(
  records: RemoteBusinessRecord[]
): Promise<{ ok: boolean; error?: string }> {
  const baseRows = records.map(buildBusinessesUpsertPayload);
  let attempts = 0;

  while (attempts < 8) {
    attempts += 1;
    const rows = baseRows.map((r) => stripMissingColumnsFromRow(r, missingBusinessesColumns));
    const { error } = await supabase.from('businesses').upsert(rows, { onConflict: 'id' });
    if (!error) {
      return { ok: true };
    }

    const missingCol = extractMissingColumnName(error.message ?? '');
    if (missingCol && !missingBusinessesColumns.has(missingCol)) {
      missingBusinessesColumns.add(missingCol);
      continue;
    }

    const msg = formatSupabaseError(error, 'İşletme Supabase veritabanına kaydedilemedi');
    console.warn('[Supabase businesses UPSERT hatası]', error);
    return { ok: false, error: msg };
  }

  return { ok: false, error: 'Supabase tablo şeması uyumsuz (businesses).' };
}

/**
 * Fetches ALL active player businesses across all 81 provinces via `supabase.from('businesses').select('*')`
 * with ZERO city filtering.
 */
export async function fetchAllWorldBusinesses(): Promise<{
  records: RemoteBusinessRecord[];
  rawTotal: number;
  connected: boolean;
  error?: string;
}> {
  return withSafeTimeout(
    async () => {
      try {
        const { data, error } = await supabase.from('businesses').select('*');

        if (error) {
          const msg = formatSupabaseError(error, 'Supabase işletmeler okunamadı');
          console.warn('[Supabase businesses SELECT hatası]', error);
          return { records: [], rawTotal: 0, connected: false, error: msg };
        }

        if (!Array.isArray(data)) {
          return { records: [], rawTotal: 0, connected: true };
        }

        const records = data
          .map((row) => normalizeRecord(row as Record<string, unknown>))
          .filter((item): item is RemoteBusinessRecord => item !== null);

        return { records, rawTotal: data.length, connected: true };
      } catch (err) {
        const msg = formatSupabaseError(err, 'Supabase işletmeler okunamadı');
        console.warn('[Supabase businesses SELECT istisnası]', err);
        return { records: [], rawTotal: 0, connected: false, error: msg };
      }
    },
    6500,
    { records: [], rawTotal: 0, connected: false, error: 'Supabase yanıt süresi aşıldı.' },
    'fetchAllWorldBusinesses'
  );
}

export async function fetchCityBusinesses(
  cityPlate: number
): Promise<{ records: RemoteBusinessRecord[]; connected: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('city_plate', cityPlate)
      .limit(250);

    if (error) {
      const msg = formatSupabaseError(error, 'Şehir işletmeleri okunamadı');
      console.error('[Supabase businesses city SELECT hatası]', error);
      return { records: [], connected: false, error: msg };
    }

    if (!Array.isArray(data)) {
      return { records: [], connected: true };
    }

    const records = data
      .map((row) => normalizeRecord(row as Record<string, unknown>))
      .filter((item): item is RemoteBusinessRecord => item !== null);

    return { records, connected: true };
  } catch (err) {
    const msg = formatSupabaseError(err, 'Şehir işletmeleri okunamadı');
    console.error('[Supabase businesses city SELECT istisnası]', err);
    return { records: [], connected: false, error: msg };
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
  onError?: (errorMessage: string) => void;
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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          callbacks.onStatus?.('live');
          if (hasSubscribedOnce) {
            callbacks.onReconnect?.();
          }
          hasSubscribedOnce = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          callbacks.onStatus?.('offline');
          if (err) {
            const msg = formatSupabaseError(err, `Realtime kanal hatası (${status})`);
            console.warn('[Supabase Realtime businesses hatası]', status, err);
            callbacks.onError?.(msg);
          }
        }
      });
  } catch (err) {
    callbacks.onStatus?.('offline');
    const msg = formatSupabaseError(err, 'Realtime bağlantısı kurulamadı');
    console.warn('[Supabase Realtime başlatma hatası]', err);
    callbacks.onError?.(msg);
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

export async function publishBusinessToRoom(
  record: RemoteBusinessRecord
): Promise<{ ok: boolean; error?: string }> {
  const normalizedRec: RemoteBusinessRecord = {
    ...record,
    id: ensureUuidForBusinessId(record.id),
  };
  postLocalBusinessBroadcast({ type: 'upsert', record: normalizedRec });
  return withSafeTimeout(
    () => upsertBusinessesWithSchemaFallback([normalizedRec]),
    6500,
    { ok: false, error: 'Supabase kayıt zaman aşımına uğradı.' },
    'publishBusinessToRoom'
  );
}

/**
 * Batch-syncs a player's active local portfolio to `public.businesses` on startup or map load.
 */
export async function syncPlayerBusinessesToWorld(
  records: RemoteBusinessRecord[]
): Promise<{ ok: boolean; syncedCount: number; error?: string }> {
  if (records.length === 0) return { ok: true, syncedCount: 0 };
  const normalized = records.map((r) => ({ ...r, id: ensureUuidForBusinessId(r.id) }));
  for (const rec of normalized) {
    postLocalBusinessBroadcast({ type: 'upsert', record: rec });
  }
  return withSafeTimeout(
    async () => {
      const res = await upsertBusinessesWithSchemaFallback(normalized);
      return res.ok
        ? { ok: true, syncedCount: normalized.length }
        : { ok: false, syncedCount: 0, error: res.error };
    },
    6500,
    { ok: false, syncedCount: 0, error: 'Toplu işletme senkronizasyonu zaman aşımına uğradı.' },
    'syncPlayerBusinessesToWorld'
  );
}

export async function updateBusinessInRoom(
  id: string,
  patch: Partial<
    Pick<
      RemoteBusinessRecord,
      'owner_id' | 'owner_name' | 'company_name' | 'level' | 'hourly_income' | 'valuation' | 'business_name'
    >
  >
): Promise<{ ok: boolean; error?: string }> {
  const uuidId = ensureUuidForBusinessId(id);
  postLocalBusinessBroadcast({ type: 'patch', id: uuidId, patch });

  const dbPatch: Record<string, unknown> = {};
  if (patch.owner_id !== undefined) dbPatch.owner_id = patch.owner_id;
  if (patch.owner_name !== undefined) {
    const parsed = parseOwnerAndHolding(patch.owner_name, patch.company_name);
    dbPatch.owner_name = parsed.playerName;
    dbPatch.company_name = patch.company_name?.trim() || parsed.holdingName;
  } else if (patch.company_name !== undefined) {
    dbPatch.company_name = patch.company_name;
  }
  if (patch.level !== undefined) dbPatch.level = patch.level;
  if (patch.hourly_income !== undefined) {
    const rounded = Math.max(0, Math.round(patch.hourly_income));
    dbPatch.hourly_income = rounded;
    dbPatch.hourly_revenue = rounded;
  }
  if (patch.valuation !== undefined) dbPatch.valuation = Math.max(0, Math.round(patch.valuation));
  if (patch.business_name !== undefined) {
    dbPatch.business_name = patch.business_name;
    dbPatch.name = patch.business_name;
  }

  try {
    let attempts = 0;
    while (attempts < 6) {
      attempts += 1;
      const filtered = stripMissingColumnsFromRow(dbPatch, missingBusinessesColumns);
      if (Object.keys(filtered).length === 0) return { ok: true };
      const { error } = await supabase.from('businesses').update(filtered).eq('id', uuidId);
      if (!error) return { ok: true };
      const missingCol = extractMissingColumnName(error.message ?? '');
      if (missingCol && !missingBusinessesColumns.has(missingCol)) {
        missingBusinessesColumns.add(missingCol);
        continue;
      }
      const msg = formatSupabaseError(error, 'İşletme Supabase üzerinde güncellenemedi');
      console.warn('[Supabase businesses UPDATE hatası]', error);
      return { ok: false, error: msg };
    }
    return { ok: false, error: 'İşletme güncellenemedi.' };
  } catch (err) {
    const msg = formatSupabaseError(err, 'İşletme Supabase üzerinde güncellenemedi');
    console.warn('[Supabase businesses UPDATE istisnası]', err);
    return { ok: false, error: msg };
  }
}

export async function removeBusinessFromRoom(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const uuidId = ensureUuidForBusinessId(id);
  postLocalBusinessBroadcast({ type: 'delete', id: uuidId });
  try {
    const { error } = await supabase.from('businesses').delete().eq('id', uuidId);
    if (error) {
      const msg = formatSupabaseError(error, 'İşletme Supabase üzerinden silinemedi');
      console.warn('[Supabase businesses DELETE hatası]', error);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    const msg = formatSupabaseError(err, 'İşletme Supabase üzerinden silinemedi');
    console.warn('[Supabase businesses DELETE istisnası]', err);
    return { ok: false, error: msg };
  }
}
