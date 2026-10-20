import React from 'react';

interface CertLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const CertLogo: React.FC<CertLogoProps> = ({
  className = 'h-9 w-auto',
  size,
  showText = false,
}) => {
  // Size presets if specified
  const sizeClasses = {
    xs: 'h-6 w-auto',
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-14 w-auto',
    xl: 'h-20 w-auto',
  };

  const appliedClass = size ? sizeClasses[size] : className;

  return (
    <div className={`inline-flex items-center gap-2.5 ${appliedClass.includes('shrink-0') ? 'shrink-0' : ''}`}>
      <svg
        viewBox="0 0 460 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${appliedClass} transition-transform hover:scale-102`}
        aria-label="Logo Officiel CERT"
      >
        <defs>
          {/* 3D Sphere Radial Gradient */}
          <radialGradient id="certSphereGradComp" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="15%" stopColor="#34d399" />
            <stop offset="45%" stopColor="#00a884" />
            <stop offset="80%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </radialGradient>

          {/* Specular Highlight for Globe */}
          <radialGradient id="certSphereHighlightComp" cx="42%" cy="35%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Swoosh Gradient (Purple/Violet) */}
          <linearGradient id="certSwooshGradComp" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4c1d68" />
            <stop offset="50%" stopColor="#581c6f" />
            <stop offset="100%" stopColor="#6b2185" />
          </linearGradient>

          {/* Shadow for Sphere Depth */}
          <filter id="certSphereGlowComp" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#064e3b" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 1. The 3D Green/Teal Sphere Globe inside the C */}
        <g id="globe">
          <circle cx="94" cy="116" r="46" fill="url(#certSphereGradComp)" filter="url(#certSphereGlowComp)" />
          <ellipse cx="88" cy="100" rx="20" ry="14" fill="url(#certSphereHighlightComp)" />
        </g>

        {/* 2. The Letter 'C' enclosing the globe */}
        <path
          d="M 132,66
             C 120,53 105,45 88,45
             C 50,45 22,76 22,118
             C 22,160 50,191 88,191
             C 107,191 123,181 134,166
             L 125,152
             C 116,165 103,174 88,174
             C 60,174 38,150 38,118
             C 38,86 60,62 88,62
             C 102,62 114,69 123,80
             Z"
          fill="#4477b2"
        />

        {/* 3. The Letter 'E' */}
        <path
          d="M 152,48
             L 230,48
             L 230,64
             L 171,64
             L 171,110
             L 224,110
             L 224,126
             L 171,126
             L 171,172
             L 232,172
             L 232,188
             L 152,188
             Z"
          fill="#4477b2"
        />

        {/* 4. The Letter 'R' with characteristic curved leg */}
        <path
          d="M 248,48
             L 298,48
             C 318,48 333,59 333,78
             C 333,94 322,106 304,110
             C 315,116 322,126 329,144
             C 334,158 340,174 346,188
             L 326,188
             C 320,174 314,158 309,144
             C 303,130 297,123 283,123
             L 267,123
             L 267,188
             L 248,188
             Z
             M 267,64
             L 267,108
             L 295,108
             C 307,108 314,100 314,86
             C 314,72 307,64 295,64
             Z"
          fill="#4477b2"
        />

        {/* 5. The Letter 'T' */}
        <path
          d="M 334,48
             L 424,48
             L 424,64
             L 389,64
             L 389,188
             L 370,188
             L 370,64
             L 334,64
             Z"
          fill="#4477b2"
        />

        {/* 6. The Dynamic Purple Orbital Swoosh */}
        <path
          d="M 20,132
             C 18,142 24,148 35,148
             C 52,148 80,140 108,131
             C 152,117 210,98 280,75
             C 340,55 395,33 434,2
             C 436,1 437,0 438,0
             C 437,3 410,24 374,44
             C 310,80 242,107 182,128
             C 128,147 78,162 48,162
             C 24,162 14,150 14,138
             C 14,133 16,128 20,123
             Z"
          fill="url(#certSwooshGradComp)"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="text-xs font-black tracking-wider text-slate-800 leading-tight">CERT</span>
          <span className="text-[10px] text-slate-500 font-medium leading-none">Centre d'Études et de Recherche des Télécommunications</span>
        </div>
      )}
    </div>
  );
};
