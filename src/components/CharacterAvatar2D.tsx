import type { CharacterOutfitId, CharacterProfile } from '../types/game';

interface CharacterAvatar2DProps {
  profile: CharacterProfile;
  effectiveOutfit?: CharacterOutfitId;
  mode?: 'full' | 'bust';
  showBackdrop?: boolean;
  className?: string;
}

/**
 * Clean 2D vector character renderer matching the matte dark-slate reference style.
 * Supports full-body preview (with optional architectural cafe/shop backdrop) and bust/portrait mode.
 */
export function CharacterAvatar2D({
  profile,
  effectiveOutfit,
  mode = 'full',
  showBackdrop = false,
  className = 'h-full w-full',
}: CharacterAvatar2DProps) {
  const outfit: CharacterOutfitId = effectiveOutfit ?? profile.outfit;
  const isFemale = profile.gender === 'female';
  const skin = profile.skinTone;
  const hair = profile.hairColor;
  const cloth = profile.outfitColor;
  const stroke = '#181F29';

  // Inner sleeve / base shirt tones paired cleanly with outfit color
  const underShirtFill =
    outfit === 'barista_onlugu'
      ? '#7A9285'
      : outfit === 'isci_tulumu'
      ? '#D8DEE6'
      : outfit === 'takim_elbise'
      ? '#E2E8F0'
      : cloth;

  const pantsFill =
    outfit === 'isci_tulumu'
      ? cloth
      : outfit === 'takim_elbise'
      ? '#232C3A'
      : '#344154';

  const viewBox = mode === 'bust' ? '56 32 128 134' : '0 0 240 278';

  return (
    <svg
      viewBox={viewBox}
      className={`${className} select-none`}
      role="img"
      aria-label={`${profile.name || 'Karakter'} 2D görünüm önizlemesi`}
    >
      {/* Subtle architectural shop/cafe interior silhouette (matches reference) */}
      {showBackdrop && mode === 'full' && (
        <g aria-hidden="true">
          <rect x="0" y="0" width="240" height="278" rx="14" fill="#25303F" />
          {/* Back wall lines */}
          <rect
            x="16"
            y="40"
            width="62"
            height="42"
            rx="4"
            fill="#202A37"
            stroke="#313E50"
            strokeWidth="1.5"
          />
          <rect
            x="176"
            y="44"
            width="52"
            height="68"
            rx="3"
            fill="#202A37"
            stroke="#313E50"
            strokeWidth="1.5"
          />
          {/* Silhouette counter & stool */}
          <rect
            x="146"
            y="148"
            width="86"
            height="12"
            rx="2"
            fill="#202A37"
            stroke="#313E50"
            strokeWidth="1.5"
          />
          <rect
            x="156"
            y="160"
            width="68"
            height="58"
            fill="#1E2734"
            stroke="#313E50"
            strokeWidth="1.5"
          />
          {/* Floor line */}
          <line x1="0" y1="226" x2="240" y2="226" stroke="#313E50" strokeWidth="1.5" />
          <rect x="0" y="227" width="240" height="51" fill="#1F2937" />
          {/* Soft floor shadow under feet */}
          <ellipse cx="120" cy="252" rx="34" ry="7" fill="#141A23" opacity="0.7" />
        </g>
      )}

      {/* BACK HAIR LAYER (behind neck/shoulders for longer styles) */}
      {profile.hairStyle === 'uzun' && (
        <path
          d={
            isFemale
              ? 'M 94 74 Q 90 120 96 146 L 144 146 Q 150 120 146 74 Q 140 50 120 50 Q 100 50 94 74 Z'
              : 'M 96 76 Q 94 114 98 134 L 142 134 Q 146 114 144 76 Q 138 52 120 52 Q 102 52 96 76 Z'
          }
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'dalgali' && (
        <path
          d="M 93 74 Q 87 98 94 116 Q 89 132 97 142 L 143 142 Q 151 132 146 116 Q 153 98 147 74 Q 140 49 120 49 Q 100 49 93 74 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'kut' && (
        <path
          d="M 94 74 Q 91 105 97 116 L 143 116 Q 149 105 146 74 Q 139 50 120 50 Q 101 50 94 74 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'topuz' && (
        <g>
          <circle cx="120" cy="44" r="14" fill={hair} stroke={stroke} strokeWidth="2.2" />
          <path
            d="M 109 49 Q 120 54 131 49"
            fill="none"
            stroke="#C8AE7D"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* LEGS & SHOES (Full-body mode) */}
      {mode === 'full' && (
        <g>
          {/* Left & right trousers */}
          <path
            d={
              isFemale
                ? 'M 102 182 L 105 242 L 117 242 L 119 194 L 121 194 L 123 242 L 135 242 L 138 182 Z'
                : 'M 99 180 L 102 242 L 116 242 L 119 194 L 121 194 L 124 242 L 138 242 L 141 180 Z'
            }
            fill={pantsFill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Shoes */}
          <path
            d="M 101 241 Q 96 249 104 251 L 118 251 L 118 241 Z"
            fill="#273140"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M 122 241 L 122 251 L 136 251 Q 144 249 139 241 Z"
            fill="#273140"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* ARMS & HANDS */}
      <g>
        {/* Left arm */}
        <path
          d={
            isFemale
              ? 'M 99 114 Q 90 138 89 166 L 98 166 Q 100 144 105 126 Z'
              : 'M 94 112 Q 86 138 86 168 L 96 168 Q 98 144 102 126 Z'
          }
          fill={outfit === 'takim_elbise' ? '#232C3A' : underShirtFill}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Right arm */}
        <path
          d={
            isFemale
              ? 'M 141 114 Q 150 138 151 166 L 142 166 Q 140 144 135 126 Z'
              : 'M 146 112 Q 154 138 154 168 L 144 168 Q 142 144 138 126 Z'
          }
          fill={outfit === 'takim_elbise' ? '#232C3A' : underShirtFill}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Hands */}
        <ellipse
          cx={isFemale ? 93.5 : 91}
          cy={isFemale ? 172 : 174}
          rx="5"
          ry="7.5"
          fill={skin}
          stroke={stroke}
          strokeWidth="2"
        />
        <ellipse
          cx={isFemale ? 146.5 : 149}
          cy={isFemale ? 172 : 174}
          rx="5"
          ry="7.5"
          fill={skin}
          stroke={stroke}
          strokeWidth="2"
        />
      </g>

      {/* TORSO BASE + OUTFITS */}
      <g>
        {/* Base Torso Silhouette */}
        <path
          d={
            isFemale
              ? 'M 98 114 Q 120 107 142 114 L 139 184 L 101 184 Z'
              : 'M 94 112 Q 120 105 146 112 L 142 184 L 98 184 Z'
          }
          fill={underShirtFill}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* OUTFIT 1: BARISTA ÖNLÜĞÜ */}
        {outfit === 'barista_onlugu' && (
          <g>
            {/* Neck & shoulder straps */}
            <path
              d="M 109 111 L 109 128 M 131 111 L 131 128"
              stroke={cloth}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M 109 111 L 109 128 M 131 111 L 131 128"
              stroke={stroke}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Apron body */}
            <path
              d={
                isFemale
                  ? 'M 105 127 L 135 127 L 140 198 L 100 198 Z'
                  : 'M 103 127 L 137 127 L 142 198 L 98 198 Z'
              }
              fill={cloth}
              stroke={stroke}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Chest pocket */}
            <rect
              x="112"
              y="135"
              width="16"
              height="11"
              rx="2"
              fill="none"
              stroke={stroke}
              strokeWidth="1.5"
            />
            {/* Waist tie band */}
            <line x1="103" y1="156" x2="137" y2="156" stroke={stroke} strokeWidth="1.6" />
          </g>
        )}

        {/* OUTFIT 2: GÜNLÜK KIYAFET (Hoodie) */}
        {outfit === 'gunluk_kiyafet' && (
          <g>
            {/* Hood collar */}
            <path
              d="M 105 112 Q 120 124 135 112"
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Drawstrings */}
            <line x1="115" y1="118" x2="115" y2="136" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="125" y1="118" x2="125" y2="136" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
            {/* Kangaroo pocket */}
            <path
              d="M 107 156 L 133 156 L 135 174 L 105 174 Z"
              fill="#000000"
              fillOpacity="0.12"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Bottom hem */}
            <rect x="100" y="178" width="40" height="6" rx="2" fill="#000000" fillOpacity="0.16" />
          </g>
        )}

        {/* OUTFIT 3: OFİS GÖMLEĞİ */}
        {outfit === 'ofis_gomlegi' && (
          <g>
            {/* Crisp shirt collar */}
            <polygon
              points="110,111 120,124 114,125 106,115"
              fill="#F1F5F9"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <polygon
              points="130,111 120,124 126,125 134,115"
              fill="#F1F5F9"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Center placket & buttons */}
            <line x1="120" y1="124" x2="120" y2="183" stroke={stroke} strokeWidth="1.4" />
            {[134, 148, 162, 174].map((by) => (
              <circle key={by} cx="120" cy={by} r="1.6" fill="#E2E8F0" stroke={stroke} strokeWidth="0.9" />
            ))}
            {/* Chest pocket */}
            <rect
              x="125"
              y="134"
              width="11"
              height="10"
              rx="1.5"
              fill="#000000"
              fillOpacity="0.1"
              stroke={stroke}
              strokeWidth="1.3"
            />
          </g>
        )}

        {/* OUTFIT 4: İŞÇİ TULUMU */}
        {outfit === 'isci_tulumu' && (
          <g>
            {/* Overalls straps */}
            <rect x="106" y="111" width="6" height="22" fill={cloth} stroke={stroke} strokeWidth="1.6" />
            <rect x="128" y="111" width="6" height="22" fill={cloth} stroke={stroke} strokeWidth="1.6" />
            {/* Metallic brass buckles */}
            <circle cx="109" cy="131" r="2.1" fill="#C8AE7D" stroke={stroke} strokeWidth="1" />
            <circle cx="131" cy="131" r="2.1" fill="#C8AE7D" stroke={stroke} strokeWidth="1" />
            {/* Bib & lower overalls */}
            <path
              d="M 104 131 L 136 131 L 138 154 L 142 188 L 98 188 L 102 154 Z"
              fill={cloth}
              stroke={stroke}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Utility pocket */}
            <rect
              x="111"
              y="138"
              width="18"
              height="12"
              rx="2"
              fill="#000000"
              fillOpacity="0.14"
              stroke={stroke}
              strokeWidth="1.4"
            />
            <line x1="101" y1="164" x2="139" y2="164" stroke={stroke} strokeWidth="1.5" />
          </g>
        )}

        {/* OUTFIT 5: TAKIM ELBİSE (Auto Executive Progression) */}
        {outfit === 'takim_elbise' && (
          <g>
            {/* Dark executive blazer */}
            <path
              d={
                isFemale
                  ? 'M 98 114 Q 120 107 142 114 L 140 186 L 100 186 Z'
                  : 'M 94 112 Q 120 105 146 112 L 143 186 L 97 186 Z'
              }
              fill="#232C3A"
              stroke={stroke}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Crisp white V-shirt */}
            <polygon points="110,111 130,111 120,145" fill="#F1F5F9" stroke={stroke} strokeWidth="1.5" />
            {/* Pastel Gold Tie */}
            <polygon points="118,116 122,116 124,138 120,145 116,138" fill="#C8AE7D" stroke={stroke} strokeWidth="1.2" />
            {/* Jacket lapels */}
            <polygon points="109,112 118,144 106,138" fill="#2F3B4E" stroke={stroke} strokeWidth="1.4" />
            <polygon points="131,112 122,144 134,138" fill="#2F3B4E" stroke={stroke} strokeWidth="1.4" />
            {/* Gold pocket square */}
            <polygon points="127,138 135,138 133,134" fill="#C8AE7D" />
          </g>
        )}
      </g>

      {/* NECK */}
      <rect
        x="113"
        y="99"
        width="14"
        height="16"
        rx="5"
        fill={skin}
        stroke={stroke}
        strokeWidth="2"
      />

      {/* EARS */}
      <circle cx="98" cy="83" r="5" fill={skin} stroke={stroke} strokeWidth="2" />
      <circle cx="142" cy="83" r="5" fill={skin} stroke={stroke} strokeWidth="2" />

      {/* EARRING ACCESSORY (Küpe) */}
      {profile.accessory === 'kupe' && (
        <g>
          <circle cx="96.5" cy="90" r="3.2" fill="none" stroke="#C8AE7D" strokeWidth="2.2" />
          <circle cx="143.5" cy="90" r="3.2" fill="none" stroke="#C8AE7D" strokeWidth="2.2" />
        </g>
      )}

      {/* HEAD */}
      <path
        d={
          isFemale
            ? 'M 99 78 Q 99 56 120 56 Q 141 56 141 78 Q 141 102 120 105 Q 99 102 99 78 Z'
            : 'M 98 77 Q 98 55 120 55 Q 142 55 142 77 L 140 94 Q 134 105 120 106 Q 106 105 100 94 Z'
        }
        fill={skin}
        stroke={stroke}
        strokeWidth="2.2"
      />

      {/* FACIAL FEATURES */}
      <g>
        {/* Eyebrows */}
        <path
          d={isFemale ? 'M 106 74 Q 111 71.5 115 73.5' : 'M 105 73 L 116 73.5'}
          fill="none"
          stroke={hair}
          strokeWidth={isFemale ? '1.8' : '2.4'}
          strokeLinecap="round"
        />
        <path
          d={isFemale ? 'M 125 73.5 Q 129 71.5 134 74' : 'M 124 73.5 L 135 73'}
          fill="none"
          stroke={hair}
          strokeWidth={isFemale ? '1.8' : '2.4'}
          strokeLinecap="round"
        />
        {/* Eyes */}
        <circle cx="111" cy="81" r="2.3" fill={stroke} />
        <circle cx="129" cy="81" r="2.3" fill={stroke} />
        {isFemale && (
          <>
            <line x1="107.5" y1="79.5" x2="109" y2="80.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
            <line x1="132.5" y1="79.5" x2="131" y2="80.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
        {/* Subtle cheek blush */}
        <ellipse cx="105" cy="87.5" rx="3.4" ry="1.8" fill="#D98B7C" opacity={isFemale ? '0.45' : '0.2'} />
        <ellipse cx="135" cy="87.5" rx="3.4" ry="1.8" fill="#D98B7C" opacity={isFemale ? '0.45' : '0.2'} />
        {/* Nose */}
        <path d="M 120 82 L 119 88 L 121.5 88" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />

        {/* BEARD / MUSTACHE ACCESSORY (Sakal/Bıyık) */}
        {profile.accessory === 'sakal_biyik' && (
          <g>
            <path
              d="M 101 89 Q 103 105 120 107 Q 137 105 139 89 Q 133 96 120 96 Q 107 96 101 89 Z"
              fill={hair}
              opacity="0.88"
              stroke={stroke}
              strokeWidth="1.3"
            />
            <path
              d="M 111 91 Q 120 88 129 91 Q 124 94.5 120 93 Q 116 94.5 111 91 Z"
              fill={hair}
              stroke={stroke}
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* Friendly Smile */}
        <path
          d="M 114 93.5 Q 120 98.5 126 93.5"
          fill="none"
          stroke={profile.accessory === 'sakal_biyik' ? '#F1F5F9' : stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* GLASSES ACCESSORY (Gözlük) */}
        {profile.accessory === 'gozluk' && (
          <g>
            <rect
              x="103"
              y="76"
              width="14.5"
              height="10.5"
              rx="3"
              fill="#7E96B0"
              fillOpacity="0.18"
              stroke="#181F29"
              strokeWidth="1.8"
            />
            <rect
              x="122.5"
              y="76"
              width="14.5"
              height="10.5"
              rx="3"
              fill="#7E96B0"
              fillOpacity="0.18"
              stroke="#181F29"
              strokeWidth="1.8"
            />
            <line x1="117.5" y1="80.5" x2="122.5" y2="80.5" stroke="#181F29" strokeWidth="1.8" />
            <line x1="99" y1="80" x2="103" y2="80" stroke="#181F29" strokeWidth="1.6" />
            <line x1="137" y1="80" x2="141" y2="80" stroke="#181F29" strokeWidth="1.6" />
          </g>
        )}
      </g>

      {/* FRONT HAIR LAYER */}
      {profile.hairStyle === 'uzun' && (
        <path
          d="M 97 78 Q 98 51 120 51 Q 142 51 143 78 Q 134 65 122 64 Q 108 64 97 78 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'topuz' && (
        <path
          d="M 98 78 Q 98 52 120 52 Q 142 52 142 78 Q 132 64 120 64 Q 108 64 98 78 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'kut' && (
        <path
          d="M 96 79 Q 97 51 120 51 Q 143 51 144 79 Q 136 66 120 66 Q 104 66 96 79 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'dalgali' && (
        <path
          d="M 96 78 Q 98 49 120 50 Q 143 49 144 78 Q 134 63 124 67 Q 112 61 96 78 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'kisa' && (
        <path
          d="M 98 76 Q 97 50 120 50 Q 143 50 142 76 Q 136 62 120 62 Q 104 62 98 76 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'yan_ayrik' && (
        <path
          d="M 97 77 Q 96 49 122 49 Q 144 50 142 76 Q 135 63 115 62 Q 105 64 97 77 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {profile.hairStyle === 'daginik' && (
        <path
          d="M 97 76 L 94 64 L 104 54 L 114 47 L 122 52 L 132 48 L 141 58 L 145 69 L 142 76 Q 131 62 120 64 Q 108 61 97 76 Z"
          fill={hair}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
