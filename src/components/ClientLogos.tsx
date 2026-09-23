import React from 'react';

export interface ClientBrandLogo {
  id: string;
  name: string;
  svg: React.ReactNode;
}

export const CLIENT_LOGOS: ClientBrandLogo[] = [
  // 1. TITAN (Ultra-Bold Heavy Industrial Monolith)
  {
    id: 'titan',
    name: 'Titan',
    svg: (
      <svg viewBox="0 0 170 48" width="160" height="46" fill="none" aria-label="TITAN Heavyworks">
        <path d="M6 10h14v28H6V10zm22 0h12l8 16 8-16h12v28H56V22l-7 14h-3l-7-14v16H28V10zm46 0h28v7h-8v21h-12V17h-8V10zm32 0h12l10 28h-12l-2-6h-7l-2 6h-11l12-28zm6 16h4l-2-8-2 8z" fill="#0F172A"/>
        <path d="M152 10h12v28h-12V10z" fill="#EA580C"/>
        <polygon points="144,38 164,10 168,10 148,38" fill="#F97316" opacity="0.6"/>
      </svg>
    )
  },

  // 2. kroma. (Minimalist Swiss Tech Lowercase with Gradient Dot)
  {
    id: 'kroma',
    name: 'Kroma',
    svg: (
      <svg viewBox="0 0 160 48" width="150" height="46" fill="none" aria-label="kroma">
        <text x="5" y="34" fontFamily="'Inter', -apple-system, sans-serif" fontWeight="800" fontSize="32" fill="#0F172A" letterSpacing="-1.5">
          kroma
        </text>
        <circle cx="118" cy="29" r="6" fill="#EA580C"/>
        <circle cx="118" cy="29" r="3" fill="#FDBA74"/>
      </svg>
    )
  },

  // 3. SYNTHEX (Fluid Dual-Ribbon S Helix Monogram)
  {
    id: 'synthex',
    name: 'Synthex',
    svg: (
      <svg viewBox="0 0 190 48" width="175" height="46" fill="none" aria-label="SYNTHEX">
        <g transform="translate(6, 6)">
          <path d="M18 4C10 4 4 10 4 18C4 28 20 20 20 30C20 34 16 36 12 36C6 36 2 32 2 32" stroke="#059669" strokeWidth="4" strokeLinecap="round"/>
          <path d="M14 4C22 4 28 10 28 18C28 28 12 20 12 30C12 34 16 36 20 36C26 36 30 32 30 32" stroke="#0056D2" strokeWidth="4" strokeLinecap="round"/>
        </g>
        <text x="46" y="32" fontFamily="'Outfit', sans-serif" fontWeight="900" fontSize="22" fill="#0F172A" letterSpacing="3">
          SYNTHEX
        </text>
        <text x="48" y="42" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="7" fill="#059669" letterSpacing="4">
          BIO-SOLUTIONS
        </text>
      </svg>
    )
  },

  // 4. VOLTIX (Dynamic Angled Electric Chevron)
  {
    id: 'voltix',
    name: 'Voltix',
    svg: (
      <svg viewBox="0 0 170 48" width="160" height="46" fill="none" aria-label="VOLTIX">
        <g transform="translate(6, 8)">
          <polygon points="16,0 2,18 14,18 8,32 26,14 14,14" fill="#EA580C"/>
        </g>
        <text x="42" y="33" fontFamily="'Outfit', sans-serif" fontStyle="italic" fontWeight="900" fontSize="26" fill="#0F172A" letterSpacing="1">
          VOLT<tspan fill="#EA580C">IX</tspan>
        </text>
      </svg>
    )
  },

  // 5. BLACKWOOD & CO. (Classic Heritage Seal & Serif Wordmark)
  {
    id: 'blackwood',
    name: 'Blackwood',
    svg: (
      <svg viewBox="0 0 200 48" width="185" height="46" fill="none" aria-label="BLACKWOOD">
        <circle cx="20" cy="24" r="16" stroke="#0F172A" strokeWidth="2.5"/>
        <polygon points="20,11 23,19 32,20 25,26 27,35 20,30 13,35 15,26 8,20 17,19" fill="#EA580C"/>
        <text x="44" y="27" fontFamily="Georgia, serif" fontWeight="800" fontSize="17" fill="#0F172A" letterSpacing="2">
          BLACKWOOD
        </text>
        <text x="46" y="38" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9" fill="#64748B" letterSpacing="3">
          EST. 1984 · ENTERPRISE
        </text>
      </svg>
    )
  },

  // 6. AERIS ⨁ (Aerospace Radar Grid & Futuristic Geometry)
  {
    id: 'aeris',
    name: 'Aeris',
    svg: (
      <svg viewBox="0 0 175 48" width="165" height="46" fill="none" aria-label="AERIS">
        <g transform="translate(8, 8)">
          <circle cx="16" cy="16" r="14" stroke="#0284C7" strokeWidth="2.5" strokeDasharray="4 2"/>
          <path d="M16 2v28M2 16h28" stroke="#0284C7" strokeWidth="2"/>
          <circle cx="16" cy="16" r="4" fill="#0F172A"/>
        </g>
        <text x="48" y="32" fontFamily="'Courier New', monospace" fontWeight="900" fontSize="22" fill="#0F172A" letterSpacing="4">
          AERIS
        </text>
      </svg>
    )
  },

  // 7. NORVA LABS (Hexagonal Crystalline Facets)
  {
    id: 'norva',
    name: 'Norva',
    svg: (
      <svg viewBox="0 0 175 48" width="160" height="46" fill="none" aria-label="NORVA LABS">
        <g transform="translate(6, 8)">
          <polygon points="16,2 30,10 30,24 16,32 2,24 2,10" fill="#0891B2"/>
          <polygon points="16,2 30,10 16,18 2,10" fill="#06B6D4"/>
          <polygon points="16,18 30,24 16,32" fill="#0E7490"/>
        </g>
        <text x="46" y="27" fontFamily="'Outfit', sans-serif" fontWeight="900" fontSize="19" fill="#0F172A" letterSpacing="2">
          NORVA
        </text>
        <text x="46" y="38" fontFamily="'Inter', sans-serif" fontWeight="800" fontSize="7.5" fill="#0891B2" letterSpacing="4">
          DIAGNOSTICS
        </text>
      </svg>
    )
  },

  // 8. ZENITH (Architectural Monogram Peak)
  {
    id: 'zenith',
    name: 'Zenith',
    svg: (
      <svg viewBox="0 0 180 48" width="165" height="46" fill="none" aria-label="ZENITH">
        <g transform="translate(6, 6)">
          <path d="M4 32L18 6L32 32H24L18 18L12 32H4Z" fill="#0F172A"/>
          <polygon points="18,12 24,24 12,24" fill="#EA580C"/>
        </g>
        <text x="46" y="31" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="22" fill="#0F172A" letterSpacing="3">
          ZENITH
        </text>
        <text x="48" y="41" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="7.5" fill="#64748B" letterSpacing="3.5">
          GLOBAL SUPPLY
        </text>
      </svg>
    )
  }
];
