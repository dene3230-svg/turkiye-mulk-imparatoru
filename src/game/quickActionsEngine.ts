import type {
  DailyBusinessOffer,
  EmpireState,
  HoldingPromoCampaign,
  HoldingPromoTierId,
  RentalProperty,
  RentalPropertyKind,
  TenantOffer,
} from '../types/game';

/* ============================================================================
   1. REKLAM & TANITIM (Holding-Wide Marketing Campaigns)
   ============================================================================ */

export interface HoldingPromoTierDef {
  id: HoldingPromoTierId;
  name: string;
  tagline: string;
  description: string;
  cost: number;
  revenueBoost: number; // +14%, +28%, +45%
  brandGain: number; // +3%, +7%, +14%
  durationDays: number;
}

export const HOLDING_PROMO_TIERS: HoldingPromoTierDef[] = [
  {
    id: 'local_poster',
    name: 'Yerel Afiş & Broşür',
    tagline: 'Mahalle ve ilçe odaklı hızlı görünürlük',
    description:
      'Şubelerinizin çevresindeki cadde panoları ve yerel dağıtımlarla müşteri trafiğini artırır.',
    cost: 45_000,
    revenueBoost: 0.14,
    brandGain: 3,
    durationDays: 5,
  },
  {
    id: 'social_media',
    name: 'Sosyal Medya Kampanyası',
    tagline: 'Hedefli dijital reklam ve içerik üretimi',
    description:
      'Şehir genelinde yüksek etkileşimli sponsorlu kampanyalarla tüm şubelerinize müşteri çeker.',
    cost: 165_000,
    revenueBoost: 0.28,
    brandGain: 7,
    durationDays: 7,
  },
  {
    id: 'tv_digital',
    name: 'TV & Ulusal Dijital Lansman',
    tagline: 'Türkiye çapında prestij ve ciro patlaması',
    description:
      'Ana akım televizyon ve ulusal dijital ağlarda holding markanızı zirveye taşır.',
    cost: 520_000,
    revenueBoost: 0.45,
    brandGain: 14,
    durationDays: 10,
  },
];

export function launchHoldingPromotion(
  state: EmpireState,
  tierId: HoldingPromoTierId,
  now = Date.now()
): { ok: boolean; state: EmpireState; campaign?: HoldingPromoCampaign; error?: string } {
  const tier = HOLDING_PROMO_TIERS.find((t) => t.id === tierId);
  if (!tier) return { ok: false, state, error: 'Geçersiz kampanya paketi.' };

  if (state.cash < tier.cost) {
    return {
      ok: false,
      state,
      error: `Kampanya bütçesi için ₺${tier.cost.toLocaleString('tr-TR')} gerekiyor (yetersiz kasa).`,
    };
  }

  const currentMinutes = state.gameMinutes ?? 540;
  const currentDay = Math.floor(currentMinutes / 1440) + 1;
  const campaign: HoldingPromoCampaign = {
    tierId: tier.id,
    name: tier.name,
    revenueBoost: tier.revenueBoost,
    brandGain: tier.brandGain,
    startedDay: currentDay,
    endsAtGameMin: currentMinutes + tier.durationDays * 1440,
    durationDays: tier.durationDays,
  };

  const nextBrand = Math.min(100, Math.round(((state.brandRecognition ?? 5) + tier.brandGain) * 10) / 10);

  return {
    ok: true,
    campaign,
    state: {
      ...state,
      cash: state.cash - tier.cost,
      brandRecognition: nextBrand,
      companyXp: (state.companyXp ?? 0) + tier.brandGain * 25,
      activeHoldingPromo: campaign,
      lastSavedAt: now,
    },
  };
}

/* ============================================================================
   2. KİRALIK İLANLARI (Commercial & Residential Rental Portfolio)
   ============================================================================ */

export interface RentalCatalogDef {
  catalogId: string;
  name: string;
  cityLabel: string;
  kind: RentalPropertyKind;
  purchasePrice: number;
  baseMonthlyRent: number;
  offers: Array<{
    tenantName: string;
    sectorLabel: string;
    rentFactor: number;
    leaseDays: number;
    reliabilityPct: number;
  }>;
}

