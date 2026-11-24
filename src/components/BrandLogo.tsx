import React from 'react';

interface BrandVisualSpec {
  bg1: string;
  bg2: string;
  accent: string;
  stroke: string;
  shape:
    | 'aviation'
    | 'defense'
    | 'retail'
    | 'ev'
    | 'energy'
    | 'bank-classic'
    | 'bank-gold'
    | 'bank-turkuaz'
    | 'steel'
    | 'telecom'
    | 'coffee'
    | 'culinary'
    | 'esports'
    | 'towers'
    | 'factory'
    | 'horizon'
    | 'crest';
  monogram?: string;
}

const FALLBACK_PALETTES: Array<[string, string, string]> = [
  ['#1E3A8A', '#0F172A', '#38BDF8'],
  ['#7C2D12', '#1C1917', '#F59E0B'],
  ['#065F46', '#064E3B', '#34D399'],
  ['#581C87', '#1E1B4B', '#C084FC'],
  ['#881337', '#1F1221', '#FB7185'],
  ['#155E75', '#0F172A', '#22D3EE'],
];

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getMonogram(label: string): string {
  const clean = label.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9\s]/g, '').trim();
  if (!clean) return 'TM';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function resolveBrandSpec(
  brandKey: string,
  customColor?: string
): BrandVisualSpec {
  const raw = (brandKey || '').trim();
  const key = raw.toLowerCase();

  // --- BIST Devleri ---
  if (key === 'thyl' || key.includes('hava yol')) {
    return { bg1: '#C8102E', bg2: '#7F091D', accent: '#FFFFFF', stroke: '#FCA5A5', shape: 'aviation' };
  }
  if (key === 'asls' || key.includes('aselsan')) {
    return { bg1: '#0F2B5B', bg2: '#081733', accent: '#38BDF8', stroke: '#7DD3FC', shape: 'defense' };
  }
  if (key === 'bimx' || key.includes('bim') || key.includes('birleşik mağaza')) {
    return { bg1: '#1D4ED8', bg2: '#0F256E', accent: '#F87171', stroke: '#93C5FD', shape: 'retail' };
  }
  if (key === 'togr' || key.includes('togg')) {
    return { bg1: '#0D9488', bg2: '#0F3D3E', accent: '#67E8F9', stroke: '#5EEAD4', shape: 'ev' };
  }
  if (key === 'tupr' || key.includes('tüpraş') || key.includes('tupras')) {
    return { bg1: '#C2410C', bg2: '#5C1C07', accent: '#FBBF24', stroke: '#FDBA74', shape: 'energy' };
  }
  if (key === 'grnt' || key.includes('garanti')) {
    return { bg1: '#059669', bg2: '#064E3B', accent: '#A7F3D0', stroke: '#6EE7B7', shape: 'bank-classic' };
  }
  if (key === 'ercl' || key.includes('erdemir') || key.includes('çelik')) {
    return { bg1: '#334155', bg2: '#0F172A', accent: '#F59E0B', stroke: '#94A3B8', shape: 'steel' };
  }
  if (key === 'trkc' || key.includes('turkcell')) {
    return { bg1: '#1E3A8A', bg2: '#0B1D51', accent: '#FACC15', stroke: '#FDE047', shape: 'telecom' };
  }

  // --- 3 System Banks & Custom Banks ---
  if (key.includes('anadolu ticaret') || key === 'sys-bank-anadolu') {
    return { bg1: '#1D4ED8', bg2: '#172554', accent: '#FCD34D', stroke: '#60A5FA', shape: 'bank-classic' };
  }
  if (key.includes('başkent yatırım') || key.includes('baskent yatirim') || key === 'sys-bank-baskent') {
    return { bg1: '#B45309', bg2: '#451A03', accent: '#FDE68A', stroke: '#FBBF24', shape: 'bank-gold' };
  }
  if (key.includes('turkuaz') || key === 'sys-bank-turkuaz') {
    return { bg1: '#0891B2', bg2: '#083344', accent: '#67E8F9', stroke: '#22D3EE', shape: 'bank-turkuaz' };
  }
  if (key.includes('bank')) {
    return {
      bg1: customColor || '#0F766E',
      bg2: '#0F172A',
      accent: '#FCD34D',
      stroke: '#5EEAD4',
      shape: 'bank-classic',
    };
  }

  // --- AI Franchises ---
  if (key.includes('boğaz kahve') || key.includes('bogaz kahve') || key === 'fr-seed-kahve') {
    return { bg1: '#92400E', bg2: '#3B1806', accent: '#FDE68A', stroke: '#F59E0B', shape: 'coffee' };
  }
  if (key.includes('anadolu sofra') || key === 'fr-seed-restoran') {
    return { bg1: '#9F1239', bg2: '#4C0519', accent: '#FDBA74', stroke: '#FB7185', shape: 'culinary' };
  }
  if (key.includes('e-spor') || key.includes('arena') || key === 'fr-seed-espor') {
    return { bg1: '#6D28D9', bg2: '#2E1065', accent: '#38BDF8', stroke: '#C4B5FD', shape: 'esports' };
  }
  if (key.includes('pera gross') || key === 'fr-seed-market') {
    return { bg1: '#047857', bg2: '#022C22', accent: '#FDE047', stroke: '#34D399', shape: 'retail' };
  }

  // --- AI Rival Holdings ---
  if (key.includes('demirhan')) {
    return { bg1: '#B91C1C', bg2: '#450A0A', accent: '#FBBF24', stroke: '#FCA5A5', shape: 'towers' };
  }
  if (key.includes('anadolu sanayi')) {
    return { bg1: '#3730A3', bg2: '#1E1B4B', accent: '#38BDF8', stroke: '#818CF8', shape: 'factory' };
  }
  if (key.includes('ege yatırım') || key.includes('ege yatirim') || key === 'egeh') {
    return { bg1: '#0E7490', bg2: '#083344', accent: '#FDE047', stroke: '#67E8F9', shape: 'horizon' };
  }
  if (key.includes('marmara')) {
    return { bg1: '#047857', bg2: '#064E3B', accent: '#A7F3D0', stroke: '#34D399', shape: 'retail' };
  }
  if (key.includes('başkent gayrimenkul') || key.includes('kocx') || key.includes('boğaziçi holding')) {
    return { bg1: '#6B21A8', bg2: '#2E1065', accent: '#FCD34D', stroke: '#D8B4FE', shape: 'towers' };
  }

  const palette = FALLBACK_PALETTES[hashString(raw || 'TM') % FALLBACK_PALETTES.length];
  return {
    bg1: customColor || palette[0],
    bg2: palette[1],
    accent: palette[2],
    stroke: palette[2],
    shape: 'crest',
    monogram: getMonogram(raw),
  };
}

