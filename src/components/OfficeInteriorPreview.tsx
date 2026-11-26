import type { OfficeTierId } from '../types/game';

interface OfficeInteriorPreviewProps {
  tierId: OfficeTierId;
  className?: string;
}

/**
 * Crisp architectural interior illustration tailored to each of the 4 office tiers:
 * - home_office: Warm boutique home studio with desk lamp, dual monitors & city dusk window
 * - plaza_floor: Glass-facade modern plaza floor with Levent skyline & conference table
 * - bosphorus_suite: Panoramic Bosphorus executive suite overlooking Istanbul Strait & suspension bridge
 * - holding_tower: Penthouse skyscraper boardroom above the clouds with golden sunset horizon
 */
export function OfficeInteriorPreview({ tierId, className = '' }: OfficeInteriorPreviewProps) {
  if (tierId === 'bosphorus_suite') {
    return (
      <svg
        viewBox="0 0 360 175"
        preserveAspectRatio="xMidYMid slice"
        className={`h-full w-full ${className}`}
        role="img"
        aria-label="Boğaz Manzaralı Yönetici Ofisi iç mekan önizlemesi"
      >
        <defs>
          <linearGradient id="bosphSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="48%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
          <linearGradient id="bosphSea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0E7490" />
          </linearGradient>
          <linearGradient id="bosphFloor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="bosphDesk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5C3A21" />
            <stop offset="50%" stopColor="#7C4D2B" />
            <stop offset="100%" stopColor="#452715" />
          </linearGradient>
          <linearGradient id="bosphCeil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
        </defs>

        {/* Panoramic Window Sky & Bosphorus Sea */}
        <rect x="0" y="0" width="360" height="175" fill="url(#bosphSky)" />
        {/* Soft clouds */}
        <ellipse cx="90" cy="36" rx="42" ry="8" fill="#FFFFFF" opacity="0.55" />
        <ellipse cx="260" cy="28" rx="52" ry="9" fill="#FFFFFF" opacity="0.5" />

        {/* Distant Istanbul Hills & Skyline */}
        <path
          d="M0 78 Q55 62 120 72 T240 68 T360 76 L360 95 L0 95 Z"
          fill="#64748B"
          opacity="0.52"
        />
        {/* Subtle skyline silhouettes */}
        <g fill="#475569" opacity="0.62">
          <rect x="34" y="64" width="12" height="18" />
          <rect x="50" y="58" width="9" height="24" />
          <rect x="64" y="67" width="15" height="15" />
          <rect x="275" y="61" width="11" height="20" />
          <rect x="290" y="55" width="14" height="26" />
          <rect x="310" y="66" width="12" height="15" />
        </g>

        {/* Bosphorus Strait Water */}
        <rect x="0" y="82" width="360" height="38" fill="url(#bosphSea)" />
        {/* Sunlight shimmer on water */}
        <path d="M115 92 L245 92" stroke="#BAE6FD" strokeWidth="1.2" opacity="0.55" />
        <path d="M140 99 L230 99" stroke="#E0F2FE" strokeWidth="1" opacity="0.45" />
        <path d="M155 106 L215 106" stroke="#FEF08A" strokeWidth="1" opacity="0.4" />

        {/* Bosphorus Suspension Bridge */}
        <g stroke="#E2E8F0" strokeLinecap="round" fill="none">
          <line x1="128" y1="45" x2="128" y2="85" strokeWidth="2.6" />
          <line x1="234" y1="45" x2="234" y2="85" strokeWidth="2.6" />
          <path d="M72 78 Q100 66 128 46 Q181 78 234 46 Q262 66 290 78" strokeWidth="1.4" />
          <line x1="72" y1="78" x2="290" y2="78" strokeWidth="1.6" stroke="#F8FAFC" />
          {[144, 160, 176, 192, 208, 222].map((x) => (
            <line key={x} x1={x} y1="62" x2={x} y2="78" strokeWidth="0.6" opacity="0.7" />
          ))}
        </g>

        {/* Architectural Ceiling & Window Mullions */}
        <polygon points="0,0 360,0 340,22 20,22" fill="url(#bosphCeil)" />
        <line x1="20" y1="22" x2="340" y2="22" stroke="#38BDF8" strokeWidth="1" opacity="0.55" />
        {/* Vertical glass window dividers */}
        <g stroke="#1E293B" strokeWidth="3.5">
          <line x1="48" y1="18" x2="48" y2="122" />
          <line x1="116" y1="20" x2="116" y2="120" />
          <line x1="184" y1="20" x2="184" y2="120" />
          <line x1="252" y1="20" x2="252" y2="120" />
          <line x1="316" y1="18" x2="316" y2="122" />
        </g>
        {/* Warm recessed ceiling spotlights */}
        {[90, 180, 270].map((cx) => (
          <ellipse key={cx} cx={cx} cy="11" rx="14" ry="2.5" fill="#FDE68A" opacity="0.75" />
        ))}

        {/* Polished Marble Floor */}
        <polygon points="0,118 360,118 360,175 0,175" fill="url(#bosphFloor)" />
        {/* Floor reflection */}
        <polygon points="56,118 304,118 338,175 22,175" fill="#93C5FD" opacity="0.14" />

        {/* Left Bookcase / Credenza */}
        <rect x="6" y="72" width="32" height="62" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
        <rect x="10" y="80" width="24" height="5" rx="1" fill="#F59E0B" opacity="0.55" />
        <rect x="10" y="92" width="24" height="5" rx="1" fill="#38BDF8" opacity="0.45" />
        <rect x="10" y="104" width="24" height="5" rx="1" fill="#94A3B8" opacity="0.45" />

        {/* Executive Mahogany Desk */}
        <polygon points="88,122 216,122 228,132 76,132" fill="#8C5A34" />
        <rect x="82" y="132" width="138" height="24" rx="2" fill="url(#bosphDesk)" stroke="#B45309" strokeWidth="0.8" />
        <rect x="94" y="136" width="114" height="14" rx="1.5" fill="#2E1A0E" opacity="0.45" />

        {/* Sleek Monitor & Laptop on Desk */}
        <rect x="136" y="108" width="28" height="15" rx="1.5" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.9" />
        <rect x="148" y="123" width="4" height="4" fill="#94A3B8" />
        <rect x="176" y="118" width="16" height="6" rx="1" fill="#CBD5E1" />

        {/* Executive Leather Chair Behind Desk */}
        <rect x="114" y="96" width="22" height="28" rx="6" fill="#1E1B18" stroke="#78350F" strokeWidth="1" />
        <rect x="118" y="100" width="14" height="14" rx="3" fill="#292524" />

        {/* Visitor Lounge Chairs on Right */}
        <g>
          <rect x="256" y="122" width="30" height="22" rx="6" fill="#3F2E21" stroke="#A16207" strokeWidth="0.9" />
          <rect x="294" y="126" width="30" height="24" rx="6" fill="#3F2E21" stroke="#A16207" strokeWidth="0.9" />
          <ellipse cx="288" cy="156" rx="24" ry="5" fill="#0F172A" stroke="#64748B" strokeWidth="0.8" />
        </g>

        {/* Subtle Dark Vignette Framing */}
        <rect x="0" y="0" width="360" height="175" fill="none" stroke="rgba(251,191,36,0.28)" strokeWidth="2" />
      </svg>
    );
  }

  if (tierId === 'holding_tower') {
    return (
      <svg
        viewBox="0 0 360 175"
        preserveAspectRatio="xMidYMid slice"
        className={`h-full w-full ${className}`}
        role="img"
        aria-label="Holding Gökdeleni iç mekan önizlemesi"
      >
        <defs>
          <linearGradient id="towerSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="48%" stopColor="#4C1D95" />
            <stop offset="85%" stopColor="#C2410C" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="towerFloor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="50%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#090D18" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="360" height="175" fill="url(#towerSky)" />
        {/* Cloud deck & skyscrapers far below */}
        <g fill="#0F172A" opacity="0.65">
          <rect x="28" y="72" width="22" height="50" />
          <rect x="58" y="54" width="18" height="68" />
          <rect x="82" y="64" width="24" height="58" />
          <rect x="242" y="58" width="20" height="64" />
          <rect x="270" y="46" width="26" height="76" />
          <rect x="304" y="66" width="24" height="56" />
        </g>
        {/* Glowing skyscraper windows */}
        <g fill="#FDE68A" opacity="0.8">
          {[62, 70, 78, 86, 94].map((y) => (
            <g key={y}>
              <rect x="62" y={y} width="4" height="3" />
              <rect x="69" y={y} width="4" height="3" />
              <rect x="275" y={y - 6} width="5" height="3" />
              <rect x="284" y={y - 6} width="5" height="3" />
            </g>
          ))}
        </g>
        {/* Penthouse Ceiling with Gold LED Strip */}
        <polygon points="0,0 360,0 338,22 22,22" fill="#090D18" />
        <line x1="22" y1="22" x2="338" y2="22" stroke="#FBBF24" strokeWidth="1.4" opacity="0.85" />
        {/* Floor-to-ceiling black steel mullions */}
        <g stroke="#090D18" strokeWidth="4">
          <line x1="56" y1="18" x2="56" y2="122" />
          <line x1="142" y1="20" x2="142" y2="120" />
          <line x1="218" y1="20" x2="218" y2="120" />
          <line x1="304" y1="18" x2="304" y2="122" />
        </g>
        {/* Black Marble Penthouse Floor */}
        <polygon points="0,118 360,118 360,175 0,175" fill="url(#towerFloor)" />
        <polygon points="70,118 290,118 328,175 32,175" fill="#F59E0B" opacity="0.1" />
        {/* CEO Glass & Obsidian Executive Table */}
        <polygon points="86,122 274,122 292,136 68,136" fill="#1E293B" stroke="#A78BFA" strokeWidth="1" />
        <rect x="78" y="136" width="204" height="22" rx="3" fill="#0B1120" stroke="#7C3AED" strokeWidth="1" />
        <line x1="94" y1="145" x2="266" y2="145" stroke="#FBBF24" strokeWidth="1.2" opacity="0.7" />
        {/* Dual curved ultrawide displays */}
        <path d="M148 106 Q180 101 212 106 L212 120 Q180 116 148 120 Z" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
        {/* High-back CEO Throne Chair */}
        <rect x="166" y="88" width="28" height="32" rx="8" fill="#18181B" stroke="#F59E0B" strokeWidth="1.2" />
      </svg>
    );
  }

  if (tierId === 'plaza_floor') {
    return (
      <svg
        viewBox="0 0 360 175"
        preserveAspectRatio="xMidYMid slice"
        className={`h-full w-full ${className}`}
        role="img"
        aria-label="Plaza Katı iç mekan önizlemesi"
      >
        <defs>
          <linearGradient id="plazaSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0C4A6E" />
            <stop offset="55%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>
          <linearGradient id="plazaFloor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="360" height="175" fill="url(#plazaSky)" />
        {/* Modern Business District Towers */}
        <g fill="#0F172A" opacity="0.58">
          <rect x="20" y="42" width="34" height="80" />
          <rect x="64" y="28" width="28" height="94" />
          <rect x="102" y="52" width="32" height="70" />
          <rect x="220" y="34" width="36" height="88" />
          <rect x="266" y="48" width="30" height="74" />
          <rect x="304" y="26" width="34" height="96" />
        </g>
        <g fill="#BAE6FD" opacity="0.55">
          {[40, 52, 64, 76, 88].map((y) => (
            <g key={y}>
              <rect x="70" y={y} width="16" height="4" />
              <rect x="228" y={y + 4} width="20" height="4" />
              <rect x="312" y={y} width="18" height="4" />
            </g>
          ))}
        </g>
        {/* Sleek Corporate Ceiling */}
        <polygon points="0,0 360,0 342,20 18,20" fill="#0B1221" />
        <line x1="18" y1="20" x2="342" y2="20" stroke="#22D3EE" strokeWidth="1.2" opacity="0.7" />
        <g stroke="#1E293B" strokeWidth="3.5">
          <line x1="72" y1="18" x2="72" y2="122" />
          <line x1="180" y1="18" x2="180" y2="122" />
          <line x1="288" y1="18" x2="288" y2="122" />
        </g>
        {/* Corporate Floor */}
        <polygon points="0,118 360,118 360,175 0,175" fill="url(#plazaFloor)" />
        {/* Modern Executive Desk */}
        <polygon points="95,122 265,122 278,134 82,134" fill="#334155" stroke="#38BDF8" strokeWidth="0.9" />
        <rect x="90" y="134" width="180" height="22" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="0.9" />
        {/* Dual Monitors */}
        <rect x="142" y="106" width="32" height="16" rx="1.5" fill="#090D18" stroke="#22D3EE" strokeWidth="1" />
        <rect x="180" y="108" width="26" height="14" rx="1.5" fill="#090D18" stroke="#38BDF8" strokeWidth="1" />
        {/* Ergonomic Chair */}
        <rect x="112" y="96" width="22" height="26" rx="5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" />
      </svg>
    );
  }

  // Default: home_office (Home Ofis / Küçük Büro)
  return (
    <svg
      viewBox="0 0 360 175"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="Home Ofis / Küçük Büro iç mekan önizlemesi"
    >
      <defs>
        <linearGradient id="homeWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="homeWindow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="60%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Room Wall */}
      <rect x="0" y="0" width="360" height="122" fill="url(#homeWall)" />
      {/* Cozy Window overlooking neighborhood dusk */}
      <rect x="110" y="18" width="140" height="76" rx="4" fill="url(#homeWindow)" stroke="#475569" strokeWidth="3" />
      <line x1="180" y1="18" x2="180" y2="94" stroke="#334155" strokeWidth="2.5" />
      <path d="M112 80 L132 70 L152 78 L175 66 L205 74 L232 68 L248 76 L248 92 L112 92 Z" fill="#0F172A" opacity="0.6" />

      {/* Wall Shelves & Books */}
      <rect x="20" y="34" width="68" height="5" rx="1.5" fill="#78350F" />
      <rect x="26" y="20" width="8" height="14" rx="1" fill="#38BDF8" />
      <rect x="36" y="22" width="7" height="12" rx="1" fill="#F59E0B" />
      <rect x="45" y="19" width="9" height="15" rx="1" fill="#10B981" />
      <rect x="20" y="64" width="68" height="5" rx="1.5" fill="#78350F" />

      {/* Corkboard / Goal Chart on Right Wall */}
      <rect x="272" y="28" width="68" height="44" rx="3" fill="#0B1221" stroke="#38BDF8" strokeWidth="1" />
      <polyline points="282,60 296,52 308,56 328,38" fill="none" stroke="#34D399" strokeWidth="2" />

      {/* Warm Wooden Floor */}
      <rect x="0" y="122" width="360" height="53" fill="#1E1B18" />

      {/* Compact Entrepreneur Desk */}
      <rect x="76" y="114" width="208" height="10" rx="2" fill="#92400E" stroke="#B45309" strokeWidth="0.9" />
      <rect x="86" y="124" width="10" height="42" fill="#475569" />
      <rect x="264" y="124" width="10" height="42" fill="#475569" />

      {/* Laptop, Warm Desk Lamp & Coffee Mug */}
      <rect x="148" y="92" width="46" height="22" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
      <rect x="152" y="96" width="38" height="14" rx="1" fill="#1E3A8A" opacity="0.65" />
      <path d="M104 114 L108 92 L120 86" fill="none" stroke="#94A3B8" strokeWidth="2" />
      <circle cx="122" cy="87" r="6" fill="#FDE68A" opacity="0.85" />
      <rect x="216" y="105" width="9" height="9" rx="2" fill="#F59E0B" />

      {/* Office Chair */}
      <rect x="158" y="120" width="34" height="30" rx="7" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
    </svg>
  );
}