export const RENTAL_PROPERTY_CATALOG: RentalCatalogDef[] = [
  {
    catalogId: 'rent-kadikoy-shop',
    name: 'Cadde Köşe Dükkan (95 m²)',
    cityLabel: 'İstanbul • Kadıköy',
    kind: 'dukkan',
    purchasePrice: 850_000,
    baseMonthlyRent: 96_000,
    offers: [
      { tenantName: 'Bora Optik & Lens', sectorLabel: 'Perakende', rentFactor: 1.0, leaseDays: 30, reliabilityPct: 95 },
      { tenantName: 'Ege Gurme Şarküteri', sectorLabel: 'Gıda', rentFactor: 1.12, leaseDays: 20, reliabilityPct: 87 },
    ],
  },
  {
    catalogId: 'rent-ankara-apt',
    name: 'Çankaya Rezidans Daire (2+1)',
    cityLabel: 'Ankara • Çankaya',
    kind: 'daire',
    purchasePrice: 620_000,
    baseMonthlyRent: 68_000,
    offers: [
      { tenantName: 'Dr. Selin Arslan', sectorLabel: 'Konut Kiracısı', rentFactor: 1.0, leaseDays: 45, reliabilityPct: 98 },
      { tenantName: 'Anadolu Mühendislik Lojman', sectorLabel: 'Kurumsal Konut', rentFactor: 1.09, leaseDays: 30, reliabilityPct: 92 },
    ],
  },
  {
    catalogId: 'rent-izmir-office',
    name: 'Alsancak Butik Ofis Katı (160 m²)',
    cityLabel: 'İzmir • Konak',
    kind: 'ofis',
    purchasePrice: 1_450_000,
    baseMonthlyRent: 174_000,
    offers: [
      { tenantName: 'Kordon Yazılım A.Ş.', sectorLabel: 'Teknoloji', rentFactor: 1.05, leaseDays: 45, reliabilityPct: 96 },
      { tenantName: 'Akdeniz Hukuk Bürosu', sectorLabel: 'Danışmanlık', rentFactor: 0.96, leaseDays: 60, reliabilityPct: 99 },
    ],
  },
  {
    catalogId: 'rent-bursa-shop',
    name: 'Nilüfer Bulvar Mağazası (140 m²)',
    cityLabel: 'Bursa • Nilüfer',
    kind: 'dukkan',
    purchasePrice: 1_120_000,
    baseMonthlyRent: 132_000,
    offers: [
      { tenantName: 'Marmara Spor Giyim', sectorLabel: 'Tekstil', rentFactor: 1.08, leaseDays: 30, reliabilityPct: 91 },
      { tenantName: 'Uludağ Eczanesi', sectorLabel: 'Sağlık', rentFactor: 0.98, leaseDays: 60, reliabilityPct: 98 },
    ],
  },
  {
    catalogId: 'rent-antalya-apt',
    name: 'Konyaaltı Deniz Manzaralı Daire',
    cityLabel: 'Antalya • Konyaaltı',
    kind: 'daire',
    purchasePrice: 980_000,
    baseMonthlyRent: 118_000,
    offers: [
      { tenantName: 'SunLine Turizm Yönetici', sectorLabel: 'Kurumsal Konut', rentFactor: 1.14, leaseDays: 25, reliabilityPct: 89 },
      { tenantName: 'Aylin & Mert Kaya', sectorLabel: 'Aile Konutu', rentFactor: 1.0, leaseDays: 45, reliabilityPct: 96 },
    ],
  },
  {
    catalogId: 'rent-levent-office',
    name: 'Levent Plaza Yönetici Ofisi (280 m²)',
    cityLabel: 'İstanbul • Beşiktaş',
    kind: 'ofis',
    purchasePrice: 2_650_000,
    baseMonthlyRent: 330_000,
    offers: [
      { tenantName: 'Boğaziçi Finans Danışmanlık', sectorLabel: 'Finans', rentFactor: 1.1, leaseDays: 45, reliabilityPct: 97 },
      { tenantName: 'Nova Medya Holding', sectorLabel: 'Medya', rentFactor: 1.18, leaseDays: 30, reliabilityPct: 88 },
    ],
  },
];

function buildTenantOffers(def: RentalCatalogDef): TenantOffer[] {
  return def.offers.map((o, idx) => ({
    id: `${def.catalogId}-offer-${idx + 1}`,
    tenantName: o.tenantName,
    sectorLabel: o.sectorLabel,
    monthlyRent: Math.round((def.baseMonthlyRent * o.rentFactor) / 500) * 500,
    leaseDays: o.leaseDays,
    reliabilityPct: o.reliabilityPct,
  }));
}