function renderInnerPathsSvgString(spec: BrandVisualSpec): string {
  switch (spec.shape) {
    case 'aviation':
      return `<path d="M9 28 C14 21 21 15 31 11 C25 18 22 23 20 29 L16 25 L9 28 Z" fill="${spec.accent}" /><path d="M10 19 L25 13" stroke="${spec.stroke}" stroke-width="2" stroke-linecap="round"/>`;
    case 'defense':
      return `<path d="M20 7 L31 12 V21 C31 27.5 26.2 31.8 20 34 C13.8 31.8 9 27.5 9 21 V12 L20 7 Z" fill="none" stroke="${spec.accent}" stroke-width="2.2"/><circle cx="20" cy="19" r="3.2" fill="${spec.accent}"/><path d="M20 12 V15.5 M20 22.5 V27 M13.5 19 H16.5 M23.5 19 H26.5" stroke="${spec.stroke}" stroke-width="2" stroke-linecap="round"/>`;
    case 'retail':
      return `<path d="M10 14 H14 L16.5 25 H27.5 L30 17 H15" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="29.5" r="2" fill="${spec.accent}"/><circle cx="26.5" cy="29.5" r="2" fill="${spec.accent}"/><path d="M22 9 L23.4 12 L26.5 12.4 L24.2 14.4 L24.8 17.4 L22 15.8 L19.2 17.4 L19.8 14.4 L17.5 12.4 L20.6 12 Z" fill="${spec.accent}"/>`;
    case 'ev':
      return `<circle cx="20" cy="20" r="10.5" fill="none" stroke="${spec.stroke}" stroke-width="2.2"/><path d="M21.5 11.5 L15.5 21 H20.5 L18.5 28.5 L24.5 19 H19.5 L21.5 11.5 Z" fill="${spec.accent}"/>`;
    case 'energy':
      return `<path d="M20 8 C24.8 13.8 28.5 18.2 28.5 23 C28.5 27.8 24.7 31.5 20 31.5 C15.3 31.5 11.5 27.8 11.5 23 C11.5 18.2 15.2 13.8 20 8 Z" fill="${spec.accent}"/><path d="M20 16.5 C22.2 19.5 23.6 21.6 23.6 24 C23.6 26.2 22 27.8 20 27.8 C18 27.8 16.4 26.2 16.4 24 C16.4 21.6 17.8 19.5 20 16.5 Z" fill="${spec.bg2}"/>`;
    case 'bank-classic':
      return `<path d="M9 15 L20 9 L31 15 Z" fill="${spec.accent}"/><rect x="11.5" y="17" width="3" height="10" rx="1" fill="#FFFFFF"/><rect x="18.5" y="17" width="3" height="10" rx="1" fill="#FFFFFF"/><rect x="25.5" y="17" width="3" height="10" rx="1" fill="#FFFFFF"/><rect x="9" y="28.5" width="22" height="2.8" rx="1.2" fill="${spec.accent}"/>`;
    case 'bank-gold':
      return `<circle cx="20" cy="20" r="10" fill="none" stroke="${spec.accent}" stroke-width="2.4"/><circle cx="20" cy="20" r="3.5" fill="${spec.accent}"/><path d="M20 10 V14.5 M20 25.5 V30 M10 20 H14.5 M25.5 20 H30" stroke="${spec.stroke}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'bank-turkuaz':
      return `<polygon points="20,8 31,19 20,31 9,19" fill="none" stroke="${spec.accent}" stroke-width="2.4"/><path d="M12 22 Q16 18 20 22 T28 22" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="15.5" r="2.2" fill="${spec.accent}"/>`;
    case 'steel':
      return `<path d="M12 11 H28 V15 H22.5 V25 H28 V29 H12 V25 H17.5 V15 H12 Z" fill="#E2E8F0"/><circle cx="29" cy="11" r="2.2" fill="${spec.accent}"/>`;
    case 'telecom':
      return `<path d="M13 24 A9.5 9.5 0 0 1 27 24" fill="none" stroke="${spec.accent}" stroke-width="2.4" stroke-linecap="round"/><path d="M16 26.5 A5.5 5.5 0 0 1 24 26.5" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="29.5" r="2.2" fill="${spec.accent}"/><path d="M10 20.5 A13 13 0 0 1 30 20.5" fill="none" stroke="${spec.stroke}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
    case 'coffee':
      return `<path d="M11 17 H25 V24 C25 27.2 22.3 29.5 18 29.5 C13.7 29.5 11 27.2 11 24 Z" fill="${spec.accent}"/><path d="M25 18.5 H27.5 C29.2 18.5 30 19.8 30 21.3 C30 22.8 29.2 24 27.5 24 H25" fill="none" stroke="${spec.accent}" stroke-width="2.2"/><path d="M15 13 C15 11.5 16.5 11.2 16.5 9.8 M20.5 13 C20.5 11.5 22 11.2 22 9.8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>`;
    case 'culinary':
      return `<path d="M10 25 H30 C30 18.5 25.5 14 20 14 C14.5 14 10 18.5 10 25 Z" fill="${spec.accent}"/><circle cx="20" cy="11.5" r="2.2" fill="#FFFFFF"/><rect x="8.5" y="26.5" width="23" height="2.8" rx="1.4" fill="#FFFFFF"/>`;
    case 'esports':
      return `<rect x="9" y="15" width="22" height="12" rx="6" fill="none" stroke="${spec.accent}" stroke-width="2.3"/><path d="M15 18.5 V23.5 M12.5 21 H17.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><circle cx="24.5" cy="19.5" r="1.4" fill="${spec.accent}"/><circle cx="26.5" cy="22.5" r="1.4" fill="#FFFFFF"/>`;
    case 'towers':
      return `<rect x="10" y="17" width="6.5" height="14" rx="1.2" fill="#FFFFFF" opacity="0.9"/><rect x="17.5" y="10" width="7" height="21" rx="1.2" fill="${spec.accent}"/><rect x="25.5" y="15" width="5.5" height="16" rx="1.2" fill="#FFFFFF" opacity="0.85"/>`;
    case 'factory':
      return `<path d="M9 30 V18 L16 22 V17 L23 22 V14 H30 V30 Z" fill="${spec.accent}"/><rect x="12" y="25" width="3" height="3" fill="${spec.bg2}"/><rect x="18" y="25" width="3" height="3" fill="${spec.bg2}"/><rect x="24" y="25" width="3" height="3" fill="${spec.bg2}"/>`;
    case 'horizon':
      return `<circle cx="20" cy="15.5" r="5" fill="${spec.accent}"/><path d="M9 24.5 Q14.5 20.5 20 24.5 T31 24.5" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/><path d="M11 29 Q15.5 26 20 29 T29 29" fill="none" stroke="${spec.stroke}" stroke-width="2" stroke-linecap="round"/>`;
    case 'crest':
    default:
      return `<polygon points="20,7 32,13.5 32,26.5 20,33 8,26.5 8,13.5" fill="none" stroke="${spec.accent}" stroke-width="2"/><text x="20" y="24" text-anchor="middle" fill="#FFFFFF" font-family="system-ui,sans-serif" font-size="11.5" font-weight="900">${spec.monogram || 'TM'}</text>`;
  }
}

