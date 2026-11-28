import type {
  CharacterAccessoryId,
  CharacterGender,
  CharacterHairStyleId,
  CharacterOutfitId,
  CharacterProfile,
  CharacterTraitId,
  EmpireState,
} from '../types/game';

export interface CharacterSwatch {
  id: string;
  label: string;
  hex: string;
}

export interface HairStyleOption {
  id: CharacterHairStyleId;
  label: string;
  genders: CharacterGender[];
}

export interface AccessoryOption {
  id: CharacterAccessoryId;
  label: string;
  description: string;
}

export interface OutfitOption {
  id: Exclude<CharacterOutfitId, 'takim_elbise'>;
  label: string;
  shortDesc: string;
  defaultColor: string;
}

export interface TraitOption {
  id: CharacterTraitId;
  title: string;
  bonusBadge: string;
  shortBenefit: string;
  description: string;
  tipMultiplier: number; // 1.20 for sosyal
  xpMultiplier: number; // 1.15 for hizli_ogrenen
  rentDiscountRate: number; // 0.10 for pazarlikci
  expenseDiscountRate: number; // 0.08 for hesap_uzmani
}

export const HAIR_STYLE_OPTIONS: HairStyleOption[] = [
  { id: 'uzun', label: 'Uzun', genders: ['female', 'male'] },
  { id: 'topuz', label: 'Topuz', genders: ['female'] },
  { id: 'kut', label: 'Küt', genders: ['female'] },
  { id: 'dalgali', label: 'Dalgalı', genders: ['female', 'male'] },
  { id: 'kisa', label: 'Kısa', genders: ['male', 'female'] },
  { id: 'yan_ayrik', label: 'Yan Ayrık', genders: ['male'] },
  { id: 'daginik', label: 'Dağınık', genders: ['male'] },
];

export const HAIR_COLOR_SWATCHES: CharacterSwatch[] = [
  { id: 'ebony', label: 'Koyu Siyah', hex: '#282E38' },
  { id: 'espresso', label: 'Koyu Kahve', hex: '#4B362A' },
  { id: 'chestnut', label: 'Kestane', hex: '#7A543A' },
  { id: 'honey', label: 'Kumral', hex: '#B48E5B' },
  { id: 'auburn', label: 'Kızıl', hex: '#8F4C3C' },
  { id: 'silver', label: 'Gümüş Gri', hex: '#8492A6' },
];

export const SKIN_TONE_SWATCHES: CharacterSwatch[] = [
  { id: 'porcelain', label: 'Açık Ten', hex: '#F6CCA8' },
  { id: 'warm_ivory', label: 'Buğday', hex: '#E3B087' },
  { id: 'olive', label: 'Esmer', hex: '#C78E62' },
  { id: 'bronze', label: 'Bronz', hex: '#9E6D4B' },
  { id: 'deep', label: 'Koyu Ten', hex: '#714932' },
];

export const ACCESSORY_OPTIONS: AccessoryOption[] = [
  { id: 'gozluk', label: 'Gözlük', description: 'İnce çerçeveli klasik gözlük' },
  { id: 'kupe', label: 'Küpe', description: 'Mat altın halka küpe' },
  { id: 'sakal_biyik', label: 'Sakal/Bıyık', description: 'Bakımlı kısa sakal ve bıyık' },
  { id: 'yok', label: 'Yok', description: 'Aksesuar kullanma' },
];

export const OUTFIT_OPTIONS: OutfitOption[] = [
  {
    id: 'barista_onlugu',
    label: 'Barista Önlüğü',
    shortDesc: 'Kafe ve servis vardiyalarına uygun klasik önlük',
    defaultColor: '#8F7356',
  },
  {
    id: 'gunluk_kiyafet',
    label: 'Günlük Kıyafet',
    shortDesc: 'Rahat kapüşonlu sweatshirt ve günlük tarz',
    defaultColor: '#7A9E7E',
  },
  {
    id: 'ofis_gomlegi',
    label: 'Ofis Gömleği',
    shortDesc: 'Düzenli yaka gömlek ile kurumsal başlangıç',
    defaultColor: '#7E96B0',
  },
  {
    id: 'isci_tulumu',
    label: 'İşçi Tulumu',
    shortDesc: 'Atölye, depo ve saha işlerine özel askılı tulum',
    defaultColor: '#5B738C',
  },
];

export const OUTFIT_COLOR_SWATCHES: CharacterSwatch[] = [
  { id: 'coffee', label: 'Sıcak Kahve', hex: '#8F7356' },
  { id: 'sage', label: 'Adaçayı Yeşili', hex: '#7A9E7E' },
  { id: 'steel', label: 'Çelik Mavi', hex: '#68829E' },
  { id: 'slate', label: 'Arduvaz', hex: '#435368' },
  { id: 'terracotta', label: 'Kiremit', hex: '#9F5C52' },
  { id: 'gold', label: 'Mat Hardal', hex: '#B89B67' },
];