export function getMergedRentalProperties(state: EmpireState): RentalProperty[] {
  const existing = state.rentalProperties ?? [];
  const byCatalog = new Map(existing.map((p) => [p.catalogId, p]));
  return RENTAL_PROPERTY_CATALOG.map((def) => {
    const saved = byCatalog.get(def.catalogId);
    if (saved) {
      return {
        ...saved,
        tenantOffers:
          saved.tenantOffers && saved.tenantOffers.length > 0
            ? saved.tenantOffers
            : buildTenantOffers(def),
      };
    }
    return {
      id: `prop-${def.catalogId}`,
      catalogId: def.catalogId,
      name: def.name,
      cityLabel: def.cityLabel,
      kind: def.kind,
      purchasePrice: def.purchasePrice,
      baseMonthlyRent: def.baseMonthlyRent,
      owned: false,
      tenantOffers: buildTenantOffers(def),
    };
  });
}

export function calculateDailyRentalIncome(state: EmpireState): number {
  const props = state.rentalProperties ?? [];
  let totalDaily = 0;
  for (const p of props) {
    if (p.owned && (p.activeMonthlyRent ?? 0) > 0 && (p.leaseRemainingDays ?? 0) > 0) {
      totalDaily += Math.round((p.activeMonthlyRent ?? 0) / 30);
    }
  }
  return Math.max(0, totalDaily);
}

export function calculateRentalPropertiesValuation(state: EmpireState): number {
  return (state.rentalProperties ?? [])
    .filter((p) => p.owned)
    .reduce((sum, p) => sum + Math.max(0, p.purchasePrice), 0);
}

export function buyRentalProperty(
  state: EmpireState,
  catalogId: string,
  discountPrice?: number,
  now = Date.now()
): { ok: boolean; state: EmpireState; property?: RentalProperty; error?: string } {
  const merged = getMergedRentalProperties(state);
  const target = merged.find((p) => p.catalogId === catalogId);
  if (!target) return { ok: false, state, error: 'İlan bulunamadı.' };
  if (target.owned) return { ok: false, state, error: 'Bu mülk zaten portföyünüzde.' };

  const price = discountPrice !== undefined ? Math.max(100_000, discountPrice) : target.purchasePrice;
  if (state.cash < price) {
    return {
      ok: false,
      state,
      error: `Mülkü satın almak için ₺${price.toLocaleString('tr-TR')} gerekiyor (yetersiz kasa).`,
    };
  }

  const updatedTarget: RentalProperty = {
    ...target,
    owned: true,
  };
  const nextProps = merged.map((p) => (p.catalogId === catalogId ? updatedTarget : p));

  return {
    ok: true,
    property: updatedTarget,
    state: {
      ...state,
      cash: state.cash - price,
      companyXp: (state.companyXp ?? 0) + 180,
      rentalProperties: nextProps,
      lastSavedAt: now,
    },
  };
}

export function signLeaseContract(
  state: EmpireState,
  catalogId: string,
  offerId: string,
  now = Date.now()
): { ok: boolean; state: EmpireState; property?: RentalProperty; error?: string } {
  const merged = getMergedRentalProperties(state);
  const target = merged.find((p) => p.catalogId === catalogId);
  if (!target) return { ok: false, state, error: 'Mülk bulunamadı.' };
  if (!target.owned) return { ok: false, state, error: 'Kiraya vermek için önce mülkü satın almalısınız.' };
  if ((target.leaseRemainingDays ?? 0) > 0 && target.leasedTenantName) {
    return { ok: false, state, error: 'Bu mülkte aktif bir kira sözleşmesi bulunuyor.' };
  }

  const offer = target.tenantOffers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, state, error: 'Kiracı teklifi bulunamadı.' };

  const updatedTarget: RentalProperty = {
    ...target,
    leasedTenantName: offer.tenantName,
    leasedSectorLabel: offer.sectorLabel,
    activeMonthlyRent: offer.monthlyRent,
    leaseRemainingDays: offer.leaseDays,
  };
  const nextProps = merged.map((p) => (p.catalogId === catalogId ? updatedTarget : p));

  // Immediate first-day security / contract deposit bonus (+10% of monthly rent)
  const contractBonus = Math.round(offer.monthlyRent * 0.1);

  return {
    ok: true,
    property: updatedTarget,
    state: {
      ...state,
      cash: state.cash + contractBonus,
      totalEarnedLifetime: state.totalEarnedLifetime + contractBonus,
      companyXp: (state.companyXp ?? 0) + 95,
      rentalProperties: nextProps,
      lastSavedAt: now,
    },
  };
}

