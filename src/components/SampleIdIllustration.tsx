import type { IdMethod } from '../types/bookbuddy';

interface SampleIdIllustrationProps {
  method: IdMethod;
  showSampleBanner?: boolean;
}

export function SampleIdIllustration({
  method,
  showSampleBanner = true,
}: SampleIdIllustrationProps) {
  if (method === 'aadhaar') {
    return (
      <svg
        viewBox="0 0 280 170"
        className="h-auto w-full rounded-xl border border-cyan-400/30 bg-[#07132c]"
        role="img"
        aria-label="Fictional sample Aadhaar card illustration"
      >
        <defs>
          <linearGradient id="aadhaarTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="280" height="170" rx="12" fill="#07132c" />
        <rect x="12" y="12" width="256" height="6" rx="3" fill="url(#aadhaarTop)" />
        {/* Portrait placeholder */}
        <rect
          x="18"
          y="34"
          width="56"
          height="68"
          rx="8"
          fill="#0f234a"
          stroke="#38bdf8"
          strokeOpacity="0.45"
        />
        <circle cx="46" cy="56" r="12" fill="#38bdf8" fillOpacity="0.45" />
        <path
          d="M28 92 C28 78, 64 78, 64 92"
          fill="#38bdf8"
          fillOpacity="0.35"
        />
        {/* Masked sample metadata lines */}
        <rect x="88" y="38" width="110" height="8" rx="4" fill="#94a3b8" fillOpacity="0.55" />
        <rect x="88" y="54" width="84" height="7" rx="3.5" fill="#64748b" fillOpacity="0.45" />
        <rect x="88" y="69" width="96" height="7" rx="3.5" fill="#64748b" fillOpacity="0.45" />
        {/* Masked VID representation */}
        <text
          x="88"
          y="102"
          fill="#7dd3fc"
          fontSize="11"
          fontFamily="monospace"
          letterSpacing="1.5"
        >
          XXXX XXXX 0000
        </text>
        {/* Fictional QR mark */}
        <rect
          x="220"
          y="42"
          width="42"
          height="42"
          rx="5"
          fill="#0d1e42"
          stroke="#a855f7"
          strokeOpacity="0.6"
        />
        <rect x="227" y="49" width="11" height="11" fill="#38bdf8" fillOpacity="0.7" />
        <rect x="244" y="49" width="11" height="11" fill="#a855f7" fillOpacity="0.7" />
        <rect x="227" y="66" width="11" height="11" fill="#a855f7" fillOpacity="0.7" />
        <rect x="244" y="66" width="11" height="11" fill="#fbbf24" fillOpacity="0.75" />

        {showSampleBanner && (
          <g>
            <rect
              x="16"
              y="128"
              width="248"
              height="26"
              rx="6"
              fill="#f59e0b"
              fillOpacity="0.18"
              stroke="#fbbf24"
              strokeOpacity="0.6"
            />
            <text
              x="140"
              y="145"
              textAnchor="middle"
              fill="#fde68a"
              fontSize="10.5"
              fontWeight="700"
              letterSpacing="1.4"
            >
              SAMPLE - NOT A REAL ID
            </text>
          </g>
        )}
      </svg>
    );
  }

  if (method === 'passport') {
    return (
      <svg
        viewBox="0 0 280 170"
        className="h-auto w-full rounded-xl border border-purple-400/35 bg-[#09122b]"
        role="img"
        aria-label="Fictional sample Passport booklet illustration"
      >
        <rect x="0" y="0" width="280" height="170" rx="12" fill="#09122b" />
        {/* Booklet spine & gold emblem */}
        <rect x="16" y="16" width="104" height="106" rx="8" fill="#131c42" stroke="#a855f7" strokeOpacity="0.55" />
        <circle cx="68" cy="58" r="22" fill="none" stroke="#fbbf24" strokeWidth="1.6" strokeOpacity="0.8" />
        <ellipse cx="68" cy="58" rx="10" ry="22" fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.65" />
        <line x1="46" y1="58" x2="90" y2="58" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.65" />
        <text
          x="68"
          y="98"
          textAnchor="middle"
          fill="#fde68a"
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="1.5"
        >
          PASSPORT
        </text>
        {/* Bio data page representation */}
        <rect x="130" y="16" width="134" height="106" rx="8" fill="#0e1b3c" stroke="#38bdf8" strokeOpacity="0.4" />
        <rect x="140" y="28" width="36" height="44" rx="5" fill="#172d5e" stroke="#38bdf8" strokeOpacity="0.4" />
        <circle cx="158" cy="43" r="8" fill="#a855f7" fillOpacity="0.55" />
        <path d="M146 66 C146 56, 170 56, 170 66" fill="#a855f7" fillOpacity="0.4" />
        <rect x="184" y="30" width="68" height="7" rx="3.5" fill="#94a3b8" fillOpacity="0.55" />
        <rect x="184" y="44" width="54" height="6" rx="3" fill="#64748b" fillOpacity="0.45" />
        <rect x="184" y="57" width="60" height="6" rx="3" fill="#64748b" fillOpacity="0.45" />
        <text x="140" y="96" fill="#7dd3fc" fontSize="8" fontFamily="monospace" letterSpacing="1">
          P&lt;IND&lt;&lt;SAMPLE&lt;&lt;&lt;&lt;&lt;&lt;
        </text>
        <text x="140" y="109" fill="#c084fc" fontSize="8" fontFamily="monospace" letterSpacing="1">
          00000000&lt;0IND000000
        </text>

        {showSampleBanner && (
          <g>
            <rect
              x="16"
              y="132"
              width="248"
              height="26"
              rx="6"
              fill="#f59e0b"
              fillOpacity="0.18"
              stroke="#fbbf24"
              strokeOpacity="0.6"
            />
            <text
              x="140"
              y="149"
              textAnchor="middle"
              fill="#fde68a"
              fontSize="10.5"
              fontWeight="700"
              letterSpacing="1.4"
            >
              SAMPLE - NOT A REAL ID
            </text>
          </g>
        )}
      </svg>
    );
  }

  // School ID Card
  return (
    <svg
      viewBox="0 0 280 170"
      className="h-auto w-full rounded-xl border border-blue-400/35 bg-[#07152e]"
      role="img"
      aria-label="Fictional sample School ID card illustration"
    >
      <rect x="0" y="0" width="280" height="170" rx="12" fill="#07152e" />
      <rect x="14" y="14" width="252" height="24" rx="6" fill="#1d4ed8" fillOpacity="0.45" />
      <text
        x="140"
        y="30"
        textAnchor="middle"
        fill="#bae6fd"
        fontSize="10"
        fontWeight="700"
        letterSpacing="1.5"
      >
        STUDENT IDENTITY CARD
      </text>
      <rect
        x="20"
        y="48"
        width="54"
        height="64"
        rx="8"
        fill="#0f234a"
        stroke="#60a5fa"
        strokeOpacity="0.55"
      />
      <circle cx="47" cy="70" r="11" fill="#60a5fa" fillOpacity="0.5" />
      <path d="M30 104 C30 90, 64 90, 64 104" fill="#60a5fa" fillOpacity="0.38" />
      <rect x="88" y="54" width="128" height="8" rx="4" fill="#94a3b8" fillOpacity="0.55" />
      <rect x="88" y="70" width="96" height="7" rx="3.5" fill="#64748b" fillOpacity="0.45" />
      <rect x="88" y="85" width="112" height="7" rx="3.5" fill="#64748b" fillOpacity="0.45" />
      <text x="88" y="108" fill="#7dd3fc" fontSize="10" fontFamily="monospace" letterSpacing="1">
        INST-VERIFIED · SAMPLE
      </text>

      {showSampleBanner && (
        <g>
          <rect
            x="16"
            y="128"
            width="248"
            height="26"
            rx="6"
            fill="#f59e0b"
            fillOpacity="0.18"
            stroke="#fbbf24"
            strokeOpacity="0.6"
          />
          <text
            x="140"
            y="145"
            textAnchor="middle"
            fill="#fde68a"
            fontSize="10.5"
            fontWeight="700"
            letterSpacing="1.4"
          >
            SAMPLE - NOT A REAL ID
          </text>
        </g>
      )}
    </svg>
  );
}
