import type { EmpireState, MissionDef, StockQuote } from '../types/game';
import { isFactoryType, isParkingType } from './catalog';
import { calculateNetWorth, formatTL, getCompanyTier } from './economy';

export const ACTIVE_MISSION_SLOTS = 4;

/**
 * Evaluates current progress of any dynamic mission target type.
 */
export function evaluateDynamicMissionProgress(
  state: EmpireState,
  mission: MissionDef,
  now = Date.now(),
  stockQuotes?: StockQuote[]
): number {
  switch (mission.targetType) {
    case 'kafeCount':
      return state.businesses.filter((b) => b.blueprintId === 'kafe').length;
    case 'businessCount':
      return state.businesses.length;
    case 'cityCount':
      return new Set(state.businesses.map((b) => b.cityPlate)).size;
    case 'netWorth':
      return calculateNetWorth(state, now, stockQuotes);
    case 'maxLevel':
      return state.businesses.reduce((max, b) => Math.max(max, b.level), 0);
    case 'totalEarned':
      return Math.floor(state.totalEarnedLifetime);
    case 'staffTotal':
      return (
        state.businesses.reduce(
          (sum, b) => sum + Math.max(b.staffCount, (b.employees ?? []).length),
          0
        ) + (state.cityManagers?.length ?? 0)
      );
    case 'autoCollectManagerCount':
      return (state.cityManagers ?? []).filter(
        (m) => m.role === 'bolge_sorumlusu' || m.role === 'genel_mudur'
      ).length;
    case 'stockSharesTotal':
      return (state.stockPortfolio ?? []).reduce((sum, h) => sum + h.shares, 0);
    case 'creditScore':
      return Math.round(state.creditScore ?? 1100);
    case 'factoryCount':
      return state.businesses.filter((b) => isFactoryType(b.blueprintId)).length;
    case 'parkingCount':
      return state.businesses.filter((b) => isParkingType(b.blueprintId)).length;
    default:
      return 0;
  }
}

/**
 * Generates the initial 4 starter missions for a new empire.
 */
export function createInitialDynamicMissions(): MissionDef[] {
  return [
    {
      id: 'dyn-starter-kafe-1',
      title: 'İlk Kafeni Kur',
      description: 'Haritada kara üzerinde bir noktaya pin bırakarak ilk Kafeni aç.',
      rewardCash: 35_000,
      rewardXp: 120,
      targetType: 'kafeCount',
      targetValue: 1,
      tier: 1,
    },
    {
      id: 'dyn-starter-lvl-2',
      title: 'İşletmeni Seviye 2 Yap',
      description: 'Herhangi bir şubeni Seviye 2’ye yükselterek cirosunu artır.',
      rewardCash: 45_000,
      rewardXp: 150,
      targetType: 'maxLevel',
      targetValue: 2,
      tier: 1,
    },
    {
      id: 'dyn-starter-staff-1',
      title: '1–5 Yıldızlı Bir Çalışan İşe Al',
      description: 'Personel & İK Havuzundan ilk çalışanını veya yöneticini kadrona kat.',
      rewardCash: 40_000,
      rewardXp: 140,
      targetType: 'staffTotal',
      targetValue: 1,
      tier: 1,
    },
    {
      id: 'dyn-starter-stock-10',
      title: 'Borsada İlk Hisse Yatırımı',
      description: 'Finans > Borsa ekranından BIST Devlerinden en az 10 lot hisse al.',
      rewardCash: 55_000,
      rewardXp: 180,
      targetType: 'stockSharesTotal',
      targetValue: 10,
      tier: 1,
    },
  ];
}

/**
 * Generates a brand-new contextual mission tailored to the player's current empire level,
 * assets, and progression, avoiding duplicate target types already active.
 */