export function terminateLeaseContract(
  state: EmpireState,
  catalogId: string,
  now = Date.now()
): { ok: boolean; state: EmpireState; error?: string } {
  const merged = getMergedRentalProperties(state);
  const target = merged.find((p) => p.catalogId === catalogId);
  if (!target || !target.owned) return { ok: false, state, error: 'Mülk bulunamadı.' };
  if (!target.leasedTenantName) return { ok: false, state, error: 'Aktif sözleşme bulunmuyor.' };

  const nextProps = merged.map((p) =>
    p.catalogId === catalogId
      ? {
          ...p,
          leasedTenantName: undefined,
          leasedSectorLabel: undefined,
          activeMonthlyRent: 0,
          leaseRemainingDays: 0,
        }
      : p
  );

  return {
    ok: true,
    state: {
      ...state,
      rentalProperties: nextProps,
      lastSavedAt: now,
    },
  };
}

export function advanceRentalLeasesByDays(
  props: RentalProperty[] | undefined,
  daysPassed: number
): RentalProperty[] | undefined {
  if (!props || props.length === 0 || daysPassed <= 0) return props;
  return props.map((p) => {
    if (!p.owned || !p.leaseRemainingDays || p.leaseRemainingDays <= 0) return p;
    const rem = Math.max(0, p.leaseRemainingDays - daysPassed);
    if (rem === 0) {
      return {
        ...p,
        leasedTenantName: undefined,
        leasedSectorLabel: undefined,
        activeMonthlyRent: 0,
        leaseRemainingDays: 0,
      };
    }
    return {
      ...p,
      leaseRemainingDays: rem,
    };
  });
}

/* ============================================================================
   3. GÜNLÜK TEKLİFLER & FIRSATLAR (Timed Daily Supply / Partnership / Property Deals)
   ============================================================================ */

export function generateDailyOffersForDay(
  state: EmpireState,
  currentDay: number
): DailyBusinessOffer[] {
  const mergedRentals = getMergedRentalProperties(state);
  const unownedRental = mergedRentals.find((p) => !p.owned) ?? mergedRentals[0];
  const discountedPrice = Math.round((unownedRental.purchasePrice * 0.82) / 5000) * 5000;
  const variant = currentDay % 3;

  const offers: DailyBusinessOffer[] = [
    {
      id: `offer-supply-d${currentDay}`,
      kind: 'supply_discount',
      title:
        variant === 0
          ? 'Toptan Hammadde İndirim Anlaşması'
          : variant === 1
          ? 'Anadolu Lojistik Tedarik Paketi'
          : 'Mevsimsel Hammadde Kontratı',
      partnerName: variant === 0 ? 'Ege Toptan A.Ş.' : variant === 1 ? 'Anadolu Lojistik' : 'Trakya Gıda Tedarik',
      description:
        '4 gün boyunca tüm şubelerinizin günlük tedarik giderlerinde ekstra %18 indirim sağlar.',
      cost: 35_000,
      expiresOnDay: currentDay + 2,
      status: 'pending',
      discountPct: 0.18,
      durationDays: 4,
      xpBonus: 120,
    },
    {
      id: `offer-partner-d${currentDay}`,
      kind: 'partnership_bonus',
      title:
        variant === 0
          ? 'Kurumsal Marka Sponsorluk Ortaklığı'
          : variant === 1
          ? 'Bölgesel Fuar & Etkinlik İş Birliği'
          : 'Yatırımcı Konseyi Ortak Tanıtım',
      partnerName: variant === 0 ? 'Bosphorus Ventures' : variant === 1 ? 'TÜYAP İş Ağı' : 'Anatolia Capital',
      description:
        'Anında nakit katkı payı, +5 Firma Tanınırlığı ve holding itibar puanı kazandırır.',
      cost: 0,
      expiresOnDay: currentDay + 1,
      status: 'pending',
      cashReward: 95_000 + Math.min(250_000, (state.businesses.length || 1) * 28_000),
      brandBonus: 5,
      xpBonus: 160,
    },
  ];

  if (unownedRental && !unownedRental.owned) {
    offers.push({
      id: `offer-prop-d${currentDay}`,
      kind: 'discounted_property',
      title: `Acil Satılık: ${unownedRental.name}`,
      partnerName: 'Özel Portföy Danışmanlığı',
      description: `${unownedRental.cityLabel} bölgesindeki bu mülkü piyasa değerinin %18 altında devralıp hemen kiraya verin.`,
      cost: discountedPrice,
      expiresOnDay: currentDay + 2,
      status: 'pending',
      rentalCatalogId: unownedRental.catalogId,
      xpBonus: 220,
    });
  }

  return offers;
}

