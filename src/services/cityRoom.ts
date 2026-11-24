import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { BusinessTypeId, OwnedBusiness, RemoteBusinessRecord } from '../types/game';
import { isValidBusinessType } from '../game/catalog';
import { getProvinceByPlate } from '../game/provinces81';
import { checkLocalWaterShield } from '../game/waterShield';

export type RoomSyncStatus = 'connecting' | 'live' | 'offline';

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

function normalizeRecord(row: Record<string, unknown>): RemoteBusinessRecord | null {
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
  valuation: number
): RemoteBusinessRecord {
  return {
    id: biz.id,
    owner_id: biz.ownerId,
    owner_name: biz.ownerName,
    city_plate: biz.cityPlate,
    city_name: biz.cityName,
    district: biz.districtName,
    business_name: biz.customName,
    business_type: biz.blueprintId,
    lat: biz.lat,
    lng: biz.lng,
    level: biz.level,
    hourly_income: hourlyIncome,
    valuation,
    created_at: new Date(biz.createdAt).toISOString(),
  };
}

export async function fetchCityBusinesses(
  cityPlate: number
): Promise<{ records: RemoteBusinessRecord[]; connected: boolean }> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(
        'id, owner_id, owner_name, city_plate, city_name, district, business_name, business_type, lat, lng, level, hourly_income, valuation, created_at'
      )
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
  try {
    const { error } = await supabase.from('businesses').upsert(record, { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Sunucu senkronizasyon hatası' };
  }
}

export async function updateBusinessInRoom(
  id: string,
  patch: Partial<Pick<RemoteBusinessRecord, 'owner_id' | 'owner_name' | 'level' | 'hourly_income' | 'valuation' | 'business_name'>>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('businesses').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Güncelleme hatası' };
  }
}

export async function removeBusinessFromRoom(id: string): Promise<{ ok: boolean }> {
  try {
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