export function generateNextDynamicMission(
  state: EmpireState,
  existingMissions: MissionDef[],
  seq: number,
  now = Date.now(),
  stockQuotes?: StockQuote[]
): MissionDef {
  const netWorth = calculateNetWorth(state, now, stockQuotes);
  const companyTier = getCompanyTier(netWorth);
  const activeTypes = new Set(existingMissions.map((m) => m.targetType));

  const currentBiz = state.businesses.length;
  const currentCities = new Set(state.businesses.map((b) => b.cityPlate)).size;
  const currentMaxLevel = state.businesses.reduce((m, b) => Math.max(m, b.level), 1);
  const currentStaff =
    state.businesses.reduce((s, b) => s + Math.max(b.staffCount, (b.employees ?? []).length), 0) +
    (state.cityManagers?.length ?? 0);
  const currentAutoMgrs = (state.cityManagers ?? []).filter(
    (m) => m.role === 'bolge_sorumlusu' || m.role === 'genel_mudur'
  ).length;
  const currentStocks = (state.stockPortfolio ?? []).reduce((s, h) => s + h.shares, 0);
  const currentFactories = state.businesses.filter((b) => isFactoryType(b.blueprintId)).length;
  const currentParking = state.businesses.filter((b) => isParkingType(b.blueprintId)).length;
  const currentScore = Math.round(state.creditScore ?? 1100);

  const candidates: MissionDef[] = [];

  // 1. Auto-collection manager milestone (Bölge Sorumlusu / Genel Müdür)
  if (!activeTypes.has('autoCollectManagerCount')) {
    const target = currentAutoMgrs + 1;
    candidates.push({
      id: `dyn-automgr-${target}-${seq}`,
      title:
        target === 1
          ? 'Otomatik Gelir İçin Bölge Sorumlusu Ata'
          : `${target}. Bölge Sorumlusu / Genel Müdür`,
      description:
        'Saatlik otomatik hasılat toplama yetkisi için Bölge Sorumlusu veya Genel Müdür işe al.',
      rewardCash: 120_000 + target * 90_000,
      rewardXp: 260 + target * 110,
      targetType: 'autoCollectManagerCount',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 2. Multi-city expansion
  if (!activeTypes.has('cityCount') && currentCities < 81) {
    const target = Math.min(81, Math.max(2, currentCities + 1));
    candidates.push({
      id: `dyn-city-${target}-${seq}`,
      title: target === 2 ? 'Farklı Bir İlde Şube Aç' : `${target} Farklı İlde Faaliyet Göster`,
      description: `Üstteki şehir seçiciden yeni bir ile geçip toplam ${target} ilde işletme kur.`,
      rewardCash: 75_000 * target,
      rewardXp: 180 + target * 75,
      targetType: 'cityCount',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 3. Branch level upgrade
  if (!activeTypes.has('maxLevel') && currentMaxLevel < 10) {
    const target = Math.min(10, currentMaxLevel + 1);
    candidates.push({
      id: `dyn-lvl-${target}-${seq}`,
      title: `İşletmeni Seviye ${target} Yap`,
      description: `En az bir şubeni Seviye ${target} seviyesine yükselt.`,
      rewardCash: 40_000 * target,
      rewardXp: 130 * target,
      targetType: 'maxLevel',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 4. Stock market investing
  if (!activeTypes.has('stockSharesTotal')) {
    const step = currentStocks < 50 ? 25 : currentStocks < 200 ? 75 : 150;
    const target = currentStocks + step;
    candidates.push({
      id: `dyn-stock-${target}-${seq}`,
      title: `Borsa Portföyünü ${target} Lota Çıkar`,
      description: `Canlı BIST Devleri veya Holding hisselerinden toplam ${target} lota ulaş.`,
      rewardCash: 55_000 + Math.round(target * 650),
      rewardXp: 170 + Math.round(target * 1.8),
      targetType: 'stockSharesTotal',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 5. Staff growth
  if (!activeTypes.has('staffTotal')) {
    const target = currentStaff + Math.max(2, Math.min(5, companyTier.level));
    candidates.push({
      id: `dyn-staff-${target}-${seq}`,
      title: `Kadronu ${target} Personele Büyüt`,
      description: `Şubelerine ve il yönetimine toplam ${target} yıldızlı personel/yönetici ata.`,
      rewardCash: 35_000 * Math.max(2, Math.min(10, target)),
      rewardXp: 120 + target * 40,
      targetType: 'staffTotal',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 6. Business count growth
  if (!activeTypes.has('businessCount')) {
    const target = Math.max(2, currentBiz + (companyTier.level >= 3 ? 2 : 1));
    candidates.push({
      id: `dyn-biz-${target}-${seq}`,
      title: `${target} İşletmelik Zincir Kur`,
      description: `Türkiye genelinde aktif işletme sayını ${target} şubeye ulaştır.`,
      rewardCash: 50_000 * target,
      rewardXp: 150 + target * 55,
      targetType: 'businessCount',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 7. Credit score improvement
  if (!activeTypes.has('creditScore') && currentScore < 1750) {
    const target = Math.min(1850, Math.max(1250, Math.ceil((currentScore + 100) / 50) * 50));
    candidates.push({
      id: `dyn-credit-${target}-${seq}`,
      title: `Kredi Puanını ${target} Üzerine Çıkar`,
      description: `Bankadan aldığın kredileri zamanında ödeyerek kredi puanını ${target} yap.`,
      rewardCash: 110_000 + Math.max(0, target - 1100) * 400,
      rewardXp: 280,
      targetType: 'creditScore',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 8. Parking synergy milestone
  if (!activeTypes.has('parkingCount') && companyTier.level >= 1) {
    const target = currentParking + 1;
    candidates.push({
      id: `dyn-park-${target}-${seq}`,
      title: target === 1 ? 'Otopark Sinerjisi Başlat' : `${target}. Otoparkını Aç`,
      description: `İşletmelerinin 250m yakınına Otopark kurarak +%15 müşteri kapasitesi kazan.`,
      rewardCash: 95_000 * target,
      rewardXp: 220 * target,
      targetType: 'parkingCount',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 9. Industrial factory milestone
  if (!activeTypes.has('factoryCount') && (companyTier.level >= 2 || netWorth >= 750_000)) {
    const target = currentFactories + 1;
    candidates.push({
      id: `dyn-factory-${target}-${seq}`,
      title: target === 1 ? 'İlk Sanayi Fabrikanı Kur' : `${target}. Fabrikanı Devreye Al`,
      description: `Gıda, Elektronik veya Tekstil Fabrikası kurarak %35 tedarik indirimi sağla.`,
      rewardCash: 350_000 * target,
      rewardXp: 500 * target,
      targetType: 'factoryCount',
      targetValue: target,
      tier: companyTier.level,
    });
  }

  // 10. Net worth scaling fallback (always available so missions NEVER run out!)
  const nextNetWorth = Math.max(
    500_000,
    Math.ceil((netWorth * 1.45) / 100_000) * 100_000
  );
  if (!activeTypes.has('netWorth') || candidates.length === 0) {
    candidates.push({
      id: `dyn-nw-${nextNetWorth}-${seq}`,
      title: `${formatTL(nextNetWorth, true)} Holding Değerine Ulaş`,
      description: `Nakit, mülkler ve borsa portföyüyle toplam net varlığını ${formatTL(nextNetWorth, true)} yap.`,
      rewardCash: Math.min(5_000_000, Math.round(nextNetWorth * 0.12)),
      rewardXp: 240 + companyTier.level * 120,
      targetType: 'netWorth',
      targetValue: nextNetWorth,
      tier: companyTier.level,
    });
  }

  // Deterministic rotation so players always get a fresh mix of mission types
  return candidates[seq % candidates.length];
}

/**
 * Ensures `state.activeMissions` always has ACTIVE_MISSION_SLOTS (4) fresh missions.
 */
export function ensureDynamicMissions(
  state: EmpireState,
  now = Date.now(),
  stockQuotes?: StockQuote[]
): MissionDef[] {
  const existing = [...(state.activeMissions ?? [])];
  if (existing.length === 0 && (state.completedMissionsCount ?? 0) === 0) {
    return createInitialDynamicMissions();
  }
  let seq = (state.completedMissionsCount ?? 0) + existing.length + 1;
  while (existing.length < ACTIVE_MISSION_SLOTS) {
    existing.push(generateNextDynamicMission(state, existing, seq, now, stockQuotes));
    seq += 1;
  }
  return existing;
}