export function ensureDailyOffersForDay(state: EmpireState): DailyBusinessOffer[] {
  const currentDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  const existing = state.dailyOffers ?? [];
  if (state.dailyOffersDay === currentDay && existing.length > 0) {
    return existing;
  }
  return generateDailyOffersForDay(state, currentDay);
}

export function acceptDailyOffer(
  state: EmpireState,
  offerId: string,
  now = Date.now()
): { ok: boolean; state: EmpireState; offer?: DailyBusinessOffer; summary?: string; error?: string } {
  const currentDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  const offers = ensureDailyOffersForDay(state);
  const target = offers.find((o) => o.id === offerId);
  if (!target) return { ok: false, state, error: 'Teklif bulunamadı.' };
  if (target.status !== 'pending') return { ok: false, state, error: 'Bu teklif zaten yanıtlandı.' };

  if (target.cost > 0 && state.cash < target.cost) {
    return {
      ok: false,
      state,
      error: `Bu teklif için ₺${target.cost.toLocaleString('tr-TR')} gerekiyor (yetersiz kasa).`,
    };
  }

  let nextState: EmpireState = {
    ...state,
    dailyOffersDay: currentDay,
  };
  let summary = '';

  if (target.kind === 'supply_discount') {
    const dur = target.durationDays ?? 4;
    nextState = {
      ...nextState,
      cash: nextState.cash - target.cost,
      supplyDiscountUntilDay: currentDay + dur,
      supplyDiscountPct: target.discountPct ?? 0.18,
      companyXp: (nextState.companyXp ?? 0) + (target.xpBonus ?? 120),
    };
    summary = `${dur} gün boyunca tüm şubelerde ekstra %${Math.round((target.discountPct ?? 0.18) * 100)} tedarik indirimi aktif!`;
  } else if (target.kind === 'partnership_bonus') {
    const reward = target.cashReward ?? 120_000;
    const brandGain = target.brandBonus ?? 5;
    nextState = {
      ...nextState,
      cash: nextState.cash + reward,
      totalEarnedLifetime: nextState.totalEarnedLifetime + reward,
      brandRecognition: Math.min(100, (nextState.brandRecognition ?? 5) + brandGain),
      companyXp: (nextState.companyXp ?? 0) + (target.xpBonus ?? 160),
    };
    summary = `+₺${reward.toLocaleString('tr-TR')} nakit ortaklık payı ve +%${brandGain} tanınırlık kazanıldı!`;
  } else if (target.kind === 'discounted_property' && target.rentalCatalogId) {
    const buyRes = buyRentalProperty(nextState, target.rentalCatalogId, target.cost, now);
    if (!buyRes.ok) {
      return { ok: false, state, error: buyRes.error };
    }
    nextState = buyRes.state;
    summary = `${buyRes.property?.name ?? 'Ticari mülk'} %18 indirimle portföyünüze eklendi!`;
  }

  const nextOffers = offers.map((o) =>
    o.id === offerId ? { ...o, status: 'accepted' as const } : o
  );

  return {
    ok: true,
    offer: target,
    summary,
    state: {
      ...nextState,
      dailyOffers: nextOffers,
      dailyOffersDay: currentDay,
      lastSavedAt: now,
    },
  };
}

export function declineDailyOffer(
  state: EmpireState,
  offerId: string,
  now = Date.now()
): { ok: boolean; state: EmpireState } {
  const currentDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  const offers = ensureDailyOffersForDay(state);
  const nextOffers = offers.map((o) =>
    o.id === offerId ? { ...o, status: 'declined' as const } : o
  );
  return {
    ok: true,
    state: {
      ...state,
      dailyOffers: nextOffers,
      dailyOffersDay: currentDay,
      lastSavedAt: now,
    },
  };
}