export const STARTING_TRAITS: TraitOption[] = [
  {
    id: 'sosyal',
    title: 'Sosyal',
    bonusBadge: '+%20 Bahşiş',
    shortBenefit: '+%20 Bahşiş',
    description: 'Müşteri etkileşimlerinden ve vardiyalardan ekstra bahşiş kazancı.',
    tipMultiplier: 1.2,
    xpMultiplier: 1.0,
    rentDiscountRate: 0,
    expenseDiscountRate: 0,
  },
  {
    id: 'hizli_ogrenen',
    title: 'Hızlı Öğrenen',
    bonusBadge: '+%15 XP',
    shortBenefit: '+%15 XP',
    description: 'İş ve işletme aksiyonlarından daha hızlı deneyim puanı kazanımı.',
    tipMultiplier: 1.0,
    xpMultiplier: 1.15,
    rentDiscountRate: 0,
    expenseDiscountRate: 0,
  },
  {
    id: 'pazarlikci',
    title: 'Pazarlıkçı',
    bonusBadge: '-%10 Kira',
    shortBenefit: '-%10 Kira',
    description: 'İşyeri kurulumu ve mülk kiralarında indirim avantajı.',
    tipMultiplier: 1.0,
    xpMultiplier: 1.0,
    rentDiscountRate: 0.1,
    expenseDiscountRate: 0,
  },
  {
    id: 'hesap_uzmani',
    title: 'Hesap Uzmanı',
    bonusBadge: '-%8 Gider',
    shortBenefit: '-%8 Gider',
    description: 'Günlük işletme giderlerinde ve finansal işlemlerde maliyet avantajı.',
    tipMultiplier: 1.0,
    xpMultiplier: 1.0,
    rentDiscountRate: 0,
    expenseDiscountRate: 0.08,
  },
];

export function getHairStylesForGender(gender: CharacterGender): HairStyleOption[] {
  return HAIR_STYLE_OPTIONS.filter((h) => h.genders.includes(gender));
}

export function getDefaultHairStyleForGender(gender: CharacterGender): CharacterHairStyleId {
  return gender === 'female' ? 'uzun' : 'kisa';
}

export function createDefaultCharacterProfile(
  name = '',
  gender: CharacterGender = 'female'
): CharacterProfile {
  return {
    name,
    gender,
    hairStyle: getDefaultHairStyleForGender(gender),
    hairColor: HAIR_COLOR_SWATCHES[0].hex,
    skinTone: SKIN_TONE_SWATCHES[0].hex,
    accessory: 'yok',
    outfit: 'barista_onlugu',
    outfitColor: OUTFIT_OPTIONS[0].defaultColor,
    traitId: 'sosyal',
  };
}

export function sanitizeCharacterForGender(
  profile: CharacterProfile,
  nextGender: CharacterGender
): CharacterProfile {
  const allowedHair = getHairStylesForGender(nextGender);
  const hairValid = allowedHair.some((h) => h.id === profile.hairStyle);
  const genderChanged = profile.gender !== nextGender;
  const nextAccessory =
    nextGender === 'female' && profile.accessory === 'sakal_biyik'
      ? 'yok'
      : profile.accessory;
  return {
    ...profile,
    gender: nextGender,
    hairStyle:
      genderChanged || !hairValid
        ? getDefaultHairStyleForGender(nextGender)
        : profile.hairStyle,
    accessory: nextAccessory,
  };
}

export function getTraitOption(traitId?: CharacterTraitId | null): TraitOption {
  return STARTING_TRAITS.find((t) => t.id === traitId) ?? STARTING_TRAITS[0];
}

export interface CharacterTraitModifiers {
  trait: TraitOption;
  tipMultiplier: number;
  xpMultiplier: number;
  rentDiscountRate: number;
  expenseDiscountRate: number;
}

export function getCharacterTraitModifiers(
  stateOrTrait?: Pick<EmpireState, 'character'> | CharacterTraitId | null
): CharacterTraitModifiers {
  const traitId =
    typeof stateOrTrait === 'string'
      ? stateOrTrait
      : stateOrTrait?.character?.traitId;

  if (!traitId) {
    return {
      trait: STARTING_TRAITS[0],
      tipMultiplier: 1.0,
      xpMultiplier: 1.0,
      rentDiscountRate: 0,
      expenseDiscountRate: 0,
    };
  }

  const trait = getTraitOption(traitId);
  return {
    trait,
    tipMultiplier: trait.tipMultiplier,
    xpMultiplier: trait.xpMultiplier,
    rentDiscountRate: trait.rentDiscountRate,
    expenseDiscountRate: trait.expenseDiscountRate,
  };
}

/**
 * Automatically upgrades the player's visual outfit to an executive suit ("Takım Elbise")
 * once they reach Şube Müdürü promotion or manage 3+ branches (Holding leadership stage).
 */
export function shouldWearExecutiveSuit(
  state?: Pick<EmpireState, 'businesses' | 'career' | 'officeTierId'> | null
): boolean {
  if (!state) return false;
  if ((state.businesses?.length ?? 0) >= 3) return true;
  if (state.career?.rankId === 'sube_muduru') return true;
  if (
    state.officeTierId === 'plaza_floor' ||
    state.officeTierId === 'bosphorus_suite' ||
    state.officeTierId === 'holding_tower'
  ) {
    return true;
  }
  return false;
}

export function resolveEffectiveCharacterOutfit(
  profile: CharacterProfile,
  state?: Pick<EmpireState, 'businesses' | 'career' | 'officeTierId'> | null
): CharacterOutfitId {
  if (shouldWearExecutiveSuit(state)) {
    return 'takim_elbise';
  }
  return profile.outfit;
}
