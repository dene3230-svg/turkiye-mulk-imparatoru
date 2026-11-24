import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { OwnedBusiness, RemoteBusinessRecord } from '../types/game';
import { isValidBusinessType } from '../game/catalog';

export type RoomSyncStatus = 'connecting' | 'live' | 'offline';

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