/* ============================================================================
   4. MAĞAZA (Holding Perks & Strategic Packages)
   ============================================================================ */

export interface HoldingStoreItemDef {
  id: string;
  name: string;
  category: 'Operasyon' | 'Prestij' | 'Finans';
  description: string;
  cost: number;
  repeatable: boolean;
  effectLabel: string;
}

export const HOLDING_STORE_ITEMS: HoldingStoreItemDef[] = [
  {
    id: 'store-brand-pr',
    name: 'Ulusal Basın & PR Paketi',
    category: 'Prestij',
    description: 'Holding markanızı iş dünyası dergilerinde öne çıkararak kalıcı tanınırlık sağlar.',
    cost: 140_000,
    repeatable: true,
    effectLabel: '+6% Tanınırlık & +250 RP',
  },
  {
    id: 'store-morale-retreat',
    name: 'Ekip Motivasyon & Eğitim Zirvesi',
    category: 'Operasyon',
    description: 'Tüm şubelerdeki personelin moralini %100 seviyesine taşır, stok ve bakımı yeniler.',
    cost: 85_000,
    repeatable: true,
    effectLabel: 'Tüm Şubeler %100 Moral & Stok',
  },
  {
    id: 'store-credit-audit',
    name: 'Bağımsız Finansal Denetim Raporu',
    category: 'Finans',
    description: 'Bankalar nezdinde kredibilitenizi güçlendirerek kredi puanınızı yükseltir.',
    cost: 195_000,
    repeatable: true,
    effectLabel: '+65 Kredi Puanı & +300 RP',
  },
  {
    id: 'store-supply-hub',
    name: 'Merkezi Satın Alma Yazılımı',
    category: 'Operasyon',
    description: '7 gün boyunca tüm şubelerde ekstra %15 tedarik maliyeti avantajı sağlar.',
    cost: 120_000,
    repeatable: true,
    effectLabel: '7 Gün -%15 Tedarik Maliyeti',
  },
];

export function purchaseStorePerk(
  state: EmpireState,
  itemId: string,
  now = Date.now()
): { ok: boolean; state: EmpireState; item?: HoldingStoreItemDef; error?: string } {
  const item = HOLDING_STORE_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, state, error: 'Mağaza paketi bulunamadı.' };
  if (state.cash < item.cost) {
    return {
      ok: false,
      state,
      error: `Bu paket için ₺${item.cost.toLocaleString('tr-TR')} gerekiyor (yetersiz kasa).`,
    };
  }

  const currentDay = Math.floor((state.gameMinutes ?? 540) / 1440) + 1;
  let nextState: EmpireState = {
    ...state,
    cash: state.cash - item.cost,
    storePurchasedIds: [...(state.storePurchasedIds ?? []), item.id],
    lastSavedAt: now,
  };

  if (item.id === 'store-brand-pr') {
    nextState = {
      ...nextState,
      brandRecognition: Math.min(100, (nextState.brandRecognition ?? 5) + 6),
      companyXp: (nextState.companyXp ?? 0) + 250,
    };
  } else if (item.id === 'store-morale-retreat') {
    nextState = {
      ...nextState,
      businesses: nextState.businesses.map((b) => ({
        ...b,
        staffMorale: 100,
        stockLevel: 100,
        maintenanceLevel: 100,
      })),
      companyXp: (nextState.companyXp ?? 0) + 180,
    };
  } else if (item.id === 'store-credit-audit') {
    nextState = {
      ...nextState,
      creditScore: Math.min(1900, (nextState.creditScore ?? 1100) + 65),
      companyXp: (nextState.companyXp ?? 0) + 300,
    };
  } else if (item.id === 'store-supply-hub') {
    nextState = {
      ...nextState,
      supplyDiscountUntilDay: Math.max(nextState.supplyDiscountUntilDay ?? 0, currentDay + 7),
      supplyDiscountPct: Math.max(nextState.supplyDiscountPct ?? 0, 0.15),
      companyXp: (nextState.companyXp ?? 0) + 200,
    };
  }

  return { ok: true, item, state: nextState };
}