export function getBrandLogoSvgString(
  brandKey: string,
  size = 28,
  customColor?: string
): string {
  const spec = resolveBrandSpec(brandKey, customColor);
  const gradId = `bl-${hashString(`${brandKey}-${customColor || ''}`)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40" style="display:block;flex-shrink:0;">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${spec.bg1}" />
        <stop offset="100%" stop-color="${spec.bg2}" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="url(#${gradId})" stroke="${spec.stroke}" stroke-width="2" stroke-opacity="0.7" />
    ${renderInnerPathsSvgString(spec)}
  </svg>`;
}

interface BrandLogoProps {
  brandKey: string;
  size?: number;
  customColor?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  brandKey,
  size = 36,
  customColor,
  className = '',
}) => {
  const spec = resolveBrandSpec(brandKey, customColor);
  const gradId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`shrink-0 rounded-xl shadow-md ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={spec.bg1} />
          <stop offset="100%" stopColor={spec.bg2} />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="10"
        fill={`url(#${gradId})`}
        stroke={spec.stroke}
        strokeWidth="2"
        strokeOpacity="0.75"
      />
      {spec.shape === 'aviation' && (
        <>
          <path d="M9 28 C14 21 21 15 31 11 C25 18 22 23 20 29 L16 25 L9 28 Z" fill={spec.accent} />
          <path d="M10 19 L25 13" stroke={spec.stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {spec.shape === 'defense' && (
        <>
          <path
            d="M20 7 L31 12 V21 C31 27.5 26.2 31.8 20 34 C13.8 31.8 9 27.5 9 21 V12 L20 7 Z"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2.2"
          />
          <circle cx="20" cy="19" r="3.2" fill={spec.accent} />
          <path
            d="M20 12 V15.5 M20 22.5 V27 M13.5 19 H16.5 M23.5 19 H26.5"
            stroke={spec.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {spec.shape === 'retail' && (
        <>
          <path
            d="M10 14 H14 L16.5 25 H27.5 L30 17 H15"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="29.5" r="2" fill={spec.accent} />
          <circle cx="26.5" cy="29.5" r="2" fill={spec.accent} />
          <path
            d="M22 9 L23.4 12 L26.5 12.4 L24.2 14.4 L24.8 17.4 L22 15.8 L19.2 17.4 L19.8 14.4 L17.5 12.4 L20.6 12 Z"
            fill={spec.accent}
          />
        </>
      )}
      {spec.shape === 'ev' && (
        <>
          <circle cx="20" cy="20" r="10.5" fill="none" stroke={spec.stroke} strokeWidth="2.2" />
          <path
            d="M21.5 11.5 L15.5 21 H20.5 L18.5 28.5 L24.5 19 H19.5 L21.5 11.5 Z"
            fill={spec.accent}
          />
        </>
      )}
      {spec.shape === 'energy' && (
        <>
          <path
            d="M20 8 C24.8 13.8 28.5 18.2 28.5 23 C28.5 27.8 24.7 31.5 20 31.5 C15.3 31.5 11.5 27.8 11.5 23 C11.5 18.2 15.2 13.8 20 8 Z"
            fill={spec.accent}
          />
          <path
            d="M20 16.5 C22.2 19.5 23.6 21.6 23.6 24 C23.6 26.2 22 27.8 20 27.8 C18 27.8 16.4 26.2 16.4 24 C16.4 21.6 17.8 19.5 20 16.5 Z"
            fill={spec.bg2}
          />
        </>
      )}
      {spec.shape === 'bank-classic' && (
        <>
          <path d="M9 15 L20 9 L31 15 Z" fill={spec.accent} />
          <rect x="11.5" y="17" width="3" height="10" rx="1" fill="#FFFFFF" />
          <rect x="18.5" y="17" width="3" height="10" rx="1" fill="#FFFFFF" />
          <rect x="25.5" y="17" width="3" height="10" rx="1" fill="#FFFFFF" />
          <rect x="9" y="28.5" width="22" height="2.8" rx="1.2" fill={spec.accent} />
        </>
      )}
      {spec.shape === 'bank-gold' && (
        <>
          <circle cx="20" cy="20" r="10" fill="none" stroke={spec.accent} strokeWidth="2.4" />
          <circle cx="20" cy="20" r="3.5" fill={spec.accent} />
          <path
            d="M20 10 V14.5 M20 25.5 V30 M10 20 H14.5 M25.5 20 H30"
            stroke={spec.stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}
      {spec.shape === 'bank-turkuaz' && (
        <>
          <polygon points="20,8 31,19 20,31 9,19" fill="none" stroke={spec.accent} strokeWidth="2.4" />
          <path
            d="M12 22 Q16 18 20 22 T28 22"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="20" cy="15.5" r="2.2" fill={spec.accent} />
        </>
      )}
      {spec.shape === 'steel' && (
        <>
          <path d="M12 11 H28 V15 H22.5 V25 H28 V29 H12 V25 H17.5 V15 H12 Z" fill="#E2E8F0" />
          <circle cx="29" cy="11" r="2.2" fill={spec.accent} />
        </>
      )}
      {spec.shape === 'telecom' && (
        <>
          <path
            d="M13 24 A9.5 9.5 0 0 1 27 24"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M16 26.5 A5.5 5.5 0 0 1 24 26.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="20" cy="29.5" r="2.2" fill={spec.accent} />
          <path
            d="M10 20.5 A13 13 0 0 1 30 20.5"
            fill="none"
            stroke={spec.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
        </>
      )}
      {spec.shape === 'coffee' && (
        <>
          <path
            d="M11 17 H25 V24 C25 27.2 22.3 29.5 18 29.5 C13.7 29.5 11 27.2 11 24 Z"
            fill={spec.accent}
          />
          <path
            d="M25 18.5 H27.5 C29.2 18.5 30 19.8 30 21.3 C30 22.8 29.2 24 27.5 24 H25"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2.2"
          />
          <path
            d="M15 13 C15 11.5 16.5 11.2 16.5 9.8 M20.5 13 C20.5 11.5 22 11.2 22 9.8"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {spec.shape === 'culinary' && (
        <>
          <path d="M10 25 H30 C30 18.5 25.5 14 20 14 C14.5 14 10 18.5 10 25 Z" fill={spec.accent} />
          <circle cx="20" cy="11.5" r="2.2" fill="#FFFFFF" />
          <rect x="8.5" y="26.5" width="23" height="2.8" rx="1.4" fill="#FFFFFF" />
        </>
      )}
      {spec.shape === 'esports' && (
        <>
          <rect
            x="9"
            y="15"
            width="22"
            height="12"
            rx="6"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2.3"
          />
          <path
            d="M15 18.5 V23.5 M12.5 21 H17.5"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="24.5" cy="19.5" r="1.4" fill={spec.accent} />
          <circle cx="26.5" cy="22.5" r="1.4" fill="#FFFFFF" />
        </>
      )}
      {spec.shape === 'towers' && (
        <>
          <rect x="10" y="17" width="6.5" height="14" rx="1.2" fill="#FFFFFF" opacity="0.9" />
          <rect x="17.5" y="10" width="7" height="21" rx="1.2" fill={spec.accent} />
          <rect x="25.5" y="15" width="5.5" height="16" rx="1.2" fill="#FFFFFF" opacity="0.85" />
        </>
      )}
      {spec.shape === 'factory' && (
        <>
          <path d="M9 30 V18 L16 22 V17 L23 22 V14 H30 V30 Z" fill={spec.accent} />
          <rect x="12" y="25" width="3" height="3" fill={spec.bg2} />
          <rect x="18" y="25" width="3" height="3" fill={spec.bg2} />
          <rect x="24" y="25" width="3" height="3" fill={spec.bg2} />
        </>
      )}
      {spec.shape === 'horizon' && (
        <>
          <circle cx="20" cy="15.5" r="5" fill={spec.accent} />
          <path
            d="M9 24.5 Q14.5 20.5 20 24.5 T31 24.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M11 29 Q15.5 26 20 29 T29 29"
            fill="none"
            stroke={spec.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {spec.shape === 'crest' && (
        <>
          <polygon
            points="20,7 32,13.5 32,26.5 20,33 8,26.5 8,13.5"
            fill="none"
            stroke={spec.accent}
            strokeWidth="2"
          />
          <text
            x="20"
            y="24"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="system-ui, sans-serif"
            fontSize="11.5"
            fontWeight="900"
          >
            {spec.monogram || 'TM'}
          </text>
        </>
      )}
    </svg>
  );
};
