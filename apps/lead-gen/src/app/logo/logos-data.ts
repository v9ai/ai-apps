export const logos = [
  { id: 1, title: "Circuit Neural", concept: "circuit board with glowing cyan nodes", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#030810"/>
    </radialGradient>

    <!-- Cyan glow for nodes -->
    <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Strong glow for core nodes -->
    <filter id="coreGlow" x="-150%" y="-150%" width="400%" height="400%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur1"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Text glow -->
    <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Trace glow -->
    <filter id="traceGlow" x="-10%" y="-100%" width="120%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Animated pulse for core nodes -->
    <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f5ff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#00f5ff" stop-opacity="0"/>
    </radialGradient>

    <!-- Circuit trace gradient -->
    <linearGradient id="traceGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0047ab" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#00d4ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0047ab" stop-opacity="0.3"/>
    </linearGradient>

    <linearGradient id="traceGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0047ab" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#00d4ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0047ab" stop-opacity="0.3"/>
    </linearGradient>

    <!-- Marker for circuit endpoints -->
    <marker id="dot" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4">
      <circle cx="2" cy="2" r="1.5" fill="#00d4ff"/>
    </marker>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle grid lines -->
  <g opacity="0.06" stroke="#00d4ff" stroke-width="0.5">
    <line x1="0" y1="20" x2="300" y2="20"/>
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="60" x2="300" y2="60"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="100" x2="300" y2="100"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="140" x2="300" y2="140"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="0" y1="180" x2="300" y2="180"/>
    <line x1="20" y1="0" x2="20" y2="200"/>
    <line x1="40" y1="0" x2="40" y2="200"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="80" y1="0" x2="80" y2="200"/>
    <line x1="100" y1="0" x2="100" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="140" y1="0" x2="140" y2="200"/>
    <line x1="160" y1="0" x2="160" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="200" y1="0" x2="200" y2="200"/>
    <line x1="220" y1="0" x2="220" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
    <line x1="260" y1="0" x2="260" y2="200"/>
    <line x1="280" y1="0" x2="280" y2="200"/>
  </g>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- NEURAL NETWORK BACKGROUND LAYER (outer nodes)  -->
  <!-- ═══════════════════════════════════════════════ -->

  <!-- Outer peripheral nodes (dim, decorative) -->
  <g filter="url(#nodeGlow)" opacity="0.5">
    <!-- Top left cluster -->
    <circle cx="18" cy="22" r="2.5" fill="#00a8cc"/>
    <circle cx="42" cy="14" r="2" fill="#0088bb"/>
    <circle cx="28" cy="48" r="2" fill="#0077aa"/>

    <!-- Top right cluster -->
    <circle cx="258" cy="18" r="2.5" fill="#00a8cc"/>
    <circle cx="278" cy="38" r="2" fill="#0088bb"/>
    <circle cx="245" cy="38" r="2" fill="#0077aa"/>

    <!-- Bottom left cluster -->
    <circle cx="22" cy="168" r="2.5" fill="#00a8cc"/>
    <circle cx="38" cy="185" r="2" fill="#0088bb"/>
    <circle cx="55" cy="172" r="2" fill="#0077aa"/>

    <!-- Bottom right cluster -->
    <circle cx="278" cy="162" r="2.5" fill="#00a8cc"/>
    <circle cx="260" cy="182" r="2" fill="#0088bb"/>
    <circle cx="242" cy="168" r="2" fill="#0077aa"/>

    <!-- Left mid -->
    <circle cx="12" cy="90" r="2" fill="#0088bb"/>
    <circle cx="12" cy="110" r="2" fill="#0088bb"/>

    <!-- Right mid -->
    <circle cx="288" cy="88" r="2" fill="#0088bb"/>
    <circle cx="288" cy="112" r="2" fill="#0088bb"/>
  </g>

  <!-- Peripheral circuit traces (dim) -->
  <g filter="url(#traceGlow)" stroke="#00a8cc" stroke-width="0.8" fill="none" opacity="0.35">
    <!-- Top left traces -->
    <polyline points="18,22 18,48 28,48"/>
    <polyline points="42,14 42,22 18,22"/>
    <polyline points="28,48 60,48 60,62"/>

    <!-- Top right traces -->
    <polyline points="258,18 258,38 245,38"/>
    <polyline points="278,38 258,38"/>
    <polyline points="245,38 240,62"/>

    <!-- Bottom left traces -->
    <polyline points="22,168 22,152 55,152 55,172"/>
    <polyline points="38,185 38,168 22,168"/>

    <!-- Bottom right traces -->
    <polyline points="278,162 278,152 242,152 242,168"/>
    <polyline points="260,182 260,162 278,162"/>

    <!-- Left spine -->
    <polyline points="12,90 24,90 24,100 12,100 12,110 24,110 24,100"/>

    <!-- Right spine -->
    <polyline points="288,88 276,88 276,100 288,100 288,112 276,112 276,100"/>
  </g>

  <!-- Mid-layer network nodes -->
  <g filter="url(#nodeGlow)" opacity="0.7">
    <!-- Left mid-network -->
    <circle cx="52" cy="62" r="3" fill="#00c8e8"/>
    <circle cx="52" cy="138" r="3" fill="#00c8e8"/>
    <circle cx="38" cy="100" r="3.5" fill="#00d4ff"/>

    <!-- Right mid-network -->
    <circle cx="248" cy="62" r="3" fill="#00c8e8"/>
    <circle cx="248" cy="138" r="3" fill="#00c8e8"/>
    <circle cx="262" cy="100" r="3.5" fill="#00d4ff"/>

    <!-- Top mid -->
    <circle cx="100" cy="22" r="3" fill="#00c8e8"/>
    <circle cx="150" cy="14" r="3" fill="#00c8e8"/>
    <circle cx="200" cy="22" r="3" fill="#00c8e8"/>

    <!-- Bottom mid -->
    <circle cx="100" cy="178" r="3" fill="#00c8e8"/>
    <circle cx="150" cy="186" r="3" fill="#00c8e8"/>
    <circle cx="200" cy="178" r="3" fill="#00c8e8"/>
  </g>

  <!-- Mid-layer circuit traces -->
  <g filter="url(#traceGlow)" stroke="#00c8e8" stroke-width="1" fill="none" opacity="0.55">
    <!-- Left side connections -->
    <polyline points="38,100 52,100 52,62"/>
    <polyline points="38,100 52,100 52,138"/>
    <polyline points="52,62 80,62 80,76"/>
    <polyline points="52,138 80,138 80,124"/>
    <polyline points="28,48 52,48 52,62"/>
    <polyline points="55,172 55,152 52,138"/>

    <!-- Right side connections -->
    <polyline points="262,100 248,100 248,62"/>
    <polyline points="262,100 248,100 248,138"/>
    <polyline points="248,62 220,62 220,76"/>
    <polyline points="248,138 220,138 220,124"/>
    <polyline points="245,38 248,62"/>
    <polyline points="242,168 248,138"/>

    <!-- Top connections -->
    <polyline points="100,22 100,40 80,40 80,62"/>
    <polyline points="150,14 150,40"/>
    <polyline points="200,22 200,40 220,40 220,62"/>
    <polyline points="42,14 100,14 100,22"/>
    <polyline points="258,18 200,18 200,22"/>

    <!-- Bottom connections -->
    <polyline points="100,178 100,160 80,160 80,138"/>
    <polyline points="150,186 150,160"/>
    <polyline points="200,178 200,160 220,160 220,138"/>
    <polyline points="38,185 100,185 100,178"/>
    <polyline points="260,182 200,182 200,178"/>
  </g>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- INNER NETWORK — connects to ALG monogram area   -->
  <!-- ═══════════════════════════════════════════════ -->

  <!-- Inner node ring -->
  <g filter="url(#nodeGlow)" opacity="0.85">
    <!-- Inner top -->
    <circle cx="100" cy="58" r="4" fill="#00e0ff"/>
    <circle cx="150" cy="48" r="4" fill="#00e0ff"/>
    <circle cx="200" cy="58" r="4" fill="#00e0ff"/>

    <!-- Inner bottom -->
    <circle cx="100" cy="142" r="4" fill="#00e0ff"/>
    <circle cx="150" cy="152" r="4" fill="#00e0ff"/>
    <circle cx="200" cy="142" r="4" fill="#00e0ff"/>

    <!-- Inner left -->
    <circle cx="78" cy="100" r="4" fill="#00e0ff"/>

    <!-- Inner right -->
    <circle cx="222" cy="100" r="4" fill="#00e0ff"/>
  </g>

  <!-- Inner circuit traces -->
  <g filter="url(#traceGlow)" stroke="#00d8f8" stroke-width="1.2" fill="none" opacity="0.7">
    <polyline points="80,76 80,58 100,58"/>
    <polyline points="100,58 150,58 150,48"/>
    <polyline points="150,48 200,48 200,58"/>
    <polyline points="220,76 220,58 200,58"/>
    <polyline points="78,100 78,76 80,76"/>
    <polyline points="222,100 222,76 220,76"/>
    <polyline points="80,124 80,142 100,142"/>
    <polyline points="100,142 150,142 150,152"/>
    <polyline points="150,152 200,152 200,142"/>
    <polyline points="220,124 220,142 200,142"/>
    <polyline points="78,100 78,124 80,124"/>
    <polyline points="222,100 222,124 220,124"/>
    <polyline points="100,58 100,40"/>
    <polyline points="200,58 200,40"/>
    <polyline points="100,142 100,160"/>
    <polyline points="200,142 200,160"/>
  </g>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- ALG MONOGRAM — circuit board style              -->
  <!-- ═══════════════════════════════════════════════ -->

  <!-- Monogram background panel -->
  <rect x="96" y="64" width="108" height="72" rx="4" fill="#030f1e" stroke="#00d4ff" stroke-width="0.8" opacity="0.9"/>

  <!-- Circuit corner decorations on panel -->
  <g stroke="#00d4ff" stroke-width="0.8" fill="none" opacity="0.7">
    <!-- TL corner -->
    <polyline points="96,74 96,64 106,64"/>
    <!-- TR corner -->
    <polyline points="194,64 204,64 204,74"/>
    <!-- BL corner -->
    <polyline points="96,126 96,136 106,136"/>
    <!-- BR corner -->
    <polyline points="194,136 204,136 204,126"/>

    <!-- Corner pads -->
    <rect x="93" y="61" width="5" height="5" rx="1" fill="#00d4ff" opacity="0.5"/>
    <rect x="202" y="61" width="5" height="5" rx="1" fill="#00d4ff" opacity="0.5"/>
    <rect x="93" y="134" width="5" height="5" rx="1" fill="#00d4ff" opacity="0.5"/>
    <rect x="202" y="134" width="5" height="5" rx="1" fill="#00d4ff" opacity="0.5"/>

    <!-- Small panel vias -->
    <circle cx="104" cy="72" r="2" fill="none" stroke="#00a8cc" stroke-width="0.8"/>
    <circle cx="196" cy="72" r="2" fill="none" stroke="#00a8cc" stroke-width="0.8"/>
    <circle cx="104" cy="128" r="2" fill="none" stroke="#00a8cc" stroke-width="0.8"/>
    <circle cx="196" cy="128" r="2" fill="none" stroke="#00a8cc" stroke-width="0.8"/>
  </g>

  <!-- "ALG" text — main monogram -->
  <g filter="url(#textGlow)">
    <text
      x="150"
      y="115"
      text-anchor="middle"
      dominant-baseline="middle"
      font-family="'Courier New', Courier, monospace"
      font-size="42"
      font-weight="700"
      letter-spacing="6"
      fill="#00f0ff"
    >ALG</text>
  </g>

  <!-- Circuit trace overlays on letters (decorative PCB traces) -->
  <g stroke="#00f0ff" stroke-width="0.7" fill="none" opacity="0.4" filter="url(#traceGlow)">
    <!-- Horizontal trace through monogram -->
    <line x1="100" y1="100" x2="200" y2="100"/>
    <!-- Short tick marks -->
    <line x1="120" y1="96" x2="120" y2="104"/>
    <line x1="150" y1="94" x2="150" y2="106"/>
    <line x1="180" y1="96" x2="180" y2="104"/>
  </g>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- CORE CONNECTOR NODES (bright, high-energy)      -->
  <!-- ═══════════════════════════════════════════════ -->

  <!-- Pulse halos on core nodes -->
  <g opacity="0.25">
    <circle cx="100" cy="58" r="10" fill="url(#pulseGrad)"/>
    <circle cx="200" cy="58" r="10" fill="url(#pulseGrad)"/>
    <circle cx="100" cy="142" r="10" fill="url(#pulseGrad)"/>
    <circle cx="200" cy="142" r="10" fill="url(#pulseGrad)"/>
    <circle cx="150" cy="48" r="12" fill="url(#pulseGrad)"/>
    <circle cx="150" cy="152" r="12" fill="url(#pulseGrad)"/>
    <circle cx="78" cy="100" r="10" fill="url(#pulseGrad)"/>
    <circle cx="222" cy="100" r="10" fill="url(#pulseGrad)"/>
  </g>

  <!-- Core nodes (bright) -->
  <g filter="url(#coreGlow)">
    <circle cx="100" cy="58" r="4.5" fill="#00f5ff"/>
    <circle cx="150" cy="48" r="5" fill="#00f5ff"/>
    <circle cx="200" cy="58" r="4.5" fill="#00f5ff"/>
    <circle cx="78" cy="100" r="5" fill="#00f5ff"/>
    <circle cx="222" cy="100" r="5" fill="#00f5ff"/>
    <circle cx="100" cy="142" r="4.5" fill="#00f5ff"/>
    <circle cx="150" cy="152" r="5" fill="#00f5ff"/>
    <circle cx="200" cy="142" r="4.5" fill="#00f5ff"/>
  </g>

  <!-- Node center dots -->
  <g>
    <circle cx="100" cy="58" r="2" fill="#ffffff"/>
    <circle cx="150" cy="48" r="2.5" fill="#ffffff"/>
    <circle cx="200" cy="58" r="2" fill="#ffffff"/>
    <circle cx="78" cy="100" r="2.5" fill="#ffffff"/>
    <circle cx="222" cy="100" r="2.5" fill="#ffffff"/>
    <circle cx="100" cy="142" r="2" fill="#ffffff"/>
    <circle cx="150" cy="152" r="2.5" fill="#ffffff"/>
    <circle cx="200" cy="142" r="2" fill="#ffffff"/>
  </g>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- TAGLINE                                         -->
  <!-- ═══════════════════════════════════════════════ -->

  <g filter="url(#textGlow)" opacity="0.75">
    <text
      x="150"
      y="170"
      text-anchor="middle"
      font-family="'Courier New', Courier, monospace"
      font-size="7.5"
      font-weight="400"
      letter-spacing="3.5"
      fill="#00c8e8"
    >AGENTIC LEAD GEN</text>
  </g>

  <!-- Bottom trace accent under tagline -->
  <g filter="url(#traceGlow)" opacity="0.5">
    <line x1="88" y1="174" x2="212" y2="174" stroke="#00a8cc" stroke-width="0.6"/>
    <circle cx="88" cy="174" r="1.5" fill="#00d4ff"/>
    <circle cx="212" cy="174" r="1.5" fill="#00d4ff"/>
  </g>

  <!-- Top trace accent -->
  <g filter="url(#traceGlow)" opacity="0.5">
    <line x1="70" y1="26" x2="230" y2="26" stroke="#00a8cc" stroke-width="0.6"/>
    <circle cx="70" cy="26" r="1.5" fill="#00d4ff"/>
    <circle cx="230" cy="26" r="1.5" fill="#00d4ff"/>
    <!-- Small connector pad at center top -->
    <rect x="146" y="22" width="8" height="8" rx="1" fill="none" stroke="#00d4ff" stroke-width="0.8"/>
    <circle cx="150" cy="26" r="1.5" fill="#00d4ff"/>
  </g>

  <!-- Animated data pulses along key traces -->
  <circle r="2" fill="#ffffff" opacity="0.9">
    <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
      <mpath href="#pulse-path-1"/>
    </animateMotion>
    <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.1;0.9;1" dur="2.4s" repeatCount="indefinite"/>
  </circle>

  <circle r="2" fill="#00f5ff" opacity="0.9">
    <animateMotion dur="3.1s" repeatCount="indefinite" rotate="auto" begin="1.2s">
      <mpath href="#pulse-path-2"/>
    </animateMotion>
    <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.1;0.9;1" dur="3.1s" repeatCount="indefinite" begin="1.2s"/>
  </circle>

  <circle r="1.8" fill="#80f0ff" opacity="0.85">
    <animateMotion dur="2.8s" repeatCount="indefinite" rotate="auto" begin="0.6s">
      <mpath href="#pulse-path-3"/>
    </animateMotion>
    <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.1;0.9;1" dur="2.8s" repeatCount="indefinite" begin="0.6s"/>
  </circle>

  <!-- Pulse paths (hidden, used for animation) -->
  <defs>
    <path id="pulse-path-1" d="M 38,100 L 52,100 L 52,62 L 80,62 L 80,58 L 100,58 L 150,58 L 150,48 L 200,48 L 200,58 L 220,58 L 220,62 L 248,62 L 248,100 L 262,100"/>
    <path id="pulse-path-2" d="M 150,14 L 150,48 L 150,58 L 150,100 L 150,142 L 150,152 L 150,186"/>
    <path id="pulse-path-3" d="M 78,100 L 100,100 L 100,142 L 150,142 L 200,142 L 200,100 L 222,100"/>
  </defs>

</svg>` },
  { id: 2, title: "Geometric Diamond", concept: "sharp diamond prism with purple-to-gold gradient", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="prismTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="prismLeft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="prismRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="prismBottom" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#c026d3"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="wordmarkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#f8f8fa" rx="8"/>

  <!-- Diamond Prism: centered at x=150, top apex at y=22, bottom apex at y=122 -->
  <!-- Top facet (upper-left triangle) -->
  <polygon points="150,22 108,72 150,62" fill="url(#prismTop)" filter="url(#glow)"/>
  <!-- Top-right facet -->
  <polygon points="150,22 192,72 150,62" fill="url(#prismRight)" opacity="0.95"/>
  <!-- Left facet (lower-left) -->
  <polygon points="108,72 150,62 150,122" fill="url(#prismLeft)" opacity="0.9"/>
  <!-- Right facet (lower-right) -->
  <polygon points="192,72 150,62 150,122" fill="url(#prismBottom)" opacity="0.92"/>
  <!-- Bottom-left outer facet -->
  <polygon points="108,72 150,122 120,88" fill="url(#prismLeft)" opacity="0.55"/>
  <!-- Bottom-right outer facet -->
  <polygon points="192,72 150,122 180,88" fill="url(#prismRight)" opacity="0.55"/>

  <!-- Subtle edge highlights -->
  <line x1="150" y1="22" x2="108" y2="72" stroke="#e9d5ff" stroke-width="0.8" opacity="0.7"/>
  <line x1="150" y1="22" x2="192" y2="72" stroke="#fde68a" stroke-width="0.8" opacity="0.7"/>
  <line x1="108" y1="72" x2="150" y2="122" stroke="#c4b5fd" stroke-width="0.6" opacity="0.5"/>
  <line x1="192" y1="72" x2="150" y2="122" stroke="#fcd34d" stroke-width="0.6" opacity="0.5"/>
  <line x1="150" y1="62" x2="150" y2="122" stroke="#f3e8ff" stroke-width="0.5" opacity="0.4"/>
  <line x1="108" y1="72" x2="192" y2="72" stroke="#f3e8ff" stroke-width="0.5" opacity="0.35"/>

  <!-- Wordmark -->
  <text
    x="150"
    y="148"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="13.5"
    font-weight="700"
    fill="url(#wordmarkGrad)"
    text-anchor="middle"
    letter-spacing="2.5"
  >AGENTIC</text>
  <text
    x="150"
    y="165"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="10"
    font-weight="400"
    fill="#6b7280"
    text-anchor="middle"
    letter-spacing="4"
  >LEAD GEN</text>

  <!-- Thin rule between wordmark lines -->
  <line x1="110" y1="153" x2="190" y2="153" stroke="#d1d5db" stroke-width="0.5"/>
</svg>` },
  { id: 3, title: "Funnel Pipeline", concept: "sales funnel with data flowing through", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Main funnel gradient: blue to green -->
    <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2563EB;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#0EA5E9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10B981;stop-opacity:1" />
    </linearGradient>
    <!-- Accent gradient for glow/data flow -->
    <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60A5FA;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#34D399;stop-opacity:0.9" />
    </linearGradient>
    <!-- Funnel inner highlight -->
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1E40AF;stop-opacity:0.7" />
      <stop offset="50%" style="stop-color:#38BDF8;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:0.7" />
    </linearGradient>
    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2563EB" />
      <stop offset="100%" style="stop-color:#10B981" />
    </linearGradient>
    <!-- Glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Soft drop shadow -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0EA5E9" flood-opacity="0.25"/>
    </filter>
    <!-- Node dot glow -->
    <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#34D399;stop-opacity:0.6"/>
    </radialGradient>
  </defs>

  <!-- Background: dark SaaS -->
  <rect width="300" height="200" fill="#0F172A" rx="12"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.07" stroke="#60A5FA" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ===================== FUNNEL ICON (left half of logo) ===================== -->

  <!-- Funnel body: trapezoid shape -->
  <!-- Wide top, narrowing to a stem at bottom -->
  <g filter="url(#shadow)">
    <!-- Outer funnel fill -->
    <path d="M 30 18 L 110 18 L 88 80 L 52 80 Z" fill="url(#funnelGrad)" opacity="0.95"/>
    <!-- Funnel stem -->
    <rect x="62" y="80" width="16" height="28" rx="3" fill="url(#funnelGrad)" opacity="0.95"/>
    <!-- Funnel inner highlight (depth) -->
    <path d="M 35 22 L 105 22 L 84 76 L 56 76 Z" fill="url(#innerGrad)" opacity="0.5"/>
    <!-- Output drop at bottom of stem -->
    <ellipse cx="70" cy="114" rx="8" ry="5" fill="url(#flowGrad)" filter="url(#glow)" opacity="0.95"/>
  </g>

  <!-- Funnel rim top (highlight line) -->
  <line x1="30" y1="18" x2="110" y2="18" stroke="#60A5FA" stroke-width="1.5" opacity="0.8"/>

  <!-- AI/pipeline nodes flowing into top of funnel -->
  <!-- Data particles top row -->
  <g filter="url(#glow)">
    <!-- Row 1: incoming data nodes -->
    <circle cx="44" cy="10" r="4" fill="#3B82F6" opacity="0.9"/>
    <circle cx="58" cy="8" r="3" fill="#60A5FA" opacity="0.85"/>
    <circle cx="70" cy="7" r="3.5" fill="#38BDF8" opacity="0.9"/>
    <circle cx="82" cy="8" r="3" fill="#60A5FA" opacity="0.85"/>
    <circle cx="96" cy="10" r="4" fill="#3B82F6" opacity="0.9"/>
    <!-- Connecting flow arrows (mini) -->
    <line x1="48" y1="10" x2="55" y2="9" stroke="#60A5FA" stroke-width="0.8" opacity="0.6"/>
    <line x1="62" y1="8.5" x2="67" y2="7.5" stroke="#38BDF8" stroke-width="0.8" opacity="0.6"/>
    <line x1="74" y1="7.5" x2="79" y2="8" stroke="#38BDF8" stroke-width="0.8" opacity="0.6"/>
    <line x1="86" y1="8.5" x2="92" y2="9.5" stroke="#60A5FA" stroke-width="0.8" opacity="0.6"/>
  </g>

  <!-- AI pipeline grid inside funnel (neural dots) -->
  <g opacity="0.75">
    <circle cx="56" cy="38" r="2.2" fill="#E0F2FE"/>
    <circle cx="70" cy="36" r="2.2" fill="#E0F2FE"/>
    <circle cx="84" cy="38" r="2.2" fill="#E0F2FE"/>
    <line x1="58" y1="38" x2="68" y2="36" stroke="#BAE6FD" stroke-width="0.9" opacity="0.7"/>
    <line x1="72" y1="36" x2="82" y2="38" stroke="#BAE6FD" stroke-width="0.9" opacity="0.7"/>
    <!-- Layer 2 -->
    <circle cx="62" cy="54" r="2.2" fill="#D1FAE5"/>
    <circle cx="78" cy="54" r="2.2" fill="#D1FAE5"/>
    <line x1="56" y1="40" x2="62" y2="52" stroke="#6EE7B7" stroke-width="0.8" opacity="0.6"/>
    <line x1="70" y1="38" x2="62" y2="52" stroke="#6EE7B7" stroke-width="0.8" opacity="0.6"/>
    <line x1="70" y1="38" x2="78" y2="52" stroke="#6EE7B7" stroke-width="0.8" opacity="0.6"/>
    <line x1="84" y1="40" x2="78" y2="52" stroke="#6EE7B7" stroke-width="0.8" opacity="0.6"/>
    <!-- Layer 3 (converging) -->
    <circle cx="70" cy="68" r="2.5" fill="#34D399"/>
    <line x1="62" y1="56" x2="70" y2="66" stroke="#34D399" stroke-width="0.8" opacity="0.7"/>
    <line x1="78" y1="56" x2="70" y2="66" stroke="#34D399" stroke-width="0.8" opacity="0.7"/>
  </g>

  <!-- Lead output: qualified leads emerging at bottom -->
  <!-- Glowing star/spark for qualified lead -->
  <g filter="url(#glow)">
    <!-- Lead star icon -->
    <polygon points="70,122 71.8,127.5 77.5,127.5 73,130.8 74.8,136.3 70,133 65.2,136.3 67,130.8 62.5,127.5 68.2,127.5"
      fill="#10B981" opacity="0.95" transform="scale(0.7) translate(30, 58)"/>
    <!-- Or simplified: lead dot with ring -->
    <circle cx="70" cy="130" r="5.5" fill="none" stroke="#34D399" stroke-width="1.5" opacity="0.9"/>
    <circle cx="70" cy="130" r="3" fill="#10B981" opacity="0.95"/>
    <!-- Emanating lines (qualification rays) -->
    <line x1="70" y1="122" x2="70" y2="119" stroke="#34D399" stroke-width="1" opacity="0.7"/>
    <line x1="76.5" y1="123.5" x2="78.5" y2="121.5" stroke="#34D399" stroke-width="1" opacity="0.7"/>
    <line x1="63.5" y1="123.5" x2="61.5" y2="121.5" stroke="#34D399" stroke-width="1" opacity="0.7"/>
    <line x1="78" y1="130" x2="81" y2="130" stroke="#34D399" stroke-width="1" opacity="0.7"/>
    <line x1="62" y1="130" x2="59" y2="130" stroke="#34D399" stroke-width="1" opacity="0.7"/>
  </g>

  <!-- ===================== WORDMARK (right half) ===================== -->

  <!-- "AGENTIC" — primary word, bold, gradient -->
  <text x="126" y="60"
    font-family="'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif"
    font-size="22"
    font-weight="700"
    letter-spacing="1.5"
    fill="url(#textGrad)">AGENTIC</text>

  <!-- "LEAD GEN" — secondary, lighter -->
  <text x="126" y="82"
    font-family="'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif"
    font-size="17"
    font-weight="400"
    letter-spacing="2.5"
    fill="#94A3B8">LEAD GEN</text>

  <!-- Divider line with gradient -->
  <line x1="126" y1="90" x2="278" y2="90" stroke="url(#textGrad)" stroke-width="1" opacity="0.5"/>

  <!-- Tagline -->
  <text x="126" y="105"
    font-family="'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif"
    font-size="8.5"
    font-weight="400"
    letter-spacing="1.8"
    fill="#64748B">AI-POWERED PIPELINE</text>

  <!-- Mini pipeline indicators (right side accent) -->
  <g opacity="0.8">
    <!-- Step 1: Discover -->
    <rect x="126" y="118" width="38" height="14" rx="7" fill="#1E3A5F" stroke="#2563EB" stroke-width="0.8"/>
    <text x="145" y="128" font-family="'Inter', sans-serif" font-size="7" font-weight="600"
      text-anchor="middle" fill="#60A5FA" letter-spacing="0.5">DISCOVER</text>
    <!-- Arrow -->
    <path d="M 166 125 L 170 125 L 168 122.5 M 170 125 L 168 127.5" stroke="#38BDF8" stroke-width="0.8" fill="none"/>
    <!-- Step 2: Enrich -->
    <rect x="172" y="118" width="32" height="14" rx="7" fill="#1A3D2E" stroke="#059669" stroke-width="0.8"/>
    <text x="188" y="128" font-family="'Inter', sans-serif" font-size="7" font-weight="600"
      text-anchor="middle" fill="#34D399" letter-spacing="0.5">ENRICH</text>
    <!-- Arrow -->
    <path d="M 206 125 L 210 125 L 208 122.5 M 210 125 L 208 127.5" stroke="#34D399" stroke-width="0.8" fill="none"/>
    <!-- Step 3: Convert -->
    <rect x="212" y="118" width="36" height="14" rx="7" fill="#1A2E1A" stroke="#10B981" stroke-width="0.8"/>
    <text x="230" y="128" font-family="'Inter', sans-serif" font-size="7" font-weight="600"
      text-anchor="middle" fill="#10B981" letter-spacing="0.5">CONVERT</text>
  </g>

  <!-- Bottom status bar: small metrics -->
  <g opacity="0.55">
    <circle cx="130" cy="152" r="2.5" fill="#10B981"/>
    <text x="136" y="155.5" font-family="'Inter', sans-serif" font-size="7.5" fill="#64748B">Live pipeline</text>
    <circle cx="195" cy="152" r="2" fill="#3B82F6" opacity="0.8"/>
    <text x="200" y="155.5" font-family="'Inter', sans-serif" font-size="7.5" fill="#64748B">AI-scored</text>
    <circle cx="248" cy="152" r="2" fill="#F59E0B" opacity="0.8"/>
    <text x="254" y="155.5" font-family="'Inter', sans-serif" font-size="7.5" fill="#64748B">Auto</text>
  </g>

  <!-- Outer border glow -->
  <rect width="300" height="200" fill="none" stroke="url(#textGrad)" stroke-width="1" rx="12" opacity="0.3"/>
</svg>` },
  { id: 4, title: "Constellation", concept: "dark navy star constellation network", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0d1b3e"/>
      <stop offset="100%" stop-color="#060d1f"/>
    </radialGradient>
    <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f5b731" stop-opacity="1"/>
      <stop offset="60%" stop-color="#e8930a" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#c97608" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="starGlow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd166" stop-opacity="1"/>
      <stop offset="60%" stop-color="#f5b731" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#e8930a" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle grid overlay -->
  <g opacity="0.04" stroke="#7ab3e0" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ===================== CONSTELLATION NETWORK EDGES ===================== -->
  <!-- Outer dim constellation lines -->
  <g stroke="#2a4a7f" stroke-width="0.6" opacity="0.5">
    <line x1="18" y1="28" x2="44" y2="55"/>
    <line x1="44" y1="55" x2="30" y2="82"/>
    <line x1="18" y1="28" x2="55" y2="18"/>
    <line x1="55" y1="18" x2="88" y2="32"/>
    <line x1="30" y1="82" x2="55" y2="105"/>
    <line x1="30" y1="82" x2="14" y2="110"/>
    <line x1="14" y1="110" x2="28" y2="140"/>
    <line x1="28" y1="140" x2="55" y2="155"/>
    <line x1="55" y1="155" x2="38" y2="178"/>
    <line x1="282" y1="22" x2="260" y2="45"/>
    <line x1="260" y1="45" x2="275" y2="70"/>
    <line x1="282" y1="22" x2="248" y2="18"/>
    <line x1="248" y1="18" x2="220" y2="30"/>
    <line x1="275" y1="70" x2="262" y2="98"/>
    <line x1="275" y1="70" x2="292" y2="95"/>
    <line x1="292" y1="95" x2="278" y2="125"/>
    <line x1="278" y1="125" x2="262" y2="155"/>
    <line x1="262" y1="155" x2="280" y2="178"/>
    <line x1="88" y1="32" x2="105" y2="18"/>
    <line x1="220" y1="30" x2="200" y2="18"/>
    <line x1="38" y1="178" x2="60" y2="188"/>
    <line x1="60" y1="188" x2="88" y2="178"/>
    <line x1="280" y1="178" x2="258" y2="188"/>
    <line x1="258" y1="188" x2="232" y2="180"/>
  </g>

  <!-- Mid-level lines leading to letter nodes -->
  <g stroke="#3a6aaf" stroke-width="0.8" opacity="0.6">
    <line x1="88" y1="32" x2="105" y2="50"/>
    <line x1="105" y1="50" x2="118" y2="38"/>
    <line x1="55" y1="105" x2="80" y2="118"/>
    <line x1="80" y1="118" x2="70" y2="140"/>
    <line x1="70" y1="140" x2="88" y2="158"/>
    <line x1="220" y1="30" x2="205" y2="50"/>
    <line x1="205" y1="50" x2="195" y2="38"/>
    <line x1="262" y1="98" x2="240" y2="115"/>
    <line x1="240" y1="115" x2="252" y2="140"/>
    <line x1="252" y1="140" x2="235" y2="158"/>
    <line x1="118" y1="38" x2="140" y2="30"/>
    <line x1="140" y1="30" x2="155" y2="42"/>
    <line x1="195" y1="38" x2="172" y2="30"/>
    <line x1="172" y1="30" x2="155" y2="42"/>
    <line x1="88" y1="158" x2="110" y2="168"/>
    <line x1="235" y1="158" x2="215" y2="168"/>
  </g>

  <!-- Inner bright lines connecting to ALG letter star-nodes -->
  <g stroke="#c97608" stroke-width="0.9" opacity="0.55">
    <!-- A connections -->
    <line x1="80" y1="68" x2="105" y2="50"/>
    <line x1="80" y1="68" x2="55" y2="75"/>
    <line x1="100" y1="115" x2="80" y2="118"/>
    <line x1="100" y1="115" x2="110" y2="132"/>
    <line x1="110" y1="132" x2="90" y2="148"/>
    <!-- L connections -->
    <line x1="148" y1="72" x2="140" y2="55"/>
    <line x1="148" y1="72" x2="155" y2="42"/>
    <line x1="158" y1="148" x2="148" y2="130"/>
    <line x1="158" y1="148" x2="172" y2="162"/>
    <line x1="172" y1="162" x2="155" y2="172"/>
    <!-- G connections -->
    <line x1="218" y1="68" x2="205" y2="50"/>
    <line x1="218" y1="68" x2="240" y2="80"/>
    <line x1="216" y1="120" x2="240" y2="115"/>
    <line x1="216" y1="120" x2="200" y2="130"/>
    <line x1="200" y1="130" x2="215" y2="148"/>
  </g>

  <!-- Cross-letter connecting lines (the "network" spine) -->
  <g stroke="#e8930a" stroke-width="1.0" opacity="0.45">
    <line x1="100" y1="90" x2="148" y2="90"/>
    <line x1="148" y1="90" x2="218" y2="90"/>
    <line x1="110" y1="132" x2="158" y2="132"/>
    <line x1="158" y1="132" x2="216" y2="120"/>
    <line x1="80" y1="68" x2="148" y2="72"/>
    <line x1="148" y1="72" x2="218" y2="68"/>
  </g>

  <!-- ===================== SMALL BACKGROUND STARS ===================== -->
  <g fill="#7ab3e0" opacity="0.35">
    <circle cx="18" cy="28" r="1.2"/>
    <circle cx="44" cy="55" r="1.0"/>
    <circle cx="30" cy="82" r="1.1"/>
    <circle cx="55" cy="18" r="1.3"/>
    <circle cx="14" cy="110" r="1.0"/>
    <circle cx="28" cy="140" r="1.2"/>
    <circle cx="55" cy="155" r="1.0"/>
    <circle cx="38" cy="178" r="1.1"/>
    <circle cx="60" cy="188" r="0.9"/>
    <circle cx="88" cy="178" r="1.0"/>
    <circle cx="282" cy="22" r="1.2"/>
    <circle cx="260" cy="45" r="1.0"/>
    <circle cx="275" cy="70" r="1.1"/>
    <circle cx="248" cy="18" r="1.3"/>
    <circle cx="292" cy="95" r="1.0"/>
    <circle cx="278" cy="125" r="1.2"/>
    <circle cx="262" cy="155" r="1.0"/>
    <circle cx="280" cy="178" r="1.1"/>
    <circle cx="258" cy="188" r="0.9"/>
    <circle cx="232" cy="180" r="1.0"/>
    <circle cx="105" cy="18" r="1.1"/>
    <circle cx="200" cy="18" r="1.1"/>
    <circle cx="88" cy="32" r="1.0"/>
    <circle cx="220" cy="30" r="1.0"/>
    <circle cx="105" cy="50" r="1.2"/>
    <circle cx="205" cy="50" r="1.2"/>
    <circle cx="118" cy="38" r="1.0"/>
    <circle cx="195" cy="38" r="1.0"/>
    <circle cx="140" cy="30" r="1.1"/>
    <circle cx="172" cy="30" r="1.1"/>
    <circle cx="55" cy="105" r="1.0"/>
    <circle cx="262" cy="98" r="1.0"/>
    <circle cx="80" cy="118" r="1.1"/>
    <circle cx="240" cy="115" r="1.1"/>
    <circle cx="70" cy="140" r="1.0"/>
    <circle cx="252" cy="140" r="1.0"/>
    <circle cx="88" cy="158" r="1.1"/>
    <circle cx="235" cy="158" r="1.1"/>
    <circle cx="110" cy="168" r="1.0"/>
    <circle cx="215" cy="168" r="1.0"/>
    <circle cx="172" cy="162" r="1.0"/>
    <circle cx="155" cy="172" r="1.0"/>
    <circle cx="110" cy="132" r="1.1"/>
    <circle cx="200" cy="130" r="1.1"/>
    <circle cx="215" cy="148" r="1.0"/>
    <circle cx="90" cy="148" r="1.0"/>
    <circle cx="140" cy="55" r="1.0"/>
  </g>

  <!-- Medium connector nodes -->
  <g fill="#5590c8" opacity="0.5">
    <circle cx="55" cy="75" r="1.6"/>
    <circle cx="240" cy="80" r="1.6"/>
    <circle cx="155" cy="42" r="1.5"/>
    <circle cx="148" cy="130" r="1.5"/>
    <circle cx="100" cy="115" r="1.5"/>
    <circle cx="216" cy="120" r="1.5"/>
  </g>

  <!-- ===================== ALG LETTER STAR NODES ===================== -->
  <!-- These are the main bright stars that form the ALG lettering -->

  <!-- === A letter nodes === -->
  <!-- A apex -->
  <g filter="url(#softGlow)">
    <circle cx="100" cy="68" r="10" fill="url(#starGlow)" opacity="0.3"/>
  </g>
  <circle cx="100" cy="68" r="3.5" fill="#ffd166" filter="url(#glow)" opacity="0.95"/>
  <circle cx="100" cy="68" r="1.8" fill="#fff5cc"/>

  <!-- A left base -->
  <g filter="url(#softGlow)">
    <circle cx="80" cy="110" r="9" fill="url(#starGlow)" opacity="0.25"/>
  </g>
  <circle cx="80" cy="110" r="3.0" fill="#f5b731" filter="url(#glow)" opacity="0.9"/>
  <circle cx="80" cy="110" r="1.5" fill="#fff0b0"/>

  <!-- A right base -->
  <g filter="url(#softGlow)">
    <circle cx="120" cy="110" r="9" fill="url(#starGlow)" opacity="0.25"/>
  </g>
  <circle cx="120" cy="110" r="3.0" fill="#f5b731" filter="url(#glow)" opacity="0.9"/>
  <circle cx="120" cy="110" r="1.5" fill="#fff0b0"/>

  <!-- A crossbar left -->
  <circle cx="88" cy="90" r="2.2" fill="#e8930a" filter="url(#glow)" opacity="0.8"/>
  <!-- A crossbar right -->
  <circle cx="112" cy="90" r="2.2" fill="#e8930a" filter="url(#glow)" opacity="0.8"/>

  <!-- === L letter nodes === -->
  <!-- L top -->
  <g filter="url(#softGlow)">
    <circle cx="150" cy="68" r="10" fill="url(#starGlow)" opacity="0.3"/>
  </g>
  <circle cx="150" cy="68" r="3.5" fill="#ffd166" filter="url(#glow)" opacity="0.95"/>
  <circle cx="150" cy="68" r="1.8" fill="#fff5cc"/>

  <!-- L bottom-left -->
  <g filter="url(#softGlow)">
    <circle cx="150" cy="112" r="9" fill="url(#starGlow)" opacity="0.25"/>
  </g>
  <circle cx="150" cy="112" r="3.0" fill="#f5b731" filter="url(#glow)" opacity="0.9"/>
  <circle cx="150" cy="112" r="1.5" fill="#fff0b0"/>

  <!-- L bottom-right -->
  <g filter="url(#softGlow)">
    <circle cx="175" cy="112" r="9" fill="url(#starGlow)" opacity="0.25"/>
  </g>
  <circle cx="175" cy="112" r="3.0" fill="#f5b731" filter="url(#glow)" opacity="0.9"/>
  <circle cx="175" cy="112" r="1.5" fill="#fff0b0"/>

  <!-- L mid node -->
  <circle cx="150" cy="90" r="2.2" fill="#e8930a" filter="url(#glow)" opacity="0.8"/>

  <!-- === G letter nodes === -->
  <!-- G top-left -->
  <g filter="url(#softGlow)">
    <circle cx="200" cy="68" r="10" fill="url(#starGlow)" opacity="0.3"/>
  </g>
  <circle cx="200" cy="68" r="3.5" fill="#ffd166" filter="url(#glow)" opacity="0.95"/>
  <circle cx="200" cy="68" r="1.8" fill="#fff5cc"/>

  <!-- G top-right -->
  <circle cx="222" cy="75" r="2.5" fill="#e8930a" filter="url(#glow)" opacity="0.85"/>

  <!-- G mid-right -->
  <g filter="url(#softGlow)">
    <circle cx="225" cy="90" r="8" fill="url(#starGlow)" opacity="0.22"/>
  </g>
  <circle cx="225" cy="90" r="2.8" fill="#f5b731" filter="url(#glow)" opacity="0.85"/>

  <!-- G inner mid node -->
  <circle cx="215" cy="90" r="2.2" fill="#e8930a" filter="url(#glow)" opacity="0.8"/>

  <!-- G bottom-right -->
  <circle cx="222" cy="105" r="2.5" fill="#e8930a" filter="url(#glow)" opacity="0.85"/>

  <!-- G bottom -->
  <g filter="url(#softGlow)">
    <circle cx="200" cy="112" r="9" fill="url(#starGlow)" opacity="0.25"/>
  </g>
  <circle cx="200" cy="112" r="3.0" fill="#f5b731" filter="url(#glow)" opacity="0.9"/>
  <circle cx="200" cy="112" r="1.5" fill="#fff0b0"/>

  <!-- ===================== ALG LETTER PATHS (thin star-connecting lines) ===================== -->
  <g stroke="#f5b731" stroke-width="1.4" fill="none" opacity="0.85" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">
    <!-- A -->
    <polyline points="80,110 100,68 120,110"/>
    <line x1="88" y1="90" x2="112" y2="90"/>
    <!-- L -->
    <polyline points="150,68 150,112 175,112"/>
    <!-- G -->
    <path d="M222,75 Q228,68 200,68 Q188,68 188,90 Q188,112 200,112 L222,112 L222,100 L214,100"/>
  </g>

  <!-- ===================== TAGLINE ===================== -->
  <text x="150" y="148" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="7.5" letter-spacing="3.5" fill="#7ab3e0" opacity="0.7" font-weight="400">AGENTIC LEAD GEN</text>

  <!-- ===================== DECORATIVE CORNER STARS ===================== -->
  <!-- Top-left 4-point star -->
  <g filter="url(#glow)" opacity="0.6" transform="translate(22,18)">
    <polygon points="0,-4 0.8,-0.8 4,0 0.8,0.8 0,4 -0.8,0.8 -4,0 -0.8,-0.8" fill="#f5b731"/>
  </g>
  <!-- Top-right 4-point star -->
  <g filter="url(#glow)" opacity="0.6" transform="translate(278,18)">
    <polygon points="0,-4 0.8,-0.8 4,0 0.8,0.8 0,4 -0.8,0.8 -4,0 -0.8,-0.8" fill="#f5b731"/>
  </g>
  <!-- Bottom-left 4-point star -->
  <g filter="url(#glow)" opacity="0.45" transform="translate(22,182)">
    <polygon points="0,-3 0.6,-0.6 3,0 0.6,0.6 0,3 -0.6,0.6 -3,0 -0.6,-0.6" fill="#e8930a"/>
  </g>
  <!-- Bottom-right 4-point star -->
  <g filter="url(#glow)" opacity="0.45" transform="translate(278,182)">
    <polygon points="0,-3 0.6,-0.6 3,0 0.6,0.6 0,3 -0.6,0.6 -3,0 -0.6,-0.6" fill="#e8930a"/>
  </g>

  <!-- Subtle top separator line with stars -->
  <g opacity="0.35">
    <line x1="35" y1="160" x2="115" y2="160" stroke="#3a6aaf" stroke-width="0.5"/>
    <line x1="185" y1="160" x2="265" y2="160" stroke="#3a6aaf" stroke-width="0.5"/>
    <circle cx="150" cy="160" r="1.5" fill="#f5b731" opacity="0.8"/>
  </g>
</svg>` },
  { id: 5, title: "Neon Cyberpunk", concept: "hot pink and electric blue neon glow", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Hot pink neon glow -->
    <filter id="pinkGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur1"/>
      <feGaussianBlur stdDeviation="8" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Electric blue neon glow -->
    <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur1"/>
      <feGaussianBlur stdDeviation="9" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Soft ambient glow for text -->
    <filter id="textGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Strong outer glow for the A -->
    <filter id="aGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="b1"/>
      <feGaussianBlur stdDeviation="12" result="b2"/>
      <feGaussianBlur stdDeviation="20" result="b3"/>
      <feMerge>
        <feMergeNode in="b3"/>
        <feMergeNode in="b2"/>
        <feMergeNode in="b1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Scanline pattern -->
    <pattern id="scanlines" x="0" y="0" width="300" height="3" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="300" height="1.5" fill="rgba(0,0,0,0.35)"/>
      <rect x="0" y="1.5" width="300" height="1.5" fill="rgba(0,0,0,0)"/>
    </pattern>
    <!-- Noise texture -->
    <filter id="grunge">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
      <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended"/>
      <feComposite in="blended" in2="SourceGraphic" operator="in"/>
    </filter>
    <!-- Pink gradient for A fill -->
    <linearGradient id="pinkBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff2d78"/>
      <stop offset="55%" stop-color="#cc1aff"/>
      <stop offset="100%" stop-color="#00e5ff"/>
    </linearGradient>
    <!-- Edge highlight gradient -->
    <linearGradient id="edgeHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1"/>
    </linearGradient>
    <!-- Circuit line gradient -->
    <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00e5ff" stop-opacity="0"/>
      <stop offset="40%" stop-color="#00e5ff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="circuitGrad2" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ff2d78" stop-opacity="0"/>
      <stop offset="40%" stop-color="#ff2d78" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ff2d78" stop-opacity="0.3"/>
    </linearGradient>
    <!-- Corner bracket clip -->
    <clipPath id="mainClip">
      <rect x="2" y="2" width="296" height="196" rx="4"/>
    </clipPath>
  </defs>

  <!-- Pitch black background -->
  <rect width="300" height="200" fill="#000000"/>

  <!-- Subtle dark grid -->
  <g clip-path="url(#mainClip)" opacity="0.18">
    <line x1="0" y1="25" x2="300" y2="25" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="0" y1="50" x2="300" y2="50" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="0" y1="75" x2="300" y2="75" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="0" y1="100" x2="300" y2="100" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="0" y1="125" x2="300" y2="125" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="0" y1="150" x2="300" y2="150" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="0" y1="175" x2="300" y2="175" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="37.5" y1="0" x2="37.5" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="75" y1="0" x2="75" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="112.5" y1="0" x2="112.5" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="150" y1="0" x2="150" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="187.5" y1="0" x2="187.5" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="225" y1="0" x2="225" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
    <line x1="262.5" y1="0" x2="262.5" y2="200" stroke="#00e5ff" stroke-width="0.4"/>
  </g>

  <!-- Ambient pink bloom bottom-left -->
  <ellipse cx="30" cy="180" rx="60" ry="40" fill="#ff2d78" opacity="0.07" filter="url(#pinkGlow)"/>
  <!-- Ambient blue bloom top-right -->
  <ellipse cx="270" cy="30" rx="60" ry="40" fill="#00e5ff" opacity="0.07" filter="url(#blueGlow)"/>

  <!-- Circuit lines - left side (blue) -->
  <g filter="url(#blueGlow)" opacity="0.9">
    <polyline points="10,95 35,95 42,88 60,88" fill="none" stroke="#00e5ff" stroke-width="1"/>
    <circle cx="60" cy="88" r="2" fill="#00e5ff"/>
    <polyline points="10,110 28,110 28,118 55,118" fill="none" stroke="#00e5ff" stroke-width="0.8"/>
    <rect x="53" y="116" width="4" height="4" fill="none" stroke="#00e5ff" stroke-width="0.8"/>
  </g>

  <!-- Circuit lines - right side (pink) -->
  <g filter="url(#pinkGlow)" opacity="0.9">
    <polyline points="290,95 265,95 258,88 240,88" fill="none" stroke="#ff2d78" stroke-width="1"/>
    <circle cx="240" cy="88" r="2" fill="#ff2d78"/>
    <polyline points="290,110 272,110 272,118 245,118" fill="none" stroke="#ff2d78" stroke-width="0.8"/>
    <rect x="243" y="116" width="4" height="4" fill="none" stroke="#ff2d78" stroke-width="0.8"/>
  </g>

  <!-- Geometric A letterform - glow layer (bloomed) -->
  <g filter="url(#aGlow)">
    <!-- A outline - thick glow strokes -->
    <polygon points="150,18 108,112 125,112 135,88 165,88 175,112 192,112" fill="none" stroke="#ff2d78" stroke-width="4" stroke-linejoin="round"/>
    <line x1="138" y1="78" x2="162" y2="78" stroke="#00e5ff" stroke-width="3"/>
  </g>

  <!-- Geometric A letterform - main crisp shape -->
  <!-- Outer A shell filled with gradient -->
  <polygon points="150,20 110,113 126,113 136,89 164,89 174,113 190,113" fill="url(#pinkBlueGrad)" opacity="0.13"/>

  <!-- A left stroke -->
  <polygon points="150,22 113,113 128,113 150,50" fill="none" stroke="url(#pinkBlueGrad)" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- A right stroke -->
  <polygon points="150,22 187,113 172,113 150,50" fill="none" stroke="url(#pinkBlueGrad)" stroke-width="2.5" stroke-linejoin="round"/>

  <!-- A crossbar (electric blue) -->
  <line x1="136" y1="79" x2="164" y2="79" stroke="#00e5ff" stroke-width="2.5" filter="url(#blueGlow)"/>

  <!-- Inner A face (bright edges) -->
  <polyline points="150,26 119,110 129,110 150,55 171,110 181,110 150,26" fill="none" stroke="url(#edgeHighlight)" stroke-width="0.8" opacity="0.7"/>

  <!-- Scanlines over A region -->
  <g clip-path="url(#mainClip)" opacity="0.22">
    <rect x="95" y="15" width="110" height="105" fill="url(#scanlines)"/>
  </g>

  <!-- Scan-line cuts through A (grunge) -->
  <g opacity="0.55">
    <rect x="112" y="58" width="76" height="1.2" fill="#000" opacity="0.7"/>
    <rect x="115" y="68" width="70" height="0.8" fill="#000" opacity="0.5"/>
    <rect x="120" y="95" width="60" height="1.0" fill="#000" opacity="0.6"/>
    <rect x="125" y="103" width="50" height="0.8" fill="#000" opacity="0.4"/>
  </g>

  <!-- Corner brackets (hot pink) -->
  <g stroke="#ff2d78" stroke-width="1.5" fill="none" filter="url(#pinkGlow)" opacity="0.85">
    <!-- Top-left -->
    <polyline points="8,22 8,8 22,8"/>
    <!-- Top-right -->
    <polyline points="278,8 292,8 292,22"/>
    <!-- Bottom-left -->
    <polyline points="8,178 8,192 22,192"/>
    <!-- Bottom-right -->
    <polyline points="278,192 292,192 292,178"/>
  </g>

  <!-- Horizontal neon divider lines -->
  <line x1="20" y1="128" x2="280" y2="128" stroke="url(#circuitGrad2)" stroke-width="0.7" opacity="0.6"/>
  <line x1="20" y1="130" x2="280" y2="130" stroke="url(#circuitGrad)" stroke-width="0.7" opacity="0.6"/>

  <!-- "AGENTIC" text -->
  <text
    x="150" y="150"
    text-anchor="middle"
    font-family="'Courier New', Courier, monospace"
    font-size="22"
    font-weight="700"
    letter-spacing="8"
    fill="#ff2d78"
    filter="url(#pinkGlow)"
  >AGENTIC</text>

  <!-- "LEAD GEN" text (electric blue) -->
  <text
    x="150" y="172"
    text-anchor="middle"
    font-family="'Courier New', Courier, monospace"
    font-size="13"
    font-weight="400"
    letter-spacing="6"
    fill="#00e5ff"
    filter="url(#textGlow)"
  >LEAD  GEN</text>

  <!-- Tiny node dots scattered -->
  <g fill="#ff2d78" filter="url(#pinkGlow)" opacity="0.7">
    <circle cx="22" cy="130" r="1.5"/>
    <circle cx="278" cy="130" r="1.5"/>
    <circle cx="150" cy="130" r="1.5"/>
  </g>
  <g fill="#00e5ff" filter="url(#blueGlow)" opacity="0.7">
    <circle cx="86" cy="130" r="1.2"/>
    <circle cx="214" cy="130" r="1.2"/>
  </g>

  <!-- Version tag (grunge detail) -->
  <text x="260" y="190" font-family="'Courier New', monospace" font-size="6" fill="#ff2d78" opacity="0.45" letter-spacing="1">v2.0.X</text>
  <text x="8" y="190" font-family="'Courier New', monospace" font-size="6" fill="#00e5ff" opacity="0.45" letter-spacing="1">SYS::OK</text>

  <!-- Overall scanline overlay -->
  <rect width="300" height="200" fill="url(#scanlines)" opacity="0.12"/>

  <!-- Outer border glow -->
  <rect x="1" y="1" width="298" height="198" rx="3" fill="none" stroke="#ff2d78" stroke-width="0.8" opacity="0.3" filter="url(#pinkGlow)"/>
  <rect x="1" y="1" width="298" height="198" rx="3" fill="none" stroke="#00e5ff" stroke-width="0.4" opacity="0.2"/>
</svg>` },
  { id: 6, title: "Hexagonal Grid", concept: "honeycomb hexagons forming initials", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="tealIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4338ca;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="tealIndigoLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#818cf8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="hexGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="hexGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="hexGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f766e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- White background -->
  <rect width="300" height="200" fill="white"/>

  <!-- Hexagon helper: flat-top hexagons, size r=18 -->
  <!-- Hex layout: flat-top, r=18, horiz spacing=31.2, vert spacing=27 -->
  <!-- "A" shape cluster: columns arranged to form a wide A -->

  <!-- Column layout for "A" shape:
       Bottom-left leg: col 1 rows 1-3
       Bottom-right leg: col 5 rows 1-3
       Middle crossbar: col 2-4 row 2
       Upper-left: col 2 row 3-4, col 3 row 4-5
       Upper-right: col 4 row 3-4, col 3 row 4-5
       Top apex: col 3 row 5-6
  -->

  <!-- Using pointy-top hexagons with r=18 -->
  <!-- pointy-top hex: width = r*sqrt(3), height = r*2 -->
  <!-- horiz spacing = r*sqrt(3) = 31.18 -->
  <!-- vert spacing = r*1.5 = 27 -->
  <!-- odd columns offset by r*sqrt(3)/2 vertically -->

  <!-- Anchor center around x=105, starting y=30 -->
  <!-- r=17, w=29.4, h=34, col_spacing=29.4, row_offset=25.5 -->

  <!-- Precomputed pointy-top hex (r=17) path centered at 0,0:
       top: (0,-17), top-right: (14.7,-8.5), bot-right: (14.7,8.5),
       bot: (0,17), bot-left: (-14.7,8.5), top-left: (-14.7,-8.5)
  -->

  <!-- "A" grid formation — 11 hexagons forming the letter A -->
  <!-- Using flat-top hexagons r=18:
       point coords: right:(18,0), top-right:(9,15.6), top-left:(-9,15.6),
       left:(-18,0), bot-left:(-9,-15.6), bot-right:(9,-15.6)
       col spacing = 27, row spacing = 31.2, odd-row offset = 13.5
  -->

  <g filter="url(#glow)">

  <!-- Bottom-left leg hexagons (col 0, rows 0,1,2) -->
  <!-- Col 0: x=62, rows at y=155, y=123.8, y=92.6 -->
  <polygon points="80,155 71,140.6 53,140.6 44,155 53,169.4 71,169.4" fill="url(#hexGrad1)" opacity="0.85"/>
  <polygon points="80,124 71,109.6 53,109.6 44,124 53,138.4 71,138.4" fill="url(#hexGrad1)" opacity="0.90"/>
  <polygon points="80,93 71,78.6 53,78.6 44,93 53,107.4 71,107.4" fill="url(#hexGrad1)" opacity="0.95"/>

  <!-- Bottom-right leg hexagons (col 4, rows 0,1,2) -->
  <!-- Col 4: x=170 -->
  <polygon points="188,155 179,140.6 161,140.6 152,155 161,169.4 179,169.4" fill="url(#hexGrad2)" opacity="0.85"/>
  <polygon points="188,124 179,109.6 161,109.6 152,124 161,138.4 179,138.4" fill="url(#hexGrad2)" opacity="0.90"/>
  <polygon points="188,93 179,78.6 161,78.6 152,93 161,107.4 179,107.4" fill="url(#hexGrad2)" opacity="0.95"/>

  <!-- Crossbar hexagons (cols 1,2,3, row 1) -->
  <!-- Col 1: x=98, Col 2: x=126 (offset row), Col 3: x=152 -->
  <polygon points="116,124 107,109.6 89,109.6 80,124 89,138.4 107,138.4" fill="url(#hexGrad1)" opacity="0.90"/>
  <polygon points="152,124 143,109.6 125,109.6 116,124 125,138.4 143,138.4" fill="url(#hexGrad2)" opacity="0.90"/>

  <!-- Upper-left diagonal (col 1, row 2 + col 0 row 3) -->
  <polygon points="116,93 107,78.6 89,78.6 80,93 89,107.4 107,107.4" fill="url(#hexGrad1)" opacity="0.95"/>
  <polygon points="116,62 107,47.6 89,47.6 80,62 89,76.4 107,76.4" fill="url(#hexGrad3)" opacity="1"/>

  <!-- Upper-right diagonal (col 3, row 2 + col 4 row 3) -->
  <polygon points="152,93 143,78.6 125,78.6 116,93 125,107.4 143,107.4" fill="url(#hexGrad2)" opacity="0.95"/>
  <polygon points="152,62 143,47.6 125,47.6 116,62 125,76.4 143,76.4" fill="url(#hexGrad3)" opacity="1"/>

  <!-- Apex hexagon (col 2, row 4) centered between the two upper diagonals -->
  <polygon points="134,31 125,16.6 107,16.6 98,31 107,45.4 125,45.4" fill="url(#hexGrad3)" opacity="1"/>

  </g>

  <!-- Subtle connector lines between adjacent hexes -->
  <g stroke="white" stroke-width="1.5" opacity="0.4">
    <!-- Crossbar connectors -->
    <line x1="116" y1="124" x2="80" y2="124"/>
    <line x1="152" y1="124" x2="116" y2="124"/>
    <line x1="188" y1="124" x2="152" y2="124"/>
  </g>

  <!-- Text: "Agentic Lead Gen" -->
  <text x="116" y="186" font-family="'Inter', 'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="600" letter-spacing="0.5" fill="url(#tealIndigo)" text-anchor="middle">AGENTIC LEAD GEN</text>

  <!-- Small ALG monogram hint inside apex hex -->
  <text x="116" y="35" font-family="'Inter', 'Helvetica Neue', Arial, sans-serif" font-size="10" font-weight="700" fill="white" text-anchor="middle" opacity="0.9">ALG</text>

</svg>` },
  { id: 7, title: "Radar Sonar", concept: "military radar targeting system", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="radarBg" cx="50%" cy="60%" r="50%">
      <stop offset="0%" stop-color="#001a00"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="sweepGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#00ff41" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="strongGlow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="radarClip">
      <circle cx="150" cy="95" r="78"/>
    </clipPath>
    <!-- Sweep trail gradient -->
    <linearGradient id="sweepTrail" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0"/>
      <stop offset="100%" stop-color="#00ff41" stop-opacity="0.4"/>
    </linearGradient>
    <mask id="sweepMask">
      <circle cx="150" cy="95" r="78" fill="white"/>
    </mask>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#000000"/>
  <circle cx="150" cy="95" r="85" fill="url(#radarBg)"/>

  <!-- Outer bezel -->
  <circle cx="150" cy="95" r="82" fill="none" stroke="#003300" stroke-width="2"/>
  <circle cx="150" cy="95" r="80" fill="none" stroke="#00ff41" stroke-width="1" opacity="0.5"/>

  <!-- Concentric rings -->
  <g filter="url(#glow)" clip-path="url(#radarClip)">
    <circle cx="150" cy="95" r="60" fill="none" stroke="#00aa2a" stroke-width="0.6" opacity="0.7"/>
    <circle cx="150" cy="95" r="40" fill="none" stroke="#00aa2a" stroke-width="0.6" opacity="0.7"/>
    <circle cx="150" cy="95" r="20" fill="none" stroke="#00aa2a" stroke-width="0.6" opacity="0.7"/>

    <!-- Grid lines -->
    <line x1="72" y1="95" x2="228" y2="95" stroke="#00aa2a" stroke-width="0.5" opacity="0.5"/>
    <line x1="150" y1="17" x2="150" y2="173" stroke="#00aa2a" stroke-width="0.5" opacity="0.5"/>
    <line x1="96" y1="41" x2="204" y2="149" stroke="#00aa2a" stroke-width="0.4" opacity="0.3"/>
    <line x1="204" y1="41" x2="96" y2="149" stroke="#00aa2a" stroke-width="0.4" opacity="0.3"/>

    <!-- Sweep area (wedge) - simulated with filled sector -->
    <path d="M150,95 L228,95 A78,78 0 0,0 205,40 Z" fill="#00ff41" opacity="0.07"/>
    <path d="M150,95 L228,95 A78,78 0 0,0 215,58 Z" fill="#00ff41" opacity="0.1"/>
    <path d="M150,95 L228,95 A78,78 0 0,0 222,74 Z" fill="#00ff41" opacity="0.15"/>

    <!-- Sweep line -->
    <line x1="150" y1="95" x2="228" y2="95" stroke="#00ff41" stroke-width="1.5" opacity="0.9" filter="url(#strongGlow)">
      <animateTransform attributeName="transform" type="rotate" from="0 150 95" to="360 150 95" dur="4s" repeatCount="indefinite"/>
    </line>
    <!-- Sweep glow line -->
    <line x1="150" y1="95" x2="225" y2="95" stroke="#00ff41" stroke-width="3" opacity="0.3" filter="url(#glow)">
      <animateTransform attributeName="transform" type="rotate" from="0 150 95" to="360 150 95" dur="4s" repeatCount="indefinite"/>
    </line>
  </g>

  <!-- Radar targets (blips) -->
  <g filter="url(#strongGlow)">
    <!-- Blip 1 -->
    <circle cx="185" cy="68" r="2.5" fill="#00ff41" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" begin="0.3s" repeatCount="indefinite"/>
    </circle>
    <!-- Blip 2 -->
    <circle cx="168" cy="118" r="2" fill="#00ff41" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="3s" begin="1.1s" repeatCount="indefinite"/>
    </circle>
    <!-- Blip 3 -->
    <circle cx="125" cy="75" r="1.8" fill="#00ff41" opacity="0.7">
      <animate attributeName="opacity" values="0.7;0.15;0.7" dur="2.5s" begin="0.7s" repeatCount="indefinite"/>
    </circle>
    <!-- Blip 4 -->
    <circle cx="200" cy="100" r="3" fill="#00ff41" opacity="0.95">
      <animate attributeName="opacity" values="0.95;0.2;0.95" dur="1.8s" begin="0s" repeatCount="indefinite"/>
    </circle>
    <!-- Blip 5 -->
    <circle cx="140" cy="130" r="1.5" fill="#00ff41" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0.1;0.6" dur="3.5s" begin="1.5s" repeatCount="indefinite"/>
    </circle>
  </g>

  <!-- Crosshair center -->
  <g filter="url(#glow)">
    <line x1="143" y1="95" x2="147" y2="95" stroke="#00ff41" stroke-width="1.2"/>
    <line x1="153" y1="95" x2="157" y2="95" stroke="#00ff41" stroke-width="1.2"/>
    <line x1="150" y1="88" x2="150" y2="92" stroke="#00ff41" stroke-width="1.2"/>
    <line x1="150" y1="98" x2="150" y2="102" stroke="#00ff41" stroke-width="1.2"/>
    <circle cx="150" cy="95" r="3.5" fill="none" stroke="#00ff41" stroke-width="1"/>
    <circle cx="150" cy="95" r="1.2" fill="#00ff41"/>
  </g>

  <!-- Tick marks on outer ring -->
  <g stroke="#00ff41" stroke-width="0.8" opacity="0.6">
    <!-- Cardinal ticks -->
    <line x1="150" y1="15" x2="150" y2="22"/>
    <line x1="150" y1="168" x2="150" y2="175"/>
    <line x1="72" y1="95" x2="79" y2="95"/>
    <line x1="221" y1="95" x2="228" y2="95"/>
    <!-- Ordinal ticks (smaller) -->
    <line x1="95" y1="40" x2="99" y2="44" stroke-width="0.5" opacity="0.4"/>
    <line x1="205" y1="40" x2="201" y2="44" stroke-width="0.5" opacity="0.4"/>
    <line x1="95" y1="150" x2="99" y2="146" stroke-width="0.5" opacity="0.4"/>
    <line x1="205" y1="150" x2="201" y2="146" stroke-width="0.5" opacity="0.4"/>
  </g>

  <!-- Degree markers -->
  <g fill="#00aa2a" font-family="monospace" font-size="5.5" opacity="0.7">
    <text x="147" y="13" text-anchor="middle">0</text>
    <text x="147" y="183" text-anchor="middle">180</text>
    <text x="65" y="98" text-anchor="middle">270</text>
    <text x="230" y="98" text-anchor="start">90</text>
  </g>

  <!-- Bottom label -->
  <text x="150" y="192" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="bold" fill="#00ff41" letter-spacing="2" filter="url(#glow)">AGENTIC LEAD GEN</text>

  <!-- Scan line animation overlay -->
  <rect x="0" y="0" width="300" height="200" fill="none" stroke="none">
    <animate attributeName="opacity" values="0;0.03;0" dur="0.1s" repeatCount="indefinite"/>
  </rect>

  <!-- Corner brackets (HUD style) -->
  <g stroke="#00ff41" stroke-width="0.8" fill="none" opacity="0.4">
    <!-- Top-left -->
    <polyline points="5,18 5,5 18,5"/>
    <!-- Top-right -->
    <polyline points="282,5 295,5 295,18"/>
    <!-- Bottom-left -->
    <polyline points="5,182 5,195 18,195"/>
    <!-- Bottom-right -->
    <polyline points="282,195 295,195 295,182"/>
  </g>

  <!-- Status text -->
  <text x="8" y="11" font-family="'Courier New', monospace" font-size="4.5" fill="#00aa2a" opacity="0.6">SYS:ACTIVE</text>
  <text x="248" y="11" font-family="'Courier New', monospace" font-size="4.5" fill="#00aa2a" opacity="0.6">RNG:78NM</text>
  <text x="8" y="192" font-family="'Courier New', monospace" font-size="4.5" fill="#00aa2a" opacity="0.6">TGT:05</text>
  <text x="246" y="192" font-family="'Courier New', monospace" font-size="4.5" fill="#00aa2a" opacity="0.6">MODE:ACQ</text>
</svg>` },
  { id: 8, title: "DNA Helix", concept: "double helix with data rungs", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="helixGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="helixGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="strandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- White background -->
  <rect width="300" height="200" fill="white"/>

  <!-- Subtle background shimmer -->
  <ellipse cx="90" cy="100" rx="70" ry="80" fill="url(#helixGrad1)" opacity="0.04"/>

  <!-- DNA Helix Group (centered at x=90, y=100, height~140) -->
  <g transform="translate(90,100)" filter="url(#glow)">

    <!-- Left strand (sine wave): x = -18*sin(t), y = t, t from -65 to 65 -->
    <!-- Rendered as a smooth cubic bezier path -->
    <path d="
      M -2,-65
      C -22,-55 -22,-45 -2,-35
      C 18,-25 18,-15 -2,-5
      C -22,5 -22,15 -2,25
      C 18,35 18,45 -2,55
      C -22,65 -22,75 -2,85
    " fill="none" stroke="url(#strandGrad)" stroke-width="3" stroke-linecap="round" opacity="0.0"/>

    <!-- Strand A: smooth sine path -->
    <path d="
      M -2,-65
      C -28,-55 -28,-45 -2,-35
      C 24,-25 24,-15 -2,-5
      C -28,5 -28,15 -2,25
      C 24,35 24,45 -2,55
      C -28,65 -28,55 -2,65
    " fill="none" stroke="url(#strandGrad)" stroke-width="3.5" stroke-linecap="round"/>

    <!-- Strand B: phase offset by half period -->
    <path d="
      M -2,-65
      C 24,-55 24,-45 -2,-35
      C -28,-25 -28,-15 -2,-5
      C 24,5 24,15 -2,25
      C -28,35 -28,45 -2,55
      C 24,65 24,55 -2,65
    " fill="none" stroke="url(#helixGrad2)" stroke-width="3.5" stroke-linecap="round"/>

    <!-- Rungs with binary/byte labels — 10 rungs spaced 13px apart -->
    <!-- Rung positions (y): -57, -44, -31, -18, -5, 8, 21, 34, 47, 60 -->
    <!-- Rung x endpoints computed from sine waves at each y -->

    <!-- y=-57: A~-24, B~24 -->
    <line x1="-22" y1="-57" x2="22" y2="-57" stroke="#6366f1" stroke-width="1.5" opacity="0.85"/>
    <text x="-21" y="-53" font-family="'Courier New',monospace" font-size="5" fill="#6366f1" opacity="0.9">1010</text>
    <text x="5" y="-53" font-family="'Courier New',monospace" font-size="5" fill="#7c3aed" opacity="0.9">0101</text>

    <!-- y=-44: A~0, B~0 (crossover) -->
    <line x1="-20" y1="-44" x2="20" y2="-44" stroke="#7c3aed" stroke-width="1.5" opacity="0.75"/>
    <text x="-19" y="-40" font-family="'Courier New',monospace" font-size="5" fill="#7c3aed" opacity="0.85">0xFF</text>

    <!-- y=-31: A~24, B~-24 -->
    <line x1="-22" y1="-31" x2="22" y2="-31" stroke="#8b5cf6" stroke-width="1.5" opacity="0.85"/>
    <text x="-21" y="-27" font-family="'Courier New',monospace" font-size="5" fill="#8b5cf6" opacity="0.9">1100</text>
    <text x="5" y="-27" font-family="'Courier New',monospace" font-size="5" fill="#6366f1" opacity="0.9">0011</text>

    <!-- y=-18 -->
    <line x1="-20" y1="-18" x2="20" y2="-18" stroke="#7c3aed" stroke-width="1.5" opacity="0.75"/>
    <text x="-19" y="-14" font-family="'Courier New',monospace" font-size="5" fill="#6366f1" opacity="0.85">0xA3</text>

    <!-- y=-5 -->
    <line x1="-22" y1="-5" x2="22" y2="-5" stroke="#6366f1" stroke-width="1.5" opacity="0.85"/>
    <text x="-21" y="-1" font-family="'Courier New',monospace" font-size="5" fill="#7c3aed" opacity="0.9">1110</text>
    <text x="5" y="-1" font-family="'Courier New',monospace" font-size="5" fill="#8b5cf6" opacity="0.9">0001</text>

    <!-- y=8 -->
    <line x1="-20" y1="8" x2="20" y2="8" stroke="#8b5cf6" stroke-width="1.5" opacity="0.75"/>
    <text x="-19" y="12" font-family="'Courier New',monospace" font-size="5" fill="#7c3aed" opacity="0.85">0x1F</text>

    <!-- y=21 -->
    <line x1="-22" y1="21" x2="22" y2="21" stroke="#7c3aed" stroke-width="1.5" opacity="0.85"/>
    <text x="-21" y="25" font-family="'Courier New',monospace" font-size="5" fill="#6366f1" opacity="0.9">1001</text>
    <text x="5" y="25" font-family="'Courier New',monospace" font-size="5" fill="#7c3aed" opacity="0.9">0110</text>

    <!-- y=34 -->
    <line x1="-20" y1="34" x2="20" y2="34" stroke="#6366f1" stroke-width="1.5" opacity="0.75"/>
    <text x="-19" y="38" font-family="'Courier New',monospace" font-size="5" fill="#8b5cf6" opacity="0.85">0xB7</text>

    <!-- y=47 -->
    <line x1="-22" y1="47" x2="22" y2="47" stroke="#8b5cf6" stroke-width="1.5" opacity="0.85"/>
    <text x="-21" y="51" font-family="'Courier New',monospace" font-size="5" fill="#6366f1" opacity="0.9">1111</text>
    <text x="5" y="51" font-family="'Courier New',monospace" font-size="5" fill="#7c3aed" opacity="0.9">0000</text>

    <!-- y=60 -->
    <line x1="-20" y1="60" x2="20" y2="60" stroke="#7c3aed" stroke-width="1.5" opacity="0.75"/>
    <text x="-19" y="64" font-family="'Courier New',monospace" font-size="5" fill="#6366f1" opacity="0.85">0xC2</text>

    <!-- Endpoint dots for strand A -->
    <circle cx="-2" cy="-65" r="4" fill="#4f46e5" opacity="0.9"/>
    <circle cx="-2" cy="65" r="4" fill="#4f46e5" opacity="0.9"/>
    <!-- Endpoint dots for strand B -->
    <circle cx="-2" cy="-65" r="2.5" fill="#a855f7" opacity="0.8"/>
    <circle cx="-2" cy="65" r="2.5" fill="#a855f7" opacity="0.8"/>

    <!-- Crossover node dots -->
    <circle cx="-2" cy="-35" r="3" fill="#7c3aed" opacity="0.7"/>
    <circle cx="-2" cy="-5" r="3" fill="#7c3aed" opacity="0.7"/>
    <circle cx="-2" cy="25" r="3" fill="#7c3aed" opacity="0.7"/>
    <circle cx="-2" cy="55" r="3" fill="#7c3aed" opacity="0.7"/>
  </g>

  <!-- Vertical divider line -->
  <line x1="148" y1="30" x2="148" y2="170" stroke="#e0e0f0" stroke-width="1" opacity="0.6"/>

  <!-- ALG Text Block -->
  <g transform="translate(162, 82)" filter="url(#softGlow)">
    <!-- "ALG" large letters -->
    <text
      x="0" y="0"
      font-family="'Arial Black', 'Arial', sans-serif"
      font-size="52"
      font-weight="900"
      letter-spacing="-1"
      fill="url(#textGrad)"
    >ALG</text>

    <!-- Underline accent bar -->
    <rect x="0" y="8" width="118" height="3" rx="1.5" fill="url(#textGrad)" opacity="0.6"/>

    <!-- Subtitle: "Agentic Lead Gen" -->
    <text
      x="1" y="26"
      font-family="'Arial', sans-serif"
      font-size="10"
      font-weight="400"
      letter-spacing="2.5"
      fill="#7c3aed"
      opacity="0.85"
    >AGENTIC LEAD GEN</text>

    <!-- Micro tagline -->
    <text
      x="1" y="41"
      font-family="'Courier New', monospace"
      font-size="7.5"
      fill="#6366f1"
      opacity="0.65"
      letter-spacing="0.8"
    >AI · DATA · DISCOVERY</text>
  </g>

  <!-- Small decorative data-node cluster top-right -->
  <g transform="translate(272,28)" opacity="0.5">
    <circle cx="0" cy="0" r="3" fill="#7c3aed"/>
    <circle cx="10" cy="5" r="2" fill="#6366f1"/>
    <circle cx="5" cy="12" r="2.5" fill="#a855f7"/>
    <line x1="0" y1="0" x2="10" y2="5" stroke="#7c3aed" stroke-width="1"/>
    <line x1="10" y1="5" x2="5" y2="12" stroke="#6366f1" stroke-width="1"/>
    <line x1="0" y1="0" x2="5" y2="12" stroke="#8b5cf6" stroke-width="1"/>
  </g>

  <!-- Small decorative data-node cluster bottom-left -->
  <g transform="translate(18,158)" opacity="0.4">
    <circle cx="0" cy="0" r="2.5" fill="#6366f1"/>
    <circle cx="8" cy="-6" r="2" fill="#7c3aed"/>
    <circle cx="14" cy="2" r="2" fill="#a855f7"/>
    <line x1="0" y1="0" x2="8" y2="-6" stroke="#6366f1" stroke-width="1"/>
    <line x1="8" y1="-6" x2="14" y2="2" stroke="#7c3aed" stroke-width="1"/>
  </g>
</svg>` },
  { id: 9, title: "Rocket Launch", concept: "rocket trajectory as growth chart", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Main rocket gradient -->
    <linearGradient id="rocketGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF2D00;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FF6B00;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFB300;stop-opacity:1" />
    </linearGradient>
    <!-- Trail gradient -->
    <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF2D00;stop-opacity:0" />
      <stop offset="100%" style="stop-color:#FF6B00;stop-opacity:0.8" />
    </linearGradient>
    <!-- Chart line gradient -->
    <linearGradient id="chartGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF2D00;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#FFB300;stop-opacity:0.9" />
    </linearGradient>
    <!-- Glow filter -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Strong glow for rocket -->
    <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Spark filter -->
    <filter id="sparkGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Dark background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0A14;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#12101E;stop-opacity:1" />
    </linearGradient>
    <!-- Chart area fill -->
    <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B00;stop-opacity:0.25" />
      <stop offset="100%" style="stop-color:#FF2D00;stop-opacity:0" />
    </linearGradient>
    <!-- Wordmark gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF4500;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FF7A00;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFB300;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle grid lines -->
  <g opacity="0.07" stroke="#FF6B00" stroke-width="0.5">
    <line x1="30" y1="60" x2="30" y2="145"/>
    <line x1="30" y1="145" x2="195" y2="145"/>
    <!-- Vertical grid -->
    <line x1="72" y1="60" x2="72" y2="145" stroke-dasharray="2,4"/>
    <line x1="114" y1="60" x2="114" y2="145" stroke-dasharray="2,4"/>
    <line x1="156" y1="60" x2="156" y2="145" stroke-dasharray="2,4"/>
    <!-- Horizontal grid -->
    <line x1="30" y1="120" x2="195" y2="120" stroke-dasharray="2,4"/>
    <line x1="30" y1="95" x2="195" y2="95" stroke-dasharray="2,4"/>
    <line x1="30" y1="70" x2="195" y2="70" stroke-dasharray="2,4"/>
  </g>

  <!-- Chart area fill under trajectory -->
  <path d="M30 145 L60 138 L90 128 L115 115 L140 98 L165 75 L180 58 L180 145 Z"
        fill="url(#chartFill)" opacity="0.6"/>

  <!-- Chart trajectory / rocket path (dashed baseline) -->
  <path d="M30 145 L60 138 L90 128 L115 115 L140 98 L165 75 L180 58"
        fill="none" stroke="url(#chartGrad)" stroke-width="2.5"
        stroke-dasharray="4,3" opacity="0.5" filter="url(#glow)"/>

  <!-- Chart data points -->
  <g fill="url(#rocketGrad)" filter="url(#sparkGlow)">
    <circle cx="30" cy="145" r="2.5" opacity="0.7"/>
    <circle cx="60" cy="138" r="2.5" opacity="0.75"/>
    <circle cx="90" cy="128" r="2.5" opacity="0.8"/>
    <circle cx="115" cy="115" r="2.8" opacity="0.85"/>
    <circle cx="140" cy="98" r="3" opacity="0.9"/>
    <circle cx="165" cy="75" r="3.2" opacity="0.95"/>
  </g>

  <!-- Spark trail particles -->
  <g filter="url(#sparkGlow)">
    <!-- Trail sparks along path -->
    <circle cx="155" cy="83" r="1.8" fill="#FFB300" opacity="0.9"/>
    <circle cx="145" cy="96" r="1.4" fill="#FF8C00" opacity="0.75"/>
    <circle cx="135" cy="104" r="1.2" fill="#FF6B00" opacity="0.6"/>
    <circle cx="170" cy="70" r="1.5" fill="#FFD700" opacity="0.85"/>

    <!-- Scatter sparks around rocket -->
    <circle cx="188" cy="52" r="1.2" fill="#FFD700" opacity="0.9"/>
    <circle cx="192" cy="48" r="0.9" fill="#FFA500" opacity="0.8"/>
    <circle cx="183" cy="45" r="0.8" fill="#FF6B00" opacity="0.7"/>
    <circle cx="195" cy="55" r="1" fill="#FFE066" opacity="0.85"/>
    <circle cx="186" cy="42" r="1.3" fill="#FFB300" opacity="0.75"/>

    <!-- Off-trail sparks -->
    <circle cx="160" cy="70" r="1" fill="#FF6B00" opacity="0.5"/>
    <circle cx="175" cy="63" r="0.8" fill="#FFB300" opacity="0.55"/>
    <circle cx="152" cy="80" r="1.1" fill="#FF8C00" opacity="0.45"/>

    <!-- Small distant sparks -->
    <circle cx="198" cy="43" r="0.7" fill="#FFE066" opacity="0.7"/>
    <circle cx="200" cy="50" r="0.6" fill="#FFD700" opacity="0.65"/>
  </g>

  <!-- Rocket body (rotated ~45deg launch angle) -->
  <g transform="translate(183, 52) rotate(-45)" filter="url(#strongGlow)">
    <!-- Rocket fuselage -->
    <ellipse cx="0" cy="0" rx="5" ry="12" fill="url(#rocketGrad)"/>
    <!-- Rocket nose cone -->
    <path d="M-5 -8 Q0 -22 5 -8 Z" fill="url(#rocketGrad)"/>
    <!-- Left fin -->
    <path d="M-5 6 L-10 16 L-2 10 Z" fill="#FF4500" opacity="0.9"/>
    <!-- Right fin -->
    <path d="M5 6 L10 16 L2 10 Z" fill="#FF4500" opacity="0.9"/>
    <!-- Window highlight -->
    <circle cx="0" cy="-2" r="2.5" fill="none" stroke="#FFE066" stroke-width="1" opacity="0.8"/>
    <circle cx="0" cy="-2" r="1.2" fill="#FFE8C0" opacity="0.6"/>
    <!-- Engine exhaust outer -->
    <ellipse cx="0" cy="14" rx="4" ry="2.5" fill="#FF2D00" opacity="0.7"/>
    <!-- Engine exhaust inner -->
    <ellipse cx="0" cy="14" rx="2.5" ry="1.8" fill="#FFD700" opacity="0.85"/>
  </g>

  <!-- Rocket exhaust flame plume -->
  <g transform="translate(183, 52) rotate(-45)" filter="url(#glow)">
    <path d="M-4 12 Q-8 24 0 30 Q8 24 4 12 Z" fill="url(#rocketGrad)" opacity="0.7"/>
    <path d="M-2 13 Q-4 22 0 26 Q4 22 2 13 Z" fill="#FFD700" opacity="0.8"/>
    <path d="M-1 14 Q0 20 0 22 Z" stroke="#FFE066" stroke-width="1" fill="none" opacity="0.6"/>
  </g>

  <!-- Chart axes -->
  <g stroke="#FF4500" stroke-width="1.5" opacity="0.6">
    <!-- Y-axis -->
    <line x1="30" y1="55" x2="30" y2="148"/>
    <!-- X-axis -->
    <line x1="27" y1="145" x2="200" y2="145"/>
    <!-- Y-axis arrow -->
    <polyline points="27,57 30,52 33,57" fill="none"/>
    <!-- X-axis arrow -->
    <polyline points="198,142 203,145 198,148" fill="none"/>
  </g>

  <!-- Axis tick marks -->
  <g stroke="#FF4500" stroke-width="1" opacity="0.4">
    <line x1="28" y1="120" x2="32" y2="120"/>
    <line x1="28" y1="95" x2="32" y2="95"/>
    <line x1="28" y1="70" x2="32" y2="70"/>
    <line x1="72" y1="143" x2="72" y2="147"/>
    <line x1="114" y1="143" x2="114" y2="147"/>
    <line x1="156" y1="143" x2="156" y2="147"/>
  </g>

  <!-- Wordmark: AGENTIC -->
  <text x="22" y="172"
        font-family="'Arial Black', 'Impact', sans-serif"
        font-size="22"
        font-weight="900"
        letter-spacing="3"
        fill="url(#textGrad)"
        filter="url(#glow)">AGENTIC</text>

  <!-- Wordmark: LEAD GEN -->
  <text x="22" y="191"
        font-family="'Arial Black', 'Impact', sans-serif"
        font-size="13"
        font-weight="700"
        letter-spacing="8"
        fill="#FF8C00"
        opacity="0.85">LEAD GEN</text>

  <!-- Accent line under wordmark -->
  <line x1="22" y1="194" x2="278" y2="194"
        stroke="url(#chartGrad)" stroke-width="1.5" opacity="0.4"/>

  <!-- Top-right accent spark cluster -->
  <g filter="url(#sparkGlow)" opacity="0.6">
    <circle cx="262" cy="18" r="1.5" fill="#FFB300"/>
    <circle cx="268" cy="14" r="1" fill="#FFD700"/>
    <circle cx="272" cy="20" r="1.2" fill="#FF6B00"/>
    <circle cx="258" cy="22" r="0.8" fill="#FF8C00"/>
    <line x1="262" y1="18" x2="268" y2="14" stroke="#FFB300" stroke-width="0.5" opacity="0.5"/>
    <line x1="268" y1="14" x2="272" y2="20" stroke="#FFD700" stroke-width="0.5" opacity="0.5"/>
  </g>
</svg>` },
  { id: 10, title: "Abstract Waves", concept: "flowing sine waves as data streams", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#6366F1" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#06B6D4" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#A78BFA" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#22D3EE" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6D28D9" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#818CF8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#67E8F9" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6D28D9"/>
      <stop offset="100%" stop-color="#0891B2"/>
    </linearGradient>
    <linearGradient id="dotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="waveClip">
      <rect x="20" y="18" width="260" height="90" rx="6"/>
    </clipPath>
  </defs>

  <!-- White background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Wave container with subtle border -->
  <rect x="20" y="18" width="260" height="90" rx="6" fill="#F8F7FF" stroke="#EDE9FE" stroke-width="1"/>

  <!-- Wave layer 3 — widest, most transparent (background) -->
  <path
    d="M20,85 C50,68 70,100 100,83 C130,66 150,98 180,81 C210,64 230,96 260,79 L280,79 L280,108 L20,108 Z"
    fill="url(#waveGrad3)"
    clip-path="url(#waveClip)"
  />

  <!-- Wave layer 2 — mid opacity -->
  <path
    d="M20,78 C45,58 68,92 98,72 C128,52 148,88 178,68 C208,48 232,84 262,64 L280,64 L280,108 L20,108 Z"
    fill="url(#waveGrad2)"
    clip-path="url(#waveClip)"
  />

  <!-- Wave layer 1 — primary, full opacity stroke -->
  <path
    d="M20,72 C42,50 65,86 95,63 C125,40 147,78 177,55 C207,32 230,70 260,47"
    fill="none"
    stroke="url(#waveGrad1)"
    stroke-width="2.8"
    stroke-linecap="round"
    filter="url(#glow)"
    clip-path="url(#waveClip)"
  />

  <!-- Secondary wave stroke -->
  <path
    d="M20,82 C44,65 66,95 96,78 C126,61 148,91 178,74 C208,57 230,87 260,70"
    fill="none"
    stroke="url(#waveGrad2)"
    stroke-width="1.8"
    stroke-linecap="round"
    clip-path="url(#waveClip)"
  />

  <!-- Tertiary subtle wave -->
  <path
    d="M20,90 C46,76 68,103 98,89 C128,75 150,102 180,88 C210,74 232,101 262,87"
    fill="none"
    stroke="url(#waveGrad3)"
    stroke-width="1.2"
    stroke-linecap="round"
    clip-path="url(#waveClip)"
  />

  <!-- Animated data dots on primary wave -->
  <circle cx="60" cy="59" r="3" fill="url(#dotGrad)" opacity="0.9" filter="url(#glow)"/>
  <circle cx="150" cy="64" r="2.5" fill="url(#dotGrad)" opacity="0.85"/>
  <circle cx="240" cy="55" r="3" fill="url(#dotGrad)" opacity="0.9" filter="url(#glow)"/>

  <!-- Small accent dots -->
  <circle cx="105" cy="63" r="1.5" fill="#7C3AED" opacity="0.6"/>
  <circle cx="195" cy="56" r="1.5" fill="#06B6D4" opacity="0.6"/>

  <!-- Wordmark: "Agentic" -->
  <text
    x="150"
    y="136"
    font-family="'SF Pro Display', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="22"
    font-weight="700"
    letter-spacing="-0.5"
    text-anchor="middle"
    fill="url(#textGrad)"
  >Agentic</text>

  <!-- Wordmark: "Lead Gen" -->
  <text
    x="150"
    y="159"
    font-family="'SF Pro Display', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="22"
    font-weight="300"
    letter-spacing="2"
    text-anchor="middle"
    fill="#1E1B4B"
    opacity="0.82"
  >Lead Gen</text>

  <!-- Subtle tagline -->
  <text
    x="150"
    y="181"
    font-family="'SF Pro Text', 'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="7.5"
    font-weight="400"
    letter-spacing="2.5"
    text-anchor="middle"
    fill="#6366F1"
    opacity="0.7"
  >INTELLIGENT OUTREACH</text>

  <!-- Thin accent line under waves -->
  <line x1="20" y1="109" x2="280" y2="109" stroke="url(#waveGrad1)" stroke-width="0.5" opacity="0.4"/>
</svg>` },
  { id: 11, title: "Bold Monogram", concept: "minimalist Swiss design A letterform", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect width="300" height="200" fill="#ffffff"/>
  <text
    x="150"
    y="168"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="180"
    font-weight="900"
    fill="#1a1a1a"
    text-anchor="middle"
    letter-spacing="-4"
  >A</text>
  <rect x="62" y="118" width="176" height="7" fill="#0066ff"/>
</svg>` },
  { id: 12, title: "Isometric Cube", concept: "3D isometric network of cubes", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Cube face gradients -->
    <linearGradient id="topFace" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7eb8d4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4a8fa8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="leftFace" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2c5f74;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3a7a94;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="rightFace" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1e4459;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2a607a;stop-opacity:1" />
    </linearGradient>
    <!-- Accent cube gradients (smaller nodes) -->
    <linearGradient id="topFaceAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9ecfe6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6aafc8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="leftFaceAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3a7a94;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4a8fa8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="rightFaceAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2a607a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e4459;stop-opacity:1" />
    </linearGradient>
    <!-- Glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Connector line gradient -->
    <linearGradient id="connectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6aafc8;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#3a7a94;stop-opacity:0.3" />
    </linearGradient>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d1f2d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#162736;stop-opacity:1" />
    </linearGradient>
    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9ecfe6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6aafc8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="subtextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4a8fa8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7eb8d4;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle grid overlay -->
  <line x1="0" y1="100" x2="300" y2="100" stroke="#1e3a4d" stroke-width="0.5" opacity="0.4"/>
  <line x1="150" y1="0" x2="150" y2="200" stroke="#1e3a4d" stroke-width="0.5" opacity="0.4"/>

  <!-- ===== ISOMETRIC CUBE NETWORK (left section) ===== -->
  <!-- Isometric transform: x' = x*cos(30), y' = y - x*sin(30) roughly -->
  <!-- We'll place cubes manually in isometric coords, scale ~18px per unit -->

  <!-- Connection lines between cubes (drawn behind cubes) -->
  <!-- Main cube to top-right small cube -->
  <line x1="82" y1="72" x2="108" y2="55" stroke="url(#connectorGrad)" stroke-width="1.2" opacity="0.7"/>
  <!-- Main cube to bottom-right small cube -->
  <line x1="95" y1="94" x2="118" y2="100" stroke="url(#connectorGrad)" stroke-width="1.2" opacity="0.7"/>
  <!-- Main cube to top-left small cube -->
  <line x1="56" y1="72" x2="42" y2="58" stroke="url(#connectorGrad)" stroke-width="1.2" opacity="0.7"/>
  <!-- Small cubes to each other -->
  <line x1="108" y1="55" x2="118" y2="100" stroke="url(#connectorGrad)" stroke-width="0.8" opacity="0.4"/>
  <line x1="42" y1="58" x2="56" y2="94" stroke="url(#connectorGrad)" stroke-width="0.8" opacity="0.4"/>
  <!-- Far small cube connection -->
  <line x1="42" y1="58" x2="108" y2="55" stroke="url(#connectorGrad)" stroke-width="0.8" opacity="0.3"/>

  <!-- Node dots at connector ends -->
  <circle cx="108" cy="55" r="2.5" fill="#6aafc8" opacity="0.9" filter="url(#glow)"/>
  <circle cx="118" cy="100" r="2.5" fill="#6aafc8" opacity="0.9" filter="url(#glow)"/>
  <circle cx="42" cy="58" r="2.5" fill="#6aafc8" opacity="0.9" filter="url(#glow)"/>
  <circle cx="56" cy="94" r="2.5" fill="#4a8fa8" opacity="0.8"/>

  <!-- SMALL CUBE top-left (unit=10px) -->
  <!-- Top face -->
  <polygon points="28,52 38,46 48,52 38,58" fill="url(#topFaceAccent)" opacity="0.95"/>
  <!-- Left face -->
  <polygon points="28,52 38,58 38,68 28,62" fill="url(#leftFaceAccent)" opacity="0.95"/>
  <!-- Right face -->
  <polygon points="38,58 48,52 48,62 38,68" fill="url(#rightFaceAccent)" opacity="0.95"/>
  <!-- Edge highlights -->
  <polyline points="28,52 38,46 48,52" fill="none" stroke="#9ecfe6" stroke-width="0.5" opacity="0.6"/>
  <line x1="38" y1="46" x2="38" y2="68" stroke="#9ecfe6" stroke-width="0.5" opacity="0.4"/>

  <!-- SMALL CUBE top-right (unit=10px) -->
  <polygon points="98,49 108,43 118,49 108,55" fill="url(#topFaceAccent)" opacity="0.95"/>
  <polygon points="98,49 108,55 108,65 98,59" fill="url(#leftFaceAccent)" opacity="0.95"/>
  <polygon points="108,55 118,49 118,59 108,65" fill="url(#rightFaceAccent)" opacity="0.95"/>
  <polyline points="98,49 108,43 118,49" fill="none" stroke="#9ecfe6" stroke-width="0.5" opacity="0.6"/>
  <line x1="108" y1="43" x2="108" y2="65" stroke="#9ecfe6" stroke-width="0.5" opacity="0.4"/>

  <!-- SMALL CUBE bottom-right (unit=10px) -->
  <polygon points="108,94 118,88 128,94 118,100" fill="url(#topFaceAccent)" opacity="0.95"/>
  <polygon points="108,94 118,100 118,110 108,104" fill="url(#leftFaceAccent)" opacity="0.95"/>
  <polygon points="118,100 128,94 128,104 118,110" fill="url(#rightFaceAccent)" opacity="0.95"/>
  <polyline points="108,94 118,88 128,94" fill="none" stroke="#9ecfe6" stroke-width="0.5" opacity="0.6"/>
  <line x1="118" y1="88" x2="118" y2="110" stroke="#9ecfe6" stroke-width="0.5" opacity="0.4"/>

  <!-- MAIN CUBE (unit=18px) center -->
  <!-- Top face -->
  <polygon points="51,64 69,53 87,64 69,75" fill="url(#topFace)"/>
  <!-- Left face -->
  <polygon points="51,64 69,75 69,97 51,86" fill="url(#leftFace)"/>
  <!-- Right face -->
  <polygon points="69,75 87,64 87,86 69,97" fill="url(#rightFace)"/>
  <!-- Top edge highlight -->
  <polyline points="51,64 69,53 87,64" fill="none" stroke="#b8dff0" stroke-width="0.8" opacity="0.8"/>
  <line x1="69" y1="53" x2="69" y2="97" stroke="#9ecfe6" stroke-width="0.6" opacity="0.5"/>
  <!-- Corner dots -->
  <circle cx="69" cy="53" r="1.5" fill="#c8eaf8" opacity="0.9"/>
  <circle cx="51" cy="64" r="1.2" fill="#9ecfe6" opacity="0.7"/>
  <circle cx="87" cy="64" r="1.2" fill="#9ecfe6" opacity="0.7"/>

  <!-- ===== TEXT SECTION (right side) ===== -->
  <!-- "ALG" large initials in isometric-styled block letters -->
  <!-- Using a custom isometric-feel text block -->

  <!-- "ALG" initials — isometric shadow/depth effect -->
  <!-- Shadow layer (offset for 3D) -->
  <text x="133" y="97"
        font-family="'SF Mono', 'Fira Mono', 'Consolas', monospace"
        font-size="42"
        font-weight="700"
        letter-spacing="4"
        fill="#0d1f2d"
        opacity="0.6">ALG</text>
  <!-- Main text -->
  <text x="131" y="95"
        font-family="'SF Mono', 'Fira Mono', 'Consolas', monospace"
        font-size="42"
        font-weight="700"
        letter-spacing="4"
        fill="url(#textGrad)"
        filter="url(#glow)">ALG</text>

  <!-- Separator line with glow -->
  <line x1="131" y1="103" x2="262" y2="103" stroke="url(#subtextGrad)" stroke-width="1.5" opacity="0.7"/>

  <!-- "Agentic Lead Gen" subtext -->
  <text x="131" y="119"
        font-family="'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        font-size="10.5"
        font-weight="400"
        letter-spacing="2.5"
        fill="#6aafc8"
        opacity="0.9">AGENTIC LEAD GEN</text>

  <!-- Decorative corner brackets (enterprise feel) -->
  <!-- Top-left bracket -->
  <polyline points="8,8 8,20 20,20" fill="none" stroke="#3a7a94" stroke-width="1.2" opacity="0.5"/>
  <!-- Top-right bracket -->
  <polyline points="292,8 292,20 280,20" fill="none" stroke="#3a7a94" stroke-width="1.2" opacity="0.5"/>
  <!-- Bottom-left bracket -->
  <polyline points="8,192 8,180 20,180" fill="none" stroke="#3a7a94" stroke-width="1.2" opacity="0.5"/>
  <!-- Bottom-right bracket -->
  <polyline points="292,192 292,180 280,180" fill="none" stroke="#3a7a94" stroke-width="1.2" opacity="0.5"/>

  <!-- Subtle scanning line effect -->
  <rect x="0" y="0" width="300" height="200" fill="none"
        stroke="#6aafc8" stroke-width="0.5" rx="8" opacity="0.15"/>
</svg>` },
  { id: 13, title: "Compass Rose", concept: "navigation compass with stage labels", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep navy background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f1e3d"/>
      <stop offset="100%" stop-color="#060e1f"/>
    </radialGradient>
    <!-- Gold accent gradient for rose petals -->
    <linearGradient id="goldPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0c040"/>
      <stop offset="50%" stop-color="#d4a017"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <!-- Silver/light gold for minor petals -->
    <linearGradient id="silverPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8d5a0"/>
      <stop offset="100%" stop-color="#c4a84f"/>
    </linearGradient>
    <!-- Compass ring gradient -->
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0c040"/>
      <stop offset="25%" stop-color="#d4a017"/>
      <stop offset="50%" stop-color="#f0c040"/>
      <stop offset="75%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#f0c040"/>
    </linearGradient>
    <!-- Glow filter for center jewel -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Subtle drop shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <!-- Inner ring gradient -->
    <linearGradient id="innerRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a3060"/>
      <stop offset="100%" stop-color="#0f1e3d"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="4"/>

  <!-- ====== COMPASS ROSE (centered at 105, 100) ====== -->
  <g transform="translate(105,100)" filter="url(#shadow)">

    <!-- Outer decorative ring -->
    <circle r="58" fill="none" stroke="url(#ringGrad)" stroke-width="1.5"/>
    <!-- Tick marks on outer ring -->
    <g stroke="#d4a017" stroke-width="0.8" opacity="0.7">
      <!-- 24 tick marks every 15 degrees -->
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(0)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(15)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(30)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(45)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(60)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(75)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(90)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(105)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(120)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(135)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(150)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(165)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(180)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(195)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(210)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(225)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(240)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(255)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(270)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(285)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(300)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(315)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(330)"/>
      <line x1="0" y1="-54" x2="0" y2="-58" transform="rotate(345)"/>
    </g>
    <!-- Larger ticks at 45-degree intervals -->
    <g stroke="#f0c040" stroke-width="1.2">
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(0)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(45)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(90)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(135)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(180)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(225)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(270)"/>
      <line x1="0" y1="-52" x2="0" y2="-58" transform="rotate(315)"/>
    </g>

    <!-- Inner decorative ring -->
    <circle r="44" fill="url(#innerRing)" stroke="#1e3a6e" stroke-width="1"/>
    <circle r="43" fill="none" stroke="#d4a017" stroke-width="0.5" opacity="0.6"/>

    <!-- ---- Intercardinal petals (NE/SE/SW/NW) — smaller, silver-gold ---- -->
    <g fill="url(#silverPetal)" opacity="0.85">
      <!-- NE -->
      <polygon points="0,-8 6,0 0,-34 -6,0" transform="rotate(45)"/>
      <!-- SE -->
      <polygon points="0,-8 6,0 0,-34 -6,0" transform="rotate(135)"/>
      <!-- SW -->
      <polygon points="0,-8 6,0 0,-34 -6,0" transform="rotate(225)"/>
      <!-- NW -->
      <polygon points="0,-8 6,0 0,-34 -6,0" transform="rotate(315)"/>
    </g>
    <!-- Intercardinal petal center dividers -->
    <g stroke="#0f1e3d" stroke-width="0.5" opacity="0.6">
      <line x1="0" y1="-8" x2="0" y2="-34" transform="rotate(45)"/>
      <line x1="0" y1="-8" x2="0" y2="-34" transform="rotate(135)"/>
      <line x1="0" y1="-8" x2="0" y2="-34" transform="rotate(225)"/>
      <line x1="0" y1="-8" x2="0" y2="-34" transform="rotate(315)"/>
    </g>

    <!-- ---- Cardinal petals (N/E/S/W) — tall, gold ---- -->
    <g fill="url(#goldPetal)">
      <!-- North petal -->
      <polygon points="0,-10 8,0 0,-42 -8,0"/>
      <!-- East petal -->
      <polygon points="0,-10 8,0 0,-42 -8,0" transform="rotate(90)"/>
      <!-- South petal -->
      <polygon points="0,-10 8,0 0,-42 -8,0" transform="rotate(180)"/>
      <!-- West petal -->
      <polygon points="0,-10 8,0 0,-42 -8,0" transform="rotate(270)"/>
    </g>
    <!-- Petal center dividers -->
    <g stroke="#0f1e3d" stroke-width="0.8" opacity="0.5">
      <line x1="0" y1="-10" x2="0" y2="-42"/>
      <line x1="0" y1="-10" x2="0" y2="-42" transform="rotate(90)"/>
      <line x1="0" y1="-10" x2="0" y2="-42" transform="rotate(180)"/>
      <line x1="0" y1="-10" x2="0" y2="-42" transform="rotate(270)"/>
    </g>

    <!-- Center cap -->
    <circle r="10" fill="#0f1e3d" stroke="#d4a017" stroke-width="1"/>
    <circle r="7" fill="url(#goldPetal)" filter="url(#glow)"/>
    <circle r="3.5" fill="#0f1e3d"/>
    <circle r="1.8" fill="#f0c040"/>

  </g>

  <!-- ====== CARDINAL DIRECTION LABELS ====== -->
  <!-- DISCOVER — North -->
  <text x="105" y="27" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="6.5" font-weight="bold" letter-spacing="1.4" fill="#f0c040">DISCOVER</text>
  <!-- ENRICH — East -->
  <text x="175" y="103" text-anchor="start" font-family="Georgia, 'Times New Roman', serif" font-size="6.5" font-weight="bold" letter-spacing="1.4" fill="#f0c040">ENRICH</text>
  <!-- CONVERT — South -->
  <text x="105" y="180" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="6.5" font-weight="bold" letter-spacing="1.4" fill="#f0c040">CONVERT</text>
  <!-- CONNECT — West -->
  <text x="33" y="103" text-anchor="end" font-family="Georgia, 'Times New Roman', serif" font-size="6.5" font-weight="bold" letter-spacing="1.4" fill="#f0c040">CONNECT</text>

  <!-- ====== DIVIDER ====== -->
  <line x1="196" y1="30" x2="196" y2="170" stroke="#1e3a6e" stroke-width="1"/>
  <line x1="197" y1="30" x2="197" y2="170" stroke="#d4a017" stroke-width="0.4" opacity="0.5"/>

  <!-- ====== WORDMARK ====== -->
  <g transform="translate(210, 100)">
    <!-- Main title -->
    <text x="0" y="-18" font-family="Georgia, 'Times New Roman', serif" font-size="18" font-weight="bold" letter-spacing="0.5" fill="#f0f4ff">AGENTIC</text>
    <!-- Subtitle line 1 -->
    <text x="0" y="2" font-family="Georgia, 'Times New Roman', serif" font-size="12" font-weight="normal" letter-spacing="2" fill="#d4a017">LEAD</text>
    <!-- Subtitle line 2 -->
    <text x="30" y="2" font-family="Georgia, 'Times New Roman', serif" font-size="12" font-weight="normal" letter-spacing="2" fill="#f0f4ff"> GEN</text>
    <!-- Tagline separator -->
    <line x1="0" y1="11" x2="78" y2="11" stroke="#1e3a6e" stroke-width="0.8"/>
    <line x1="0" y1="12" x2="78" y2="12" stroke="#d4a017" stroke-width="0.4" opacity="0.6"/>
    <!-- Tagline -->
    <text x="0" y="23" font-family="'Arial Narrow', Arial, sans-serif" font-size="6" font-weight="normal" letter-spacing="2.2" fill="#8aaad4" opacity="0.9">INTELLIGENT PIPELINE</text>
  </g>

  <!-- ====== CORNER ORNAMENTS ====== -->
  <g fill="none" stroke="#1e3a6e" stroke-width="0.8" opacity="0.8">
    <!-- Top-left -->
    <path d="M8,8 L22,8 M8,8 L8,22"/>
    <!-- Top-right -->
    <path d="M292,8 L278,8 M292,8 L292,22"/>
    <!-- Bottom-left -->
    <path d="M8,192 L22,192 M8,192 L8,178"/>
    <!-- Bottom-right -->
    <path d="M292,192 L278,192 M292,192 L292,178"/>
  </g>
  <g fill="none" stroke="#d4a017" stroke-width="0.4" opacity="0.5">
    <path d="M8,8 L22,8 M8,8 L8,22"/>
    <path d="M292,8 L278,8 M292,8 L292,22"/>
    <path d="M8,192 L22,192 M8,192 L8,178"/>
    <path d="M292,192 L278,192 M292,192 L292,178"/>
  </g>
</svg>` },
  { id: 14, title: "Gradient Wordmark", concept: "modern blue-to-emerald wordmark", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="wordGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a3a6e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1a7ecf;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="iconGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a3a6e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#f8fafc" rx="12" />

  <!-- Abstract icon: node with spark lines -->
  <g transform="translate(26, 58)" filter="url(#glow)">
    <!-- Radiating spark lines -->
    <line x1="14" y1="14" x2="2"  y2="2"  stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
    <line x1="14" y1="14" x2="26" y2="2"  stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
    <line x1="14" y1="14" x2="14" y2="0"  stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
    <line x1="14" y1="14" x2="0"  y2="14" stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
    <line x1="14" y1="14" x2="28" y2="14" stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
    <line x1="14" y1="14" x2="2"  y2="26" stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.4"/>
    <line x1="14" y1="14" x2="26" y2="26" stroke="url(#iconGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.4"/>
    <!-- Center node -->
    <circle cx="14" cy="14" r="5" fill="url(#iconGrad)" />
    <circle cx="14" cy="14" r="2.5" fill="#f8fafc" opacity="0.7" />
  </g>

  <!-- AGENTIC wordmark -->
  <text
    x="62"
    y="88"
    font-family="'Arial Black', 'Impact', 'Helvetica Neue', sans-serif"
    font-size="44"
    font-weight="900"
    letter-spacing="-1"
    fill="url(#wordGrad)"
  >AGENTIC</text>

  <!-- Underline accent bar -->
  <rect x="62" y="96" width="220" height="2.5" rx="1.5" fill="url(#wordGrad)" opacity="0.35" />

  <!-- LEAD GEN subtitle -->
  <text
    x="64"
    y="122"
    font-family="'Helvetica Neue', 'Arial', sans-serif"
    font-size="17"
    font-weight="400"
    letter-spacing="6"
    fill="#64748b"
  >LEAD GEN</text>

  <!-- Small dot accent beside LEAD GEN -->
  <circle cx="176" cy="118" r="2.5" fill="#10b981" opacity="0.7" />

</svg>` },
  { id: 15, title: "Binary Matrix", concept: "Matrix-inspired falling binary rain", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a0f0a"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <linearGradient id="colFade1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#00cc33" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#003300" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="colFade2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#00aa22" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#002200" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="colFade3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0.5"/>
      <stop offset="40%" stop-color="#009922" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#001100" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="algGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#aaffcc"/>
      <stop offset="100%" stop-color="#00ff41"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="viewClip">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>
  <rect width="300" height="200" fill="#000d00" opacity="0.6"/>

  <!-- Matrix rain columns - clipped to viewport -->
  <g clip-path="url(#viewClip)" font-family="'Courier New', monospace" font-size="9" fill="#00ff41">

    <!-- Column 1 x=8 -->
    <g opacity="0.85" filter="url(#softGlow)">
      <text x="8" y="14" fill="#ccffcc" opacity="1">1</text>
      <text x="8" y="24" opacity="0.9">0</text>
      <text x="8" y="34" opacity="0.75">1</text>
      <text x="8" y="44" opacity="0.6">1</text>
      <text x="8" y="54" opacity="0.45">0</text>
      <text x="8" y="64" opacity="0.3">1</text>
      <text x="8" y="74" opacity="0.15">0</text>
    </g>

    <!-- Column 2 x=20 -->
    <g opacity="0.6">
      <text x="20" y="30" opacity="0.8">0</text>
      <text x="20" y="40" opacity="0.65">1</text>
      <text x="20" y="50" opacity="0.5">0</text>
      <text x="20" y="60" opacity="0.35">1</text>
      <text x="20" y="70" opacity="0.2">0</text>
    </g>

    <!-- Column 3 x=32 -->
    <g opacity="0.9">
      <text x="32" y="8" fill="#eeffee" opacity="1">0</text>
      <text x="32" y="18" opacity="0.88">1</text>
      <text x="32" y="28" opacity="0.72">0</text>
      <text x="32" y="38" opacity="0.56">1</text>
      <text x="32" y="48" opacity="0.4">1</text>
      <text x="32" y="58" opacity="0.24">0</text>
      <text x="32" y="68" opacity="0.1">1</text>
    </g>

    <!-- Column 4 x=44 -->
    <g opacity="0.55">
      <text x="44" y="20" opacity="0.7">1</text>
      <text x="44" y="30" opacity="0.55">0</text>
      <text x="44" y="40" opacity="0.4">0</text>
      <text x="44" y="50" opacity="0.25">1</text>
    </g>

    <!-- Column 5 x=56 -->
    <g opacity="0.8">
      <text x="56" y="12" fill="#ddffd0" opacity="0.95">1</text>
      <text x="56" y="22" opacity="0.8">0</text>
      <text x="56" y="32" opacity="0.65">1</text>
      <text x="56" y="42" opacity="0.5">0</text>
      <text x="56" y="52" opacity="0.35">1</text>
      <text x="56" y="62" opacity="0.2">0</text>
    </g>

    <!-- Right side columns -->
    <!-- Column x=232 -->
    <g opacity="0.75">
      <text x="232" y="10" fill="#ccffcc" opacity="0.95">0</text>
      <text x="232" y="20" opacity="0.8">1</text>
      <text x="232" y="30" opacity="0.65">0</text>
      <text x="232" y="40" opacity="0.5">1</text>
      <text x="232" y="50" opacity="0.35">0</text>
      <text x="232" y="60" opacity="0.18">1</text>
    </g>

    <!-- Column x=244 -->
    <g opacity="0.6">
      <text x="244" y="25" opacity="0.75">1</text>
      <text x="244" y="35" opacity="0.6">0</text>
      <text x="244" y="45" opacity="0.45">1</text>
      <text x="244" y="55" opacity="0.3">0</text>
    </g>

    <!-- Column x=256 -->
    <g opacity="0.85">
      <text x="256" y="14" fill="#eeffee" opacity="1">1</text>
      <text x="256" y="24" opacity="0.85">0</text>
      <text x="256" y="34" opacity="0.68">1</text>
      <text x="256" y="44" opacity="0.52">0</text>
      <text x="256" y="54" opacity="0.36">1</text>
      <text x="256" y="64" opacity="0.2">0</text>
      <text x="256" y="74" opacity="0.08">1</text>
    </g>

    <!-- Column x=268 -->
    <g opacity="0.65">
      <text x="268" y="18" opacity="0.8">0</text>
      <text x="268" y="28" opacity="0.65">1</text>
      <text x="268" y="38" opacity="0.5">0</text>
      <text x="268" y="48" opacity="0.32">1</text>
      <text x="268" y="58" opacity="0.15">0</text>
    </g>

    <!-- Column x=280 -->
    <g opacity="0.8">
      <text x="280" y="9" fill="#ccffcc" opacity="1">1</text>
      <text x="280" y="19" opacity="0.85">0</text>
      <text x="280" y="29" opacity="0.68">1</text>
      <text x="280" y="39" opacity="0.52">0</text>
      <text x="280" y="49" opacity="0.35">1</text>
      <text x="280" y="59" opacity="0.18">0</text>
    </g>

    <!-- Bottom area columns -->
    <!-- Col x=10 bottom -->
    <g opacity="0.5">
      <text x="10" y="150" opacity="0.55">1</text>
      <text x="10" y="160" opacity="0.42">0</text>
      <text x="10" y="170" opacity="0.3">1</text>
      <text x="10" y="180" opacity="0.18">0</text>
      <text x="10" y="190" opacity="0.08">1</text>
    </g>

    <!-- Col x=22 bottom -->
    <g opacity="0.45">
      <text x="22" y="140" opacity="0.5">0</text>
      <text x="22" y="150" opacity="0.38">1</text>
      <text x="22" y="160" opacity="0.26">0</text>
      <text x="22" y="170" opacity="0.14">1</text>
    </g>

    <!-- Col x=34 bottom -->
    <g opacity="0.6">
      <text x="34" y="155" opacity="0.6">1</text>
      <text x="34" y="165" opacity="0.45">0</text>
      <text x="34" y="175" opacity="0.3">1</text>
      <text x="34" y="185" opacity="0.15">0</text>
    </g>

    <!-- Col x=46 bottom -->
    <g opacity="0.4">
      <text x="46" y="148" opacity="0.45">0</text>
      <text x="46" y="158" opacity="0.32">1</text>
      <text x="46" y="168" opacity="0.2">0</text>
    </g>

    <!-- Col x=58 bottom -->
    <g opacity="0.55">
      <text x="58" y="160" opacity="0.55">1</text>
      <text x="58" y="170" opacity="0.4">0</text>
      <text x="58" y="180" opacity="0.25">1</text>
      <text x="58" y="190" opacity="0.1">0</text>
    </g>

    <!-- Right bottom -->
    <g opacity="0.5">
      <text x="234" y="155" opacity="0.52">0</text>
      <text x="234" y="165" opacity="0.38">1</text>
      <text x="234" y="175" opacity="0.24">0</text>
      <text x="234" y="185" opacity="0.1">1</text>
    </g>

    <g opacity="0.45">
      <text x="246" y="148" opacity="0.48">1</text>
      <text x="246" y="158" opacity="0.34">0</text>
      <text x="246" y="168" opacity="0.2">1</text>
    </g>

    <g opacity="0.6">
      <text x="258" y="152" opacity="0.58">0</text>
      <text x="258" y="162" opacity="0.44">1</text>
      <text x="258" y="172" opacity="0.3">0</text>
      <text x="258" y="182" opacity="0.15">1</text>
    </g>

    <g opacity="0.5">
      <text x="270" y="145" opacity="0.5">1</text>
      <text x="270" y="155" opacity="0.36">0</text>
      <text x="270" y="165" opacity="0.22">1</text>
      <text x="270" y="175" opacity="0.1">0</text>
    </g>

    <g opacity="0.6">
      <text x="282" y="150" opacity="0.55">0</text>
      <text x="282" y="160" opacity="0.4">1</text>
      <text x="282" y="170" opacity="0.25">0</text>
      <text x="282" y="180" opacity="0.12">1</text>
    </g>
  </g>

  <!-- Scanline overlay for CRT feel -->
  <rect width="300" height="200" fill="url(#scanlines)" opacity="0.03"/>

  <!-- Central glow backdrop for text -->
  <ellipse cx="150" cy="100" rx="85" ry="52" fill="#001a00" opacity="0.92"/>
  <ellipse cx="150" cy="100" rx="80" ry="48" fill="#002800" opacity="0.7"/>

  <!-- Subtle green glow halo -->
  <ellipse cx="150" cy="100" rx="90" ry="56" fill="none" stroke="#00ff41" stroke-width="0.5" opacity="0.15"/>
  <ellipse cx="150" cy="100" rx="96" ry="60" fill="none" stroke="#00ff41" stroke-width="0.3" opacity="0.08"/>

  <!-- Corner bracket decorations -->
  <g stroke="#00ff41" stroke-width="1.5" fill="none" opacity="0.6">
    <!-- TL -->
    <polyline points="62,68 62,72 66,72"/>
    <polyline points="62,68 66,68"/>
    <!-- TR -->
    <polyline points="238,68 234,68 234,72"/>
    <polyline points="238,68 238,72"/>
    <!-- BL -->
    <polyline points="62,132 62,128 66,128"/>
    <polyline points="62,132 66,132"/>
    <!-- BR -->
    <polyline points="238,132 234,132 234,128"/>
    <polyline points="238,132 238,128"/>
  </g>

  <!-- Thin horizontal rule lines -->
  <line x1="68" y1="74" x2="232" y2="74" stroke="#00ff41" stroke-width="0.4" opacity="0.3"/>
  <line x1="68" y1="126" x2="232" y2="126" stroke="#00ff41" stroke-width="0.4" opacity="0.3"/>

  <!-- Main ALG lettering -->
  <text
    x="150" y="115"
    font-family="'Courier New', Courier, monospace"
    font-size="58"
    font-weight="900"
    text-anchor="middle"
    fill="url(#algGrad)"
    filter="url(#textGlow)"
    letter-spacing="6"
  >ALG</text>

  <!-- Subtitle -->
  <text
    x="150" y="142"
    font-family="'Courier New', Courier, monospace"
    font-size="8.5"
    font-weight="400"
    text-anchor="middle"
    fill="#00cc33"
    opacity="0.85"
    letter-spacing="4"
    filter="url(#softGlow)"
  >AGENTIC LEAD GEN</text>

  <!-- Small decorative binary under subtitle -->
  <text
    x="150" y="155"
    font-family="'Courier New', Courier, monospace"
    font-size="6"
    text-anchor="middle"
    fill="#006600"
    opacity="0.6"
    letter-spacing="2"
  >01000001 01001100 01000111</text>

  <!-- Blinking cursor dot accent -->
  <rect x="219" y="107" width="5" height="8" fill="#00ff41" opacity="0.9" filter="url(#softGlow)"/>
</svg>` },
  { id: 16, title: "Eye Intelligence", concept: "stylized eye with circuit iris", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep blue to silver gradient for iris -->
    <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a0f2e"/>
      <stop offset="30%" stop-color="#0d2150"/>
      <stop offset="65%" stop-color="#1a4a8a"/>
      <stop offset="100%" stop-color="#4a8fd4"/>
    </radialGradient>

    <!-- Pupil gradient -->
    <radialGradient id="pupilGrad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#1e3a6e"/>
      <stop offset="50%" stop-color="#0a1525"/>
      <stop offset="100%" stop-color="#000d1a"/>
    </radialGradient>

    <!-- Silver metallic gradient for eye outline -->
    <linearGradient id="eyeOutlineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c0d8f0"/>
      <stop offset="40%" stop-color="#8ab4d8"/>
      <stop offset="70%" stop-color="#5a8ab8"/>
      <stop offset="100%" stop-color="#9ec4e8"/>
    </linearGradient>

    <!-- Glow filter for the eye -->
    <filter id="eyeGlow" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Outer glow filter -->
    <filter id="outerGlow" x="-30%" y="-60%" width="160%" height="220%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feFlood flood-color="#1a5fa8" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feComposite in="SourceGraphic" in2="shadow" operator="over"/>
    </filter>

    <!-- Silver text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d0e8ff"/>
      <stop offset="50%" stop-color="#8ab0d0"/>
      <stop offset="100%" stop-color="#5a80a8"/>
    </linearGradient>

    <!-- Data ring gradient -->
    <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a6fba" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#1a3f7a" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3a8fd8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0d2a5e" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Circuit node glow -->
    <filter id="nodeGlow">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feFlood flood-color="#60b8ff" flood-opacity="0.8" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feComposite in="SourceGraphic" in2="glow" operator="over"/>
    </filter>

    <!-- "A" letterform glow -->
    <filter id="aGlow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feFlood flood-color="#80d0ff" flood-opacity="0.9" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feComposite in="SourceGraphic" in2="glow" operator="over"/>
    </filter>

    <!-- Clip path for iris segments -->
    <clipPath id="irisClip">
      <circle cx="150" cy="92" r="32"/>
    </clipPath>

    <!-- Clip path for eye shape -->
    <clipPath id="eyeShapeClip">
      <path d="M60,92 Q105,40 150,40 Q195,40 240,92 Q195,144 150,144 Q105,144 60,92 Z"/>
    </clipPath>

    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#060d20"/>
      <stop offset="100%" stop-color="#020508"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="4"/>

  <!-- Subtle grid dots in background -->
  <g opacity="0.12">
    <circle cx="20" cy="20" r="1" fill="#4a7ab8"/>
    <circle cx="50" cy="20" r="1" fill="#4a7ab8"/>
    <circle cx="80" cy="20" r="1" fill="#4a7ab8"/>
    <circle cx="220" cy="20" r="1" fill="#4a7ab8"/>
    <circle cx="250" cy="20" r="1" fill="#4a7ab8"/>
    <circle cx="280" cy="20" r="1" fill="#4a7ab8"/>
    <circle cx="20" cy="170" r="1" fill="#4a7ab8"/>
    <circle cx="50" cy="170" r="1" fill="#4a7ab8"/>
    <circle cx="80" cy="170" r="1" fill="#4a7ab8"/>
    <circle cx="220" cy="170" r="1" fill="#4a7ab8"/>
    <circle cx="250" cy="170" r="1" fill="#4a7ab8"/>
    <circle cx="280" cy="170" r="1" fill="#4a7ab8"/>
    <circle cx="20" cy="50" r="1" fill="#4a7ab8"/>
    <circle cx="20" cy="80" r="1" fill="#4a7ab8"/>
    <circle cx="20" cy="110" r="1" fill="#4a7ab8"/>
    <circle cx="20" cy="140" r="1" fill="#4a7ab8"/>
    <circle cx="280" cy="50" r="1" fill="#4a7ab8"/>
    <circle cx="280" cy="80" r="1" fill="#4a7ab8"/>
    <circle cx="280" cy="110" r="1" fill="#4a7ab8"/>
    <circle cx="280" cy="140" r="1" fill="#4a7ab8"/>
  </g>

  <!-- Outer ambient glow behind eye -->
  <ellipse cx="150" cy="92" rx="95" ry="50" fill="#0d3060" opacity="0.35" filter="url(#eyeGlow)"/>

  <!-- Eye white / sclera area (subtle) -->
  <path d="M60,92 Q105,40 150,40 Q195,40 240,92 Q195,144 150,144 Q105,144 60,92 Z"
        fill="#04101f" stroke="none"/>

  <!-- Iris base fill -->
  <circle cx="150" cy="92" r="38" fill="url(#irisGrad)"/>

  <!-- Data ring segments — outer ring (12 segments) -->
  <g clip-path="url(#irisClip)">
    <!-- Ring 1 (outermost data ring) - dashed segments -->
    <circle cx="150" cy="92" r="30" fill="none" stroke="#2a6fba" stroke-width="3"
            stroke-dasharray="8.4 5.5" stroke-dashoffset="0" opacity="0.7"/>
    <!-- Ring 2 -->
    <circle cx="150" cy="92" r="24" fill="none" stroke="#1e5a9e" stroke-width="2.5"
            stroke-dasharray="6.5 4.5" stroke-dashoffset="3" opacity="0.65"/>
    <!-- Ring 3 -->
    <circle cx="150" cy="92" r="18" fill="none" stroke="#3a80c0" stroke-width="2"
            stroke-dasharray="4.8 3.8" stroke-dashoffset="1.5" opacity="0.6"/>

    <!-- Radial spoke lines (data segments) -->
    <line x1="150" y1="60" x2="150" y2="92" stroke="#2860a0" stroke-width="0.7" opacity="0.5"/>
    <line x1="150" y1="92" x2="150" y2="124" stroke="#2860a0" stroke-width="0.7" opacity="0.5"/>
    <line x1="118" y1="92" x2="182" y2="92" stroke="#2860a0" stroke-width="0.7" opacity="0.5"/>
    <line x1="127" y1="64.3" x2="173" y2="119.7" stroke="#2860a0" stroke-width="0.7" opacity="0.35" transform="rotate(45,150,92)"/>
    <line x1="127" y1="64.3" x2="173" y2="119.7" stroke="#2860a0" stroke-width="0.7" opacity="0.35" transform="rotate(-45,150,92)"/>
    <line x1="127" y1="64.3" x2="173" y2="119.7" stroke="#2860a0" stroke-width="0.7" opacity="0.25" transform="rotate(22.5,150,92)"/>
    <line x1="127" y1="64.3" x2="173" y2="119.7" stroke="#2860a0" stroke-width="0.7" opacity="0.25" transform="rotate(-22.5,150,92)"/>
    <line x1="127" y1="64.3" x2="173" y2="119.7" stroke="#2860a0" stroke-width="0.7" opacity="0.25" transform="rotate(67.5,150,92)"/>
    <line x1="127" y1="64.3" x2="173" y2="119.7" stroke="#2860a0" stroke-width="0.7" opacity="0.25" transform="rotate(-67.5,150,92)"/>
  </g>

  <!-- Iris bright arc highlight (top-left) -->
  <path d="M122,70 A32,32 0 0,1 178,70" fill="none" stroke="#7ab8e8" stroke-width="1.5"
        opacity="0.45" stroke-linecap="round"/>

  <!-- Pupil -->
  <circle cx="150" cy="92" r="15" fill="url(#pupilGrad)"/>

  <!-- "A" letterform as circuit node inside pupil -->
  <g filter="url(#aGlow)">
    <!-- A crossbar and legs with circuit aesthetic -->
    <path d="M144,101 L148,83 L150,79 L152,83 L156,101"
          fill="none" stroke="#a0d8ff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    <!-- crossbar -->
    <line x1="145.5" y1="94" x2="154.5" y2="94" stroke="#a0d8ff" stroke-width="1.8" stroke-linecap="round"/>
    <!-- apex circuit node dot -->
    <circle cx="150" cy="79" r="1.8" fill="#c8ecff"/>
    <!-- base corner nodes -->
    <circle cx="144" cy="101" r="1.4" fill="#80c0f0"/>
    <circle cx="156" cy="101" r="1.4" fill="#80c0f0"/>
  </g>

  <!-- Pupil inner glow reflection -->
  <ellipse cx="145" cy="86" rx="3.5" ry="2" fill="#4a90d0" opacity="0.4"/>

  <!-- Eye outline / lash line — upper lid -->
  <path d="M60,92 Q105,40 150,40 Q195,40 240,92"
        fill="none" stroke="url(#eyeOutlineGrad)" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Eye outline — lower lid -->
  <path d="M60,92 Q105,144 150,144 Q195,144 240,92"
        fill="none" stroke="#4a7ab0" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>

  <!-- Corner tear duct details -->
  <circle cx="62" cy="92" r="2.5" fill="#1a4a7a" stroke="#3a7ab8" stroke-width="0.8"/>
  <circle cx="238" cy="92" r="2.5" fill="#1a4a7a" stroke="#3a7ab8" stroke-width="0.8"/>

  <!-- Eyelash tick marks (upper lid) -->
  <g stroke="#7aaedc" stroke-width="1" stroke-linecap="round" opacity="0.5">
    <line x1="90" y1="58" x2="93" y2="52"/>
    <line x1="110" y1="47" x2="112" y2="41"/>
    <line x1="130" y1="41" x2="131" y2="35"/>
    <line x1="150" y1="40" x2="150" y2="34"/>
    <line x1="170" y1="41" x2="169" y2="35"/>
    <line x1="190" y1="47" x2="188" y2="41"/>
    <line x1="210" y1="58" x2="207" y2="52"/>
  </g>

  <!-- Circuit trace lines extending from eye corners -->
  <g stroke="#2a5a8a" stroke-width="0.8" stroke-linecap="round" opacity="0.6">
    <!-- Left side traces -->
    <line x1="62" y1="92" x2="40" y2="92"/>
    <line x1="40" y1="92" x2="35" y2="85"/>
    <line x1="40" y1="92" x2="35" y2="99"/>
    <circle cx="35" cy="85" r="1.5" fill="#3a7ab8"/>
    <circle cx="35" cy="99" r="1.5" fill="#3a7ab8"/>
    <!-- Right side traces -->
    <line x1="238" y1="92" x2="260" y2="92"/>
    <line x1="260" y1="92" x2="265" y2="85"/>
    <line x1="260" y1="92" x2="265" y2="99"/>
    <circle cx="265" cy="85" r="1.5" fill="#3a7ab8"/>
    <circle cx="265" cy="99" r="1.5" fill="#3a7ab8"/>
  </g>

  <!-- Outer iris ring highlight -->
  <circle cx="150" cy="92" r="38" fill="none" stroke="#3a7abf" stroke-width="1.2" opacity="0.5"/>
  <!-- Outer iris ring silver edge -->
  <circle cx="150" cy="92" r="39.5" fill="none" stroke="#6aaad8" stroke-width="0.6" opacity="0.35"
          stroke-dasharray="3 3"/>

  <!-- Scanning line effect across iris (horizontal, subtle) -->
  <line x1="113" y1="88" x2="187" y2="88" stroke="#5aaae0" stroke-width="0.5" opacity="0.3"
        clip-path="url(#irisClip)"/>
  <line x1="113" y1="96" x2="187" y2="96" stroke="#5aaae0" stroke-width="0.3" opacity="0.2"
        clip-path="url(#irisClip)"/>

  <!-- Text: AGENTIC LEAD GEN -->
  <text x="150" y="163"
        font-family="'Helvetica Neue', 'Arial', sans-serif"
        font-size="13.5"
        font-weight="700"
        letter-spacing="4"
        text-anchor="middle"
        fill="url(#textGrad)">AGENTIC LEAD GEN</text>

  <!-- Subtle underline with circuit dots -->
  <line x1="72" y1="169" x2="228" y2="169" stroke="#2a5a88" stroke-width="0.6" opacity="0.5"/>
  <circle cx="72" cy="169" r="1.5" fill="#4a8ab8" opacity="0.6"/>
  <circle cx="228" cy="169" r="1.5" fill="#4a8ab8" opacity="0.6"/>

  <!-- Tagline -->
  <text x="150" y="183"
        font-family="'Helvetica Neue', 'Arial', sans-serif"
        font-size="7"
        font-weight="400"
        letter-spacing="2.5"
        text-anchor="middle"
        fill="#3a6a9a"
        opacity="0.8">EYE OF INTELLIGENCE</text>

  <!-- Top-corner data decorations -->
  <g opacity="0.3" stroke="#3a6a98" stroke-width="0.7" fill="none">
    <path d="M15,15 L15,8 L22,8"/>
    <path d="M285,15 L285,8 L278,8"/>
    <path d="M15,185 L15,192 L22,192"/>
    <path d="M285,185 L285,192 L278,192"/>
  </g>
</svg>` },
  { id: 17, title: "Origami Bird", concept: "geometric origami crane in blue/purple", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Origami Bird Body - triangular facets -->
  <!-- Main body facets -->
  <polygon points="150,40 110,90 150,80" fill="#1a1a6e"/>
  <polygon points="150,40 150,80 190,90" fill="#2d2d9f"/>
  <polygon points="110,90 150,80 130,120" fill="#3b3bb5"/>
  <polygon points="150,80 190,90 170,120" fill="#5252c8"/>
  <polygon points="110,90 130,120 90,115" fill="#2a2a9a"/>
  <polygon points="190,90 170,120 210,115" fill="#6b6bd6"/>
  <polygon points="130,120 170,120 150,145" fill="#4444be"/>

  <!-- Left Wing -->
  <polygon points="110,90 90,115 65,100" fill="#1e3a8a"/>
  <polygon points="90,115 65,100 60,130" fill="#1e40af"/>
  <polygon points="65,100 60,130 40,110" fill="#1d4ed8"/>
  <polygon points="60,130 40,110 35,140" fill="#2563eb"/>
  <polygon points="90,115 60,130 80,140" fill="#3b82f6"/>
  <polygon points="60,130 35,140 55,150" fill="#60a5fa"/>
  <polygon points="80,140 60,130 55,150" fill="#4f46e5"/>

  <!-- Right Wing -->
  <polygon points="190,90 210,115 235,100" fill="#4c1d95"/>
  <polygon points="210,115 235,100 240,130" fill="#5b21b6"/>
  <polygon points="235,100 240,130 260,110" fill="#6d28d9"/>
  <polygon points="240,130 260,110 265,140" fill="#7c3aed"/>
  <polygon points="210,115 240,130 220,140" fill="#8b5cf6"/>
  <polygon points="240,130 265,140 245,150" fill="#a78bfa"/>
  <polygon points="220,140 240,130 245,150" fill="#9333ea"/>

  <!-- Tail feathers -->
  <polygon points="130,120 150,145 120,155" fill="#312e81"/>
  <polygon points="150,145 170,120 180,155" fill="#3730a3"/>
  <polygon points="120,155 150,145 140,165" fill="#4338ca"/>
  <polygon points="150,145 180,155 160,165" fill="#4f46e5"/>
  <polygon points="140,165 150,145 160,165" fill="#6366f1"/>

  <!-- Head/Neck -->
  <polygon points="150,40 165,20 175,50" fill="#0f172a"/>
  <polygon points="150,40 175,50 190,90" fill="#1e1b4b"/>
  <polygon points="165,20 175,50 185,30" fill="#172554"/>

  <!-- Beak -->
  <polygon points="165,20 185,30 195,15" fill="#1e3a8a"/>
  <polygon points="185,30 195,15 200,28" fill="#2563eb"/>

  <!-- Eye -->
  <circle cx="176" cy="26" r="3" fill="#60a5fa"/>
  <circle cx="176" cy="26" r="1.5" fill="#0f172a"/>

  <!-- Wing edge highlights -->
  <polyline points="65,100 40,110 35,140 55,150" fill="none" stroke="#bfdbfe" stroke-width="0.5" opacity="0.6"/>
  <polyline points="235,100 260,110 265,140 245,150" fill="none" stroke="#ddd6fe" stroke-width="0.5" opacity="0.6"/>

  <!-- Brand text -->
  <text x="150" y="186" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="700" fill="#1e1b4b" text-anchor="middle" letter-spacing="1.5">AGENTIC LEAD GEN</text>
</svg>` },
  { id: 18, title: "Atom Orbits", concept: "atom model with data stream orbits", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0d1f2d"/>
      <stop offset="100%" stop-color="#060e14"/>
    </radialGradient>

    <!-- Nucleus glow -->
    <radialGradient id="nucleusGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#00d4c8"/>
      <stop offset="100%" stop-color="#008a84"/>
    </radialGradient>

    <!-- Teal orbit glow filter -->
    <filter id="tealGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Orange orbit glow filter -->
    <filter id="orangeGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Nucleus halo -->
    <filter id="nucleusGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Electron glow -->
    <filter id="electronGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Data stream dash pattern for orbit 1 (teal, horizontal ellipse) -->
    <!-- orbit 2 (orange, tilted 60deg) -->
    <!-- orbit 3 (teal, tilted -60deg) -->

    <!-- Clip to viewbox -->
    <clipPath id="vb">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle grid lines for scientific aesthetic -->
  <g opacity="0.07" stroke="#00d4c8" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ============================================================
       ATOM: center at (108, 100)
       Orbit 1: horizontal ellipse  rx=62 ry=22
       Orbit 2: tilted +60deg       rx=62 ry=22
       Orbit 3: tilted -60deg       rx=62 ry=22
  ============================================================ -->

  <g clip-path="url(#vb)">

    <!-- ORBIT 1 — horizontal — teal dashed (data stream) -->
    <g filter="url(#tealGlow)">
      <ellipse cx="108" cy="100" rx="62" ry="22"
               fill="none" stroke="#00d4c8" stroke-width="1.4"
               stroke-dasharray="6 3" opacity="0.85"/>
    </g>

    <!-- ORBIT 2 — rotated +60deg — orange dashed -->
    <g filter="url(#orangeGlow)">
      <ellipse cx="108" cy="100" rx="62" ry="22"
               fill="none" stroke="#ff7a2f" stroke-width="1.4"
               stroke-dasharray="6 3" opacity="0.85"
               transform="rotate(60 108 100)"/>
    </g>

    <!-- ORBIT 3 — rotated -60deg — teal dashed -->
    <g filter="url(#tealGlow)">
      <ellipse cx="108" cy="100" rx="62" ry="22"
               fill="none" stroke="#00b8b2" stroke-width="1.4"
               stroke-dasharray="6 3" opacity="0.75"
               transform="rotate(-60 108 100)"/>
    </g>

    <!-- Nucleus outer halo -->
    <circle cx="108" cy="100" r="18" fill="#00d4c8" opacity="0.08" filter="url(#nucleusGlow)"/>
    <circle cx="108" cy="100" r="13" fill="#00d4c8" opacity="0.12" filter="url(#nucleusGlow)"/>

    <!-- Nucleus -->
    <circle cx="108" cy="100" r="20" fill="url(#nucleusGrad)" filter="url(#nucleusGlow)"/>
    <circle cx="108" cy="100" r="20" fill="none" stroke="#00ffee" stroke-width="0.8" opacity="0.6"/>

    <!-- "A" letterform in nucleus -->
    <text x="108" y="106"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="18" font-weight="700"
          fill="#0d1f2d"
          text-anchor="middle"
          dominant-baseline="middle"
          letter-spacing="-0.5">A</text>

    <!-- ELECTRON 1 — orbit 1 (horizontal), rightmost point = (170, 100) -->
    <!-- Positioned at angle 0 on ellipse: x = cx+rx = 170, y = 100 -->
    <circle cx="170" cy="100" r="4.5" fill="#ff7a2f" filter="url(#electronGlow)"/>
    <circle cx="170" cy="100" r="2" fill="#ffffff" opacity="0.9"/>

    <!-- ELECTRON 2 — orbit 2 (+60 rotation), top-right of that ellipse -->
    <!-- angle=0 on local ellipse before rotation: local (62,0), rotate 60deg around (108,100):
         dx=62, dy=0 → rotated: dx=62*cos60=31, dy=62*sin60=53.7 → (139, 153.7) -->
    <circle cx="139" cy="153.7" r="4.5" fill="#00d4c8" filter="url(#electronGlow)"/>
    <circle cx="139" cy="153.7" r="2" fill="#ffffff" opacity="0.9"/>

    <!-- ELECTRON 3 — orbit 3 (-60 rotation), top-right of that ellipse -->
    <!-- angle=0 on local ellipse: (62,0), rotate -60deg:
         dx=62*cos(-60)=31, dy=62*sin(-60)=-53.7 → (139, 46.3) -->
    <circle cx="139" cy="46.3" r="4.5" fill="#ff9b57" filter="url(#electronGlow)"/>
    <circle cx="139" cy="46.3" r="2" fill="#ffffff" opacity="0.9"/>

    <!-- Small data-node dots along orbit 1 -->
    <!-- At angle 180: x=108-62=46, y=100 -->
    <circle cx="46" cy="100" r="2" fill="#00d4c8" opacity="0.6"/>
    <!-- At angle 90 on orbit1 (top): x=108, y=100-22=78 -->
    <circle cx="108" cy="78" r="1.5" fill="#00d4c8" opacity="0.4"/>
    <!-- At angle 270 (bottom): x=108, y=122 -->
    <circle cx="108" cy="122" r="1.5" fill="#00d4c8" opacity="0.4"/>

    <!-- Small data-node on orbit 2 opposite side: angle=180 rotated 60deg
         local (-62,0) → rotate 60: dx=-31, dy=-53.7 → (77, 46.3) -->
    <circle cx="77" cy="46.3" r="2" fill="#ff7a2f" opacity="0.5"/>

    <!-- Small data-node on orbit 3 opposite: angle=180 rotated -60deg
         local (-62,0) → rotate -60: dx=-31, dy=53.7 → (77, 153.7) -->
    <circle cx="77" cy="153.7" r="2" fill="#00b8b2" opacity="0.5"/>

  </g>

  <!-- ============================================================
       WORDMARK — right side
  ============================================================ -->

  <!-- "Agentic" — primary word, teal -->
  <text x="190" y="88"
        font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="22" font-weight="700"
        fill="#00d4c8"
        letter-spacing="0.5">Agentic</text>

  <!-- Thin separator line -->
  <line x1="190" y1="96" x2="284" y2="96" stroke="#00d4c8" stroke-width="0.6" opacity="0.4"/>

  <!-- "Lead Gen" — secondary word, white/light -->
  <text x="190" y="116"
        font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="18" font-weight="400"
        fill="#e8f4f4"
        letter-spacing="1.5">LEAD GEN</text>

  <!-- Tagline -->
  <text x="190" y="133"
        font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="7.5" font-weight="300"
        fill="#4a8a87"
        letter-spacing="1.8">INTELLIGENT PROSPECTING</text>

</svg>` },
  { id: 19, title: "Infinity Loop", concept: "infinity symbol as lead gen cycle", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="infinityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF6B2B;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#A855F7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="arrowGradL" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF6B2B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A855F7;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="arrowGradR" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#A855F7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#0A0A0F" rx="12"/>

  <!-- Subtle background radial glow -->
  <radialGradient id="bgGlow" cx="50%" cy="45%" r="50%">
    <stop offset="0%" style="stop-color:#1a0a2e;stop-opacity:1"/>
    <stop offset="100%" style="stop-color:#0A0A0F;stop-opacity:1"/>
  </radialGradient>
  <rect width="300" height="200" fill="url(#bgGlow)" rx="12"/>

  <!-- Infinity symbol - outer glow layer (thicker, blurred) -->
  <g filter="url(#softGlow)" opacity="0.4">
    <!-- Left loop glow -->
    <path d="M 150,95
             C 150,95 135,68 112,68
             C 89,68 72,82 72,95
             C 72,108 89,122 112,122
             C 135,122 150,95 150,95"
          fill="none" stroke="#FF6B2B" stroke-width="14" stroke-linecap="round"/>
    <!-- Right loop glow -->
    <path d="M 150,95
             C 150,95 165,68 188,68
             C 211,68 228,82 228,95
             C 228,108 211,122 188,122
             C 165,122 150,95 150,95"
          fill="none" stroke="#3B82F6" stroke-width="14" stroke-linecap="round"/>
  </g>

  <!-- Main infinity path - gradient stroke via two separate arcs -->
  <!-- Left loop (warm orange side) -->
  <path d="M 150,95
           C 150,95 140,72 122,69
           C 104,66 88,70 80,80
           C 73,88 73,102 80,110
           C 88,120 104,124 122,121
           C 140,118 150,95 150,95"
        fill="none" stroke="url(#arrowGradL)" stroke-width="7" stroke-linecap="round"
        filter="url(#glow)"/>

  <!-- Right loop (cool blue side) -->
  <path d="M 150,95
           C 150,95 160,72 178,69
           C 196,66 212,70 220,80
           C 227,88 227,102 220,110
           C 212,120 196,124 178,121
           C 160,118 150,95 150,95"
        fill="none" stroke="url(#arrowGradR)" stroke-width="7" stroke-linecap="round"
        filter="url(#glow)"/>

  <!-- Ouroboros snake head on left loop (orange end) — small filled circle + forked tongue -->
  <circle cx="152" cy="91" r="5.5" fill="#FF6B2B" filter="url(#glow)"/>
  <!-- Eye -->
  <circle cx="154" cy="89.5" r="1.2" fill="#0A0A0F"/>
  <!-- Tongue fork -->
  <line x1="157" y1="91" x2="161" y2="89" stroke="#FF6B2B" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="157" y1="91" x2="161" y2="93" stroke="#FF6B2B" stroke-width="1.2" stroke-linecap="round"/>

  <!-- Directional arrow markers on the paths to show flow -->
  <!-- Left loop top arrow -->
  <polygon points="113,66 119,71 107,71" fill="#FF8C4B" opacity="0.9" filter="url(#glow)"/>
  <!-- Right loop bottom arrow -->
  <polygon points="187,124 181,119 193,119" fill="#60A5FA" opacity="0.9" filter="url(#glow)"/>

  <!-- Center crossover highlight dot -->
  <circle cx="150" cy="95" r="3.5" fill="#A855F7" filter="url(#glow)" opacity="0.9"/>

  <!-- Small node dots on loop peaks -->
  <circle cx="75" cy="95" r="3" fill="#FF6B2B" opacity="0.7"/>
  <circle cx="225" cy="95" r="3" fill="#3B82F6" opacity="0.7"/>

  <!-- Wordmark -->
  <text x="150" y="148"
        font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="15.5"
        font-weight="700"
        letter-spacing="0.04em"
        fill="url(#infinityGrad)"
        text-anchor="middle"
        filter="url(#glow)">AGENTIC LEAD GEN</text>

  <!-- Tagline -->
  <text x="150" y="165"
        font-family="'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        font-size="7.5"
        font-weight="400"
        letter-spacing="0.18em"
        fill="#6B7280"
        text-anchor="middle">PERPETUAL PIPELINE · AI-NATIVE</text>

  <!-- Thin separator line under wordmark -->
  <line x1="90" y1="153" x2="210" y2="153" stroke="url(#infinityGrad)" stroke-width="0.5" opacity="0.4"/>
</svg>` },
  { id: 20, title: "Crown Premium", concept: "geometric crown with data node points", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7B2FBE;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5B1F8E;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F0C040;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#C89020;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD966;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#C8950A;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="nodeglow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Crown base band -->
  <rect x="88" y="86" width="124" height="12" rx="2" fill="url(#crownGrad)" />

  <!-- Crown body fill (filled polygon between base and peaks) -->
  <!-- Left side panel -->
  <polygon points="88,98 88,64 106,76 124,52 124,76 150,46 176,76 176,52 194,76 212,64 212,98"
           fill="url(#crownGrad)" />

  <!-- Crown outline / stroke for crispness -->
  <polygon points="88,98 88,64 106,76 124,52 124,76 150,46 176,76 176,52 194,76 212,64 212,98"
           fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-linejoin="round" />

  <!-- Connector lines (data network edges) in gold -->
  <!-- Left edge to left peak -->
  <line x1="88" y1="64" x2="124" y2="52" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.6"/>
  <!-- Left peak to center -->
  <line x1="124" y1="52" x2="150" y2="46" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.6"/>
  <!-- Center to right peak -->
  <line x1="150" y1="46" x2="176" y2="52" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.6"/>
  <!-- Right peak to right edge -->
  <line x1="176" y1="52" x2="212" y2="64" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.6"/>
  <!-- Mid-left node connections -->
  <line x1="106" y1="76" x2="124" y2="52" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.5"/>
  <line x1="106" y1="76" x2="88" y2="64" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.5"/>
  <!-- Mid-right node connections -->
  <line x1="194" y1="76" x2="176" y2="52" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.5"/>
  <line x1="194" y1="76" x2="212" y2="64" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.5"/>
  <!-- Inner mid connections -->
  <line x1="124" y1="76" x2="106" y2="76" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.4"/>
  <line x1="176" y1="76" x2="194" y2="76" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.4"/>
  <line x1="124" y1="76" x2="150" y2="46" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.4"/>
  <line x1="176" y1="76" x2="150" y2="46" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.4"/>

  <!-- Data node dots at crown points -->
  <!-- Left base corner -->
  <circle cx="88" cy="64" r="4" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="88" cy="64" r="2" fill="#FFE082"/>

  <!-- Left inner peak -->
  <circle cx="106" cy="76" r="3.5" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="106" cy="76" r="1.8" fill="#FFE082"/>

  <!-- Left peak -->
  <circle cx="124" cy="52" r="4.5" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="124" cy="52" r="2.2" fill="#FFFDE7"/>

  <!-- Left mid shoulder -->
  <circle cx="124" cy="76" r="3" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="124" cy="76" r="1.5" fill="#FFE082"/>

  <!-- Center peak (tallest) -->
  <circle cx="150" cy="46" r="5.5" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="150" cy="46" r="2.8" fill="#FFFDE7"/>

  <!-- Right mid shoulder -->
  <circle cx="176" cy="76" r="3" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="176" cy="76" r="1.5" fill="#FFE082"/>

  <!-- Right peak -->
  <circle cx="176" cy="52" r="4.5" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="176" cy="52" r="2.2" fill="#FFFDE7"/>

  <!-- Right inner peak -->
  <circle cx="194" cy="76" r="3.5" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="194" cy="76" r="1.8" fill="#FFE082"/>

  <!-- Right base corner -->
  <circle cx="212" cy="64" r="4" fill="url(#nodeGrad)" filter="url(#nodeglow)"/>
  <circle cx="212" cy="64" r="2" fill="#FFE082"/>

  <!-- Gold accent line below crown base -->
  <rect x="88" y="98" width="124" height="2" rx="1" fill="url(#goldGrad)" opacity="0.9"/>

  <!-- Thin decorative rule above wordmark -->
  <line x1="106" y1="116" x2="194" y2="116" stroke="url(#goldGrad)" stroke-width="0.6" opacity="0.7"/>

  <!-- Wordmark: AGENTIC LEAD GEN -->
  <!-- Main wordmark in deep purple, serif style via font-family -->
  <text
    x="150"
    y="134"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="14.5"
    font-weight="700"
    letter-spacing="4"
    fill="#4A1080"
  >AGENTIC</text>

  <text
    x="150"
    y="151"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="14.5"
    font-weight="700"
    letter-spacing="4"
    fill="#4A1080"
  >LEAD GEN</text>

  <!-- Gold underline rule below wordmark -->
  <line x1="100" y1="158" x2="200" y2="158" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.8"/>

  <!-- Tagline -->
  <text
    x="150"
    y="171"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="6.5"
    font-weight="400"
    letter-spacing="2.5"
    fill="#9B59B6"
    opacity="0.85"
  >PRECISION INTELLIGENCE</text>
</svg>` },
  { id: 21, title: "Lightning Bolt", concept: "electric bolt with ALG negative space", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE500;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFCA00;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFE500;stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0.8 0 0 0
                0.9 0.7 0 0 0
                0   0   0 0 0
                0   0   0 0.6 0" result="yellowBlur"/>
      <feMerge>
        <feMergeNode in="yellowBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="boltClip">
      <!-- Main lightning bolt shape -->
      <polygon points="170,15 100,105 140,105 90,185 210,90 165,90 220,15"/>
    </clipPath>
  </defs>

  <!-- Dark charcoal background -->
  <rect width="300" height="200" fill="#1A1A1F"/>

  <!-- Subtle radial glow behind bolt -->
  <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" style="stop-color:#3D3200;stop-opacity:0.8"/>
    <stop offset="100%" style="stop-color:#1A1A1F;stop-opacity:0"/>
  </radialGradient>
  <ellipse cx="155" cy="100" rx="120" ry="90" fill="url(#bgGlow)"/>

  <!-- Outer glow layer for bolt -->
  <polygon
    points="170,15 100,105 140,105 90,185 210,90 165,90 220,15"
    fill="#FFE500"
    opacity="0.15"
    filter="url(#softGlow)"
  />

  <!-- Main lightning bolt -->
  <polygon
    points="170,15 100,105 140,105 90,185 210,90 165,90 220,15"
    fill="url(#boltGrad)"
    filter="url(#glow)"
  />

  <!-- ALG text carved as negative space using white-on-bolt overlay -->
  <!-- We render the letters in the background color so they appear cut out -->

  <!-- Letter A -->
  <g clip-path="url(#boltClip)">
    <!-- A shape carved from bolt -->
    <text
      x="108"
      y="138"
      font-family="'Arial Black', 'Arial', sans-serif"
      font-weight="900"
      font-size="52"
      letter-spacing="-2"
      fill="#1A1A1F"
      style="font-stretch:condensed"
    >ALG</text>
  </g>

  <!-- Spark accents -->
  <g filter="url(#glow)" opacity="0.9">
    <!-- Top-right spark -->
    <line x1="226" y1="12" x2="238" y2="6" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="230" y1="18" x2="244" y2="16" stroke="#FFE500" stroke-width="1" stroke-linecap="round"/>
    <line x1="228" y1="8" x2="233" y2="-1" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round"/>
    <!-- Bottom-left spark -->
    <line x1="85" y1="188" x2="74" y2="196" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="80" y1="183" x2="68" y2="183" stroke="#FFE500" stroke-width="1" stroke-linecap="round"/>
    <line x1="83" y1="192" x2="76" y2="200" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round"/>
  </g>

  <!-- Small energy dots -->
  <circle cx="238" cy="20" r="2" fill="#FFFFFF" opacity="0.8" filter="url(#glow)"/>
  <circle cx="248" cy="14" r="1.5" fill="#FFE500" opacity="0.7" filter="url(#glow)"/>
  <circle cx="66" cy="188" r="2" fill="#FFFFFF" opacity="0.8" filter="url(#glow)"/>
  <circle cx="57" cy="178" r="1.5" fill="#FFE500" opacity="0.7" filter="url(#glow)"/>

  <!-- Wordmark -->
  <text
    x="150"
    y="194"
    font-family="'Arial', sans-serif"
    font-weight="700"
    font-size="9"
    fill="#FFE500"
    text-anchor="middle"
    letter-spacing="4"
    opacity="0.85"
  >AGENTIC LEAD GEN</text>
</svg>` },
  { id: 22, title: "Maze Solver", concept: "glowing solved path through maze", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" result="blur1"/>
      <feGaussianBlur stdDeviation="1.5" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur1"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glow-text" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#4af0ff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#00aaff" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050d1a"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1a2a3e"/>
      <stop offset="100%" stop-color="#0f1e30"/>
    </linearGradient>
    <radialGradient id="startGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="1"/>
      <stop offset="100%" stop-color="#00cc66" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="endGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff6b35" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ff4400" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ambientGlow" cx="45%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#0066aa" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000510" stop-opacity="0"/>
    </radialGradient>
    <!-- Animated dash for the solution path -->
    <style>
      .path-anim {
        stroke-dasharray: 8 4;
        animation: dash 1.8s linear infinite;
      }
      @keyframes dash {
        to { stroke-dashoffset: -24; }
      }
      .pulse-start {
        animation: pulseS 2s ease-in-out infinite;
      }
      @keyframes pulseS {
        0%, 100% { opacity: 1; r: 4; }
        50% { opacity: 0.6; r: 5.5; }
      }
      .pulse-end {
        animation: pulseE 2s ease-in-out infinite;
        animation-delay: 1s;
      }
      @keyframes pulseE {
        0%, 100% { opacity: 1; r: 4; }
        50% { opacity: 0.6; r: 5.5; }
      }
    </style>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>
  <rect width="300" height="200" fill="url(#ambientGlow)" rx="8"/>

  <!-- Subtle grid texture -->
  <g opacity="0.06" stroke="#3a6fa0" stroke-width="0.4">
    <line x1="0" y1="20" x2="300" y2="20"/>
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="60" x2="300" y2="60"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="100" x2="300" y2="100"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="140" x2="300" y2="140"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="20" y1="0" x2="20" y2="200"/>
    <line x1="40" y1="0" x2="40" y2="200"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="80" y1="0" x2="80" y2="200"/>
    <line x1="100" y1="0" x2="100" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="140" y1="0" x2="140" y2="200"/>
    <line x1="160" y1="0" x2="160" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="200" y1="0" x2="200" y2="200"/>
    <line x1="220" y1="0" x2="220" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
    <line x1="260" y1="0" x2="260" y2="200"/>
    <line x1="280" y1="0" x2="280" y2="200"/>
  </g>

  <!-- ===== MAZE WALLS ===== -->
  <!-- Maze occupies roughly x:18-222, y:14-146 -->
  <!-- Cell size: ~16px, 13 cols x 8 rows -->
  <g fill="url(#wallGrad)" stroke="#1e3550" stroke-width="0.5">

    <!-- Outer boundary -->
    <rect x="18" y="14" width="204" height="132" rx="2" fill="none" stroke="#2a4060" stroke-width="2"/>

    <!-- Horizontal walls (internal) -->
    <!-- Row 1 -->
    <rect x="18" y="30" width="32" height="3"/>
    <rect x="66" y="30" width="48" height="3"/>
    <rect x="130" y="30" width="32" height="3"/>
    <rect x="178" y="30" width="44" height="3"/>

    <!-- Row 2 -->
    <rect x="34" y="46" width="32" height="3"/>
    <rect x="82" y="46" width="16" height="3"/>
    <rect x="114" y="46" width="32" height="3"/>
    <rect x="162" y="46" width="32" height="3"/>
    <rect x="210" y="46" width="12" height="3"/>

    <!-- Row 3 -->
    <rect x="18" y="62" width="48" height="3"/>
    <rect x="82" y="62" width="32" height="3"/>
    <rect x="130" y="62" width="16" height="3"/>
    <rect x="162" y="62" width="48" height="3"/>

    <!-- Row 4 -->
    <rect x="34" y="78" width="16" height="3"/>
    <rect x="66" y="78" width="32" height="3"/>
    <rect x="114" y="78" width="16" height="3"/>
    <rect x="146" y="78" width="32" height="3"/>
    <rect x="194" y="78" width="28" height="3"/>

    <!-- Row 5 -->
    <rect x="18" y="94" width="32" height="3"/>
    <rect x="66" y="94" width="48" height="3"/>
    <rect x="130" y="94" width="32" height="3"/>
    <rect x="178" y="94" width="16" height="3"/>
    <rect x="210" y="94" width="12" height="3"/>

    <!-- Row 6 -->
    <rect x="34" y="110" width="32" height="3"/>
    <rect x="82" y="110" width="16" height="3"/>
    <rect x="114" y="110" width="32" height="3"/>
    <rect x="162" y="110" width="32" height="3"/>

    <!-- Row 7 -->
    <rect x="18" y="126" width="48" height="3"/>
    <rect x="82" y="126" width="32" height="3"/>
    <rect x="130" y="126" width="48" height="3"/>
    <rect x="194" y="126" width="28" height="3"/>

    <!-- Vertical walls (internal) -->
    <!-- Col 1 -->
    <rect x="34" y="14" width="3" height="16"/>
    <rect x="34" y="33" width="3" height="16"/>
    <rect x="34" y="65" width="3" height="16"/>
    <rect x="34" y="97" width="3" height="13"/>
    <rect x="34" y="129" width="3" height="17"/>

    <!-- Col 2 -->
    <rect x="50" y="30" width="3" height="16"/>
    <rect x="50" y="62" width="3" height="16"/>
    <rect x="50" y="94" width="3" height="32"/>

    <!-- Col 3 -->
    <rect x="66" y="14" width="3" height="32"/>
    <rect x="66" y="49" width="3" height="29"/>
    <rect x="66" y="97" width="3" height="29"/>

    <!-- Col 4 -->
    <rect x="82" y="30" width="3" height="32"/>
    <rect x="82" y="81" width="3" height="13"/>
    <rect x="82" y="113" width="3" height="33"/>

    <!-- Col 5 -->
    <rect x="98" y="14" width="3" height="32"/>
    <rect x="98" y="62" width="3" height="32"/>
    <rect x="98" y="113" width="3" height="33"/>

    <!-- Col 6 -->
    <rect x="114" y="30" width="3" height="16"/>
    <rect x="114" y="65" width="3" height="13"/>
    <rect x="114" y="97" width="3" height="16"/>

    <!-- Col 7 -->
    <rect x="130" y="14" width="3" height="16"/>
    <rect x="130" y="49" width="3" height="29"/>
    <rect x="130" y="97" width="3" height="29"/>

    <!-- Col 8 -->
    <rect x="146" y="30" width="3" height="48"/>
    <rect x="146" y="113" width="3" height="33"/>

    <!-- Col 9 -->
    <rect x="162" y="14" width="3" height="16"/>
    <rect x="162" y="65" width="3" height="13"/>
    <rect x="162" y="97" width="3" height="29"/>

    <!-- Col 10 -->
    <rect x="178" y="30" width="3" height="16"/>
    <rect x="178" y="62" width="3" height="32"/>
    <rect x="178" y="113" width="3" height="16"/>

    <!-- Col 11 -->
    <rect x="194" y="14" width="3" height="32"/>
    <rect x="194" y="65" width="3" height="13"/>
    <rect x="194" y="113" width="3" height="17"/>

    <!-- Col 12 -->
    <rect x="210" y="30" width="3" height="16"/>
    <rect x="210" y="62" width="3" height="32"/>
    <rect x="210" y="97" width="3" height="29"/>
  </g>

  <!-- ===== GLOW PATH SHADOW (outer bloom) ===== -->
  <polyline
    points="22,22 22,38 38,38 38,54 54,54 54,38 70,38 70,22 86,22 86,38 86,54 102,54 102,70 118,70 118,54 134,54 134,70 150,70 150,54 166,54 166,38 182,38 182,54 198,54 198,70 214,70 214,86 198,86 182,86 166,86 150,86 150,102 134,102 118,102 102,102 102,118 86,118 70,118 70,134 86,134 102,134 118,134 134,134 150,134 166,134 166,118 182,118 198,118 214,118 214,134 218,138"
    fill="none"
    stroke="#00aaff"
    stroke-width="10"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.12"
    filter="url(#glow-strong)"
  />

  <!-- ===== GLOW PATH MID ===== -->
  <polyline
    points="22,22 22,38 38,38 38,54 54,54 54,38 70,38 70,22 86,22 86,38 86,54 102,54 102,70 118,70 118,54 134,54 134,70 150,70 150,54 166,54 166,38 182,38 182,54 198,54 198,70 214,70 214,86 198,86 182,86 166,86 150,86 150,102 134,102 118,102 102,102 102,118 86,118 70,118 70,134 86,134 102,134 118,134 134,134 150,134 166,134 166,118 182,118 198,118 214,118 214,134 218,138"
    fill="none"
    stroke="#00ccff"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.5"
    filter="url(#glow-soft)"
  />

  <!-- ===== SOLUTION PATH (bright core) ===== -->
  <polyline
    class="path-anim"
    points="22,22 22,38 38,38 38,54 54,54 54,38 70,38 70,22 86,22 86,38 86,54 102,54 102,70 118,70 118,54 134,54 134,70 150,70 150,54 166,54 166,38 182,38 182,54 198,54 198,70 214,70 214,86 198,86 182,86 166,86 150,86 150,102 134,102 118,102 102,102 102,118 86,118 70,118 70,134 86,134 102,134 118,134 134,134 150,134 166,134 166,118 182,118 198,118 214,118 214,134 218,138"
    fill="none"
    stroke="url(#pathGrad)"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glow-soft)"
  />

  <!-- START node -->
  <circle cx="22" cy="22" r="5" fill="url(#startGlow)" filter="url(#glow-soft)" opacity="0.6"/>
  <circle class="pulse-start" cx="22" cy="22" r="4" fill="#00ff88" filter="url(#glow-soft)"/>
  <circle cx="22" cy="22" r="2" fill="#ccffe8"/>

  <!-- END node -->
  <circle cx="218" cy="138" r="5" fill="url(#endGlow)" filter="url(#glow-soft)" opacity="0.6"/>
  <circle class="pulse-end" cx="218" cy="138" r="4" fill="#ff6b35" filter="url(#glow-soft)"/>
  <circle cx="218" cy="138" r="2" fill="#ffd0b5"/>

  <!-- ===== TEXT SECTION ===== -->
  <!-- "Agentic" -->
  <text
    x="240" y="62"
    font-family="'Courier New', Courier, monospace"
    font-size="13"
    font-weight="700"
    letter-spacing="2"
    fill="#00d4ff"
    filter="url(#glow-text)"
    text-anchor="start"
  >AGENTIC</text>

  <!-- Divider line -->
  <line x1="238" y1="68" x2="292" y2="68" stroke="#00aaff" stroke-width="0.8" opacity="0.5"/>

  <!-- "LEAD GEN" -->
  <text
    x="240" y="82"
    font-family="'Courier New', Courier, monospace"
    font-size="10.5"
    font-weight="600"
    letter-spacing="1.5"
    fill="#7ed8f0"
    text-anchor="start"
  >LEAD GEN</text>

  <!-- Tagline -->
  <text
    x="240" y="98"
    font-family="'Courier New', Courier, monospace"
    font-size="6.5"
    letter-spacing="0.8"
    fill="#3a7a9a"
    text-anchor="start"
  >PATHFINDER AI</text>

  <!-- Small legend: START / END -->
  <circle cx="241" cy="116" r="3" fill="#00ff88" opacity="0.8"/>
  <text x="248" y="119" font-family="'Courier New', Courier, monospace" font-size="6" fill="#4a8a6a" letter-spacing="0.5">START</text>

  <circle cx="241" cy="128" r="3" fill="#ff6b35" opacity="0.8"/>
  <text x="248" y="131" font-family="'Courier New', Courier, monospace" font-size="6" fill="#8a5a4a" letter-spacing="0.5">GOAL</text>

  <!-- Bottom border accent -->
  <line x1="18" y1="152" x2="222" y2="152" stroke="#1a3a5a" stroke-width="0.8" opacity="0.6"/>
  <line x1="18" y1="154" x2="222" y2="154" stroke="#00aaff" stroke-width="0.4" opacity="0.2"/>

  <!-- Corner accent marks -->
  <g stroke="#00aaff" stroke-width="1.2" opacity="0.4" fill="none">
    <path d="M8,8 L8,16 L16,16"/>
    <path d="M292,8 L292,16 L284,16"/>
    <path d="M8,192 L8,184 L16,184"/>
    <path d="M292,192 L292,184 L284,184"/>
  </g>

  <!-- Outer glow border -->
  <rect x="1" y="1" width="298" height="198" rx="8" fill="none" stroke="#00aaff" stroke-width="0.6" opacity="0.15"/>
</svg>` },
  { id: 23, title: "Spiral Galaxy", concept: "galaxy vortex with ALG at core", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep space background gradient -->
    <radialGradient id="spaceGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0d0520"/>
      <stop offset="40%" stop-color="#080318"/>
      <stop offset="100%" stop-color="#020108"/>
    </radialGradient>
    <!-- Galaxy core glow -->
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8d5ff" stop-opacity="1"/>
      <stop offset="20%" stop-color="#c084fc" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#4c1d95" stop-opacity="0"/>
    </radialGradient>
    <!-- Arm glow gradient -->
    <radialGradient id="armGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#7c3aed" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#4c1d95" stop-opacity="0"/>
    </radialGradient>
    <!-- Outer haze -->
    <radialGradient id="hazeGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0"/>
      <stop offset="40%" stop-color="#6d28d9" stop-opacity="0.15"/>
      <stop offset="70%" stop-color="#5b21b6" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#3b0764" stop-opacity="0"/>
    </radialGradient>
    <!-- Text glow filter -->
    <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Core blur filter -->
    <filter id="coreBlur" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6"/>
    </filter>
    <!-- Arm blur filter -->
    <filter id="armBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
    </filter>
    <!-- Star glow -->
    <filter id="starGlow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2"/>
    </filter>
    <!-- Dust glow -->
    <filter id="dustGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6"/>
    </filter>
    <!-- Clip to viewbox -->
    <clipPath id="vbClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#spaceGrad)"/>

  <!-- Distant star field layer 1 (tiny, dim) -->
  <g clip-path="url(#vbClip)" opacity="0.5">
    <circle cx="12" cy="8" r="0.4" fill="#d8b4fe"/>
    <circle cx="34" cy="15" r="0.3" fill="#e9d5ff"/>
    <circle cx="58" cy="6" r="0.5" fill="#c4b5fd"/>
    <circle cx="82" cy="19" r="0.3" fill="#ddd6fe"/>
    <circle cx="105" cy="5" r="0.4" fill="#ede9fe"/>
    <circle cx="130" cy="12" r="0.3" fill="#d8b4fe"/>
    <circle cx="155" cy="7" r="0.5" fill="#c4b5fd"/>
    <circle cx="178" cy="16" r="0.3" fill="#e9d5ff"/>
    <circle cx="200" cy="4" r="0.4" fill="#ddd6fe"/>
    <circle cx="225" cy="11" r="0.3" fill="#d8b4fe"/>
    <circle cx="248" cy="8" r="0.5" fill="#ede9fe"/>
    <circle cx="272" cy="18" r="0.3" fill="#c4b5fd"/>
    <circle cx="291" cy="6" r="0.4" fill="#e9d5ff"/>
    <circle cx="8" cy="35" r="0.3" fill="#ddd6fe"/>
    <circle cx="27" cy="42" r="0.4" fill="#d8b4fe"/>
    <circle cx="50" cy="38" r="0.3" fill="#c4b5fd"/>
    <circle cx="74" cy="45" r="0.5" fill="#e9d5ff"/>
    <circle cx="95" cy="32" r="0.3" fill="#ede9fe"/>
    <circle cx="120" cy="40" r="0.4" fill="#d8b4fe"/>
    <circle cx="142" cy="28" r="0.3" fill="#ddd6fe"/>
    <circle cx="168" cy="44" r="0.5" fill="#c4b5fd"/>
    <circle cx="192" cy="30" r="0.3" fill="#e9d5ff"/>
    <circle cx="215" cy="38" r="0.4" fill="#d8b4fe"/>
    <circle cx="238" cy="25" r="0.3" fill="#ede9fe"/>
    <circle cx="260" cy="42" r="0.5" fill="#ddd6fe"/>
    <circle cx="283" cy="35" r="0.3" fill="#c4b5fd"/>
    <circle cx="15" cy="65" r="0.4" fill="#e9d5ff"/>
    <circle cx="40" cy="72" r="0.3" fill="#d8b4fe"/>
    <circle cx="65" cy="58" r="0.5" fill="#ddd6fe"/>
    <circle cx="88" cy="70" r="0.3" fill="#c4b5fd"/>
    <circle cx="112" cy="62" r="0.4" fill="#ede9fe"/>
    <circle cx="136" cy="75" r="0.3" fill="#e9d5ff"/>
    <circle cx="215" cy="60" r="0.4" fill="#d8b4fe"/>
    <circle cx="238" cy="68" r="0.3" fill="#c4b5fd"/>
    <circle cx="262" cy="55" r="0.5" fill="#ddd6fe"/>
    <circle cx="285" cy="72" r="0.3" fill="#e9d5ff"/>
    <circle cx="10" cy="130" r="0.4" fill="#c4b5fd"/>
    <circle cx="32" cy="145" r="0.3" fill="#d8b4fe"/>
    <circle cx="55" cy="138" r="0.5" fill="#ede9fe"/>
    <circle cx="78" cy="152" r="0.3" fill="#e9d5ff"/>
    <circle cx="100" cy="125" r="0.4" fill="#ddd6fe"/>
    <circle cx="215" cy="140" r="0.3" fill="#c4b5fd"/>
    <circle cx="240" cy="128" r="0.5" fill="#d8b4fe"/>
    <circle cx="262" cy="148" r="0.3" fill="#e9d5ff"/>
    <circle cx="285" cy="135" r="0.4" fill="#ede9fe"/>
    <circle cx="18" cy="168" r="0.3" fill="#ddd6fe"/>
    <circle cx="42" cy="175" r="0.4" fill="#c4b5fd"/>
    <circle cx="68" cy="182" r="0.3" fill="#e9d5ff"/>
    <circle cx="90" cy="170" r="0.5" fill="#d8b4fe"/>
    <circle cx="115" cy="185" r="0.3" fill="#ddd6fe"/>
    <circle cx="138" cy="172" r="0.4" fill="#c4b5fd"/>
    <circle cx="160" cy="190" r="0.3" fill="#ede9fe"/>
    <circle cx="185" cy="178" r="0.5" fill="#e9d5ff"/>
    <circle cx="208" cy="188" r="0.3" fill="#d8b4fe"/>
    <circle cx="230" cy="165" r="0.4" fill="#ddd6fe"/>
    <circle cx="255" cy="182" r="0.3" fill="#c4b5fd"/>
    <circle cx="278" cy="172" r="0.5" fill="#e9d5ff"/>
    <circle cx="295" cy="185" r="0.3" fill="#d8b4fe"/>
  </g>

  <!-- Brighter accent stars scattered -->
  <g clip-path="url(#vbClip)">
    <g filter="url(#starGlow)">
      <circle cx="22" cy="22" r="1.2" fill="#f3e8ff" opacity="0.9"/>
      <circle cx="275" cy="30" r="1.0" fill="#e9d5ff" opacity="0.8"/>
      <circle cx="18" cy="160" r="1.1" fill="#f3e8ff" opacity="0.85"/>
      <circle cx="285" cy="155" r="1.0" fill="#e9d5ff" opacity="0.75"/>
      <circle cx="48" cy="185" r="0.9" fill="#ddd6fe" opacity="0.8"/>
      <circle cx="258" cy="180" r="1.0" fill="#e9d5ff" opacity="0.8"/>
      <circle cx="8" cy="95" r="0.9" fill="#f3e8ff" opacity="0.7"/>
      <circle cx="295" cy="100" r="1.0" fill="#ddd6fe" opacity="0.7"/>
      <!-- Bright foreground stars -->
      <circle cx="44" cy="52" r="1.5" fill="#ffffff" opacity="0.95"/>
      <circle cx="256" cy="48" r="1.3" fill="#f3e8ff" opacity="0.9"/>
      <circle cx="36" cy="158" r="1.4" fill="#ffffff" opacity="0.9"/>
      <circle cx="264" cy="162" r="1.3" fill="#f3e8ff" opacity="0.85"/>
    </g>
  </g>

  <!-- === GALAXY SPIRAL === -->
  <!-- Outer haze disk -->
  <ellipse cx="150" cy="100" rx="110" ry="62" fill="url(#hazeGrad)" clip-path="url(#vbClip)"/>

  <!-- Spiral arm 1 — main trailing arm (blurred base) -->
  <g filter="url(#armBlur)" clip-path="url(#vbClip)">
    <path d="M150,100
      C158,90 172,82 188,78
      C205,74 222,76 236,84
      C248,91 255,102 252,114
      C249,124 238,130 224,128
      C210,126 198,116 192,104"
      fill="none" stroke="#a855f7" stroke-width="14" stroke-linecap="round" opacity="0.35"/>
    <path d="M150,100
      C142,88 134,74 130,58
      C126,42 130,26 140,18
      C150,10 164,14 172,24
      C180,34 178,50 168,62
      C158,72 148,76 150,100"
      fill="none" stroke="#8b5cf6" stroke-width="12" stroke-linecap="round" opacity="0.3"/>
    <!-- Arm 2 opposite -->
    <path d="M150,100
      C142,110 128,118 112,122
      C96,126 80,122 68,114
      C56,106 50,94 54,82
      C58,71 70,65 84,68
      C98,71 110,82 116,96"
      fill="none" stroke="#a855f7" stroke-width="14" stroke-linecap="round" opacity="0.35"/>
    <path d="M150,100
      C158,112 166,126 168,142
      C170,158 164,174 154,180
      C144,186 132,180 126,170
      C120,160 124,146 134,136
      C144,126 152,122 150,100"
      fill="none" stroke="#8b5cf6" stroke-width="12" stroke-linecap="round" opacity="0.3"/>
  </g>

  <!-- Spiral arm 1 — sharp bright edge -->
  <g clip-path="url(#vbClip)">
    <path d="M150,100
      C158,90 172,82 188,78
      C205,74 222,76 236,84
      C248,91 255,102 252,114
      C249,124 238,130 224,128
      C210,126 198,116 192,104"
      fill="none" stroke="#c084fc" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M150,100
      C142,88 134,74 130,58
      C126,42 130,26 140,18
      C150,10 164,14 172,24
      C180,34 178,50 168,62
      C158,72 148,76 150,100"
      fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
    <!-- Arm 2 -->
    <path d="M150,100
      C142,110 128,118 112,122
      C96,126 80,122 68,114
      C56,106 50,94 54,82
      C58,71 70,65 84,68
      C98,71 110,82 116,96"
      fill="none" stroke="#c084fc" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M150,100
      C158,112 166,126 168,142
      C170,158 164,174 154,180
      C144,186 132,180 126,170
      C120,160 124,146 134,136
      C144,126 152,122 150,100"
      fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
  </g>

  <!-- Secondary inner spiral wisps -->
  <g filter="url(#dustGlow)" clip-path="url(#vbClip)" opacity="0.6">
    <path d="M150,100 C155,94 164,90 174,90 C184,90 192,96 194,104 C196,112 190,118 182,116 C174,114 168,106 168,100"
      fill="none" stroke="#d8b4fe" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M150,100 C145,106 136,110 126,110 C116,110 108,104 108,96 C108,88 116,84 124,86 C132,88 138,96 138,100"
      fill="none" stroke="#d8b4fe" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Tertiary wisps -->
    <path d="M150,100 C153,96 158,93 164,93 C170,93 176,97 178,103 C180,109 176,114 170,113"
      fill="none" stroke="#e9d5ff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
    <path d="M150,100 C147,104 142,107 136,107 C130,107 124,103 124,97 C124,91 130,88 136,89"
      fill="none" stroke="#e9d5ff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
  </g>

  <!-- Star dust particles along arms -->
  <g clip-path="url(#vbClip)">
    <!-- Arm 1 particles -->
    <circle cx="188" cy="78" r="1.2" fill="#f3e8ff" opacity="0.9"/>
    <circle cx="222" cy="76" r="0.9" fill="#e9d5ff" opacity="0.8"/>
    <circle cx="248" cy="92" r="1.0" fill="#ddd6fe" opacity="0.85"/>
    <circle cx="252" cy="110" r="0.8" fill="#c4b5fd" opacity="0.7"/>
    <circle cx="236" cy="127" r="0.7" fill="#e9d5ff" opacity="0.75"/>
    <circle cx="178" cy="88" r="0.8" fill="#f3e8ff" opacity="0.8"/>
    <circle cx="205" cy="75" r="0.7" fill="#ddd6fe" opacity="0.7"/>
    <!-- Arm 1 upper arc particles -->
    <circle cx="130" cy="58" r="1.0" fill="#e9d5ff" opacity="0.85"/>
    <circle cx="138" cy="26" r="1.1" fill="#f3e8ff" opacity="0.9"/>
    <circle cx="170" cy="16" r="0.9" fill="#ddd6fe" opacity="0.8"/>
    <circle cx="178" cy="36" r="0.8" fill="#c4b5fd" opacity="0.75"/>
    <circle cx="166" cy="60" r="0.7" fill="#e9d5ff" opacity="0.7"/>
    <!-- Arm 2 particles -->
    <circle cx="112" cy="122" r="1.2" fill="#f3e8ff" opacity="0.9"/>
    <circle cx="78" cy="122" r="0.9" fill="#ddd6fe" opacity="0.8"/>
    <circle cx="54" cy="112" r="1.0" fill="#e9d5ff" opacity="0.85"/>
    <circle cx="50" cy="92" r="0.8" fill="#c4b5fd" opacity="0.7"/>
    <circle cx="62" cy="70" r="0.7" fill="#ddd6fe" opacity="0.75"/>
    <circle cx="98" cy="72" r="0.8" fill="#f3e8ff" opacity="0.8"/>
    <circle cx="80" cy="104" r="0.7" fill="#e9d5ff" opacity="0.7"/>
    <!-- Arm 2 lower arc particles -->
    <circle cx="168" cy="142" r="1.0" fill="#e9d5ff" opacity="0.85"/>
    <circle cx="158" cy="176" r="1.1" fill="#f3e8ff" opacity="0.9"/>
    <circle cx="128" cy="182" r="0.9" fill="#ddd6fe" opacity="0.8"/>
    <circle cx="120" cy="162" r="0.8" fill="#c4b5fd" opacity="0.75"/>
    <circle cx="132" cy="138" r="0.7" fill="#e9d5ff" opacity="0.7"/>
    <!-- Inner ring dust -->
    <circle cx="174" cy="90" r="0.9" fill="#f3e8ff" opacity="0.8"/>
    <circle cx="182" cy="104" r="0.8" fill="#e9d5ff" opacity="0.75"/>
    <circle cx="170" cy="116" r="0.7" fill="#ddd6fe" opacity="0.7"/>
    <circle cx="126" cy="110" r="0.9" fill="#f3e8ff" opacity="0.8"/>
    <circle cx="118" cy="96" r="0.8" fill="#e9d5ff" opacity="0.75"/>
    <circle cx="130" cy="84" r="0.7" fill="#ddd6fe" opacity="0.7"/>
  </g>

  <!-- Galaxy core background glow (large soft) -->
  <circle cx="150" cy="100" r="38" fill="url(#coreGlow)" filter="url(#coreBlur)" clip-path="url(#vbClip)"/>
  <!-- Galaxy core mid glow -->
  <circle cx="150" cy="100" r="22" fill="#9333ea" opacity="0.5" filter="url(#armBlur)" clip-path="url(#vbClip)"/>
  <!-- Galaxy core bright center -->
  <circle cx="150" cy="100" r="12" fill="#c084fc" opacity="0.75" filter="url(#dustGlow)" clip-path="url(#vbClip)"/>
  <!-- Core hot white center -->
  <circle cx="150" cy="100" r="5" fill="#f0e6ff" opacity="0.95" clip-path="url(#vbClip)"/>
  <circle cx="150" cy="100" r="2.5" fill="#ffffff" opacity="1" clip-path="url(#vbClip)"/>

  <!-- ALG text at core -->
  <text
    x="150" y="104"
    font-family="'Arial Black', 'Arial Bold', Arial, sans-serif"
    font-weight="900"
    font-size="13"
    letter-spacing="1.5"
    text-anchor="middle"
    fill="#ffffff"
    filter="url(#textGlow)"
    clip-path="url(#vbClip)"
  >ALG</text>

  <!-- Bottom label -->
  <text
    x="150" y="192"
    font-family="'Arial', sans-serif"
    font-weight="400"
    font-size="8.5"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="#a78bfa"
    opacity="0.75"
  >AGENTIC LEAD GEN</text>
</svg>` },
  { id: 24, title: "Handshake Deal", concept: "geometric hands with data connection", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="leftHandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F97316;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#EA580C;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="rightHandGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#F97316;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FCD34D;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F59E0B;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#FFFFFF"/>

  <!-- Subtle background arc suggestion -->
  <ellipse cx="150" cy="105" rx="110" ry="52" fill="none" stroke="#FEF3C7" stroke-width="28" opacity="0.5"/>

  <!-- ── LEFT HAND (pointing right / reaching) ── -->
  <!-- Palm block -->
  <rect x="28" y="90" width="44" height="38" rx="7" ry="7" fill="url(#leftHandGrad)"/>

  <!-- Index finger -->
  <rect x="52" y="66" width="11" height="30" rx="5" ry="5" fill="url(#leftHandGrad)"/>
  <!-- Middle finger -->
  <rect x="65" y="60" width="11" height="34" rx="5" ry="5" fill="url(#leftHandGrad)"/>
  <!-- Ring finger -->
  <rect x="65" y="94" width="11" height="32" rx="5" ry="5" fill="url(#leftHandGrad)"/>
  <!-- Pinky -->
  <rect x="52" y="100" width="10" height="26" rx="4" ry="4" fill="url(#leftHandGrad)"/>
  <!-- Thumb -->
  <rect x="18" y="96" width="18" height="11" rx="5" ry="5" fill="url(#leftHandGrad)"/>

  <!-- ── RIGHT HAND (mirror, pointing left / reaching) ── -->
  <!-- Palm block -->
  <rect x="228" y="90" width="44" height="38" rx="7" ry="7" fill="url(#rightHandGrad)"/>

  <!-- Index finger -->
  <rect x="237" y="66" width="11" height="30" rx="5" ry="5" fill="url(#rightHandGrad)"/>
  <!-- Middle finger -->
  <rect x="224" y="60" width="11" height="34" rx="5" ry="5" fill="url(#rightHandGrad)"/>
  <!-- Ring finger -->
  <rect x="224" y="94" width="11" height="32" rx="5" ry="5" fill="url(#rightHandGrad)"/>
  <!-- Pinky -->
  <rect x="238" y="100" width="10" height="26" rx="4" ry="4" fill="url(#rightHandGrad)"/>
  <!-- Thumb -->
  <rect x="264" y="96" width="18" height="11" rx="5" ry="5" fill="url(#rightHandGrad)"/>

  <!-- ── CIRCUIT / DATA CONNECTION between hands ── -->
  <!-- Main horizontal spine -->
  <line x1="76" y1="109" x2="224" y2="109" stroke="url(#circuitGrad)" stroke-width="2.5" filter="url(#glow)"/>

  <!-- Upper branch left -->
  <polyline points="100,109 100,88 122,88" fill="none" stroke="url(#circuitGrad)" stroke-width="2" filter="url(#glow)"/>
  <!-- Upper branch right -->
  <polyline points="200,109 200,88 178,88" fill="none" stroke="url(#circuitGrad)" stroke-width="2" filter="url(#glow)"/>
  <!-- Lower branch left -->
  <polyline points="112,109 112,130 134,130" fill="none" stroke="url(#circuitGrad)" stroke-width="2" filter="url(#glow)"/>
  <!-- Lower branch right -->
  <polyline points="188,109 188,130 166,130" fill="none" stroke="url(#circuitGrad)" stroke-width="2" filter="url(#glow)"/>
  <!-- Tiny cross-link top -->
  <line x1="122" y1="84" x2="178" y2="84" stroke="url(#circuitGrad)" stroke-width="1.5" stroke-dasharray="4,3" filter="url(#glow)"/>
  <!-- Tiny cross-link bottom -->
  <line x1="134" y1="134" x2="166" y2="134" stroke="url(#circuitGrad)" stroke-width="1.5" stroke-dasharray="4,3" filter="url(#glow)"/>

  <!-- Circuit nodes -->
  <circle cx="100" cy="109" r="3.5" fill="#F97316" filter="url(#glow)"/>
  <circle cx="200" cy="109" r="3.5" fill="#F59E0B" filter="url(#glow)"/>
  <circle cx="112" cy="109" r="3" fill="#FB923C" filter="url(#glow)"/>
  <circle cx="188" cy="109" r="3" fill="#FBBF24" filter="url(#glow)"/>
  <circle cx="100" cy="88" r="3" fill="#F97316" filter="url(#glow)"/>
  <circle cx="200" cy="88" r="3" fill="#F59E0B" filter="url(#glow)"/>
  <circle cx="112" cy="130" r="3" fill="#FB923C" filter="url(#glow)"/>
  <circle cx="188" cy="130" r="3" fill="#FBBF24" filter="url(#glow)"/>
  <circle cx="122" cy="88" r="2.5" fill="#FCD34D" filter="url(#glow)"/>
  <circle cx="178" cy="88" r="2.5" fill="#FCD34D" filter="url(#glow)"/>
  <circle cx="134" cy="130" r="2.5" fill="#FCD34D" filter="url(#glow)"/>
  <circle cx="166" cy="130" r="2.5" fill="#FCD34D" filter="url(#glow)"/>

  <!-- Central deal-close node (bright pulse) -->
  <circle cx="150" cy="109" r="9" fill="#FEF3C7" filter="url(#softglow)"/>
  <circle cx="150" cy="109" r="6" fill="#F97316" filter="url(#softglow)"/>
  <circle cx="150" cy="109" r="3" fill="#FFF7ED"/>

  <!-- Tick mark inside center node (deal closed) -->
  <polyline points="146,109 149,112 155,105" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- ── WORDMARK ── -->
  <text x="150" y="167" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#1C1917" text-anchor="middle" letter-spacing="1.5">AGENTIC LEAD GEN</text>
  <text x="150" y="182" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="7.5" font-weight="400" fill="#F97316" text-anchor="middle" letter-spacing="3">AI · B2B · CONNECTIONS</text>
</svg>` },
  { id: 25, title: "Chess Knight", concept: "strategic chess knight silhouette", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0f1e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0c040;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#d4a017;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b8860b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="knightGrad" x1="0%" y1="0%" x2="60%" y2="100%">
      <stop offset="0%" style="stop-color:#1e2d4a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1a2e;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadowDrop">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#d4a017" flood-opacity="0.35"/>
    </filter>
    <clipPath id="boardClip">
      <rect x="60" y="120" width="72" height="28" rx="2"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="10"/>

  <!-- Gold chessboard shadow under knight -->
  <g opacity="0.55" clip-path="url(#boardClip)">
    <!-- Row 1 -->
    <rect x="60" y="120" width="9" height="9" fill="#d4a017"/>
    <rect x="69" y="120" width="9" height="9" fill="#0a0f1e"/>
    <rect x="78" y="120" width="9" height="9" fill="#d4a017"/>
    <rect x="87" y="120" width="9" height="9" fill="#0a0f1e"/>
    <rect x="96" y="120" width="9" height="9" fill="#d4a017"/>
    <rect x="105" y="120" width="9" height="9" fill="#0a0f1e"/>
    <rect x="114" y="120" width="9" height="9" fill="#d4a017"/>
    <rect x="123" y="120" width="9" height="9" fill="#0a0f1e"/>
    <!-- Row 2 -->
    <rect x="60" y="129" width="9" height="9" fill="#0a0f1e"/>
    <rect x="69" y="129" width="9" height="9" fill="#d4a017"/>
    <rect x="78" y="129" width="9" height="9" fill="#0a0f1e"/>
    <rect x="87" y="129" width="9" height="9" fill="#d4a017"/>
    <rect x="96" y="129" width="9" height="9" fill="#0a0f1e"/>
    <rect x="105" y="129" width="9" height="9" fill="#d4a017"/>
    <rect x="114" y="129" width="9" height="9" fill="#0a0f1e"/>
    <rect x="123" y="129" width="9" height="9" fill="#d4a017"/>
    <!-- Row 3 -->
    <rect x="60" y="138" width="9" height="9" fill="#d4a017"/>
    <rect x="69" y="138" width="9" height="9" fill="#0a0f1e"/>
    <rect x="78" y="138" width="9" height="9" fill="#d4a017"/>
    <rect x="87" y="138" width="9" height="9" fill="#0a0f1e"/>
    <rect x="96" y="138" width="9" height="9" fill="#d4a017"/>
    <rect x="105" y="138" width="9" height="9" fill="#0a0f1e"/>
    <rect x="114" y="138" width="9" height="9" fill="#d4a017"/>
    <rect x="123" y="138" width="9" height="9" fill="#0a0f1e"/>
  </g>
  <!-- Board border -->
  <rect x="60" y="120" width="72" height="28" rx="2" fill="none" stroke="#d4a017" stroke-width="0.8" opacity="0.7"/>

  <!-- Chess Knight Silhouette (geometric, minimalist) -->
  <g filter="url(#shadowDrop)">
    <path d="
      M 76 148
      L 72 148
      L 71 145
      L 75 145
      L 75 143
      L 70 143
      L 70 141
      L 74 141
      L 74 136
      L 72 132
      L 70 128
      L 70 123
      L 72 118
      L 76 113
      L 81 110
      L 88 108
      L 93 109
      L 96 112
      L 95 116
      L 91 118
      L 93 119
      L 95 122
      L 94 126
      L 91 129
      L 90 133
      L 91 137
      L 91 141
      L 95 141
      L 95 143
      L 90 143
      L 90 145
      L 95 145
      L 94 148
      Z
    " fill="url(#knightGrad)" stroke="#2a3f5f" stroke-width="0.6"/>

    <!-- Eye -->
    <circle cx="88" cy="114" r="2" fill="#d4a017" opacity="0.9"/>

    <!-- Mane detail lines -->
    <line x1="78" y1="118" x2="82" y2="114" stroke="#2a4a6e" stroke-width="1" opacity="0.6"/>
    <line x1="76" y1="123" x2="81" y2="119" stroke="#2a4a6e" stroke-width="1" opacity="0.6"/>
    <line x1="76" y1="128" x2="79" y2="124" stroke="#2a4a6e" stroke-width="0.8" opacity="0.5"/>

    <!-- Knight highlight edge -->
    <path d="
      M 81 110
      L 88 108
      L 93 109
      L 96 112
      L 95 116
      L 91 118
      L 93 119
      L 95 122
    " fill="none" stroke="#4a6fa0" stroke-width="0.7" opacity="0.5"/>
  </g>

  <!-- Gold accent line under board -->
  <line x1="60" y1="149" x2="132" y2="149" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.8"/>

  <!-- Wordmark -->
  <text x="148" y="104" font-family="'Georgia', 'Times New Roman', serif" font-size="20" font-weight="700" letter-spacing="0.5" fill="#f0f4ff">Agentic</text>
  <text x="148" y="126" font-family="'Georgia', 'Times New Roman', serif" font-size="20" font-weight="700" letter-spacing="0.5" fill="#d4a017">Lead Gen</text>

  <!-- Tagline -->
  <text x="148" y="143" font-family="'Helvetica Neue', 'Arial', sans-serif" font-size="8" letter-spacing="2.5" fill="#6a85a8" text-anchor="start">STRATEGIC INTELLIGENCE</text>

  <!-- Gold accent line under tagline -->
  <line x1="148" y1="150" x2="270" y2="150" stroke="url(#goldGrad)" stroke-width="1" opacity="0.5"/>

  <!-- Small decorative knight-move path dots (top right) -->
  <g opacity="0.25" filter="url(#glow)">
    <circle cx="248" cy="52" r="2.5" fill="#d4a017"/>
    <circle cx="260" cy="44" r="2.5" fill="#d4a017"/>
    <circle cx="272" cy="52" r="2" fill="#d4a017"/>
    <line x1="248" y1="52" x2="260" y2="44" stroke="#d4a017" stroke-width="0.8" stroke-dasharray="2,2"/>
    <line x1="260" y1="44" x2="272" y2="52" stroke="#d4a017" stroke-width="0.8" stroke-dasharray="2,2"/>
  </g>

  <!-- Outer border accent -->
  <rect x="1" y="1" width="298" height="198" rx="10" fill="none" stroke="#1e2d4a" stroke-width="1.5"/>
  <rect x="3" y="3" width="294" height="194" rx="8.5" fill="none" stroke="#d4a017" stroke-width="0.4" opacity="0.3"/>
</svg>` },
  { id: 26, title: "Keyhole Unlock", concept: "keyhole with glowing network interior", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#050d18"/>
    </radialGradient>

    <!-- Keyhole fill gradient - dark to emerald -->
    <radialGradient id="keyholeGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="0.15"/>
      <stop offset="40%" stop-color="#00c96a" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#003d1f" stop-opacity="0.95"/>
    </radialGradient>

    <!-- Glow gradient for network nodes -->
    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ff88"/>
      <stop offset="60%" stop-color="#00c96a"/>
      <stop offset="100%" stop-color="#00c96a" stop-opacity="0"/>
    </radialGradient>

    <!-- Emerald glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Strong glow for key elements -->
    <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Soft glow for network -->
    <filter id="netGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Clip path for the keyhole shape -->
    <clipPath id="keyholeClip">
      <!-- Circle top -->
      <circle cx="110" cy="85" r="28"/>
      <!-- Trapezoid bottom -->
      <polygon points="96,108 124,108 131,148 89,148"/>
    </clipPath>

    <!-- Outer keyhole clip (slightly larger for glow ring) -->
    <clipPath id="keyholeOuterClip">
      <circle cx="110" cy="85" r="31"/>
      <polygon points="93,110 127,110 135,151 85,151"/>
    </clipPath>

    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4dffa0"/>
      <stop offset="50%" stop-color="#00ff88"/>
      <stop offset="100%" stop-color="#00c96a"/>
    </linearGradient>

    <!-- Subtle line gradient -->
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#00c96a" stop-opacity="0.1"/>
    </linearGradient>

    <!-- Node pulse gradient -->
    <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00ff88" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="12"/>

  <!-- Subtle grid lines in background -->
  <g opacity="0.04" stroke="#00ff88" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ===== KEYHOLE SHAPE ===== -->
  <!-- Outer glow ring around keyhole -->
  <g filter="url(#strongGlow)" opacity="0.5">
    <!-- Circle glow -->
    <circle cx="110" cy="85" r="31" fill="none" stroke="#00ff88" stroke-width="2"/>
    <!-- Stem glow -->
    <polygon points="93,110 127,110 135,151 85,151" fill="none" stroke="#00ff88" stroke-width="2"/>
  </g>

  <!-- Keyhole background fill -->
  <g>
    <!-- Circle -->
    <circle cx="110" cy="85" r="28" fill="#010f08"/>
    <!-- Trapezoid stem -->
    <polygon points="96,108 124,108 131,148 89,148" fill="#010f08"/>
  </g>

  <!-- Network inside keyhole (clipped) -->
  <g clip-path="url(#keyholeClip)">
    <!-- Base fill glow -->
    <rect x="80" y="55" width="65" height="100" fill="url(#keyholeGrad)"/>

    <!-- Network lines - web of connections -->
    <g filter="url(#netGlow)" stroke="#00ff88" stroke-width="0.8" fill="none">
      <!-- Lines from center node at 110,95 -->
      <line x1="110" y1="95" x2="98" y2="75" stroke-opacity="0.7"/>
      <line x1="110" y1="95" x2="123" y2="78" stroke-opacity="0.7"/>
      <line x1="110" y1="95" x2="88" y2="90" stroke-opacity="0.5"/>
      <line x1="110" y1="95" x2="130" y2="94" stroke-opacity="0.5"/>
      <line x1="110" y1="95" x2="102" y2="112" stroke-opacity="0.6"/>
      <line x1="110" y1="95" x2="120" y2="118" stroke-opacity="0.6"/>
      <line x1="110" y1="95" x2="110" y2="130" stroke-opacity="0.4"/>
      <!-- Cross connections -->
      <line x1="98" y1="75" x2="123" y2="78" stroke-opacity="0.35"/>
      <line x1="98" y1="75" x2="88" y2="90" stroke-opacity="0.35"/>
      <line x1="123" y1="78" x2="130" y2="94" stroke-opacity="0.35"/>
      <line x1="88" y1="90" x2="102" y2="112" stroke-opacity="0.3"/>
      <line x1="130" y1="94" x2="120" y2="118" stroke-opacity="0.3"/>
      <line x1="102" y1="112" x2="110" y2="130" stroke-opacity="0.3"/>
      <line x1="120" y1="118" x2="110" y2="130" stroke-opacity="0.3"/>
      <!-- Outer ring connections -->
      <line x1="110" y1="60" x2="98" y2="75" stroke-opacity="0.4"/>
      <line x1="110" y1="60" x2="123" y2="78" stroke-opacity="0.4"/>
      <line x1="95" y1="135" x2="102" y2="112" stroke-opacity="0.35"/>
      <line x1="125" y1="135" x2="120" y2="118" stroke-opacity="0.35"/>
    </g>

    <!-- Network nodes -->
    <g filter="url(#glow)">
      <!-- Center node - brightest -->
      <circle cx="110" cy="95" r="3" fill="#00ff88"/>
      <!-- Pulse ring -->
      <circle cx="110" cy="95" r="7" fill="none" stroke="#00ff88" stroke-width="0.8" stroke-opacity="0.4"/>

      <!-- Satellite nodes -->
      <circle cx="98" cy="75" r="2.2" fill="#00ff88" opacity="0.9"/>
      <circle cx="123" cy="78" r="2.2" fill="#00ff88" opacity="0.9"/>
      <circle cx="88" cy="90" r="1.8" fill="#00c96a" opacity="0.7"/>
      <circle cx="130" cy="94" r="1.8" fill="#00c96a" opacity="0.7"/>
      <circle cx="102" cy="112" r="2" fill="#00ff88" opacity="0.8"/>
      <circle cx="120" cy="118" r="2" fill="#00ff88" opacity="0.8"/>
      <circle cx="110" cy="130" r="1.8" fill="#00c96a" opacity="0.7"/>
      <circle cx="110" cy="60" r="1.8" fill="#00c96a" opacity="0.6"/>
      <circle cx="95" cy="135" r="1.5" fill="#00c96a" opacity="0.5"/>
      <circle cx="125" cy="135" r="1.5" fill="#00c96a" opacity="0.5"/>
    </g>
  </g>

  <!-- Keyhole border (drawn on top) -->
  <g filter="url(#glow)" fill="none" stroke="#00ff88" stroke-width="1.5">
    <!-- Circle border -->
    <circle cx="110" cy="85" r="28" stroke-opacity="0.9"/>
    <!-- Stem border lines (sides and bottom) -->
    <line x1="96" y1="108" x2="89" y2="148" stroke-opacity="0.9"/>
    <line x1="124" y1="108" x2="131" y2="148" stroke-opacity="0.9"/>
    <line x1="89" y1="148" x2="131" y2="148" stroke-opacity="0.9"/>
  </g>

  <!-- Lock body (surrounding the keyhole) -->
  <g fill="none" stroke="#00c96a" stroke-width="1.2" stroke-opacity="0.3">
    <!-- Shackle arc suggestion - subtle -->
    <path d="M 93 80 Q 93 60 110 60 Q 127 60 127 80" stroke-opacity="0.2"/>
  </g>

  <!-- Small dot accent at top of circle -->
  <circle cx="110" cy="57" r="2.5" fill="#00ff88" opacity="0.6" filter="url(#glow)"/>

  <!-- ===== RIGHT SIDE DECORATIVE NETWORK ===== -->
  <!-- Ambient network dots (outside keyhole, right side) -->
  <g opacity="0.25" filter="url(#netGlow)">
    <circle cx="175" cy="72" r="2" fill="#00ff88"/>
    <circle cx="200" cy="58" r="1.5" fill="#00c96a"/>
    <circle cx="225" cy="80" r="2" fill="#00ff88"/>
    <circle cx="248" cy="65" r="1.5" fill="#00c96a"/>
    <circle cx="265" cy="88" r="1.8" fill="#00ff88"/>
    <circle cx="185" cy="100" r="1.5" fill="#00c96a"/>
    <circle cx="215" cy="105" r="2" fill="#00ff88"/>
    <circle cx="240" cy="98" r="1.5" fill="#00c96a"/>
    <circle cx="258" cy="115" r="1.8" fill="#00ff88"/>
    <circle cx="275" cy="72" r="1.5" fill="#00c96a"/>
    <!-- Connection lines -->
    <line x1="175" y1="72" x2="200" y2="58" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.5"/>
    <line x1="200" y1="58" x2="225" y2="80" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.5"/>
    <line x1="225" y1="80" x2="248" y2="65" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.4"/>
    <line x1="248" y1="65" x2="265" y2="88" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.4"/>
    <line x1="265" y1="88" x2="258" y2="115" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.4"/>
    <line x1="215" y1="105" x2="240" y2="98" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.4"/>
    <line x1="185" y1="100" x2="215" y2="105" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.4"/>
    <line x1="175" y1="72" x2="185" y2="100" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.35"/>
    <line x1="248" y1="65" x2="275" y2="72" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.35"/>
    <line x1="225" y1="80" x2="215" y2="105" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.3"/>
    <line x1="240" y1="98" x2="258" y2="115" stroke="#00ff88" stroke-width="0.6" stroke-opacity="0.3"/>
  </g>

  <!-- ===== TEXT ===== -->
  <!-- Main title -->
  <text
    x="162"
    y="100"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="20"
    font-weight="700"
    letter-spacing="0.5"
    fill="url(#textGrad)"
    filter="url(#glow)"
  >Agentic</text>

  <text
    x="162"
    y="122"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="20"
    font-weight="700"
    letter-spacing="0.5"
    fill="url(#textGrad)"
    filter="url(#glow)"
  >Lead Gen</text>

  <!-- Subtitle / tagline -->
  <text
    x="162"
    y="140"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="8.5"
    font-weight="400"
    letter-spacing="2.5"
    fill="#00c96a"
    opacity="0.65"
    text-transform="uppercase"
  >UNLOCK OPPORTUNITIES</text>

  <!-- Separator line -->
  <line x1="162" y1="108" x2="288" y2="108" stroke="url(#lineGrad)" stroke-width="0.8"/>

  <!-- Bottom accent bar -->
  <rect x="0" y="196" width="300" height="4" rx="0" fill="url(#textGrad)" opacity="0.4"/>

  <!-- Corner accent dots -->
  <circle cx="14" cy="14" r="2" fill="#00ff88" opacity="0.3"/>
  <circle cx="286" cy="14" r="2" fill="#00ff88" opacity="0.3"/>
  <circle cx="14" cy="186" r="2" fill="#00ff88" opacity="0.3"/>
  <circle cx="286" cy="186" r="2" fill="#00ff88" opacity="0.3"/>

  <!-- Border -->
  <rect width="300" height="200" fill="none" stroke="#00c96a" stroke-width="0.8" stroke-opacity="0.2" rx="12"/>
</svg>` },
  { id: 27, title: "Fish Hook", concept: "hook line transforming into data streams", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Ocean blue gradient background -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1628;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d2d5e;stop-opacity:1" />
    </linearGradient>
    <!-- Hook gradient -->
    <linearGradient id="hookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#38bdf8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:1" />
    </linearGradient>
    <!-- Data stream gradient -->
    <linearGradient id="streamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#7dd3fc;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#38bdf8;stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:0.2" />
    </linearGradient>
    <!-- Fish body gradient -->
    <linearGradient id="fishGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#34d399;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="fishGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="fishGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
    </linearGradient>
    <!-- Glow filter -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Soft glow for hook -->
    <filter id="hookGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Drop shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0ea5e9" flood-opacity="0.4"/>
    </filter>
    <!-- Clip for data bits inside hook area -->
    <clipPath id="streamClip">
      <rect x="60" y="10" width="90" height="130"/>
    </clipPath>
  </defs>

  <!-- Background rounded rect -->
  <rect width="300" height="200" rx="16" ry="16" fill="url(#bgGrad)"/>

  <!-- Subtle grid lines (data aesthetic) -->
  <g opacity="0.07" stroke="#38bdf8" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ============ FISHING LINE as DATA STREAM ============ -->
  <!-- Main fishing line — vertical, transforming into dotted data stream -->
  <line x1="105" y1="18" x2="105" y2="38" stroke="url(#streamGrad)" stroke-width="2.5" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Data stream dots along the line -->
  <g fill="#7dd3fc" filter="url(#glow)">
    <circle cx="105" cy="44" r="2"/>
    <circle cx="105" cy="52" r="1.5" opacity="0.8"/>
    <circle cx="105" cy="59" r="2"/>
    <circle cx="105" cy="67" r="1.5" opacity="0.7"/>
    <circle cx="105" cy="74" r="2"/>
  </g>
  <!-- Tiny bit labels on stream -->
  <g fill="#38bdf8" font-family="'Courier New', monospace" font-size="5" opacity="0.6">
    <text x="109" y="46">01</text>
    <text x="109" y="54">10</text>
    <text x="109" y="62">11</text>
    <text x="109" y="70">00</text>
  </g>

  <!-- ============ FISHING HOOK ============ -->
  <!-- Hook body: a stylized J-shape -->
  <!-- Vertical shaft of hook -->
  <line x1="105" y1="76" x2="105" y2="118" stroke="url(#hookGrad)" stroke-width="4" stroke-linecap="round" filter="url(#hookGlow)"/>
  <!-- Hook curve (bottom of J) -->
  <path d="M105,118 Q105,142 90,142 Q72,142 72,125 Q72,112 84,110" fill="none" stroke="url(#hookGrad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#hookGlow)"/>
  <!-- Hook barb (the sharp inner point) -->
  <path d="M84,110 L78,118" stroke="url(#hookGrad)" stroke-width="3" stroke-linecap="round" filter="url(#hookGlow)"/>
  <!-- Hook tip circle (eye/top of hook) -->
  <circle cx="105" cy="22" r="7" fill="none" stroke="#38bdf8" stroke-width="2.5" filter="url(#hookGlow)"/>
  <circle cx="105" cy="22" r="3" fill="#38bdf8" opacity="0.8"/>

  <!-- ============ FISH 1 — caught on hook (green, main) ============ -->
  <g transform="translate(78, 120) rotate(-15)" filter="url(#shadow)">
    <!-- Fish body -->
    <ellipse cx="0" cy="0" rx="20" ry="9" fill="url(#fishGrad1)"/>
    <!-- Fish tail -->
    <polygon points="-20,0 -30,-8 -30,8" fill="#10b981" opacity="0.9"/>
    <!-- Fish eye -->
    <circle cx="12" cy="-2" r="3" fill="white"/>
    <circle cx="13" cy="-2" r="1.5" fill="#065f46"/>
    <!-- Fin -->
    <path d="M0,-9 Q4,-16 10,-9" fill="#34d399" opacity="0.7"/>
    <!-- Highlight -->
    <ellipse cx="4" cy="-3" rx="5" ry="2.5" fill="white" opacity="0.2"/>
  </g>

  <!-- ============ FISH 2 — nearby (purple, smaller) ============ -->
  <g transform="translate(52, 95) rotate(10)" filter="url(#shadow)" opacity="0.9">
    <ellipse cx="0" cy="0" rx="14" ry="6" fill="url(#fishGrad2)"/>
    <polygon points="-14,0 -21,-6 -21,6" fill="#7c3aed" opacity="0.85"/>
    <circle cx="8" cy="-1" r="2" fill="white"/>
    <circle cx="9" cy="-1" r="1" fill="#3b0764"/>
    <path d="M0,-6 Q3,-11 7,-6" fill="#a78bfa" opacity="0.7"/>
    <ellipse cx="2" cy="-2" rx="3" ry="1.5" fill="white" opacity="0.2"/>
  </g>

  <!-- ============ FISH 3 — swimming toward (yellow, farther) ============ -->
  <g transform="translate(48, 140) rotate(5)" filter="url(#shadow)" opacity="0.8">
    <ellipse cx="0" cy="0" rx="12" ry="5" fill="url(#fishGrad3)"/>
    <polygon points="-12,0 -19,-5 -19,5" fill="#f59e0b" opacity="0.85"/>
    <circle cx="7" cy="-1" r="1.8" fill="white"/>
    <circle cx="8" cy="-1" r="0.9" fill="#78350f"/>
    <ellipse cx="2" cy="-1.5" rx="2.5" ry="1.2" fill="white" opacity="0.2"/>
  </g>

  <!-- ============ AMBIENT DATA PARTICLES ============ -->
  <g fill="#38bdf8" opacity="0.5">
    <circle cx="140" cy="55" r="1.5"/>
    <circle cx="148" cy="48" r="1"/>
    <circle cx="135" cy="45" r="1"/>
    <circle cx="153" cy="60" r="1.5"/>
    <circle cx="144" cy="70" r="1"/>
    <circle cx="30" cy="75" r="1.5"/>
    <circle cx="38" cy="65" r="1"/>
    <circle cx="22" cy="85" r="1.5"/>
    <circle cx="35" cy="90" r="1"/>
  </g>
  <!-- Hex data nodes -->
  <g stroke="#0ea5e9" stroke-width="1" fill="none" opacity="0.4">
    <polygon points="145,30 149,23 157,23 161,30 157,37 149,37"/>
    <polygon points="28,55 32,48 40,48 44,55 40,62 32,62"/>
  </g>
  <text x="147" y="34" font-family="'Courier New', monospace" font-size="5" fill="#7dd3fc" opacity="0.7" text-anchor="middle">AI</text>
  <text x="36" y="59" font-family="'Courier New', monospace" font-size="5" fill="#7dd3fc" opacity="0.7" text-anchor="middle">ML</text>

  <!-- ============ WATER SURFACE (subtle wavy line) ============ -->
  <path d="M20,155 Q45,148 70,155 Q95,162 120,155 Q145,148 170,155 Q195,162 220,155 Q245,148 270,155 Q285,159 300,155" fill="none" stroke="#1e40af" stroke-width="1" opacity="0.4"/>
  <path d="M20,160 Q50,153 80,160 Q110,167 140,160 Q170,153 200,160 Q230,167 260,160 Q280,155 300,160" fill="none" stroke="#1e40af" stroke-width="0.8" opacity="0.25"/>

  <!-- ============ TYPOGRAPHY ============ -->
  <!-- "Agentic" primary -->
  <text x="168" y="98" font-family="'Segoe UI', Arial, sans-serif" font-size="22" font-weight="700" fill="#f0f9ff" letter-spacing="-0.5" filter="url(#glow)">Agentic</text>
  <!-- "Lead Gen" secondary -->
  <text x="168" y="122" font-family="'Segoe UI', Arial, sans-serif" font-size="17" font-weight="400" fill="#7dd3fc" letter-spacing="1">Lead Gen</text>
  <!-- Tagline -->
  <text x="168" y="140" font-family="'Segoe UI', Arial, sans-serif" font-size="8.5" font-weight="300" fill="#38bdf8" letter-spacing="2" opacity="0.75">CATCH · ENRICH · CONVERT</text>

  <!-- Separator line between brand name and tagline -->
  <line x1="168" y1="128" x2="290" y2="128" stroke="#1e40af" stroke-width="0.8" opacity="0.6"/>

  <!-- ============ DECORATIVE: mini data bar chart (bottom right) ============ -->
  <g transform="translate(176, 155)" opacity="0.55">
    <rect x="0" y="12" width="7" height="8" rx="1" fill="#0ea5e9"/>
    <rect x="10" y="8" width="7" height="12" rx="1" fill="#38bdf8"/>
    <rect x="20" y="4" width="7" height="16" rx="1" fill="#7dd3fc"/>
    <rect x="30" y="9" width="7" height="11" rx="1" fill="#38bdf8"/>
    <rect x="40" y="2" width="7" height="18" rx="1" fill="#bae6fd"/>
    <!-- Up arrow trend -->
    <polyline points="0,22 12,18 22,14 32,15 44,8" fill="none" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="44" cy="8" r="2" fill="#34d399"/>
  </g>
</svg>` },
  { id: 28, title: "Mountain Peak", concept: "geometric mountain as uptrend chart", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e1b4b;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#4338ca;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f97316;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e2e8f0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#94a3b8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mountainDark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#475569;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#64748b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="trendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#fb923c;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="bgClip">
      <rect width="300" height="200" rx="12"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" rx="12" fill="url(#skyGrad)"/>

  <!-- Stars -->
  <g opacity="0.6">
    <circle cx="30" cy="20" r="1" fill="white"/>
    <circle cx="60" cy="12" r="0.8" fill="white"/>
    <circle cx="90" cy="25" r="1" fill="white"/>
    <circle cx="45" cy="35" r="0.6" fill="white"/>
    <circle cx="120" cy="15" r="0.8" fill="white"/>
    <circle cx="20" cy="45" r="0.7" fill="white"/>
    <circle cx="75" cy="40" r="0.5" fill="white"/>
  </g>

  <!-- Background mountain (left, distant) -->
  <polygon points="30,140 85,70 140,140" fill="#312e81" opacity="0.5"/>

  <!-- Background mountain (right, distant) -->
  <polygon points="160,140 220,75 270,140" fill="#312e81" opacity="0.4"/>

  <!-- Main mountain left face -->
  <polygon points="55,155 150,42 245,155" fill="url(#mountainGrad)"/>

  <!-- Main mountain right face (shadow) -->
  <polygon points="150,42 245,155 200,155" fill="url(#mountainDark)"/>

  <!-- Snow cap -->
  <polygon points="150,42 135,72 165,72" fill="white" opacity="0.95"/>
  <polygon points="150,42 138,65 162,65" fill="white"/>

  <!-- Ground / base -->
  <rect x="0" y="155" width="300" height="45" fill="#1e1b4b" opacity="0.7"/>
  <rect x="0" y="165" width="300" height="35" fill="#0f0e2a" opacity="0.5"/>

  <!-- Data trend line (forms the peak route) -->
  <!-- Bar chart dots at base -->
  <g filter="url(#glow)">
    <!-- Trend line going up to summit -->
    <polyline
      points="68,148 85,138 100,130 115,118 128,105 140,88 150,42"
      fill="none"
      stroke="url(#trendGrad)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Data points on trend line -->
    <circle cx="68" cy="148" r="3" fill="#fb923c"/>
    <circle cx="85" cy="138" r="3" fill="#fb923c"/>
    <circle cx="100" cy="130" r="3" fill="#fb923c"/>
    <circle cx="115" cy="118" r="3" fill="#fbbf24"/>
    <circle cx="128" cy="105" r="3" fill="#fbbf24"/>
    <circle cx="140" cy="88" r="3" fill="#fbbf24"/>

    <!-- Summit star/peak marker -->
    <circle cx="150" cy="42" r="5" fill="#fbbf24" filter="url(#softGlow)"/>
    <circle cx="150" cy="42" r="3" fill="white"/>
  </g>

  <!-- Upward arrow at summit -->
  <g filter="url(#glow)" transform="translate(150, 28)">
    <polyline points="-5,8 0,2 5,8" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="0" y1="2" x2="0" y2="12" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
  </g>

  <!-- Logo text -->
  <text
    x="150"
    y="178"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="15"
    font-weight="700"
    fill="white"
    text-anchor="middle"
    letter-spacing="1"
    opacity="0.95"
  >AGENTIC LEAD GEN</text>

  <text
    x="150"
    y="193"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="7"
    font-weight="400"
    fill="#a5b4fc"
    text-anchor="middle"
    letter-spacing="2"
    opacity="0.8"
  >REACH THE SUMMIT</text>

  <!-- Subtle horizon glow -->
  <ellipse cx="150" cy="155" rx="100" ry="8" fill="#f97316" opacity="0.15"/>
</svg>` },
  { id: 29, title: "Fractal Tree", concept: "recursive fractal tree as lead scaling", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="treeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a5c38;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#2d8a57;stop-opacity:1" />
      <stop offset="75%" style="stop-color:#3dbf7a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7eecc4;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mintGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2d8a57;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a8f0d8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7eecc4;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#3dbf7a;stop-opacity:0.6" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Subtle background glow -->
  <ellipse cx="105" cy="95" rx="60" ry="70" fill="#e8faf3" opacity="0.6"/>

  <!-- === FRACTAL TREE === -->
  <!-- Trunk -->
  <line x1="105" y1="175" x2="105" y2="140" stroke="url(#treeGrad)" stroke-width="4.5" stroke-linecap="round"/>

  <!-- Level 1 branches -->
  <!-- Left L1 -->
  <line x1="105" y1="140" x2="82" y2="115" stroke="url(#treeGrad)" stroke-width="3.2" stroke-linecap="round"/>
  <!-- Right L1 -->
  <line x1="105" y1="140" x2="128" y2="113" stroke="url(#treeGrad)" stroke-width="3.2" stroke-linecap="round"/>

  <!-- Level 2 branches — Left subtree -->
  <line x1="82" y1="115" x2="65" y2="95" stroke="url(#treeGrad)" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="82" y1="115" x2="93" y2="92" stroke="url(#treeGrad)" stroke-width="2.2" stroke-linecap="round"/>

  <!-- Level 2 branches — Right subtree -->
  <line x1="128" y1="113" x2="117" y2="91" stroke="url(#treeGrad)" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="128" y1="113" x2="143" y2="91" stroke="url(#treeGrad)" stroke-width="2.2" stroke-linecap="round"/>

  <!-- Level 3 branches — Left-Left -->
  <line x1="65" y1="95" x2="55" y2="80" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="65" y1="95" x2="71" y2="78" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Level 3 branches — Left-Right -->
  <line x1="93" y1="92" x2="85" y2="77" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="93" y1="92" x2="99" y2="76" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Level 3 branches — Right-Left -->
  <line x1="117" y1="91" x2="109" y2="76" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="117" y1="91" x2="122" y2="75" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Level 3 branches — Right-Right -->
  <line x1="143" y1="91" x2="137" y2="76" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="143" y1="91" x2="151" y2="77" stroke="url(#mintGrad)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Level 4 micro branches — far left -->
  <line x1="55" y1="80" x2="49" y2="70" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="55" y1="80" x2="57" y2="69" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="71" y1="78" x2="67" y2="67" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="71" y1="78" x2="75" y2="66" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>

  <!-- Level 4 micro branches — center-left -->
  <line x1="85" y1="77" x2="80" y2="67" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="85" y1="77" x2="87" y2="66" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="99" y1="76" x2="95" y2="65" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="99" y1="76" x2="102" y2="65" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>

  <!-- Level 4 micro branches — center-right -->
  <line x1="109" y1="76" x2="105" y2="65" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="109" y1="76" x2="111" y2="64" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="122" y1="75" x2="118" y2="64" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="122" y1="75" x2="125" y2="63" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>

  <!-- Level 4 micro branches — far right -->
  <line x1="137" y1="76" x2="133" y2="65" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="137" y1="76" x2="139" y2="64" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="151" y1="77" x2="147" y2="66" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>
  <line x1="151" y1="77" x2="155" y2="65" stroke="#7eecc4" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>

  <!-- Leaf dots — level 4 tips (mint glow) -->
  <g filter="url(#glow)">
    <circle cx="49" cy="69" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="57" cy="68" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="67" cy="66" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="75" cy="65" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="80" cy="66" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="87" cy="65" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="95" cy="64" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="102" cy="64" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="105" cy="64" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="111" cy="63" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="118" cy="63" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="125" cy="62" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="133" cy="64" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="139" cy="63" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="147" cy="65" r="2.2" fill="#a8f0d8" opacity="0.95"/>
    <circle cx="155" cy="64" r="2.2" fill="#a8f0d8" opacity="0.95"/>
  </g>

  <!-- Root dot -->
  <circle cx="105" cy="175" r="3.5" fill="#1a5c38" opacity="0.9"/>

  <!-- Branch junction dots -->
  <circle cx="105" cy="140" r="2.8" fill="#2d8a57" opacity="0.85"/>
  <circle cx="82" cy="115" r="2.2" fill="#3dbf7a" opacity="0.8"/>
  <circle cx="128" cy="113" r="2.2" fill="#3dbf7a" opacity="0.8"/>

  <!-- === TEXT === -->
  <!-- Main wordmark -->
  <text x="175" y="108" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="-0.3" fill="#1a3d2b">Agentic</text>
  <text x="175" y="128" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="-0.3" fill="#2d8a57">Lead Gen</text>

  <!-- Tagline -->
  <text x="175" y="145" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="7" font-weight="400" letter-spacing="1.8" fill="#5aaa80" opacity="0.85">SCALE · BRANCH · GROW</text>

  <!-- Decorative accent line -->
  <line x1="175" y1="135" x2="268" y2="135" stroke="url(#mintGrad)" stroke-width="1" opacity="0.4"/>

  <!-- Small fractal echo (decorative, top-right corner) -->
  <g opacity="0.18" transform="translate(255, 30) scale(0.45)">
    <line x1="20" y1="60" x2="20" y2="40" stroke="#2d8a57" stroke-width="4" stroke-linecap="round"/>
    <line x1="20" y1="40" x2="8" y2="25" stroke="#2d8a57" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="20" y1="40" x2="32" y2="25" stroke="#2d8a57" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="8" y1="25" x2="2" y2="13" stroke="#3dbf7a" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="25" x2="14" y2="12" stroke="#3dbf7a" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="32" y1="25" x2="26" y2="12" stroke="#3dbf7a" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="32" y1="25" x2="38" y2="13" stroke="#3dbf7a" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>` },
  { id: 30, title: "Globe Network", concept: "globe with network connection points", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#030810"/>
    </radialGradient>

    <!-- Globe fill gradient -->
    <radialGradient id="globeGrad" cx="38%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#0d4a7a"/>
      <stop offset="40%" stop-color="#062d55"/>
      <stop offset="100%" stop-color="#020f1e"/>
    </radialGradient>

    <!-- Globe glow -->
    <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="transparent"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.12"/>
    </radialGradient>

    <!-- Node glow filter -->
    <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Soft glow filter for globe edge -->
    <filter id="globeEdgeGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Text glow -->
    <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip path for globe -->
    <clipPath id="globeClip">
      <circle cx="100" cy="100" r="72"/>
    </clipPath>

    <!-- Connection line gradient -->
    <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0088ff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Pulse animation gradient -->
    <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#00aaff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0055ff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle star field -->
  <g opacity="0.4">
    <circle cx="20" cy="15" r="0.6" fill="#ffffff"/>
    <circle cx="45" cy="8" r="0.4" fill="#ffffff"/>
    <circle cx="70" cy="22" r="0.5" fill="#8dd8ff"/>
    <circle cx="220" cy="12" r="0.6" fill="#ffffff"/>
    <circle cx="248" cy="25" r="0.4" fill="#ffffff"/>
    <circle cx="270" cy="10" r="0.5" fill="#8dd8ff"/>
    <circle cx="285" cy="40" r="0.4" fill="#ffffff"/>
    <circle cx="15" cy="55" r="0.5" fill="#ffffff"/>
    <circle cx="35" cy="75" r="0.3" fill="#8dd8ff"/>
    <circle cx="260" cy="170" r="0.5" fill="#ffffff"/>
    <circle cx="280" cy="155" r="0.4" fill="#ffffff"/>
    <circle cx="25" cy="170" r="0.4" fill="#8dd8ff"/>
    <circle cx="50" cy="185" r="0.5" fill="#ffffff"/>
    <circle cx="240" cy="190" r="0.4" fill="#ffffff"/>
  </g>

  <!-- Globe outer glow ring -->
  <circle cx="100" cy="100" r="78" fill="none" stroke="#00d4ff" stroke-width="1" opacity="0.08"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.05"/>

  <!-- Globe base -->
  <circle cx="100" cy="100" r="72" fill="url(#globeGrad)"/>

  <!-- Globe edge glow overlay -->
  <circle cx="100" cy="100" r="72" fill="url(#globeGlow)"/>

  <!-- Globe border with glow -->
  <circle cx="100" cy="100" r="72" fill="none" stroke="#00d4ff" stroke-width="1.2" opacity="0.7" filter="url(#globeEdgeGlow)"/>
  <circle cx="100" cy="100" r="72" fill="none" stroke="#00d4ff" stroke-width="0.6" opacity="0.9"/>

  <!-- Latitude lines clipped to globe -->
  <g clip-path="url(#globeClip)" fill="none" stroke="#1a6fa8" stroke-width="0.6" opacity="0.5">
    <!-- Equator -->
    <ellipse cx="100" cy="100" rx="72" ry="10"/>
    <!-- 30N -->
    <ellipse cx="100" cy="76" rx="62" ry="8.6"/>
    <!-- 60N -->
    <ellipse cx="100" cy="54" rx="36" ry="5"/>
    <!-- 30S -->
    <ellipse cx="100" cy="124" rx="62" ry="8.6"/>
    <!-- 60S -->
    <ellipse cx="100" cy="146" rx="36" ry="5"/>
  </g>

  <!-- Longitude lines clipped to globe -->
  <g clip-path="url(#globeClip)" fill="none" stroke="#1a6fa8" stroke-width="0.6" opacity="0.5">
    <!-- Prime meridian (vertical ellipse) -->
    <ellipse cx="100" cy="100" rx="8" ry="72"/>
    <!-- 45E -->
    <ellipse cx="100" cy="100" rx="51" ry="72" transform="rotate(-20 100 100)"/>
    <!-- 90E -->
    <ellipse cx="100" cy="100" rx="72" ry="72" transform="rotate(-45 100 100)"/>
    <!-- 135E -->
    <ellipse cx="100" cy="100" rx="51" ry="72" transform="rotate(-70 100 100)"/>
    <!-- 45W -->
    <ellipse cx="100" cy="100" rx="51" ry="72" transform="rotate(20 100 100)"/>
    <!-- 90W -->
    <ellipse cx="100" cy="100" rx="72" ry="72" transform="rotate(45 100 100)"/>
    <!-- 135W -->
    <ellipse cx="100" cy="100" rx="51" ry="72" transform="rotate(70 100 100)"/>
  </g>

  <!-- Highlight lines (brighter selected lines) -->
  <g clip-path="url(#globeClip)" fill="none" stroke="#00aadd" stroke-width="0.8" opacity="0.3">
    <ellipse cx="100" cy="100" rx="72" ry="10"/>
    <ellipse cx="100" cy="100" rx="8" ry="72"/>
  </g>

  <!-- Globe specular highlight -->
  <ellipse cx="82" cy="72" rx="22" ry="14" fill="#3a9fd4" opacity="0.08" transform="rotate(-20 82 72)"/>

  <!-- Network connection lines (arc-like paths between nodes) -->
  <!-- Node positions: A(100,55) B(148,85) C(130,100) D(75,95) E(115,130) F(60,115) G(140,70) H(85,125) -->

  <!-- Connection arcs between nodes -->
  <g opacity="0.55" stroke-width="0.8" fill="none">
    <!-- A to G -->
    <path d="M100,55 Q125,55 148,85" stroke="url(#lineGrad1)"/>
    <!-- A to D -->
    <path d="M100,55 Q85,70 75,95" stroke="#00c4ef" stroke-opacity="0.6"/>
    <!-- G to B -->
    <path d="M140,70 Q148,76 148,85" stroke="#00d4ff" stroke-opacity="0.7"/>
    <!-- B to C -->
    <path d="M148,85 Q142,92 130,100" stroke="#00aaff" stroke-opacity="0.6"/>
    <!-- D to C -->
    <path d="M75,95 Q100,90 130,100" stroke="#0099dd" stroke-opacity="0.5"/>
    <!-- D to F -->
    <path d="M75,95 Q65,105 60,115" stroke="#00c4ef" stroke-opacity="0.5"/>
    <!-- C to E -->
    <path d="M130,100 Q122,115 115,130" stroke="url(#lineGrad2)"/>
    <!-- E to H -->
    <path d="M115,130 Q100,130 85,125" stroke="#00d4ff" stroke-opacity="0.6"/>
    <!-- F to H -->
    <path d="M60,115 Q70,122 85,125" stroke="#00aaff" stroke-opacity="0.5"/>
    <!-- A to C (long arc) -->
    <path d="M100,55 Q118,75 130,100" stroke="#0066bb" stroke-opacity="0.4"/>
  </g>

  <!-- Extended connections going outside globe to right panel area -->
  <g opacity="0.4" stroke-width="0.7" fill="none">
    <path d="M148,85 Q175,78 195,82" stroke="url(#lineGrad1)"/>
    <path d="M130,100 Q160,95 195,100" stroke="#00d4ff" stroke-opacity="0.5"/>
    <path d="M115,130 Q155,128 195,122" stroke="#0099cc" stroke-opacity="0.4"/>
  </g>

  <!-- Network nodes on globe -->
  <g filter="url(#nodeGlow)">
    <!-- Node A - top (North America) -->
    <circle cx="100" cy="55" r="4" fill="#00d4ff" opacity="0.9"/>
    <circle cx="100" cy="55" r="7" fill="#00d4ff" opacity="0.15"/>
    <circle cx="100" cy="55" r="2" fill="#ffffff" opacity="0.95"/>

    <!-- Node G - upper right (Europe) -->
    <circle cx="140" cy="70" r="3.5" fill="#00c4ef" opacity="0.85"/>
    <circle cx="140" cy="70" r="6" fill="#00c4ef" opacity="0.12"/>
    <circle cx="140" cy="70" r="1.8" fill="#ffffff" opacity="0.9"/>

    <!-- Node B - right mid (Asia) -->
    <circle cx="148" cy="85" r="4.5" fill="#00eeff" opacity="0.95"/>
    <circle cx="148" cy="85" r="8" fill="#00eeff" opacity="0.12"/>
    <circle cx="148" cy="85" r="2.2" fill="#ffffff" opacity="1"/>

    <!-- Node D - left mid (Americas) -->
    <circle cx="75" cy="95" r="3.5" fill="#0088ff" opacity="0.85"/>
    <circle cx="75" cy="95" r="6" fill="#0088ff" opacity="0.12"/>
    <circle cx="75" cy="95" r="1.8" fill="#ffffff" opacity="0.9"/>

    <!-- Node C - center (hub) -->
    <circle cx="130" cy="100" r="5" fill="#00d4ff" opacity="0.95"/>
    <circle cx="130" cy="100" r="9" fill="#00d4ff" opacity="0.1"/>
    <circle cx="130" cy="100" r="2.5" fill="#ffffff" opacity="1"/>

    <!-- Node F - lower left (Africa) -->
    <circle cx="60" cy="115" r="3" fill="#0077cc" opacity="0.8"/>
    <circle cx="60" cy="115" r="5.5" fill="#0077cc" opacity="0.1"/>
    <circle cx="60" cy="115" r="1.5" fill="#ffffff" opacity="0.85"/>

    <!-- Node E - lower center (South America) -->
    <circle cx="115" cy="130" r="3.5" fill="#00bbdd" opacity="0.85"/>
    <circle cx="115" cy="130" r="6.5" fill="#00bbdd" opacity="0.1"/>
    <circle cx="115" cy="130" r="1.8" fill="#ffffff" opacity="0.9"/>

    <!-- Node H - lower left globe -->
    <circle cx="85" cy="125" r="2.8" fill="#0099cc" opacity="0.8"/>
    <circle cx="85" cy="125" r="5" fill="#0099cc" opacity="0.1"/>
    <circle cx="85" cy="125" r="1.4" fill="#ffffff" opacity="0.85"/>
  </g>

  <!-- Right panel: external network nodes (outside globe) -->
  <g filter="url(#nodeGlow)">
    <circle cx="200" cy="82" r="3.5" fill="#00ccff" opacity="0.8"/>
    <circle cx="200" cy="82" r="6" fill="#00ccff" opacity="0.1"/>
    <circle cx="200" cy="82" r="1.8" fill="#ffffff" opacity="0.9"/>

    <circle cx="200" cy="100" r="3" fill="#0099ee" opacity="0.75"/>
    <circle cx="200" cy="100" r="5.5" fill="#0099ee" opacity="0.08"/>
    <circle cx="200" cy="100" r="1.5" fill="#ffffff" opacity="0.85"/>

    <circle cx="200" cy="122" r="2.5" fill="#0077bb" opacity="0.7"/>
    <circle cx="200" cy="122" r="4.5" fill="#0077bb" opacity="0.08"/>
    <circle cx="200" cy="122" r="1.2" fill="#ffffff" opacity="0.8"/>
  </g>

  <!-- Connecting lines between right panel nodes -->
  <g opacity="0.3" stroke="#00d4ff" stroke-width="0.6" fill="none">
    <line x1="200" y1="82" x2="200" y2="100"/>
    <line x1="200" y1="100" x2="200" y2="122"/>
    <line x1="200" y1="82" x2="200" y2="122"/>
  </g>

  <!-- Pulse rings (animated feel via layering) -->
  <circle cx="148" cy="85" r="11" fill="none" stroke="#00eeff" stroke-width="0.5" opacity="0.25"/>
  <circle cx="148" cy="85" r="15" fill="none" stroke="#00eeff" stroke-width="0.3" opacity="0.12"/>
  <circle cx="100" cy="55" r="10" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.2"/>

  <!-- Text: "AGENTIC" -->
  <text
    x="172"
    y="60"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="20"
    font-weight="700"
    letter-spacing="2"
    fill="url(#textCyan)"
    filter="url(#textGlow)"
  >
    <defs>
      <linearGradient id="textCyan" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#00d4ff"/>
        <stop offset="100%" stop-color="#00aaff"/>
      </linearGradient>
    </defs>
    AGENTIC
  </text>

  <!-- Text: "LEAD GEN" -->
  <text
    x="172"
    y="82"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="14"
    font-weight="400"
    letter-spacing="3.5"
    fill="#5bb8d4"
    opacity="0.85"
  >LEAD GEN</text>

  <!-- Divider line -->
  <line x1="172" y1="90" x2="290" y2="90" stroke="#00d4ff" stroke-width="0.5" opacity="0.35"/>

  <!-- Tagline -->
  <text
    x="172"
    y="108"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="7.5"
    font-weight="300"
    letter-spacing="1.2"
    fill="#4a9ab8"
    opacity="0.75"
  >GLOBAL B2B INTELLIGENCE</text>

  <!-- Stats row -->
  <g font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fill="#00d4ff">
    <text x="172" y="138" font-size="16" font-weight="700" opacity="0.9">3</text>
    <text x="183" y="138" font-size="7" font-weight="300" fill="#4a9ab8" opacity="0.7"> CONTINENTS</text>
    <text x="218" y="138" font-size="16" font-weight="700" opacity="0.9">∞</text>
    <text x="229" y="138" font-size="7" font-weight="300" fill="#4a9ab8" opacity="0.7"> LEADS</text>
  </g>

  <!-- Bottom border accent -->
  <line x1="172" y1="148" x2="290" y2="148" stroke="#00d4ff" stroke-width="0.3" opacity="0.2"/>

  <!-- Bottom tagline -->
  <text
    x="172"
    y="162"
    font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    font-size="6.5"
    font-weight="300"
    letter-spacing="0.8"
    fill="#2a6a88"
    opacity="0.6"
  >POWERED BY AI · BUILT ON RUST</text>
</svg>` },
  { id: 31, title: "Venn Diagram", concept: "three-circle ICP matching Venn", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Teal circle gradient -->
    <radialGradient id="gradTeal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d4c8" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#008b8b" stop-opacity="0.35"/>
    </radialGradient>
    <!-- Purple circle gradient -->
    <radialGradient id="gradPurple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#9b59ff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#6200ea" stop-opacity="0.35"/>
    </radialGradient>
    <!-- Orange circle gradient -->
    <radialGradient id="gradOrange" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff8c42" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#e65c00" stop-opacity="0.35"/>
    </radialGradient>
    <!-- Intersection glow -->
    <radialGradient id="gradGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="40%" stop-color="#e8f4ff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#a0e8ff" stop-opacity="0.6"/>
    </radialGradient>
    <!-- Outer glow filter for intersection -->
    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Subtle drop shadow for text -->
    <filter id="textGlow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Clip paths for intersection region -->
    <clipPath id="clipTeal">
      <circle cx="130" cy="88" r="52"/>
    </clipPath>
    <clipPath id="clipPurple">
      <circle cx="170" cy="88" r="52"/>
    </clipPath>
    <clipPath id="clipOrange">
      <circle cx="150" cy="118" r="52"/>
    </clipPath>
  </defs>

  <!-- White background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Subtle background grid for depth -->
  <rect width="300" height="200" fill="url(#bgGrid)" opacity="0.03"/>

  <!-- === Three semi-transparent circles === -->
  <!-- Teal: Company Fit (top-left) -->
  <circle cx="130" cy="88" r="52" fill="url(#gradTeal)" stroke="#00c4b8" stroke-width="1.2" stroke-opacity="0.5"/>

  <!-- Purple: Budget (top-right) -->
  <circle cx="170" cy="88" r="52" fill="url(#gradPurple)" stroke="#8b40ff" stroke-width="1.2" stroke-opacity="0.5"/>

  <!-- Orange: Timing (bottom-center) -->
  <circle cx="150" cy="118" r="52" fill="url(#gradOrange)" stroke="#ff7020" stroke-width="1.2" stroke-opacity="0.5"/>

  <!-- === Intersection glow (triple overlap region approximated) === -->
  <!-- Draw glow circle at centroid of the three circle centers -->
  <circle cx="150" cy="98" r="18" fill="url(#gradGlow)" filter="url(#glowFilter)" opacity="0.92"/>
  <!-- Extra inner brightness -->
  <circle cx="150" cy="98" r="10" fill="#ffffff" opacity="0.85" filter="url(#glowFilter)"/>

  <!-- === Circle labels === -->
  <!-- Teal label: Company Fit -->
  <text x="108" y="72" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="7.5" font-weight="600" fill="#006b6b" opacity="0.9">Company</text>
  <text x="108" y="81" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="7.5" font-weight="600" fill="#006b6b" opacity="0.9">Fit</text>

  <!-- Purple label: Budget -->
  <text x="192" y="72" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="7.5" font-weight="600" fill="#4a00a0" opacity="0.9">Budget</text>

  <!-- Orange label: Timing -->
  <text x="150" y="158" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="7.5" font-weight="600" fill="#a03000" opacity="0.9">Timing</text>

  <!-- === LEAD label in glowing intersection === -->
  <text x="150" y="101" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="9" font-weight="800" fill="#1a2a4a" filter="url(#textGlow)" letter-spacing="0.5">LEAD</text>

  <!-- === Bottom branding === -->
  <!-- Divider line -->
  <line x1="60" y1="175" x2="240" y2="175" stroke="#e0e4ef" stroke-width="0.8"/>

  <!-- Logo title -->
  <text x="150" y="188" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="700" fill="#1a2a4a" letter-spacing="0.8">Agentic Lead Gen</text>

  <!-- ICP subtitle -->
  <text x="150" y="197" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="6.5" font-weight="400" fill="#8892a4" letter-spacing="1.5">ICP MATCH</text>
</svg>` },
  { id: 32, title: "Bar Chart People", concept: "ascending bars with person icons", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="bar4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <linearGradient id="bar5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5b21b6"/>
      <stop offset="100%" stop-color="#3730a3"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#6366f1" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#ffffff" rx="12"/>

  <!-- Baseline -->
  <line x1="26" y1="158" x2="274" y2="158" stroke="#e0e7ff" stroke-width="1.5"/>

  <!-- Bar 1 (shortest) -->
  <rect x="30" y="118" width="32" height="40" rx="5" fill="url(#bar1)" filter="url(#shadow)"/>
  <!-- Person icon 1 -->
  <circle cx="46" cy="106" r="7" fill="url(#bar1)"/>
  <path d="M33 116 Q46 109 59 116" fill="url(#bar1)" stroke="none"/>

  <!-- Bar 2 -->
  <rect x="78" y="98" width="32" height="60" rx="5" fill="url(#bar2)" filter="url(#shadow)"/>
  <!-- Person icon 2 -->
  <circle cx="94" cy="86" r="7" fill="url(#bar2)"/>
  <path d="M81 96 Q94 89 107 96" fill="url(#bar2)" stroke="none"/>

  <!-- Bar 3 -->
  <rect x="126" y="78" width="32" height="80" rx="5" fill="url(#bar3)" filter="url(#shadow)"/>
  <!-- Person icon 3 -->
  <circle cx="142" cy="66" r="7" fill="url(#bar3)"/>
  <path d="M129 76 Q142 69 155 76" fill="url(#bar3)" stroke="none"/>

  <!-- Bar 4 -->
  <rect x="174" y="55" width="32" height="103" rx="5" fill="url(#bar4)" filter="url(#shadow)"/>
  <!-- Person icon 4 -->
  <circle cx="190" cy="43" r="7" fill="url(#bar4)"/>
  <path d="M177 53 Q190 46 203 53" fill="url(#bar4)" stroke="none"/>

  <!-- Bar 5 (tallest) -->
  <rect x="222" y="28" width="32" height="130" rx="5" fill="url(#bar5)" filter="url(#shadow)"/>
  <!-- Person icon 5 -->
  <circle cx="238" cy="16" r="7" fill="url(#bar5)"/>
  <path d="M225 26 Q238 19 251 26" fill="url(#bar5)" stroke="none"/>

  <!-- Label -->
  <text x="150" y="181" text-anchor="middle" font-family="'Inter', 'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#4338ca">AGENTIC LEAD GEN</text>
</svg>` },
  { id: 33, title: "Magnet Attract", concept: "horseshoe magnet pulling prospects", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="magnetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#E53E3E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#C53030;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="tipLeftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#F6E05E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D69E2E;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="tipRightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4299E1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2B6CB0;stop-opacity:1" />
    </linearGradient>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#00000020"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#FFFFFF"/>

  <!-- ── Magnetic field lines (curved arcs pulled toward magnet tips) ── -->
  <!-- Field line far left -->
  <path d="M 42 148 Q 28 110 42 75" fill="none" stroke="#FC8181" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>
  <!-- Field line left -->
  <path d="M 58 148 Q 38 110 55 78" fill="none" stroke="#FC8181" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>
  <!-- Field line right -->
  <path d="M 242 148 Q 262 110 245 78" fill="none" stroke="#63B3ED" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>
  <!-- Field line far right -->
  <path d="M 258 148 Q 272 110 258 75" fill="none" stroke="#63B3ED" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>
  <!-- Outer arc field line -->
  <path d="M 50 152 Q 150 195 250 152" fill="none" stroke="#FC8181" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.35"/>

  <!-- ── Horseshoe Magnet Body ── -->
  <!-- Main U-shaped magnet: thick rounded path -->
  <!-- Outer arc -->
  <path d="M 68 148 L 68 100 A 82 82 0 0 1 232 100 L 232 148"
        fill="none" stroke="url(#magnetGrad)" stroke-width="32" stroke-linecap="butt" filter="url(#softShadow)"/>
  <!-- Inner cutout to make it look hollow/horseshoe -->
  <path d="M 68 148 L 68 100 A 82 82 0 0 1 232 100 L 232 148"
        fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="butt"/>
  <!-- Re-draw red ring to clean up -->
  <path d="M 68 148 L 68 100 A 82 82 0 0 1 232 100 L 232 148"
        fill="none" stroke="url(#magnetGrad)" stroke-width="32" stroke-linecap="butt"/>
  <path d="M 68 148 L 68 100 A 82 82 0 0 1 232 100 L 232 148"
        fill="none" stroke="#FFFFFF" stroke-width="16" stroke-linecap="butt"/>

  <!-- Left pole tip (S - yellow) -->
  <rect x="52" y="142" width="32" height="22" rx="4" ry="4" fill="url(#tipLeftGrad)"/>
  <text x="68" y="157" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#7B341E" text-anchor="middle">S</text>

  <!-- Right pole tip (N - blue) -->
  <rect x="216" y="142" width="32" height="22" rx="4" ry="4" fill="url(#tipRightGrad)"/>
  <text x="232" y="157" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#1A365D" text-anchor="middle">N</text>

  <!-- ── Floating icons being attracted ── -->

  <!-- Person icon (left side, being pulled right-down) -->
  <!-- Head -->
  <circle cx="22" cy="108" r="7" fill="#E53E3E" opacity="0.85"/>
  <!-- Body -->
  <path d="M 15 124 Q 22 117 29 124 L 30 135 L 14 135 Z" fill="#E53E3E" opacity="0.85"/>
  <!-- Arrow toward magnet -->
  <line x1="32" y1="118" x2="43" y2="122" stroke="#E53E3E" stroke-width="1.5" opacity="0.6" marker-end="url(#arrowRed)"/>

  <!-- Company building icon (right side, being pulled left-down) -->
  <rect x="265" y="100" width="14" height="16" rx="2" fill="#4299E1" opacity="0.85"/>
  <rect x="268" y="95" width="8" height="6" rx="1" fill="#2B6CB0" opacity="0.85"/>
  <!-- Windows -->
  <rect x="267" y="103" width="3" height="3" rx="0.5" fill="#FFFFFF" opacity="0.9"/>
  <rect x="274" y="103" width="3" height="3" rx="0.5" fill="#FFFFFF" opacity="0.9"/>
  <rect x="267" y="109" width="3" height="3" rx="0.5" fill="#FFFFFF" opacity="0.9"/>
  <rect x="274" y="109" width="3" height="3" rx="0.5" fill="#FFFFFF" opacity="0.9"/>
  <!-- Arrow toward magnet -->
  <line x1="263" y1="112" x2="252" y2="116" stroke="#4299E1" stroke-width="1.5" opacity="0.6"/>

  <!-- Small person icon top-left floating -->
  <circle cx="16" cy="62" r="5" fill="#FC8181" opacity="0.7"/>
  <path d="M 11 74 Q 16 68 21 74 L 22 82 L 10 82 Z" fill="#FC8181" opacity="0.7"/>
  <!-- Arrow -->
  <line x1="23" y1="68" x2="36" y2="74" stroke="#FC8181" stroke-width="1.2" opacity="0.5"/>

  <!-- Small company icon top-right floating -->
  <rect x="270" y="56" width="11" height="13" rx="1.5" fill="#63B3ED" opacity="0.7"/>
  <rect x="272" y="52" width="7" height="5" rx="1" fill="#4299E1" opacity="0.7"/>
  <rect x="272" y="59" width="2.5" height="2.5" rx="0.3" fill="#FFFFFF" opacity="0.8"/>
  <rect x="277" y="59" width="2.5" height="2.5" rx="0.3" fill="#FFFFFF" opacity="0.8"/>
  <!-- Arrow -->
  <line x1="268" y1="63" x2="257" y2="70" stroke="#63B3ED" stroke-width="1.2" opacity="0.5"/>

  <!-- Arrowhead marker for red -->
  <defs>
    <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 Z" fill="#E53E3E" opacity="0.6"/>
    </marker>
  </defs>

  <!-- ── Logotype ── -->
  <text x="150" y="180" font-family="'Arial Black',Arial,sans-serif" font-size="13" font-weight="900"
        fill="#1A202C" text-anchor="middle" letter-spacing="0.5">AGENTIC</text>
  <text x="150" y="195" font-family="Arial,sans-serif" font-size="9.5" font-weight="400"
        fill="#E53E3E" text-anchor="middle" letter-spacing="2.5">LEAD  GEN</text>
</svg>` },
  { id: 34, title: "Quantum Entangle", concept: "two intertwined quantum particle trails", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep space background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0d0020"/>
      <stop offset="60%" stop-color="#06000f"/>
      <stop offset="100%" stop-color="#000005"/>
    </radialGradient>

    <!-- Particle trail gradient A — purple to electric white -->
    <linearGradient id="trailA" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#1a003a" stop-opacity="0"/>
      <stop offset="20%"  stop-color="#6600cc" stop-opacity="0.6"/>
      <stop offset="45%"  stop-color="#cc44ff" stop-opacity="1"/>
      <stop offset="55%"  stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="80%"  stop-color="#6600cc" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#1a003a" stop-opacity="0"/>
    </linearGradient>

    <!-- Particle trail gradient B — electric blue to violet -->
    <linearGradient id="trailB" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%"   stop-color="#001a3a" stop-opacity="0"/>
      <stop offset="20%"  stop-color="#0044ff" stop-opacity="0.6"/>
      <stop offset="45%"  stop-color="#44aaff" stop-opacity="1"/>
      <stop offset="55%"  stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="80%"  stop-color="#0044ff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#001a3a" stop-opacity="0"/>
    </linearGradient>

    <!-- Entanglement glow at center -->
    <radialGradient id="entangleGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="25%" stop-color="#dd88ff" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#6600cc" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#6600cc" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer node glow purple -->
    <radialGradient id="nodeGlowL" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="30%" stop-color="#cc44ff" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#6600cc" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6600cc" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer node glow blue -->
    <radialGradient id="nodeGlowR" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="30%" stop-color="#44aaff" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#0044ff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0044ff" stop-opacity="0"/>
    </radialGradient>

    <!-- Text glow filter -->
    <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Soft blur for glow halos -->
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
    </filter>

    <filter id="coreGlow" x="-80%" y="-80%" width="360%" height="360%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8"/>
    </filter>

    <!-- Clip to viewBox -->
    <clipPath id="bounds">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <g clip-path="url(#bounds)">

    <!-- ========== AMBIENT STAR FIELD ========== -->
    <g opacity="0.55">
      <circle cx="14"  cy="18"  r="0.7" fill="#ffffff"/>
      <circle cx="42"  cy="8"   r="0.5" fill="#cc99ff"/>
      <circle cx="78"  cy="22"  r="0.6" fill="#ffffff"/>
      <circle cx="110" cy="12"  r="0.4" fill="#aaaaff"/>
      <circle cx="145" cy="5"   r="0.7" fill="#ffffff"/>
      <circle cx="172" cy="17"  r="0.5" fill="#cc99ff"/>
      <circle cx="205" cy="9"   r="0.6" fill="#ffffff"/>
      <circle cx="240" cy="20"  r="0.4" fill="#aaaaff"/>
      <circle cx="268" cy="7"   r="0.7" fill="#ffffff"/>
      <circle cx="290" cy="15"  r="0.5" fill="#cc99ff"/>
      <circle cx="8"   cy="55"  r="0.5" fill="#ffffff"/>
      <circle cx="30"  cy="70"  r="0.6" fill="#aaaaff"/>
      <circle cx="60"  cy="48"  r="0.4" fill="#cc99ff"/>
      <circle cx="88"  cy="65"  r="0.5" fill="#ffffff"/>
      <circle cx="122" cy="55"  r="0.7" fill="#aaaaff"/>
      <circle cx="180" cy="62"  r="0.5" fill="#ffffff"/>
      <circle cx="215" cy="50"  r="0.4" fill="#cc99ff"/>
      <circle cx="255" cy="68"  r="0.6" fill="#ffffff"/>
      <circle cx="285" cy="55"  r="0.5" fill="#aaaaff"/>
      <circle cx="18"  cy="148" r="0.6" fill="#ffffff"/>
      <circle cx="52"  cy="158" r="0.4" fill="#cc99ff"/>
      <circle cx="85"  cy="145" r="0.5" fill="#aaaaff"/>
      <circle cx="115" cy="162" r="0.7" fill="#ffffff"/>
      <circle cx="185" cy="155" r="0.5" fill="#cc99ff"/>
      <circle cx="220" cy="145" r="0.4" fill="#ffffff"/>
      <circle cx="258" cy="160" r="0.6" fill="#aaaaff"/>
      <circle cx="288" cy="148" r="0.5" fill="#ffffff"/>
      <circle cx="35"  cy="185" r="0.5" fill="#aaaaff"/>
      <circle cx="75"  cy="192" r="0.4" fill="#ffffff"/>
      <circle cx="135" cy="188" r="0.6" fill="#cc99ff"/>
      <circle cx="190" cy="195" r="0.4" fill="#ffffff"/>
      <circle cx="240" cy="188" r="0.5" fill="#aaaaff"/>
      <circle cx="275" cy="192" r="0.6" fill="#ffffff"/>
    </g>

    <!-- ========== SPIRAL TRAIL A — PURPLE (top arc, left→right) ========== -->
    <!-- Composed as a sequence of arcs that spiral inward to center then out -->

    <!-- Glow layer (blurred, thick) -->
    <g filter="url(#softGlow)" opacity="0.55">
      <!-- Upper wave of trail A -->
      <path d="M 28,100
               C 38,72  58,55  80,68
               C 102,81 108,108 120,108
               C 132,108 138,85  150,82
               C 162,79  168,95  180,95
               C 192,95  202,82  220,88
               C 238,94  252,108 272,100"
            fill="none" stroke="#cc44ff" stroke-width="4" stroke-linecap="round"/>
      <!-- Lower wave of trail A -->
      <path d="M 28,100
               C 38,128 58,145  80,132
               C 102,119 108,92  120,92
               C 132,92  138,115 150,118
               C 162,121 168,105 180,105
               C 192,105 202,118 220,112
               C 238,106 252,92  272,100"
            fill="none" stroke="#cc44ff" stroke-width="4" stroke-linecap="round"/>
    </g>

    <!-- Sharp layer trail A upper -->
    <path d="M 28,100
             C 38,72  58,55  80,68
             C 102,81 108,108 120,108
             C 132,108 138,85  150,82
             C 162,79  168,95  180,95
             C 192,95  202,82  220,88
             C 238,94  252,108 272,100"
          fill="none" stroke="url(#trailA)" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>

    <!-- Sharp layer trail A lower -->
    <path d="M 28,100
             C 38,128 58,145  80,132
             C 102,119 108,92  120,92
             C 132,92  138,115 150,118
             C 162,121 168,105 180,105
             C 192,105 202,118 220,112
             C 238,106 252,92  272,100"
          fill="none" stroke="url(#trailA)" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>

    <!-- ========== SPIRAL TRAIL B — BLUE (lower arc, right→left, phase-shifted) ========== -->

    <!-- Glow layer -->
    <g filter="url(#softGlow)" opacity="0.5">
      <path d="M 272,100
               C 262,66   242,48  218,62
               C 194,76   190,106 178,106
               C 166,106  160,79  150,76
               C 140,73   134,92  122,92
               C 110,92   100,76  82,82
               C 64,88    48,104  28,100"
            fill="none" stroke="#44aaff" stroke-width="4" stroke-linecap="round"/>
      <path d="M 272,100
               C 262,134  242,152 218,138
               C 194,124  190,94  178,94
               C 166,94   160,121 150,124
               C 140,127  134,108 122,108
               C 110,108  100,124  82,118
               C 64,112   48,96   28,100"
            fill="none" stroke="#44aaff" stroke-width="4" stroke-linecap="round"/>
    </g>

    <!-- Sharp trail B upper -->
    <path d="M 272,100
             C 262,66   242,48  218,62
             C 194,76   190,106 178,106
             C 166,106  160,79  150,76
             C 140,73   134,92  122,92
             C 110,92   100,76  82,82
             C 64,88    48,104  28,100"
          fill="none" stroke="url(#trailB)" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>

    <!-- Sharp trail B lower -->
    <path d="M 272,100
             C 262,134  242,152 218,138
             C 194,124  190,94  178,94
             C 166,94   160,121 150,124
             C 140,127  134,108 122,108
             C 110,108  100,124  82,118
             C 64,112   48,96   28,100"
          fill="none" stroke="url(#trailB)" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>

    <!-- ========== ORBITAL RINGS at entanglement nexus (center) ========== -->
    <!-- Faint ellipses suggesting quantum orbital -->
    <ellipse cx="150" cy="100" rx="22" ry="8"
             fill="none" stroke="#cc44ff" stroke-width="0.8" opacity="0.35"
             transform="rotate(-30 150 100)"/>
    <ellipse cx="150" cy="100" rx="22" ry="8"
             fill="none" stroke="#44aaff" stroke-width="0.8" opacity="0.35"
             transform="rotate(30 150 100)"/>
    <ellipse cx="150" cy="100" rx="22" ry="8"
             fill="none" stroke="#ffffff" stroke-width="0.6" opacity="0.2"/>

    <!-- ========== CENTER ENTANGLEMENT NEXUS ========== -->
    <!-- Deep glow halo -->
    <circle cx="150" cy="100" r="22" fill="url(#entangleGlow)" filter="url(#coreGlow)" opacity="0.7"/>
    <!-- Mid halo -->
    <circle cx="150" cy="100" r="10" fill="#cc44ff" opacity="0.18" filter="url(#softGlow)"/>
    <!-- Core bright node -->
    <circle cx="150" cy="100" r="4.5" fill="#ffffff" opacity="0.95"/>
    <!-- Inner ring -->
    <circle cx="150" cy="100" r="7"
            fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.55"/>
    <!-- Outer ring -->
    <circle cx="150" cy="100" r="14"
            fill="none" stroke="#cc44ff" stroke-width="0.6" stroke-dasharray="3 4" opacity="0.45"/>

    <!-- Cross-hair quantum lines through center -->
    <line x1="135" y1="100" x2="165" y2="100" stroke="#ffffff" stroke-width="0.7" opacity="0.4"/>
    <line x1="150" y1="85"  x2="150" y2="115" stroke="#ffffff" stroke-width="0.7" opacity="0.4"/>
    <line x1="140" y1="90"  x2="160" y2="110" stroke="#ffffff" stroke-width="0.5" opacity="0.25"/>
    <line x1="160" y1="90"  x2="140" y2="110" stroke="#ffffff" stroke-width="0.5" opacity="0.25"/>

    <!-- ========== LEFT QUANTUM NODE (particle A) ========== -->
    <!-- Outer glow -->
    <circle cx="28" cy="100" r="18" fill="url(#nodeGlowL)" filter="url(#softGlow)" opacity="0.6"/>
    <!-- Orbital ring -->
    <ellipse cx="28" cy="100" rx="14" ry="5"
             fill="none" stroke="#cc44ff" stroke-width="0.8" opacity="0.5"
             transform="rotate(-20 28 100)"/>
    <ellipse cx="28" cy="100" rx="14" ry="5"
             fill="none" stroke="#9922ff" stroke-width="0.8" opacity="0.5"
             transform="rotate(20 28 100)"/>
    <!-- Node core -->
    <circle cx="28" cy="100" r="5.5" fill="#ffffff" opacity="0.95"/>
    <circle cx="28" cy="100" r="3"   fill="#ffffff"/>
    <!-- Outer dashed ring -->
    <circle cx="28" cy="100" r="10"
            fill="none" stroke="#cc44ff" stroke-width="0.7" stroke-dasharray="2.5 3" opacity="0.5"/>

    <!-- ========== RIGHT QUANTUM NODE (particle B) ========== -->
    <circle cx="272" cy="100" r="18" fill="url(#nodeGlowR)" filter="url(#softGlow)" opacity="0.6"/>
    <ellipse cx="272" cy="100" rx="14" ry="5"
             fill="none" stroke="#44aaff" stroke-width="0.8" opacity="0.5"
             transform="rotate(-20 272 100)"/>
    <ellipse cx="272" cy="100" rx="14" ry="5"
             fill="none" stroke="#0066ff" stroke-width="0.8" opacity="0.5"
             transform="rotate(20 272 100)"/>
    <circle cx="272" cy="100" r="5.5" fill="#ffffff" opacity="0.95"/>
    <circle cx="272" cy="100" r="3"   fill="#ffffff"/>
    <circle cx="272" cy="100" r="10"
            fill="none" stroke="#44aaff" stroke-width="0.7" stroke-dasharray="2.5 3" opacity="0.5"/>

    <!-- ========== SMALL QUANTUM PARTICLE DOTS along trails ========== -->
    <!-- Trail A particles -->
    <circle cx="80"  cy="68"  r="2.2" fill="#cc44ff" opacity="0.85"/>
    <circle cx="120" cy="108" r="1.8" fill="#dd66ff" opacity="0.8"/>
    <circle cx="180" cy="95"  r="2.0" fill="#cc44ff" opacity="0.85"/>
    <circle cx="220" cy="88"  r="1.8" fill="#dd66ff" opacity="0.8"/>

    <circle cx="80"  cy="132" r="2.2" fill="#cc44ff" opacity="0.85"/>
    <circle cx="120" cy="92"  r="1.8" fill="#dd66ff" opacity="0.8"/>
    <circle cx="180" cy="105" r="2.0" fill="#cc44ff" opacity="0.85"/>
    <circle cx="220" cy="112" r="1.8" fill="#dd66ff" opacity="0.8"/>

    <!-- Trail B particles -->
    <circle cx="218" cy="62"  r="2.2" fill="#44aaff" opacity="0.85"/>
    <circle cx="178" cy="106" r="1.8" fill="#66ccff" opacity="0.8"/>
    <circle cx="122" cy="92"  r="2.0" fill="#44aaff" opacity="0.85"/>
    <circle cx="82"  cy="82"  r="1.8" fill="#66ccff" opacity="0.8"/>

    <circle cx="218" cy="138" r="2.2" fill="#44aaff" opacity="0.85"/>
    <circle cx="178" cy="94"  r="1.8" fill="#66ccff" opacity="0.8"/>
    <circle cx="122" cy="108" r="2.0" fill="#44aaff" opacity="0.85"/>
    <circle cx="82"  cy="118" r="1.8" fill="#66ccff" opacity="0.8"/>

    <!-- ========== TYPOGRAPHY ========== -->
    <!-- "AGENTIC" main wordmark -->
    <text x="150" y="166"
          font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
          font-size="15"
          font-weight="800"
          letter-spacing="6"
          text-anchor="middle"
          fill="#ffffff"
          filter="url(#textGlow)"
          opacity="0.97">AGENTIC</text>

    <!-- "LEAD GEN" sub-label -->
    <text x="150" y="182"
          font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
          font-size="8.5"
          font-weight="400"
          letter-spacing="4.5"
          text-anchor="middle"
          fill="#cc88ff"
          opacity="0.82">LEAD  GEN</text>

    <!-- Thin rule lines flanking text -->
    <line x1="48"  y1="159" x2="108" y2="159" stroke="#6600cc" stroke-width="0.6" opacity="0.5"/>
    <line x1="192" y1="159" x2="252" y2="159" stroke="#6600cc" stroke-width="0.6" opacity="0.5"/>

    <!-- Diamond accent at center of rules -->
    <rect x="147" y="156.5" width="6" height="6"
          fill="none" stroke="#cc44ff" stroke-width="0.7" opacity="0.6"
          transform="rotate(45 150 159.5)"/>

  </g>
</svg>` },
  { id: 35, title: "Sunrise Dawn", concept: "sunrise with data bar sun rays", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Sky gradient: amber to coral -->
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF6B35"/>
      <stop offset="40%" stop-color="#F7931E"/>
      <stop offset="75%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#FFE8A3"/>
    </linearGradient>

    <!-- Sun core gradient -->
    <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="30%" stop-color="#FFF3CD"/>
      <stop offset="100%" stop-color="#F7931E" stop-opacity="0.9"/>
    </radialGradient>

    <!-- Ground gradient -->
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2D1B69"/>
      <stop offset="100%" stop-color="#1A0F3C"/>
    </linearGradient>

    <!-- Glow filter for sun -->
    <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Ray bar glow -->
    <filter id="rayGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Horizon shimmer -->
    <linearGradient id="horizonShimmer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF6B35" stop-opacity="0"/>
      <stop offset="30%" stop-color="#FFD166" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#FFD166" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#FF6B35" stop-opacity="0"/>
    </linearGradient>

    <clipPath id="skyClip">
      <rect x="0" y="0" width="300" height="140"/>
    </clipPath>
  </defs>

  <!-- Sky background -->
  <rect x="0" y="0" width="300" height="140" fill="url(#skyGrad)"/>

  <!-- Subtle atmospheric haze arc near horizon -->
  <ellipse cx="150" cy="140" rx="180" ry="30" fill="#FFE8A3" opacity="0.35"/>

  <!-- === SUN (half circle rising from horizon) === -->
  <g filter="url(#sunGlow)" clip-path="url(#skyClip)">
    <circle cx="150" cy="140" r="28" fill="url(#sunGrad)" opacity="0.95"/>
  </g>

  <!-- === DATA BAR / ARROW RAYS === -->
  <!-- Each ray is a bar with an arrowhead on top, arranged like a sunrise fan -->
  <!-- Rays: far-left, left, center-left, center, center-right, right, far-right -->

  <g filter="url(#rayGlow)" clip-path="url(#skyClip)">

    <!-- Ray 1: far left (short, ~-70deg from vertical) -->
    <g transform="translate(150,140) rotate(-68)">
      <rect x="-3.5" y="-52" width="7" height="38" rx="2" fill="#FFFFFF" opacity="0.55"/>
      <polygon points="0,-58 -5.5,-50 5.5,-50" fill="#FFFFFF" opacity="0.65"/>
    </g>

    <!-- Ray 2: left (~-50deg) -->
    <g transform="translate(150,140) rotate(-50)">
      <rect x="-4" y="-62" width="8" height="46" rx="2" fill="#FFE0A0" opacity="0.7"/>
      <polygon points="0,-70 -6,-61 6,-61" fill="#FFE0A0" opacity="0.8"/>
    </g>

    <!-- Ray 3: center-left (~-28deg) -->
    <g transform="translate(150,140) rotate(-27)">
      <rect x="-4.5" y="-74" width="9" height="56" rx="2" fill="#FFF0C0" opacity="0.82"/>
      <polygon points="0,-83 -7,-73 7,-73" fill="#FFF0C0" opacity="0.9"/>
    </g>

    <!-- Ray 4: center (straight up) -->
    <g transform="translate(150,140) rotate(0)">
      <rect x="-5" y="-84" width="10" height="64" rx="2.5" fill="#FFFFFF" opacity="0.95"/>
      <polygon points="0,-95 -7.5,-83 7.5,-83" fill="#FFFFFF" opacity="1"/>
    </g>

    <!-- Ray 5: center-right (~+28deg) -->
    <g transform="translate(150,140) rotate(27)">
      <rect x="-4.5" y="-74" width="9" height="56" rx="2" fill="#FFF0C0" opacity="0.82"/>
      <polygon points="0,-83 -7,-73 7,-73" fill="#FFF0C0" opacity="0.9"/>
    </g>

    <!-- Ray 6: right (~+50deg) -->
    <g transform="translate(150,140) rotate(50)">
      <rect x="-4" y="-62" width="8" height="46" rx="2" fill="#FFE0A0" opacity="0.7"/>
      <polygon points="0,-70 -6,-61 6,-61" fill="#FFE0A0" opacity="0.8"/>
    </g>

    <!-- Ray 7: far right (~+68deg) -->
    <g transform="translate(150,140) rotate(68)">
      <rect x="-3.5" y="-52" width="7" height="38" rx="2" fill="#FFFFFF" opacity="0.55"/>
      <polygon points="0,-58 -5.5,-50 5.5,-50" fill="#FFFFFF" opacity="0.65"/>
    </g>

  </g>

  <!-- === HORIZON LINE === -->
  <rect x="0" y="137" width="300" height="3" fill="url(#horizonShimmer)"/>
  <line x1="0" y1="140" x2="300" y2="140" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>

  <!-- === GROUND === -->
  <rect x="0" y="140" width="300" height="60" fill="url(#groundGrad)"/>

  <!-- Horizon glow reflection on ground -->
  <ellipse cx="150" cy="142" rx="130" ry="10" fill="#F7931E" opacity="0.18"/>

  <!-- === TEXT === -->
  <!-- "Agentic" -->
  <text
    x="150"
    y="165"
    text-anchor="middle"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="18"
    font-weight="700"
    letter-spacing="3"
    fill="#FFFFFF"
    opacity="0.97"
  >AGENTIC</text>

  <!-- Thin divider line -->
  <line x1="90" y1="171" x2="210" y2="171" stroke="#F7931E" stroke-width="0.8" opacity="0.7"/>

  <!-- "LEAD GEN" -->
  <text
    x="150"
    y="184"
    text-anchor="middle"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="10"
    font-weight="400"
    letter-spacing="5"
    fill="#FFD166"
    opacity="0.88"
  >LEAD GEN</text>

</svg>` },
  { id: 36, title: "Map Pin Target", concept: "location pin with network interior", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="pinGrad" cx="45%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#FF4D4D"/>
      <stop offset="60%" stop-color="#E8120C"/>
      <stop offset="100%" stop-color="#B00D08"/>
    </radialGradient>
    <radialGradient id="innerGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1A1A2E"/>
      <stop offset="100%" stop-color="#0D0D1A"/>
    </radialGradient>
    <filter id="pinShadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#B00D08" flood-opacity="0.4"/>
    </filter>
    <filter id="glowNode" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="pinClip">
      <path d="M150,22 C124,22 103,43 103,69 C103,95 150,148 150,148 C150,148 197,95 197,69 C197,43 176,22 150,22 Z"/>
    </clipPath>
  </defs>

  <!-- White background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Pin shadow/drop -->
  <ellipse cx="150" cy="158" rx="16" ry="5" fill="#C0392B" opacity="0.25"/>

  <!-- Main pin body -->
  <path d="M150,22 C124,22 103,43 103,69 C103,95 150,148 150,148 C150,148 197,95 197,69 C197,43 176,22 150,22 Z"
        fill="url(#pinGrad)" filter="url(#pinShadow)"/>

  <!-- Pin inner dark circle -->
  <circle cx="150" cy="67" r="34" fill="url(#innerGrad)" clip-path="url(#pinClip)"/>

  <!-- Network graph inside pin -->
  <!-- Nodes -->
  <g filter="url(#glowNode)">
    <!-- Central node -->
    <circle cx="150" cy="67" r="4.5" fill="#00E5FF" opacity="0.95"/>
    <!-- Satellite nodes -->
    <circle cx="136" cy="54" r="3" fill="#7C4DFF" opacity="0.9"/>
    <circle cx="165" cy="52" r="3" fill="#7C4DFF" opacity="0.9"/>
    <circle cx="168" cy="73" r="2.5" fill="#FF6D00" opacity="0.85"/>
    <circle cx="138" cy="80" r="2.5" fill="#FF6D00" opacity="0.85"/>
    <circle cx="155" cy="84" r="2" fill="#00E5FF" opacity="0.75"/>
    <circle cx="142" cy="62" r="2" fill="#69F0AE" opacity="0.8"/>
    <circle cx="160" cy="62" r="2" fill="#69F0AE" opacity="0.8"/>
  </g>

  <!-- Network edges -->
  <g stroke-width="1" opacity="0.65">
    <!-- Center to all satellites -->
    <line x1="150" y1="67" x2="136" y2="54" stroke="#7C4DFF" stroke-width="1"/>
    <line x1="150" y1="67" x2="165" y2="52" stroke="#7C4DFF" stroke-width="1"/>
    <line x1="150" y1="67" x2="168" y2="73" stroke="#FF6D00" stroke-width="1"/>
    <line x1="150" y1="67" x2="138" y2="80" stroke="#FF6D00" stroke-width="1"/>
    <line x1="150" y1="67" x2="155" y2="84" stroke="#00E5FF" stroke-width="0.8"/>
    <line x1="150" y1="67" x2="142" y2="62" stroke="#69F0AE" stroke-width="0.8"/>
    <line x1="150" y1="67" x2="160" y2="62" stroke="#69F0AE" stroke-width="0.8"/>
    <!-- Cross edges -->
    <line x1="136" y1="54" x2="165" y2="52" stroke="#7C4DFF" stroke-width="0.7" opacity="0.5"/>
    <line x1="165" y1="52" x2="168" y2="73" stroke="#FF6D00" stroke-width="0.7" opacity="0.5"/>
    <line x1="168" y1="73" x2="138" y2="80" stroke="#FF6D00" stroke-width="0.7" opacity="0.5"/>
    <line x1="138" y1="80" x2="136" y2="54" stroke="#7C4DFF" stroke-width="0.7" opacity="0.4"/>
    <line x1="142" y1="62" x2="136" y2="54" stroke="#69F0AE" stroke-width="0.6" opacity="0.4"/>
    <line x1="160" y1="62" x2="165" y2="52" stroke="#69F0AE" stroke-width="0.6" opacity="0.4"/>
  </g>

  <!-- Pin highlight (gloss) -->
  <ellipse cx="138" cy="47" rx="9" ry="6" fill="white" opacity="0.12" transform="rotate(-20,138,47)"/>

  <!-- Pin bottom tip highlight -->
  <path d="M150,148 C150,148 147,140 146,132" stroke="white" stroke-width="1" fill="none" opacity="0.15" stroke-linecap="round"/>

  <!-- Wordmark: "Agentic Lead Gen" -->
  <text x="150" y="170" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        font-size="13.5" font-weight="700" fill="#1A1A2E" text-anchor="middle" letter-spacing="0.5">
    AGENTIC LEAD GEN
  </text>

  <!-- Tagline -->
  <text x="150" y="185" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        font-size="7.5" font-weight="400" fill="#E8120C" text-anchor="middle" letter-spacing="2">
    PRECISION ICP TARGETING
  </text>
</svg>` },
  { id: 37, title: "Beehive Pipeline", concept: "honeycomb cells with stage icons", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0f00;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#2d1a00;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="hexGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffd966;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#cc8800;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="hexAmber" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffb300;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#e65c00;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="hexLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffe599;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#ffaa00;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="hexDeep" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f59500;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#b35900;stop-opacity:1"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="hexClip1">
      <polygon points="75,42 89,50 89,66 75,74 61,66 61,50"/>
    </clipPath>
    <clipPath id="hexClip2">
      <polygon points="103,42 117,50 117,66 103,74 89,66 89,50"/>
    </clipPath>
    <clipPath id="hexClip3">
      <polygon points="131,42 145,50 145,66 131,74 117,66 117,50"/>
    </clipPath>
    <clipPath id="hexClip4">
      <polygon points="89,66 103,74 103,90 89,98 75,90 75,74"/>
    </clipPath>
    <clipPath id="hexClip5">
      <polygon points="117,66 131,74 131,90 117,98 103,90 103,74"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle honeycomb texture bg -->
  <g opacity="0.06" stroke="#ffaa00" stroke-width="0.5" fill="none">
    <polygon points="20,15 30,9 40,15 40,27 30,33 20,27"/>
    <polygon points="40,15 50,9 60,15 60,27 50,33 40,27"/>
    <polygon points="240,15 250,9 260,15 260,27 250,33 240,27"/>
    <polygon points="260,15 270,9 280,15 280,27 270,33 260,27"/>
    <polygon points="250,150 260,144 270,150 270,162 260,168 250,162"/>
    <polygon points="20,155 30,149 40,155 40,167 30,173 20,167"/>
  </g>

  <!-- Outer hive structure shadow/depth -->
  <g opacity="0.3">
    <polygon points="75,44 89,52 89,68 75,76 61,68 61,52" fill="none" stroke="#6b3a00" stroke-width="3"/>
    <polygon points="103,44 117,52 117,68 103,76 89,68 89,52" fill="none" stroke="#6b3a00" stroke-width="3"/>
    <polygon points="131,44 145,52 145,68 131,76 117,68 117,52" fill="none" stroke="#6b3a00" stroke-width="3"/>
    <polygon points="89,68 103,76 103,92 89,100 75,92 75,76" fill="none" stroke="#6b3a00" stroke-width="3"/>
    <polygon points="117,68 131,76 131,92 117,100 103,92 103,76" fill="none" stroke="#6b3a00" stroke-width="3"/>
  </g>

  <!-- ===== HEXAGON 1 — SEARCH (top-left) ===== -->
  <polygon points="75,42 89,50 89,66 75,74 61,66 61,50" fill="url(#hexGold)" stroke="#ffd966" stroke-width="1.2"/>
  <!-- Magnifying glass icon -->
  <g clip-path="url(#hexClip1)" filter="url(#glow)">
    <circle cx="73" cy="56" r="6" fill="none" stroke="#3d1a00" stroke-width="2"/>
    <line x1="77.2" y1="60.2" x2="82" y2="65" stroke="#3d1a00" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="73" cy="56" r="2.5" fill="#3d1a00" opacity="0.3"/>
  </g>

  <!-- ===== HEXAGON 2 — ENRICH (top-center) ===== -->
  <polygon points="103,42 117,50 117,66 103,74 89,66 89,50" fill="url(#hexAmber)" stroke="#ffb300" stroke-width="1.2"/>
  <!-- Database/layers icon -->
  <g clip-path="url(#hexClip2)" filter="url(#glow)">
    <ellipse cx="103" cy="53" rx="8" ry="3" fill="#3d1a00" opacity="0.85"/>
    <rect x="95" y="53" width="16" height="5" fill="#3d1a00" opacity="0.6"/>
    <ellipse cx="103" cy="58" rx="8" ry="3" fill="#3d1a00" opacity="0.75"/>
    <rect x="95" y="58" width="16" height="4" fill="#3d1a00" opacity="0.5"/>
    <ellipse cx="103" cy="62" rx="8" ry="3" fill="#3d1a00" opacity="0.65"/>
  </g>

  <!-- ===== HEXAGON 3 — CONTACT (top-right) ===== -->
  <polygon points="131,42 145,50 145,66 131,74 117,66 117,50" fill="url(#hexLight)" stroke="#ffe599" stroke-width="1.2"/>
  <!-- Person/contact icon -->
  <g clip-path="url(#hexClip3)" filter="url(#glow)">
    <circle cx="131" cy="53" r="4.5" fill="#3d1a00" opacity="0.85"/>
    <path d="M122,68 Q122,60 131,60 Q140,60 140,68" fill="#3d1a00" opacity="0.75"/>
  </g>

  <!-- ===== HEXAGON 4 — SEND (bottom-left) ===== -->
  <polygon points="89,66 103,74 103,90 89,98 75,90 75,74" fill="url(#hexDeep)" stroke="#f59500" stroke-width="1.2"/>
  <!-- Paper plane / send icon -->
  <g clip-path="url(#hexClip4)" filter="url(#glow)">
    <polygon points="77,84 97,80 85,88" fill="#3d1a00" opacity="0.9"/>
    <polygon points="77,84 85,74 97,80" fill="#3d1a00" opacity="0.7"/>
    <line x1="85" y1="88" x2="88" y2="82" stroke="#3d1a00" stroke-width="1.5" opacity="0.8"/>
  </g>

  <!-- ===== HEXAGON 5 — AUTOMATE (bottom-right) ===== -->
  <polygon points="117,66 131,74 131,90 117,98 103,90 103,74" fill="url(#hexGold)" stroke="#ffd966" stroke-width="1.2"/>
  <!-- Lightning bolt / automate icon -->
  <g clip-path="url(#hexClip5)" filter="url(#glow)">
    <polygon points="121,72 114,84 118,84 115,96 126,80 121,80" fill="#3d1a00" opacity="0.9"/>
  </g>

  <!-- Hex cell borders glow layer -->
  <g filter="url(#softGlow)" opacity="0.6">
    <polygon points="75,42 89,50 89,66 75,74 61,66 61,50" fill="none" stroke="#ffdd44" stroke-width="0.8"/>
    <polygon points="103,42 117,50 117,66 103,74 89,66 89,50" fill="none" stroke="#ffcc00" stroke-width="0.8"/>
    <polygon points="131,42 145,50 145,66 131,74 117,66 117,50" fill="none" stroke="#ffee77" stroke-width="0.8"/>
    <polygon points="89,66 103,74 103,90 89,98 75,90 75,74" fill="none" stroke="#ffaa00" stroke-width="0.8"/>
    <polygon points="117,66 131,74 131,90 117,98 103,90 103,74" fill="none" stroke="#ffdd44" stroke-width="0.8"/>
  </g>

  <!-- Connector lines between hive and text — flow arrows -->
  <g stroke="#ffaa00" stroke-width="0.8" opacity="0.5" fill="none">
    <path d="M 89,58 Q 96,58 89,58" stroke-dasharray="2,2"/>
    <path d="M 117,58 Q 124,58 117,58" stroke-dasharray="2,2"/>
    <path d="M 89,82 Q 96,82 89,82" stroke-dasharray="2,2"/>
  </g>

  <!-- Small bee accent — dots suggesting motion -->
  <g opacity="0.7" filter="url(#glow)">
    <ellipse cx="155" cy="52" rx="5" ry="3.5" fill="#ffcc00" stroke="#cc7700" stroke-width="0.8"/>
    <line x1="153" y1="49" x2="151" y2="46" stroke="#ffee88" stroke-width="1" opacity="0.9"/>
    <line x1="157" y1="49" x2="159" y2="46" stroke="#ffee88" stroke-width="1" opacity="0.9"/>
    <ellipse cx="155" cy="52" rx="2" ry="3.5" fill="#cc7700" opacity="0.4"/>
    <line x1="152" y1="51" x2="158" y2="51" stroke="#3d1a00" stroke-width="0.7" opacity="0.8"/>
    <line x1="152" y1="53" x2="158" y2="53" stroke="#3d1a00" stroke-width="0.7" opacity="0.8"/>
    <!-- stinger -->
    <line x1="160" y1="52" x2="163" y2="52" stroke="#ffcc00" stroke-width="0.8"/>
    <!-- motion trail -->
    <circle cx="166" cy="52" r="0.8" fill="#ffcc00" opacity="0.5"/>
    <circle cx="169" cy="52" r="0.5" fill="#ffcc00" opacity="0.3"/>
    <circle cx="171" cy="52" r="0.3" fill="#ffcc00" opacity="0.2"/>
  </g>

  <!-- ===== WORDMARK ===== -->
  <!-- "Agentic" -->
  <text x="103" y="122" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="18" fill="#ffd966" text-anchor="middle" letter-spacing="2" filter="url(#glow)">AGENTIC</text>

  <!-- "LEAD GEN" -->
  <text x="103" y="140" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="400" font-size="11" fill="#ffaa44" text-anchor="middle" letter-spacing="5">LEAD GEN</text>

  <!-- Divider line with hexagon accent -->
  <line x1="55" y1="148" x2="88" y2="148" stroke="#cc7700" stroke-width="0.8" opacity="0.7"/>
  <polygon points="103,145 107,148 103,151 99,148" fill="#ffaa00" opacity="0.9"/>
  <line x1="118" y1="148" x2="151" y2="148" stroke="#cc7700" stroke-width="0.8" opacity="0.7"/>

  <!-- Tagline -->
  <text x="103" y="162" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="300" font-size="7.5" fill="#cc8800" text-anchor="middle" letter-spacing="3" opacity="0.9">DISCOVER · ENRICH · CONNECT</text>

  <!-- Corner hex decorations -->
  <g opacity="0.15" fill="none" stroke="#ffaa00" stroke-width="1">
    <polygon points="12,168 18,164 24,168 24,176 18,180 12,176"/>
    <polygon points="276,168 282,164 288,168 288,176 282,180 276,176"/>
  </g>

  <!-- Bottom subtle glow line -->
  <rect x="40" y="186" width="126" height="1" rx="0.5" fill="#ffaa00" opacity="0.15"/>
</svg>` },
  { id: 38, title: "Crosshair Precision", concept: "tactical targeting reticle", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background radial glow -->
    <radialGradient id="bgGlow" cx="38%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#0a1a0a"/>
      <stop offset="100%" stop-color="#020804"/>
    </radialGradient>
    <!-- Center target glow -->
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ff41" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#00cc33" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#003300" stop-opacity="0"/>
    </radialGradient>
    <!-- Outer ring glow -->
    <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#001100" stop-opacity="0"/>
      <stop offset="85%" stop-color="#00ff41" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#003300" stop-opacity="0"/>
    </radialGradient>
    <!-- Text glow filter -->
    <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Reticle glow filter -->
    <filter id="reticleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Sharp center dot glow -->
    <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Clip for reticle area -->
    <clipPath id="reticleClip">
      <circle cx="83" cy="100" r="72"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGlow)"/>

  <!-- Grid overlay (tactical) -->
  <g opacity="0.07" stroke="#00ff41" stroke-width="0.4">
    <!-- Vertical lines -->
    <line x1="10" y1="0" x2="10" y2="200"/>
    <line x1="20" y1="0" x2="20" y2="200"/>
    <line x1="30" y1="0" x2="30" y2="200"/>
    <line x1="40" y1="0" x2="40" y2="200"/>
    <line x1="50" y1="0" x2="50" y2="200"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="70" y1="0" x2="70" y2="200"/>
    <line x1="80" y1="0" x2="80" y2="200"/>
    <line x1="90" y1="0" x2="90" y2="200"/>
    <line x1="100" y1="0" x2="100" y2="200"/>
    <line x1="110" y1="0" x2="110" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="130" y1="0" x2="130" y2="200"/>
    <line x1="140" y1="0" x2="140" y2="200"/>
    <line x1="150" y1="0" x2="150" y2="200"/>
    <line x1="160" y1="0" x2="160" y2="200"/>
    <line x1="170" y1="0" x2="170" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="190" y1="0" x2="190" y2="200"/>
    <line x1="200" y1="0" x2="200" y2="200"/>
    <line x1="210" y1="0" x2="210" y2="200"/>
    <line x1="220" y1="0" x2="220" y2="200"/>
    <line x1="230" y1="0" x2="230" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
    <line x1="250" y1="0" x2="250" y2="200"/>
    <line x1="260" y1="0" x2="260" y2="200"/>
    <line x1="270" y1="0" x2="270" y2="200"/>
    <line x1="280" y1="0" x2="280" y2="200"/>
    <line x1="290" y1="0" x2="290" y2="200"/>
    <!-- Horizontal lines -->
    <line x1="0" y1="10" x2="300" y2="10"/>
    <line x1="0" y1="20" x2="300" y2="20"/>
    <line x1="0" y1="30" x2="300" y2="30"/>
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="50" x2="300" y2="50"/>
    <line x1="0" y1="60" x2="300" y2="60"/>
    <line x1="0" y1="70" x2="300" y2="70"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="90" x2="300" y2="90"/>
    <line x1="0" y1="100" x2="300" y2="100"/>
    <line x1="0" y1="110" x2="300" y2="110"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="130" x2="300" y2="130"/>
    <line x1="0" y1="140" x2="300" y2="140"/>
    <line x1="0" y1="150" x2="300" y2="150"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="0" y1="170" x2="300" y2="170"/>
    <line x1="0" y1="180" x2="300" y2="180"/>
    <line x1="0" y1="190" x2="300" y2="190"/>
  </g>

  <!-- Ambient outer glow ring -->
  <circle cx="83" cy="100" r="72" fill="url(#outerGlow)"/>

  <!-- Reticle group -->
  <g filter="url(#reticleGlow)">
    <!-- Outer ring — dashed tactical -->
    <circle cx="83" cy="100" r="68" fill="none" stroke="#00ff41" stroke-width="0.8" stroke-opacity="0.35" stroke-dasharray="4,3"/>
    <!-- Ring 1 — main outer -->
    <circle cx="83" cy="100" r="62" fill="none" stroke="#00ff41" stroke-width="1.1" stroke-opacity="0.5"/>
    <!-- Ring 2 -->
    <circle cx="83" cy="100" r="50" fill="none" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.4" stroke-dasharray="8,4"/>
    <!-- Ring 3 -->
    <circle cx="83" cy="100" r="38" fill="none" stroke="#00ff41" stroke-width="1.3" stroke-opacity="0.65"/>
    <!-- Ring 4 — inner lock ring -->
    <circle cx="83" cy="100" r="24" fill="none" stroke="#00ff41" stroke-width="1.0" stroke-opacity="0.55" stroke-dasharray="5,3"/>
    <!-- Ring 5 — target lock inner -->
    <circle cx="83" cy="100" r="14" fill="none" stroke="#00ff41" stroke-width="1.6" stroke-opacity="0.85"/>

    <!-- Crosshair lines — full span with gap at center -->
    <!-- Horizontal left -->
    <line x1="15" y1="100" x2="67" y2="100" stroke="#00ff41" stroke-width="1.0" stroke-opacity="0.75"/>
    <!-- Horizontal right -->
    <line x1="99" y1="100" x2="151" y2="100" stroke="#00ff41" stroke-width="1.0" stroke-opacity="0.75"/>
    <!-- Vertical top -->
    <line x1="83" y1="32" x2="83" y2="84" stroke="#00ff41" stroke-width="1.0" stroke-opacity="0.75"/>
    <!-- Vertical bottom -->
    <line x1="83" y1="116" x2="83" y2="168" stroke="#00ff41" stroke-width="1.0" stroke-opacity="0.75"/>

    <!-- Tick marks at ring intersections — horizontal -->
    <line x1="20" y1="97" x2="20" y2="103" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="33" y1="97" x2="33" y2="103" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="45" y1="97" x2="45" y2="103" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="133" y1="97" x2="133" y2="103" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="121" y1="97" x2="121" y2="103" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="108" y1="97" x2="108" y2="103" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <!-- Tick marks — vertical -->
    <line x1="80" y1="38" x2="86" y2="38" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="80" y1="51" x2="86" y2="51" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="80" y1="62" x2="86" y2="62" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="80" y1="138" x2="86" y2="138" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="80" y1="149" x2="86" y2="149" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="80" y1="162" x2="86" y2="162" stroke="#00ff41" stroke-width="0.7" stroke-opacity="0.5"/>

    <!-- Corner bracket marks (45-degree positions) -->
    <!-- NW bracket -->
    <line x1="39" y1="56" x2="44" y2="51" stroke="#00ff41" stroke-width="0.8" stroke-opacity="0.45"/>
    <!-- NE bracket -->
    <line x1="122" y1="56" x2="127" y2="51" stroke="#00ff41" stroke-width="0.8" stroke-opacity="0.45"/>
    <!-- SW bracket -->
    <line x1="39" y1="144" x2="44" y2="149" stroke="#00ff41" stroke-width="0.8" stroke-opacity="0.45"/>
    <!-- SE bracket -->
    <line x1="122" y1="144" x2="127" y2="149" stroke="#00ff41" stroke-width="0.8" stroke-opacity="0.45"/>

    <!-- Inner target lock corners -->
    <path d="M70,87 L70,83 L74,83" fill="none" stroke="#00ff41" stroke-width="1.4" stroke-opacity="0.9"/>
    <path d="M96,87 L96,83 L92,83" fill="none" stroke="#00ff41" stroke-width="1.4" stroke-opacity="0.9"/>
    <path d="M70,113 L70,117 L74,117" fill="none" stroke="#00ff41" stroke-width="1.4" stroke-opacity="0.9"/>
    <path d="M96,113 L96,117 L92,117" fill="none" stroke="#00ff41" stroke-width="1.4" stroke-opacity="0.9"/>
  </g>

  <!-- Center glow -->
  <circle cx="83" cy="100" r="10" fill="url(#centerGlow)"/>

  <!-- Center dot -->
  <circle cx="83" cy="100" r="2.5" fill="#00ff41" filter="url(#dotGlow)" opacity="1"/>
  <circle cx="83" cy="100" r="1.2" fill="#aaffcc"/>

  <!-- HUD data overlays (clipped to reticle) -->
  <g clip-path="url(#reticleClip)" font-family="'Courier New', Courier, monospace" font-size="5" fill="#00ff41" opacity="0.45">
    <text x="22" y="74">ICP</text>
    <text x="118" y="74" text-anchor="end">LOCK</text>
    <text x="22" y="132">B2B</text>
    <text x="118" y="132" text-anchor="end">ON</text>
  </g>

  <!-- Outer HUD readouts -->
  <g font-family="'Courier New', Courier, monospace" font-size="5.5" fill="#00ff41" opacity="0.5">
    <text x="155" y="33">RNG: 00.00km</text>
    <text x="155" y="42">AZM: 090.0°</text>
    <text x="0" y="174">LAT: 52.3°N</text>
    <text x="0" y="182">LNG: 004.8°E</text>
    <!-- Lock confirmed indicator -->
    <text x="47" y="192" font-size="5" opacity="0.6">[ TARGET LOCKED ]</text>
  </g>

  <!-- Right side — wordmark -->
  <g filter="url(#textGlow)">
    <!-- AGENTIC -->
    <text
      x="165"
      y="88"
      font-family="'Courier New', Courier, monospace"
      font-size="22"
      font-weight="700"
      letter-spacing="3"
      fill="#00ff41"
      opacity="0.95"
    >AGENTIC</text>

    <!-- Separator line -->
    <line x1="165" y1="95" x2="295" y2="95" stroke="#00ff41" stroke-width="0.6" stroke-opacity="0.4"/>

    <!-- LEAD GEN -->
    <text
      x="165"
      y="115"
      font-family="'Courier New', Courier, monospace"
      font-size="20"
      font-weight="700"
      letter-spacing="2.5"
      fill="#00ff41"
      opacity="0.85"
    >LEAD GEN</text>

    <!-- Tagline -->
    <text
      x="165"
      y="132"
      font-family="'Courier New', Courier, monospace"
      font-size="6.5"
      letter-spacing="2.8"
      fill="#00cc33"
      opacity="0.65"
    >PRECISION · ICP · TARGETING</text>
  </g>

  <!-- Bottom status bar -->
  <rect x="0" y="188" width="300" height="12" fill="#000d00" opacity="0.7"/>
  <line x1="0" y1="188" x2="300" y2="188" stroke="#00ff41" stroke-width="0.4" stroke-opacity="0.3"/>
  <text x="8" y="196.5" font-family="'Courier New', Courier, monospace" font-size="5" fill="#00ff41" opacity="0.45" letter-spacing="1">SYS:ACTIVE</text>
  <text x="150" y="196.5" font-family="'Courier New', Courier, monospace" font-size="5" fill="#00ff41" opacity="0.45" letter-spacing="1" text-anchor="middle">MODE: ACQUISITION</text>
  <text x="292" y="196.5" font-family="'Courier New', Courier, monospace" font-size="5" fill="#00ff41" opacity="0.45" letter-spacing="1" text-anchor="end">v2.0</text>
</svg>` },
  { id: 39, title: "Clock Automaton", concept: "24/7 robot clock with contact markers", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark metallic background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a2535"/>
      <stop offset="100%" stop-color="#0a0f1a"/>
    </radialGradient>

    <!-- Clock face gradient - dark metallic silver-blue -->
    <radialGradient id="clockFace" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e2d42"/>
      <stop offset="70%" stop-color="#151f2e"/>
      <stop offset="100%" stop-color="#0d1520"/>
    </radialGradient>

    <!-- Metallic rim gradient -->
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6a8aaa"/>
      <stop offset="25%" stop-color="#3a5570"/>
      <stop offset="50%" stop-color="#8ab0d0"/>
      <stop offset="75%" stop-color="#2a4560"/>
      <stop offset="100%" stop-color="#5a7a9a"/>
    </linearGradient>

    <!-- Hour hand gradient (robotic arm) -->
    <linearGradient id="hourHandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4a7a9a"/>
      <stop offset="40%" stop-color="#8ab4d4"/>
      <stop offset="100%" stop-color="#3a6080"/>
    </linearGradient>

    <!-- Minute hand gradient (robotic arm) -->
    <linearGradient id="minHandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#5a8aaa"/>
      <stop offset="40%" stop-color="#9ac4e4"/>
      <stop offset="100%" stop-color="#2a5070"/>
    </linearGradient>

    <!-- Inner glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle glow for accent elements -->
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Center pivot gradient -->
    <radialGradient id="pivotGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c0d8f0"/>
      <stop offset="50%" stop-color="#6090b8"/>
      <stop offset="100%" stop-color="#304860"/>
    </radialGradient>

    <!-- Tick mark gradient -->
    <linearGradient id="tickGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7aaaca"/>
      <stop offset="100%" stop-color="#4a7090"/>
    </linearGradient>

    <!-- Person icon gradient -->
    <radialGradient id="personGrad" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#a0c8e8"/>
      <stop offset="100%" stop-color="#5090b8"/>
    </radialGradient>

    <!-- Scan line animation -->
    <clipPath id="clockClip">
      <circle cx="130" cy="100" r="78"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle grid lines on background -->
  <g opacity="0.04" stroke="#6090b0" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- =================== CLOCK =================== -->
  <!-- Clock center: cx=130, cy=100, r=78 -->

  <!-- Outer metallic bezel ring -->
  <circle cx="130" cy="100" r="84" fill="none" stroke="url(#rimGrad)" stroke-width="6" opacity="0.9"/>
  <!-- Bezel inner highlight -->
  <circle cx="130" cy="100" r="81" fill="none" stroke="#a0c0d8" stroke-width="0.5" opacity="0.3"/>
  <!-- Bezel outer shadow -->
  <circle cx="130" cy="100" r="87" fill="none" stroke="#0a1525" stroke-width="2" opacity="0.8"/>

  <!-- Secondary decorative ring -->
  <circle cx="130" cy="100" r="90" fill="none" stroke="#2a3d55" stroke-width="1.5" opacity="0.6"/>

  <!-- Clock face -->
  <circle cx="130" cy="100" r="78" fill="url(#clockFace)"/>

  <!-- Inner track ring -->
  <circle cx="130" cy="100" r="72" fill="none" stroke="#2a4060" stroke-width="0.8" opacity="0.5"/>
  <circle cx="130" cy="100" r="68" fill="none" stroke="#1e3050" stroke-width="0.4" opacity="0.4"/>

  <!-- Subtle radial lines on face -->
  <g opacity="0.06" stroke="#5080a0" stroke-width="0.4">
    <line x1="130" y1="22" x2="130" y2="178"/>
    <line x1="52" y1="100" x2="208" y2="100"/>
    <line x1="75" y1="45" x2="185" y2="155"/>
    <line x1="75" y1="155" x2="185" y2="45"/>
  </g>

  <!-- ====== HOUR MARKERS AS PERSON/CONTACT ICONS ====== -->
  <!-- 12 person icons at each hour position (radius ~62 from center) -->

  <!-- Person icon helper: head (circle) + body (arc/path) -->
  <!-- 12 o'clock: (130, 38) -->
  <g transform="translate(130, 38)" filter="url(#softGlow)">
    <circle cy="-6" r="4" fill="url(#personGrad)" opacity="0.95"/>
    <path d="M-5,0 Q-6,6 -4,9 L4,9 Q6,6 5,0 Q2,-2 -2,-2 Q-4,-1 -5,0 Z" fill="url(#personGrad)" opacity="0.85"/>
    <!-- Tiny circuit dot -->
    <circle cy="-6" r="1" fill="#c0e0f8" opacity="0.6"/>
  </g>

  <!-- 1 o'clock: 30deg from 12 => (130+62*sin30, 100-62*cos30) = (161, 46.3) -->
  <g transform="translate(161, 46)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 2 o'clock: 60deg => (183.7, 69) -->
  <g transform="translate(184, 69)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 3 o'clock: 90deg => (192, 100) -->
  <g transform="translate(192, 100)" filter="url(#softGlow)">
    <circle cy="-6" r="4" fill="url(#personGrad)" opacity="0.95"/>
    <path d="M-5,0 Q-6,6 -4,9 L4,9 Q6,6 5,0 Q2,-2 -2,-2 Q-4,-1 -5,0 Z" fill="url(#personGrad)" opacity="0.85"/>
    <circle cy="-6" r="1" fill="#c0e0f8" opacity="0.6"/>
  </g>

  <!-- 4 o'clock: 120deg => (183.7, 131) -->
  <g transform="translate(184, 131)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 5 o'clock: 150deg => (161, 153.7) -->
  <g transform="translate(161, 154)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 6 o'clock: 180deg => (130, 162) -->
  <g transform="translate(130, 162)" filter="url(#softGlow)">
    <circle cy="-6" r="4" fill="url(#personGrad)" opacity="0.95"/>
    <path d="M-5,0 Q-6,6 -4,9 L4,9 Q6,6 5,0 Q2,-2 -2,-2 Q-4,-1 -5,0 Z" fill="url(#personGrad)" opacity="0.85"/>
    <circle cy="-6" r="1" fill="#c0e0f8" opacity="0.6"/>
  </g>

  <!-- 7 o'clock: 210deg => (99, 153.7) -->
  <g transform="translate(99, 154)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 8 o'clock: 240deg => (76.3, 131) -->
  <g transform="translate(76, 131)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 9 o'clock: 270deg => (68, 100) -->
  <g transform="translate(68, 100)" filter="url(#softGlow)">
    <circle cy="-6" r="4" fill="url(#personGrad)" opacity="0.95"/>
    <path d="M-5,0 Q-6,6 -4,9 L4,9 Q6,6 5,0 Q2,-2 -2,-2 Q-4,-1 -5,0 Z" fill="url(#personGrad)" opacity="0.85"/>
    <circle cy="-6" r="1" fill="#c0e0f8" opacity="0.6"/>
  </g>

  <!-- 10 o'clock: 300deg => (76.3, 69) -->
  <g transform="translate(76, 69)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- 11 o'clock: 330deg => (99, 46.3) -->
  <g transform="translate(99, 46)" filter="url(#softGlow)">
    <circle cy="-5" r="3.5" fill="url(#personGrad)" opacity="0.85"/>
    <path d="M-4.5,0 Q-5.5,5 -3.5,8 L3.5,8 Q5.5,5 4.5,0 Q2,-1.5 -1.5,-1.5 Q-3.5,-0.8 -4.5,0 Z" fill="url(#personGrad)" opacity="0.75"/>
  </g>

  <!-- ====== MINOR TICK MARKS (between hours) ====== -->
  <g stroke="url(#tickGrad)" stroke-width="0.8" opacity="0.35">
    <!-- 5-minute marks, skipping hour positions -->
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(6, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(12, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(18, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(24, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(36, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(42, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(48, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(54, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(66, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(72, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(78, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(84, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(96, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(102, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(108, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(114, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(126, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(132, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(138, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(144, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(156, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(162, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(168, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(174, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(186, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(192, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(198, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(204, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(216, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(222, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(228, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(234, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(246, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(252, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(258, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(264, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(276, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(282, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(288, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(294, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(306, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(312, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(318, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(324, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(336, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(342, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(348, 130, 100)"/>
    <line x1="130" y1="25" x2="130" y2="30" transform="rotate(354, 130, 100)"/>
  </g>

  <!-- ====== HOUR HAND — ROBOTIC ARM (pointing ~10 o'clock = 300deg from 12) ====== -->
  <!-- Rotated -60deg (10 o'clock position): from center 130,100 upward-left -->
  <g transform="rotate(-60, 130, 100)">
    <!-- Upper arm segment with mechanical detail -->
    <rect x="126" y="58" width="8" height="32" rx="2" fill="url(#hourHandGrad)" opacity="0.95"/>
    <!-- Arm segment highlight -->
    <rect x="127.5" y="60" width="2" height="28" rx="1" fill="#b0d0f0" opacity="0.4"/>
    <!-- Joint connector at elbow -->
    <rect x="124" y="86" width="12" height="8" rx="2" fill="#6090b8" opacity="0.9"/>
    <circle cx="130" cy="90" r="3" fill="#8ab0d0" opacity="0.8"/>
    <!-- Lower arm segment - forearm -->
    <rect x="127" y="90" width="6" height="22" rx="1.5" fill="url(#hourHandGrad)" opacity="0.9"/>
    <!-- Mechanical claw/gripper at tip -->
    <path d="M125,112 L128,108 L130,106 L132,108 L135,112 L133,114 L130,110 L127,114 Z" fill="#7aaaca" opacity="0.85"/>
    <!-- Claw prongs -->
    <line x1="127" y1="112" x2="124" y2="116" stroke="#5a8aaa" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="133" y1="112" x2="136" y2="116" stroke="#5a8aaa" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="130" y1="112" x2="130" y2="117" stroke="#7aaaca" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Hydraulic piston detail -->
    <rect x="129" y="94" width="2" height="12" rx="1" fill="#a0c8e8" opacity="0.5"/>
    <!-- Rivets/bolts on hour arm -->
    <circle cx="130" cy="62" r="1.5" fill="#90b8d8" opacity="0.7"/>
    <circle cx="130" cy="70" r="1.5" fill="#90b8d8" opacity="0.7"/>
    <circle cx="130" cy="78" r="1.5" fill="#90b8d8" opacity="0.7"/>
  </g>

  <!-- ====== MINUTE HAND — ROBOTIC ARM (pointing ~2 o'clock = 60deg from 12) ====== -->
  <!-- Rotated +60deg (2 o'clock): longer and slightly thinner -->
  <g transform="rotate(60, 130, 100)">
    <!-- Upper arm segment -->
    <rect x="127.5" y="44" width="5" height="38" rx="1.5" fill="url(#minHandGrad)" opacity="0.95"/>
    <!-- Arm highlight -->
    <rect x="128.5" y="46" width="1.5" height="34" rx="0.75" fill="#c0e0f8" opacity="0.35"/>
    <!-- Elbow joint -->
    <rect x="125.5" y="78" width="9" height="7" rx="2" fill="#5080a0" opacity="0.9"/>
    <circle cx="130" cy="81.5" r="2.5" fill="#80aace" opacity="0.8"/>
    <!-- Forearm -->
    <rect x="128" y="81" width="4" height="24" rx="1" fill="url(#minHandGrad)" opacity="0.9"/>
    <!-- Mechanical gripper tip -->
    <path d="M126,105 L129,101 L130,99.5 L131,101 L134,105 L132.5,107 L130,103 L127.5,107 Z" fill="#6aaaca" opacity="0.88"/>
    <!-- Gripper prongs - fine -->
    <line x1="127.5" y1="105" x2="125" y2="109" stroke="#4a7a9a" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="132.5" y1="105" x2="135" y2="109" stroke="#4a7a9a" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="130" y1="105" x2="130" y2="109.5" stroke="#6aaaca" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Pistons/segments -->
    <rect x="129" y="85" width="2" height="14" rx="1" fill="#a0c8e8" opacity="0.4"/>
    <!-- Rivets -->
    <circle cx="130" cy="47" r="1.2" fill="#90b8d8" opacity="0.7"/>
    <circle cx="130" cy="55" r="1.2" fill="#90b8d8" opacity="0.7"/>
    <circle cx="130" cy="63" r="1.2" fill="#90b8d8" opacity="0.7"/>
    <circle cx="130" cy="71" r="1.2" fill="#90b8d8" opacity="0.7"/>
  </g>

  <!-- ====== CENTER PIVOT — MECHANICAL HUB ====== -->
  <circle cx="130" cy="100" r="10" fill="#1a2d45" stroke="#5080a0" stroke-width="1.5"/>
  <circle cx="130" cy="100" r="7" fill="url(#pivotGrad)"/>
  <!-- Gear teeth around pivot -->
  <g fill="#304860" stroke="#5080a0" stroke-width="0.5">
    <rect x="128.5" y="88" width="3" height="4" rx="0.5"/>
    <rect x="128.5" y="108" width="3" height="4" rx="0.5"/>
    <rect x="118" y="98.5" width="4" height="3" rx="0.5"/>
    <rect x="138" y="98.5" width="4" height="3" rx="0.5"/>
    <rect x="122" y="91" width="3" height="3" rx="0.5" transform="rotate(45, 123.5, 92.5)"/>
    <rect x="136" y="91" width="3" height="3" rx="0.5" transform="rotate(-45, 137.5, 92.5)"/>
    <rect x="122" y="106" width="3" height="3" rx="0.5" transform="rotate(-45, 123.5, 107.5)"/>
    <rect x="136" y="106" width="3" height="3" rx="0.5" transform="rotate(45, 137.5, 107.5)"/>
  </g>
  <!-- Center dot -->
  <circle cx="130" cy="100" r="3" fill="#c0d8f0"/>
  <circle cx="130" cy="100" r="1.2" fill="#e8f4ff"/>

  <!-- ====== 24/7 TEXT INSIDE CLOCK ====== -->
  <!-- Positioned below center, styled metallic -->
  <text x="130" y="136" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="8.5" font-weight="700" letter-spacing="2" fill="#4a7090" opacity="0.7">24 / 7</text>

  <!-- ====== DECORATIVE CIRCUIT TRACES (outer ring) ====== -->
  <!-- Top arc trace -->
  <path d="M 98,30 L 94,26 L 90,26" fill="none" stroke="#3a6080" stroke-width="0.8" opacity="0.5" clip-path="url(#clockClip)"/>
  <!-- Bottom arc trace -->
  <path d="M 162,170 L 166,174 L 170,174" fill="none" stroke="#3a6080" stroke-width="0.8" opacity="0.5" clip-path="url(#clockClip)"/>
  <!-- Right trace -->
  <path d="M 205,82 L 210,82 L 214,78" fill="none" stroke="#3a6080" stroke-width="0.8" opacity="0.5"/>
  <!-- Left trace -->
  <path d="M 55,118 L 50,118 L 46,122" fill="none" stroke="#3a6080" stroke-width="0.8" opacity="0.5"/>

  <!-- Outer circuit nodes -->
  <circle cx="214" cy="78" r="2" fill="none" stroke="#4a7090" stroke-width="0.8" opacity="0.5"/>
  <circle cx="46" cy="122" r="2" fill="none" stroke="#4a7090" stroke-width="0.8" opacity="0.5"/>

  <!-- =================== RIGHT PANEL: TEXT =================== -->

  <!-- Main brand name -->
  <text x="224" y="82" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="13.5" font-weight="800" letter-spacing="0.5" fill="#8ab4d4">AGENTIC</text>

  <!-- Thin separator line -->
  <line x1="192" y1="87" x2="256" y2="87" stroke="#3a6080" stroke-width="0.8" opacity="0.6"/>

  <!-- Sub-label: LEAD GEN -->
  <text x="224" y="100" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="#6090b0">LEAD GEN</text>

  <!-- Tag line -->
  <text x="224" y="116" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="6" font-weight="400" letter-spacing="1.8" fill="#3d6080" opacity="0.9">TIME AUTOMATION</text>

  <!-- Decorative accent dots -->
  <circle cx="195" cy="100" r="1.2" fill="#4a7090" opacity="0.6"/>
  <circle cx="253" cy="100" r="1.2" fill="#4a7090" opacity="0.6"/>

  <!-- Tagline bottom -->
  <text x="224" y="128" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="5.5" font-weight="400" letter-spacing="2" fill="#2d5070" opacity="0.8">AUTONOMOUS PIPELINE</text>

  <!-- Bottom accent bar -->
  <line x1="192" y1="134" x2="256" y2="134" stroke="#2a4a68" stroke-width="0.6" opacity="0.5"/>

  <!-- Version / product tag -->
  <text x="224" y="144" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="5" font-weight="300" letter-spacing="1.5" fill="#2a4060" opacity="0.7">AI · AGENTS · ML</text>

  <!-- Subtle corner decoration top-right -->
  <path d="M260,8 L290,8 L290,38" fill="none" stroke="#2a4060" stroke-width="0.8" opacity="0.4"/>
  <path d="M8,162 L8,192 L38,192" fill="none" stroke="#2a4060" stroke-width="0.8" opacity="0.4"/>
  <!-- Corner dots -->
  <circle cx="290" cy="8" r="1.5" fill="#3a6080" opacity="0.4"/>
  <circle cx="8" cy="192" r="1.5" fill="#3a6080" opacity="0.4"/>

  <!-- Subtle scan line effect across clock face -->
  <rect x="52" y="22" width="156" height="156" rx="78" fill="none" stroke="#7aaaca" stroke-width="0.3" opacity="0.08"/>
  <line x1="52" y1="96" x2="208" y2="96" stroke="#7aaaca" stroke-width="0.3" opacity="0.05" clip-path="url(#clockClip)"/>
  <line x1="52" y1="104" x2="208" y2="104" stroke="#7aaaca" stroke-width="0.3" opacity="0.05" clip-path="url(#clockClip)"/>
</svg>` },
  { id: 40, title: "Tornado Funnel", concept: "vortex funnel pulling in companies", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0e1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1f2e;stop-opacity:1" />
    </linearGradient>
    <!-- Tornado funnel gradient -->
    <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2d3748;stop-opacity:0.9" />
      <stop offset="50%" style="stop-color:#4a5568;stop-opacity:0.85" />
      <stop offset="100%" style="stop-color:#1a202c;stop-opacity:0.95" />
    </linearGradient>
    <!-- Electric blue glow -->
    <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="strongGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feFlood flood-color="#00b4ff" flood-opacity="0.6" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="iconGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feFlood flood-color="#00d4ff" flood-opacity="0.5" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Storm cloud gradient -->
    <radialGradient id="cloudGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#3d4a5c;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#2a3344;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a2030;stop-opacity:1" />
    </radialGradient>
    <!-- Vortex swirl gradient -->
    <radialGradient id="vortexGrad" cx="50%" cy="20%" r="80%">
      <stop offset="0%" style="stop-color:#00b4ff;stop-opacity:0.15" />
      <stop offset="40%" style="stop-color:#0066cc;stop-opacity:0.08" />
      <stop offset="100%" style="stop-color:#001133;stop-opacity:0" />
    </radialGradient>
    <!-- Lead point gradient -->
    <radialGradient id="leadGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#0088ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0044cc;stop-opacity:1" />
    </radialGradient>
    <clipPath id="funnelClip">
      <polygon points="60,18 240,18 175,148 125,148" />
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8" />

  <!-- Storm cloud mass at top -->
  <ellipse cx="150" cy="22" rx="110" ry="22" fill="url(#cloudGrad)" opacity="0.95" />
  <ellipse cx="105" cy="16" rx="55" ry="18" fill="#3a4555" opacity="0.8" />
  <ellipse cx="195" cy="16" rx="55" ry="18" fill="#3a4555" opacity="0.8" />
  <ellipse cx="150" cy="14" rx="70" ry="16" fill="#4a5568" opacity="0.7" />

  <!-- Vortex ambient glow -->
  <ellipse cx="150" cy="30" rx="90" ry="25" fill="url(#vortexGrad)" />

  <!-- TORNADO FUNNEL BODY — layered spiral bands -->
  <!-- Outermost funnel shape -->
  <polygon points="55,20 245,20 172,145 128,145" fill="#2d3a4a" opacity="0.7" />
  <!-- Inner funnel layers creating depth -->
  <polygon points="75,25 225,25 168,138 132,138" fill="#344155" opacity="0.5" />
  <polygon points="92,30 208,30 164,130 136,130" fill="#3d4d60" opacity="0.4" />
  <polygon points="108,36 192,36 160,122 140,122" fill="#4a5a6e" opacity="0.35" />

  <!-- Rotating swirl lines — wide top, narrow bottom -->
  <!-- Left spiral bands -->
  <path d="M68,22 Q95,45 108,72 Q118,95 128,118 Q131,130 129,143" stroke="#00aaee" stroke-width="1.2" fill="none" opacity="0.55" stroke-dasharray="4,3" />
  <path d="M82,20 Q105,42 115,68 Q124,92 131,115 Q133,128 130,144" stroke="#0088cc" stroke-width="0.9" fill="none" opacity="0.4" stroke-dasharray="3,4" />
  <path d="M100,19 Q118,40 124,64 Q130,88 134,112 Q136,127 132,144" stroke="#00ccff" stroke-width="0.8" fill="none" opacity="0.35" stroke-dasharray="2,5" />
  <!-- Right spiral bands -->
  <path d="M232,22 Q205,45 192,72 Q182,95 172,118 Q169,130 171,143" stroke="#00aaee" stroke-width="1.2" fill="none" opacity="0.55" stroke-dasharray="4,3" />
  <path d="M218,20 Q195,42 185,68 Q176,92 169,115 Q167,128 170,144" stroke="#0088cc" stroke-width="0.9" fill="none" opacity="0.4" stroke-dasharray="3,4" />
  <path d="M200,19 Q182,40 176,64 Q170,88 166,112 Q164,127 168,144" stroke="#00ccff" stroke-width="0.8" fill="none" opacity="0.35" stroke-dasharray="2,5" />
  <!-- Central vortex pull lines -->
  <path d="M150,20 Q152,55 151,88 Q150,115 150,143" stroke="#00d4ff" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="3,3" />
  <path d="M135,21 Q140,56 143,90 Q146,117 149,143" stroke="#00b4ff" stroke-width="0.8" fill="none" opacity="0.4" stroke-dasharray="2,4" />
  <path d="M165,21 Q160,56 157,90 Q154,117 151,143" stroke="#00b4ff" stroke-width="0.8" fill="none" opacity="0.4" stroke-dasharray="2,4" />

  <!-- Horizontal vortex rings (motion lines) -->
  <ellipse cx="150" cy="38" rx="78" ry="5" fill="none" stroke="#5a6e82" stroke-width="1.2" opacity="0.6" />
  <ellipse cx="150" cy="55" rx="62" ry="4" fill="none" stroke="#4d6275" stroke-width="1" opacity="0.55" />
  <ellipse cx="150" cy="70" rx="50" ry="3.5" fill="none" stroke="#406070" stroke-width="0.9" opacity="0.5" />
  <ellipse cx="150" cy="85" rx="40" ry="3" fill="none" stroke="#385e6e" stroke-width="0.9" opacity="0.45" />
  <ellipse cx="150" cy="100" rx="31" ry="2.5" fill="none" stroke="#305c6c" stroke-width="0.8" opacity="0.4" />
  <ellipse cx="150" cy="115" rx="23" ry="2" fill="none" stroke="#285a6a" stroke-width="0.8" opacity="0.38" />
  <ellipse cx="150" cy="128" rx="16" ry="1.5" fill="none" stroke="#205868" stroke-width="0.7" opacity="0.35" />

  <!-- Company icons being sucked into vortex -->
  <!-- Top-left: building/company icon -->
  <g transform="translate(72,24) rotate(-12)" filter="url(#iconGlow)" opacity="0.88">
    <rect x="0" y="4" width="14" height="11" rx="1" fill="#2a4a6a" stroke="#00aaff" stroke-width="1.2" />
    <rect x="2" y="6" width="2.5" height="2.5" fill="#00ccff" opacity="0.8" />
    <rect x="5.5" y="6" width="2.5" height="2.5" fill="#00ccff" opacity="0.8" />
    <rect x="9" y="6" width="2.5" height="2.5" fill="#00ccff" opacity="0.8" />
    <rect x="2" y="10" width="2.5" height="2.5" fill="#00aaff" opacity="0.7" />
    <rect x="5.5" y="10" width="2.5" height="2.5" fill="#00aaff" opacity="0.7" />
    <rect x="4.5" y="11" width="5" height="4" fill="#1a3a5a" stroke="#0088dd" stroke-width="0.8" />
    <polygon points="7,0 14,4 0,4" fill="#3a5a7a" stroke="#00aaff" stroke-width="1" />
  </g>
  <!-- Top-right: circuit/tech icon -->
  <g transform="translate(202,22) rotate(10)" filter="url(#iconGlow)" opacity="0.85">
    <rect x="0" y="0" width="14" height="14" rx="2" fill="#1a3a2a" stroke="#00ffaa" stroke-width="1.2" />
    <circle cx="4" cy="4" r="1.5" fill="#00ffaa" opacity="0.9" />
    <circle cx="10" cy="4" r="1.5" fill="#00ffaa" opacity="0.9" />
    <circle cx="4" cy="10" r="1.5" fill="#00dd88" opacity="0.8" />
    <circle cx="10" cy="10" r="1.5" fill="#00dd88" opacity="0.8" />
    <line x1="4" y1="4" x2="10" y2="4" stroke="#00cc88" stroke-width="0.8" opacity="0.7" />
    <line x1="4" y1="4" x2="4" y2="10" stroke="#00cc88" stroke-width="0.8" opacity="0.7" />
    <line x1="10" y1="4" x2="10" y2="10" stroke="#00cc88" stroke-width="0.8" opacity="0.7" />
    <line x1="4" y1="10" x2="10" y2="10" stroke="#00cc88" stroke-width="0.8" opacity="0.7" />
    <circle cx="7" cy="7" r="2" fill="none" stroke="#00ffcc" stroke-width="1" />
  </g>
  <!-- Mid-left: globe/world icon -->
  <g transform="translate(88,44) rotate(-6)" filter="url(#iconGlow)" opacity="0.82">
    <circle cx="7" cy="7" r="6.5" fill="#1a2a4a" stroke="#44aaff" stroke-width="1.2" />
    <ellipse cx="7" cy="7" rx="3" ry="6.5" fill="none" stroke="#44aaff" stroke-width="0.8" opacity="0.7" />
    <line x1="0.5" y1="7" x2="13.5" y2="7" stroke="#44aaff" stroke-width="0.8" opacity="0.7" />
    <line x1="1.5" y1="4" x2="12.5" y2="4" stroke="#44aaff" stroke-width="0.6" opacity="0.5" />
    <line x1="1.5" y1="10" x2="12.5" y2="10" stroke="#44aaff" stroke-width="0.6" opacity="0.5" />
  </g>
  <!-- Mid-right: graph/chart icon -->
  <g transform="translate(196,46) rotate(8)" filter="url(#iconGlow)" opacity="0.8">
    <rect x="0" y="0" width="14" height="12" rx="1.5" fill="#2a1a4a" stroke="#aa44ff" stroke-width="1.2" />
    <rect x="2" y="8" width="2.5" height="3" fill="#aa44ff" opacity="0.85" />
    <rect x="5.5" y="5" width="2.5" height="6" fill="#cc66ff" opacity="0.85" />
    <rect x="9" y="3" width="2.5" height="8" fill="#aa44ff" opacity="0.85" />
    <polyline points="3.25,7.5 6.75,4.5 10.25,2.5" fill="none" stroke="#ff88ff" stroke-width="1" opacity="0.7" />
  </g>
  <!-- Upper-center-left: magnifying glass -->
  <g transform="translate(120,28) rotate(-4)" filter="url(#iconGlow)" opacity="0.78">
    <circle cx="5" cy="5" r="4.5" fill="none" stroke="#00ccff" stroke-width="1.5" />
    <circle cx="5" cy="5" r="2.5" fill="#0a2030" stroke="none" />
    <line x1="8.2" y1="8.2" x2="11.5" y2="11.5" stroke="#00ccff" stroke-width="1.8" stroke-linecap="round" />
  </g>
  <!-- Upper-center-right: people/contacts icon -->
  <g transform="translate(165,27) rotate(5)" filter="url(#iconGlow)" opacity="0.78">
    <circle cx="5" cy="3.5" r="2.5" fill="#2a3a5a" stroke="#88ccff" stroke-width="1.1" />
    <path d="M0,11 Q0,7 5,7 Q10,7 10,11" fill="#2a3a5a" stroke="#88ccff" stroke-width="1.1" />
    <circle cx="11" cy="4" r="2" fill="#1a2a4a" stroke="#66aaff" stroke-width="0.9" />
    <path d="M7,11.5 Q7.5,8.5 11,8.5 Q14,8.5 14,11.5" fill="#1a2a4a" stroke="#66aaff" stroke-width="0.9" />
  </g>
  <!-- Lower-left: AI/brain icon -->
  <g transform="translate(100,72) rotate(-8)" filter="url(#iconGlow)" opacity="0.72">
    <ellipse cx="7" cy="6.5" rx="6" ry="6" fill="#1a2a1a" stroke="#44ff88" stroke-width="1.2" />
    <line x1="4" y1="3" x2="4" y2="5" stroke="#44ff88" stroke-width="0.8" opacity="0.8" />
    <line x1="7" y1="2" x2="7" y2="4" stroke="#44ff88" stroke-width="0.8" opacity="0.8" />
    <line x1="10" y1="3" x2="10" y2="5" stroke="#44ff88" stroke-width="0.8" opacity="0.8" />
    <line x1="3" y1="6.5" x2="11" y2="6.5" stroke="#44ff88" stroke-width="1" opacity="0.7" />
    <line x1="4" y1="8" x2="4" y2="10" stroke="#44ff88" stroke-width="0.8" opacity="0.8" />
    <line x1="7" y1="9" x2="7" y2="11" stroke="#44ff88" stroke-width="0.8" opacity="0.8" />
    <line x1="10" y1="8" x2="10" y2="10" stroke="#44ff88" stroke-width="0.8" opacity="0.8" />
  </g>
  <!-- Lower-right: dollar/value icon -->
  <g transform="translate(178,74) rotate(9)" filter="url(#iconGlow)" opacity="0.7">
    <circle cx="7" cy="7" r="6.5" fill="#2a2a0a" stroke="#ffcc00" stroke-width="1.2" />
    <text x="7" y="11" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffcc00" font-family="Arial, sans-serif">$</text>
  </g>
  <!-- Deeper funnel: small icons being compressed -->
  <g transform="translate(133,100) rotate(-3) scale(0.75)" filter="url(#iconGlow)" opacity="0.6">
    <rect x="0" y="0" width="10" height="10" rx="1.5" fill="#1a2a3a" stroke="#0088cc" stroke-width="1" />
    <rect x="1.5" y="1.5" width="2.5" height="2.5" fill="#0088cc" opacity="0.8" />
    <rect x="6" y="1.5" width="2.5" height="2.5" fill="#0088cc" opacity="0.8" />
    <rect x="1.5" y="6" width="2.5" height="2.5" fill="#0066aa" opacity="0.7" />
    <rect x="6" y="6" width="2.5" height="2.5" fill="#0066aa" opacity="0.7" />
  </g>
  <g transform="translate(155,102) rotate(4) scale(0.7)" filter="url(#iconGlow)" opacity="0.58">
    <circle cx="6" cy="6" r="5.5" fill="#1a1a2a" stroke="#6644ff" stroke-width="1" />
    <line x1="6" y1="2" x2="6" y2="10" stroke="#6644ff" stroke-width="0.9" opacity="0.8" />
    <line x1="2" y1="6" x2="10" y2="6" stroke="#6644ff" stroke-width="0.9" opacity="0.8" />
  </g>

  <!-- LIGHTNING BOLTS -->
  <!-- Left lightning -->
  <polyline points="82,25 76,40 83,40 74,58" stroke="#00d4ff" stroke-width="2.2" fill="none" filter="url(#strongGlow)" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="82,25 76,40 83,40 74,58" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.9" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Right lightning -->
  <polyline points="218,25 224,40 217,40 226,58" stroke="#00d4ff" stroke-width="2.2" fill="none" filter="url(#strongGlow)" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="218,25 224,40 217,40 226,58" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.9" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Small interior lightning left -->
  <polyline points="115,52 111,62 116,61 110,75" stroke="#44ccff" stroke-width="1.4" fill="none" filter="url(#blueGlow)" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="115,52 111,62 116,61 110,75" stroke="#ccf0ff" stroke-width="0.5" fill="none" opacity="0.7" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Small interior lightning right -->
  <polyline points="185,52 189,62 184,61 190,75" stroke="#44ccff" stroke-width="1.4" fill="none" filter="url(#blueGlow)" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="185,52 189,62 184,61 190,75" stroke="#ccf0ff" stroke-width="0.5" fill="none" opacity="0.7" stroke-linecap="round" stroke-linejoin="round" />

  <!-- FUNNEL OUTLINE — strong electric blue edges -->
  <line x1="58" y1="19" x2="129" y2="146" stroke="#0099ff" stroke-width="2" opacity="0.75" filter="url(#blueGlow)" />
  <line x1="242" y1="19" x2="171" y2="146" stroke="#0099ff" stroke-width="2" opacity="0.75" filter="url(#blueGlow)" />
  <!-- Inner highlight edges -->
  <line x1="72" y1="20" x2="133" y2="140" stroke="#44bbff" stroke-width="0.8" opacity="0.45" />
  <line x1="228" y1="20" x2="167" y2="140" stroke="#44bbff" stroke-width="0.8" opacity="0.45" />

  <!-- LEAD POINT at bottom — concentrated energy burst -->
  <!-- Glow halo -->
  <ellipse cx="150" cy="150" rx="22" ry="10" fill="#0044aa" opacity="0.25" />
  <ellipse cx="150" cy="150" rx="14" ry="6" fill="#0066cc" opacity="0.35" />
  <!-- Stem -->
  <line x1="150" y1="146" x2="150" y2="158" stroke="#00aaff" stroke-width="3" stroke-linecap="round" filter="url(#blueGlow)" />
  <!-- Point diamond -->
  <polygon points="150,165 144,153 150,148 156,153" fill="url(#leadGrad)" filter="url(#strongGlow)" />
  <polygon points="150,165 144,153 150,148 156,153" fill="none" stroke="#88eeff" stroke-width="0.8" opacity="0.8" />
  <!-- Sparkle at point -->
  <circle cx="150" cy="165" r="1.8" fill="#00ffff" filter="url(#strongGlow)" />
  <!-- Energy rays from point -->
  <line x1="150" y1="167" x2="148" y2="174" stroke="#00ccff" stroke-width="0.9" opacity="0.6" />
  <line x1="150" y1="167" x2="152" y2="174" stroke="#00ccff" stroke-width="0.9" opacity="0.6" />
  <line x1="150" y1="167" x2="144" y2="172" stroke="#0099ff" stroke-width="0.7" opacity="0.5" />
  <line x1="150" y1="167" x2="156" y2="172" stroke="#0099ff" stroke-width="0.7" opacity="0.5" />

  <!-- TEXT: "Agentic Lead Gen" -->
  <text x="150" y="188" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" fill="#e8f4ff" filter="url(#blueGlow)">AGENTIC LEAD GEN</text>
  <!-- Subtle underline accent -->
  <line x1="62" y1="192" x2="238" y2="192" stroke="#0077cc" stroke-width="0.6" opacity="0.5" />

  <!-- Top cloud highlight shimmer -->
  <ellipse cx="130" cy="13" rx="35" ry="6" fill="#5a6a7a" opacity="0.4" />
  <ellipse cx="170" cy="11" rx="25" ry="5" fill="#6a7a8a" opacity="0.3" />

  <!-- Ambient electric particles in funnel -->
  <circle cx="112" cy="62" r="1.2" fill="#00ddff" opacity="0.7" />
  <circle cx="185" cy="65" r="1.2" fill="#00ddff" opacity="0.65" />
  <circle cx="130" cy="88" r="1" fill="#00bbff" opacity="0.6" />
  <circle cx="170" cy="91" r="1" fill="#00bbff" opacity="0.55" />
  <circle cx="143" cy="112" r="0.9" fill="#0099ee" opacity="0.55" />
  <circle cx="158" cy="114" r="0.9" fill="#0099ee" opacity="0.5" />
  <circle cx="150" cy="130" r="0.8" fill="#0088dd" opacity="0.5" />
  <circle cx="95" cy="45" r="1.3" fill="#22eeff" opacity="0.6" />
  <circle cx="205" cy="48" r="1.3" fill="#22eeff" opacity="0.55" />
</svg>` },
  { id: 41, title: "Spiderweb Mesh", concept: "geometric web with ALG at center", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#000005"/>
    </radialGradient>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8e8f0" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#e8e8f0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c8c8d8" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#9090a8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#606078" stop-opacity="0"/>
    </radialGradient>
    <filter id="silkGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="centerFilter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="nodeFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="viewClip">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Center ambient glow -->
  <ellipse cx="150" cy="100" rx="90" ry="60" fill="url(#centerGlow)"/>

  <g clip-path="url(#viewClip)">

    <!-- ═══════════════════════════════════════════
         RADIAL SPOKES (silk threads from center)
         8 directions, varying opacity by distance
    ════════════════════════════════════════════ -->
    <g filter="url(#silkGlow)" stroke-linecap="round">

      <!-- Spoke 0° (right) -->
      <line x1="150" y1="100" x2="295" y2="100" stroke="#d0d0e0" stroke-width="0.5" opacity="0.55"/>
      <!-- Spoke 45° (lower-right) -->
      <line x1="150" y1="100" x2="276" y2="176" stroke="#d0d0e0" stroke-width="0.5" opacity="0.45"/>
      <!-- Spoke 90° (down) -->
      <line x1="150" y1="100" x2="150" y2="198" stroke="#d0d0e0" stroke-width="0.5" opacity="0.55"/>
      <!-- Spoke 135° (lower-left) -->
      <line x1="150" y1="100" x2="24" y2="176" stroke="#d0d0e0" stroke-width="0.5" opacity="0.45"/>
      <!-- Spoke 180° (left) -->
      <line x1="150" y1="100" x2="5" y2="100" stroke="#d0d0e0" stroke-width="0.5" opacity="0.55"/>
      <!-- Spoke 225° (upper-left) -->
      <line x1="150" y1="100" x2="24" y2="24" stroke="#d0d0e0" stroke-width="0.5" opacity="0.45"/>
      <!-- Spoke 270° (up) -->
      <line x1="150" y1="100" x2="150" y2="2" stroke="#d0d0e0" stroke-width="0.5" opacity="0.55"/>
      <!-- Spoke 315° (upper-right) -->
      <line x1="150" y1="100" x2="276" y2="24" stroke="#d0d0e0" stroke-width="0.5" opacity="0.45"/>

      <!-- ─── Half-angle spokes (22.5° offsets) ─── -->
      <!-- 22.5° -->
      <line x1="150" y1="100" x2="288" y2="45" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 67.5° -->
      <line x1="150" y1="100" x2="205" y2="192" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 112.5° -->
      <line x1="150" y1="100" x2="95" y2="192" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 157.5° -->
      <line x1="150" y1="100" x2="12" y2="45" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 202.5° -->
      <line x1="150" y1="100" x2="12" y2="155" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 247.5° -->
      <line x1="150" y1="100" x2="95" y2="8" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 292.5° -->
      <line x1="150" y1="100" x2="205" y2="8" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
      <!-- 337.5° -->
      <line x1="150" y1="100" x2="288" y2="155" stroke="#b0b0c8" stroke-width="0.3" opacity="0.3"/>
    </g>

    <!-- ═══════════════════════════════════════════
         CONCENTRIC WEB RINGS
         Ring 1 (r≈22), Ring 2 (r≈44), Ring 3 (r≈66),
         Ring 4 (r≈88), Ring 5 (r≈110)
    ════════════════════════════════════════════ -->

    <!-- ─── Ring 1 (r≈22) — octagon ─── -->
    <polygon
      points="172,100 165.6,115.6 150,122 134.4,115.6 128,100 134.4,84.4 150,78 165.6,84.4"
      fill="none" stroke="#c8c8dc" stroke-width="0.7" opacity="0.7" filter="url(#silkGlow)"/>

    <!-- ─── Ring 2 (r≈44) — octagon ─── -->
    <polygon
      points="194,100 181.1,131.1 150,144 118.9,131.1 106,100 118.9,68.9 150,56 181.1,68.9"
      fill="none" stroke="#b8b8cc" stroke-width="0.6" opacity="0.6" filter="url(#silkGlow)"/>

    <!-- ─── Ring 3 (r≈66) — octagon ─── -->
    <polygon
      points="216,100 196.7,146.7 150,166 103.3,146.7 84,100 103.3,53.3 150,34 196.7,53.3"
      fill="none" stroke="#a0a0b8" stroke-width="0.55" opacity="0.5" filter="url(#silkGlow)"/>

    <!-- ─── Ring 4 (r≈88) — octagon ─── -->
    <polygon
      points="238,100 212.2,162.2 150,188 87.8,162.2 62,100 87.8,37.8 150,12 212.2,37.8"
      fill="none" stroke="#888898" stroke-width="0.5" opacity="0.4" filter="url(#silkGlow)"/>

    <!-- ─── Ring 5 (r≈110, clipped) — octagon ─── -->
    <polygon
      points="260,100 227.8,177.8 150,210 72.2,177.8 40,100 72.2,22.2 150,-10 227.8,22.2"
      fill="none" stroke="#707080" stroke-width="0.45" opacity="0.3" filter="url(#silkGlow)"/>

    <!-- ═══════════════════════════════════════════
         DIAGONAL CROSS-CONNECTIONS
         Connect non-adjacent ring nodes for mesh density
    ════════════════════════════════════════════ -->
    <g stroke="#909098" stroke-width="0.35" opacity="0.35" fill="none">
      <!-- Ring1 to Ring3 diagonals (sparse) -->
      <line x1="172" y1="100" x2="216" y2="100"/>
      <line x1="165.6" y1="115.6" x2="196.7" y2="146.7"/>
      <line x1="150" y1="122" x2="150" y2="166"/>
      <line x1="134.4" y1="115.6" x2="103.3" y2="146.7"/>
      <line x1="128" y1="100" x2="84" y2="100"/>
      <line x1="134.4" y1="84.4" x2="103.3" y2="53.3"/>
      <line x1="150" y1="78" x2="150" y2="34"/>
      <line x1="165.6" y1="84.4" x2="196.7" y2="53.3"/>

      <!-- Ring2 to Ring4 diagonals -->
      <line x1="194" y1="100" x2="238" y2="100"/>
      <line x1="181.1" y1="131.1" x2="212.2" y2="162.2"/>
      <line x1="150" y1="144" x2="150" y2="188"/>
      <line x1="118.9" y1="131.1" x2="87.8" y2="162.2"/>
      <line x1="106" y1="100" x2="62" y2="100"/>
      <line x1="118.9" y1="68.9" x2="87.8" y2="37.8"/>
      <line x1="150" y1="56" x2="150" y2="12"/>
      <line x1="181.1" y1="68.9" x2="212.2" y2="37.8"/>
    </g>

    <!-- ═══════════════════════════════════════════
         OUTER PERIPHERAL NODES
         Nodes at Ring 3 & 4 intersection points
    ════════════════════════════════════════════ -->
    <g filter="url(#nodeFilter)">
      <!-- Ring 2 cardinal nodes -->
      <circle cx="194" cy="100" r="2.2" fill="#c0c0d4" opacity="0.8"/>
      <circle cx="181.1" cy="131.1" r="1.8" fill="#b0b0c4" opacity="0.7"/>
      <circle cx="150" cy="144" r="2.2" fill="#c0c0d4" opacity="0.8"/>
      <circle cx="118.9" cy="131.1" r="1.8" fill="#b0b0c4" opacity="0.7"/>
      <circle cx="106" cy="100" r="2.2" fill="#c0c0d4" opacity="0.8"/>
      <circle cx="118.9" cy="68.9" r="1.8" fill="#b0b0c4" opacity="0.7"/>
      <circle cx="150" cy="56" r="2.2" fill="#c0c0d4" opacity="0.8"/>
      <circle cx="181.1" cy="68.9" r="1.8" fill="#b0b0c4" opacity="0.7"/>

      <!-- Ring 3 cardinal nodes -->
      <circle cx="216" cy="100" r="2.5" fill="#b8b8cc" opacity="0.7"/>
      <circle cx="196.7" cy="146.7" r="2" fill="#a8a8bc" opacity="0.6"/>
      <circle cx="150" cy="166" r="2.5" fill="#b8b8cc" opacity="0.7"/>
      <circle cx="103.3" cy="146.7" r="2" fill="#a8a8bc" opacity="0.6"/>
      <circle cx="84" cy="100" r="2.5" fill="#b8b8cc" opacity="0.7"/>
      <circle cx="103.3" cy="53.3" r="2" fill="#a8a8bc" opacity="0.6"/>
      <circle cx="150" cy="34" r="2.5" fill="#b8b8cc" opacity="0.7"/>
      <circle cx="196.7" cy="53.3" r="2" fill="#a8a8bc" opacity="0.6"/>

      <!-- Ring 4 cardinal nodes (smaller, peripheral) -->
      <circle cx="238" cy="100" r="2" fill="#909098" opacity="0.55"/>
      <circle cx="212.2" cy="162.2" r="1.6" fill="#808088" opacity="0.45"/>
      <circle cx="150" cy="188" r="2" fill="#909098" opacity="0.55"/>
      <circle cx="87.8" cy="162.2" r="1.6" fill="#808088" opacity="0.45"/>
      <circle cx="62" cy="100" r="2" fill="#909098" opacity="0.55"/>
      <circle cx="87.8" cy="37.8" r="1.6" fill="#808088" opacity="0.45"/>
      <circle cx="150" cy="12" r="2" fill="#909098" opacity="0.55"/>
      <circle cx="212.2" cy="37.8" r="1.6" fill="#808088" opacity="0.45"/>
    </g>

    <!-- ═══════════════════════════════════════════
         CENTER NODE
    ════════════════════════════════════════════ -->

    <!-- Center node outer ring -->
    <circle cx="150" cy="100" r="20" fill="none" stroke="#c8c8dc" stroke-width="0.8" opacity="0.6" filter="url(#silkGlow)"/>
    <!-- Center node mid ring -->
    <circle cx="150" cy="100" r="16" fill="none" stroke="#d8d8ec" stroke-width="0.5" opacity="0.4"/>
    <!-- Center fill — deep with subtle gradient -->
    <radialGradient id="centerFill" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#1a1a2a"/>
      <stop offset="100%" stop-color="#050508"/>
    </radialGradient>
    <circle cx="150" cy="100" r="19.5" fill="url(#centerFill)"/>
    <!-- Center node glow halo -->
    <circle cx="150" cy="100" r="22" fill="none" stroke="#e0e0f0" stroke-width="1.5" opacity="0.15" filter="url(#centerFilter)"/>
    <!-- Center node crisp border -->
    <circle cx="150" cy="100" r="19.5" fill="none" stroke="#d0d0e8" stroke-width="1" opacity="0.9"/>

    <!-- ═══════════════════════════════════════════
         "ALG" MONOGRAM (center node text)
    ════════════════════════════════════════════ -->
    <text
      x="150"
      y="104.5"
      text-anchor="middle"
      dominant-baseline="middle"
      font-family="'Courier New', 'Lucida Console', monospace"
      font-size="11"
      font-weight="700"
      letter-spacing="1.5"
      fill="#f0f0ff"
      filter="url(#textGlow)"
      opacity="0.97">ALG</text>

    <!-- ═══════════════════════════════════════════
         WORDMARK BELOW
    ════════════════════════════════════════════ -->
    <!-- Subtle separator line -->
    <line x1="90" y1="177" x2="210" y2="177" stroke="#606070" stroke-width="0.4" opacity="0.5"/>

    <text
      x="150"
      y="191"
      text-anchor="middle"
      font-family="'Courier New', 'Lucida Console', monospace"
      font-size="7.5"
      font-weight="400"
      letter-spacing="3.5"
      fill="#9090a8"
      opacity="0.85">AGENTIC LEAD GEN</text>

  </g>
</svg>` },
  { id: 42, title: "Crystal Prism", concept: "prism refracting data into spectrum", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d0d2b;stop-opacity:1" />
    </linearGradient>

    <!-- White input beam -->
    <linearGradient id="inputBeam" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.9" />
    </linearGradient>

    <!-- Prism face gradients -->
    <linearGradient id="prismFace1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3a4a7a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e2a5e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="prismFace2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#5a6aaa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2a3a7a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="prismFace3" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2a3a6a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a2a5a;stop-opacity:1" />
    </linearGradient>

    <!-- Spectrum ray gradients -->
    <linearGradient id="rayRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff2020;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#ff2020;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="rayOrange" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff7700;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#ff7700;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="rayYellow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffee00;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#ffee00;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="rayGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00dd44;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#00dd44;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="rayCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00ccff;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#00ccff;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="rayBlue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4455ff;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#4455ff;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="rayViolet" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#aa44ff;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#aa44ff;stop-opacity:0" />
    </linearGradient>

    <!-- Glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Prism edge glow -->
    <filter id="prismGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Soft input beam glow -->
    <filter id="beamGlow" x="-5%" y="-50%" width="110%" height="200%">
      <feGaussianBlur stdDeviation="1.8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Text glow -->
    <filter id="textGlow" x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="4"/>

  <!-- Subtle star field -->
  <circle cx="20" cy="15" r="0.7" fill="white" opacity="0.4"/>
  <circle cx="55" cy="30" r="0.5" fill="white" opacity="0.3"/>
  <circle cx="280" cy="20" r="0.7" fill="white" opacity="0.4"/>
  <circle cx="260" cy="55" r="0.5" fill="white" opacity="0.3"/>
  <circle cx="290" cy="80" r="0.6" fill="white" opacity="0.35"/>
  <circle cx="30" cy="70" r="0.5" fill="white" opacity="0.3"/>
  <circle cx="15" cy="130" r="0.6" fill="white" opacity="0.35"/>
  <circle cx="50" cy="160" r="0.5" fill="white" opacity="0.3"/>
  <circle cx="270" cy="140" r="0.7" fill="white" opacity="0.4"/>
  <circle cx="285" cy="170" r="0.5" fill="white" opacity="0.3"/>

  <!-- Input beam (white light ray entering from left) -->
  <!-- Beam center at y=88, entering prism left edge at ~(107,88) -->
  <rect x="30" y="86" width="77" height="4" fill="url(#inputBeam)" filter="url(#beamGlow)" rx="2"/>

  <!-- Prism: equilateral triangle, apex at top-center, base at bottom -->
  <!-- Vertices: apex (150,38), bottom-left (107,118), bottom-right (193,118) -->
  <!-- Left face: bright (light entering) -->
  <polygon points="107,118 150,38 107,88" fill="url(#prismFace2)" filter="url(#prismGlow)" opacity="0.7"/>
  <!-- Right face: refraction exit face -->
  <polygon points="150,38 193,118 107,88" fill="url(#prismFace1)" filter="url(#prismGlow)" opacity="0.5"/>
  <!-- Bottom face -->
  <polygon points="107,118 193,118 150,38" fill="none"/>

  <!-- Prism solid fill (main body) -->
  <polygon points="107,118 150,38 193,118" fill="#1c2a5a" opacity="0.85"/>

  <!-- Prism interior light scatter highlight -->
  <polygon points="115,113 150,45 185,113" fill="none" stroke="#7080cc" stroke-width="0.4" opacity="0.5"/>

  <!-- Prism edges -->
  <line x1="107" y1="118" x2="150" y2="38" stroke="#8899dd" stroke-width="1.2" filter="url(#prismGlow)" opacity="0.9"/>
  <line x1="150" y1="38" x2="193" y2="118" stroke="#8899dd" stroke-width="1.2" filter="url(#prismGlow)" opacity="0.9"/>
  <line x1="107" y1="118" x2="193" y2="118" stroke="#8899dd" stroke-width="1.2" filter="url(#prismGlow)" opacity="0.9"/>

  <!-- Prism apex highlight dot -->
  <circle cx="150" cy="38" r="2.2" fill="#aabbff" opacity="0.8" filter="url(#glow)"/>

  <!-- Inner refraction highlight (simulates glass interior) -->
  <polygon points="120,110 148,52 178,110" fill="none" stroke="#6677bb" stroke-width="0.5" opacity="0.35"/>

  <!-- Spectrum rays exiting from right face of prism -->
  <!-- Exit point is right face, fanning out to the right -->
  <!-- Right face: from (150,38) to (193,118) -->
  <!-- Entry at approximately x=107, y=88 on left face -->
  <!-- Rays exit from right face fanning: top to bottom = violet to red -->

  <!-- Ray: Red (bottom-most, steepest downward) -->
  <line x1="193" y1="118" x2="270" y2="152" stroke="#ff2020" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>
  <!-- Ray: Orange -->
  <line x1="190" y1="113" x2="270" y2="138" stroke="#ff7700" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>
  <!-- Ray: Yellow -->
  <line x1="186" y1="107" x2="270" y2="124" stroke="#ffee00" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>
  <!-- Ray: Green -->
  <line x1="181" y1="100" x2="270" y2="110" stroke="#00dd44" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>
  <!-- Ray: Cyan -->
  <line x1="175" y1="91" x2="270" y2="96" stroke="#00ccff" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>
  <!-- Ray: Blue -->
  <line x1="168" y1="81" x2="270" y2="82" stroke="#4455ff" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>
  <!-- Ray: Violet (top-most, slight upward) -->
  <line x1="161" y1="71" x2="270" y2="68" stroke="#aa44ff" stroke-width="2.2" filter="url(#glow)" opacity="0.88"/>

  <!-- Exit glow dots on prism face -->
  <circle cx="193" cy="118" r="1.8" fill="#ff3030" opacity="0.7" filter="url(#glow)"/>
  <circle cx="190" cy="113" r="1.6" fill="#ff7700" opacity="0.7" filter="url(#glow)"/>
  <circle cx="186" cy="107" r="1.6" fill="#ffee00" opacity="0.7" filter="url(#glow)"/>
  <circle cx="181" cy="100" r="1.6" fill="#00dd44" opacity="0.7" filter="url(#glow)"/>
  <circle cx="175" cy="91" r="1.6" fill="#00ccff" opacity="0.7" filter="url(#glow)"/>
  <circle cx="168" cy="81" r="1.6" fill="#4455ff" opacity="0.7" filter="url(#glow)"/>
  <circle cx="161" cy="71" r="1.8" fill="#aa44ff" opacity="0.7" filter="url(#glow)"/>

  <!-- Faint ray endpoint dots at right edge -->
  <circle cx="270" cy="152" r="2.2" fill="#ff2020" opacity="0.55" filter="url(#glow)"/>
  <circle cx="270" cy="138" r="2.2" fill="#ff7700" opacity="0.55" filter="url(#glow)"/>
  <circle cx="270" cy="124" r="2.2" fill="#ffee00" opacity="0.55" filter="url(#glow)"/>
  <circle cx="270" cy="110" r="2.2" fill="#00dd44" opacity="0.55" filter="url(#glow)"/>
  <circle cx="270" cy="96" r="2.2" fill="#00ccff" opacity="0.55" filter="url(#glow)"/>
  <circle cx="270" cy="82" r="2.2" fill="#4455ff" opacity="0.55" filter="url(#glow)"/>
  <circle cx="270" cy="68" r="2.2" fill="#aa44ff" opacity="0.55" filter="url(#glow)"/>

  <!-- Tagline label on rays side -->
  <text x="275" y="152" font-family="'Courier New', monospace" font-size="5.5" fill="#ff2020" opacity="0.7" text-anchor="start">LEADS</text>

  <!-- Logo text -->
  <text x="150" y="147" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="13.5" font-weight="700" fill="#e8eeff" text-anchor="middle" letter-spacing="2" filter="url(#textGlow)">AGENTIC</text>
  <text x="150" y="162" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="9" font-weight="400" fill="#8899cc" text-anchor="middle" letter-spacing="3.5">LEAD GEN</text>

  <!-- Subtle horizontal rule under text -->
  <line x1="108" y1="166" x2="192" y2="166" stroke="#4455aa" stroke-width="0.5" opacity="0.6"/>

  <!-- Bottom tagline -->
  <text x="150" y="176" font-family="'Courier New', monospace" font-size="6" fill="#556688" text-anchor="middle" letter-spacing="1.5">DATA → SIGNAL → OPPORTUNITY</text>
</svg>` },
  { id: 43, title: "Robot Agent", concept: "friendly AI robot head avatar", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0fafa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>

    <!-- Head gradient - teal metallic -->
    <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5ee8d8;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#2ec4b6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d8a7f;stop-opacity:1" />
    </linearGradient>

    <!-- Eye glow gradient -->
    <radialGradient id="eyeGlowLeft" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#a0f0ea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2ec4b6;stop-opacity:0.3" />
    </radialGradient>
    <radialGradient id="eyeGlowRight" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#a0f0ea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2ec4b6;stop-opacity:0.3" />
    </radialGradient>

    <!-- Metallic shine -->
    <linearGradient id="shineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.35" />
      <stop offset="50%" style="stop-color:#ffffff;stop-opacity:0.05" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.08" />
    </linearGradient>

    <!-- Neck gradient -->
    <linearGradient id="neckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0d8a7f;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2ec4b6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d8a7f;stop-opacity:1" />
    </linearGradient>

    <!-- Antenna glow -->
    <radialGradient id="antennaDot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#5ee8d8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2ec4b6;stop-opacity:0.4" />
    </radialGradient>

    <!-- Drop shadow filter -->
    <filter id="shadowSoft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#2ec4b6" flood-opacity="0.25"/>
    </filter>

    <!-- Eye inner glow filter -->
    <filter id="eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Antenna glow filter -->
    <filter id="antennaGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip path for head -->
    <clipPath id="headClip">
      <rect x="80" y="42" width="100" height="90" rx="22" ry="22"/>
    </clipPath>
  </defs>

  <!-- White background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="16"/>

  <!-- Subtle grid pattern hint -->
  <line x1="150" y1="160" x2="80" y2="160" stroke="#2ec4b6" stroke-width="0.4" stroke-opacity="0.15"/>
  <line x1="150" y1="160" x2="220" y2="160" stroke="#2ec4b6" stroke-width="0.4" stroke-opacity="0.15"/>

  <!-- ── ROBOT BODY ── -->

  <!-- Neck -->
  <rect x="130" y="133" width="40" height="18" rx="5" fill="url(#neckGrad)" filter="url(#shadowSoft)"/>
  <!-- Neck bolts -->
  <circle cx="138" cy="142" r="2.5" fill="#0d8a7f"/>
  <circle cx="162" cy="142" r="2.5" fill="#0d8a7f"/>

  <!-- Shoulder base -->
  <rect x="90" y="148" width="120" height="14" rx="7" fill="#2ec4b6" opacity="0.7" filter="url(#shadowSoft)"/>

  <!-- ── ROBOT HEAD ── -->
  <rect x="80" y="42" width="100" height="90" rx="22" ry="22" fill="url(#headGrad)" filter="url(#shadowSoft)"/>

  <!-- Metallic shine overlay -->
  <rect x="80" y="42" width="100" height="90" rx="22" ry="22" fill="url(#shineGrad)"/>

  <!-- Head edge highlight top -->
  <rect x="82" y="43" width="96" height="6" rx="11" fill="#ffffff" opacity="0.18"/>

  <!-- ── ANTENNA ── -->
  <!-- Antenna stem -->
  <line x1="130" y1="42" x2="130" y2="24" stroke="#2ec4b6" stroke-width="3" stroke-linecap="round"/>
  <!-- Antenna ball -->
  <circle cx="130" cy="20" r="7" fill="url(#antennaDot)" filter="url(#antennaGlow)"/>
  <!-- Antenna signal rings -->
  <circle cx="130" cy="20" r="11" fill="none" stroke="#5ee8d8" stroke-width="1.2" stroke-opacity="0.5"/>
  <circle cx="130" cy="20" r="15" fill="none" stroke="#5ee8d8" stroke-width="0.7" stroke-opacity="0.25"/>

  <!-- ── EYES ── -->
  <!-- Left eye socket -->
  <rect x="93" y="68" width="34" height="28" rx="9" fill="#0a5c56" opacity="0.85"/>
  <!-- Right eye socket -->
  <rect x="133" y="68" width="34" height="28" rx="9" fill="#0a5c56" opacity="0.85"/>

  <!-- Left eye screen glow -->
  <rect x="95" y="70" width="30" height="24" rx="7" fill="url(#eyeGlowLeft)" filter="url(#eyeGlow)"/>
  <!-- Right eye screen glow -->
  <rect x="135" y="70" width="30" height="24" rx="7" fill="url(#eyeGlowRight)" filter="url(#eyeGlow)"/>

  <!-- Left eye: data stream lines -->
  <line x1="99" y1="76" x2="121" y2="76" stroke="#2ec4b6" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
  <line x1="99" y1="80" x2="115" y2="80" stroke="#5ee8d8" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
  <line x1="99" y1="84" x2="119" y2="84" stroke="#2ec4b6" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
  <line x1="99" y1="88" x2="112" y2="88" stroke="#5ee8d8" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
  <!-- Left eye highlight -->
  <circle cx="101" cy="73" r="2.5" fill="#ffffff" opacity="0.7"/>

  <!-- Right eye: data stream lines -->
  <line x1="139" y1="76" x2="161" y2="76" stroke="#2ec4b6" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
  <line x1="139" y1="80" x2="155" y2="80" stroke="#5ee8d8" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
  <line x1="139" y1="84" x2="159" y2="84" stroke="#2ec4b6" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
  <line x1="139" y1="88" x2="152" y2="88" stroke="#5ee8d8" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
  <!-- Right eye highlight -->
  <circle cx="141" cy="73" r="2.5" fill="#ffffff" opacity="0.7"/>

  <!-- ── MOUTH / SMILE ── -->
  <!-- Mouth panel -->
  <rect x="100" y="108" width="60" height="16" rx="8" fill="#0a5c56" opacity="0.85"/>
  <!-- Friendly smile arc -->
  <path d="M108 113 Q130 124 152 113" stroke="#5ee8d8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Mouth dots (teeth-like) -->
  <circle cx="116" cy="116" r="1.5" fill="#5ee8d8" opacity="0.8"/>
  <circle cx="123" cy="118" r="1.5" fill="#5ee8d8" opacity="0.8"/>
  <circle cx="130" cy="119" r="1.5" fill="#5ee8d8" opacity="0.8"/>
  <circle cx="137" cy="118" r="1.5" fill="#5ee8d8" opacity="0.8"/>
  <circle cx="144" cy="116" r="1.5" fill="#5ee8d8" opacity="0.8"/>

  <!-- Head side bolts -->
  <circle cx="82" cy="87" r="4" fill="#0d8a7f" stroke="#5ee8d8" stroke-width="1"/>
  <circle cx="178" cy="87" r="4" fill="#0d8a7f" stroke="#5ee8d8" stroke-width="1"/>

  <!-- ── TEXT LABEL ── -->
  <text x="150" y="180" font-family="'SF Pro Display', 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        font-size="12.5" font-weight="700" fill="#0d8a7f" text-anchor="middle" letter-spacing="1.8">
    AGENTIC LEAD GEN
  </text>
</svg>` },
  { id: 44, title: "Archery Bow", concept: "bow aiming at prospect target", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200" style="background:#ffffff">

  <!-- Bow body -->
  <path d="M 60 50 Q 30 100 60 150" fill="none" stroke="#1a2744" stroke-width="4" stroke-linecap="round"/>

  <!-- Bow string (pulled back) -->
  <line x1="60" y1="50" x2="85" y2="100" stroke="#1a2744" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="60" y1="150" x2="85" y2="100" stroke="#1a2744" stroke-width="1.8" stroke-linecap="round"/>

  <!-- Arrow shaft -->
  <line x1="85" y1="100" x2="210" y2="100" stroke="#1a2744" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Arrow head (pointing right toward target) -->
  <polygon points="210,100 198,94 198,106" fill="#1a2744"/>

  <!-- Arrow fletching (tail feathers) -->
  <path d="M 85,100 L 75,93 L 80,100 L 75,107 Z" fill="#1a2744" opacity="0.7"/>

  <!-- Target: person/company silhouette -->
  <!-- Company building silhouette -->
  <rect x="228" y="74" width="40" height="52" fill="none" stroke="#1a2744" stroke-width="2.5" rx="1"/>
  <rect x="233" y="69" width="30" height="8" fill="none" stroke="#1a2744" stroke-width="2"/>
  <!-- Windows -->
  <rect x="234" y="81" width="7" height="6" fill="#1a2744" opacity="0.4" rx="1"/>
  <rect x="246" y="81" width="7" height="6" fill="#1a2744" opacity="0.4" rx="1"/>
  <rect x="258" y="81" width="7" height="6" fill="#1a2744" opacity="0.4" rx="1"/>
  <rect x="234" y="93" width="7" height="6" fill="#1a2744" opacity="0.4" rx="1"/>
  <rect x="246" y="93" width="7" height="6" fill="#1a2744" opacity="0.4" rx="1"/>
  <rect x="258" y="93" width="7" height="6" fill="#1a2744" opacity="0.4" rx="1"/>
  <!-- Door -->
  <rect x="242" y="112" width="12" height="14" fill="#1a2744" opacity="0.5" rx="1"/>

  <!-- Crosshair ring around target -->
  <circle cx="248" cy="100" r="34" fill="none" stroke="#1a2744" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.45"/>
  <circle cx="248" cy="100" r="44" fill="none" stroke="#1a2744" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.25"/>

  <!-- Wordmark -->
  <text x="150" y="178" font-family="Georgia, 'Times New Roman', serif" font-size="13" font-weight="700" fill="#1a2744" text-anchor="middle" letter-spacing="2">AGENTIC LEAD GEN</text>

  <!-- Tagline -->
  <text x="150" y="193" font-family="Arial, Helvetica, sans-serif" font-size="7.5" fill="#1a2744" text-anchor="middle" letter-spacing="3" opacity="0.6">PRECISION TARGETING</text>

</svg>` },
  { id: 45, title: "Soundwave Pulse", concept: "equalizer bars as outreach pulses", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7B2FFF;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#C03FE8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF3CAC;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FF3CAC;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B2FFF;stop-opacity:0.5" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D0D1A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1A0D2E;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="barClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="12"/>

  <!-- Subtle background glow orb -->
  <ellipse cx="150" cy="95" rx="110" ry="55" fill="#7B2FFF" opacity="0.07"/>

  <!-- Pulse rings emanating outward (outreach metaphor) -->
  <circle cx="150" cy="95" r="30" fill="none" stroke="#C03FE8" stroke-width="0.5" opacity="0.15"/>
  <circle cx="150" cy="95" r="55" fill="none" stroke="#C03FE8" stroke-width="0.5" opacity="0.10"/>
  <circle cx="150" cy="95" r="82" fill="none" stroke="#C03FE8" stroke-width="0.5" opacity="0.06"/>

  <!-- Equalizer bars — center-anchored, varying heights -->
  <!-- Bar heights (half-height from center): 18 22 30 42 52 60 52 42 30 22 18 12 18 22 30 42 52 60 52 42 30 22 18 -->
  <!-- Bar width: 6px, gap: 3px, 23 bars, total = 23*6 + 22*3 = 138+66 = 204px, start x = (300-204)/2 = 48 -->

  <g filter="url(#glow)" clip-path="url(#barClip)">
    <!-- Bar 1: h=18 -->
    <rect x="48" y="77" width="6" height="36" rx="3" fill="url(#barGrad)" opacity="0.55"/>
    <!-- Bar 2: h=22 -->
    <rect x="57" y="73" width="6" height="44" rx="3" fill="url(#barGrad)" opacity="0.62"/>
    <!-- Bar 3: h=30 -->
    <rect x="66" y="65" width="6" height="60" rx="3" fill="url(#barGrad)" opacity="0.70"/>
    <!-- Bar 4: h=42 -->
    <rect x="75" y="53" width="6" height="84" rx="3" fill="url(#barGrad)" opacity="0.78"/>
    <!-- Bar 5: h=52 -->
    <rect x="84" y="43" width="6" height="104" rx="3" fill="url(#barGrad)" opacity="0.85"/>
    <!-- Bar 6: h=60 -->
    <rect x="93" y="35" width="6" height="120" rx="3" fill="url(#waveGrad)" opacity="0.90"/>
    <!-- Bar 7: h=52 -->
    <rect x="102" y="43" width="6" height="104" rx="3" fill="url(#barGrad)" opacity="0.85"/>
    <!-- Bar 8: h=42 -->
    <rect x="111" y="53" width="6" height="84" rx="3" fill="url(#barGrad)" opacity="0.78"/>
    <!-- Bar 9: h=56 -->
    <rect x="120" y="39" width="6" height="112" rx="3" fill="url(#waveGrad)" opacity="0.88"/>
    <!-- Bar 10: h=64 (tallest) -->
    <rect x="129" y="31" width="6" height="128" rx="3" fill="url(#waveGrad)" opacity="0.95"/>
    <!-- Bar 11: h=64 (tallest, center) -->
    <rect x="138" y="31" width="6" height="128" rx="3" fill="url(#waveGrad)" opacity="1"/>
    <!-- Bar 12: h=64 (tallest, center) -->
    <rect x="147" y="31" width="6" height="128" rx="3" fill="url(#waveGrad)" opacity="1"/>
    <!-- Bar 13: h=64 (tallest) -->
    <rect x="156" y="31" width="6" height="128" rx="3" fill="url(#waveGrad)" opacity="0.95"/>
    <!-- Bar 14: h=56 -->
    <rect x="165" y="39" width="6" height="112" rx="3" fill="url(#waveGrad)" opacity="0.88"/>
    <!-- Bar 15: h=42 -->
    <rect x="174" y="53" width="6" height="84" rx="3" fill="url(#barGrad)" opacity="0.78"/>
    <!-- Bar 16: h=52 -->
    <rect x="183" y="43" width="6" height="104" rx="3" fill="url(#barGrad)" opacity="0.85"/>
    <!-- Bar 17: h=60 -->
    <rect x="192" y="35" width="6" height="120" rx="3" fill="url(#waveGrad)" opacity="0.90"/>
    <!-- Bar 18: h=52 -->
    <rect x="201" y="43" width="6" height="104" rx="3" fill="url(#barGrad)" opacity="0.85"/>
    <!-- Bar 19: h=42 -->
    <rect x="210" y="53" width="6" height="84" rx="3" fill="url(#barGrad)" opacity="0.78"/>
    <!-- Bar 20: h=30 -->
    <rect x="219" y="65" width="6" height="60" rx="3" fill="url(#barGrad)" opacity="0.70"/>
    <!-- Bar 21: h=22 -->
    <rect x="228" y="73" width="6" height="44" rx="3" fill="url(#barGrad)" opacity="0.62"/>
    <!-- Bar 22: h=18 -->
    <rect x="237" y="77" width="6" height="36" rx="3" fill="url(#barGrad)" opacity="0.55"/>
    <!-- Bar 23: h=12 -->
    <rect x="246" y="83" width="6" height="24" rx="3" fill="url(#barGrad)" opacity="0.45"/>
  </g>

  <!-- Horizontal center line (heartbeat baseline) -->
  <line x1="36" y1="95" x2="264" y2="95" stroke="#C03FE8" stroke-width="0.5" opacity="0.25" stroke-dasharray="3,4"/>

  <!-- Text: Agentic Lead Gen -->
  <text
    x="150"
    y="172"
    font-family="'SF Pro Display', 'Inter', 'Segoe UI', Arial, sans-serif"
    font-size="13.5"
    font-weight="700"
    letter-spacing="2.5"
    text-anchor="middle"
    fill="url(#waveGrad)"
    filter="url(#glow)"
  >AGENTIC LEAD GEN</text>

  <!-- Tagline -->
  <text
    x="150"
    y="187"
    font-family="'SF Pro Display', 'Inter', 'Segoe UI', Arial, sans-serif"
    font-size="6.5"
    font-weight="400"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="#C03FE8"
    opacity="0.6"
  >SOUNDWAVE OUTREACH PULSE</text>
</svg>` },
  { id: 46, title: "Telescope Discovery", concept: "telescope pointed at glowing star", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark starfield background gradient -->
    <radialGradient id="bgGrad" cx="70%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#0f1c3a"/>
      <stop offset="100%" stop-color="#060d1f"/>
    </radialGradient>

    <!-- Target star glow -->
    <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8e7" stop-opacity="1"/>
      <stop offset="30%" stop-color="#ffd060" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#ff8c00" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ff6600" stop-opacity="0"/>
    </radialGradient>

    <!-- Telescope brass gradient -->
    <linearGradient id="brassBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e8c84a"/>
      <stop offset="25%" stop-color="#f5d76e"/>
      <stop offset="50%" stop-color="#c9a227"/>
      <stop offset="75%" stop-color="#e0b83a"/>
      <stop offset="100%" stop-color="#a07820"/>
    </linearGradient>

    <linearGradient id="brassBarrel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d4a520"/>
      <stop offset="40%" stop-color="#f0cc50"/>
      <stop offset="100%" stop-color="#9a6e10"/>
    </linearGradient>

    <linearGradient id="brassObjective" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c8a030"/>
      <stop offset="50%" stop-color="#e8c84a"/>
      <stop offset="100%" stop-color="#8a6010"/>
    </linearGradient>

    <!-- Eyepiece lens gradient -->
    <radialGradient id="eyepieceLens" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#7ec8e3" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#1a5a7a" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0a2a3a" stop-opacity="1"/>
    </radialGradient>

    <!-- Objective lens -->
    <radialGradient id="objectiveLens" cx="45%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#9fd8f0" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#1e6080" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#081820" stop-opacity="1"/>
    </radialGradient>

    <!-- Light beam from telescope -->
    <linearGradient id="beamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#ffd060" stop-opacity="0.0"/>
      <stop offset="40%" stop-color="#ffd060" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#fff8e7" stop-opacity="0.18"/>
    </linearGradient>

    <!-- Tripod gradient -->
    <linearGradient id="tripodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c9a227"/>
      <stop offset="100%" stop-color="#7a5a10"/>
    </linearGradient>

    <!-- ALG text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f5d76e"/>
      <stop offset="100%" stop-color="#c9a227"/>
    </linearGradient>

    <!-- Clip path for beam -->
    <clipPath id="beamClip">
      <polygon points="175,78 245,42 245,78 175,78"/>
    </clipPath>

    <!-- Glow filter for star -->
    <filter id="glowFilter" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="blur1"/>
      <feGaussianBlur stdDeviation="10" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle glow for telescope -->
    <filter id="telescopeGlow" x="-5%" y="-10%" width="110%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="12"/>

  <!-- Stars scattered in background -->
  <g opacity="0.85">
    <!-- Small stars -->
    <circle cx="22" cy="14" r="0.8" fill="#ffffff" opacity="0.7"/>
    <circle cx="48" cy="28" r="0.6" fill="#e8e8ff" opacity="0.6"/>
    <circle cx="75" cy="10" r="1.0" fill="#ffffff" opacity="0.8"/>
    <circle cx="110" cy="22" r="0.7" fill="#ffe8c0" opacity="0.65"/>
    <circle cx="135" cy="8" r="0.9" fill="#ffffff" opacity="0.75"/>
    <circle cx="162" cy="19" r="0.6" fill="#e0e0ff" opacity="0.6"/>
    <circle cx="192" cy="12" r="0.8" fill="#ffffff" opacity="0.7"/>
    <circle cx="218" cy="25" r="0.7" fill="#ffe8c0" opacity="0.6"/>
    <circle cx="258" cy="15" r="1.0" fill="#ffffff" opacity="0.8"/>
    <circle cx="278" cy="32" r="0.6" fill="#e8e8ff" opacity="0.55"/>
    <circle cx="15" cy="45" r="0.7" fill="#ffffff" opacity="0.6"/>
    <circle cx="38" cy="62" r="0.5" fill="#e0e8ff" opacity="0.5"/>
    <circle cx="60" cy="38" r="0.9" fill="#ffffff" opacity="0.7"/>
    <circle cx="88" cy="50" r="0.6" fill="#ffe8c0" opacity="0.55"/>
    <circle cx="118" cy="40" r="0.8" fill="#ffffff" opacity="0.65"/>
    <circle cx="200" cy="45" r="0.6" fill="#e8e8ff" opacity="0.6"/>
    <circle cx="228" cy="50" r="0.7" fill="#ffffff" opacity="0.55"/>
    <circle cx="252" cy="38" r="0.5" fill="#ffe8c0" opacity="0.5"/>
    <circle cx="272" cy="55" r="0.8" fill="#ffffff" opacity="0.65"/>
    <circle cx="290" cy="40" r="0.6" fill="#e0e0ff" opacity="0.55"/>
    <circle cx="30" cy="85" r="0.7" fill="#ffffff" opacity="0.5"/>
    <circle cx="10" cy="110" r="0.8" fill="#e8e8ff" opacity="0.55"/>
    <circle cx="25" cy="130" r="0.5" fill="#ffffff" opacity="0.45"/>
    <!-- Slightly larger accent stars -->
    <circle cx="55" cy="18" r="1.3" fill="#ffffff" opacity="0.9"/>
    <circle cx="180" cy="30" r="1.2" fill="#ffe8d0" opacity="0.8"/>
    <circle cx="290" cy="20" r="1.4" fill="#ffffff" opacity="0.85"/>
    <circle cx="100" cy="35" r="1.1" fill="#e8f0ff" opacity="0.75"/>
  </g>

  <!-- Light beam from objective lens toward target star -->
  <polygon points="245,55 245,65 210,82 210,74" fill="url(#beamGrad)" opacity="0.5"/>

  <!-- Glow halo around target star area -->
  <circle cx="258" cy="62" r="28" fill="url(#starGlow)" opacity="0.45"/>
  <circle cx="258" cy="62" r="16" fill="url(#starGlow)" opacity="0.5"/>

  <!-- Target star with glow filter -->
  <g filter="url(#glowFilter)">
    <!-- Star shape: 4-pointed with diagonals -->
    <g transform="translate(258,62)">
      <!-- Outer soft glow ring -->
      <circle r="9" fill="#ffd060" opacity="0.25"/>
      <!-- Star points -->
      <polygon points="0,-12 2.5,-2.5 12,0 2.5,2.5 0,12 -2.5,2.5 -12,0 -2.5,-2.5" fill="#ffe88a" opacity="0.9"/>
      <!-- Inner bright core -->
      <circle r="4" fill="#fff8e7" opacity="1"/>
      <circle r="2" fill="#ffffff" opacity="1"/>
    </g>
  </g>

  <!-- Crosshair reticle on target star -->
  <g transform="translate(258,62)" stroke="#ffd060" stroke-width="0.7" opacity="0.7">
    <line x1="-18" y1="0" x2="-13" y2="0"/>
    <line x1="13" y1="0" x2="18" y2="0"/>
    <line x1="0" y1="-18" x2="0" y2="-13"/>
    <line x1="0" y1="13" x2="0" y2="18"/>
    <circle r="14" fill="none" stroke-dasharray="3,4"/>
  </g>

  <!-- === TELESCOPE === -->
  <g filter="url(#telescopeGlow)">

    <!-- TRIPOD -->
    <!-- Left leg -->
    <line x1="128" y1="115" x2="98" y2="148" stroke="url(#tripodGrad)" stroke-width="3" stroke-linecap="round"/>
    <!-- Right leg -->
    <line x1="128" y1="115" x2="155" y2="148" stroke="url(#tripodGrad)" stroke-width="3" stroke-linecap="round"/>
    <!-- Center leg -->
    <line x1="128" y1="115" x2="128" y2="150" stroke="url(#tripodGrad)" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Tripod spreader -->
    <line x1="104" y1="138" x2="150" y2="138" stroke="url(#tripodGrad)" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>

    <!-- Mount head (pivot joint) -->
    <ellipse cx="128" cy="113" rx="7" ry="5.5" fill="url(#brassBody)" stroke="#a07820" stroke-width="0.8"/>
    <ellipse cx="128" cy="113" rx="4" ry="3" fill="#c9a227" opacity="0.7"/>

    <!-- MAIN TELESCOPE BARREL (angled ~-22deg, pointing upper-right) -->
    <!-- The barrel: a rotated rounded rectangle from mount to objective -->
    <!-- Center at roughly (175, 90), angled toward (248,60) -->
    <g transform="rotate(-22, 128, 110)">
      <!-- Main barrel body -->
      <rect x="125" y="104" width="115" height="16" rx="4" fill="url(#brassBarrel)" stroke="#9a7010" stroke-width="0.8"/>
      <!-- Barrel highlight stripe -->
      <rect x="125" y="104" width="115" height="5" rx="2" fill="#f5d76e" opacity="0.35"/>
      <!-- Barrel band rings (decorative) -->
      <rect x="165" y="104" width="5" height="16" rx="1" fill="#c9a227" opacity="0.6"/>
      <rect x="195" y="104" width="5" height="16" rx="1" fill="#c9a227" opacity="0.6"/>
      <!-- Focus knob -->
      <rect x="173" y="99" width="12" height="8" rx="2" fill="url(#brassBody)" stroke="#9a7010" stroke-width="0.8"/>
      <line x1="176" y1="99" x2="176" y2="107" stroke="#9a7010" stroke-width="0.6"/>
      <line x1="179" y1="99" x2="179" y2="107" stroke="#9a7010" stroke-width="0.6"/>
      <line x1="182" y1="99" x2="182" y2="107" stroke="#9a7010" stroke-width="0.6"/>
    </g>

    <!-- EYEPIECE (left/back of telescope) -->
    <g transform="rotate(-22, 128, 110)">
      <!-- Eyepiece barrel (narrower extension at back) -->
      <rect x="108" y="107" width="20" height="10" rx="3" fill="url(#brassBody)" stroke="#9a7010" stroke-width="0.8"/>
      <!-- Eyepiece cap/lens -->
      <ellipse cx="110" cy="112" rx="5" ry="6" fill="url(#eyepieceLens)" stroke="#c9a227" stroke-width="1"/>
      <!-- Lens reflection -->
      <ellipse cx="108" cy="109" rx="2" ry="1.5" fill="#9fd8f0" opacity="0.5" transform="rotate(-15,108,109)"/>
    </g>

    <!-- OBJECTIVE LENS (right/front of telescope, larger) -->
    <g transform="rotate(-22, 128, 110)">
      <!-- Objective housing ring -->
      <ellipse cx="241" cy="112" rx="7" ry="11" fill="url(#brassObjective)" stroke="#9a7010" stroke-width="1"/>
      <!-- Objective lens glass -->
      <ellipse cx="241" cy="112" rx="5" ry="9" fill="url(#objectiveLens)"/>
      <!-- Lens reflection highlight -->
      <ellipse cx="238" cy="107" rx="2" ry="1.5" fill="#9fd8f0" opacity="0.45" transform="rotate(-10,238,107)"/>
    </g>

  </g>

  <!-- === ALG MONOGRAM === -->
  <text
    x="150"
    y="175"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="26"
    font-weight="700"
    letter-spacing="6"
    fill="url(#textGrad)"
    text-anchor="middle"
    dominant-baseline="middle"
  >ALG</text>

  <!-- Tagline -->
  <text
    x="150"
    y="190"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="7"
    font-weight="400"
    letter-spacing="3.5"
    fill="#7a90b8"
    text-anchor="middle"
    dominant-baseline="middle"
    text-transform="uppercase"
  >AGENTIC LEAD GEN</text>

  <!-- Thin decorative separator line under telescope -->
  <line x1="60" y1="157" x2="240" y2="157" stroke="#1e3a6a" stroke-width="0.7" opacity="0.6"/>
</svg>` },
  { id: 47, title: "Puzzle Fit", concept: "two puzzle pieces clicking together", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <style>
      .label { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
      .tagline { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 1.5px; fill: #64748b; }
      .brand { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 0.3px; fill: #1e293b; }
    </style>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00000018"/>
    </filter>
    <clipPath id="leftClip">
      <rect x="60" y="55" width="95" height="90"/>
    </clipPath>
    <clipPath id="rightClip">
      <rect x="145" y="55" width="95" height="90"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#f8fafc" rx="12"/>

  <!-- === LEFT PUZZLE PIECE (COMPANY - Blue) === -->
  <!-- Main body + notch cutout on right side, tab on right side -->
  <g filter="url(#shadow)">
    <path d="
      M 70,65
      L 130,65
      L 130,88
      C 130,88 137,83 143,88
      C 149,93 149,107 143,112
      C 137,117 130,112 130,112
      L 130,135
      L 70,135
      Z
    " fill="#2563eb" rx="8"/>
    <!-- Rounded corners on outer edges -->
    <path d="
      M 78,65
      Q 70,65 70,73
      L 70,127
      Q 70,135 78,135
      L 130,135
      L 130,112
      C 130,112 137,117 143,112
      C 149,107 149,93 143,88
      C 137,83 130,88 130,88
      L 130,65
      Z
    " fill="#2563eb"/>
  </g>

  <!-- Left piece highlight -->
  <path d="
    M 78,65
    Q 70,65 70,73
    L 70,90
    Q 85,72 110,68
    L 130,66
    L 130,65
    Z
  " fill="#3b82f6" opacity="0.5"/>

  <!-- COMPANY label -->
  <text x="100" y="98" text-anchor="middle" class="label" fill="white">COMPANY</text>
  <text x="100" y="112" text-anchor="middle" fill="white" font-family="'Inter','Helvetica Neue',Arial,sans-serif" font-size="8" font-weight="500" letter-spacing="0.3px" opacity="0.85">ICP Profile</text>

  <!-- === RIGHT PUZZLE PIECE (CLIENT - Orange) === -->
  <g filter="url(#shadow)">
    <path d="
      M 222,65
      Q 230,65 230,73
      L 230,127
      Q 230,135 222,135
      L 170,135
      L 170,112
      C 170,112 163,117 157,112
      C 151,107 151,93 157,88
      C 163,83 170,88 170,88
      L 170,65
      Z
    " fill="#ea580c"/>
  </g>

  <!-- Right piece highlight -->
  <path d="
    M 222,65
    Q 230,65 230,73
    L 230,90
    Q 215,72 190,68
    L 170,66
    L 170,65
    Z
  " fill="#f97316" opacity="0.5"/>

  <!-- CLIENT label -->
  <text x="200" y="98" text-anchor="middle" class="label" fill="white">CLIENT</text>
  <text x="200" y="112" text-anchor="middle" fill="white" font-family="'Inter','Helvetica Neue',Arial,sans-serif" font-size="8" font-weight="500" letter-spacing="0.3px" opacity="0.85">Ideal Match</text>

  <!-- Connection spark / click indicator -->
  <g transform="translate(150, 100)">
    <circle cx="0" cy="0" r="5" fill="white" opacity="0.9"/>
    <line x1="-9" y1="0" x2="-5.5" y2="0" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="5.5" y1="0" x2="9" y2="0" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="0" y1="-9" x2="0" y2="-5.5" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="0" y1="5.5" x2="0" y2="9" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="2.5" fill="#fbbf24"/>
  </g>

  <!-- Brand name -->
  <text x="150" y="158" text-anchor="middle" class="brand">Agentic Lead Gen</text>

  <!-- Tagline -->
  <text x="150" y="173" text-anchor="middle" class="tagline">PERFECT ICP MATCHING</text>

  <!-- Subtle bottom accent line -->
  <line x1="115" y1="180" x2="185" y2="180" stroke="url(#accentGrad)" stroke-width="1.5" stroke-linecap="round"/>
  <defs>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
</svg>` },
  { id: 48, title: "Seedling Growth", concept: "sprout from circuit board soil", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f0faf3;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="stemGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#2d8a4e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4ade80;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="leafGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#16a34a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#86efac;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="leafGrad2" x1="100%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#15803d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a7f3d0;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="soilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a2f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f2419;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#4ade80;stop-opacity:0.3" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="12"/>

  <!-- Circuit board soil base -->
  <rect x="60" y="128" width="180" height="36" rx="5" fill="url(#soilGrad)"/>

  <!-- Circuit traces on soil -->
  <g stroke="url(#circuitGrad)" stroke-width="1.2" fill="none" opacity="0.85">
    <!-- Horizontal traces -->
    <line x1="68" y1="138" x2="100" y2="138"/>
    <line x1="108" y1="138" x2="132" y2="138"/>
    <line x1="168" y1="138" x2="192" y2="138"/>
    <line x1="200" y1="138" x2="232" y2="138"/>
    <line x1="72" y1="150" x2="92" y2="150"/>
    <line x1="108" y1="150" x2="148" y2="150"/>
    <line x1="160" y1="150" x2="188" y2="150"/>
    <line x1="200" y1="150" x2="228" y2="150"/>
    <!-- Vertical traces -->
    <line x1="100" y1="133" x2="100" y2="143"/>
    <line x1="132" y1="133" x2="132" y2="145"/>
    <line x1="168" y1="133" x2="168" y2="145"/>
    <line x1="200" y1="133" x2="200" y2="143"/>
    <line x1="92" y1="145" x2="92" y2="155"/>
    <line x1="148" y1="143" x2="148" y2="155"/>
    <line x1="188" y1="143" x2="188" y2="155"/>
    <!-- L-bends -->
    <polyline points="100,138 104,138 104,142 108,142 108,138"/>
    <polyline points="168,138 164,138 164,142 160,142 160,138"/>
  </g>

  <!-- Circuit nodes (solder pads) -->
  <g fill="#4ade80" opacity="0.9">
    <circle cx="100" cy="138" r="2.2"/>
    <circle cx="132" cy="138" r="2.2"/>
    <circle cx="168" cy="138" r="2.2"/>
    <circle cx="200" cy="138" r="2.2"/>
    <circle cx="92"  cy="150" r="2.2"/>
    <circle cx="148" cy="150" r="2.2"/>
    <circle cx="188" cy="150" r="2.2"/>
    <circle cx="72"  cy="150" r="1.6"/>
    <circle cx="228" cy="150" r="1.6"/>
  </g>

  <!-- Soil surface highlight -->
  <rect x="60" y="128" width="180" height="3" rx="2" fill="#2d6a45" opacity="0.6"/>

  <!-- Main stem -->
  <path d="M150 128 C150 115 148 100 150 82" stroke="url(#stemGrad)" stroke-width="3.5" fill="none" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Left leaf (wifi arc style) -->
  <g filter="url(#glow)">
    <!-- Leaf body -->
    <path d="M150 100 C138 95 124 88 118 76 C128 70 142 76 150 88 Z" fill="url(#leafGrad1)" opacity="0.92"/>
    <!-- Leaf vein -->
    <path d="M150 100 C140 90 128 80 120 73" stroke="#86efac" stroke-width="0.8" fill="none" opacity="0.7"/>
    <!-- Wifi signal arcs on leaf -->
    <path d="M127 82 C130 79 135 77 140 78" stroke="#ffffff" stroke-width="1.1" fill="none" opacity="0.6" stroke-linecap="round"/>
    <path d="M122 86 C127 81 134 78 141 80" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.35" stroke-linecap="round"/>
  </g>

  <!-- Right leaf (wifi arc style) -->
  <g filter="url(#glow)">
    <!-- Leaf body -->
    <path d="M150 95 C162 90 176 83 182 71 C172 65 158 71 150 83 Z" fill="url(#leafGrad2)" opacity="0.92"/>
    <!-- Leaf vein -->
    <path d="M150 95 C160 85 172 75 180 68" stroke="#a7f3d0" stroke-width="0.8" fill="none" opacity="0.7"/>
    <!-- Wifi signal arcs on leaf -->
    <path d="M173 77 C170 74 165 72 160 73" stroke="#ffffff" stroke-width="1.1" fill="none" opacity="0.6" stroke-linecap="round"/>
    <path d="M178 81 C173 76 166 73 159 75" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.35" stroke-linecap="round"/>
  </g>

  <!-- Sprout tip / bud -->
  <ellipse cx="150" cy="80" rx="4" ry="6" fill="#4ade80" filter="url(#softGlow)" opacity="0.95"/>
  <ellipse cx="150" cy="79" rx="2.5" ry="4" fill="#86efac" opacity="0.85"/>

  <!-- Wifi / network signal arcs rising from sprout -->
  <g fill="none" stroke-linecap="round" opacity="0.75" filter="url(#glow)">
    <path d="M142 70 C144 65 150 62 156 65" stroke="#22c55e" stroke-width="1.8"/>
    <path d="M138 65 C141 58 150 54 159 58" stroke="#4ade80" stroke-width="1.4" opacity="0.7"/>
    <path d="M135 60 C139 51 150 47 161 51" stroke="#86efac" stroke-width="1.0" opacity="0.45"/>
  </g>
  <!-- Signal dot at center -->
  <circle cx="150" cy="62" r="1.8" fill="#22c55e" opacity="0.9" filter="url(#glow)"/>

  <!-- Floating data nodes / network dots around plant -->
  <g fill="#22c55e" opacity="0.5">
    <circle cx="108" cy="108" r="2"/>
    <circle cx="192" cy="112" r="2"/>
    <circle cx="118" cy="90" r="1.5"/>
    <circle cx="183" cy="94" r="1.5"/>
  </g>
  <!-- Connecting lines between nodes and stem area -->
  <g stroke="#22c55e" stroke-width="0.7" fill="none" opacity="0.25" stroke-dasharray="3,3">
    <line x1="110" y1="107" x2="136" y2="100"/>
    <line x1="190" y1="111" x2="164" y2="100"/>
  </g>

  <!-- Text: Agentic Lead Gen -->
  <text x="150" y="180" font-family="'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" fill="#15803d" text-anchor="middle" letter-spacing="0.5">Agentic Lead Gen</text>
  <text x="150" y="193" font-family="'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif" font-size="7.5" font-weight="400" fill="#4ade80" text-anchor="middle" letter-spacing="2.5">GROW · CONNECT · CONVERT</text>
</svg>` },
  { id: 49, title: "Sword Power", concept: "data bar blade pointing upward", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0c10;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#111520;stop-opacity:1"/>
    </linearGradient>

    <!-- Blade silver-to-gold gradient (vertical, tip to guard) -->
    <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
      <stop offset="18%" style="stop-color:#e8e8e8;stop-opacity:1"/>
      <stop offset="42%" style="stop-color:#c0a855;stop-opacity:1"/>
      <stop offset="68%" style="stop-color:#d4af37;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#b8860b;stop-opacity:1"/>
    </linearGradient>

    <!-- Data bar segment gradient (horizontal, to give depth) -->
    <linearGradient id="barGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a2540;stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#2563eb;stop-opacity:0.7"/>
      <stop offset="100%" style="stop-color:#1a2540;stop-opacity:0.9"/>
    </linearGradient>
    <linearGradient id="barGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a2540;stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:0.7"/>
      <stop offset="100%" style="stop-color:#1a2540;stop-opacity:0.9"/>
    </linearGradient>
    <linearGradient id="barGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a2540;stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#0891b2;stop-opacity:0.7"/>
      <stop offset="100%" style="stop-color:#1a2540;stop-opacity:0.9"/>
    </linearGradient>

    <!-- Glow filter for blade tip -->
    <filter id="tipGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle glow for guard -->
    <filter id="guardGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Outer ambient glow -->
    <filter id="ambientGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip path: blade shape (triangle pointing up, from guard to tip) -->
    <!-- Blade spans x: 143..157 (14px wide at guard), tip at 150, y:18 -->
    <!-- Guard at y=118 -->
    <clipPath id="bladeClip">
      <polygon points="150,18 157,118 143,118"/>
    </clipPath>

    <!-- Gold shimmer gradient for guard -->
    <linearGradient id="guardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6b4f00;stop-opacity:1"/>
      <stop offset="30%" style="stop-color:#d4af37;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#fff5cc;stop-opacity:1"/>
      <stop offset="70%" style="stop-color:#d4af37;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#6b4f00;stop-opacity:1"/>
    </linearGradient>

    <!-- Pommel gradient -->
    <radialGradient id="pommelGrad" cx="50%" cy="40%" r="55%">
      <stop offset="0%" style="stop-color:#fff0a0;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#d4af37;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#7a5c00;stop-opacity:1"/>
    </radialGradient>

    <!-- Grip gradient -->
    <linearGradient id="gripGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#2d2d4e;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle radial light behind sword -->
  <ellipse cx="150" cy="95" rx="38" ry="90" fill="none" stroke="#d4af37" stroke-width="0" opacity="0.12"/>
  <ellipse cx="150" cy="95" rx="38" ry="90" fill="#d4af3708" opacity="1"/>

  <!-- ============================================================ -->
  <!-- DATA VISUALIZATION BARS (visible through blade as overlay)   -->
  <!-- Stacked horizontal bars inside blade silhouette              -->
  <!-- ============================================================ -->

  <!-- Bar segments overlaid on blade using clip -->
  <g clip-path="url(#bladeClip)" opacity="0.55">
    <!-- Bottom bars (wider section near guard) -->
    <rect x="140" y="95" width="20" height="5" rx="1" fill="url(#barGrad1)"/>
    <rect x="140" y="87" width="20" height="5" rx="1" fill="url(#barGrad2)"/>
    <rect x="140" y="79" width="20" height="5" rx="1" fill="url(#barGrad3)"/>
    <rect x="140" y="71" width="20" height="5" rx="1" fill="url(#barGrad1)"/>
    <rect x="140" y="63" width="20" height="5" rx="1" fill="url(#barGrad2)"/>
    <rect x="140" y="55" width="20" height="5" rx="1" fill="url(#barGrad3)"/>
    <rect x="140" y="47" width="20" height="5" rx="1" fill="url(#barGrad1)"/>
    <rect x="140" y="39" width="20" height="5" rx="1" fill="url(#barGrad2)"/>
    <rect x="140" y="31" width="20" height="5" rx="1" fill="url(#barGrad3)"/>
    <rect x="140" y="23" width="20" height="5" rx="1" fill="url(#barGrad1)"/>
  </g>

  <!-- ============================================================ -->
  <!-- SWORD                                                         -->
  <!-- ============================================================ -->

  <!-- Ambient glow behind blade -->
  <polygon points="150,18 156,118 144,118" fill="#d4af37" opacity="0.13" filter="url(#ambientGlow)"/>

  <!-- Blade body (triangle: tip at top, base at guard) -->
  <polygon points="150,18 157,118 143,118" fill="url(#bladeGrad)" filter="url(#tipGlow)"/>

  <!-- Blade center fuller (ridge line) -->
  <line x1="150" y1="22" x2="150" y2="115" stroke="#ffffff" stroke-width="0.6" opacity="0.45"/>

  <!-- Blade edge shimmer left -->
  <line x1="150" y1="22" x2="143" y2="116" stroke="#e0e0e0" stroke-width="0.4" opacity="0.3"/>
  <!-- Blade edge shimmer right -->
  <line x1="150" y1="22" x2="157" y2="116" stroke="#e0e0e0" stroke-width="0.4" opacity="0.3"/>

  <!-- Guard (crossguard) -->
  <g filter="url(#guardGlow)">
    <!-- Main crossguard bar -->
    <rect x="124" y="116" width="52" height="7" rx="3.5" fill="url(#guardGrad)"/>
    <!-- Guard tips (quillons) - slightly flared -->
    <ellipse cx="124.5" cy="119.5" rx="4" ry="2.5" fill="#d4af37" opacity="0.9"/>
    <ellipse cx="175.5" cy="119.5" rx="4" ry="2.5" fill="#d4af37" opacity="0.9"/>
    <!-- Guard center diamond -->
    <polygon points="150,114 153,119.5 150,125 147,119.5" fill="#fff5a0" opacity="0.85"/>
  </g>

  <!-- Grip (handle below guard) -->
  <rect x="146" y="123" width="8" height="28" rx="3" fill="url(#gripGrad)"/>
  <!-- Grip wrapping lines -->
  <line x1="146" y1="128" x2="154" y2="128" stroke="#d4af37" stroke-width="0.8" opacity="0.5"/>
  <line x1="146" y1="133" x2="154" y2="133" stroke="#d4af37" stroke-width="0.8" opacity="0.5"/>
  <line x1="146" y1="138" x2="154" y2="138" stroke="#d4af37" stroke-width="0.8" opacity="0.5"/>
  <line x1="146" y1="143" x2="154" y2="143" stroke="#d4af37" stroke-width="0.8" opacity="0.5"/>

  <!-- Pommel -->
  <ellipse cx="150" cy="155" rx="7" ry="5.5" fill="url(#pommelGrad)" filter="url(#guardGlow)"/>
  <ellipse cx="150" cy="154" rx="3.5" ry="2" fill="#fff8cc" opacity="0.6"/>

  <!-- ============================================================ -->
  <!-- TYPOGRAPHY                                                    -->
  <!-- ============================================================ -->

  <!-- "AGENTIC LEAD GEN" — main wordmark -->
  <text
    x="150"
    y="177"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="11"
    font-weight="700"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="#d4af37"
    opacity="0.95"
  >AGENTIC LEAD GEN</text>

  <!-- Tagline -->
  <text
    x="150"
    y="191"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="6.5"
    font-weight="400"
    letter-spacing="2.2"
    text-anchor="middle"
    fill="#8899bb"
    opacity="0.75"
  >EXCALIBUR OF SALES</text>

  <!-- Decorative rule lines flanking title -->
  <line x1="30" y1="177" x2="94" y2="177" stroke="#d4af37" stroke-width="0.5" opacity="0.3"/>
  <line x1="206" y1="177" x2="270" y2="177" stroke="#d4af37" stroke-width="0.5" opacity="0.3"/>
</svg>` },
  { id: 50, title: "Phoenix Rise", concept: "geometric phoenix from digital flames", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a12;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#12080f;stop-opacity:1"/>
    </linearGradient>

    <!-- Phoenix body gradient -->
    <linearGradient id="phoenixGrad" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1"/>
      <stop offset="35%" style="stop-color:#ea580c;stop-opacity:1"/>
      <stop offset="65%" style="stop-color:#f97316;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:1"/>
    </linearGradient>

    <!-- Wing gradient -->
    <linearGradient id="wingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#991b1b;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#ea580c;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:0.85"/>
    </linearGradient>

    <!-- Wing gradient right -->
    <linearGradient id="wingGradR" x1="100%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#991b1b;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#ea580c;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:0.85"/>
    </linearGradient>

    <!-- Flame base gradient -->
    <linearGradient id="flameGrad" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" style="stop-color:#7f1d1d;stop-opacity:0.9"/>
      <stop offset="60%" style="stop-color:#dc2626;stop-opacity:0.8"/>
      <stop offset="100%" style="stop-color:#f97316;stop-opacity:0.3"/>
    </linearGradient>

    <!-- Data stream glow filter -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Body glow -->
    <filter id="bodyGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Outer radiance -->
    <radialGradient id="radiance" cx="50%" cy="52%" r="38%">
      <stop offset="0%" style="stop-color:#f97316;stop-opacity:0.18"/>
      <stop offset="70%" style="stop-color:#dc2626;stop-opacity:0.07"/>
      <stop offset="100%" style="stop-color:#dc2626;stop-opacity:0"/>
    </radialGradient>

    <!-- Clip for text area -->
    <clipPath id="logoClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Radiance halo behind phoenix -->
  <ellipse cx="150" cy="104" rx="62" ry="52" fill="url(#radiance)"/>

  <!-- === FLAME BASE === -->
  <!-- Central flame column -->
  <path d="M138 162 Q142 140 140 125 Q148 142 150 155 Q152 142 160 125 Q158 140 162 162 Z"
        fill="url(#flameGrad)" opacity="0.9"/>

  <!-- Left flame tongue -->
  <path d="M128 162 Q130 148 127 138 Q135 150 136 162 Z"
        fill="url(#flameGrad)" opacity="0.75"/>

  <!-- Right flame tongue -->
  <path d="M172 162 Q170 148 173 138 Q165 150 164 162 Z"
        fill="url(#flameGrad)" opacity="0.75"/>

  <!-- Flame base platform -->
  <path d="M118 165 Q134 155 150 158 Q166 155 182 165 L180 170 Q150 162 120 170 Z"
        fill="#7f1d1d" opacity="0.7"/>

  <!-- === DATA STREAM FEATHERS — LEFT WING === -->
  <!-- Wing structure — large left sweep -->
  <path d="M150 120 Q128 108 98 92 Q112 96 118 88 Q104 82 88 70 Q106 76 114 68 Q102 60 90 50 Q108 58 118 52 Q110 44 108 34 Q122 46 126 56 Q130 46 128 36 Q138 52 138 64 Q142 56 140 44 Q148 60 146 74 Q150 70 150 58 Q156 74 152 88 Z"
        fill="url(#wingGrad)" filter="url(#glow)"/>

  <!-- Data stream lines — left feathers -->
  <line x1="130" y1="118" x2="100" y2="95" stroke="#fbbf24" stroke-width="0.7" opacity="0.65" filter="url(#glow)"/>
  <line x1="126" y1="112" x2="92" y2="84" stroke="#f97316" stroke-width="0.55" opacity="0.55" filter="url(#glow)"/>
  <line x1="122" y1="104" x2="96" y2="74" stroke="#fbbf24" stroke-width="0.7" opacity="0.6" filter="url(#glow)"/>
  <line x1="118" y1="95" x2="100" y2="62" stroke="#f97316" stroke-width="0.55" opacity="0.5" filter="url(#glow)"/>
  <line x1="116" y1="86" x2="108" y2="50" stroke="#fbbf24" stroke-width="0.6" opacity="0.55" filter="url(#glow)"/>
  <line x1="122" y1="76" x2="116" y2="42" stroke="#fbbf24" stroke-width="0.5" opacity="0.45" filter="url(#glow)"/>
  <line x1="130" y1="70" x2="126" y2="40" stroke="#f97316" stroke-width="0.5" opacity="0.4" filter="url(#glow)"/>
  <!-- bit stream dots on left feather -->
  <circle cx="106" cy="87" r="0.8" fill="#fbbf24" opacity="0.8"/>
  <circle cx="98" cy="76" r="0.7" fill="#f97316" opacity="0.7"/>
  <circle cx="104" cy="65" r="0.8" fill="#fbbf24" opacity="0.7"/>
  <circle cx="112" cy="54" r="0.7" fill="#fbbf24" opacity="0.65"/>
  <circle cx="120" cy="46" r="0.6" fill="#f97316" opacity="0.6"/>

  <!-- === DATA STREAM FEATHERS — RIGHT WING === -->
  <path d="M150 120 Q172 108 202 92 Q188 96 182 88 Q196 82 212 70 Q194 76 186 68 Q198 60 210 50 Q192 58 182 52 Q190 44 192 34 Q178 46 174 56 Q170 46 172 36 Q162 52 162 64 Q158 56 160 44 Q152 60 154 74 Q150 70 150 58 Q144 74 148 88 Z"
        fill="url(#wingGradR)" filter="url(#glow)"/>

  <!-- Data stream lines — right feathers -->
  <line x1="170" y1="118" x2="200" y2="95" stroke="#fbbf24" stroke-width="0.7" opacity="0.65" filter="url(#glow)"/>
  <line x1="174" y1="112" x2="208" y2="84" stroke="#f97316" stroke-width="0.55" opacity="0.55" filter="url(#glow)"/>
  <line x1="178" y1="104" x2="204" y2="74" stroke="#fbbf24" stroke-width="0.7" opacity="0.6" filter="url(#glow)"/>
  <line x1="182" y1="95" x2="200" y2="62" stroke="#f97316" stroke-width="0.55" opacity="0.5" filter="url(#glow)"/>
  <line x1="184" y1="86" x2="192" y2="50" stroke="#fbbf24" stroke-width="0.6" opacity="0.55" filter="url(#glow)"/>
  <line x1="178" y1="76" x2="184" y2="42" stroke="#fbbf24" stroke-width="0.5" opacity="0.45" filter="url(#glow)"/>
  <line x1="170" y1="70" x2="174" y2="40" stroke="#f97316" stroke-width="0.5" opacity="0.4" filter="url(#glow)"/>
  <!-- bit stream dots on right feather -->
  <circle cx="194" cy="87" r="0.8" fill="#fbbf24" opacity="0.8"/>
  <circle cx="202" cy="76" r="0.7" fill="#f97316" opacity="0.7"/>
  <circle cx="196" cy="65" r="0.8" fill="#fbbf24" opacity="0.7"/>
  <circle cx="188" cy="54" r="0.7" fill="#fbbf24" opacity="0.65"/>
  <circle cx="180" cy="46" r="0.6" fill="#f97316" opacity="0.6"/>

  <!-- === PHOENIX BODY (geometric) === -->
  <g filter="url(#bodyGlow)">
    <!-- Tail feathers (geometric triangles downward) -->
    <polygon points="150,138 144,158 150,148" fill="#ea580c" opacity="0.9"/>
    <polygon points="150,138 156,158 150,148" fill="#dc2626" opacity="0.9"/>
    <polygon points="144,140 136,160 143,150" fill="#b91c1c" opacity="0.7"/>
    <polygon points="156,140 164,160 157,150" fill="#b91c1c" opacity="0.7"/>

    <!-- Body core — pentagon/diamond shape -->
    <polygon points="150,78 162,95 158,120 150,126 142,120 138,95"
             fill="url(#phoenixGrad)" opacity="0.97"/>

    <!-- Body highlight facets -->
    <polygon points="150,78 162,95 150,100" fill="#fbbf24" opacity="0.22"/>
    <polygon points="150,78 138,95 150,100" fill="#f97316" opacity="0.15"/>
    <polygon points="150,100 162,95 158,120 150,114" fill="#ea580c" opacity="0.3"/>
    <polygon points="150,100 138,95 142,120 150,114" fill="#dc2626" opacity="0.28"/>

    <!-- Chest data circuit lines -->
    <line x1="145" y1="100" x2="155" y2="100" stroke="#fbbf24" stroke-width="0.6" opacity="0.6"/>
    <line x1="143" y1="106" x2="157" y2="106" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>
    <line x1="144" y1="112" x2="156" y2="112" stroke="#f97316" stroke-width="0.5" opacity="0.45"/>
    <circle cx="150" cy="100" r="1" fill="#fef3c7" opacity="0.8"/>
    <circle cx="145" cy="106" r="0.7" fill="#fbbf24" opacity="0.7"/>
    <circle cx="155" cy="106" r="0.7" fill="#fbbf24" opacity="0.7"/>

    <!-- Neck -->
    <polygon points="148,78 152,78 154,68 146,68" fill="url(#phoenixGrad)" opacity="0.95"/>

    <!-- HEAD — geometric hexagonal -->
    <polygon points="150,52 160,58 160,70 150,76 140,70 140,58"
             fill="url(#phoenixGrad)" opacity="1"/>
    <!-- Head facets -->
    <polygon points="150,52 160,58 150,60" fill="#fef3c7" opacity="0.3"/>
    <polygon points="150,52 140,58 150,60" fill="#fbbf24" opacity="0.2"/>

    <!-- Eye — data node -->
    <circle cx="154" cy="63" r="3.2" fill="#1a0505" opacity="0.95"/>
    <circle cx="154" cy="63" r="2" fill="#fbbf24" opacity="0.9"/>
    <circle cx="154" cy="63" r="1" fill="#fff" opacity="0.95"/>
    <circle cx="146" cy="63" r="3.2" fill="#1a0505" opacity="0.95"/>
    <circle cx="146" cy="63" r="2" fill="#fbbf24" opacity="0.9"/>
    <circle cx="146" cy="63" r="1" fill="#fff" opacity="0.95"/>

    <!-- Beak (geometric triangle) -->
    <polygon points="150,69 145,74 155,74" fill="#f59e0b" opacity="0.95"/>

    <!-- Crown feathers (data stream upward) -->
    <line x1="150" y1="52" x2="150" y2="38" stroke="#fbbf24" stroke-width="1" opacity="0.8" filter="url(#glow)"/>
    <line x1="147" y1="54" x2="143" y2="40" stroke="#f97316" stroke-width="0.8" opacity="0.7" filter="url(#glow)"/>
    <line x1="153" y1="54" x2="157" y2="40" stroke="#f97316" stroke-width="0.8" opacity="0.7" filter="url(#glow)"/>
    <line x1="145" y1="56" x2="138" y2="44" stroke="#ea580c" stroke-width="0.6" opacity="0.55" filter="url(#glow)"/>
    <line x1="155" y1="56" x2="162" y2="44" stroke="#ea580c" stroke-width="0.6" opacity="0.55" filter="url(#glow)"/>
    <!-- Crown tips (diamond nodes) -->
    <polygon points="150,36 152,40 150,38 148,40" fill="#fef3c7" opacity="0.9"/>
    <polygon points="143,38 145,42 143,40 141,42" fill="#fbbf24" opacity="0.8"/>
    <polygon points="157,38 159,42 157,40 155,42" fill="#fbbf24" opacity="0.8"/>
  </g>

  <!-- === DIGITAL PARTICLES / SPARKS === -->
  <g opacity="0.7">
    <circle cx="82" cy="95" r="0.9" fill="#fbbf24" filter="url(#glow)"/>
    <circle cx="75" cy="108" r="0.7" fill="#f97316"/>
    <circle cx="88" cy="118" r="1" fill="#fbbf24" filter="url(#glow)"/>
    <circle cx="218" cy="95" r="0.9" fill="#fbbf24" filter="url(#glow)"/>
    <circle cx="225" cy="108" r="0.7" fill="#f97316"/>
    <circle cx="212" cy="118" r="1" fill="#fbbf24" filter="url(#glow)"/>
    <circle cx="130" cy="44" r="0.7" fill="#fbbf24"/>
    <circle cx="170" cy="44" r="0.7" fill="#fbbf24"/>
    <circle cx="115" cy="60" r="0.6" fill="#f97316"/>
    <circle cx="185" cy="60" r="0.6" fill="#f97316"/>
  </g>

  <!-- === TEXT === -->
  <!-- "AGENTIC" — main brand word -->
  <text x="150" y="180"
        font-family="'Arial', 'Helvetica Neue', sans-serif"
        font-size="13"
        font-weight="800"
        letter-spacing="5"
        text-anchor="middle"
        fill="url(#phoenixGrad)"
        filter="url(#glow)">AGENTIC</text>

  <!-- "LEAD GEN" — subtitle -->
  <text x="150" y="194"
        font-family="'Arial', 'Helvetica Neue', sans-serif"
        font-size="7.5"
        font-weight="400"
        letter-spacing="4"
        text-anchor="middle"
        fill="#9ca3af"
        opacity="0.85">LEAD  GEN</text>

  <!-- Thin separating line above text -->
  <line x1="100" y1="172" x2="200" y2="172" stroke="#ea580c" stroke-width="0.4" opacity="0.5"/>
</svg>` },
  { id: 51, title: "Vault Lock", concept: "open padlock with arrow shackle", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3a3f47;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e2227;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f0c040;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c8900a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shackleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#c8900a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f0c040;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#12151a" rx="12"/>

  <!-- Subtle grid lines -->
  <line x1="0" y1="100" x2="300" y2="100" stroke="#ffffff" stroke-opacity="0.03" stroke-width="1"/>
  <line x1="150" y1="0" x2="150" y2="200" stroke="#ffffff" stroke-opacity="0.03" stroke-width="1"/>

  <!-- Lock body -->
  <rect x="95" y="105" width="80" height="62" rx="8" ry="8" fill="url(#bodyGrad)" stroke="#4a5060" stroke-width="1.5" filter="url(#shadow)"/>

  <!-- Lock body highlight -->
  <rect x="95" y="105" width="80" height="14" rx="8" ry="8" fill="#ffffff" fill-opacity="0.05"/>

  <!-- Keyhole circle -->
  <circle cx="135" cy="133" r="10" fill="#12151a" stroke="#c8900a" stroke-width="1.5"/>

  <!-- Keyhole slot -->
  <rect x="131.5" y="133" width="7" height="14" rx="3.5" fill="#12151a" stroke="#c8900a" stroke-width="1.5"/>

  <!-- Gold accent strip on lock body bottom -->
  <rect x="95" y="158" width="80" height="9" rx="0" ry="0" fill="url(#goldGrad)" opacity="0.18" rx="0 0 8 8"/>

  <!-- Open shackle forming upward arrow -->
  <!-- Left vertical of shackle -->
  <line x1="113" y1="104" x2="113" y2="76" stroke="url(#shackleGrad)" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Arrow shaft (right side, extends upward past normal shackle height) -->
  <line x1="157" y1="104" x2="157" y2="52" stroke="url(#shackleGrad)" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Arrow head (pointing up) -->
  <polygon points="157,36 144,56 170,56" fill="url(#goldGrad)" filter="url(#glow)"/>

  <!-- Shackle curved top-left (connecting left post to top) -->
  <path d="M113,76 Q113,62 126,62 Q133,62 135,68" fill="none" stroke="url(#shackleGrad)" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Small gold dot accent on lock face -->
  <circle cx="155" cy="119" r="2.5" fill="#f0c040" opacity="0.7"/>

  <!-- Rivet accents on lock body -->
  <circle cx="104" cy="114" r="2" fill="#4a5060"/>
  <circle cx="166" cy="114" r="2" fill="#4a5060"/>

  <!-- Text: AGENTIC LEAD GEN -->
  <text x="150" y="185" text-anchor="middle" font-family="'Arial', 'Helvetica', sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="#c8900a" opacity="0.95">AGENTIC LEAD GEN</text>

  <!-- Thin gold underline -->
  <line x1="83" y1="189" x2="217" y2="189" stroke="#c8900a" stroke-width="0.75" opacity="0.5"/>
</svg>` },
  { id: 52, title: "River Delta", concept: "branching river representing outreach", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5e6c8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8d5a3;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="riverMain" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a6b9a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4ab8e8;stop-opacity:0.7" />
    </linearGradient>
    <linearGradient id="riverBranch1" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%" style="stop-color:#2980b9;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#5bc8f0;stop-opacity:0.4" />
    </linearGradient>
    <linearGradient id="riverBranch2" x1="0%" y1="0%" x2="-30%" y2="100%">
      <stop offset="0%" style="stop-color:#2980b9;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#5bc8f0;stop-opacity:0.4" />
    </linearGradient>
    <linearGradient id="tinyStream" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3498db;stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:#7ad4f5;stop-opacity:0.2" />
    </linearGradient>
    <filter id="blur1" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.8" />
    </filter>
    <filter id="softShadow">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#1a6b9a" flood-opacity="0.2"/>
    </filter>
  </defs>

  <!-- Background: sandy beige -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle sand texture dots -->
  <circle cx="20" cy="15" r="1.2" fill="#d4b896" opacity="0.5"/>
  <circle cx="55" cy="30" r="0.8" fill="#d4b896" opacity="0.4"/>
  <circle cx="270" cy="20" r="1" fill="#d4b896" opacity="0.5"/>
  <circle cx="240" cy="45" r="1.4" fill="#d4b896" opacity="0.3"/>
  <circle cx="40" cy="80" r="0.9" fill="#c9a97a" opacity="0.4"/>
  <circle cx="260" cy="100" r="1.1" fill="#c9a97a" opacity="0.3"/>
  <circle cx="15" cy="140" r="1.3" fill="#c9a97a" opacity="0.4"/>
  <circle cx="285" cy="150" r="0.7" fill="#c9a97a" opacity="0.3"/>

  <!-- === RIVER DELTA === -->
  <!-- Main trunk coming from top, slightly left of center -->
  <path d="M148,10 C148,10 146,25 145,38 C144,50 143,58 143,68" 
        stroke="url(#riverMain)" stroke-width="9" fill="none" 
        stroke-linecap="round" filter="url(#softShadow)" opacity="0.95"/>
  
  <!-- Main trunk wider body -->
  <path d="M148,10 C149,18 148,30 147,45 C146,55 145,62 144,70" 
        stroke="#1a6b9a" stroke-width="7" fill="none" 
        stroke-linecap="round" opacity="0.3"/>

  <!-- First major split at ~y=68 -->
  <!-- Left major branch -->
  <path d="M143,68 C140,76 135,85 128,95 C120,108 110,118 98,128" 
        stroke="url(#riverBranch2)" stroke-width="7" fill="none" 
        stroke-linecap="round" opacity="0.9"/>
  
  <!-- Right major branch -->
  <path d="M143,68 C147,76 152,85 158,95 C165,106 174,116 184,126" 
        stroke="url(#riverBranch1)" stroke-width="7" fill="none" 
        stroke-linecap="round" opacity="0.9"/>

  <!-- Center minor branch -->
  <path d="M143,68 C143,78 143,88 142,100 C141,112 140,120 139,130" 
        stroke="url(#riverMain)" stroke-width="5" fill="none" 
        stroke-linecap="round" opacity="0.75"/>

  <!-- === SECOND LEVEL SPLITS === -->
  <!-- Left branch splits -->
  <path d="M98,128 C90,136 80,142 68,148 C58,153 46,157 32,160" 
        stroke="url(#tinyStream)" stroke-width="4.5" fill="none" 
        stroke-linecap="round" opacity="0.85"/>
  
  <path d="M98,128 C96,138 94,146 92,154 C90,162 88,168 84,175" 
        stroke="url(#tinyStream)" stroke-width="3.5" fill="none" 
        stroke-linecap="round" opacity="0.7"/>

  <!-- Center branch splits -->
  <path d="M139,130 C134,140 128,148 120,156 C112,163 104,168 94,173" 
        stroke="url(#tinyStream)" stroke-width="3.5" fill="none" 
        stroke-linecap="round" opacity="0.7"/>
  
  <path d="M139,130 C140,140 142,150 144,158 C146,166 148,172 148,180" 
        stroke="url(#tinyStream)" stroke-width="3" fill="none" 
        stroke-linecap="round" opacity="0.65"/>

  <!-- Right branch splits -->
  <path d="M184,126 C188,136 192,144 198,152 C204,160 210,166 216,172" 
        stroke="url(#tinyStream)" stroke-width="3.5" fill="none" 
        stroke-linecap="round" opacity="0.7"/>
  
  <path d="M184,126 C192,134 200,140 210,146 C220,152 232,156 246,160" 
        stroke="url(#tinyStream)" stroke-width="4" fill="none" 
        stroke-linecap="round" opacity="0.8"/>

  <!-- === THIRD LEVEL — tiny capillary streams === -->
  <path d="M32,160 C24,163 16,165 8,166" 
        stroke="#4ab8e8" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
  
  <path d="M32,160 C28,166 24,170 20,175" 
        stroke="#4ab8e8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>

  <path d="M68,148 C62,154 56,160 50,165" 
        stroke="#4ab8e8" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.55"/>

  <path d="M84,175 C80,180 76,184 72,188" 
        stroke="#4ab8e8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>

  <path d="M94,173 C90,178 88,182 86,187" 
        stroke="#5bc8f0" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>

  <path d="M148,180 C146,184 145,188 144,193" 
        stroke="#5bc8f0" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.4"/>

  <path d="M216,172 C220,176 224,180 226,185" 
        stroke="#4ab8e8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>

  <path d="M246,160 C254,163 262,164 270,164" 
        stroke="#4ab8e8" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.55"/>

  <path d="M246,160 C250,166 254,172 256,178" 
        stroke="#4ab8e8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>

  <!-- Small estuary dots / pools at tips -->
  <ellipse cx="8" cy="166" rx="4" ry="2.5" fill="#5bc8f0" opacity="0.35"/>
  <ellipse cx="20" cy="176" rx="3" ry="2" fill="#5bc8f0" opacity="0.3"/>
  <ellipse cx="50" cy="166" rx="3.5" ry="2" fill="#5bc8f0" opacity="0.35"/>
  <ellipse cx="72" cy="189" rx="3" ry="2" fill="#5bc8f0" opacity="0.3"/>
  <ellipse cx="86" cy="187" rx="3" ry="1.8" fill="#5bc8f0" opacity="0.3"/>
  <ellipse cx="144" cy="193" rx="3" ry="2" fill="#5bc8f0" opacity="0.3"/>
  <ellipse cx="226" cy="186" rx="3" ry="2" fill="#5bc8f0" opacity="0.3"/>
  <ellipse cx="270" cy="164" rx="4.5" ry="2.5" fill="#5bc8f0" opacity="0.35"/>
  <ellipse cx="256" cy="178" rx="3" ry="2" fill="#5bc8f0" opacity="0.3"/>

  <!-- Source node — circle at top -->
  <circle cx="148" cy="10" r="5.5" fill="#1a6b9a" opacity="0.9"/>
  <circle cx="148" cy="10" r="3" fill="#5bc8f0" opacity="0.8"/>

  <!-- === TEXT === -->
  <!-- "AGENTIC" — primary, dark -->
  <text x="150" y="103" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="13" 
        font-weight="700" 
        fill="#1a3d5c" 
        text-anchor="middle" 
        letter-spacing="3.5"
        opacity="0.92">AGENTIC</text>

  <!-- "LEAD GEN" — secondary, slightly lighter -->
  <text x="150" y="118" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="9.5" 
        font-weight="400" 
        fill="#2c6e99" 
        text-anchor="middle" 
        letter-spacing="5"
        opacity="0.85">LEAD GEN</text>

  <!-- Subtle horizontal rule under text -->
  <line x1="118" y1="122" x2="182" y2="122" 
        stroke="#2c6e99" stroke-width="0.6" opacity="0.4"/>
</svg>` },
  { id: 53, title: "Satellite Dish", concept: "dish broadcasting signal arcs", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200" style="background:#ffffff">
  <defs>
    <linearGradient id="dishGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e8ecf0;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#b8c4ce;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="dishInner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d0d8e0;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#9aaab8;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="poleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#8a9aaa;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#b8c4ce;stop-opacity:1"/>
    </linearGradient>
    <filter id="signalGlow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <clipPath id="dishClip">
      <ellipse cx="108" cy="105" rx="52" ry="58"/>
    </clipPath>
  </defs>

  <!-- Signal arcs radiating outward from focal point -->
  <!-- Arc 1 - innermost -->
  <path d="M 155 72 Q 175 88 168 115 Q 162 135 148 148"
        fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"
        opacity="0.9" filter="url(#signalGlow)"/>
  <!-- Arc 2 -->
  <path d="M 162 62 Q 192 82 184 118 Q 176 148 156 162"
        fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round"
        opacity="0.75" filter="url(#signalGlow)"/>
  <!-- Arc 3 -->
  <path d="M 170 51 Q 210 76 200 122 Q 190 162 164 178"
        fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"
        opacity="0.6" filter="url(#signalGlow)"/>
  <!-- Arc 4 - outermost -->
  <path d="M 178 40 Q 228 70 217 126 Q 206 176 172 194"
        fill="none" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round"
        opacity="0.45" filter="url(#signalGlow)"/>

  <!-- Dish shadow/base shape for depth -->
  <ellipse cx="111" cy="108" rx="54" ry="60" fill="#9aaab8" opacity="0.3" transform="rotate(-15 111 108)"/>

  <!-- Main parabolic dish body -->
  <path d="M 68 58 Q 58 105 78 148 Q 92 168 115 162 Q 138 155 155 128 Q 168 105 158 72 Q 145 48 118 48 Q 90 48 68 58 Z"
        fill="url(#dishGrad)" stroke="#8a9aaa" stroke-width="1.5"/>

  <!-- Dish inner surface (concave highlight) -->
  <path d="M 76 68 Q 68 105 85 142 Q 97 158 116 153 Q 133 147 147 124 Q 158 104 149 76 Q 138 55 115 56 Q 92 56 76 68 Z"
        fill="url(#dishInner)" stroke="#a0b0be" stroke-width="0.8"/>

  <!-- Dish surface ribs for industrial detail -->
  <path d="M 88 58 Q 80 105 95 148" fill="none" stroke="#8a9aaa" stroke-width="0.8" opacity="0.6"/>
  <path d="M 108 52 Q 100 105 108 155" fill="none" stroke="#8a9aaa" stroke-width="0.8" opacity="0.6"/>
  <path d="M 128 54 Q 126 105 122 153" fill="none" stroke="#8a9aaa" stroke-width="0.8" opacity="0.5"/>
  <path d="M 146 62 Q 150 105 140 148" fill="none" stroke="#8a9aaa" stroke-width="0.8" opacity="0.4"/>

  <!-- Horizontal rib lines -->
  <path d="M 72 80 Q 113 74 152 82" fill="none" stroke="#8a9aaa" stroke-width="0.7" opacity="0.5"/>
  <path d="M 68 105 Q 113 99 158 106" fill="none" stroke="#8a9aaa" stroke-width="0.7" opacity="0.5"/>
  <path d="M 74 130 Q 113 124 152 130" fill="none" stroke="#8a9aaa" stroke-width="0.7" opacity="0.5"/>

  <!-- Dish rim edge highlight -->
  <path d="M 68 58 Q 58 105 78 148 Q 92 168 115 162 Q 138 155 155 128 Q 168 105 158 72 Q 145 48 118 48 Q 90 48 68 58 Z"
        fill="none" stroke="#d0d8e0" stroke-width="1" opacity="0.8"/>

  <!-- Feed arm (strut pointing to focal point) -->
  <line x1="115" y1="105" x2="150" y2="75" stroke="url(#poleGrad)" stroke-width="3" stroke-linecap="round"/>
  <line x1="115" y1="105" x2="150" y2="75" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.5"/>

  <!-- Feed horn / focal point -->
  <circle cx="151" cy="73" r="5" fill="#b8c4ce" stroke="#8a9aaa" stroke-width="1.5"/>
  <circle cx="151" cy="73" r="3" fill="#2563eb" opacity="0.9"/>
  <circle cx="151" cy="73" r="1.5" fill="#93c5fd"/>

  <!-- Mount pole -->
  <rect x="109" y="162" width="12" height="28" rx="2" fill="url(#poleGrad)" stroke="#8a9aaa" stroke-width="1"/>
  <rect x="110" y="162" width="4" height="28" rx="1" fill="#d0d8e0" opacity="0.5"/>

  <!-- Base mount -->
  <rect x="96" y="188" width="38" height="6" rx="3" fill="#8a9aaa" stroke="#6a7a8a" stroke-width="1"/>
  <rect x="100" y="187" width="30" height="4" rx="2" fill="#b8c4ce" opacity="0.6"/>

  <!-- Tilt joint -->
  <ellipse cx="115" cy="163" rx="8" ry="5" fill="#9aaab8" stroke="#6a7a8a" stroke-width="1"/>
  <ellipse cx="115" cy="163" rx="5" ry="3" fill="#b8c4ce"/>

  <!-- Brand label -->
  <text x="150" y="26" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" fill="#1e3a5f" letter-spacing="0.5" text-anchor="middle">AGENTIC</text>
  <text x="150" y="41" font-family="'Helvetica Neue', Arial, sans-serif" font-size="9" font-weight="400" fill="#2563eb" letter-spacing="2" text-anchor="middle">LEAD GEN</text>

  <!-- Small signal dot indicators on arcs -->
  <circle cx="168" cy="114" r="2" fill="#2563eb" opacity="0.8"/>
  <circle cx="183" cy="118" r="2" fill="#3b82f6" opacity="0.65"/>
  <circle cx="199" cy="122" r="2" fill="#60a5fa" opacity="0.5"/>
  <circle cx="216" cy="126" r="2" fill="#93c5fd" opacity="0.4"/>
</svg>` },
  { id: 54, title: "Bullseye Target", concept: "ICP scoring archery target", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200" font-family="'Segoe UI', Arial, sans-serif">
  <!-- Background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Outermost ring: Industry -->
  <circle cx="150" cy="105" r="88" fill="#FF6B35"/>
  <!-- Ring 4: Size -->
  <circle cx="150" cy="105" r="68" fill="#FF8C00"/>
  <!-- Ring 3: Budget -->
  <circle cx="150" cy="105" r="48" fill="#FFC107"/>
  <!-- Ring 2: Fit -->
  <circle cx="150" cy="105" r="28" fill="#FF3D00"/>
  <!-- Bullseye: Perfect Lead -->
  <circle cx="150" cy="105" r="14" fill="#B71C1C"/>
  <!-- Bullseye highlight -->
  <circle cx="150" cy="105" r="7" fill="#FFFFFF" opacity="0.35"/>

  <!-- Ring separator strokes -->
  <circle cx="150" cy="105" r="88" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
  <circle cx="150" cy="105" r="68" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
  <circle cx="150" cy="105" r="48" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
  <circle cx="150" cy="105" r="28" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
  <circle cx="150" cy="105" r="14" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>

  <!-- Crosshair lines -->
  <line x1="150" y1="17" x2="150" y2="62" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
  <line x1="150" y1="148" x2="150" y2="193" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
  <line x1="62" y1="105" x2="107" y2="105" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
  <line x1="193" y1="105" x2="238" y2="105" stroke="#fff" stroke-width="1.5" opacity="0.5"/>

  <!-- Label: INDUSTRY (outermost ring, top arc area) -->
  <text x="150" y="28" text-anchor="middle" font-size="8.5" font-weight="700" fill="#FF6B35" letter-spacing="1" text-decoration="none">INDUSTRY</text>

  <!-- Label: SIZE (ring 4) -->
  <text x="150" y="46" text-anchor="middle" font-size="7.5" font-weight="700" fill="#FF8C00" letter-spacing="0.8">SIZE</text>

  <!-- Label: BUDGET (ring 3, rendered on the ring itself) -->
  <!-- Left side of ring 3 -->
  <text x="98" y="108" text-anchor="middle" font-size="6.5" font-weight="700" fill="#fff" letter-spacing="0.5">BUDGET</text>

  <!-- Label: FIT (ring 2) -->
  <text x="179" y="108" text-anchor="middle" font-size="6.5" font-weight="700" fill="#fff" letter-spacing="0.5">FIT</text>

  <!-- Bullseye label: PERFECT LEAD -->
  <text x="150" y="101" text-anchor="middle" font-size="4.8" font-weight="800" fill="#fff" letter-spacing="0.3">PERFECT</text>
  <text x="150" y="109" text-anchor="middle" font-size="4.8" font-weight="800" fill="#fff" letter-spacing="0.3">LEAD</text>

  <!-- Arrow shaft -->
  <line x1="242" y1="63" x2="164" y2="97" stroke="#4A2C0A" stroke-width="3" stroke-linecap="round"/>
  <!-- Arrowhead -->
  <polygon points="161,95 170,88 168,100" fill="#4A2C0A"/>
  <!-- Arrow fletching -->
  <polygon points="245,60 253,55 248,65" fill="#CC3300" opacity="0.85"/>
  <polygon points="245,60 253,68 248,65" fill="#FF6B35" opacity="0.85"/>

  <!-- Bottom title area separator -->
  <rect x="20" y="168" width="260" height="1" fill="#FF6B35" opacity="0.25"/>

  <!-- Title text -->
  <text x="150" y="183" text-anchor="middle" font-size="13" font-weight="800" fill="#1A1A1A" letter-spacing="1.5">AGENTIC</text>
  <text x="150" y="197" text-anchor="middle" font-size="9" font-weight="600" fill="#FF6B35" letter-spacing="3">LEAD GEN</text>
</svg>` },
  { id: 55, title: "Speedometer", concept: "velocity gauge in the red zone", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="gaugeBody" cx="50%" cy="60%" r="50%">
      <stop offset="0%" stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#111111"/>
    </radialGradient>
    <radialGradient id="gaugeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="needleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#cc0000"/>
      <stop offset="50%" stop-color="#ff2222"/>
      <stop offset="100%" stop-color="#ff4444"/>
    </linearGradient>
    <clipPath id="gaugeClip">
      <path d="M 30 155 A 120 120 0 0 1 270 155 Z"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#0d0d0d" rx="12"/>

  <!-- Outer gauge bezel -->
  <circle cx="150" cy="155" r="128" fill="none" stroke="#333333" stroke-width="3"/>
  <circle cx="150" cy="155" r="125" fill="url(#gaugeBody)"/>

  <!-- Red zone arc (right side ~80-100%) -->
  <path d="M 150 155 L 243 88" stroke="none" fill="none"/>
  <!-- Red zone background fill -->
  <path d="M 150 155 L 252 103 A 115 115 0 0 0 197 44 Z" fill="#3a0000" opacity="0.7"/>

  <!-- Gauge arc track background -->
  <path d="M 35 155 A 115 115 0 0 1 265 155" fill="none" stroke="#222222" stroke-width="14" stroke-linecap="round"/>

  <!-- Green zone arc (0-60%) -->
  <path d="M 35 155 A 115 115 0 0 1 120 47" fill="none" stroke="#1a4a1a" stroke-width="14" stroke-linecap="butt" opacity="0.8"/>

  <!-- Yellow zone arc (60-80%) -->
  <path d="M 120 47 A 115 115 0 0 1 197 44" fill="none" stroke="#3a3a00" stroke-width="14" stroke-linecap="butt" opacity="0.8"/>

  <!-- Red zone arc (80-100%) -->
  <path d="M 197 44 A 115 115 0 0 1 265 155" fill="none" stroke="#3a0808" stroke-width="14" stroke-linecap="round" opacity="0.9"/>

  <!-- Speed markings - neon green tick marks -->
  <!-- Major ticks every 18 degrees from 210 to -30 (total 240 degrees) -->
  <!-- 0 mark at 210deg -->
  <line x1="150" y1="155" x2="150" y2="155"
    transform="rotate(210 150 155) translate(0 -115)"
    stroke="#39ff14" stroke-width="2.5"/>

  <!-- Using transform approach for tick marks at specific angles -->
  <!-- Angle mapping: 210deg = 0, 150deg = max (240 degree sweep) -->

  <!-- Tick at 210deg (0) -->
  <line x1="150" y1="42" x2="150" y2="55" transform="rotate(210 150 155)" stroke="#39ff14" stroke-width="2.5" filter="url(#subtleGlow)"/>
  <!-- Tick at 234deg -->
  <line x1="150" y1="42" x2="150" y2="52" transform="rotate(234 150 155)" stroke="#39ff14" stroke-width="1.5"/>
  <!-- Tick at 258deg -->
  <line x1="150" y1="42" x2="150" y2="55" transform="rotate(258 150 155)" stroke="#39ff14" stroke-width="2.5" filter="url(#subtleGlow)"/>
  <!-- Tick at 282deg -->
  <line x1="150" y1="42" x2="150" y2="52" transform="rotate(282 150 155)" stroke="#39ff14" stroke-width="1.5"/>
  <!-- Tick at 306deg (top ~60) -->
  <line x1="150" y1="42" x2="150" y2="55" transform="rotate(306 150 155)" stroke="#39ff14" stroke-width="2.5" filter="url(#subtleGlow)"/>
  <!-- Tick at 330deg -->
  <line x1="150" y1="42" x2="150" y2="52" transform="rotate(330 150 155)" stroke="#ffd700" stroke-width="1.5"/>
  <!-- Tick at 354deg (top 12 o'clock area) -->
  <line x1="150" y1="42" x2="150" y2="55" transform="rotate(354 150 155)" stroke="#ffd700" stroke-width="2.5"/>
  <!-- Tick at 18deg -->
  <line x1="150" y1="42" x2="150" y2="52" transform="rotate(18 150 155)" stroke="#ff4400" stroke-width="1.5"/>
  <!-- Tick at 42deg -->
  <line x1="150" y1="42" x2="150" y2="55" transform="rotate(42 150 155)" stroke="#ff2200" stroke-width="2.5" filter="url(#subtleGlow)"/>
  <!-- Tick at 66deg -->
  <line x1="150" y1="42" x2="150" y2="52" transform="rotate(66 150 155)" stroke="#ff0000" stroke-width="1.5"/>
  <!-- Tick at 90deg (MAX - 150deg) -->
  <line x1="150" y1="42" x2="150" y2="55" transform="rotate(90 150 155)" stroke="#ff0000" stroke-width="2.5" filter="url(#redGlow)"/>

  <!-- Speed labels -->
  <text transform="rotate(210 150 155) translate(150 33)" text-anchor="middle" fill="#39ff14" font-size="9" font-family="'Courier New', monospace" font-weight="bold">0</text>
  <text transform="rotate(258 150 155) translate(150 33)" text-anchor="middle" fill="#39ff14" font-size="9" font-family="'Courier New', monospace" font-weight="bold">20</text>
  <text transform="rotate(306 150 155) translate(150 33)" text-anchor="middle" fill="#39ff14" font-size="9" font-family="'Courier New', monospace" font-weight="bold">40</text>
  <text transform="rotate(354 150 155) translate(150 33)" text-anchor="middle" fill="#ffd700" font-size="9" font-family="'Courier New', monospace" font-weight="bold">60</text>
  <text transform="rotate(42 150 155) translate(150 33)" text-anchor="middle" fill="#ff4400" font-size="9" font-family="'Courier New', monospace" font-weight="bold">80</text>
  <text transform="rotate(90 150 155) translate(150 33)" text-anchor="middle" fill="#ff0000" font-size="8" font-family="'Courier New', monospace" font-weight="bold" filter="url(#redGlow)">MAX</text>

  <!-- "MAX LEADS" label in red zone -->
  <text x="226" y="78" text-anchor="middle" fill="#ff2222" font-size="6.5" font-family="'Courier New', monospace" font-weight="bold" transform="rotate(-25 226 78)" filter="url(#redGlow)">MAX</text>
  <text x="233" y="88" text-anchor="middle" fill="#ff2222" font-size="6.5" font-family="'Courier New', monospace" font-weight="bold" transform="rotate(-25 233 88)" filter="url(#redGlow)">LEADS</text>

  <!-- Needle shadow/glow base -->
  <line x1="150" y1="155" x2="150" y2="55"
    transform="rotate(83 150 155)"
    stroke="#ff000044" stroke-width="6" stroke-linecap="round"/>

  <!-- Main needle - pointing to MAX LEADS (~83 degrees = ~93% of range) -->
  <line x1="150" y1="155" x2="150" y2="58"
    transform="rotate(83 150 155)"
    stroke="url(#needleGrad)" stroke-width="3" stroke-linecap="round"
    filter="url(#redGlow)"/>

  <!-- Needle back counterweight -->
  <line x1="150" y1="155" x2="150" y2="175"
    transform="rotate(83 150 155)"
    stroke="#cc0000" stroke-width="4" stroke-linecap="round"/>

  <!-- Center hub outer ring -->
  <circle cx="150" cy="155" r="12" fill="#1a1a1a" stroke="#444444" stroke-width="2"/>
  <!-- Center hub inner -->
  <circle cx="150" cy="155" r="7" fill="#cc0000" stroke="#ff2222" stroke-width="1" filter="url(#redGlow)"/>
  <!-- Center hub dot -->
  <circle cx="150" cy="155" r="3" fill="#ff4444"/>

  <!-- Inner decorative ring -->
  <circle cx="150" cy="155" r="95" fill="none" stroke="#1e1e1e" stroke-width="1" stroke-dasharray="3,6"/>

  <!-- Title text -->
  <text x="150" y="122" text-anchor="middle" fill="#39ff14" font-size="11" font-family="'Courier New', monospace" font-weight="bold" letter-spacing="2" filter="url(#neonGlow)">AGENTIC</text>
  <text x="150" y="136" text-anchor="middle" fill="#39ff14" font-size="9" font-family="'Courier New', monospace" font-weight="bold" letter-spacing="3" filter="url(#neonGlow)">LEAD GEN</text>

  <!-- Bottom label -->
  <text x="150" y="182" text-anchor="middle" fill="#555555" font-size="7" font-family="'Courier New', monospace" letter-spacing="4">VELOCITY PIPELINE</text>

  <!-- Outer frame accent lines -->
  <line x1="20" y1="195" x2="80" y2="195" stroke="#39ff14" stroke-width="1" opacity="0.4"/>
  <line x1="220" y1="195" x2="280" y2="195" stroke="#39ff14" stroke-width="1" opacity="0.4"/>
  <circle cx="150" cy="195" r="2" fill="#39ff14" opacity="0.4"/>
</svg>` },
  { id: 56, title: "Microscope Analysis", concept: "microscope viewing company org chart", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a6fcc;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#0d4a99;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e8f4ff;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#c0dcf8;stop-opacity:1"/>
    </linearGradient>
    <radialGradient id="eyepieceGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#f0f8ff;stop-opacity:1"/>
      <stop offset="60%" style="stop-color:#d6ecff;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a6fcc;stop-opacity:1"/>
    </radialGradient>
    <clipPath id="eyepieceClip">
      <circle cx="97" cy="54" r="22"/>
    </clipPath>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#0d4a99" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#f8fbff"/>

  <!-- === MICROSCOPE BODY === -->

  <!-- Base platform -->
  <rect x="60" y="168" width="90" height="8" rx="4" fill="url(#bodyGrad)" filter="url(#softShadow)"/>
  <!-- Base feet -->
  <rect x="65" y="174" width="16" height="5" rx="2.5" fill="#0d4a99"/>
  <rect x="124" y="174" width="16" height="5" rx="2.5" fill="#0d4a99"/>

  <!-- Stage (specimen platform) -->
  <rect x="72" y="148" width="66" height="6" rx="3" fill="url(#bodyGrad)"/>
  <!-- Stage clip/specimen holder -->
  <rect x="88" y="143" width="34" height="8" rx="2" fill="#1a6fcc" opacity="0.7"/>
  <!-- Specimen slide highlight -->
  <rect x="91" y="145" width="28" height="4" rx="1" fill="#e8f4ff" opacity="0.6"/>

  <!-- Coarse focus knob -->
  <ellipse cx="68" cy="128" rx="7" ry="10" fill="url(#bodyGrad)"/>
  <ellipse cx="68" cy="128" rx="4" ry="7" fill="#1a6fcc"/>
  <!-- Fine focus knob -->
  <ellipse cx="68" cy="112" rx="5" ry="7" fill="url(#bodyGrad)"/>
  <ellipse cx="68" cy="112" rx="3" ry="4.5" fill="#1a6fcc"/>

  <!-- Arm / body column -->
  <path d="M 105 148 L 105 90 Q 105 82 100 78 L 92 70" stroke="url(#bodyGrad)" stroke-width="9" stroke-linecap="round" fill="none" filter="url(#softShadow)"/>
  <path d="M 105 148 L 105 90 Q 105 82 100 78 L 92 70" stroke="#2a7fdc" stroke-width="5" stroke-linecap="round" fill="none"/>

  <!-- Objective lens tube -->
  <rect x="100" y="88" width="10" height="40" rx="3" fill="url(#bodyGrad)"/>
  <rect x="101" y="89" width="5" height="38" rx="2" fill="#2a7fdc" opacity="0.5"/>
  <!-- Objective lens tip -->
  <ellipse cx="105" cy="129" rx="7" ry="4" fill="url(#lensGrad)" stroke="#1a6fcc" stroke-width="1"/>
  <ellipse cx="105" cy="129" rx="3.5" ry="2" fill="#c0dcf8"/>

  <!-- Neck / body tube to eyepiece -->
  <path d="M 92 70 L 88 58 Q 87 52 92 50 L 97 50" stroke="url(#bodyGrad)" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M 92 70 L 88 58 Q 87 52 92 50 L 97 50" stroke="#2a7fdc" stroke-width="4" stroke-linecap="round" fill="none"/>

  <!-- === EYEPIECE (circular viewport) === -->
  <!-- Eyepiece rim -->
  <circle cx="97" cy="54" r="25" fill="url(#bodyGrad)" filter="url(#softShadow)"/>
  <!-- Eyepiece glass -->
  <circle cx="97" cy="54" r="22" fill="url(#eyepieceGrad)" stroke="#1a6fcc" stroke-width="1.5"/>

  <!-- === ORG CHART GRAPH inside eyepiece === -->
  <g clip-path="url(#eyepieceClip)" filter="url(#glow)">
    <!-- Grid lines (scientific reticle) -->
    <line x1="75" y1="54" x2="119" y2="54" stroke="#1a6fcc" stroke-width="0.4" opacity="0.3"/>
    <line x1="97" y1="32" x2="97" y2="76" stroke="#1a6fcc" stroke-width="0.4" opacity="0.3"/>
    <!-- Crosshair center mark -->
    <line x1="94" y1="54" x2="100" y2="54" stroke="#1a6fcc" stroke-width="0.8" opacity="0.5"/>
    <line x1="97" y1="51" x2="97" y2="57" stroke="#1a6fcc" stroke-width="0.8" opacity="0.5"/>

    <!-- Root node (CEO) -->
    <circle cx="97" cy="42" r="4.5" fill="#1a6fcc" stroke="#ffffff" stroke-width="1"/>
    <circle cx="97" cy="42" r="2" fill="#ffffff"/>

    <!-- Edge: root → left child -->
    <line x1="97" y1="46.5" x2="86" y2="55" stroke="#1a6fcc" stroke-width="1.2" opacity="0.85"/>
    <!-- Edge: root → right child -->
    <line x1="97" y1="46.5" x2="108" y2="55" stroke="#1a6fcc" stroke-width="1.2" opacity="0.85"/>

    <!-- Left child node -->
    <circle cx="86" cy="58" r="4" fill="#2a7fdc" stroke="#ffffff" stroke-width="1"/>
    <circle cx="86" cy="58" r="1.8" fill="#ffffff"/>

    <!-- Right child node -->
    <circle cx="108" cy="58" r="4" fill="#2a7fdc" stroke="#ffffff" stroke-width="1"/>
    <circle cx="108" cy="58" r="1.8" fill="#ffffff"/>

    <!-- Edge: left → grandchild L1 -->
    <line x1="86" y1="62" x2="80" y2="69" stroke="#1a6fcc" stroke-width="1" opacity="0.7"/>
    <!-- Edge: left → grandchild L2 -->
    <line x1="86" y1="62" x2="91" y2="69" stroke="#1a6fcc" stroke-width="1" opacity="0.7"/>
    <!-- Edge: right → grandchild R1 -->
    <line x1="108" y1="62" x2="104" y2="69" stroke="#1a6fcc" stroke-width="1" opacity="0.7"/>
    <!-- Edge: right → grandchild R2 (highlighted — active target) -->
    <line x1="108" y1="62" x2="114" y2="69" stroke="#0d4a99" stroke-width="1.2" opacity="0.9"/>

    <!-- Grandchild nodes -->
    <circle cx="80" cy="71" r="3" fill="#4a9fe8" stroke="#ffffff" stroke-width="0.8"/>
    <circle cx="91" cy="71" r="3" fill="#4a9fe8" stroke="#ffffff" stroke-width="0.8"/>
    <circle cx="104" cy="71" r="3" fill="#4a9fe8" stroke="#ffffff" stroke-width="0.8"/>
    <!-- Highlighted node (target/lead) -->
    <circle cx="114" cy="71" r="3.5" fill="#0d4a99" stroke="#ffffff" stroke-width="1.2"/>
    <!-- Pulse ring on target -->
    <circle cx="114" cy="71" r="5.5" fill="none" stroke="#1a6fcc" stroke-width="0.8" opacity="0.55"/>
    <circle cx="114" cy="71" r="7.5" fill="none" stroke="#1a6fcc" stroke-width="0.5" opacity="0.25"/>
  </g>

  <!-- Eyepiece glare highlight -->
  <ellipse cx="87" cy="42" rx="6" ry="3.5" fill="white" opacity="0.18" transform="rotate(-30 87 42)"/>

  <!-- === TEXT === -->
  <!-- "Agentic" — primary wordmark -->
  <text x="155" y="75" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#0d1a2e" letter-spacing="-0.5">Agentic</text>
  <!-- Divider rule -->
  <line x1="155" y1="84" x2="280" y2="84" stroke="#1a6fcc" stroke-width="1.5"/>
  <!-- "Lead Gen" — secondary wordmark -->
  <text x="155" y="100" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="22" font-weight="300" fill="#1a6fcc" letter-spacing="1">Lead Gen</text>

  <!-- Tagline -->
  <text x="155" y="118" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="7.5" font-weight="400" fill="#5a7fa8" letter-spacing="2.2">DEEP COMPANY INTELLIGENCE</text>

  <!-- Decorative data-point dots (scientific feel) -->
  <circle cx="155" cy="130" r="1.5" fill="#1a6fcc" opacity="0.5"/>
  <circle cx="162" cy="130" r="1.5" fill="#1a6fcc" opacity="0.35"/>
  <circle cx="169" cy="130" r="1.5" fill="#1a6fcc" opacity="0.2"/>

  <!-- Bottom accent bar -->
  <rect x="155" y="145" width="125" height="2.5" rx="1.25" fill="url(#bodyGrad)" opacity="0.3"/>

</svg>` },
  { id: 57, title: "Anchor Foundation", concept: "nautical anchor with network chain", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1628;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#112244;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0c040;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#d4a017;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b8860b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="anchorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a3a6e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1f3c;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="goldGlow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="bgRadial" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#1a2e55;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#060e1f;stop-opacity:1" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgRadial)" rx="8"/>

  <!-- Subtle grid lines -->
  <g opacity="0.06" stroke="#4a7ab5" stroke-width="0.5">
    <line x1="0" y1="50" x2="300" y2="50"/>
    <line x1="0" y1="100" x2="300" y2="100"/>
    <line x1="0" y1="150" x2="300" y2="150"/>
    <line x1="75" y1="0" x2="75" y2="200"/>
    <line x1="150" y1="0" x2="150" y2="200"/>
    <line x1="225" y1="0" x2="225" y2="200"/>
  </g>

  <!-- ===================== ANCHOR ===================== -->
  <!-- Anchor ring at top -->
  <circle cx="150" cy="32" r="10" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" filter="url(#goldGlow)"/>
  <!-- Ring cross bar -->
  <line x1="140" y1="32" x2="160" y2="32" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linecap="round" filter="url(#goldGlow)"/>

  <!-- Anchor shaft (vertical stem) -->
  <line x1="150" y1="42" x2="150" y2="130" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" filter="url(#goldGlow)"/>

  <!-- Anchor crossbar (horizontal stock) -->
  <line x1="118" y1="56" x2="182" y2="56" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" filter="url(#goldGlow)"/>
  <!-- Crossbar end knobs -->
  <circle cx="118" cy="56" r="4" fill="url(#goldGrad)" filter="url(#goldGlow)"/>
  <circle cx="182" cy="56" r="4" fill="url(#goldGrad)" filter="url(#goldGlow)"/>

  <!-- Anchor flukes (curved arms) -->
  <!-- Left fluke arm -->
  <path d="M150,130 Q120,128 112,142" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" filter="url(#goldGlow)"/>
  <!-- Right fluke arm -->
  <path d="M150,130 Q180,128 188,142" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" filter="url(#goldGlow)"/>
  <!-- Left fluke tip -->
  <path d="M106,138 L112,142 L115,134" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#goldGlow)"/>
  <!-- Right fluke tip -->
  <path d="M194,138 L188,142 L185,134" fill="none" stroke="url(#goldGrad)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#goldGlow)"/>

  <!-- ===================== CHAIN NETWORK ===================== -->
  <!-- Chain forms a network graph wrapping around the anchor -->

  <!-- Network nodes (gold circles) -->
  <!-- Node A - top left area -->
  <circle cx="82" cy="72" r="5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.95"/>
  <!-- Node B - top right area -->
  <circle cx="218" cy="72" r="5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.95"/>
  <!-- Node C - mid left -->
  <circle cx="68" cy="105" r="5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.95"/>
  <!-- Node D - mid right -->
  <circle cx="232" cy="105" r="5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.95"/>
  <!-- Node E - lower left -->
  <circle cx="85" cy="138" r="4.5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.9"/>
  <!-- Node F - lower right -->
  <circle cx="215" cy="138" r="4.5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.9"/>
  <!-- Node G - bottom center left -->
  <circle cx="118" cy="158" r="4" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.85"/>
  <!-- Node H - bottom center right -->
  <circle cx="182" cy="158" r="4" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.85"/>
  <!-- Node I - bottom center -->
  <circle cx="150" cy="168" r="5" fill="url(#goldGrad)" filter="url(#goldGlow)" opacity="0.9"/>

  <!-- Chain links connecting nodes -->
  <!-- Chain segment: crossbar left end → Node A -->
  <g filter="url(#goldGlow)">
    <path d="M118,56 Q102,60 82,72" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.85"/>
    <!-- Link oval along this path -->
    <ellipse cx="100" cy="63" rx="4" ry="2.2" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" transform="rotate(-28,100,63)" opacity="0.9"/>
  </g>

  <!-- Chain segment: crossbar right end → Node B -->
  <g filter="url(#goldGlow)">
    <path d="M182,56 Q198,60 218,72" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.85"/>
    <ellipse cx="200" cy="63" rx="4" ry="2.2" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" transform="rotate(28,200,63)" opacity="0.9"/>
  </g>

  <!-- Node A → Node C -->
  <g filter="url(#goldGlow)">
    <line x1="82" y1="72" x2="68" y2="105" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="75" cy="88" rx="4" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" transform="rotate(-78,75,88)" opacity="0.9"/>
  </g>

  <!-- Node B → Node D -->
  <g filter="url(#goldGlow)">
    <line x1="218" y1="72" x2="232" y2="105" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="225" cy="88" rx="4" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" transform="rotate(78,225,88)" opacity="0.9"/>
  </g>

  <!-- Node C → Node E -->
  <g filter="url(#goldGlow)">
    <line x1="68" y1="105" x2="85" y2="138" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="76" cy="121" rx="3.5" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" transform="rotate(62,76,121)" opacity="0.9"/>
  </g>

  <!-- Node D → Node F -->
  <g filter="url(#goldGlow)">
    <line x1="232" y1="105" x2="215" y2="138" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="224" cy="121" rx="3.5" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.8" transform="rotate(-62,224,121)" opacity="0.9"/>
  </g>

  <!-- Node E → Node G (connects to bottom via fluke) -->
  <g filter="url(#goldGlow)">
    <line x1="85" y1="138" x2="118" y2="158" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.75"/>
    <ellipse cx="101" cy="148" rx="3.5" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.6" transform="rotate(34,101,148)" opacity="0.85"/>
  </g>

  <!-- Node F → Node H -->
  <g filter="url(#goldGlow)">
    <line x1="215" y1="138" x2="182" y2="158" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.75"/>
    <ellipse cx="199" cy="148" rx="3.5" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.6" transform="rotate(-34,199,148)" opacity="0.85"/>
  </g>

  <!-- Node G → Node I -->
  <g filter="url(#goldGlow)">
    <line x1="118" y1="158" x2="150" y2="168" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="134" cy="163" rx="3.5" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.6" transform="rotate(18,134,163)" opacity="0.85"/>
  </g>

  <!-- Node H → Node I -->
  <g filter="url(#goldGlow)">
    <line x1="182" y1="158" x2="150" y2="168" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.8"/>
    <ellipse cx="166" cy="163" rx="3.5" ry="2" fill="none" stroke="url(#goldGrad)" stroke-width="1.6" transform="rotate(-18,166,163)" opacity="0.85"/>
  </g>

  <!-- Cross-links for network feel -->
  <!-- Node A → Node D (diagonal) -->
  <line x1="82" y1="72" x2="232" y2="105" stroke="url(#goldGrad)" stroke-width="1" stroke-dasharray="3,5" stroke-linecap="round" opacity="0.3"/>
  <!-- Node B → Node C (diagonal) -->
  <line x1="218" y1="72" x2="68" y2="105" stroke="url(#goldGrad)" stroke-width="1" stroke-dasharray="3,5" stroke-linecap="round" opacity="0.3"/>
  <!-- Node C → Node F -->
  <line x1="68" y1="105" x2="215" y2="138" stroke="url(#goldGrad)" stroke-width="1" stroke-dasharray="3,5" stroke-linecap="round" opacity="0.25"/>
  <!-- Node D → Node E -->
  <line x1="232" y1="105" x2="85" y2="138" stroke="url(#goldGrad)" stroke-width="1" stroke-dasharray="3,5" stroke-linecap="round" opacity="0.25"/>

  <!-- ===================== TEXT ===================== -->
  <!-- "AGENTIC" -->
  <text x="150" y="188" font-family="Georgia, 'Times New Roman', serif" font-size="13" font-weight="700" letter-spacing="5" fill="url(#goldGrad)" text-anchor="middle" filter="url(#glow)">AGENTIC</text>

  <!-- "LEAD GEN" smaller subtitle -->
  <text x="150" y="199" font-family="Georgia, 'Times New Roman', serif" font-size="7.5" font-weight="400" letter-spacing="4.5" fill="#7a9cc4" text-anchor="middle" opacity="0.85">LEAD  GEN</text>

  <!-- Decorative horizontal rules flanking text -->
  <line x1="30" y1="183" x2="95" y2="183" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.5"/>
  <line x1="205" y1="183" x2="270" y2="183" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.5"/>
  <!-- Small diamond ornaments -->
  <polygon points="150,178 153,180.5 150,183 147,180.5" fill="url(#goldGrad)" opacity="0" />

  <!-- Border frame -->
  <rect width="298" height="198" x="1" y="1" fill="none" stroke="url(#goldGrad)" stroke-width="1" rx="7" opacity="0.35"/>
  <rect width="292" height="192" x="4" y="4" fill="none" stroke="#1a3a6e" stroke-width="0.5" rx="5" opacity="0.6"/>
</svg>` },
  { id: 58, title: "Fire Ignite", concept: "geometric flame as pipeline launch", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Main flame gradient: deep orange base to yellow-white tip -->
    <linearGradient id="flameGrad" x1="0.5" y1="1" x2="0.5" y2="0">
      <stop offset="0%" stop-color="#C2300A"/>
      <stop offset="30%" stop-color="#F05A1A"/>
      <stop offset="60%" stop-color="#FFAA00"/>
      <stop offset="85%" stop-color="#FFE840"/>
      <stop offset="100%" stop-color="#FFFFF0"/>
    </linearGradient>
    <!-- Inner flame gradient -->
    <linearGradient id="innerFlameGrad" x1="0.5" y1="1" x2="0.5" y2="0">
      <stop offset="0%" stop-color="#FF5500"/>
      <stop offset="40%" stop-color="#FFCC00"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.95"/>
    </linearGradient>
    <!-- Spark/glow gradient -->
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FF8800" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#FF4400" stop-opacity="0"/>
    </radialGradient>
    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF8C42"/>
      <stop offset="50%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#FF6B35"/>
    </linearGradient>
    <!-- Sub-text gradient -->
    <linearGradient id="subTextGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFAA55"/>
      <stop offset="100%" stop-color="#FF7722"/>
    </linearGradient>
    <!-- Clip for flame glow -->
    <filter id="flameShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="sparkGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Dark background -->
  <rect width="300" height="200" fill="#0A0A0F"/>

  <!-- Subtle radial glow behind flame -->
  <ellipse cx="62" cy="130" rx="38" ry="38" fill="url(#glowGrad)"/>

  <!-- Outer flame body — bold geometric shape -->
  <path d="
    M 62 148
    C 44 148 34 132 38 112
    C 41 96  48 88  44 70
    C 42 58  48 46  54 40
    C 52 56  58 62  64 58
    C 62 50  66 38  74 28
    C 76 44  70 56  72 66
    C 76 58  82 52  84 42
    C 90 58  86 72  80 88
    C 88 78  94 72  96 62
    C 98 80  92 96  84 108
    C 90 100 96 108 94 122
    C 92 138 80 148 62 148
    Z
  " fill="url(#flameGrad)" filter="url(#flameShadow)"/>

  <!-- Inner flame — brighter core -->
  <path d="
    M 62 142
    C 50 142 44 130 48 116
    C 50 104 56 96  54 82
    C 52 72  56 62  62 56
    C 62 68  66 74  70 70
    C 68 60  72 50  78 44
    C 80 58  76 68  78 78
    C 82 68  86 62  88 54
    C 90 68  86 80  80 92
    C 86 84  90 90  88 104
    C 86 120 76 142 62 142
    Z
  " fill="url(#innerFlameGrad)" opacity="0.92" filter="url(#flameShadow)"/>

  <!-- Highlight streak — left lean -->
  <path d="
    M 62 134
    C 56 120 54 102 58 84
    C 60 96  62 108 64 118
    C 64 128 63 134 62 134
    Z
  " fill="white" opacity="0.22"/>

  <!-- Spark particles -->
  <!-- Top spark — largest, brightest -->
  <circle cx="74" cy="22" r="2.8" fill="#FFF5AA" opacity="0.95" filter="url(#sparkGlow)"/>
  <!-- Upper right spark -->
  <circle cx="96" cy="46" r="1.8" fill="#FFDD55" opacity="0.85" filter="url(#sparkGlow)"/>
  <!-- Upper left spark -->
  <circle cx="44" cy="52" r="1.5" fill="#FFB830" opacity="0.8" filter="url(#sparkGlow)"/>
  <!-- Mid right spark -->
  <circle cx="100" cy="76" r="1.3" fill="#FF9933" opacity="0.7"/>
  <!-- Mid left spark -->
  <circle cx="36" cy="86" r="1.1" fill="#FF8822" opacity="0.65"/>
  <!-- Tiny top-right spark -->
  <circle cx="88" cy="30" r="1.0" fill="#FFFFFF" opacity="0.75"/>
  <!-- Tiny top-left spark -->
  <circle cx="52" cy="30" r="0.9" fill="#FFE566" opacity="0.7"/>

  <!-- Spark streaks — geometric dashes flying upward -->
  <line x1="78" y1="35" x2="83" y2="24" stroke="#FFEE88" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
  <line x1="92" y1="55" x2="99" y2="44" stroke="#FFBB44" stroke-width="1.0" stroke-linecap="round" opacity="0.6"/>
  <line x1="42" y1="64" x2="36" y2="53" stroke="#FF9944" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/>

  <!-- Tagline: "AGENTIC LEAD GEN" -->
  <text
    x="152"
    y="102"
    font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
    font-size="18"
    font-weight="900"
    letter-spacing="1.5"
    text-anchor="middle"
    fill="url(#textGrad)"
  >AGENTIC</text>

  <text
    x="152"
    y="124"
    font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
    font-size="18"
    font-weight="900"
    letter-spacing="1.5"
    text-anchor="middle"
    fill="url(#textGrad)"
  >LEAD GEN</text>

  <!-- Divider line -->
  <line x1="112" y1="131" x2="192" y2="131" stroke="#FF7722" stroke-width="1.2" opacity="0.6"/>

  <!-- Sub-tagline -->
  <text
    x="152"
    y="145"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="7.5"
    font-weight="400"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="url(#subTextGrad)"
    opacity="0.85"
  >IGNITE  &bull;  SPARK  &bull;  LAUNCH</text>

  <!-- Bottom accent dots -->
  <circle cx="116" cy="158" r="1.5" fill="#FF7722" opacity="0.5"/>
  <circle cx="152" cy="158" r="1.5" fill="#FFB833" opacity="0.5"/>
  <circle cx="188" cy="158" r="1.5" fill="#FF7722" opacity="0.5"/>
</svg>` },
  { id: 59, title: "Power Button", concept: "glowing neon power symbol", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur1"/>
      <feGaussianBlur stdDeviation="8" result="blur2"/>
      <feGaussianBlur stdDeviation="16" result="blur3"/>
      <feMerge>
        <feMergeNode in="blur3"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glow-soft" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="glow-text" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="bg-gradient" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#050d1a"/>
      <stop offset="100%" stop-color="#010509"/>
    </radialGradient>
    <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00c8ff" stop-opacity="0.15"/>
      <stop offset="70%" stop-color="#0066ff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000820" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="power-line-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#00d4ff"/>
    </linearGradient>
    <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#0080ff"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bg-gradient)"/>

  <!-- Ambient glow behind the symbol -->
  <circle cx="150" cy="88" r="52" fill="url(#ring-glow)" filter="url(#glow-soft)"/>

  <!-- Outer neon halo ring (blurred, large) -->
  <circle cx="150" cy="88" r="44" fill="none" stroke="#00aaff" stroke-width="1.5" stroke-opacity="0.25" filter="url(#glow-strong)"/>

  <!-- Secondary halo -->
  <circle cx="150" cy="88" r="40" fill="none" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.4" filter="url(#glow-soft)"/>

  <!-- Main power arc — gap at top for the line (from ~50deg to ~310deg) -->
  <!-- Arc path: start at top-right gap edge, sweep around, end at top-left gap edge -->
  <!-- Center 150,88 radius 32. Gap at top: ~300deg to ~60deg (i.e., arc from 60deg to 300deg) -->
  <!-- 60deg from top: x=150+32*sin(60)=150+27.7=177.7, y=88-32*cos(60)=88-16=72 -->
  <!-- 300deg from top: x=150+32*sin(300)=150-27.7=122.3, y=88-32*cos(300)=88-16=72 -->

  <!-- Glowing arc base layer -->
  <path d="M 177.7 72 A 32 32 0 1 1 122.3 72"
    fill="none"
    stroke="#00bfff"
    stroke-width="4"
    stroke-linecap="round"
    filter="url(#glow-strong)"
    stroke-opacity="0.9"/>

  <!-- Arc crisp top layer -->
  <path d="M 177.7 72 A 32 32 0 1 1 122.3 72"
    fill="none"
    stroke="url(#arc-grad)"
    stroke-width="2.5"
    stroke-linecap="round"/>

  <!-- Power line vertical — from top of circle down to center -->
  <!-- Top of gap region at y=88-32=56, go from y=62 down to y=88 (center) -->
  <line x1="150" y1="56" x2="150" y2="88"
    stroke="#00ccff"
    stroke-width="4"
    stroke-linecap="round"
    filter="url(#glow-strong)"
    stroke-opacity="0.85"/>

  <line x1="150" y1="56" x2="150" y2="88"
    stroke="url(#power-line-grad)"
    stroke-width="2.5"
    stroke-linecap="round"/>

  <!-- Subtle particle dots around the ring -->
  <circle cx="150" cy="56" r="1.5" fill="#ffffff" filter="url(#glow-soft)" opacity="0.7"/>
  <circle cx="182" cy="69" r="1" fill="#00d4ff" filter="url(#glow-soft)" opacity="0.6"/>
  <circle cx="118" cy="69" r="1" fill="#00d4ff" filter="url(#glow-soft)" opacity="0.6"/>
  <circle cx="188" cy="92" r="1" fill="#0099ff" opacity="0.5"/>
  <circle cx="112" cy="92" r="1" fill="#0099ff" opacity="0.5"/>

  <!-- Wordmark: AGENTIC -->
  <text
    x="150" y="143"
    font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
    font-size="18"
    font-weight="700"
    letter-spacing="6"
    fill="#e8f4ff"
    text-anchor="middle"
    filter="url(#glow-text)">AGENTIC</text>

  <!-- Divider line with glow -->
  <line x1="90" y1="152" x2="210" y2="152"
    stroke="#00aaff"
    stroke-width="0.5"
    stroke-opacity="0.5"
    filter="url(#glow-soft)"/>

  <!-- Wordmark: LEAD GEN -->
  <text
    x="150" y="168"
    font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
    font-size="10"
    font-weight="400"
    letter-spacing="5"
    fill="#5bc8e8"
    text-anchor="middle"
    filter="url(#glow-text)">LEAD GEN</text>
</svg>` },
  { id: 60, title: "Wormhole Portal", concept: "swirling data wormhole entrance", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep space background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0a0014"/>
      <stop offset="60%" stop-color="#050008"/>
      <stop offset="100%" stop-color="#000005"/>
    </radialGradient>

    <!-- Wormhole center gradient: deep purple to blinding white -->
    <radialGradient id="wormholeCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="12%" stop-color="#e8d4ff" stop-opacity="1"/>
      <stop offset="28%" stop-color="#b366ff" stop-opacity="1"/>
      <stop offset="50%" stop-color="#6600cc" stop-opacity="0.95"/>
      <stop offset="72%" stop-color="#2d0066" stop-opacity="0.85"/>
      <stop offset="90%" stop-color="#0d0030" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#000010" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer glow halo -->
    <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#9933ff" stop-opacity="0"/>
      <stop offset="55%" stop-color="#6600cc" stop-opacity="0.25"/>
      <stop offset="80%" stop-color="#4400aa" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#220066" stop-opacity="0"/>
    </radialGradient>

    <!-- Swirl ring gradient -->
    <linearGradient id="swirlGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#cc88ff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#7722dd" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#330088" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="swirlGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#aaffee" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#0088cc" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#003366" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Data stream gradient -->
    <linearGradient id="streamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stop-color="#00ffcc" stop-opacity="0"/>
      <stop offset="40%" stop-color="#00ffcc" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="streamGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stop-color="#ff66ff" stop-opacity="0"/>
      <stop offset="40%" stop-color="#cc44ff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="streamGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stop-color="#66aaff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#4488ff" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#ccddff" stop-opacity="0.85"/>
    </linearGradient>

    <!-- Clip for portal circle -->
    <clipPath id="portalClip">
      <circle cx="110" cy="96" r="72"/>
    </clipPath>

    <!-- Glow filter -->
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow" x="-20%" y="-60%" width="140%" height="220%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- ── BACKGROUND ── -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle star field -->
  <g fill="#ffffff" opacity="0.5">
    <circle cx="8"   cy="12"  r="0.5"/>
    <circle cx="25"  cy="5"   r="0.7"/>
    <circle cx="50"  cy="18"  r="0.4"/>
    <circle cx="72"  cy="8"   r="0.6"/>
    <circle cx="38"  cy="35"  r="0.3"/>
    <circle cx="15"  cy="55"  r="0.5"/>
    <circle cx="60"  cy="48"  r="0.4"/>
    <circle cx="180" cy="10"  r="0.6"/>
    <circle cx="210" cy="25"  r="0.4"/>
    <circle cx="240" cy="8"   r="0.7"/>
    <circle cx="265" cy="18"  r="0.3"/>
    <circle cx="285" cy="40"  r="0.5"/>
    <circle cx="295" cy="15"  r="0.4"/>
    <circle cx="200" cy="55"  r="0.5"/>
    <circle cx="270" cy="60"  r="0.3"/>
    <circle cx="190" cy="185" r="0.6"/>
    <circle cx="220" cy="175" r="0.4"/>
    <circle cx="255" cy="190" r="0.5"/>
    <circle cx="280" cy="170" r="0.3"/>
    <circle cx="295" cy="185" r="0.6"/>
    <circle cx="10"  cy="170" r="0.4"/>
    <circle cx="35"  cy="185" r="0.5"/>
    <circle cx="55"  cy="165" r="0.3"/>
    <circle cx="165" cy="30"  r="0.5"/>
    <circle cx="170" cy="170" r="0.4"/>
  </g>

  <!-- ── OUTER HALO / ATMOSPHERIC GLOW ── -->
  <ellipse cx="110" cy="96" rx="88" ry="88" fill="url(#haloGrad)" filter="url(#softGlow)"/>

  <!-- ── SPIRAL RINGS (swirling arms, clipped to portal) ── -->
  <!-- Each ellipse is tilted to create depth/perspective -->
  <g clip-path="url(#portalClip)" opacity="0.85">
    <!-- Outermost dim ring -->
    <ellipse cx="110" cy="96" rx="70" ry="68" fill="none"
             stroke="#4400aa" stroke-width="1.5" stroke-opacity="0.4"/>
    <!-- Ring 1 -->
    <ellipse cx="110" cy="96" rx="65" ry="55" fill="none"
             stroke="url(#swirlGrad1)" stroke-width="2.5"
             stroke-dasharray="40 15 25 10 60 20"
             transform="rotate(-20 110 96)" filter="url(#glow)"/>
    <!-- Ring 2 -->
    <ellipse cx="110" cy="96" rx="55" ry="48" fill="none"
             stroke="url(#swirlGrad2)" stroke-width="2"
             stroke-dasharray="55 10 30 15"
             transform="rotate(35 110 96)" filter="url(#glow)"/>
    <!-- Ring 3 -->
    <ellipse cx="110" cy="96" rx="48" ry="38" fill="none"
             stroke="#aa55ff" stroke-width="2.5" stroke-opacity="0.7"
             stroke-dasharray="45 12 20 8 35 18"
             transform="rotate(-55 110 96)" filter="url(#glow)"/>
    <!-- Ring 4 -->
    <ellipse cx="110" cy="96" rx="40" ry="30" fill="none"
             stroke="#cc88ff" stroke-width="2" stroke-opacity="0.65"
             stroke-dasharray="30 10 50 15"
             transform="rotate(70 110 96)" filter="url(#glow)"/>
    <!-- Ring 5 -->
    <ellipse cx="110" cy="96" rx="32" ry="24" fill="none"
             stroke="#ddaaff" stroke-width="2" stroke-opacity="0.75"
             stroke-dasharray="35 8 22 12"
             transform="rotate(-85 110 96)" filter="url(#glow)"/>
    <!-- Ring 6 inner -->
    <ellipse cx="110" cy="96" rx="24" ry="18" fill="none"
             stroke="#eeccff" stroke-width="1.8" stroke-opacity="0.8"
             stroke-dasharray="25 6 18 10"
             transform="rotate(110 110 96)" filter="url(#glow)"/>
  </g>

  <!-- ── SPIRAL SWIRL PATHS — arms flowing into center ── -->
  <g filter="url(#glow)">
    <!-- Arm 1: teal/cyan top-left arc spiraling in -->
    <path d="M 50 35 Q 85 20 110 45 Q 130 65 118 88 Q 112 96 110 96"
          fill="none" stroke="#00ffcc" stroke-width="1.5" stroke-opacity="0.7"
          stroke-linecap="round"/>
    <path d="M 42 30 Q 78 12 108 40 Q 132 62 120 90"
          fill="none" stroke="#00ffcc" stroke-width="0.8" stroke-opacity="0.35"
          stroke-linecap="round"/>

    <!-- Arm 2: purple right arc -->
    <path d="M 178 55 Q 165 30 142 42 Q 122 58 116 82 Q 112 92 110 96"
          fill="none" stroke="#cc44ff" stroke-width="1.5" stroke-opacity="0.7"
          stroke-linecap="round"/>
    <path d="M 185 60 Q 170 28 146 38 Q 124 54 118 80"
          fill="none" stroke="#cc44ff" stroke-width="0.8" stroke-opacity="0.3"
          stroke-linecap="round"/>

    <!-- Arm 3: blue bottom arc -->
    <path d="M 62 160 Q 75 148 88 138 Q 100 128 106 114 Q 110 104 110 96"
          fill="none" stroke="#4488ff" stroke-width="1.4" stroke-opacity="0.65"
          stroke-linecap="round"/>

    <!-- Arm 4: magenta top-right small tendril -->
    <path d="M 155 20 Q 148 40 135 58 Q 124 74 114 88"
          fill="none" stroke="#ff66aa" stroke-width="1.2" stroke-opacity="0.55"
          stroke-linecap="round"/>

    <!-- Arm 5: teal bottom-left tendril -->
    <path d="M 38 130 Q 55 125 70 120 Q 88 112 100 106 Q 107 101 110 96"
          fill="none" stroke="#00ccaa" stroke-width="1.2" stroke-opacity="0.5"
          stroke-linecap="round"/>
  </g>

  <!-- ── DATA STREAMS (pixel-like dashes rushing inward) ── -->
  <g filter="url(#glow)">
    <!-- Stream 1: horizontal from right -->
    <line x1="195" y1="88" x2="148" y2="92" stroke="url(#streamGrad2)"
          stroke-width="1.2" stroke-linecap="round"/>
    <line x1="200" y1="94" x2="152" y2="95" stroke="url(#streamGrad2)"
          stroke-width="0.8" stroke-opacity="0.5" stroke-linecap="round"/>
    <!-- Dashes -->
    <line x1="205" y1="90" x2="215" y2="90" stroke="#cc44ff" stroke-width="1.2" stroke-opacity="0.6"/>
    <line x1="218" y1="91" x2="225" y2="91" stroke="#cc44ff" stroke-width="0.9" stroke-opacity="0.4"/>

    <!-- Stream 2: diagonal top-right -->
    <line x1="190" y1="42" x2="148" y2="70" stroke="url(#streamGrad)"
          stroke-width="1.2" stroke-linecap="round"/>
    <line x1="198" y1="38" x2="207" y2="33" stroke="#00ffcc" stroke-width="1.1" stroke-opacity="0.5"/>
    <line x1="210" y1="30" x2="218" y2="26" stroke="#00ffcc" stroke-width="0.8" stroke-opacity="0.35"/>

    <!-- Stream 3: from lower right -->
    <line x1="195" y1="140" x2="148" y2="120" stroke="url(#streamGrad3)"
          stroke-width="1.2" stroke-linecap="round"/>
    <line x1="203" y1="145" x2="212" y2="150" stroke="#4488ff" stroke-width="1" stroke-opacity="0.5"/>

    <!-- Stream 4: from far left top -->
    <line x1="12" y1="72" x2="62" y2="80" stroke="url(#streamGrad)"
          stroke-width="1" stroke-opacity="0.4" stroke-linecap="round"/>
    <line x1="5"  y1="74" x2="10" y2="73" stroke="#00ffcc" stroke-width="0.9" stroke-opacity="0.4"/>

    <!-- Binary / data particles -->
    <text x="170" y="78" fill="#00ffcc" font-family="monospace" font-size="5" opacity="0.55">10110</text>
    <text x="175" y="108" fill="#cc44ff" font-family="monospace" font-size="4.5" opacity="0.45">01001</text>
    <text x="200" y="65" fill="#aaddff" font-family="monospace" font-size="4" opacity="0.4">1101</text>
    <text x="205" y="125" fill="#aaffdd" font-family="monospace" font-size="4" opacity="0.35">0110</text>
    <text x="22"  y="68"  fill="#cc88ff" font-family="monospace" font-size="4" opacity="0.3">1001</text>
  </g>

  <!-- ── WORMHOLE CORE (radial fill) ── -->
  <circle cx="110" cy="96" r="72" fill="url(#wormholeCore)" filter="url(#softGlow)"/>

  <!-- Bright inner iris -->
  <circle cx="110" cy="96" r="18" fill="none"
          stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6" filter="url(#glow)"/>
  <circle cx="110" cy="96" r="10" fill="none"
          stroke="#ffffff" stroke-width="2" stroke-opacity="0.9" filter="url(#glow)"/>
  <!-- White hot center point -->
  <circle cx="110" cy="96" r="4" fill="#ffffff" filter="url(#softGlow)"/>
  <circle cx="110" cy="96" r="1.5" fill="#ffffff"/>

  <!-- ── PORTAL RIM — crisp glowing edge ── -->
  <circle cx="110" cy="96" r="72" fill="none"
          stroke="#9933ff" stroke-width="2.5" stroke-opacity="0.6" filter="url(#glow)"/>
  <circle cx="110" cy="96" r="71" fill="none"
          stroke="#cc88ff" stroke-width="1" stroke-opacity="0.4"/>

  <!-- ── TYPOGRAPHY ── -->
  <!-- "AGENTIC" — primary headline -->
  <text x="196" y="88"
        font-family="'Arial Black', 'Arial', sans-serif"
        font-weight="900"
        font-size="22"
        letter-spacing="2"
        fill="#ffffff"
        filter="url(#textGlow)">AGENTIC</text>

  <!-- "LEAD GEN" — secondary -->
  <text x="197" y="112"
        font-family="'Arial', sans-serif"
        font-weight="700"
        font-size="15"
        letter-spacing="4"
        fill="#cc88ff"
        filter="url(#textGlow)">LEAD GEN</text>

  <!-- Tagline -->
  <text x="197" y="130"
        font-family="'Arial', sans-serif"
        font-weight="400"
        font-size="6.5"
        letter-spacing="2.5"
        fill="#7755aa"
        opacity="0.85">BEYOND THE EVENT HORIZON</text>

  <!-- Thin separator line -->
  <line x1="197" y1="117" x2="292" y2="117"
        stroke="#6622aa" stroke-width="0.8" stroke-opacity="0.6"/>

  <!-- Bottom micro-label -->
  <text x="197" y="165"
        font-family="'Arial', sans-serif"
        font-weight="400"
        font-size="5.5"
        letter-spacing="1.5"
        fill="#440088"
        opacity="0.7">AI · DISCOVERY · AUTOMATION</text>
</svg>` },
  { id: 61, title: "Chain Link", concept: "person + company interlocked links", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Metallic silver-blue gradient for chain links -->
    <linearGradient id="metalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c8d8e8;stop-opacity:1" />
      <stop offset="30%" style="stop-color:#7fa8cc;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#4a7fa5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2a5a7a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="metalGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#d0e4f0;stop-opacity:1" />
      <stop offset="30%" style="stop-color:#8ab4d0;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#5590b8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e4a68;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="linkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#e0eef8;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#5a8fb5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a3d5c;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="personGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#b8d4e8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3a6f96;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c5d8ec;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d5f84;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#0a2035" flood-opacity="0.5"/>
    </filter>
    <filter id="innerGlow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#0d1f2d" rx="10"/>

  <!-- Subtle grid texture -->
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a3348" stroke-width="0.5"/>
  </pattern>
  <rect width="300" height="200" fill="url(#grid)" rx="10" opacity="0.4"/>

  <!-- ============================================================ -->
  <!-- LEFT CHAIN LINK — Person silhouette                          -->
  <!-- Oval chain link ring containing a person icon               -->
  <!-- ============================================================ -->

  <!-- Person link outer ring -->
  <g filter="url(#shadow)">
    <ellipse cx="108" cy="95" rx="44" ry="30" fill="none" stroke="url(#metalGrad1)" stroke-width="11" />
    <!-- Sheen highlight on top of ring -->
    <ellipse cx="108" cy="95" rx="44" ry="30" fill="none" stroke="#ddeeff" stroke-width="2" stroke-dasharray="60 200" stroke-dashoffset="0" opacity="0.5"/>
  </g>

  <!-- Person silhouette inside left link -->
  <!-- Head -->
  <circle cx="108" cy="84" r="7.5" fill="url(#personGrad)" />
  <!-- Body / shoulders -->
  <path d="M94 108 Q94 96 108 96 Q122 96 122 108 Z" fill="url(#personGrad)" />

  <!-- ============================================================ -->
  <!-- RIGHT CHAIN LINK — Company building                          -->
  <!-- Oval chain link ring containing a building icon             -->
  <!-- ============================================================ -->

  <!-- Building link outer ring -->
  <g filter="url(#shadow)">
    <ellipse cx="192" cy="95" rx="44" ry="30" fill="none" stroke="url(#metalGrad2)" stroke-width="11" />
    <!-- Sheen highlight -->
    <ellipse cx="192" cy="95" rx="44" ry="30" fill="none" stroke="#ddeeff" stroke-width="2" stroke-dasharray="60 200" stroke-dashoffset="120" opacity="0.5"/>
  </g>

  <!-- Building silhouette inside right link -->
  <!-- Main building body -->
  <rect x="178" y="87" width="28" height="21" fill="url(#buildingGrad)" />
  <!-- Roof / top bar -->
  <rect x="175" y="85" width="34" height="4" fill="url(#buildingGrad)" />
  <!-- Rooftop flag/antenna -->
  <rect x="191" y="78" width="2" height="8" fill="#7ab2d0" />
  <!-- Windows row 1 -->
  <rect x="181" y="90" width="5" height="4" fill="#0d1f2d" opacity="0.7" rx="0.5"/>
  <rect x="189" y="90" width="5" height="4" fill="#0d1f2d" opacity="0.7" rx="0.5"/>
  <rect x="197" y="90" width="5" height="4" fill="#0d1f2d" opacity="0.7" rx="0.5"/>
  <!-- Windows row 2 -->
  <rect x="181" y="97" width="5" height="4" fill="#0d1f2d" opacity="0.7" rx="0.5"/>
  <rect x="189" y="97" width="5" height="4" fill="#0d1f2d" opacity="0.7" rx="0.5"/>
  <rect x="197" y="97" width="5" height="4" fill="#0d1f2d" opacity="0.7" rx="0.5"/>
  <!-- Door -->
  <rect x="187" y="102" width="10" height="6" fill="#0d1f2d" opacity="0.8" rx="0.5"/>

  <!-- ============================================================ -->
  <!-- INTERLOCKING MECHANISM — where the two links cross           -->
  <!-- The overlap region at center (x≈150) showing links connect  -->
  <!-- ============================================================ -->

  <!-- Left link's right arc passes BEHIND right link -->
  <!-- Mask the left ring's right portion to go behind right ring  -->
  <!-- Left link top-right segment (behind) -->
  <path d="M148 66 Q165 65 152 95 Q165 125 148 124"
        fill="none" stroke="#1a3a52" stroke-width="13" />
  <!-- Right link left arc passes IN FRONT of left link            -->
  <path d="M152 66 Q135 65 148 95 Q135 125 152 124"
        fill="none" stroke="url(#linkGrad)" stroke-width="11" />
  <!-- Sheen on front arc -->
  <path d="M152 66 Q135 65 148 95 Q135 125 152 124"
        fill="none" stroke="#ddeeff" stroke-width="1.5" opacity="0.4"/>

  <!-- ============================================================ -->
  <!-- GLOW / CONNECTION SPARK at the link intersection             -->
  <!-- ============================================================ -->
  <circle cx="150" cy="95" r="5" fill="#5ab0e0" opacity="0.7">
    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="r" values="4;7;4" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <circle cx="150" cy="95" r="2.5" fill="#c8eaff" opacity="0.95"/>

  <!-- ============================================================ -->
  <!-- TEXT                                                          -->
  <!-- ============================================================ -->

  <!-- "Agentic" wordmark -->
  <text x="150" y="147"
        font-family="'Arial', 'Helvetica', sans-serif"
        font-size="18"
        font-weight="700"
        letter-spacing="3"
        text-anchor="middle"
        fill="url(#metalGrad1)">AGENTIC</text>

  <!-- "Lead Gen" sub-label -->
  <text x="150" y="163"
        font-family="'Arial', 'Helvetica', sans-serif"
        font-size="11"
        font-weight="400"
        letter-spacing="5"
        text-anchor="middle"
        fill="#6a9fc0">LEAD GEN</text>

  <!-- Thin rule lines flanking the text -->
  <line x1="42" y1="154" x2="106" y2="154" stroke="#2a5a7a" stroke-width="0.8"/>
  <line x1="194" y1="154" x2="258" y2="154" stroke="#2a5a7a" stroke-width="0.8"/>

</svg>` },
  { id: 62, title: "Submarine Dive", concept: "sub with sonar pings for prospects", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Ocean depth gradient: light surface to deep dark -->
    <linearGradient id="oceanDepth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0ea5c8" stop-opacity="0.85"/>
      <stop offset="30%" stop-color="#0d7fa3"/>
      <stop offset="65%" stop-color="#065c7a"/>
      <stop offset="100%" stop-color="#021f2e"/>
    </linearGradient>

    <!-- Submarine body gradient -->
    <linearGradient id="subBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4dd9c0"/>
      <stop offset="50%" stop-color="#1ca88a"/>
      <stop offset="100%" stop-color="#0d7a63"/>
    </linearGradient>

    <!-- Submarine highlight -->
    <linearGradient id="subHighlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Treasure glow -->
    <radialGradient id="treasureGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd700" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>

    <!-- Sonar ring clip -->
    <clipPath id="oceanClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>

    <!-- Depth haze filter -->
    <filter id="depthBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>

    <!-- Glow filter for sonar/treasure -->
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Propeller spin animation via transform origin -->
  </defs>

  <!-- Ocean background -->
  <rect x="0" y="0" width="300" height="200" fill="url(#oceanDepth)"/>

  <!-- Surface shimmer lines -->
  <g opacity="0.18">
    <path d="M0 22 Q40 18 80 22 Q120 26 160 22 Q200 18 240 22 Q270 26 300 22" stroke="#7ff0f0" stroke-width="1.5" fill="none"/>
    <path d="M0 28 Q50 24 100 28 Q150 32 200 28 Q250 24 300 28" stroke="#7ff0f0" stroke-width="0.8" fill="none"/>
  </g>

  <!-- Deep water caustic shimmer (subtle) -->
  <g opacity="0.07" filter="url(#depthBlur)">
    <ellipse cx="60" cy="155" rx="22" ry="6" fill="#4dd9c0"/>
    <ellipse cx="140" cy="170" rx="18" ry="5" fill="#4dd9c0"/>
    <ellipse cx="220" cy="160" rx="25" ry="7" fill="#4dd9c0"/>
    <ellipse cx="100" cy="185" rx="14" ry="4" fill="#4dd9c0"/>
    <ellipse cx="260" cy="180" rx="16" ry="5" fill="#4dd9c0"/>
  </g>

  <!-- Sonar ping circles (emanating from submarine nose, clipped to ocean) -->
  <g clip-path="url(#oceanClip)" filter="url(#softGlow)">
    <!-- Outermost ring -->
    <ellipse cx="198" cy="105" rx="52" ry="38" fill="none" stroke="#2dd4bf" stroke-width="1.1" stroke-opacity="0.22"/>
    <!-- Mid ring -->
    <ellipse cx="198" cy="105" rx="36" ry="26" fill="none" stroke="#2dd4bf" stroke-width="1.4" stroke-opacity="0.38"/>
    <!-- Inner ring -->
    <ellipse cx="198" cy="105" rx="20" ry="15" fill="none" stroke="#4aecd4" stroke-width="1.8" stroke-opacity="0.6"/>
    <!-- Innermost active ping -->
    <ellipse cx="198" cy="105" rx="9" ry="7" fill="none" stroke="#a5f3e8" stroke-width="2" stroke-opacity="0.85"/>
  </g>

  <!-- Dive angle bubbles trail (behind sub) -->
  <g opacity="0.5">
    <circle cx="82" cy="80" r="2.5" fill="none" stroke="#a5f3e8" stroke-width="1.2"/>
    <circle cx="75" cy="72" r="1.8" fill="none" stroke="#a5f3e8" stroke-width="1"/>
    <circle cx="88" cy="68" r="1.3" fill="none" stroke="#a5f3e8" stroke-width="0.9"/>
    <circle cx="70" cy="63" r="2" fill="none" stroke="#a5f3e8" stroke-width="1"/>
    <circle cx="80" cy="58" r="1.5" fill="none" stroke="#a5f3e8" stroke-width="0.8"/>
    <circle cx="65" cy="55" r="1" fill="none" stroke="#a5f3e8" stroke-width="0.7"/>
  </g>

  <!-- === SUBMARINE (diving at ~-15 deg angle, moving right-downward) === -->
  <g transform="translate(150, 105) rotate(-14)">

    <!-- Propeller blades (rear) -->
    <g transform="translate(-62, 0)">
      <ellipse cx="0" cy="-10" rx="3.5" ry="8" fill="#1ca88a" opacity="0.9" transform="rotate(-30)"/>
      <ellipse cx="0" cy="10"  rx="3.5" ry="8" fill="#1ca88a" opacity="0.9" transform="rotate(30)"/>
      <ellipse cx="-10" cy="0" rx="8" ry="3.5" fill="#0d7a63" opacity="0.9" transform="rotate(15)"/>
      <ellipse cx="10"  cy="0" rx="8" ry="3.5" fill="#0d7a63" opacity="0.9" transform="rotate(-15)"/>
      <!-- Propeller hub -->
      <circle cx="0" cy="0" r="4" fill="#0a5a49"/>
      <circle cx="0" cy="0" r="2" fill="#4dd9c0"/>
    </g>

    <!-- Tail fin (vertical stabilizer) -->
    <path d="M-52 -4 L-38 -18 L-34 -18 L-44 -4 Z" fill="#0d7a63"/>
    <path d="M-52  4 L-38  18 L-34  18 L-44  4 Z" fill="#0d7a63"/>

    <!-- Main hull body -->
    <ellipse cx="0" cy="0" rx="55" ry="16" fill="url(#subBody)"/>

    <!-- Hull highlight (top shine) -->
    <ellipse cx="0" cy="-5" rx="50" ry="8" fill="url(#subHighlight)"/>

    <!-- Nose cone -->
    <path d="M52 0 Q66 0 74 4 Q66 8 52 0 Z" fill="#1ca88a"/>
    <path d="M52 0 Q66 0 74 -4 Q66 -8 52 0 Z" fill="#4dd9c0" opacity="0.7"/>

    <!-- Conning tower (sail) -->
    <rect x="-8" y="-29" width="22" height="15" rx="4" fill="#1ca88a"/>
    <!-- Periscope -->
    <rect x="10" y="-37" width="3" height="10" rx="1.5" fill="#0d7a63"/>
    <rect x="10" y="-39" width="7" height="3" rx="1.5" fill="#0d7a63"/>
    <!-- Conning tower window -->
    <circle cx="4" cy="-23" r="4" fill="#021f2e" stroke="#4dd9c0" stroke-width="1.2"/>
    <circle cx="4" cy="-23" r="2" fill="#0ea5c8" opacity="0.7"/>

    <!-- Port holes -->
    <circle cx="10" cy="0" r="5" fill="#021f2e" stroke="#4dd9c0" stroke-width="1.3"/>
    <circle cx="10" cy="0" r="2.5" fill="#0ea5c8" opacity="0.6"/>
    <circle cx="-12" cy="0" r="4" fill="#021f2e" stroke="#4dd9c0" stroke-width="1"/>
    <circle cx="-12" cy="0" r="2" fill="#0ea5c8" opacity="0.5"/>

    <!-- Dive planes (hydroplanes) -->
    <path d="M20 12 L28 22 L32 22 L28 12 Z" fill="#0d7a63"/>
    <path d="M20 -12 L28 -22 L32 -22 L28 -12 Z" fill="#0d7a63"/>

    <!-- Sonar dome (nose ring detail) -->
    <circle cx="68" cy="0" r="4.5" fill="#0ea5c8" stroke="#4aecd4" stroke-width="1" opacity="0.8"/>
  </g>

  <!-- === TREASURE CHEST at depth === -->
  <g transform="translate(248, 174)" filter="url(#softGlow)">
    <!-- Glow halo -->
    <circle cx="0" cy="0" r="18" fill="url(#treasureGlow)" opacity="0.7"/>

    <!-- Chest body -->
    <rect x="-11" y="-5" width="22" height="14" rx="2" fill="#92400e"/>
    <rect x="-11" y="-5" width="22" height="5" rx="2" fill="#78350f"/>

    <!-- Chest lid arc -->
    <path d="M-11 -5 Q0 -14 11 -5 Z" fill="#a16207"/>

    <!-- Chest band -->
    <rect x="-11" y="-1" width="22" height="2.5" fill="#ca8a04"/>
    <!-- Lock -->
    <rect x="-2.5" y="-2" width="5" height="5" rx="1" fill="#fbbf24"/>
    <circle cx="0" cy="-3" r="2" fill="none" stroke="#fbbf24" stroke-width="1.2"/>

    <!-- Gold coins spilling out -->
    <ellipse cx="13" cy="6" rx="4" ry="2.5" fill="#fcd34d" opacity="0.9"/>
    <ellipse cx="15" cy="3" rx="3" ry="2" fill="#fbbf24" opacity="0.85"/>
    <ellipse cx="-13" cy="5" rx="3.5" ry="2" fill="#fcd34d" opacity="0.8"/>
  </g>

  <!-- Tiny fish silhouettes (deep) -->
  <g opacity="0.3" fill="#0d7a63">
    <path d="M55 148 Q62 145 68 148 Q62 151 55 148 Z"/>
    <path d="M68 148 L63 144 L63 152 Z"/>
    <path d="M38 162 Q44 160 49 162 Q44 164 38 162 Z"/>
    <path d="M49 162 L45 158 L45 166 Z"/>
  </g>

  <!-- Text: "AGENTIC LEAD GEN" -->
  <text
    x="150" y="193"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="11"
    font-weight="700"
    letter-spacing="2.5"
    text-anchor="middle"
    fill="#4dd9c0"
    opacity="0.92">AGENTIC LEAD GEN</text>

  <!-- Subtle divider line under text -->
  <line x1="90" y1="196" x2="210" y2="196" stroke="#2dd4bf" stroke-width="0.5" opacity="0.4"/>
</svg>` },
  { id: 63, title: "Kaleidoscope", concept: "mandala with industry sector colors", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0d0d1a"/>
      <stop offset="100%" stop-color="#050508"/>
    </radialGradient>

    <!-- Jewel tone gradients per segment -->
    <linearGradient id="seg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e040fb"/>
      <stop offset="100%" stop-color="#7b1fa2"/>
    </linearGradient>
    <linearGradient id="seg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#006064"/>
    </linearGradient>
    <linearGradient id="seg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#69f0ae"/>
      <stop offset="100%" stop-color="#1b5e20"/>
    </linearGradient>
    <linearGradient id="seg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6d00"/>
      <stop offset="100%" stop-color="#bf360c"/>
    </linearGradient>
    <linearGradient id="seg5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd740"/>
      <stop offset="100%" stop-color="#e65100"/>
    </linearGradient>
    <linearGradient id="seg6" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#536dfe"/>
      <stop offset="100%" stop-color="#1a237e"/>
    </linearGradient>
    <linearGradient id="seg7" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f06292"/>
      <stop offset="100%" stop-color="#880e4f"/>
    </linearGradient>
    <linearGradient id="seg8" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#26c6da"/>
      <stop offset="100%" stop-color="#004d40"/>
    </linearGradient>

    <!-- Glow filters -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="centerGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip for mandala segments -->
    <clipPath id="outerCircle">
      <circle cx="150" cy="100" r="88"/>
    </clipPath>
    <clipPath id="innerClip">
      <circle cx="150" cy="100" r="38"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- ===== OUTER RING — 8 kaleidoscope segments ===== -->
  <!-- Each segment: pie slice from r=42 to r=88, 45deg each -->
  <!-- Segment 1: 0–45deg — Magenta (Tech/SaaS) -->
  <path d="M150,100 L150,12 A88,88,0,0,1,212.2,37.8 Z" fill="url(#seg1)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 2: 45–90deg — Cyan (Finance) -->
  <path d="M150,100 L212.2,37.8 A88,88,0,0,1,238,100 Z" fill="url(#seg2)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 3: 90–135deg — Emerald (Healthcare) -->
  <path d="M150,100 L238,100 A88,88,0,0,1,212.2,162.2 Z" fill="url(#seg3)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 4: 135–180deg — Amber (Energy) -->
  <path d="M150,100 L212.2,162.2 A88,88,0,0,1,150,188 Z" fill="url(#seg4)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 5: 180–225deg — Gold (Retail) -->
  <path d="M150,100 L150,188 A88,88,0,0,1,87.8,162.2 Z" fill="url(#seg5)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 6: 225–270deg — Indigo (Legal) -->
  <path d="M150,100 L87.8,162.2 A88,88,0,0,1,62,100 Z" fill="url(#seg6)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 7: 270–315deg — Rose (Media) -->
  <path d="M150,100 L62,100 A88,88,0,0,1,87.8,37.8 Z" fill="url(#seg7)" opacity="0.85" filter="url(#glow)"/>
  <!-- Segment 8: 315–360deg — Teal (Logistics) -->
  <path d="M150,100 L87.8,37.8 A88,88,0,0,1,150,12 Z" fill="url(#seg8)" opacity="0.85" filter="url(#glow)"/>

  <!-- Segment divider lines (radial spokes) -->
  <g stroke="rgba(255,255,255,0.15)" stroke-width="0.8">
    <line x1="150" y1="100" x2="150" y2="12"/>
    <line x1="150" y1="100" x2="212.2" y2="37.8"/>
    <line x1="150" y1="100" x2="238" y2="100"/>
    <line x1="150" y1="100" x2="212.2" y2="162.2"/>
    <line x1="150" y1="100" x2="150" y2="188"/>
    <line x1="150" y1="100" x2="87.8" y2="162.2"/>
    <line x1="150" y1="100" x2="62" y2="100"/>
    <line x1="150" y1="100" x2="87.8" y2="37.8"/>
  </g>

  <!-- ===== MID RING — decorative concentric detail ===== -->
  <!-- Outer border ring -->
  <circle cx="150" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
  <!-- Mid ring dark overlay (creates separation between outer and inner) -->
  <circle cx="150" cy="100" r="72" fill="#0a0a14" opacity="0.7"/>
  <circle cx="150" cy="100" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

  <!-- ===== INNER PETALS — 8 small colored petals (kaleidoscope inner ring) ===== -->
  <g filter="url(#glow)">
    <!-- Petal pattern: 8 ellipses rotated around center -->
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#e040fb" opacity="0.9" transform="rotate(0,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#00e5ff" opacity="0.9" transform="rotate(45,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#69f0ae" opacity="0.9" transform="rotate(90,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#ff6d00" opacity="0.9" transform="rotate(135,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#ffd740" opacity="0.9" transform="rotate(180,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#536dfe" opacity="0.9" transform="rotate(225,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#f06292" opacity="0.9" transform="rotate(270,150,100)"/>
    <ellipse cx="150" cy="58" rx="6" ry="11" fill="#26c6da" opacity="0.9" transform="rotate(315,150,100)"/>
  </g>

  <!-- Inner petal ring border -->
  <circle cx="150" cy="100" r="44" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>

  <!-- ===== CENTER MEDALLION ===== -->
  <!-- Dark center disc -->
  <circle cx="150" cy="100" r="38" fill="#07071a" filter="url(#centerGlow)"/>
  <!-- Subtle gradient overlay on center -->
  <circle cx="150" cy="100" r="38" fill="none" stroke="rgba(224,64,251,0.6)" stroke-width="2"/>
  <circle cx="150" cy="100" r="34" fill="none" stroke="rgba(0,229,255,0.3)" stroke-width="0.8"/>

  <!-- Small diamond accents on center ring -->
  <g fill="rgba(255,255,255,0.7)" filter="url(#glow)">
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(0,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(45,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(90,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(135,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(180,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(225,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(270,150,100)"/>
    <polygon points="150,62 152,65 150,68 148,65" transform="rotate(315,150,100)"/>
  </g>

  <!-- ===== "ALG" MONOGRAM ===== -->
  <text
    x="150"
    y="107"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="20"
    font-weight="700"
    letter-spacing="2"
    text-anchor="middle"
    fill="white"
    filter="url(#textGlow)"
  >ALG</text>

  <!-- ===== WORDMARK — bottom label ===== -->
  <!-- Subtle separator line -->
  <line x1="60" y1="168" x2="240" y2="168" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>

  <text
    x="150"
    y="183"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="9"
    font-weight="400"
    letter-spacing="4"
    text-anchor="middle"
    fill="rgba(255,255,255,0.55)"
  >AGENTIC LEAD GEN</text>

  <!-- ===== OUTER DECORATIVE DOTS (constellation feel) ===== -->
  <g fill="rgba(255,255,255,0.4)" filter="url(#glow)">
    <circle cx="150" cy="7" r="1.5"/>
    <circle cx="243" cy="100" r="1.5"/>
    <circle cx="150" cy="193" r="1.5"/>
    <circle cx="57" cy="100" r="1.5"/>
    <!-- diagonal corners -->
    <circle cx="216" cy="33" r="1"/>
    <circle cx="216" cy="167" r="1"/>
    <circle cx="84" cy="167" r="1"/>
    <circle cx="84" cy="33" r="1"/>
  </g>
</svg>` },
  { id: 64, title: "Wave Break", concept: "geometric cresting ocean wave", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep ocean to foam white gradient -->
    <linearGradient id="oceanDeep" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0a1628;stop-opacity:1" />
      <stop offset="30%" style="stop-color:#0d3b6e;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#1565c0;stop-opacity:1" />
      <stop offset="80%" style="stop-color:#42a5f5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e3f2fd;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="waveGrad1" x1="0%" y1="80%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0d3b6e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1976d2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="waveGrad2" x1="0%" y1="60%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1565c0;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#42a5f5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e3f2fd;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="waveGrad3" x1="0%" y1="40%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1e88e5;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#90caf9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="foamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#e3f2fd;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#90caf9;stop-opacity:0.6" />
    </linearGradient>
    <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95" />
      <stop offset="40%" style="stop-color:#e1f5fe;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#64b5f6;stop-opacity:0.7" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#071020;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a1f3d;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="waveClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Deep water base layer -->
  <polygon points="0,200 0,140 30,130 60,135 90,125 120,118 150,110 180,100 210,92 240,88 270,85 300,80 300,200" fill="url(#oceanDeep)" opacity="0.9"/>

  <!-- Wave body — rear large facets (deepest layer) -->
  <polygon points="0,165 20,150 50,145 80,150 110,140 140,128 170,118 200,108 220,100 240,95 260,90 280,88 300,85 300,160 270,155 240,150 210,148 180,145 150,142 120,145 90,148 60,152 30,158" fill="#0d3b6e" opacity="0.85"/>

  <!-- Wave mid-body facets — geometric blocks -->
  <!-- Large bottom-left facet -->
  <polygon points="0,170 40,148 80,142 120,138 150,130 140,155 90,162 45,168" fill="#0d4f8c" opacity="0.9"/>

  <!-- Center mass facets -->
  <polygon points="80,142 130,125 175,110 210,98 220,100 200,118 160,130 110,140" fill="#1565c0" opacity="0.88"/>
  <polygon points="130,125 180,108 220,95 250,88 260,90 235,102 190,116 145,132" fill="#1976d2" opacity="0.85"/>

  <!-- Upper facets building toward crest -->
  <polygon points="175,110 220,95 260,82 280,80 275,90 255,95 225,105 190,118" fill="#1e88e5" opacity="0.8"/>
  <polygon points="220,95 265,78 285,75 290,78 280,85 258,88 232,100" fill="#2196f3" opacity="0.78"/>

  <!-- Transition facets mid-wave -->
  <polygon points="150,130 200,112 240,100 260,95 250,108 215,120 175,135" fill="#42a5f5" opacity="0.75"/>
  <polygon points="200,112 245,96 275,88 285,90 268,100 240,108 212,120" fill="#64b5f6" opacity="0.7"/>

  <!-- Light catching facets -->
  <polygon points="240,92 270,80 290,76 295,82 278,88 255,94" fill="#90caf9" opacity="0.8"/>
  <polygon points="260,85 285,72 298,70 300,75 290,80 270,86" fill="#bbdefb" opacity="0.75"/>

  <!-- Wave crest curl — the breaking top -->
  <!-- Crest base -->
  <polygon points="255,78 272,65 290,58 300,60 300,70 288,68 270,72" fill="#bbdefb" opacity="0.85"/>

  <!-- Crest overhang / curl -->
  <polygon points="260,72 275,58 292,52 298,55 296,62 280,65 265,70" fill="#e3f2fd" opacity="0.9"/>

  <!-- Foam curl tip -->
  <polygon points="268,65 282,52 295,46 300,50 298,57 285,60 272,64" fill="url(#foamGrad)" filter="url(#glow)"/>

  <!-- Foam spray particles at crest -->
  <polygon points="278,58 288,46 298,42 300,47 294,52 283,56" fill="#ffffff" opacity="0.95" filter="url(#glow)"/>
  <polygon points="285,53 294,42 302,38 302,44 296,48 288,52" fill="#ffffff" opacity="0.9"/>

  <!-- Foam spray wisps -->
  <polygon points="272,54 280,44 290,40 294,46 284,50 274,53" fill="#e3f2fd" opacity="0.85"/>

  <!-- Cascading foam down the face -->
  <polygon points="235,98 255,85 275,80 278,88 260,94 240,100" fill="#90caf9" opacity="0.6" filter="url(#softglow)"/>
  <polygon points="215,108 240,94 262,89 264,96 244,103 220,112" fill="#bbdefb" opacity="0.55"/>
  <polygon points="190,120 220,106 248,98 250,105 222,114 196,126" fill="#e3f2fd" opacity="0.5"/>

  <!-- Foam line at base of wave -->
  <path d="M 0,162 C 20,158 50,154 80,150 C 110,146 140,142 170,140 C 200,138 230,138 260,136 C 280,135 295,134 305,134" stroke="#90caf9" stroke-width="1.5" fill="none" opacity="0.6"/>
  <path d="M 0,168 C 30,163 70,158 110,154 C 150,150 190,148 225,147 C 255,146 278,146 300,145" stroke="#64b5f6" stroke-width="1" fill="none" opacity="0.4"/>

  <!-- Foam specks at wave face -->
  <circle cx="242" cy="101" r="1.5" fill="#ffffff" opacity="0.8"/>
  <circle cx="255" cy="92" r="1.2" fill="#e3f2fd" opacity="0.85"/>
  <circle cx="268" cy="82" r="1.8" fill="#ffffff" opacity="0.9" filter="url(#glow)"/>
  <circle cx="276" cy="74" r="1.3" fill="#ffffff" opacity="0.95"/>
  <circle cx="283" cy="65" r="2" fill="#ffffff" opacity="0.9" filter="url(#glow)"/>
  <circle cx="290" cy="57" r="1.5" fill="#ffffff" opacity="0.85"/>
  <circle cx="228" cy="108" r="1.2" fill="#e3f2fd" opacity="0.7"/>
  <circle cx="215" cy="115" r="1" fill="#ffffff" opacity="0.6"/>

  <!-- Text: AGENTIC LEAD GEN -->
  <text x="150" y="182" font-family="'Arial', 'Helvetica', sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="#90caf9" text-anchor="middle" opacity="0.9">AGENTIC LEAD GEN</text>

  <!-- Subtle text underline accent -->
  <line x1="60" y1="185" x2="240" y2="185" stroke="#1976d2" stroke-width="0.5" opacity="0.5"/>

  <!-- Top-right accent: small data point dots suggesting leads -->
  <circle cx="18" cy="22" r="2" fill="#1e88e5" opacity="0.7"/>
  <circle cx="28" cy="18" r="1.5" fill="#42a5f5" opacity="0.6"/>
  <circle cx="38" cy="24" r="1.8" fill="#1565c0" opacity="0.65"/>
  <circle cx="46" cy="16" r="1.2" fill="#64b5f6" opacity="0.5"/>
  <circle cx="55" cy="21" r="2.2" fill="#1976d2" opacity="0.7"/>
  <circle cx="65" cy="14" r="1.5" fill="#42a5f5" opacity="0.55"/>

  <!-- Connecting lines for data/lead flow -->
  <polyline points="18,22 28,18 38,24 46,16 55,21 65,14" stroke="#2196f3" stroke-width="0.8" fill="none" opacity="0.45" stroke-dasharray="2,2"/>
</svg>` },
  { id: 65, title: "Fingerprint ID", concept: "fingerprint ridges as network graph", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200" style="background:#ffffff">
  <defs>
    <style>
      .ridge { fill: none; stroke: #1a1464; stroke-linecap: round; stroke-linejoin: round; }
      .node { fill: #1a1464; }
      .node-accent { fill: #3730a3; }
      .edge { stroke: #1a1464; stroke-linecap: round; }
      .text-main { font-family: 'Georgia', serif; fill: #1a1464; letter-spacing: 0.04em; }
      .text-sub { font-family: 'Courier New', monospace; fill: #3730a3; letter-spacing: 0.18em; }
    </style>
    <clipPath id="fp-clip">
      <ellipse cx="100" cy="96" rx="52" ry="62"/>
    </clipPath>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3730a3" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#1a1464" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background glow -->
  <ellipse cx="100" cy="96" rx="70" ry="80" fill="url(#glow)"/>

  <!-- Fingerprint ridges (concentric arcs, clipped to fingerprint oval) -->
  <g clip-path="url(#fp-clip)">
    <!-- Core whorl -->
    <ellipse cx="100" cy="94" rx="8" ry="9" fill="none" stroke="#1a1464" stroke-width="1.6"/>

    <!-- Ridge 1 -->
    <path class="ridge" stroke-width="1.5" d="
      M 100 75
      C 112 75, 120 83, 120 94
      C 120 105, 112 114, 100 115
      C 88 114, 80 105, 80 94
      C 80 83, 88 75, 100 75
    "/>

    <!-- Ridge 2 -->
    <path class="ridge" stroke-width="1.4" d="
      M 100 63
      C 119 63, 133 77, 133 94
      C 133 111, 119 126, 100 127
      C 81 126, 67 111, 67 94
      C 67 77, 81 63, 100 63
    "/>

    <!-- Ridge 3 — with gap (bifurcation) -->
    <path class="ridge" stroke-width="1.3" d="
      M 100 51
      C 125 51, 145 70, 145 94
    "/>
    <path class="ridge" stroke-width="1.3" d="
      M 145 94
      C 145 118, 125 138, 100 139
      C 75 138, 55 118, 55 94
      C 55 70, 75 51, 100 51
    "/>

    <!-- Ridge 4 -->
    <path class="ridge" stroke-width="1.2" d="
      M 63 72
      C 68 57, 82 46, 100 44
      C 131 44, 156 67, 156 94
    "/>
    <path class="ridge" stroke-width="1.2" d="
      M 156 94
      C 156 121, 131 150, 100 151
      C 69 151, 44 122, 44 94
      C 44 80, 49 68, 58 60
    "/>

    <!-- Ridge 5 - outer -->
    <path class="ridge" stroke-width="1.1" d="
      M 77 40
      C 85 35, 92 33, 100 33
      C 134 33, 162 61, 162 94
    "/>
    <path class="ridge" stroke-width="1.1" d="
      M 162 100
      C 160 129, 136 160, 100 162
      C 64 162, 38 132, 38 94
      C 38 76, 44 62, 56 52
    "/>

    <!-- Network graph nodes overlaid on ridges -->
    <!-- Node positions along ridges -->
    <circle class="node" cx="100" cy="94" r="2.5"/>

    <!-- Inner ring nodes -->
    <circle class="node-accent" cx="100" cy="78" r="2"/>
    <circle class="node-accent" cx="113" cy="86" r="2"/>
    <circle class="node-accent" cx="113" cy="102" r="2"/>
    <circle class="node-accent" cx="100" cy="112" r="2"/>
    <circle class="node-accent" cx="87" cy="102" r="2"/>
    <circle class="node-accent" cx="87" cy="86" r="2"/>

    <!-- Outer ring nodes -->
    <circle class="node" cx="100" cy="64" r="2.2"/>
    <circle class="node" cx="122" cy="72" r="2.2"/>
    <circle class="node" cx="131" cy="94" r="2.2"/>
    <circle class="node" cx="122" cy="116" r="2.2"/>
    <circle class="node" cx="100" cy="127" r="2.2"/>
    <circle class="node" cx="78" cy="116" r="2.2"/>
    <circle class="node" cx="69" cy="94" r="2.2"/>
    <circle class="node" cx="78" cy="72" r="2.2"/>

    <!-- Further outer nodes -->
    <circle class="node" cx="100" cy="52" r="1.8"/>
    <circle class="node" cx="132" cy="64" r="1.8"/>
    <circle class="node" cx="144" cy="94" r="1.8"/>
    <circle class="node" cx="132" cy="124" r="1.8"/>
    <circle class="node" cx="100" cy="138" r="1.8"/>
    <circle class="node" cx="68" cy="124" r="1.8"/>
    <circle class="node" cx="56" cy="94" r="1.8"/>
    <circle class="node" cx="68" cy="64" r="1.8"/>

    <!-- Graph edges — network connections across ridges (the key "forensic-meets-tech" detail) -->
    <!-- Center to inner ring -->
    <line class="edge" stroke-width="0.9" stroke-opacity="0.7" x1="100" y1="94" x2="100" y2="78"/>
    <line class="edge" stroke-width="0.9" stroke-opacity="0.7" x1="100" y1="94" x2="113" y2="86"/>
    <line class="edge" stroke-width="0.9" stroke-opacity="0.7" x1="100" y1="94" x2="113" y2="102"/>
    <line class="edge" stroke-width="0.9" stroke-opacity="0.7" x1="100" y1="94" x2="100" y2="112"/>
    <line class="edge" stroke-width="0.9" stroke-opacity="0.7" x1="100" y1="94" x2="87" y2="102"/>
    <line class="edge" stroke-width="0.9" stroke-opacity="0.7" x1="100" y1="94" x2="87" y2="86"/>

    <!-- Inner ring to outer ring (cross-ridge connections — the network identity concept) -->
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="100" y1="78" x2="100" y2="64"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="100" y1="78" x2="122" y2="72"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="113" y1="86" x2="122" y2="72"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="113" y1="86" x2="131" y2="94"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="113" y1="102" x2="131" y2="94"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="113" y1="102" x2="122" y2="116"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="100" y1="112" x2="122" y2="116"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="100" y1="112" x2="100" y2="127"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="87" y1="102" x2="78" y2="116"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="87" y1="102" x2="100" y2="127"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="87" y1="86" x2="69" y2="94"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="87" y1="86" x2="78" y2="72"/>
    <line class="edge" stroke-width="0.8" stroke-opacity="0.55" x1="78" y1="116" x2="69" y2="94"/>

    <!-- Outer ring to further outer (sparse, fingerprint edge detail) -->
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="100" y1="64" x2="132" y2="64"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="122" y1="72" x2="132" y2="64"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="131" y1="94" x2="144" y2="94"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="122" y1="116" x2="132" y2="124"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="100" y1="127" x2="100" y2="138"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="78" y1="116" x2="68" y2="124"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="69" y1="94" x2="56" y2="94"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="78" y1="72" x2="68" y2="64"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="100" y1="64" x2="68" y2="64"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="100" y1="52" x2="100" y2="64"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="100" y1="52" x2="132" y2="64"/>
    <line class="edge" stroke-width="0.7" stroke-opacity="0.4" x1="100" y1="52" x2="68" y2="64"/>
  </g>

  <!-- Fingerprint outline border (subtle) -->
  <ellipse cx="100" cy="96" rx="52" ry="62" fill="none" stroke="#1a1464" stroke-width="0.8" stroke-opacity="0.25"/>

  <!-- Scan line accent (forensic aesthetic) -->
  <line x1="48" y1="96" x2="152" y2="96" stroke="#3730a3" stroke-width="0.5" stroke-opacity="0.18" stroke-dasharray="3,4"/>

  <!-- Vertical scan bar -->
  <rect x="96" y="34" width="8" height="3" rx="1.5" fill="#3730a3" fill-opacity="0.35"/>
  <rect x="96" y="155" width="8" height="3" rx="1.5" fill="#3730a3" fill-opacity="0.35"/>

  <!-- Wordmark -->
  <text x="168" y="83" class="text-main" font-size="17.5" font-weight="700">AGENTIC</text>
  <text x="168" y="103" class="text-main" font-size="17.5" font-weight="700">LEAD GEN</text>

  <!-- Divider rule -->
  <line x1="168" y1="110" x2="290" y2="110" stroke="#1a1464" stroke-width="0.7" stroke-opacity="0.4"/>

  <!-- Tagline -->
  <text x="168" y="124" class="text-sub" font-size="6.8">IDENTITY INTELLIGENCE</text>

  <!-- Corner forensic brackets -->
  <path d="M 20 10 L 10 10 L 10 20" fill="none" stroke="#1a1464" stroke-width="1" stroke-opacity="0.3"/>
  <path d="M 280 10 L 290 10 L 290 20" fill="none" stroke="#1a1464" stroke-width="1" stroke-opacity="0.3"/>
  <path d="M 20 190 L 10 190 L 10 180" fill="none" stroke="#1a1464" stroke-width="1" stroke-opacity="0.3"/>
  <path d="M 280 190 L 290 190 L 290 180" fill="none" stroke="#1a1464" stroke-width="1" stroke-opacity="0.3"/>
</svg>` },
  { id: 66, title: "Zipper Reveal", concept: "zipper opening to show network", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1a2e;stop-opacity:1" />
    </linearGradient>

    <!-- Glow gradient for revealed interior -->
    <radialGradient id="interiorGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#00e5ff;stop-opacity:0.95" />
      <stop offset="35%" style="stop-color:#0077ff;stop-opacity:0.75" />
      <stop offset="70%" style="stop-color:#7c3aed;stop-opacity:0.5" />
      <stop offset="100%" style="stop-color:#0a0a1a;stop-opacity:0" />
    </radialGradient>

    <!-- Metallic zipper tooth gradient -->
    <linearGradient id="toothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d0d8e8" />
      <stop offset="40%" style="stop-color:#f0f4ff" />
      <stop offset="100%" style="stop-color:#8896aa" />
    </linearGradient>

    <!-- Zipper tape gradient -->
    <linearGradient id="tapeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4a5568" />
      <stop offset="50%" style="stop-color:#2d3748" />
      <stop offset="100%" style="stop-color:#1a202c" />
    </linearGradient>

    <!-- Pull tab gradient -->
    <linearGradient id="pullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e2e8f0" />
      <stop offset="50%" style="stop-color:#f7fafc" />
      <stop offset="100%" style="stop-color:#a0aec0" />
    </linearGradient>

    <!-- Node glow filter -->
    <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Soft glow filter for lines -->
    <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Interior reveal clip -->
    <clipPath id="revealClip">
      <polygon points="150,30 260,55 270,145 150,165 30,145 40,55" />
    </clipPath>

    <!-- Zipper opening clip (diamond/V shape) -->
    <clipPath id="zipOpenClip">
      <polygon points="80,30 150,100 220,30 260,30 260,170 220,170 150,100 80,170 40,170 40,30" />
    </clipPath>

    <!-- Ambient glow filter -->
    <filter id="ambientGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7dd3fc" />
      <stop offset="50%" style="stop-color:#e0f2fe" />
      <stop offset="100%" style="stop-color:#a78bfa" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8" />

  <!-- ===== REVEALED INTERIOR: glowing network ===== -->
  <!-- Ambient interior glow blob -->
  <ellipse cx="150" cy="98" rx="82" ry="58" fill="url(#interiorGlow)" clip-path="url(#zipOpenClip)" opacity="0.85" />

  <!-- Network connection lines (inside reveal area) -->
  <g clip-path="url(#zipOpenClip)" filter="url(#lineGlow)">
    <!-- Central hub to satellite nodes -->
    <line x1="150" y1="98" x2="108" y2="72" stroke="#00e5ff" stroke-width="1.2" opacity="0.9" />
    <line x1="150" y1="98" x2="192" y2="72" stroke="#00e5ff" stroke-width="1.2" opacity="0.9" />
    <line x1="150" y1="98" x2="115" y2="125" stroke="#38bdf8" stroke-width="1.2" opacity="0.8" />
    <line x1="150" y1="98" x2="185" y2="125" stroke="#38bdf8" stroke-width="1.2" opacity="0.8" />
    <line x1="150" y1="98" x2="150" y2="60" stroke="#60a5fa" stroke-width="1" opacity="0.7" />
    <!-- Cross-connections -->
    <line x1="108" y1="72" x2="115" y2="125" stroke="#7c3aed" stroke-width="0.9" opacity="0.6" />
    <line x1="192" y1="72" x2="185" y2="125" stroke="#7c3aed" stroke-width="0.9" opacity="0.6" />
    <line x1="108" y1="72" x2="150" y2="60" stroke="#818cf8" stroke-width="0.8" opacity="0.5" />
    <line x1="192" y1="72" x2="150" y2="60" stroke="#818cf8" stroke-width="0.8" opacity="0.5" />
    <!-- Outer faint connections -->
    <line x1="108" y1="72" x2="88" y2="55" stroke="#22d3ee" stroke-width="0.7" opacity="0.45" />
    <line x1="192" y1="72" x2="212" y2="55" stroke="#22d3ee" stroke-width="0.7" opacity="0.45" />
    <line x1="115" y1="125" x2="95" y2="140" stroke="#22d3ee" stroke-width="0.7" opacity="0.35" />
    <line x1="185" y1="125" x2="205" y2="140" stroke="#22d3ee" stroke-width="0.7" opacity="0.35" />
  </g>

  <!-- Network nodes (inside reveal area) -->
  <g clip-path="url(#zipOpenClip)" filter="url(#nodeGlow)">
    <!-- Central hub node -->
    <circle cx="150" cy="98" r="6.5" fill="#00e5ff" opacity="0.98" />
    <circle cx="150" cy="98" r="3.5" fill="#ffffff" />

    <!-- Satellite nodes -->
    <circle cx="108" cy="72" r="4.5" fill="#38bdf8" opacity="0.95" />
    <circle cx="108" cy="72" r="2.2" fill="#e0f2fe" />

    <circle cx="192" cy="72" r="4.5" fill="#38bdf8" opacity="0.95" />
    <circle cx="192" cy="72" r="2.2" fill="#e0f2fe" />

    <circle cx="115" cy="125" r="4" fill="#60a5fa" opacity="0.9" />
    <circle cx="115" cy="125" r="1.8" fill="#e0f2fe" />

    <circle cx="185" cy="125" r="4" fill="#60a5fa" opacity="0.9" />
    <circle cx="185" cy="125" r="1.8" fill="#e0f2fe" />

    <circle cx="150" cy="60" r="3.5" fill="#a78bfa" opacity="0.9" />
    <circle cx="150" cy="60" r="1.5" fill="#ede9fe" />

    <!-- Outer smaller nodes -->
    <circle cx="88" cy="55" r="2.8" fill="#22d3ee" opacity="0.75" />
    <circle cx="212" cy="55" r="2.8" fill="#22d3ee" opacity="0.75" />
    <circle cx="95" cy="140" r="2.5" fill="#34d399" opacity="0.65" />
    <circle cx="205" cy="140" r="2.5" fill="#34d399" opacity="0.65" />
  </g>

  <!-- ===== ZIPPER STRUCTURE ===== -->

  <!-- Left zipper tape (closed side, top-left region) -->
  <path d="M 150,100 L 78,34 L 40,34 L 40,38 L 74,38 L 148,107 Z" fill="url(#tapeGrad)" opacity="0.9" />

  <!-- Right zipper tape (closed side, top-right region) -->
  <path d="M 150,100 L 222,34 L 260,34 L 260,38 L 226,38 L 152,107 Z" fill="url(#tapeGrad)" opacity="0.9" />

  <!-- Left zipper tape (open/lower) -->
  <path d="M 150,100 L 78,166 L 40,166 L 40,162 L 74,162 L 148,93 Z" fill="url(#tapeGrad)" opacity="0.9" />

  <!-- Right zipper tape (open/lower) -->
  <path d="M 150,100 L 222,166 L 260,166 L 260,162 L 226,162 L 152,93 Z" fill="url(#tapeGrad)" opacity="0.9" />

  <!-- ===== ZIPPER TEETH — LEFT SIDE (top, closed) ===== -->
  <g fill="url(#toothGrad)">
    <!-- Upper-left teeth going diagonally up-left from center -->
    <rect x="83" y="49" width="10" height="6" rx="1.5" transform="rotate(-38 88 52)" />
    <rect x="97" y="59" width="10" height="6" rx="1.5" transform="rotate(-38 102 62)" />
    <rect x="111" y="68" width="10" height="6" rx="1.5" transform="rotate(-38 116 71)" />
    <rect x="125" y="78" width="10" height="6" rx="1.5" transform="rotate(-38 130 81)" />
    <rect x="139" y="88" width="10" height="6" rx="1.5" transform="rotate(-38 144 91)" />
  </g>

  <!-- ===== ZIPPER TEETH — RIGHT SIDE (top, closed) ===== -->
  <g fill="url(#toothGrad)">
    <rect x="207" y="49" width="10" height="6" rx="1.5" transform="rotate(38 212 52)" />
    <rect x="193" y="59" width="10" height="6" rx="1.5" transform="rotate(38 198 62)" />
    <rect x="179" y="68" width="10" height="6" rx="1.5" transform="rotate(38 184 71)" />
    <rect x="165" y="78" width="10" height="6" rx="1.5" transform="rotate(38 170 81)" />
    <rect x="151" y="88" width="10" height="6" rx="1.5" transform="rotate(38 156 91)" />
  </g>

  <!-- ===== ZIPPER TEETH — LEFT SIDE (bottom, open) ===== -->
  <g fill="url(#toothGrad)" opacity="0.7">
    <rect x="83" y="145" width="10" height="6" rx="1.5" transform="rotate(38 88 148)" />
    <rect x="97" y="135" width="10" height="6" rx="1.5" transform="rotate(38 102 138)" />
    <rect x="111" y="125" width="10" height="6" rx="1.5" transform="rotate(38 116 128)" />
    <rect x="125" y="115" width="10" height="6" rx="1.5" transform="rotate(38 130 118)" />
  </g>

  <!-- ===== ZIPPER TEETH — RIGHT SIDE (bottom, open) ===== -->
  <g fill="url(#toothGrad)" opacity="0.7">
    <rect x="207" y="145" width="10" height="6" rx="1.5" transform="rotate(-38 212 148)" />
    <rect x="193" y="135" width="10" height="6" rx="1.5" transform="rotate(-38 198 138)" />
    <rect x="179" y="125" width="10" height="6" rx="1.5" transform="rotate(-38 184 128)" />
    <rect x="165" y="115" width="10" height="6" rx="1.5" transform="rotate(-38 170 118)" />
  </g>

  <!-- ===== ZIPPER SLIDER (pull tab) ===== -->
  <!-- Slider body -->
  <rect x="139" y="92" width="22" height="16" rx="4" fill="url(#pullGrad)" />
  <!-- Slider ridge detail -->
  <rect x="141" y="96" width="18" height="3" rx="1.5" fill="#8896aa" opacity="0.6" />
  <rect x="141" y="101" width="18" height="3" rx="1.5" fill="#8896aa" opacity="0.6" />
  <!-- Slider highlight -->
  <rect x="141" y="93" width="18" height="3" rx="1.5" fill="#ffffff" opacity="0.4" />

  <!-- Pull tab cord -->
  <path d="M 150,108 L 150,120 L 145,128 L 155,128 L 150,120" fill="none" stroke="#a0aec0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="150" cy="130" r="4" fill="url(#pullGrad)" />
  <circle cx="150" cy="130" r="2" fill="#cbd5e0" />

  <!-- ===== TEXT ===== -->
  <!-- "Agentic" — top label -->
  <text x="150" y="24" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="9" font-weight="600" letter-spacing="3.5" fill="#94a3b8" opacity="0.85">AGENTIC</text>

  <!-- "Lead Gen" — bottom label -->
  <text x="150" y="186" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="url(#textGrad)">LEAD GEN</text>

  <!-- Subtle tagline -->
  <text x="150" y="196" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="6" letter-spacing="1.5" fill="#4a5568" opacity="0.9">UNCOVER · CONNECT · CONVERT</text>
</svg>` },
  { id: 67, title: "Gear Machine", concept: "three interlocking stage gears", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <style>
      .gear-body { fill: #2a2d35; stroke: #3d4149; stroke-width: 1.5; }
      .gear-accent { fill: #1a8cff; }
      .gear-highlight { fill: #4da6ff; opacity: 0.15; }
      .icon-stroke { stroke: #4da6ff; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .icon-fill { fill: #4da6ff; }
      .hub { fill: #1a8cff; stroke: #4da6ff; stroke-width: 1; }
      .hub-inner { fill: #0d1117; }
      .bg { fill: #0d1117; }
      .label { font-family: 'Segoe UI', system-ui, sans-serif; fill: #c9d1d9; letter-spacing: 0.04em; }
      .label-accent { fill: #4da6ff; }
    </style>
    <!-- Gear tooth path macro via clipPath -->
    <clipPath id="clip-large">
      <circle cx="80" cy="108" r="38"/>
    </clipPath>
    <clipPath id="clip-medium">
      <circle cx="162" cy="88" r="28"/>
    </clipPath>
    <clipPath id="clip-small">
      <circle cx="225" cy="118" r="20"/>
    </clipPath>
    <!-- Subtle radial glow for gear faces -->
    <radialGradient id="glow-large" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a8cff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#1a8cff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-medium" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a8cff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#1a8cff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-small" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a8cff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#1a8cff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" class="bg" rx="8"/>

  <!-- Subtle grid lines -->
  <g opacity="0.06" stroke="#4da6ff" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ===== LARGE GEAR (left, cx=80 cy=108 r=46 with teeth) ===== -->
  <!-- 10 teeth, outer r=46, inner r=38, base r=36 -->
  <g id="gear-large">
    <path class="gear-body" d="
      M80,62
      L84.5,64.5 L90,61.5 L91.5,66.5
      L97,66 L96.5,71.5
      L101.5,73.5 L99,78.5
      L103,82 L99.5,86
      L102,91 L97.5,93.5
      L98.5,99 L93.5,99.5
      L93,105 L88,104
      L86,109.5 L81,107.5
      L78,113 L73,110
      L69,114.5 L65.5,110.5
      L60.5,113 L58.5,108
      L53.5,108.5 L53,103
      L48,101.5 L49.5,96.5
      L45.5,93.5 L48,89.5
      L44.5,85.5 L48,82.5
      L45.5,77.5 L49.5,75.5
      L48,70.5 L53,70.5
      L53.5,65 L58.5,65.5
      L60.5,60.5 L65.5,62.5
      L69,58.5 L73,61.5
      Z
    "/>
    <!-- Gear face glow -->
    <circle cx="80" cy="108" r="38" fill="url(#glow-large)"/>
    <!-- Gear face ring -->
    <circle cx="80" cy="108" r="38" fill="none" stroke="#1a8cff" stroke-width="1" opacity="0.4"/>
    <circle cx="80" cy="108" r="32" fill="none" stroke="#2a2d35" stroke-width="1.5"/>

    <!-- DISCOVER icon: magnifying glass -->
    <!-- Search circle -->
    <circle cx="76" cy="104" r="8" class="icon-stroke"/>
    <!-- Search handle -->
    <line x1="82" y1="110" x2="88" y2="116" class="icon-stroke" stroke-width="2.5"/>
    <!-- Signal arcs (broadcasting) -->
    <path d="M68,96 Q70,90 76,89" class="icon-stroke" stroke-width="1.2" opacity="0.7"/>
    <path d="M65,94 Q66,86 76,84" class="icon-stroke" stroke-width="1" opacity="0.4"/>

    <!-- Hub -->
    <circle cx="80" cy="108" r="7" class="hub"/>
    <circle cx="80" cy="108" r="4" class="hub-inner"/>
  </g>

  <!-- ===== MEDIUM GEAR (center-right, cx=162 cy=88 r=34 with teeth) ===== -->
  <!-- 8 teeth -->
  <g id="gear-medium">
    <path class="gear-body" d="
      M162,54
      L166,56.5 L171,53.5 L172,58.5
      L177.5,59.5 L176.5,65
      L181.5,67.5 L179,72.5
      L183.5,76 L180,80
      L183.5,84.5 L179.5,87.5
      L181.5,92.5 L176.5,93.5
      L176,99 L171,98
      L168.5,103 L163.5,101
      L160,105.5 L156,102.5
      L152,105.5 L149,101.5
      L144.5,103 L142.5,98
      L137.5,98.5 L137,93
      L132,91.5 L133.5,86.5
      L130.5,82.5 L134,79.5
      L131.5,75 L135.5,72.5
      L134,67.5 L139,67.5
      L140,62 L145,63
      L147.5,58.5 L152,60.5
      L155.5,56.5 L159.5,59
      Z
    "/>
    <!-- Gear face glow -->
    <circle cx="162" cy="88" r="28" fill="url(#glow-medium)"/>
    <!-- Gear face ring -->
    <circle cx="162" cy="88" r="28" fill="none" stroke="#1a8cff" stroke-width="1" opacity="0.4"/>
    <circle cx="162" cy="88" r="22" fill="none" stroke="#2a2d35" stroke-width="1.5"/>

    <!-- ENRICH icon: data layers / stack -->
    <!-- Bottom layer -->
    <ellipse cx="162" cy="96" rx="9" ry="3" class="icon-stroke"/>
    <!-- Middle layer -->
    <ellipse cx="162" cy="91" rx="9" ry="3" class="icon-stroke"/>
    <!-- Top layer -->
    <ellipse cx="162" cy="86" rx="9" ry="3" class="icon-stroke"/>
    <!-- Vertical connectors -->
    <line x1="153" y1="91" x2="153" y2="96" class="icon-stroke"/>
    <line x1="171" y1="91" x2="171" y2="96" class="icon-stroke"/>
    <line x1="153" y1="86" x2="153" y2="91" class="icon-stroke"/>
    <line x1="171" y1="86" x2="171" y2="91" class="icon-stroke"/>
    <!-- Plus indicator (enrichment) -->
    <line x1="162" y1="80" x2="162" y2="84" class="icon-stroke" stroke-width="1.5"/>
    <line x1="160" y1="82" x2="164" y2="82" class="icon-stroke" stroke-width="1.5"/>

    <!-- Hub -->
    <circle cx="162" cy="88" r="5.5" class="hub"/>
    <circle cx="162" cy="88" r="3" class="hub-inner"/>
  </g>

  <!-- ===== SMALL GEAR (right, cx=225 cy=118 r=24 with teeth) ===== -->
  <!-- 7 teeth -->
  <g id="gear-small">
    <path class="gear-body" d="
      M225,94
      L228.5,96 L233,93.5 L233.5,98.5
      L238.5,100.5 L236.5,105
      L241,109 L237.5,112.5
      L240.5,117.5 L236.5,119.5
      L237.5,125 L233,125.5
      L232,130.5 L227.5,129.5
      L225,134 L221.5,130.5
      L217,131.5 L215.5,126.5
      L211,126 L211.5,121
      L207.5,118.5 L210,114.5
      L207.5,110 L211.5,108.5
      L211,103.5 L215.5,103.5
      L217,98.5 L221,100.5
      Z
    "/>
    <!-- Gear face glow -->
    <circle cx="225" cy="118" r="20" fill="url(#glow-small)"/>
    <!-- Gear face ring -->
    <circle cx="225" cy="118" r="20" fill="none" stroke="#1a8cff" stroke-width="1" opacity="0.4"/>
    <circle cx="225" cy="118" r="15" fill="none" stroke="#2a2d35" stroke-width="1.5"/>

    <!-- OUTREACH icon: paper plane / send -->
    <path d="M215,124 L234,112 L222,128 Z" class="icon-stroke"/>
    <path d="M222,128 L220,122 L234,112" class="icon-stroke"/>
    <line x1="220" y1="122" x2="225" y2="119" class="icon-stroke" stroke-width="1.2"/>
    <!-- Signal dot -->
    <circle cx="230" cy="114" r="1.2" class="icon-fill" opacity="0.8"/>

    <!-- Hub -->
    <circle cx="225" cy="118" r="4.5" class="hub"/>
    <circle cx="225" cy="118" r="2.5" class="hub-inner"/>
  </g>

  <!-- Connecting dots at mesh points -->
  <circle cx="119" cy="100" r="2" fill="#1a8cff" opacity="0.5"/>
  <circle cx="193" cy="106" r="1.5" fill="#1a8cff" opacity="0.5"/>

  <!-- Accent glow lines between gears -->
  <line x1="118" y1="98" x2="124" y2="94" stroke="#1a8cff" stroke-width="0.5" opacity="0.3"/>
  <line x1="192" y1="104" x2="199" y2="107" stroke="#1a8cff" stroke-width="0.5" opacity="0.3"/>

  <!-- Stage labels under gears -->
  <text x="80" y="158" text-anchor="middle" class="label" font-size="7.5" font-weight="600" opacity="0.7">DISCOVER</text>
  <text x="162" y="143" text-anchor="middle" class="label" font-size="7.5" font-weight="600" opacity="0.7">ENRICH</text>
  <text x="225" y="150" text-anchor="middle" class="label" font-size="7.5" font-weight="600" opacity="0.7">OUTREACH</text>

  <!-- Divider line -->
  <line x1="18" y1="170" x2="282" y2="170" stroke="#1a8cff" stroke-width="0.5" opacity="0.3"/>

  <!-- Main title -->
  <text x="150" y="184" text-anchor="middle" class="label" font-size="11" font-weight="700" letter-spacing="0.08em">
    <tspan class="label-accent">AGENTIC</tspan>
    <tspan fill="#c9d1d9"> LEAD GEN</tspan>
  </text>

  <!-- Subtitle tagline -->
  <text x="150" y="195" text-anchor="middle" class="label" font-size="6" opacity="0.45" letter-spacing="0.12em">AUTOMATED PIPELINE MACHINERY</text>
</svg>` },
  { id: 68, title: "Staircase Growth", concept: "isometric stairs with lead counts", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep to bright gradient for background -->
    <linearGradient id="bgGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0a0e1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a2744;stop-opacity:1" />
    </linearGradient>
    <!-- Step top face gradients (dark to bright) -->
    <linearGradient id="topFace1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1e3a5f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d5a8e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="topFace2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2d5a8e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3d7fc0;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="topFace3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3d7fc0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5ba3e8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="topFace4" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#5ba3e8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#88ccff;stop-opacity:1" />
    </linearGradient>
    <!-- Step front face gradients -->
    <linearGradient id="frontFace1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a3050;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f1e33;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="frontFace2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#264d7a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a3050;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="frontFace3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3468a0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#264d7a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="frontFace4" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4d8cc8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3468a0;stop-opacity:1" />
    </linearGradient>
    <!-- Step side face gradients -->
    <linearGradient id="sideFace1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#152840;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="sideFace2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1e3a5f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d5a8e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="sideFace3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2d5a8e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3d7fc0;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="sideFace4" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3d7fc0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5ba3e8;stop-opacity:1" />
    </linearGradient>
    <!-- Glow for top step -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Lead dot gradient -->
    <radialGradient id="dotGrad1" cx="50%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:#88ccff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3d7fc0;stop-opacity:1" />
    </radialGradient>
    <radialGradient id="dotGrad2" cx="50%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:#aaddff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5ba3e8;stop-opacity:1" />
    </radialGradient>
    <radialGradient id="dotGrad3" cx="50%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:#cceeFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#88ccff;stop-opacity:1" />
    </radialGradient>
    <radialGradient id="dotGrad4" cx="50%" cy="30%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#aaddff;stop-opacity:1" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8"/>

  <!-- Subtle grid lines in background -->
  <g opacity="0.06" stroke="#4488cc" stroke-width="0.5">
    <line x1="0" y1="50" x2="300" y2="50"/>
    <line x1="0" y1="100" x2="300" y2="100"/>
    <line x1="0" y1="150" x2="300" y2="150"/>
    <line x1="75" y1="0" x2="75" y2="200"/>
    <line x1="150" y1="0" x2="150" y2="200"/>
    <line x1="225" y1="0" x2="225" y2="200"/>
  </g>

  <!--
    ISOMETRIC STAIRCASE
    Isometric projection: x-axis goes right+down at 30deg, y-axis goes left+down at 30deg, z-axis goes up
    Using simplified isometric: each step is a box drawn with 3 parallelogram faces (top, front, side)
    
    Steps from left (bottom/dark) to right (top/bright):
    Step 1 (leftmost, lowest): 1 lead
    Step 2: 5 leads
    Step 3: 25 leads
    Step 4 (rightmost, highest): 125 leads

    Isometric unit vectors (screen coords):
    right = (cos-30°, sin-30°) = (0.866, 0.5) per unit
    left  = (-cos-30°, sin-30°) = (-0.866, 0.5) per unit
    up    = (0, -1) per unit

    Let unit = 22px
    Step width (x) = 2 units = 44px
    Step depth (y) = 1.5 units = 33px
    Step heights: 1=1u=22, 2=2u=44, 3=3u=66, 4=4u=88

    Anchor: bottom-right of step 1 at iso origin = (70, 150)
    In isometric:
      right vector (1 unit): dx=+19, dy=+11  (scaled)
      depth vector (1 unit): dx=-19, dy=+11
      height vector (1 unit): dx=0, dy=-22

    Step footprints (in iso units), x=right, z=depth, y=height
    Steps go: each step is 2 units wide, 1.5 deep
    Staircase: step i sits at x offset = (i-1)*2 units from the base
    Heights: h1=1, h2=2, h3=3, h4=4
  -->

  <!-- Let me define iso transform helpers inline via calculated points -->
  <!-- Origin (ground anchor) at screen (68, 162) -->
  <!-- rx=19, ry=11 for right/depth unit; rz=20 for height unit -->

  <!-- STEP 1: height=1, position x=0..2, z=0..1.5 -->
  <!-- Bottom-right of step 1 base = origin (68, 162) -->
  <!-- Iso coords: A=front-bottom-right, going around -->
  <!-- Top face (parallelogram): 4 corners at y=h1 -->
  <!--   front-right = (68 + 0*19 + 0*(-19), 162 + 0*11 + 0*11 - 1*20) = (68, 142) -->
  <!--   front-left  = (68 - 2*19, 162 - 2*11 - 1*20) wait, let me recalc carefully -->

  <!--
    Iso mapping: point (ix, iz, iy) -> screen (sx, sy)
    sx = origin_x + ix*Rx - iz*Rx  where Rx=19
    sy = origin_y + ix*Ry + iz*Ry - iy*Rz  where Ry=11, Rz=20

    origin = (68, 162)
    
    Step 1: ix=0..2, iz=0..1.5, iy=0..1
    Top face corners (iy=1):
      (2, 0, 1): sx=68+38=106, sy=162+22-20=164  -- front-right-top
      (0, 0, 1): sx=68, sy=162-20=142             -- front-left-top
      (0, 1.5, 1): sx=68-28.5=39.5, sy=162+16.5-20=158.5  -- back-left-top
      (2, 1.5, 1): sx=68+38-28.5=77.5, sy=162+22+16.5-20=180.5  -- back-right-top
    
    Front face (iz=0, iy=0..1):
      (2, 0, 0): sx=106, sy=184  -- front-right-bottom
      (0, 0, 0): sx=68, sy=162   -- front-left-bottom
      (0, 0, 1): sx=68, sy=142
      (2, 0, 1): sx=106, sy=164
    
    Right face (ix=2, iz=0..1.5, iy=0..1):
      (2, 0, 0): sx=106, sy=184
      (2, 1.5, 0): sx=77.5, sy=200.5  -- off screen, clip
      (2, 1.5, 1): sx=77.5, sy=180.5
      (2, 0, 1): sx=106, sy=164

    Hmm let me recalculate with a better origin and scale
  -->

  <!--
    Let me use: origin=(80, 158), Rx=18, Ry=10, Rz=19
    Step widths: 2 units each, depth: 1.5 units each
    Heights: step1=1, step2=2, step3=3, step4=4

    Staircase layout (iso x increases to the right+forward):
    Step 1: ix=0..2
    Step 2: ix=2..4
    Step 3: ix=4..6
    Step 4: ix=6..8

    iso_to_screen(ix, iz, iy):
      sx = 80 + ix*18 - iz*18
      sy = 158 + ix*10 + iz*10 - iy*19

    Step 1 top face (iy=1, ix=0..2, iz=0..1.5):
      A(2,0,1)  = 80+36=116,  158+20-19=159
      B(0,0,1)  = 80,         158-19=139
      C(0,1.5,1)= 80-27=53,   158+15-19=154
      D(2,1.5,1)= 80+36-27=89,158+20+15-19=174

    Step 1 front face (iz=0, iy=0..1, ix=0..2):
      A(2,0,1)  = 116, 159
      E(2,0,0)  = 116, 178   (158+20)
      F(0,0,0)  = 80, 158
      B(0,0,1)  = 80, 139

    Step 1 right face (ix=2, iz=0..1.5, iy=0..1):
      A(2,0,1)  = 116, 159
      E(2,0,0)  = 116, 178
      G(2,1.5,0)= 89, 193    (80+36-27, 158+20+15)
      D(2,1.5,1)= 89, 174

    Step 2 top face (iy=2, ix=2..4, iz=0..1.5):
      A(4,0,2)  = 80+72=152, 158+40-38=160
      B(2,0,2)  = 80+36=116, 158+20-38=140
      C(2,1.5,2)= 116-27=89, 158+20+15-38=155
      D(4,1.5,2)= 152-27=125,158+40+15-38=175

    Step 2 front face (iz=0, iy=1..2, ix=2..4):
      A(4,0,2) = 152, 160
      E(4,0,1) = 152, 179   (158+40-19)
      F(2,0,1) = 116, 159
      B(2,0,2) = 116, 140

    Step 2 right face (ix=4, iz=0..1.5, iy=1..2):
      A(4,0,2) = 152, 160
      E(4,0,1) = 152, 179
      G(4,1.5,1)= 125, 194  (80+72-27, 158+40+15-19)
      D(4,1.5,2)= 125, 175

    Step 3 top face (iy=3, ix=4..6, iz=0..1.5):
      A(6,0,3)  = 80+108=188, 158+60-57=161
      B(4,0,3)  = 80+72=152,  158+40-57=141
      C(4,1.5,3)= 152-27=125, 158+40+15-57=156
      D(6,1.5,3)= 188-27=161, 158+60+15-57=176

    Step 3 front face (iz=0, iy=2..3, ix=4..6):
      A(6,0,3) = 188, 161
      E(6,0,2) = 188, 180   (158+60-38)
      F(4,0,2) = 152, 160
      B(4,0,3) = 152, 141

    Step 3 right face (ix=6, iz=0..1.5, iy=2..3):
      A(6,0,3) = 188, 161
      E(6,0,2) = 188, 180
      G(6,1.5,2)= 161, 195  (80+108-27, 158+60+15-38)
      D(6,1.5,3)= 161, 176

    Step 4 top face (iy=4, ix=6..8, iz=0..1.5):
      A(8,0,4)  = 80+144=224, 158+80-76=162
      B(6,0,4)  = 80+108=188, 158+60-76=142
      C(6,1.5,4)= 188-27=161, 158+60+15-76=157
      D(8,1.5,4)= 224-27=197, 158+80+15-76=177

    Step 4 front face (iz=0, iy=3..4, ix=6..8):
      A(8,0,4) = 224, 162
      E(8,0,3) = 224, 181   (158+80-57)
      F(6,0,3) = 188, 161
      B(6,0,4) = 188, 142

    Step 4 right face (ix=8, iz=0..1.5, iy=3..4):
      A(8,0,4) = 224, 162
      E(8,0,3) = 224, 181
      G(8,1.5,3)= 197, 196  (80+144-27, 158+80+15-57)
      D(8,1.5,4)= 197, 177
  -->

  <!-- STEP 1 — 1 lead, darkest -->
  <!-- Side face (right face) -->
  <polygon points="116,159 116,178 89,193 89,174" fill="url(#sideFace1)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Front face -->
  <polygon points="116,159 116,178 80,158 80,139" fill="url(#frontFace1)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Top face -->
  <polygon points="116,159 80,139 53,154 89,174" fill="url(#topFace1)" stroke="#0a1525" stroke-width="0.5"/>

  <!-- STEP 2 — 5 leads -->
  <!-- Side face -->
  <polygon points="152,160 152,179 125,194 125,175" fill="url(#sideFace2)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Front face -->
  <polygon points="152,160 152,179 116,159 116,140" fill="url(#frontFace2)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Top face -->
  <polygon points="152,160 116,140 89,155 125,175" fill="url(#topFace2)" stroke="#0a1525" stroke-width="0.5"/>

  <!-- STEP 3 — 25 leads -->
  <!-- Side face -->
  <polygon points="188,161 188,180 161,195 161,176" fill="url(#sideFace3)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Front face -->
  <polygon points="188,161 188,180 152,160 152,141" fill="url(#frontFace3)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Top face -->
  <polygon points="188,161 152,141 125,156 161,176" fill="url(#topFace3)" stroke="#0a1525" stroke-width="0.5"/>

  <!-- STEP 4 — 125 leads, brightest, with glow -->
  <!-- Side face -->
  <polygon points="224,162 224,181 197,196 197,177" fill="url(#sideFace4)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Front face -->
  <polygon points="224,162 224,181 188,161 188,142" fill="url(#frontFace4)" stroke="#0a1525" stroke-width="0.5"/>
  <!-- Top face -->
  <polygon points="224,162 188,142 161,157 197,177" fill="url(#topFace4)" filter="url(#glow)" stroke="#0a1525" stroke-width="0.5"/>

  <!-- Edge highlights -->
  <line x1="80" y1="139" x2="116" y2="159" stroke="#2d5a8e" stroke-width="0.8" opacity="0.8"/>
  <line x1="116" y1="140" x2="152" y2="160" stroke="#3d7fc0" stroke-width="0.8" opacity="0.8"/>
  <line x1="152" y1="141" x2="188" y2="161" stroke="#5ba3e8" stroke-width="0.8" opacity="0.8"/>
  <line x1="188" y1="142" x2="224" y2="162" stroke="#88ccff" stroke-width="1" opacity="0.9"/>

  <!-- Lead dots on step tops -->
  <!-- Step 1: 1 dot -->
  <circle cx="87" cy="157" r="3" fill="url(#dotGrad1)" opacity="0.9"/>

  <!-- Step 2: 5 dots in a cross/plus pattern -->
  <circle cx="117" cy="152" r="2.5" fill="url(#dotGrad2)" opacity="0.9"/>
  <circle cx="112" cy="158" r="2.5" fill="url(#dotGrad2)" opacity="0.9"/>
  <circle cx="122" cy="156" r="2.5" fill="url(#dotGrad2)" opacity="0.9"/>
  <circle cx="115" cy="163" r="2.5" fill="url(#dotGrad2)" opacity="0.9"/>
  <circle cx="125" cy="161" r="2.5" fill="url(#dotGrad2)" opacity="0.9"/>

  <!-- Step 3: 5x5 grid of dots (25) — smaller -->
  <g fill="url(#dotGrad3)" opacity="0.9">
    <!-- Row 1 -->
    <circle cx="150" cy="147" r="1.8"/>
    <circle cx="155" cy="150" r="1.8"/>
    <circle cx="160" cy="153" r="1.8"/>
    <circle cx="155" cy="157" r="1.8"/>
    <circle cx="150" cy="154" r="1.8"/>
    <!-- Row 2 -->
    <circle cx="158" cy="144" r="1.8"/>
    <circle cx="163" cy="147" r="1.8"/>
    <circle cx="168" cy="150" r="1.8"/>
    <circle cx="163" cy="154" r="1.8"/>
    <circle cx="158" cy="151" r="1.8"/>
    <!-- Row 3 -->
    <circle cx="153" cy="160" r="1.8"/>
    <circle cx="158" cy="163" r="1.8"/>
    <circle cx="163" cy="161" r="1.8"/>
    <circle cx="168" cy="157" r="1.8"/>
    <circle cx="173" cy="154" r="1.8"/>
    <!-- Scattered fill -->
    <circle cx="145" cy="157" r="1.8"/>
    <circle cx="148" cy="162" r="1.8"/>
    <circle cx="153" cy="151" r="1.8"/>
    <circle cx="170" cy="160" r="1.8"/>
    <circle cx="165" cy="165" r="1.8"/>
    <circle cx="145" cy="151" r="1.8"/>
    <circle cx="140" cy="155" r="1.8"/>
    <circle cx="143" cy="161" r="1.8"/>
    <circle cx="160" cy="145" r="1.8"/>
    <circle cx="155" cy="142" r="1.8"/>
  </g>

  <!-- Step 4: dense cluster (125 shown as glowing field) -->
  <g fill="url(#dotGrad4)" opacity="0.95" filter="url(#glow)">
    <!-- Dense grid -->
    <circle cx="186" cy="147" r="1.5"/>
    <circle cx="190" cy="149" r="1.5"/>
    <circle cx="194" cy="152" r="1.5"/>
    <circle cx="198" cy="154" r="1.5"/>
    <circle cx="202" cy="157" r="1.5"/>
    <circle cx="206" cy="159" r="1.5"/>
    <circle cx="210" cy="162" r="1.5"/>
    <circle cx="188" cy="152" r="1.5"/>
    <circle cx="192" cy="155" r="1.5"/>
    <circle cx="196" cy="157" r="1.5"/>
    <circle cx="200" cy="160" r="1.5"/>
    <circle cx="204" cy="162" r="1.5"/>
    <circle cx="208" cy="165" r="1.5"/>
    <circle cx="184" cy="155" r="1.5"/>
    <circle cx="188" cy="158" r="1.5"/>
    <circle cx="192" cy="161" r="1.5"/>
    <circle cx="196" cy="163" r="1.5"/>
    <circle cx="200" cy="166" r="1.5"/>
    <circle cx="204" cy="168" r="1.5"/>
    <circle cx="182" cy="150" r="1.5"/>
    <circle cx="186" cy="153" r="1.5"/>
    <circle cx="190" cy="156" r="1.5"/>
    <circle cx="194" cy="158" r="1.5"/>
    <circle cx="198" cy="161" r="1.5"/>
    <circle cx="202" cy="164" r="1.5"/>
    <circle cx="184" cy="145" r="1.5"/>
    <circle cx="188" cy="143" r="1.5"/>
    <circle cx="192" cy="146" r="1.5"/>
    <circle cx="196" cy="149" r="1.5"/>
    <circle cx="200" cy="151" r="1.5"/>
    <circle cx="204" cy="154" r="1.5"/>
    <circle cx="208" cy="156" r="1.5"/>
    <circle cx="212" cy="159" r="1.5"/>
    <circle cx="186" cy="149" r="1.5"/>
    <circle cx="190" cy="152" r="1.5"/>
    <circle cx="194" cy="155" r="1.5"/>
    <circle cx="198" cy="157" r="1.5"/>
    <circle cx="202" cy="160" r="1.5"/>
    <circle cx="206" cy="162" r="1.5"/>
    <circle cx="180" cy="153" r="1.5"/>
    <circle cx="184" cy="156" r="1.5"/>
    <circle cx="188" cy="159" r="1.5"/>
    <circle cx="192" cy="162" r="1.5"/>
    <circle cx="196" cy="164" r="1.5"/>
    <circle cx="200" cy="167" r="1.5"/>
    <circle cx="178" cy="157" r="1.5"/>
    <circle cx="182" cy="160" r="1.5"/>
    <circle cx="186" cy="163" r="1.5"/>
    <circle cx="190" cy="166" r="1.5"/>
    <circle cx="194" cy="169" r="1.5"/>
  </g>

  <!-- Lead count labels on each step -->
  <!-- Step 1 label: "1" -->
  <text x="87" y="170" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="8" font-weight="700" fill="#88aacc" opacity="0.8">1</text>

  <!-- Step 2 label: "5" -->
  <text x="117" y="171" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="8" font-weight="700" fill="#aaccee" opacity="0.85">5</text>

  <!-- Step 3 label: "25" -->
  <text x="153" y="172" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="8" font-weight="700" fill="#cce4ff" opacity="0.9">25</text>

  <!-- Step 4 label: "125" -->
  <text x="191" y="173" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="8" font-weight="700" fill="#ffffff" opacity="0.95">125</text>

  <!-- Title: "Agentic" -->
  <text x="150" y="22" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="3" fill="#ffffff" opacity="0.95">AGENTIC</text>

  <!-- Subtitle: "LEAD GEN" -->
  <text x="150" y="38" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="9" font-weight="400" letter-spacing="5" fill="#5ba3e8" opacity="0.9">LEAD GEN</text>

  <!-- Thin separator line under title -->
  <line x1="100" y1="44" x2="200" y2="44" stroke="#2d5a8e" stroke-width="0.5" opacity="0.6"/>

  <!-- Arrow on top step pointing up-right -->
  <g filter="url(#glow)" opacity="0.95">
    <line x1="206" y1="152" x2="220" y2="138" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="220,138 213,140 216,147" fill="#ffffff"/>
  </g>

  <!-- Exponential curve hint (faint arc over steps) -->
  <path d="M 80 135 Q 130 120 188 130 Q 210 130 224 115" stroke="#4488cc" stroke-width="0.8" fill="none" opacity="0.25" stroke-dasharray="3,2"/>

</svg>` },
  { id: 69, title: "Bowtie Convergence", concept: "data streams through AI filter", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Blue to gold gradient for left funnel (input streams) -->
    <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1a6fd4" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#2563eb" stop-opacity="1"/>
    </linearGradient>
    <!-- Waist gradient -->
    <linearGradient id="waistGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <!-- Gold gradient for right funnel (output leads) -->
    <linearGradient id="rightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d97706" stop-opacity="1"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.9"/>
    </linearGradient>
    <!-- Stream gradients left side -->
    <linearGradient id="s1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="s2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="s3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.9"/>
    </linearGradient>
    <!-- Stream gradients right side -->
    <linearGradient id="r1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d97706" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="r2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.5"/>
    </linearGradient>
    <!-- Glow filter for waist -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Subtle drop shadow -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#1e3a8a" flood-opacity="0.3"/>
    </filter>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <!-- Particle glow -->
    <radialGradient id="dotBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="1"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dotGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fde68a" stop-opacity="1"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="12"/>

  <!-- ── LEFT SIDE: many input streams converging ── -->
  <!-- 7 streams on left flowing into waist at x=130, y=100 -->

  <!-- Stream 1 — top far -->
  <path d="M 8,28 C 45,28 80,55 115,78 C 122,82 128,88 130,100" fill="none" stroke="url(#s3)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Stream 2 -->
  <path d="M 8,48 C 44,48 78,62 112,80 C 120,84 127,90 130,100" fill="none" stroke="url(#s2)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Stream 3 -->
  <path d="M 8,68 C 45,68 80,74 112,86 C 120,90 127,95 130,100" fill="none" stroke="url(#s1)" stroke-width="3" stroke-linecap="round"/>
  <!-- Stream 4 — center / thickest -->
  <path d="M 8,100 C 50,100 90,100 130,100" fill="none" stroke="url(#leftGrad)" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Stream 5 -->
  <path d="M 8,132 C 45,132 80,126 112,114 C 120,110 127,105 130,100" fill="none" stroke="url(#s1)" stroke-width="3" stroke-linecap="round"/>
  <!-- Stream 6 -->
  <path d="M 8,152 C 44,152 78,138 112,120 C 120,116 127,110 130,100" fill="none" stroke="url(#s2)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Stream 7 — bottom far -->
  <path d="M 8,172 C 45,172 80,145 115,122 C 122,118 128,112 130,100" fill="none" stroke="url(#s3)" stroke-width="2.5" stroke-linecap="round"/>

  <!-- ── LEFT BOWTIE TRIANGLE (filled) ── -->
  <path d="M 8,18 L 130,100 L 8,182 Z" fill="url(#leftGrad)" opacity="0.18"/>

  <!-- Left stream terminator dots (data sources) -->
  <circle cx="8" cy="28" r="3.5" fill="#60a5fa" opacity="0.8"/>
  <circle cx="8" cy="48" r="3.5" fill="#60a5fa" opacity="0.75"/>
  <circle cx="8" cy="68" r="4"   fill="#3b82f6" opacity="0.85"/>
  <circle cx="8" cy="100" r="4.5" fill="#2563eb" opacity="0.95"/>
  <circle cx="8" cy="132" r="4"  fill="#3b82f6" opacity="0.85"/>
  <circle cx="8" cy="152" r="3.5" fill="#60a5fa" opacity="0.75"/>
  <circle cx="8" cy="172" r="3.5" fill="#60a5fa" opacity="0.8"/>

  <!-- ── WAIST / NECK (AI filter core) ── -->
  <!-- Hourglass neck shape -->
  <path d="M 127,91 C 132,91 138,95 138,100 C 138,105 132,109 127,109 L 122,109 C 117,109 112,105 112,100 C 112,95 117,91 122,91 Z" fill="url(#waistGrad)" filter="url(#glow)" opacity="0.95"/>

  <!-- Waist vertical bar (the pinch) -->
  <rect x="126" y="86" width="8" height="28" rx="4" fill="url(#waistGrad)" filter="url(#glow)"/>

  <!-- AI core ring -->
  <circle cx="130" cy="100" r="11" fill="none" stroke="url(#waistGrad)" stroke-width="2" filter="url(#glow)" opacity="0.9"/>
  <circle cx="130" cy="100" r="6"  fill="#7c3aed" opacity="0.85" filter="url(#glow)"/>

  <!-- ── RIGHT SIDE: fewer, high-quality leads ── -->

  <!-- Only 2 streams emerge (quality filtered) -->
  <!-- Output stream 1 — upper -->
  <path d="M 130,100 C 133,95 140,88 152,82 C 168,74 190,62 222,52" fill="none" stroke="url(#r1)" stroke-width="4" stroke-linecap="round"/>
  <!-- Output stream 2 — lower -->
  <path d="M 130,100 C 133,105 140,112 152,118 C 168,126 190,138 222,148" fill="none" stroke="url(#r2)" stroke-width="4" stroke-linecap="round"/>

  <!-- Right bowtie triangle (filled, smaller = fewer leads) -->
  <path d="M 130,100 L 252,52 L 252,148 Z" fill="url(#rightGrad)" opacity="0.15"/>

  <!-- Output lead dots — bigger, glowing, premium -->
  <circle cx="222" cy="52"  r="6.5" fill="url(#dotGold)" filter="url(#glow)"/>
  <circle cx="222" cy="52"  r="3.5" fill="#fbbf24"/>
  <circle cx="222" cy="148" r="6.5" fill="url(#dotGold)" filter="url(#glow)"/>
  <circle cx="222" cy="148" r="3.5" fill="#f59e0b"/>

  <!-- Accent tick / check on output nodes -->
  <path d="M 219,52 L 221,54 L 226,49" fill="none" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 219,148 L 221,150 L 226,145" fill="none" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- ── FLOATING PARTICLES on left (raw data noise) ── -->
  <circle cx="38"  cy="40"  r="1.5" fill="#93c5fd" opacity="0.6"/>
  <circle cx="62"  cy="30"  r="1"   fill="#bfdbfe" opacity="0.5"/>
  <circle cx="50"  cy="160" r="1.5" fill="#93c5fd" opacity="0.55"/>
  <circle cx="78"  cy="170" r="1"   fill="#bfdbfe" opacity="0.45"/>
  <circle cx="95"  cy="55"  r="1.2" fill="#60a5fa" opacity="0.5"/>
  <circle cx="82"  cy="145" r="1.2" fill="#60a5fa" opacity="0.5"/>
  <circle cx="28"  cy="118" r="1"   fill="#93c5fd" opacity="0.4"/>

  <!-- ── LABEL ── -->
  <text x="150" y="176" text-anchor="middle" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="10.5" font-weight="700" letter-spacing="2.5" fill="#94a3b8" opacity="0.85">AGENTIC LEAD GEN</text>

  <!-- Subtle divider under label -->
  <line x1="80" y1="181" x2="220" y2="181" stroke="#334155" stroke-width="0.5"/>

  <!-- ── TOP LABEL ── -->
  <text x="38" y="15" text-anchor="middle" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="7" fill="#60a5fa" opacity="0.6" letter-spacing="1">RAW DATA</text>
  <text x="218" y="40" text-anchor="middle" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="7" fill="#fbbf24" opacity="0.65" letter-spacing="1">LEADS</text>
  <text x="130" y="78" text-anchor="middle" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="6.5" fill="#c4b5fd" opacity="0.7" letter-spacing="0.5">AI</text>

</svg>` },
  { id: 70, title: "Tidal Surge", concept: "Japanese-style wave in flat design", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#0d2147"/>
    </linearGradient>
    <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3a6b"/>
      <stop offset="100%" stop-color="#0d2147"/>
    </linearGradient>
    <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#122d5a"/>
      <stop offset="100%" stop-color="#0a1e3d"/>
    </linearGradient>
    <linearGradient id="crestGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a4a8a"/>
      <stop offset="60%" stop-color="#2563b0"/>
      <stop offset="100%" stop-color="#1a3a6b"/>
    </linearGradient>
    <clipPath id="bounds">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#skyGrad)"/>

  <!-- Distant horizon water -->
  <rect x="0" y="148" width="300" height="52" fill="#0a1e3d"/>

  <!-- Background small wave ripples -->
  <path d="M0 155 Q15 151 30 155 Q45 159 60 155 Q75 151 90 155 Q105 159 120 155 Q135 151 150 155 Q165 159 180 155 Q195 151 210 155 Q225 159 240 155 Q255 151 270 155 Q285 159 300 155 L300 160 L0 160Z" fill="#0f2a50" opacity="0.7"/>

  <!-- Main tidal wave body — large sweeping form -->
  <path d="M-10 200
           L-10 145
           Q20 130 45 118
           Q65 108 80 95
           Q95 82 100 68
           Q105 52 115 42
           Q128 30 148 35
           Q168 40 178 58
           Q188 75 192 90
           Q198 110 210 118
           Q228 128 255 122
           Q278 118 300 108
           L300 200Z"
        fill="url(#waveGrad1)"/>

  <!-- Wave curl / tube interior -->
  <path d="M100 68
           Q105 52 115 42
           Q128 30 148 35
           Q168 40 178 58
           Q186 72 188 85
           Q180 72 168 65
           Q152 57 138 60
           Q122 64 112 75
           Q106 82 104 90
           Q100 80 100 68Z"
        fill="#0a1628"/>

  <!-- Wave crest curl top -->
  <path d="M90 95
           Q95 82 100 68
           Q106 82 104 90
           Q112 75 122 64
           Q138 60 152 57
           Q168 65 180 72
           Q186 78 188 85
           Q192 90 192 90
           Q198 110 210 118
           Q195 108 185 100
           Q172 90 162 82
           Q148 72 134 74
           Q118 77 110 88
           Q100 102 98 115
           Q88 106 90 95Z"
        fill="url(#crestGrad)"/>

  <!-- Foam lines on wave face — Japanese woodblock style stripes -->
  <!-- Main foam curves on crest -->
  <path d="M108 88 Q120 78 136 76 Q152 74 164 83 Q174 90 180 100" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
  <path d="M104 96 Q118 85 136 82 Q155 79 168 89 Q180 98 186 112" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>
  <path d="M99 108 Q115 96 136 92 Q158 88 172 98 Q184 108 190 122" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>

  <!-- Foam drips from curl tip -->
  <path d="M148 35 Q155 28 162 32 Q170 37 168 45" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>
  <path d="M135 37 Q128 30 120 35 Q115 40 116 48" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>

  <!-- Spray dots at curl tip -->
  <circle cx="150" cy="30" r="1.5" fill="white" opacity="0.8"/>
  <circle cx="158" cy="27" r="1" fill="white" opacity="0.7"/>
  <circle cx="143" cy="28" r="1.2" fill="white" opacity="0.65"/>
  <circle cx="165" cy="31" r="0.8" fill="white" opacity="0.6"/>
  <circle cx="138" cy="31" r="0.9" fill="white" opacity="0.55"/>
  <circle cx="155" cy="24" r="0.7" fill="white" opacity="0.5"/>
  <circle cx="148" cy="22" r="0.6" fill="white" opacity="0.45"/>
  <circle cx="163" cy="25" r="0.6" fill="white" opacity="0.4"/>

  <!-- Water trough in front of wave -->
  <path d="M-10 145
           Q20 130 45 118
           Q65 108 80 95
           Q88 106 90 95
           Q80 110 70 122
           Q50 136 20 146
           L-10 150Z"
        fill="#0f2550"/>

  <!-- Foam lines on lower wave -->
  <path d="M20 136 Q40 126 62 118 Q78 112 88 105" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/>
  <path d="M10 142 Q32 133 55 124 Q72 117 84 110" fill="none" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.35"/>

  <!-- Right wave shoulder foam -->
  <path d="M210 118 Q228 128 255 122 Q278 118 300 108" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
  <path d="M205 128 Q230 136 258 130 Q278 126 300 118" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>

  <!-- Horizon wave lines (background texture) -->
  <path d="M0 142 Q25 138 50 142 Q75 146 100 142 Q125 138 150 142 Q175 146 200 142 Q225 138 250 142 Q275 146 300 142" fill="none" stroke="white" stroke-width="0.8" opacity="0.25"/>
  <path d="M0 150 Q30 147 60 150 Q90 153 120 150 Q150 147 180 150 Q210 153 240 150 Q270 147 300 150" fill="none" stroke="white" stroke-width="0.6" opacity="0.2"/>

  <!-- Text: AGENTIC LEAD GEN -->
  <!-- Main title -->
  <text x="150" y="172" font-family="'Arial Black', 'Arial', sans-serif" font-weight="900" font-size="16" fill="white" text-anchor="middle" letter-spacing="3" opacity="0.95">AGENTIC LEAD GEN</text>

  <!-- Tagline -->
  <text x="150" y="187" font-family="'Arial', sans-serif" font-weight="400" font-size="7" fill="white" text-anchor="middle" letter-spacing="4" opacity="0.6">TIDAL SURGE MOMENTUM</text>

  <!-- Decorative line under title -->
  <line x1="85" y1="176" x2="215" y2="176" stroke="white" stroke-width="0.5" opacity="0.35"/>
</svg>` },
  { id: 71, title: "AI Brain", concept: "half-organic half-circuit brain", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#a855f7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d9488;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="glowLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:0.05" />
    </linearGradient>
    <linearGradient id="glowRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488;stop-opacity:0.05" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:0.3" />
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#a78bfa" />
      <stop offset="100%" style="stop-color:#2dd4bf" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="leftHalf">
      <rect x="0" y="0" width="150" height="200"/>
    </clipPath>
    <clipPath id="rightHalf">
      <rect x="150" y="0" width="150" height="200"/>
    </clipPath>
    <clipPath id="brainClip">
      <path d="
        M150,28
        C138,20 122,18 110,22
        C96,26 84,34 78,46
        C70,46 60,50 56,60
        C48,64 42,74 44,86
        C38,92 36,102 40,112
        C36,120 36,132 44,140
        C48,152 58,160 70,162
        C76,166 84,168 92,168
        C104,174 118,174 130,170
        C138,172 146,172 150,170
        C154,172 162,172 170,170
        C182,174 196,174 208,168
        C216,168 224,166 230,162
        C242,160 252,152 256,140
        C264,132 264,120 260,112
        C264,102 262,92 256,86
        C258,74 252,64 244,60
        C240,50 230,46 222,46
        C216,34 204,26 190,22
        C178,18 162,20 150,28Z
      "/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#0a0a0f"/>

  <!-- Brain left fill (organic/human side) -->
  <path d="
    M150,28
    C138,20 122,18 110,22
    C96,26 84,34 78,46
    C70,46 60,50 56,60
    C48,64 42,74 44,86
    C38,92 36,102 40,112
    C36,120 36,132 44,140
    C48,152 58,160 70,162
    C76,166 84,168 92,168
    C104,174 118,174 130,170
    C138,172 146,172 150,170
    L150,28Z
  " fill="url(#glowLeft)" clip-path="url(#leftHalf)"/>

  <!-- Brain right fill (digital/circuit side) -->
  <path d="
    M150,28
    L150,170
    C154,172 162,172 170,170
    C182,174 196,174 208,168
    C216,168 224,166 230,162
    C242,160 252,152 256,140
    C264,132 264,120 260,112
    C264,102 262,92 256,86
    C258,74 252,64 244,60
    C240,50 230,46 222,46
    C216,34 204,26 190,22
    C178,18 162,20 150,28Z
  " fill="url(#glowRight)" clip-path="url(#rightHalf)"/>

  <!-- LEFT HEMISPHERE: Organic brain folds (curved, biological) -->
  <g clip-path="url(#leftHalf)" filter="url(#glow)">
    <!-- Outer fold 1 — top lobe -->
    <path d="M150,38 C142,34 130,32 118,36 C106,40 96,50 92,62" fill="none" stroke="#9333ea" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Outer fold 2 — frontal lobe -->
    <path d="M90,64 C82,70 76,80 78,92 C80,100 86,106 92,110" fill="none" stroke="#9333ea" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Outer fold 3 — temporal lobe -->
    <path d="M82,112 C76,120 76,132 82,140 C86,148 94,154 104,156" fill="none" stroke="#9333ea" stroke-width="2" stroke-linecap="round"/>
    <!-- Outer fold 4 — occipital -->
    <path d="M106,158 C116,164 130,166 142,164 C146,163 149,162 150,160" fill="none" stroke="#9333ea" stroke-width="2" stroke-linecap="round"/>
    <!-- Inner sulcus 1 -->
    <path d="M150,52 C144,48 136,46 126,50 C116,54 108,64 110,76" fill="none" stroke="#7c3aed" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Inner sulcus 2 -->
    <path d="M112,78 C106,86 106,96 110,104 C114,110 122,114 130,114" fill="none" stroke="#7c3aed" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Inner sulcus 3 -->
    <path d="M130,116 C124,122 118,130 120,140 C122,148 130,154 140,154" fill="none" stroke="#7c3aed" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Gyrus curve top -->
    <path d="M150,66 C144,62 136,62 128,66 C120,70 116,80 120,88" fill="none" stroke="#a855f7" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
    <!-- Gyrus curve mid -->
    <path d="M118,90 C114,98 116,108 122,114" fill="none" stroke="#a855f7" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
    <!-- Gyrus curve bottom -->
    <path d="M150,130 C144,128 136,128 130,132 C124,136 120,144 122,152" fill="none" stroke="#a855f7" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
    <!-- Parietal fold -->
    <path d="M150,96 C144,92 138,90 132,92 C126,94 122,100 124,108" fill="none" stroke="#7c3aed" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
  </g>

  <!-- RIGHT HEMISPHERE: Circuit traces (digital) -->
  <g clip-path="url(#rightHalf)" filter="url(#glow)">
    <!-- Horizontal bus lines -->
    <line x1="150" y1="52" x2="230" y2="52" stroke="#0d9488" stroke-width="1.5" opacity="0.7"/>
    <line x1="150" y1="76" x2="246" y2="76" stroke="#0d9488" stroke-width="1.5" opacity="0.7"/>
    <line x1="150" y1="100" x2="252" y2="100" stroke="#0d9488" stroke-width="1.5" opacity="0.7"/>
    <line x1="150" y1="124" x2="248" y2="124" stroke="#0d9488" stroke-width="1.5" opacity="0.7"/>
    <line x1="150" y1="148" x2="232" y2="148" stroke="#0d9488" stroke-width="1.5" opacity="0.7"/>

    <!-- Vertical bus connectors -->
    <line x1="175" y1="44" x2="175" y2="156" stroke="#0d9488" stroke-width="1.2" opacity="0.5"/>
    <line x1="200" y1="36" x2="200" y2="162" stroke="#0d9488" stroke-width="1.2" opacity="0.5"/>
    <line x1="225" y1="48" x2="225" y2="152" stroke="#0d9488" stroke-width="1.2" opacity="0.5"/>
    <line x1="245" y1="72" x2="245" y2="130" stroke="#0d9488" stroke-width="1.2" opacity="0.5"/>

    <!-- L-shaped traces top cluster -->
    <polyline points="163,44 163,52" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="188,36 188,44 200,44" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="215,42 215,52 225,52" fill="none" stroke="#14b8a6" stroke-width="1.8"/>

    <!-- L-shaped traces mid cluster -->
    <polyline points="163,76 163,88 175,88" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="213,76 213,88 225,88" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="175,100 175,112 188,112" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="225,100 225,112 238,112" fill="none" stroke="#14b8a6" stroke-width="1.8"/>

    <!-- L-shaped traces bottom cluster -->
    <polyline points="163,124 163,136 175,136" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="200,124 200,136 213,136" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
    <polyline points="175,148 175,158 188,158" fill="none" stroke="#14b8a6" stroke-width="1.8"/>

    <!-- Circuit nodes (squares = ICs) -->
    <rect x="170" y="48" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="195" y="40" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="220" y="48" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="158" y="84" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="208" y="84" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="183" y="108" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="233" y="108" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="158" y="132" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="208" y="132" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>
    <rect x="183" y="154" width="10" height="8" rx="1" fill="none" stroke="#2dd4bf" stroke-width="1.5"/>

    <!-- Neural node dots at intersections -->
    <circle cx="175" cy="52" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="200" cy="52" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="225" cy="52" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="175" cy="76" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="200" cy="76" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="225" cy="76" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="245" cy="76" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="175" cy="100" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="200" cy="100" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="225" cy="100" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="245" cy="100" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="175" cy="124" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="200" cy="124" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="225" cy="124" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="175" cy="148" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
    <circle cx="200" cy="148" r="2.5" fill="#0d9488" filter="url(#softGlow)"/>
  </g>

  <!-- Brain outer outline (full) with gradient stroke via two paths -->
  <path d="
    M150,28
    C138,20 122,18 110,22
    C96,26 84,34 78,46
    C70,46 60,50 56,60
    C48,64 42,74 44,86
    C38,92 36,102 40,112
    C36,120 36,132 44,140
    C48,152 58,160 70,162
    C76,166 84,168 92,168
    C104,174 118,174 130,170
    C138,172 146,172 150,170
  " fill="none" stroke="#9333ea" stroke-width="2.5" stroke-linecap="round"/>
  <path d="
    M150,170
    C154,172 162,172 170,170
    C182,174 196,174 208,168
    C216,168 224,166 230,162
    C242,160 252,152 256,140
    C264,132 264,120 260,112
    C264,102 262,92 256,86
    C258,74 252,64 244,60
    C240,50 230,46 222,46
    C216,34 204,26 190,22
    C178,18 162,20 150,28
  " fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Center dividing line (corpus callosum split) -->
  <line x1="150" y1="28" x2="150" y2="170" stroke="url(#brainGrad)" stroke-width="1.8" stroke-dasharray="4,3" opacity="0.9"/>

  <!-- Central node at top and bottom of split -->
  <circle cx="150" cy="28" r="3.5" fill="url(#brainGrad)" filter="url(#softGlow)"/>
  <circle cx="150" cy="170" r="3.5" fill="url(#brainGrad)" filter="url(#softGlow)"/>
  <circle cx="150" cy="99" r="5" fill="url(#brainGrad)" filter="url(#softGlow)"/>
  <circle cx="150" cy="99" r="2.5" fill="#ffffff" opacity="0.8"/>

  <!-- Cross-hemisphere connection arcs -->
  <path d="M130,80 C140,76 160,76 170,80" fill="none" stroke="url(#brainGrad)" stroke-width="1.2" opacity="0.5" stroke-dasharray="3,2"/>
  <path d="M128,110 C139,106 161,106 172,110" fill="none" stroke="url(#brainGrad)" stroke-width="1.2" opacity="0.5" stroke-dasharray="3,2"/>
  <path d="M132,138 C141,134 159,134 168,138" fill="none" stroke="url(#brainGrad)" stroke-width="1.2" opacity="0.5" stroke-dasharray="3,2"/>

  <!-- Text: AGENTIC LEAD GEN -->
  <text x="150" y="189" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="3" text-anchor="middle" fill="url(#textGrad)" filter="url(#glow)">AGENTIC LEAD GEN</text>

  <!-- Subtle tagline -->
  <text x="150" y="200" font-family="'Segoe UI', Arial, sans-serif" font-size="5.5" font-weight="400" letter-spacing="2.5" text-anchor="middle" fill="#6b7280" opacity="0.8">AI · DISCOVER · CONVERT</text>
</svg>` },
  { id: 72, title: "Domino Chain", concept: "falling dominos as pipeline stages", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Motion blur filters for falling dominos -->
    <filter id="blur-mild" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5 0.5"/>
    </filter>
    <filter id="blur-medium" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5 0.8"/>
    </filter>
    <filter id="blur-strong" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.5 1.2"/>
    </filter>
    <filter id="blur-max" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5 1.8"/>
    </filter>

    <!-- Shadow for standing domino -->
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25"/>
    </filter>

    <!-- Gradient for domino face -->
    <linearGradient id="tile-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#f0f0f0;stop-opacity:1"/>
    </linearGradient>

    <!-- Ground shadow gradient -->
    <radialGradient id="ground-shadow-1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.18"/>
      <stop offset="100%" style="stop-color:#000;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="ground-shadow-2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:#000;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="ground-shadow-3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.13"/>
      <stop offset="100%" style="stop-color:#000;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="ground-shadow-4" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.12"/>
      <stop offset="100%" style="stop-color:#000;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="ground-shadow-5" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.1"/>
      <stop offset="100%" style="stop-color:#000;stop-opacity:0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#fafafa"/>

  <!-- Baseline / ground line -->
  <line x1="18" y1="162" x2="282" y2="162" stroke="#e0e0e0" stroke-width="1"/>

  <!-- ============================================================
       DOMINO 1 — smallest, already fallen flat (horizontal)
       tile: 10w x 16h -> fallen: 16w x 10h, centered ~x=30
       ============================================================ -->
  <!-- ground shadow -->
  <ellipse cx="32" cy="163" rx="10" ry="3" fill="url(#ground-shadow-1)" filter="url(#blur-mild)"/>
  <!-- fallen tile body -->
  <g transform="translate(24, 153) rotate(90, 8, 5)" filter="url(#blur-mild)">
    <rect x="0" y="0" width="10" height="16" rx="1.2" ry="1.2" fill="url(#tile-grad)" stroke="#1a1a1a" stroke-width="0.9"/>
    <line x1="0" y1="8" x2="10" y2="8" stroke="#1a1a1a" stroke-width="0.6" opacity="0.4"/>
    <!-- dots top half: 1 dot -->
    <circle cx="5" cy="3.5" r="1" fill="#1a1a1a"/>
    <!-- dots bottom half: 2 dots -->
    <circle cx="2.8" cy="12.5" r="1" fill="#1a1a1a"/>
    <circle cx="7.2" cy="12.5" r="1" fill="#1a1a1a"/>
  </g>

  <!-- ============================================================
       DOMINO 2 — mid-fall, tilted ~65deg, tile: 13w x 21h
       ============================================================ -->
  <!-- ground shadow -->
  <ellipse cx="62" cy="163" rx="12" ry="3.5" fill="url(#ground-shadow-2)" filter="url(#blur-medium)"/>
  <!-- falling tile -->
  <g transform="translate(62, 162) rotate(-65)" filter="url(#blur-mild)">
    <rect x="-6.5" y="-21" width="13" height="21" rx="1.5" ry="1.5" fill="url(#tile-grad)" stroke="#1a1a1a" stroke-width="1"/>
    <line x1="-6.5" y1="-10.5" x2="6.5" y2="-10.5" stroke="#1a1a1a" stroke-width="0.7" opacity="0.4"/>
    <!-- dots top half: 2 dots -->
    <circle cx="-2.5" cy="-17.5" r="1.2" fill="#1a1a1a"/>
    <circle cx="2.5" cy="-17.5" r="1.2" fill="#1a1a1a"/>
    <!-- dots bottom half: 3 dots (triangle) -->
    <circle cx="-2.5" cy="-5" r="1.2" fill="#1a1a1a"/>
    <circle cx="2.5" cy="-7" r="1.2" fill="#1a1a1a"/>
    <circle cx="0" cy="-3" r="1.2" fill="#1a1a1a"/>
  </g>

  <!-- ============================================================
       DOMINO 3 — mid-fall, tilted ~45deg, tile: 16w x 26h
       ============================================================ -->
  <!-- ground shadow -->
  <ellipse cx="96" cy="163" rx="15" ry="4" fill="url(#ground-shadow-3)" filter="url(#blur-medium)"/>
  <!-- falling tile -->
  <g transform="translate(96, 162) rotate(-45)" filter="url(#blur-medium)">
    <rect x="-8" y="-26" width="16" height="26" rx="1.8" ry="1.8" fill="url(#tile-grad)" stroke="#1a1a1a" stroke-width="1.1"/>
    <line x1="-8" y1="-13" x2="8" y2="-13" stroke="#1a1a1a" stroke-width="0.8" opacity="0.4"/>
    <!-- dots top half: 2 dots -->
    <circle cx="-3" cy="-21" r="1.5" fill="#1a1a1a"/>
    <circle cx="3" cy="-21" r="1.5" fill="#1a1a1a"/>
    <!-- dots bottom half: 4 dots (2x2) -->
    <circle cx="-3" cy="-9" r="1.5" fill="#1a1a1a"/>
    <circle cx="3" cy="-9" r="1.5" fill="#1a1a1a"/>
    <circle cx="-3" cy="-4" r="1.5" fill="#1a1a1a"/>
    <circle cx="3" cy="-4" r="1.5" fill="#1a1a1a"/>
  </g>

  <!-- ============================================================
       DOMINO 4 — early fall, tilted ~25deg, tile: 20w x 33h
       ============================================================ -->
  <!-- ground shadow -->
  <ellipse cx="140" cy="164" rx="18" ry="5" fill="url(#ground-shadow-4)" filter="url(#blur-medium)"/>
  <!-- falling tile -->
  <g transform="translate(140, 162) rotate(-25)" filter="url(#blur-strong)">
    <rect x="-10" y="-33" width="20" height="33" rx="2" ry="2" fill="url(#tile-grad)" stroke="#1a1a1a" stroke-width="1.2"/>
    <line x1="-10" y1="-16.5" x2="10" y2="-16.5" stroke="#1a1a1a" stroke-width="0.9" opacity="0.4"/>
    <!-- dots top half: 3 dots -->
    <circle cx="-4" cy="-27" r="1.8" fill="#1a1a1a"/>
    <circle cx="0" cy="-23" r="1.8" fill="#1a1a1a"/>
    <circle cx="4" cy="-27" r="1.8" fill="#1a1a1a"/>
    <!-- dots bottom half: 5 dots (quincunx) -->
    <circle cx="-4" cy="-12" r="1.8" fill="#1a1a1a"/>
    <circle cx="4" cy="-12" r="1.8" fill="#1a1a1a"/>
    <circle cx="0" cy="-8.5" r="1.8" fill="#1a1a1a"/>
    <circle cx="-4" cy="-5" r="1.8" fill="#1a1a1a"/>
    <circle cx="4" cy="-5" r="1.8" fill="#1a1a1a"/>
  </g>

  <!-- ============================================================
       DOMINO 5 — just tipping, tilted ~8deg, tile: 25w x 42h
       ============================================================ -->
  <!-- ground shadow -->
  <ellipse cx="196" cy="164" rx="22" ry="5.5" fill="url(#ground-shadow-5)" filter="url(#blur-strong)"/>
  <!-- tipping tile -->
  <g transform="translate(196, 162) rotate(-8)" filter="url(#blur-max)">
    <rect x="-12.5" y="-42" width="25" height="42" rx="2.5" ry="2.5" fill="url(#tile-grad)" stroke="#1a1a1a" stroke-width="1.4"/>
    <line x1="-12.5" y1="-21" x2="12.5" y2="-21" stroke="#1a1a1a" stroke-width="1" opacity="0.4"/>
    <!-- dots top half: 4 dots (2x2) -->
    <circle cx="-5" cy="-36" r="2.2" fill="#1a1a1a"/>
    <circle cx="5" cy="-36" r="2.2" fill="#1a1a1a"/>
    <circle cx="-5" cy="-28" r="2.2" fill="#1a1a1a"/>
    <circle cx="5" cy="-28" r="2.2" fill="#1a1a1a"/>
    <!-- dots bottom half: 6 dots (3x2) -->
    <circle cx="-5" cy="-17" r="2.2" fill="#1a1a1a"/>
    <circle cx="5" cy="-17" r="2.2" fill="#1a1a1a"/>
    <circle cx="-5" cy="-11" r="2.2" fill="#1a1a1a"/>
    <circle cx="5" cy="-11" r="2.2" fill="#1a1a1a"/>
    <circle cx="-5" cy="-5" r="2.2" fill="#1a1a1a"/>
    <circle cx="5" cy="-5" r="2.2" fill="#1a1a1a"/>
  </g>

  <!-- ============================================================
       DOMINO 6 — standing upright, largest, tile: 32w x 54h
       ============================================================ -->
  <!-- ground shadow -->
  <ellipse cx="256" cy="165" rx="20" ry="5" fill="url(#ground-shadow-5)"/>
  <!-- standing tile -->
  <g transform="translate(240, 108)" filter="url(#shadow)">
    <rect x="0" y="0" width="32" height="54" rx="3" ry="3" fill="url(#tile-grad)" stroke="#1a1a1a" stroke-width="1.6"/>
    <line x1="0" y1="27" x2="32" y2="27" stroke="#1a1a1a" stroke-width="1.1" opacity="0.4"/>
    <!-- dots top half: 5 (quincunx) -->
    <circle cx="9" cy="8" r="2.6" fill="#1a1a1a"/>
    <circle cx="23" cy="8" r="2.6" fill="#1a1a1a"/>
    <circle cx="16" cy="13.5" r="2.6" fill="#1a1a1a"/>
    <circle cx="9" cy="19" r="2.6" fill="#1a1a1a"/>
    <circle cx="23" cy="19" r="2.6" fill="#1a1a1a"/>
    <!-- dots bottom half: 6 (3x2) -->
    <circle cx="9" cy="32" r="2.6" fill="#1a1a1a"/>
    <circle cx="23" cy="32" r="2.6" fill="#1a1a1a"/>
    <circle cx="9" cy="40" r="2.6" fill="#1a1a1a"/>
    <circle cx="23" cy="40" r="2.6" fill="#1a1a1a"/>
    <circle cx="9" cy="48" r="2.6" fill="#1a1a1a"/>
    <circle cx="23" cy="48" r="2.6" fill="#1a1a1a"/>
  </g>

  <!-- ============================================================
       Motion trail particles — kinetic energy dots
       ============================================================ -->
  <circle cx="50" cy="148" r="1" fill="#1a1a1a" opacity="0.15"/>
  <circle cx="55" cy="152" r="0.8" fill="#1a1a1a" opacity="0.12"/>
  <circle cx="78" cy="140" r="1.2" fill="#1a1a1a" opacity="0.18"/>
  <circle cx="84" cy="145" r="0.9" fill="#1a1a1a" opacity="0.13"/>
  <circle cx="116" cy="132" r="1.4" fill="#1a1a1a" opacity="0.2"/>
  <circle cx="122" cy="138" r="1" fill="#1a1a1a" opacity="0.15"/>
  <circle cx="162" cy="122" r="1.6" fill="#1a1a1a" opacity="0.22"/>
  <circle cx="168" cy="130" r="1.1" fill="#1a1a1a" opacity="0.16"/>
  <circle cx="210" cy="108" r="1.8" fill="#1a1a1a" opacity="0.18"/>
  <circle cx="216" cy="116" r="1.2" fill="#1a1a1a" opacity="0.13"/>

  <!-- ============================================================
       Typography — "Agentic Lead Gen"
       ============================================================ -->
  <text
    x="150"
    y="183"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="11"
    font-weight="700"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="#1a1a1a"
    text-rendering="geometricPrecision"
  >AGENTIC LEAD GEN</text>
</svg>` },
  { id: 73, title: "Arrow Quiver", concept: "bundle of arrows in same direction", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#B8860B;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shaftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2D5A27;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1A3A16;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="quiverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2D5A27;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0F2210;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A1A08;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#142810;stop-opacity:1" />
    </linearGradient>
    <filter id="goldGlow">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="shadow">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Background shield/crest shape -->
  <path d="M150 8 L270 45 L270 120 Q270 175 150 195 Q30 175 30 120 L30 45 Z"
        fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="2.5" filter="url(#shadow)" />

  <!-- Inner shield border -->
  <path d="M150 18 L258 50 L258 118 Q258 166 150 184 Q42 166 42 118 L42 50 Z"
        fill="none" stroke="url(#goldGrad)" stroke-width="1" opacity="0.5" />

  <!-- Quiver body (cylindrical container, center-left) -->
  <rect x="108" y="70" width="22" height="62" rx="5" ry="5"
        fill="url(#quiverGrad)" stroke="url(#goldGrad)" stroke-width="1.2" />

  <!-- Quiver cap / top band -->
  <rect x="105" y="67" width="28" height="9" rx="4" ry="4"
        fill="url(#goldGrad)" opacity="0.9" />

  <!-- Quiver bottom band -->
  <rect x="105" y="122" width="28" height="8" rx="3" ry="3"
        fill="url(#goldGrad)" opacity="0.9" />

  <!-- Quiver decorative middle band -->
  <rect x="106" y="93" width="26" height="5" rx="2" ry="2"
        fill="url(#goldGrad)" opacity="0.7" />

  <!-- Quiver diagonal strap -->
  <line x1="108" y1="76" x2="130" y2="128"
        stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.6" />

  <!-- Arrow 1 — center, straight up, slightly protruding from quiver -->
  <!-- Shaft -->
  <line x1="119" y1="20" x2="119" y2="72"
        stroke="url(#shaftGrad)" stroke-width="3" stroke-linecap="round" />
  <!-- Fletching -->
  <polygon points="119,72 113,88 119,84 125,88"
           fill="#1A3A16" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.9" />
  <!-- Arrowhead -->
  <polygon points="119,20 113,36 119,30 125,36"
           fill="url(#goldGrad)" filter="url(#goldGlow)" />

  <!-- Arrow 2 — left, angled slightly left -->
  <line x1="107" y1="24" x2="112" y2="72"
        stroke="url(#shaftGrad)" stroke-width="2.5" stroke-linecap="round" />
  <polygon points="107,24 100,40 107,34 113,39"
           fill="url(#goldGrad)" filter="url(#goldGlow)" />
  <polygon points="113,73 107,88 112,83 119,86"
           fill="#1A3A16" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.85" />

  <!-- Arrow 3 — right, angled slightly right -->
  <line x1="131" y1="24" x2="126" y2="72"
        stroke="url(#shaftGrad)" stroke-width="2.5" stroke-linecap="round" />
  <polygon points="131,24 125,40 131,34 138,39"
           fill="url(#goldGrad)" filter="url(#goldGlow)" />
  <polygon points="125,73 120,86 126,83 132,88"
           fill="#1A3A16" stroke="url(#goldGrad)" stroke-width="0.7" opacity="0.85" />

  <!-- Arrow 4 — far left, wider angle -->
  <line x1="96" y1="30" x2="106" y2="72"
        stroke="url(#shaftGrad)" stroke-width="2" stroke-linecap="round" />
  <polygon points="96,30 88,46 96,40 103,44"
           fill="url(#goldGrad)" filter="url(#goldGlow)" />

  <!-- Arrow 5 — far right, wider angle -->
  <line x1="142" y1="30" x2="132" y2="72"
        stroke="url(#shaftGrad)" stroke-width="2" stroke-linecap="round" />
  <polygon points="142,30 136,46 142,40 149,44"
           fill="url(#goldGrad)" filter="url(#goldGlow)" />

  <!-- Decorative gold stars / dots on shield -->
  <circle cx="72" cy="90" r="3" fill="url(#goldGrad)" opacity="0.7" />
  <circle cx="228" cy="90" r="3" fill="url(#goldGrad)" opacity="0.7" />
  <circle cx="72" cy="130" r="2" fill="url(#goldGrad)" opacity="0.5" />
  <circle cx="228" cy="130" r="2" fill="url(#goldGrad)" opacity="0.5" />

  <!-- Heraldic laurel hints — left -->
  <path d="M55 108 Q48 98 52 88 Q58 100 55 108 Z" fill="#2D5A27" opacity="0.8" />
  <path d="M55 108 Q45 105 44 95 Q53 103 55 108 Z" fill="#2D5A27" opacity="0.8" />
  <path d="M55 108 Q46 114 46 124 Q54 115 55 108 Z" fill="#2D5A27" opacity="0.8" />
  <path d="M55 108 Q49 118 52 128 Q58 116 55 108 Z" fill="#2D5A27" opacity="0.8" />
  <line x1="55" y1="85" x2="55" y2="130" stroke="#2D5A27" stroke-width="1.5" />

  <!-- Heraldic laurel hints — right -->
  <path d="M245 108 Q252 98 248 88 Q242 100 245 108 Z" fill="#2D5A27" opacity="0.8" />
  <path d="M245 108 Q255 105 256 95 Q247 103 245 108 Z" fill="#2D5A27" opacity="0.8" />
  <path d="M245 108 Q254 114 254 124 Q246 115 245 108 Z" fill="#2D5A27" opacity="0.8" />
  <path d="M245 108 Q251 118 248 128 Q242 116 245 108 Z" fill="#2D5A27" opacity="0.8" />
  <line x1="245" y1="85" x2="245" y2="130" stroke="#2D5A27" stroke-width="1.5" />

  <!-- Brand name -->
  <text x="150" y="156"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="13"
        font-weight="bold"
        fill="url(#goldGrad)"
        text-anchor="middle"
        letter-spacing="3">AGENTIC</text>

  <text x="150" y="172"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="10"
        fill="#A8C4A0"
        text-anchor="middle"
        letter-spacing="4">LEAD  GEN</text>

  <!-- Bottom divider line -->
  <line x1="95" y1="162" x2="205" y2="162"
        stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.6" />

  <!-- Small diamond ornaments on divider -->
  <polygon points="150,157 153,160 150,163 147,160" fill="url(#goldGrad)" opacity="0.9" />
  <polygon points="100,162 103,159 100,156 97,159" fill="url(#goldGrad)" opacity="0.5" />
  <polygon points="200,162 203,159 200,156 197,159" fill="url(#goldGrad)" opacity="0.5" />
</svg>` },
  { id: 74, title: "Searchlight", concept: "spotlight beam revealing prospects", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep dark background gradient -->
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020810"/>
      <stop offset="60%" stop-color="#050f1f"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>

    <!-- Ground gradient -->
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1a2e"/>
      <stop offset="100%" stop-color="#060d18"/>
    </linearGradient>

    <!-- Searchlight beam gradient - cone from source -->
    <linearGradient id="beamGrad" x1="0" y1="1" x2="1" y2="0" gradientUnits="userSpaceOnUse"
      x1="38" y1="162" x2="220" y2="30">
      <stop offset="0%" stop-color="#fffde0" stop-opacity="0.95"/>
      <stop offset="25%" stop-color="#fff5a0" stop-opacity="0.75"/>
      <stop offset="60%" stop-color="#ffeA30" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffcc00" stop-opacity="0.0"/>
    </linearGradient>

    <!-- Beam glow radial at source -->
    <radialGradient id="sourceGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="30%" stop-color="#fffde0" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#ffd700" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ff9900" stop-opacity="0"/>
    </radialGradient>

    <!-- Beam secondary scatter -->
    <linearGradient id="scatterGrad" x1="0" y1="1" x2="1" y2="0" gradientUnits="userSpaceOnUse"
      x1="38" y1="162" x2="240" y2="20">
      <stop offset="0%" stop-color="#fffff0" stop-opacity="0.4"/>
      <stop offset="40%" stop-color="#fff0a0" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffd700" stop-opacity="0"/>
    </linearGradient>

    <!-- Illuminated highlight for buildings -->
    <linearGradient id="buildingHighlight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a3a5c"/>
      <stop offset="50%" stop-color="#ffe87a" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#0f2040"/>
    </linearGradient>

    <!-- Fog/atmosphere layer -->
    <radialGradient id="fogGrad" cx="45%" cy="70%" r="60%">
      <stop offset="0%" stop-color="#3a6fa8" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0a1628" stop-opacity="0"/>
    </radialGradient>

    <!-- Clip path for beam -->
    <clipPath id="beamClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>

    <!-- Filter: soft glow blur -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Filter: strong glow for source -->
    <filter id="sourceGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Filter: building illumination -->
    <filter id="buildingGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Filter: ambient beam diffusion -->
    <filter id="beamBlur">
      <feGaussianBlur stdDeviation="3"/>
    </filter>

    <!-- Stars pattern -->
    <pattern id="stars" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="8" r="0.4" fill="#8ab4d4" opacity="0.6"/>
      <circle cx="22" cy="3" r="0.3" fill="#aac8e4" opacity="0.5"/>
      <circle cx="38" cy="12" r="0.5" fill="#ffffff" opacity="0.4"/>
      <circle cx="12" cy="28" r="0.3" fill="#8ab4d4" opacity="0.5"/>
      <circle cx="45" cy="22" r="0.4" fill="#aac8e4" opacity="0.3"/>
      <circle cx="30" cy="40" r="0.3" fill="#ffffff" opacity="0.4"/>
      <circle cx="8" cy="44" r="0.5" fill="#8ab4d4" opacity="0.3"/>
      <circle cx="48" cy="46" r="0.3" fill="#aac8e4" opacity="0.5"/>
    </pattern>
  </defs>

  <!-- Background sky -->
  <rect width="300" height="200" fill="url(#skyGrad)"/>

  <!-- Stars -->
  <rect width="300" height="140" fill="url(#stars)"/>

  <!-- Distant horizon glow (city ambient) -->
  <ellipse cx="195" cy="138" rx="90" ry="18" fill="#0d2a4a" opacity="0.6"/>
  <ellipse cx="195" cy="138" rx="60" ry="10" fill="#112e52" opacity="0.4"/>

  <!-- Ground plane -->
  <rect x="0" y="140" width="300" height="60" fill="url(#groundGrad)"/>

  <!-- Ground line subtle highlight -->
  <line x1="0" y1="140" x2="300" y2="140" stroke="#0d2a4a" stroke-width="1" opacity="0.7"/>

  <!-- === SEARCHLIGHT BEAM (background soft cone) === -->
  <polygon
    points="36,162 8,0 75,0"
    fill="url(#scatterGrad)"
    filter="url(#beamBlur)"
    opacity="0.5"
    clip-path="url(#beamClip)"
  />

  <!-- Main beam cone -->
  <polygon
    points="38,163 15,0 68,0"
    fill="url(#beamGrad)"
    opacity="0.85"
    clip-path="url(#beamClip)"
  />

  <!-- Inner bright beam core -->
  <polygon
    points="38,163 30,0 50,0"
    fill="#fffde8"
    opacity="0.45"
    clip-path="url(#beamClip)"
    filter="url(#beamBlur)"
  />

  <!-- Beam edge rays (atmospheric scatter) -->
  <line x1="38" y1="163" x2="5" y2="0" stroke="#fffde0" stroke-width="0.5" opacity="0.2"/>
  <line x1="38" y1="163" x2="75" y2="0" stroke="#fffde0" stroke-width="0.5" opacity="0.2"/>
  <line x1="38" y1="163" x2="40" y2="0" stroke="#ffffff" stroke-width="1" opacity="0.3"/>

  <!-- Fog/atmosphere overlay on beam -->
  <rect width="300" height="200" fill="url(#fogGrad)"/>

  <!-- === DISTANT CITY SILHOUETTES (being illuminated) === -->

  <!-- Background dim buildings (not in beam) -->
  <g opacity="0.25" fill="#0b1e35">
    <!-- Far right buildings -->
    <rect x="240" y="112" width="12" height="28"/>
    <rect x="255" y="118" width="8" height="22"/>
    <rect x="266" y="108" width="14" height="32"/>
    <rect x="283" y="120" width="10" height="20"/>
    <rect x="246" y="106" width="6" height="6"/>
    <!-- Far left buildings -->
    <rect x="0" y="120" width="10" height="20"/>
    <rect x="12" y="115" width="8" height="25"/>
  </g>

  <!-- Mid buildings (partially illuminated, beam edge) -->
  <g filter="url(#buildingGlow)">
    <!-- Building cluster in beam zone - illuminated face -->
    <rect x="90" y="105" width="16" height="35" fill="#0e2540" opacity="0.9"/>
    <rect x="90" y="103" width="4" height="3" fill="#0e2540" opacity="0.9"/><!-- antenna -->
    <!-- Lit face from beam -->
    <rect x="90" y="105" width="3" height="35" fill="#d4a820" opacity="0.5"/>

    <rect x="110" y="98" width="20" height="42" fill="#0c2238" opacity="0.9"/>
    <rect x="117" y="95" width="5" height="4" fill="#0c2238" opacity="0.9"/>
    <!-- Lit face -->
    <rect x="110" y="98" width="4" height="42" fill="#e8c030" opacity="0.55"/>
    <!-- Windows illuminated -->
    <rect x="115" y="102" width="3" height="3" fill="#ffe870" opacity="0.8"/>
    <rect x="120" y="102" width="3" height="3" fill="#ffe870" opacity="0.7"/>
    <rect x="115" y="110" width="3" height="3" fill="#ffe870" opacity="0.6"/>
    <rect x="120" y="110" width="3" height="3" fill="#ffe870" opacity="0.5"/>
    <rect x="115" y="118" width="3" height="3" fill="#ffd040" opacity="0.4"/>

    <rect x="135" y="110" width="14" height="30" fill="#0d2030" opacity="0.9"/>
    <rect x="140" y="107" width="4" height="4" fill="#0d2030"/>
    <!-- Lit face -->
    <rect x="135" y="110" width="3" height="30" fill="#c89010" opacity="0.4"/>
    <!-- Windows -->
    <rect x="139" y="114" width="3" height="2" fill="#ffd840" opacity="0.6"/>
    <rect x="144" y="114" width="3" height="2" fill="#ffd840" opacity="0.5"/>
    <rect x="139" y="120" width="3" height="2" fill="#ffcc20" opacity="0.4"/>

    <rect x="153" y="118" width="10" height="22" fill="#0e1e30" opacity="0.85"/>
    <!-- Lit face diminishing -->
    <rect x="153" y="118" width="2" height="22" fill="#a07008" opacity="0.3"/>

    <!-- Taller landmark building -->
    <rect x="170" y="95" width="18" height="45" fill="#0a1c2e" opacity="0.8"/>
    <rect x="177" y="90" width="4" height="6" fill="#0a1c2e" opacity="0.8"/>
    <rect x="178" y="87" width="2" height="4" fill="#0a1c2e" opacity="0.8"/>
    <!-- Barely lit edge -->
    <rect x="170" y="95" width="2" height="45" fill="#806005" opacity="0.25"/>
  </g>

  <!-- Foreground dark buildings (silhouette, not illuminated) -->
  <g fill="#06101e" opacity="0.95">
    <rect x="200" y="110" width="22" height="30"/>
    <rect x="205" y="105" width="6" height="6"/><!-- rooftop unit -->
    <rect x="225" y="115" width="15" height="25"/>
    <rect x="229" y="111" width="4" height="5"/>
    <rect x="242" y="120" width="12" height="20"/>
    <rect x="260" y="118" width="16" height="22"/>
    <rect x="268" y="113" width="5" height="6"/>
    <rect x="278" y="122" width="10" height="18"/>
    <rect x="287" y="126" width="8" height="14"/>
    <!-- Left side dark silhouettes -->
    <rect x="0" y="122" width="8" height="18"/>
  </g>

  <!-- Ground details - road/surface markings -->
  <line x1="0" y1="155" x2="300" y2="155" stroke="#0d2238" stroke-width="0.5" opacity="0.5"/>
  <!-- Beam ground pool of light -->
  <ellipse cx="42" cy="162" rx="22" ry="6" fill="#ffe060" opacity="0.25" filter="url(#beamBlur)"/>

  <!-- === SEARCHLIGHT HOUSING === -->
  <!-- Base mount -->
  <rect x="26" y="164" width="24" height="6" rx="2" fill="#1a3a5c"/>
  <rect x="29" y="162" width="18" height="4" rx="1" fill="#1e4268"/>
  <!-- Housing body -->
  <ellipse cx="38" cy="162" rx="10" ry="6" fill="#1e3f6a"/>
  <ellipse cx="38" cy="162" rx="8" ry="4.5" fill="#2a5490"/>
  <!-- Lens -->
  <ellipse cx="38" cy="162" rx="5" ry="3" fill="#fffde0" filter="url(#sourceGlowFilter)" opacity="0.95"/>
  <ellipse cx="38" cy="162" rx="3" ry="2" fill="#ffffff"/>
  <!-- Lens center hotspot -->
  <ellipse cx="38" cy="162" rx="1.5" ry="1" fill="#ffffff" opacity="0.95"/>
  <!-- Source glow halo -->
  <ellipse cx="38" cy="162" rx="14" ry="10" fill="url(#sourceGlow)" opacity="0.7" filter="url(#beamBlur)"/>

  <!-- Mounting arm -->
  <line x1="38" y1="166" x2="38" y2="172" stroke="#152e4a" stroke-width="3" stroke-linecap="round"/>
  <rect x="32" y="170" width="12" height="3" rx="1.5" fill="#0f2236"/>

  <!-- === TEXT === -->
  <!-- "AGENTIC" label -->
  <text
    x="150"
    y="160"
    text-anchor="middle"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="9"
    font-weight="700"
    letter-spacing="4"
    fill="#7aafd4"
    opacity="0.9"
  >AGENTIC</text>

  <!-- "LEAD GEN" main title -->
  <text
    x="150"
    y="175"
    text-anchor="middle"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="14"
    font-weight="900"
    letter-spacing="3"
    fill="#ffffff"
    filter="url(#glow)"
  >LEAD GEN</text>

  <!-- Subtle tagline -->
  <text
    x="150"
    y="187"
    text-anchor="middle"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="5.5"
    font-weight="400"
    letter-spacing="2.5"
    fill="#3a6fa8"
    opacity="0.8"
  >ILLUMINATE YOUR PROSPECTS</text>

  <!-- Decorative accent lines flanking title -->
  <line x1="68" y1="174" x2="96" y2="174" stroke="#2a5490" stroke-width="0.7" opacity="0.7"/>
  <line x1="204" y1="174" x2="232" y2="174" stroke="#2a5490" stroke-width="0.7" opacity="0.7"/>

  <!-- Small diamond accents -->
  <polygon points="100,174 103,171.5 106,174 103,176.5" fill="#3a6fa8" opacity="0.6"/>
  <polygon points="194,174 197,171.5 200,174 197,176.5" fill="#3a6fa8" opacity="0.6"/>
</svg>` },
  { id: 75, title: "Synapse Spark", concept: "neuron connection electric spark", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#020408"/>
    </radialGradient>

    <!-- Left neuron body glow -->
    <radialGradient id="neuronLeftGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a6fd4" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#0d4a9e" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#071e3d" stop-opacity="0"/>
    </radialGradient>

    <!-- Right neuron body glow -->
    <radialGradient id="neuronRightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a6fd4" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#0d4a9e" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#071e3d" stop-opacity="0"/>
    </radialGradient>

    <!-- Electric spark gradient -->
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4dc8ff" stop-opacity="0.6"/>
      <stop offset="30%" stop-color="#00d4ff"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#4dc8ff" stop-opacity="0.6"/>
    </linearGradient>

    <!-- Spark halo blur -->
    <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Neuron body glow filter -->
    <filter id="neuronGlowFilter" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Dendrite glow filter -->
    <filter id="dendriteGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Core spark intense glow -->
    <filter id="coreGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur1"/>
      <feGaussianBlur stdDeviation="8" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4dc8ff"/>
      <stop offset="50%" stop-color="#a0e8ff"/>
      <stop offset="100%" stop-color="#4dc8ff"/>
    </linearGradient>

    <!-- Axon terminal button glow -->
    <radialGradient id="terminalGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="60%" stop-color="#0077bb"/>
      <stop offset="100%" stop-color="#003366" stop-opacity="0"/>
    </radialGradient>

    <!-- Myelin sheath pattern -->
    <linearGradient id="myelinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0d4a9e"/>
      <stop offset="50%" stop-color="#1a6fd4"/>
      <stop offset="100%" stop-color="#0d4a9e"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle grid lines (scientific illustration feel) -->
  <g opacity="0.04" stroke="#4dc8ff" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- ==================== LEFT NEURON ==================== -->
  <g id="neuron-left">
    <!-- Glow halo around soma -->
    <circle cx="72" cy="90" r="28" fill="url(#neuronLeftGlow)" opacity="0.6"/>

    <!-- Dendrites (left neuron) -->
    <g filter="url(#dendriteGlow)" stroke="#1a6fd4" fill="none">
      <!-- Upper dendrite branch -->
      <path d="M 58 75 Q 40 58 25 50" stroke-width="1.8" stroke="#1a6fd4" opacity="0.9"/>
      <path d="M 40 62 Q 30 52 20 42" stroke-width="1.2" stroke="#1a6fd4" opacity="0.7"/>
      <path d="M 25 50 Q 14 45 8 38" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>
      <path d="M 25 50 Q 18 55 12 58" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>

      <!-- Upper-right dendrite -->
      <path d="M 68 68 Q 62 48 55 35" stroke-width="1.5" stroke="#1a6fd4" opacity="0.8"/>
      <path d="M 55 35 Q 50 22 42 15" stroke-width="1.0" stroke="#1a6fd4" opacity="0.55"/>
      <path d="M 55 35 Q 62 26 65 18" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>

      <!-- Lower dendrite -->
      <path d="M 58 106 Q 42 118 28 128" stroke-width="1.8" stroke="#1a6fd4" opacity="0.85"/>
      <path d="M 28 128 Q 16 136 8 142" stroke-width="1.1" stroke="#1a6fd4" opacity="0.55"/>
      <path d="M 28 128 Q 22 140 18 152" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>
      <path d="M 42 118 Q 36 130 30 140" stroke-width="1.0" stroke="#1a6fd4" opacity="0.6"/>

      <!-- Lower-right dendrite -->
      <path d="M 68 110 Q 60 130 52 148" stroke-width="1.4" stroke="#1a6fd4" opacity="0.7"/>
      <path d="M 52 148 Q 48 160 44 170" stroke-width="0.9" stroke="#1a6fd4" opacity="0.45"/>
    </g>

    <!-- Dendrite tips (small dots) -->
    <g fill="#4dc8ff" opacity="0.7">
      <circle cx="8" cy="38" r="1.5"/>
      <circle cx="12" cy="58" r="1.5"/>
      <circle cx="20" cy="42" r="1.3"/>
      <circle cx="42" cy="15" r="1.5"/>
      <circle cx="65" cy="18" r="1.5"/>
      <circle cx="8" cy="142" r="1.5"/>
      <circle cx="18" cy="152" r="1.5"/>
      <circle cx="30" cy="140" r="1.3"/>
      <circle cx="44" cy="170" r="1.5"/>
    </g>

    <!-- Axon hillock (tapers into axon going right) -->
    <path d="M 88 86 Q 95 88 105 90 Q 112 91 118 90" stroke="#1a6fd4" stroke-width="2.2" fill="none" filter="url(#dendriteGlow)"/>

    <!-- Myelin sheath segments on axon -->
    <g opacity="0.85">
      <rect x="108" y="87" width="6" height="6" rx="3" fill="#0d4a9e" opacity="0.0"/>
    </g>

    <!-- Soma (cell body) -->
    <circle cx="72" cy="90" r="16" fill="#071e3d" stroke="#1a6fd4" stroke-width="1.5" filter="url(#neuronGlowFilter)"/>
    <!-- Nucleus -->
    <circle cx="72" cy="90" r="8" fill="#0a2a5e" stroke="#2a7fd4" stroke-width="1"/>
    <!-- Nucleolus -->
    <circle cx="72" cy="90" r="3.5" fill="#1a6fd4" opacity="0.8"/>

    <!-- Axon terminal bulb (pre-synaptic) -->
    <circle cx="125" cy="90" r="7" fill="url(#terminalGlow)" stroke="#00d4ff" stroke-width="1.2" filter="url(#neuronGlowFilter)" opacity="0.95"/>
    <circle cx="125" cy="90" r="3.5" fill="#00d4ff" opacity="0.6"/>

    <!-- Vesicle dots in terminal -->
    <circle cx="123" cy="88" r="1.2" fill="#4dc8ff" opacity="0.8"/>
    <circle cx="127" cy="91" r="1.0" fill="#4dc8ff" opacity="0.7"/>
    <circle cx="124" cy="93" r="1.1" fill="#4dc8ff" opacity="0.7"/>
  </g>

  <!-- ==================== RIGHT NEURON ==================== -->
  <g id="neuron-right">
    <!-- Glow halo around soma -->
    <circle cx="228" cy="90" r="28" fill="url(#neuronRightGlow)" opacity="0.6"/>

    <!-- Dendrites (right neuron — pointing right/outward) -->
    <g filter="url(#dendriteGlow)" stroke="#1a6fd4" fill="none">
      <!-- Upper dendrite -->
      <path d="M 242 75 Q 260 58 275 50" stroke-width="1.8" stroke="#1a6fd4" opacity="0.9"/>
      <path d="M 260 62 Q 270 52 280 42" stroke-width="1.2" stroke="#1a6fd4" opacity="0.7"/>
      <path d="M 275 50 Q 286 45 292 38" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>
      <path d="M 275 50 Q 282 55 288 58" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>

      <!-- Upper-left dendrite -->
      <path d="M 232 68 Q 238 48 245 35" stroke-width="1.5" stroke="#1a6fd4" opacity="0.8"/>
      <path d="M 245 35 Q 250 22 258 15" stroke-width="1.0" stroke="#1a6fd4" opacity="0.55"/>
      <path d="M 245 35 Q 238 26 235 18" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>

      <!-- Lower dendrite -->
      <path d="M 242 106 Q 258 118 272 128" stroke-width="1.8" stroke="#1a6fd4" opacity="0.85"/>
      <path d="M 272 128 Q 284 136 292 142" stroke-width="1.1" stroke="#1a6fd4" opacity="0.55"/>
      <path d="M 272 128 Q 278 140 282 152" stroke-width="0.9" stroke="#1a6fd4" opacity="0.5"/>
      <path d="M 258 118 Q 264 130 270 140" stroke-width="1.0" stroke="#1a6fd4" opacity="0.6"/>

      <!-- Lower-left dendrite -->
      <path d="M 232 110 Q 240 130 248 148" stroke-width="1.4" stroke="#1a6fd4" opacity="0.7"/>
      <path d="M 248 148 Q 252 160 256 170" stroke-width="0.9" stroke="#1a6fd4" opacity="0.45"/>
    </g>

    <!-- Dendrite tips -->
    <g fill="#4dc8ff" opacity="0.7">
      <circle cx="292" cy="38" r="1.5"/>
      <circle cx="288" cy="58" r="1.5"/>
      <circle cx="280" cy="42" r="1.3"/>
      <circle cx="258" cy="15" r="1.5"/>
      <circle cx="235" cy="18" r="1.5"/>
      <circle cx="292" cy="142" r="1.5"/>
      <circle cx="282" cy="152" r="1.5"/>
      <circle cx="270" cy="140" r="1.3"/>
      <circle cx="256" cy="170" r="1.5"/>
    </g>

    <!-- Axon going left toward synaptic gap -->
    <path d="M 212 86 Q 205 88 195 90 Q 188 91 182 90" stroke="#1a6fd4" stroke-width="2.2" fill="none" filter="url(#dendriteGlow)"/>

    <!-- Soma -->
    <circle cx="228" cy="90" r="16" fill="#071e3d" stroke="#1a6fd4" stroke-width="1.5" filter="url(#neuronGlowFilter)"/>
    <!-- Nucleus -->
    <circle cx="228" cy="90" r="8" fill="#0a2a5e" stroke="#2a7fd4" stroke-width="1"/>
    <!-- Nucleolus -->
    <circle cx="228" cy="90" r="3.5" fill="#1a6fd4" opacity="0.8"/>

    <!-- Axon terminal bulb (post-synaptic) -->
    <circle cx="175" cy="90" r="7" fill="url(#terminalGlow)" stroke="#00d4ff" stroke-width="1.2" filter="url(#neuronGlowFilter)" opacity="0.95"/>
    <circle cx="175" cy="90" r="3.5" fill="#00d4ff" opacity="0.6"/>

    <!-- Receptor dots -->
    <circle cx="173" cy="88" r="1.2" fill="#4dc8ff" opacity="0.8"/>
    <circle cx="177" cy="91" r="1.0" fill="#4dc8ff" opacity="0.7"/>
    <circle cx="174" cy="93" r="1.1" fill="#4dc8ff" opacity="0.7"/>
  </g>

  <!-- ==================== SYNAPTIC GAP + ELECTRIC SPARK ==================== -->
  <g id="synaptic-spark">

    <!-- Gap ambient glow (wide soft) -->
    <ellipse cx="150" cy="90" rx="30" ry="18" fill="#0044aa" opacity="0.18" filter="url(#coreGlow)"/>

    <!-- Outer spark halo 1 (widest, most diffuse) -->
    <path d="M 133 90 Q 138 82 142 88 Q 146 94 150 86 Q 154 78 158 84 Q 162 90 167 90"
          stroke="#003388" stroke-width="6" fill="none" opacity="0.25" filter="url(#coreGlow)"/>

    <!-- Outer spark halo 2 -->
    <path d="M 133 90 Q 138 82 142 88 Q 146 94 150 86 Q 154 78 158 84 Q 162 90 167 90"
          stroke="#0066cc" stroke-width="4" fill="none" opacity="0.4" filter="url(#sparkGlow)"/>

    <!-- Mid spark glow -->
    <path d="M 133 90 Q 138 82 142 88 Q 146 94 150 86 Q 154 78 158 84 Q 162 90 167 90"
          stroke="#00aaee" stroke-width="2.8" fill="none" opacity="0.7" filter="url(#sparkGlow)"/>

    <!-- Main spark body -->
    <path d="M 133 90 Q 138 82 142 88 Q 146 94 150 86 Q 154 78 158 84 Q 162 90 167 90"
          stroke="url(#sparkGrad)" stroke-width="1.8" fill="none" filter="url(#sparkGlow)"/>

    <!-- Bright core of spark (white-hot center) -->
    <path d="M 133 90 Q 138 82 142 88 Q 146 94 150 86 Q 154 78 158 84 Q 162 90 167 90"
          stroke="white" stroke-width="0.7" fill="none" opacity="0.9"/>

    <!-- Small arc branches off main spark -->
    <path d="M 142 88 Q 141 80 138 76" stroke="#00d4ff" stroke-width="0.9" fill="none" opacity="0.7" filter="url(#sparkGlow)"/>
    <path d="M 150 86 Q 152 78 154 74" stroke="#00d4ff" stroke-width="0.9" fill="none" opacity="0.65" filter="url(#sparkGlow)"/>
    <path d="M 146 92 Q 144 100 141 104" stroke="#00d4ff" stroke-width="0.8" fill="none" opacity="0.6" filter="url(#sparkGlow)"/>
    <path d="M 155 83 Q 157 92 158 98" stroke="#4dc8ff" stroke-width="0.8" fill="none" opacity="0.55" filter="url(#sparkGlow)"/>
    <path d="M 150 86 Q 148 96 146 102" stroke="#00d4ff" stroke-width="0.7" fill="none" opacity="0.5" filter="url(#sparkGlow)"/>

    <!-- Spark emission particles -->
    <g filter="url(#coreGlow)">
      <circle cx="138" cy="76" r="1.2" fill="#00d4ff" opacity="0.8"/>
      <circle cx="154" cy="74" r="1.0" fill="#4dc8ff" opacity="0.75"/>
      <circle cx="141" cy="104" r="1.1" fill="#00d4ff" opacity="0.7"/>
      <circle cx="158" cy="98" r="1.0" fill="#4dc8ff" opacity="0.65"/>
      <circle cx="146" cy="102" r="0.9" fill="#00d4ff" opacity="0.6"/>
    </g>

    <!-- Intense spark nodes (peak voltage points) -->
    <circle cx="142" cy="88" r="2.2" fill="white" opacity="0.9" filter="url(#coreGlow)"/>
    <circle cx="150" cy="86" r="2.5" fill="white" opacity="1" filter="url(#coreGlow)"/>
    <circle cx="158" cy="84" r="2.2" fill="white" opacity="0.9" filter="url(#coreGlow)"/>

    <!-- Synaptic cleft horizontal lines (scientific detail) -->
    <line x1="131" y1="85" x2="131" y2="95" stroke="#1a6fd4" stroke-width="0.6" opacity="0.5"/>
    <line x1="169" y1="85" x2="169" y2="95" stroke="#1a6fd4" stroke-width="0.6" opacity="0.5"/>
  </g>

  <!-- ==================== TYPOGRAPHY ==================== -->
  <g id="text-group">
    <!-- Main title -->
    <text x="150" y="148"
          font-family="'Courier New', Courier, monospace"
          font-size="14"
          font-weight="700"
          letter-spacing="2.5"
          text-anchor="middle"
          fill="url(#textGrad)"
          filter="url(#dendriteGlow)">AGENTIC LEAD GEN</text>

    <!-- Subtitle -->
    <text x="150" y="164"
          font-family="'Courier New', Courier, monospace"
          font-size="6.5"
          font-weight="400"
          letter-spacing="3.5"
          text-anchor="middle"
          fill="#4dc8ff"
          opacity="0.65">SYNAPSE · SPARK · CONNECTION</text>

    <!-- Decorative lines flanking title -->
    <line x1="18" y1="148" x2="52" y2="148" stroke="#1a6fd4" stroke-width="0.7" opacity="0.5"/>
    <line x1="248" y1="148" x2="282" y2="148" stroke="#1a6fd4" stroke-width="0.7" opacity="0.5"/>
    <circle cx="15" cy="148" r="1.5" fill="#1a6fd4" opacity="0.5"/>
    <circle cx="285" cy="148" r="1.5" fill="#1a6fd4" opacity="0.5"/>
  </g>

  <!-- ==================== BORDER (scientific frame) ==================== -->
  <rect x="2" y="2" width="296" height="196" rx="4" ry="4"
        fill="none" stroke="#1a3a6a" stroke-width="0.8" opacity="0.6"/>
  <rect x="5" y="5" width="290" height="190" rx="3" ry="3"
        fill="none" stroke="#0d2a4e" stroke-width="0.4" opacity="0.4"/>

  <!-- Corner accents -->
  <g stroke="#1a6fd4" stroke-width="1.2" fill="none" opacity="0.7">
    <path d="M 2 18 L 2 2 L 18 2"/>
    <path d="M 282 2 L 298 2 L 298 18"/>
    <path d="M 2 182 L 2 198 L 18 198"/>
    <path d="M 282 198 L 298 198 L 298 182"/>
  </g>
</svg>` },
  { id: 76, title: "Hourglass Filter", concept: "prospects filtered to golden leads", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark sand gradient for top half -->
    <linearGradient id="darkSandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2d1f0e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5c3d1e;stop-opacity:1" />
    </linearGradient>
    <!-- Gold gradient for bottom half -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#c8860a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5c842;stop-opacity:1" />
    </linearGradient>
    <!-- Golden glow radial for qualified leads -->
    <radialGradient id="glowGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffe066;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c8860a;stop-opacity:0.7" />
    </radialGradient>
    <!-- Hourglass glass gradient -->
    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a2a3a;stop-opacity:0.95" />
      <stop offset="50%" style="stop-color:#0d1b2a;stop-opacity:0.98" />
      <stop offset="100%" style="stop-color:#1a2a3a;stop-opacity:0.95" />
    </linearGradient>
    <!-- Frame gradient -->
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#8a6a2a" />
      <stop offset="50%" style="stop-color:#d4a843" />
      <stop offset="100%" style="stop-color:#8a6a2a" />
    </linearGradient>
    <!-- Background -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#080f18" />
      <stop offset="100%" style="stop-color:#0f1e2e" />
    </linearGradient>
    <!-- Sand fall glow -->
    <filter id="sandGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0.6 0 0 0  0.8 0.5 0 0 0  0 0 0 0 0  0 0 0 1.5 0" result="colored" />
      <feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Gold figure glow -->
    <filter id="goldFigureGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0.8 0 0 0.1  0.8 0.6 0 0 0.05  0 0 0 0 0  0 0 0 2 0" result="colored" />
      <feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- Subtle outer glow for hourglass -->
    <filter id="outerGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0.7 0 0 0.1  0.7 0.4 0 0 0.05  0 0 0 0 0  0 0 0 0.6 0" />
    </filter>
    <!-- Clip paths for hourglass halves -->
    <clipPath id="topHalfClip">
      <polygon points="88,22 212,22 162,100 138,100" />
    </clipPath>
    <clipPath id="bottomHalfClip">
      <polygon points="138,102 162,102 212,178 88,178" />
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8" />

  <!-- Subtle grid pattern -->
  <g opacity="0.04" stroke="#4a8fc1" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- Outer glow effect behind hourglass -->
  <polygon points="88,22 212,22 162,100 138,100 162,102 212,178 88,178 138,102 162,100 138,100"
    fill="none" stroke="#c8860a" stroke-width="1" opacity="0.15" filter="url(#outerGlow)" />

  <!-- ==================== HOURGLASS BODY ==================== -->

  <!-- Top half fill - dark sand -->
  <polygon points="90,24 210,24 161,99 139,99"
    fill="url(#darkSandGrad)" />

  <!-- Bottom half fill - gold -->
  <polygon points="139,103 161,103 210,177 90,177"
    fill="url(#goldGrad)" />

  <!-- ==================== DARK SAND FIGURES (top - prospects) ==================== -->
  <!-- Row 1 (top wide) - 7 small grey figures -->
  <g fill="#7a6040" opacity="0.85" clip-path="url(#topHalfClip)">
    <!-- figure: head circle + body triangle, scale ~5px -->
    <!-- Row 1 y~38 -->
    <circle cx="112" cy="37" r="3.5"/><rect x="109.5" y="41" width="5" height="7" rx="1.5"/>
    <circle cx="124" cy="37" r="3.5"/><rect x="121.5" y="41" width="5" height="7" rx="1.5"/>
    <circle cx="136" cy="37" r="3.5"/><rect x="133.5" y="41" width="5" height="7" rx="1.5"/>
    <circle cx="150" cy="37" r="3.5"/><rect x="147.5" y="41" width="5" height="7" rx="1.5"/>
    <circle cx="164" cy="37" r="3.5"/><rect x="161.5" y="41" width="5" height="7" rx="1.5"/>
    <circle cx="176" cy="37" r="3.5"/><rect x="173.5" y="41" width="5" height="7" rx="1.5"/>
    <circle cx="188" cy="37" r="3.5"/><rect x="185.5" y="41" width="5" height="7" rx="1.5"/>
    <!-- Row 2 y~53 - 6 figures -->
    <circle cx="118" cy="53" r="3.5"/><rect x="115.5" y="57" width="5" height="7" rx="1.5"/>
    <circle cx="130" cy="53" r="3.5"/><rect x="127.5" y="57" width="5" height="7" rx="1.5"/>
    <circle cx="142" cy="53" r="3.5"/><rect x="139.5" y="57" width="5" height="7" rx="1.5"/>
    <circle cx="154" cy="53" r="3.5"/><rect x="151.5" y="57" width="5" height="7" rx="1.5"/>
    <circle cx="166" cy="53" r="3.5"/><rect x="163.5" y="57" width="5" height="7" rx="1.5"/>
    <circle cx="178" cy="53" r="3.5"/><rect x="175.5" y="57" width="5" height="7" rx="1.5"/>
    <!-- Row 3 y~68 - 5 figures -->
    <circle cx="124" cy="68" r="3.5"/><rect x="121.5" y="72" width="5" height="7" rx="1.5"/>
    <circle cx="136" cy="68" r="3.5"/><rect x="133.5" y="72" width="5" height="7" rx="1.5"/>
    <circle cx="148" cy="68" r="3.5"/><rect x="145.5" y="72" width="5" height="7" rx="1.5"/>
    <circle cx="160" cy="68" r="3.5"/><rect x="157.5" y="72" width="5" height="7" rx="1.5"/>
    <circle cx="172" cy="68" r="3.5"/><rect x="169.5" y="72" width="5" height="7" rx="1.5"/>
    <!-- Row 4 y~83 - 3 figures narrowing -->
    <circle cx="136" cy="83" r="3.5"/><rect x="133.5" y="87" width="5" height="7" rx="1.5"/>
    <circle cx="150" cy="83" r="3.5"/><rect x="147.5" y="87" width="5" height="7" rx="1.5"/>
    <circle cx="164" cy="83" r="3.5"/><rect x="161.5" y="87" width="5" height="7" rx="1.5"/>
  </g>

  <!-- Sand flow particles at neck -->
  <g filter="url(#sandGlow)">
    <circle cx="150" cy="101" r="1.2" fill="#d4a843" opacity="0.9"/>
    <circle cx="148" cy="103.5" r="0.9" fill="#c8860a" opacity="0.8"/>
    <circle cx="152" cy="104" r="0.8" fill="#e8c060" opacity="0.7"/>
    <circle cx="149.5" cy="106" r="1" fill="#d4a843" opacity="0.85"/>
    <circle cx="151" cy="108" r="0.7" fill="#f5c842" opacity="0.6"/>
  </g>

  <!-- ==================== GOLD FIGURES (bottom - qualified leads) ==================== -->
  <!-- 3 golden glowing figures, larger, well-spaced -->
  <g filter="url(#goldFigureGlow)">
    <!-- Lead 1 - left -->
    <circle cx="122" cy="143" r="6" fill="#ffe066"/>
    <rect x="117" y="151" width="10" height="14" rx="3" fill="#f5c842"/>
    <!-- Gold star accent -->
    <polygon points="122,134 123.5,138.5 128,138.5 124.5,141 126,145.5 122,142.5 118,145.5 119.5,141 116,138.5 120.5,138.5"
      fill="#ffe066" opacity="0.7" transform="scale(0.5) translate(122,140)"/>

    <!-- Lead 2 - center -->
    <circle cx="150" cy="138" r="7" fill="#ffe880"/>
    <rect x="144.5" y="147" width="11" height="15" rx="3" fill="#f5c842"/>
    <!-- Larger star for center -->
    <polygon points="150,126 152,132 158,132 153,136 155,142 150,138 145,142 147,136 142,132 148,132"
      fill="#ffe066" opacity="0.6"/>

    <!-- Lead 3 - right -->
    <circle cx="178" cy="143" r="6" fill="#ffe066"/>
    <rect x="173" y="151" width="10" height="14" rx="3" fill="#f5c842"/>
  </g>

  <!-- ==================== HOURGLASS FRAME ==================== -->
  <!-- Top bar -->
  <rect x="86" y="19" width="128" height="7" rx="3.5" fill="url(#frameGrad)" />
  <!-- Bottom bar -->
  <rect x="86" y="174" width="128" height="7" rx="3.5" fill="url(#frameGrad)" />

  <!-- Left side of top half -->
  <line x1="90" y1="24" x2="140" y2="100" stroke="url(#frameGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Right side of top half -->
  <line x1="210" y1="24" x2="160" y2="100" stroke="url(#frameGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Left side of bottom half -->
  <line x1="140" y1="102" x2="90" y2="177" stroke="url(#frameGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Right side of bottom half -->
  <line x1="160" y1="102" x2="210" y2="177" stroke="url(#frameGrad)" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Neck highlight -->
  <rect x="138" y="98" width="24" height="6" rx="3" fill="#c8860a" opacity="0.6"/>
  <rect x="140" y="99" width="20" height="4" rx="2" fill="#ffe066" opacity="0.3"/>

  <!-- Frame corner dots -->
  <circle cx="86" cy="22" r="3" fill="#d4a843"/>
  <circle cx="214" cy="22" r="3" fill="#d4a843"/>
  <circle cx="86" cy="178" r="3" fill="#d4a843"/>
  <circle cx="214" cy="178" r="3" fill="#d4a843"/>

  <!-- ==================== TEXT ==================== -->
  <!-- Main title -->
  <text x="150" y="197" text-anchor="middle"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="10" font-weight="700" letter-spacing="2.5"
    fill="#d4a843" opacity="0.95">AGENTIC LEAD GEN</text>

  <!-- Subtitle top label -->
  <text x="150" y="14" text-anchor="middle"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-size="6.5" font-weight="500" letter-spacing="1.5"
    fill="#5c8fa8" opacity="0.8">TIME TO VALUE</text>

</svg>` },
  { id: 77, title: "Gem Facets", concept: "multi-faceted ruby/diamond gem", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark velvet background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1a0a1e"/>
      <stop offset="100%" stop-color="#080510"/>
    </radialGradient>

    <!-- Gem facet gradients -->
    <linearGradient id="facetTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#ffd6e0" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#e8005a" stop-opacity="0.85"/>
    </linearGradient>

    <linearGradient id="facetUpperLeft" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff6b9d"/>
      <stop offset="100%" stop-color="#c0003a"/>
    </linearGradient>

    <linearGradient id="facetUpperRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffb3cc"/>
      <stop offset="100%" stop-color="#e8005a"/>
    </linearGradient>

    <linearGradient id="facetLowerLeft" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8b0030"/>
      <stop offset="100%" stop-color="#3d0015"/>
    </linearGradient>

    <linearGradient id="facetLowerRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#cc0047"/>
      <stop offset="100%" stop-color="#5a001f"/>
    </linearGradient>

    <linearGradient id="facetBottomLeft" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6b0025"/>
      <stop offset="100%" stop-color="#200010"/>
    </linearGradient>

    <linearGradient id="facetBottomRight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a0003a"/>
      <stop offset="100%" stop-color="#300018"/>
    </linearGradient>

    <linearGradient id="facetMidLeft" x1="100%" y1="50%" x2="0%" y2="50%">
      <stop offset="0%" stop-color="#ff4d88"/>
      <stop offset="100%" stop-color="#9a0035"/>
    </linearGradient>

    <linearGradient id="facetMidRight" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#ff7aaa"/>
      <stop offset="100%" stop-color="#bf0048"/>
    </linearGradient>

    <!-- Glow filter -->
    <filter id="gemGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feColorMatrix type="matrix"
        values="1 0 0 0 0.8
                0 0 0 0 0
                0 0 0 0 0.2
                0 0 0 0.6 0" in="blur" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle outer glow -->
    <filter id="outerGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feColorMatrix type="matrix"
        values="1 0 0 0 0.7
                0 0 0 0 0
                0 0 0 0 0.15
                0 0 0 0.4 0" in="blur" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Text glow -->
    <filter id="textGlow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Shine highlight -->
    <radialGradient id="shineTop" cx="40%" cy="30%" r="35%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle velvet texture dots -->
  <circle cx="20" cy="15" r="0.5" fill="#2a1030" opacity="0.6"/>
  <circle cx="280" cy="185" r="0.5" fill="#2a1030" opacity="0.6"/>
  <circle cx="15" cy="185" r="0.5" fill="#2a1030" opacity="0.6"/>
  <circle cx="285" cy="15" r="0.5" fill="#2a1030" opacity="0.6"/>

  <!-- Gem group centered at ~105, 90 -->
  <g transform="translate(105, 90)" filter="url(#outerGlow)">

    <!-- GEM: Classic brilliant cut ruby/diamond shape -->
    <!-- Crown (top half) — table + upper girdle facets -->
    <!-- Table facet (top octagon center) -->
    <polygon points="0,-44 18,-28 18,0 0,8 -18,0 -18,-28"
             fill="url(#facetTop)" filter="url(#gemGlow)"/>

    <!-- Upper left bezel facet -->
    <polygon points="-18,-28 0,-44 -30,-44 -38,-20"
             fill="url(#facetUpperLeft)"/>

    <!-- Upper right bezel facet -->
    <polygon points="0,-44 18,-28 38,-20 30,-44"
             fill="url(#facetUpperRight)"/>

    <!-- Left upper girdle facet -->
    <polygon points="-38,-20 -18,-28 -18,0 -40,0"
             fill="url(#facetMidLeft)"/>

    <!-- Right upper girdle facet -->
    <polygon points="18,-28 38,-20 40,0 18,0"
             fill="url(#facetMidRight)"/>

    <!-- Girdle line -->
    <polygon points="-40,0 -18,0 0,8 18,0 40,0 30,12 0,18 -30,12"
             fill="url(#facetLowerLeft)" opacity="0.6"/>

    <!-- Pavilion (bottom half) — lower facets pointing to culet -->
    <!-- Lower left main facet -->
    <polygon points="-40,0 -30,12 0,50 0,18"
             fill="url(#facetLowerLeft)"/>

    <!-- Lower right main facet -->
    <polygon points="40,0 30,12 0,50 0,18"
             fill="url(#facetLowerRight)"/>

    <!-- Bottom left secondary facet -->
    <polygon points="-30,12 0,18 0,50"
             fill="url(#facetBottomLeft)"/>

    <!-- Bottom right secondary facet -->
    <polygon points="30,12 0,18 0,50"
             fill="url(#facetBottomRight)"/>

    <!-- Extra left facet for richness -->
    <polygon points="-40,0 -18,0 -30,12"
             fill="url(#facetMidLeft)" opacity="0.8"/>

    <!-- Extra right facet for richness -->
    <polygon points="40,0 18,0 30,12"
             fill="url(#facetMidRight)" opacity="0.8"/>

    <!-- Shine highlight on table -->
    <ellipse cx="-4" cy="-22" rx="10" ry="7" fill="url(#shineTop)" transform="rotate(-15)"/>

    <!-- Small star highlight -->
    <circle cx="-8" cy="-32" r="2.5" fill="#ffffff" opacity="0.95"/>
    <circle cx="-8" cy="-32" r="1.2" fill="#ffffff" opacity="1"/>

    <!-- Outline strokes for facet definition -->
    <polygon points="0,-44 18,-28 18,0 0,8 -18,0 -18,-28"
             fill="none" stroke="#ff4d88" stroke-width="0.4" stroke-opacity="0.5"/>
    <line x1="0" y1="-44" x2="-30" y2="-44" stroke="#cc0047" stroke-width="0.3" stroke-opacity="0.4"/>
    <line x1="0" y1="-44" x2="30" y2="-44" stroke="#cc0047" stroke-width="0.3" stroke-opacity="0.4"/>
    <line x1="-38" y1="-20" x2="-40" y2="0" stroke="#880030" stroke-width="0.3" stroke-opacity="0.4"/>
    <line x1="38" y1="-20" x2="40" y2="0" stroke="#880030" stroke-width="0.3" stroke-opacity="0.4"/>
    <line x1="-40" y1="0" x2="-30" y2="12" stroke="#660025" stroke-width="0.3" stroke-opacity="0.4"/>
    <line x1="40" y1="0" x2="30" y2="12" stroke="#660025" stroke-width="0.3" stroke-opacity="0.4"/>
    <line x1="-30" y1="12" x2="0" y2="50" stroke="#440018" stroke-width="0.4" stroke-opacity="0.5"/>
    <line x1="30" y1="12" x2="0" y2="50" stroke="#440018" stroke-width="0.4" stroke-opacity="0.5"/>

    <!-- Culet point highlight -->
    <circle cx="0" cy="50" r="1.5" fill="#ff8ab0" opacity="0.8"/>
  </g>

  <!-- Text: AGENTIC LEAD GEN -->
  <text x="185" y="68"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="11"
        font-weight="400"
        letter-spacing="3.5"
        fill="#cc4477"
        text-anchor="middle"
        filter="url(#textGlow)">AGENTIC</text>

  <text x="185" y="96"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="22"
        font-weight="700"
        letter-spacing="1.5"
        fill="#f0f0f0"
        text-anchor="middle"
        filter="url(#textGlow)">LEAD GEN</text>

  <!-- Thin decorative rule under main text -->
  <line x1="148" y1="104" x2="222" y2="104"
        stroke="#880033" stroke-width="0.7" stroke-opacity="0.8"/>
  <line x1="154" y1="107" x2="216" y2="107"
        stroke="#cc0047" stroke-width="0.3" stroke-opacity="0.5"/>

  <!-- Tagline -->
  <text x="185" y="120"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="7"
        font-weight="300"
        letter-spacing="2.8"
        fill="#886688"
        text-anchor="middle">HIGH-VALUE INTELLIGENCE</text>

  <!-- Bottom decorative gem-dots -->
  <circle cx="148" cy="133" r="1.5" fill="#cc0047" opacity="0.7"/>
  <circle cx="154" cy="133" r="1" fill="#ff6699" opacity="0.5"/>
  <circle cx="216" cy="133" r="1.5" fill="#cc0047" opacity="0.7"/>
  <circle cx="222" cy="133" r="1" fill="#ff6699" opacity="0.5"/>

  <!-- Corner micro-ornaments -->
  <g opacity="0.3" fill="none" stroke="#660033" stroke-width="0.5">
    <path d="M 12 12 L 22 12 L 22 22"/>
    <path d="M 288 12 L 278 12 L 278 22"/>
    <path d="M 12 188 L 22 188 L 22 178"/>
    <path d="M 288 188 L 278 188 L 278 178"/>
  </g>
</svg>` },
  { id: 78, title: "Envelope Spark", concept: "open envelope with energy sparks", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D9488;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0F766E;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="flapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#14B8A6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0D9488;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="sparkGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FBBF24;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F97316;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="sparkGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FCD34D;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FB923C;stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0D948840" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Envelope body -->
  <g filter="url(#softShadow)">
    <rect x="48" y="72" width="148" height="96" rx="6" ry="6" fill="url(#envelopeGrad)"/>
  </g>

  <!-- Envelope inner lighter area -->
  <rect x="54" y="78" width="136" height="84" rx="4" ry="4" fill="#0F766E" opacity="0.4"/>

  <!-- Envelope open flap (rotated open upward) -->
  <path d="M48 72 L122 118 L196 72" fill="none" stroke="#CCFBF1" stroke-width="1.5" stroke-opacity="0.4"/>

  <!-- Open flap triangle pointing up-left -->
  <path d="M48 72 L122 115 L196 72 L196 65 Q190 58 184 58 L60 58 Q54 58 48 65 Z" fill="url(#flapGrad)" opacity="0.92"/>

  <!-- Flap fold highlight -->
  <path d="M48 72 L122 115 L196 72" fill="none" stroke="#CCFBF1" stroke-width="1.8" stroke-opacity="0.6"/>

  <!-- Bottom envelope fold lines -->
  <path d="M48 168 L104 124" stroke="#CCFBF1" stroke-width="1.2" stroke-opacity="0.3"/>
  <path d="M196 168 L140 124" stroke="#CCFBF1" stroke-width="1.2" stroke-opacity="0.3"/>

  <!-- Lightning bolt 1 — large, center-right, rising from envelope -->
  <g filter="url(#glow)">
    <polygon points="152,30 143,54 151,54 140,82 159,52 150,52" fill="url(#sparkGrad1)"/>
  </g>

  <!-- Lightning bolt 2 — medium, left, angled -->
  <g filter="url(#glow)">
    <polygon points="108,22 100,43 107,43 98,64 114,40 107,40" fill="url(#sparkGrad2)" opacity="0.9"/>
  </g>

  <!-- Lightning bolt 3 — small, far right -->
  <g filter="url(#glow)">
    <polygon points="182,36 175,53 181,53 174,68 187,50 181,50" fill="url(#sparkGrad1)" opacity="0.8"/>
  </g>

  <!-- Sparkle dots scattered around bolts -->
  <g filter="url(#glow)" fill="#FCD34D">
    <circle cx="130" cy="18" r="3" opacity="0.9"/>
    <circle cx="170" cy="20" r="2" opacity="0.8"/>
    <circle cx="93"  cy="30" r="2.5" opacity="0.85"/>
    <circle cx="196" cy="28" r="1.8" opacity="0.75"/>
    <circle cx="160" cy="14" r="1.5" opacity="0.7"/>
    <circle cx="118" cy="10" r="1.8" opacity="0.65"/>
  </g>

  <!-- Small star burst top center -->
  <g filter="url(#glow)" transform="translate(148,8)">
    <line x1="0" y1="-5" x2="0" y2="5" stroke="#FCD34D" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="-5" y1="0" x2="5" y2="0" stroke="#FCD34D" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#FCD34D" stroke-width="1" stroke-linecap="round"/>
    <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#FCD34D" stroke-width="1" stroke-linecap="round"/>
  </g>

  <!-- Brand label -->
  <text x="150" y="186" font-family="'Helvetica Neue', Arial, sans-serif" font-size="11.5" font-weight="700" fill="#0D9488" letter-spacing="2.5" text-anchor="middle" dominant-baseline="auto">AGENTIC LEAD GEN</text>

  <!-- Subtle bottom accent line -->
  <line x1="80" y1="191" x2="220" y2="191" stroke="#0D9488" stroke-width="1" stroke-opacity="0.3"/>
</svg>` },
  { id: 79, title: "Waterfall Cascade", concept: "multi-tier pipeline waterfall", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Main waterfall gradient: blue to teal -->
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1a78c2"/>
      <stop offset="40%" stop-color="#0ea5c8"/>
      <stop offset="100%" stop-color="#0ecbb8"/>
    </linearGradient>
    <!-- Tier platform gradient -->
    <linearGradient id="tierGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#162d4a"/>
    </linearGradient>
    <!-- Falling water column gradient -->
    <linearGradient id="fallGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1a78c2" stop-opacity="0.3"/>
      <stop offset="40%" stop-color="#2196f3" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#1a78c2" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="fallGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0ea5c8" stop-opacity="0.3"/>
      <stop offset="40%" stop-color="#00bcd4" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0ea5c8" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="fallGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0ecbb8" stop-opacity="0.3"/>
      <stop offset="40%" stop-color="#26c6da" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0ecbb8" stop-opacity="0.3"/>
    </linearGradient>
    <!-- Pool glow gradient -->
    <radialGradient id="poolGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#0ecbb8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0a8fa0" stop-opacity="0.2"/>
    </radialGradient>
    <!-- Mist/spray blur filter -->
    <filter id="mist" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Water shimmer -->
    <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#0b1e35"/>

  <!-- Subtle background glow behind waterfall -->
  <ellipse cx="148" cy="110" rx="70" ry="90" fill="#1a4a7a" fill-opacity="0.18"/>

  <!-- ═══════════════════════════════════════════
       TIER 1 — CRAWL  (top, widest, x=50..250, y=28)
       ═══════════════════════════════════════════ -->
  <!-- Tier 1 platform rock/ledge -->
  <rect x="50" y="28" width="200" height="14" rx="3" fill="url(#tierGrad)"/>
  <rect x="50" y="28" width="200" height="4" rx="2" fill="#2a5a8a" fill-opacity="0.5"/>
  <!-- Water pool on tier 1 -->
  <rect x="52" y="32" width="196" height="10" rx="2" fill="url(#waterGrad)" opacity="0.85"/>
  <!-- Shimmer on tier 1 water -->
  <rect x="52" y="33" width="196" height="4" rx="1" fill="url(#shimmer)" opacity="0.6"/>

  <!-- CRAWL label badge -->
  <rect x="80" y="14" width="46" height="13" rx="6" fill="#1a78c2" fill-opacity="0.85"/>
  <text x="103" y="24" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="7" font-weight="600" fill="#e0f4ff" text-anchor="middle" letter-spacing="0.8">CRAWL</text>

  <!-- Waterfall fall 1: Tier1 → Tier2 -->
  <!-- Left column -->
  <rect x="88" y="42" width="12" height="26" rx="2" fill="url(#fallGrad1)" filter="url(#mist)"/>
  <!-- Center column (main flow) -->
  <rect x="141" y="42" width="18" height="26" rx="2" fill="url(#fallGrad1)"/>
  <!-- Right column -->
  <rect x="200" y="42" width="12" height="26" rx="2" fill="url(#fallGrad1)" filter="url(#mist)"/>
  <!-- Spray particles tier1→2 -->
  <circle cx="83" cy="55" r="1.2" fill="#7ddcf0" fill-opacity="0.5"/>
  <circle cx="79" cy="60" r="0.8" fill="#7ddcf0" fill-opacity="0.4"/>
  <circle cx="218" cy="52" r="1" fill="#7ddcf0" fill-opacity="0.5"/>
  <circle cx="222" cy="58" r="0.8" fill="#7ddcf0" fill-opacity="0.35"/>
  <circle cx="155" cy="48" r="1" fill="#a8eeff" fill-opacity="0.4"/>

  <!-- ═══════════════════════════════════════════
       TIER 2 — ENRICH  (x=68..232, y=68)
       ═══════════════════════════════════════════ -->
  <rect x="68" y="68" width="164" height="14" rx="3" fill="url(#tierGrad)"/>
  <rect x="68" y="68" width="164" height="4" rx="2" fill="#2a6080" fill-opacity="0.5"/>
  <!-- Water pool on tier 2 -->
  <rect x="70" y="72" width="160" height="10" rx="2" fill="url(#waterGrad)" opacity="0.82"/>
  <rect x="70" y="73" width="160" height="4" rx="1" fill="url(#shimmer)" opacity="0.55"/>

  <!-- ENRICH label badge -->
  <rect x="78" y="54" width="48" height="13" rx="6" fill="#0a8db5" fill-opacity="0.85"/>
  <text x="102" y="64" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="7" font-weight="600" fill="#e0f9ff" text-anchor="middle" letter-spacing="0.8">ENRICH</text>

  <!-- Waterfall fall 2: Tier2 → Tier3 -->
  <rect x="100" y="82" width="11" height="26" rx="2" fill="url(#fallGrad2)" filter="url(#mist)"/>
  <rect x="144" y="82" width="16" height="26" rx="2" fill="url(#fallGrad2)"/>
  <rect x="189" y="82" width="11" height="26" rx="2" fill="url(#fallGrad2)" filter="url(#mist)"/>
  <!-- Spray particles -->
  <circle cx="96" cy="94" r="1.1" fill="#5de0e6" fill-opacity="0.5"/>
  <circle cx="93" cy="100" r="0.8" fill="#5de0e6" fill-opacity="0.4"/>
  <circle cx="204" cy="90" r="1" fill="#5de0e6" fill-opacity="0.45"/>
  <circle cx="207" cy="96" r="0.7" fill="#5de0e6" fill-opacity="0.35"/>

  <!-- ═══════════════════════════════════════════
       TIER 3 — QUALIFY  (x=86..214, y=108)
       ═══════════════════════════════════════════ -->
  <rect x="86" y="108" width="128" height="14" rx="3" fill="url(#tierGrad)"/>
  <rect x="86" y="108" width="128" height="4" rx="2" fill="#1a6070" fill-opacity="0.5"/>
  <!-- Water pool on tier 3 -->
  <rect x="88" y="112" width="124" height="10" rx="2" fill="url(#waterGrad)" opacity="0.78"/>
  <rect x="88" y="113" width="124" height="4" rx="1" fill="url(#shimmer)" opacity="0.5"/>

  <!-- QUALIFY label badge -->
  <rect x="78" y="94" width="50" height="13" rx="6" fill="#087a8a" fill-opacity="0.85"/>
  <text x="103" y="104" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="7" font-weight="600" fill="#d0fff8" text-anchor="middle" letter-spacing="0.8">QUALIFY</text>

  <!-- Waterfall fall 3: Tier3 → Basin -->
  <rect x="114" y="122" width="10" height="22" rx="2" fill="url(#fallGrad3)" filter="url(#mist)"/>
  <rect x="145" y="122" width="14" height="22" rx="2" fill="url(#fallGrad3)"/>
  <rect x="175" y="122" width="10" height="22" rx="2" fill="url(#fallGrad3)" filter="url(#mist)"/>
  <!-- Spray particles -->
  <circle cx="110" cy="132" r="1" fill="#3de8d0" fill-opacity="0.5"/>
  <circle cx="107" cy="137" r="0.7" fill="#3de8d0" fill-opacity="0.4"/>
  <circle cx="189" cy="130" r="0.9" fill="#3de8d0" fill-opacity="0.45"/>
  <circle cx="192" cy="136" r="0.7" fill="#3de8d0" fill-opacity="0.35"/>

  <!-- ═══════════════════════════════════════════
       TIER 4 — OUTREACH  (base basin, x=104..196, y=144)
       ═══════════════════════════════════════════ -->
  <!-- Basin walls -->
  <rect x="104" y="144" width="92" height="16" rx="3" fill="url(#tierGrad)"/>
  <rect x="104" y="144" width="92" height="5" rx="2" fill="#106070" fill-opacity="0.5"/>
  <!-- Basin water with glow -->
  <rect x="106" y="148" width="88" height="12" rx="2" fill="url(#poolGrad)"/>
  <rect x="106" y="148" width="88" height="12" rx="2" fill="url(#waterGrad)" opacity="0.7"/>
  <rect x="106" y="149" width="88" height="5" rx="1" fill="url(#shimmer)" opacity="0.5"/>
  <!-- Ripple rings in basin -->
  <ellipse cx="150" cy="154" rx="18" ry="4" fill="none" stroke="#0ecbb8" stroke-width="0.8" stroke-opacity="0.5"/>
  <ellipse cx="150" cy="154" rx="30" ry="5.5" fill="none" stroke="#0ecbb8" stroke-width="0.5" stroke-opacity="0.3"/>
  <ellipse cx="150" cy="154" rx="40" ry="7" fill="none" stroke="#0ecbb8" stroke-width="0.4" stroke-opacity="0.15"/>

  <!-- OUTREACH label badge -->
  <rect x="94" y="130" width="58" height="13" rx="6" fill="#06656e" fill-opacity="0.9"/>
  <text x="123" y="140" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="7" font-weight="600" fill="#c0fff6" text-anchor="middle" letter-spacing="0.8">OUTREACH</text>

  <!-- Connecting mist/flow dots along left edge -->
  <circle cx="86" cy="47" r="0.9" fill="#5bc8f5" fill-opacity="0.45"/>
  <circle cx="82" cy="65" r="0.7" fill="#5bc8f5" fill-opacity="0.3"/>
  <circle cx="98" cy="88" r="0.8" fill="#3de0e0" fill-opacity="0.4"/>
  <circle cx="95" cy="105" r="0.6" fill="#3de0e0" fill-opacity="0.3"/>
  <circle cx="112" cy="126" r="0.7" fill="#2de8cc" fill-opacity="0.4"/>

  <!-- ═══════════════════════════════════════════
       BRAND TEXT
       ═══════════════════════════════════════════ -->
  <!-- Brand name -->
  <text x="150" y="177" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" fill="url(#waterGrad)" text-anchor="middle" letter-spacing="0.5">Agentic Lead Gen</text>
  <!-- Tagline -->
  <text x="150" y="191" font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="6.5" font-weight="400" fill="#5ab8d4" text-anchor="middle" letter-spacing="1.5" opacity="0.8">WATERFALL PIPELINE</text>

  <!-- Subtle corner accent lines -->
  <line x1="18" y1="12" x2="18" y2="28" stroke="#1a78c2" stroke-width="1" stroke-opacity="0.4"/>
  <line x1="12" y1="18" x2="28" y2="18" stroke="#1a78c2" stroke-width="1" stroke-opacity="0.4"/>
  <line x1="282" y1="172" x2="282" y2="188" stroke="#0ecbb8" stroke-width="1" stroke-opacity="0.4"/>
  <line x1="276" y1="182" x2="292" y2="182" stroke="#0ecbb8" stroke-width="1" stroke-opacity="0.4"/>
</svg>` },
  { id: 80, title: "Fox Hunter", concept: "geometric low-poly fox head", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <!-- White background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Fox head - geometric low-poly triangular style -->
  <!-- Ear left outer -->
  <polygon points="85,30 105,75 65,70" fill="#E8520A"/>
  <!-- Ear left inner -->
  <polygon points="88,38 103,70 72,67" fill="#F5A623"/>
  <!-- Ear right outer -->
  <polygon points="215,30 195,75 235,70" fill="#E8520A"/>
  <!-- Ear right inner -->
  <polygon points="212,38 197,70 228,67" fill="#F5A623"/>

  <!-- Main head polygon sections -->
  <!-- Top center facet -->
  <polygon points="150,45 105,75 195,75" fill="#F07820"/>
  <!-- Upper left facet -->
  <polygon points="105,75 85,100 130,105" fill="#E8520A"/>
  <!-- Upper right facet -->
  <polygon points="195,75 215,100 170,105" fill="#D94A08"/>
  <!-- Upper center facet -->
  <polygon points="105,75 195,75 170,105 130,105" fill="#F5A623"/>

  <!-- Mid left dark facet -->
  <polygon points="85,100 100,130 130,105" fill="#C84200"/>
  <!-- Mid right dark facet -->
  <polygon points="215,100 200,130 170,105" fill="#B83A00"/>
  <!-- Mid center light facet -->
  <polygon points="130,105 170,105 155,130 145,130" fill="#FBBE6E"/>

  <!-- Left cheek facet -->
  <polygon points="100,130 115,155 140,135" fill="#E8520A"/>
  <!-- Right cheek facet -->
  <polygon points="200,130 185,155 160,135" fill="#D94A08"/>
  <!-- Center chin facet -->
  <polygon points="140,135 160,135 150,158" fill="#F5A623"/>

  <!-- White muzzle area -->
  <!-- Muzzle left -->
  <polygon points="115,120 140,135 125,148" fill="#F5E6D0"/>
  <!-- Muzzle right -->
  <polygon points="185,120 160,135 175,148" fill="#EDD8BC"/>
  <!-- Muzzle center -->
  <polygon points="125,148 175,148 150,158" fill="#F5E6D0"/>
  <!-- Muzzle upper center -->
  <polygon points="140,135 160,135 150,122" fill="#FFF0DC"/>

  <!-- Nose -->
  <polygon points="143,112 157,112 150,120" fill="#2C1810"/>

  <!-- Left eye area -->
  <polygon points="108,82 122,78 120,95 106,92" fill="#1A0A00"/>
  <!-- Left eye shine -->
  <polygon points="110,83 118,81 116,88" fill="#F5A623"/>
  <!-- Left eye highlight -->
  <circle cx="115" cy="87" r="2.5" fill="#ffffff"/>

  <!-- Right eye area -->
  <polygon points="192,82 178,78 180,95 194,92" fill="#1A0A00"/>
  <!-- Right eye shine -->
  <polygon points="190,83 182,81 184,88" fill="#F5A623"/>
  <!-- Right eye highlight -->
  <circle cx="185" cy="87" r="2.5" fill="#ffffff"/>

  <!-- Forehead facet center -->
  <polygon points="130,60 150,45 170,60 150,72" fill="#FBBE6E"/>

  <!-- Text label -->
  <text x="150" y="182" font-family="'Arial', 'Helvetica', sans-serif" font-size="11" font-weight="700" fill="#E8520A" text-anchor="middle" letter-spacing="2">AGENTIC LEAD GEN</text>
</svg>` },
  { id: 81, title: "Owl Wisdom", concept: "geometric owl with data chart eyes", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0e1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1530;stop-opacity:1" />
    </linearGradient>

    <!-- Golden glow for eyes -->
    <radialGradient id="eyeGlowLeft" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#ffaa00;stop-opacity:0.9" />
      <stop offset="70%" style="stop-color:#ff8c00;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#ff6600;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="eyeGlowRight" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#ffaa00;stop-opacity:0.9" />
      <stop offset="70%" style="stop-color:#ff8c00;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#ff6600;stop-opacity:0" />
    </radialGradient>

    <!-- Eye inner gradient (dark iris) -->
    <radialGradient id="eyeInner" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#0a0e1a;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#0d1a3a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#112244;stop-opacity:1" />
    </radialGradient>

    <!-- Pupil gradient -->
    <radialGradient id="pupilGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#000510;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#020a20;stop-opacity:1" />
    </radialGradient>

    <!-- Feather body gradient -->
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a2744" />
      <stop offset="50%" style="stop-color:#0f1a30" />
      <stop offset="100%" style="stop-color:#0a1020" />
    </linearGradient>
    <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#162238" />
      <stop offset="100%" style="stop-color:#08101e" />
    </linearGradient>

    <!-- Glow filter for eyes -->
    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="subtleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8" />

  <!-- ===================== OWL BODY — geometric low-poly ===================== -->

  <!-- Tail / bottom base -->
  <polygon points="150,170 118,158 182,158" fill="#0c1525" />
  <polygon points="150,170 118,158 130,172" fill="#0e1a2e" />
  <polygon points="150,170 182,158 168,172" fill="#0e1a2e" />

  <!-- Lower body polygon cluster -->
  <polygon points="118,158 100,140 138,148" fill="#111e35" />
  <polygon points="182,158 200,140 162,148" fill="#111e35" />
  <polygon points="118,158 138,148 150,158" fill="#162140" />
  <polygon points="182,158 162,148 150,158" fill="#162140" />
  <polygon points="138,148 162,148 150,158" fill="#1a2848" />

  <!-- Mid body -->
  <polygon points="100,140 110,118 138,148" fill="#0f1c33" />
  <polygon points="200,140 190,118 162,148" fill="#0f1c33" />
  <polygon points="110,118 138,148 130,120" fill="#162444" />
  <polygon points="190,118 162,148 170,120" fill="#162444" />
  <polygon points="130,120 138,148 150,125" fill="#1d2f55" />
  <polygon points="170,120 162,148 150,125" fill="#1d2f55" />
  <polygon points="138,148 162,148 150,125" fill="#203560" />

  <!-- Left wing -->
  <polygon points="100,140 78,130 95,108" fill="url(#wingGrad)" />
  <polygon points="78,130 60,120 80,108" fill="#0d1828" />
  <polygon points="95,108 78,130 80,108" fill="#10203a" />
  <polygon points="60,120 80,108 68,95" fill="#0b1523" />
  <polygon points="80,108 95,108 82,92" fill="#0e1e34" />
  <polygon points="82,92 80,108 68,95" fill="#0c1828" />
  <!-- Wing tip feathers -->
  <polygon points="60,120 50,115 62,108" fill="#0a1420" />
  <polygon points="68,95 60,88 72,85" fill="#0a1420" />

  <!-- Right wing -->
  <polygon points="200,140 222,130 205,108" fill="url(#wingGrad)" />
  <polygon points="222,130 240,120 220,108" fill="#0d1828" />
  <polygon points="205,108 222,130 220,108" fill="#10203a" />
  <polygon points="240,120 220,108 232,95" fill="#0b1523" />
  <polygon points="220,108 205,108 218,92" fill="#0e1e34" />
  <polygon points="218,92 220,108 232,95" fill="#0c1828" />
  <!-- Wing tip feathers -->
  <polygon points="240,120 250,115 238,108" fill="#0a1420" />
  <polygon points="232,95 240,88 228,85" fill="#0a1420" />

  <!-- Upper body / chest -->
  <polygon points="110,118 130,120 118,100" fill="#1a2c50" />
  <polygon points="190,118 170,120 182,100" fill="#1a2c50" />
  <polygon points="118,100 130,120 150,110" fill="#1e3360" />
  <polygon points="182,100 170,120 150,110" fill="#1e3360" />
  <polygon points="130,120 170,120 150,110" fill="#243a6e" />

  <!-- Shoulders / upper -->
  <polygon points="110,118 95,108 112,95" fill="#162240" />
  <polygon points="190,118 205,108 188,95" fill="#162240" />
  <polygon points="112,95 118,100 105,85" fill="#1a2a4a" />
  <polygon points="188,95 182,100 195,85" fill="#1a2a4a" />

  <!-- Head base -->
  <polygon points="112,95 118,100 108,78" fill="#1d2f55" />
  <polygon points="188,95 182,100 192,78" fill="#1d2f55" />
  <polygon points="108,78 118,100 128,80" fill="#233668" />
  <polygon points="192,78 182,100 172,80" fill="#233668" />
  <polygon points="118,100 150,110 150,88" fill="#2a3f78" />
  <polygon points="182,100 150,110 150,88" fill="#2a3f78" />
  <polygon points="128,80 118,100 150,88" fill="#253a70" />
  <polygon points="172,80 182,100 150,88" fill="#253a70" />

  <!-- Crown / top of head -->
  <polygon points="108,78 128,80 118,62" fill="#1e3060" />
  <polygon points="192,78 172,80 182,62" fill="#1e3060" />
  <polygon points="118,62 128,80 138,60" fill="#243870" />
  <polygon points="182,62 172,80 162,60" fill="#243870" />
  <polygon points="128,80 172,80 150,88" fill="#2d4888" />
  <polygon points="128,80 138,60 150,68" fill="#2a4280" />
  <polygon points="172,80 162,60 150,68" fill="#2a4280" />
  <polygon points="138,60 162,60 150,68" fill="#334e98" />

  <!-- Ear tufts (horns) -->
  <!-- Left tuft -->
  <polygon points="118,62 108,48 126,55" fill="#1a2a4e" />
  <polygon points="108,48 114,38 122,48" fill="#162040" />
  <polygon points="114,38 122,48 118,32" fill="#101830" />
  <!-- Right tuft -->
  <polygon points="182,62 192,48 174,55" fill="#1a2a4e" />
  <polygon points="192,48 186,38 178,48" fill="#162040" />
  <polygon points="186,38 178,48 182,32" fill="#101830" />

  <!-- Forehead center -->
  <polygon points="138,60 162,60 150,50" fill="#2e4a8e" />
  <polygon points="138,60 150,50 132,52" fill="#263e7a" />
  <polygon points="162,60 150,50 168,52" fill="#263e7a" />

  <!-- ===================== EYE SOCKETS ===================== -->
  <!-- Left eye socket -->
  <circle cx="128" cy="90" r="20" fill="#0a1020" opacity="0.9" />
  <!-- Right eye socket -->
  <circle cx="172" cy="90" r="20" fill="#0a1020" opacity="0.9" />

  <!-- ===================== GOLDEN EYES — Data viz circles ===================== -->

  <!-- LEFT EYE — golden ring glow -->
  <circle cx="128" cy="90" r="18" fill="none" stroke="#ffd700" stroke-width="2.5" opacity="0.3" filter="url(#softGlow)" />
  <circle cx="128" cy="90" r="16" fill="url(#eyeGlowLeft)" filter="url(#softGlow)" />
  <circle cx="128" cy="90" r="14" fill="url(#eyeInner)" />

  <!-- Left eye data viz: concentric rings (like a radar chart) -->
  <circle cx="128" cy="90" r="13" fill="none" stroke="#ffd700" stroke-width="1.2" opacity="0.7" />
  <circle cx="128" cy="90" r="10" fill="none" stroke="#ffaa00" stroke-width="0.8" opacity="0.6" />
  <circle cx="128" cy="90" r="7" fill="none" stroke="#ff8c00" stroke-width="0.7" opacity="0.5" />
  <circle cx="128" cy="90" r="4" fill="none" stroke="#ffd700" stroke-width="0.6" opacity="0.5" />

  <!-- Left eye data arcs (pie segments) -->
  <!-- Arc segment 1 (top) -->
  <path d="M128,77 A13,13 0 0,1 139,84" fill="none" stroke="#ffd700" stroke-width="2.5" opacity="0.8" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Arc segment 2 (right) -->
  <path d="M139,84 A13,13 0 0,1 136,97" fill="none" stroke="#ffcc00" stroke-width="2" opacity="0.7" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Arc segment 3 (bottom-left) -->
  <path d="M136,97 A13,13 0 0,1 116,87" fill="none" stroke="#ff9900" stroke-width="1.5" opacity="0.6" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Arc segment 4 (top-left) -->
  <path d="M116,87 A13,13 0 0,1 128,77" fill="none" stroke="#ffdd44" stroke-width="1" opacity="0.5" stroke-linecap="round" filter="url(#subtleGlow)" />

  <!-- Left eye data bars (radial lines inside) -->
  <line x1="128" y1="80" x2="128" y2="84" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <line x1="135" y1="83" x2="132" y2="86" stroke="#ffaa00" stroke-width="1.5" opacity="0.6" />
  <line x1="135" y1="97" x2="132" y2="94" stroke="#ff8c00" stroke-width="1.2" opacity="0.5" />
  <line x1="121" y1="83" x2="124" y2="86" stroke="#ffcc00" stroke-width="1.2" opacity="0.6" />

  <!-- Left pupil -->
  <circle cx="128" cy="90" r="3.5" fill="url(#pupilGrad)" />
  <circle cx="128" cy="90" r="2" fill="#000510" />
  <!-- Pupil gleam -->
  <circle cx="130" cy="88" r="0.8" fill="#ffd700" opacity="0.9" />

  <!-- LEFT EYE outer glow ring -->
  <circle cx="128" cy="90" r="17" fill="none" stroke="#ffd700" stroke-width="1" opacity="0.5" filter="url(#glowFilter)" />


  <!-- RIGHT EYE — golden ring glow -->
  <circle cx="172" cy="90" r="18" fill="none" stroke="#ffd700" stroke-width="2.5" opacity="0.3" filter="url(#softGlow)" />
  <circle cx="172" cy="90" r="16" fill="url(#eyeGlowRight)" filter="url(#softGlow)" />
  <circle cx="172" cy="90" r="14" fill="url(#eyeInner)" />

  <!-- Right eye data viz: concentric rings -->
  <circle cx="172" cy="90" r="13" fill="none" stroke="#ffd700" stroke-width="1.2" opacity="0.7" />
  <circle cx="172" cy="90" r="10" fill="none" stroke="#ffaa00" stroke-width="0.8" opacity="0.6" />
  <circle cx="172" cy="90" r="7" fill="none" stroke="#ff8c00" stroke-width="0.7" opacity="0.5" />
  <circle cx="172" cy="90" r="4" fill="none" stroke="#ffd700" stroke-width="0.6" opacity="0.5" />

  <!-- Right eye data arcs (different segments for variety) -->
  <!-- Segment 1 -->
  <path d="M172,77 A13,13 0 0,1 183,86" fill="none" stroke="#ffd700" stroke-width="3" opacity="0.85" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Segment 2 -->
  <path d="M183,86 A13,13 0 0,1 178,99" fill="none" stroke="#ffbb00" stroke-width="1.8" opacity="0.65" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Segment 3 -->
  <path d="M178,99 A13,13 0 0,1 161,99" fill="none" stroke="#ff9900" stroke-width="1.2" opacity="0.5" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Segment 4 -->
  <path d="M161,99 A13,13 0 0,1 161,81" fill="none" stroke="#ffdd44" stroke-width="0.9" opacity="0.4" stroke-linecap="round" filter="url(#subtleGlow)" />
  <!-- Segment 5 (gap) -->
  <path d="M161,81 A13,13 0 0,1 172,77" fill="none" stroke="#ffc800" stroke-width="0.7" opacity="0.4" stroke-linecap="round" filter="url(#subtleGlow)" />

  <!-- Right eye data bars -->
  <line x1="172" y1="80" x2="172" y2="84" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <line x1="179" y1="83" x2="176" y2="86" stroke="#ffaa00" stroke-width="1.5" opacity="0.6" />
  <line x1="179" y1="97" x2="176" y2="94" stroke="#ff8c00" stroke-width="1.2" opacity="0.5" />
  <line x1="165" y1="83" x2="168" y2="86" stroke="#ffcc00" stroke-width="1.2" opacity="0.6" />

  <!-- Right pupil -->
  <circle cx="172" cy="90" r="3.5" fill="url(#pupilGrad)" />
  <circle cx="172" cy="90" r="2" fill="#000510" />
  <!-- Pupil gleam -->
  <circle cx="174" cy="88" r="0.8" fill="#ffd700" opacity="0.9" />

  <!-- RIGHT EYE outer glow ring -->
  <circle cx="172" cy="90" r="17" fill="none" stroke="#ffd700" stroke-width="1" opacity="0.5" filter="url(#glowFilter)" />

  <!-- ===================== BEAK ===================== -->
  <polygon points="142,105 158,105 150,116" fill="#d4a000" opacity="0.9" />
  <polygon points="142,105 150,110 150,116" fill="#b88800" opacity="0.9" />
  <polygon points="158,105 150,110 150,116" fill="#e0b800" opacity="0.9" />

  <!-- ===================== FACE DETAILS ===================== -->
  <!-- Facial disc (subtle) -->
  <ellipse cx="150" cy="95" rx="30" ry="25" fill="none" stroke="#1e3060" stroke-width="1" opacity="0.4" />

  <!-- Feather texture lines (body) -->
  <line x1="132" y1="125" x2="140" y2="130" stroke="#0d1a30" stroke-width="0.5" opacity="0.6" />
  <line x1="136" y1="135" x2="144" y2="140" stroke="#0d1a30" stroke-width="0.5" opacity="0.6" />
  <line x1="168" y1="125" x2="160" y2="130" stroke="#0d1a30" stroke-width="0.5" opacity="0.6" />
  <line x1="164" y1="135" x2="156" y2="140" stroke="#0d1a30" stroke-width="0.5" opacity="0.6" />
  <line x1="140" y1="145" x2="150" y2="150" stroke="#0d1a30" stroke-width="0.5" opacity="0.5" />
  <line x1="160" y1="145" x2="150" y2="150" stroke="#0d1a30" stroke-width="0.5" opacity="0.5" />

  <!-- Chest highlight -->
  <polygon points="140,118 160,118 150,135" fill="#1e3060" opacity="0.4" />

  <!-- ===================== TALONS / FEET ===================== -->
  <!-- Left foot -->
  <line x1="132" y1="168" x2="122" y2="178" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <line x1="132" y1="168" x2="128" y2="180" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <line x1="132" y1="168" x2="135" y2="180" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <!-- Right foot -->
  <line x1="168" y1="168" x2="178" y2="178" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <line x1="168" y1="168" x2="172" y2="180" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />
  <line x1="168" y1="168" x2="165" y2="180" stroke="#ffd700" stroke-width="1.5" opacity="0.7" />

  <!-- ===================== AMBIENT DATA DOTS around owl ===================== -->
  <!-- Floating data points suggesting intelligence/data analysis -->
  <circle cx="62" cy="72" r="1.5" fill="#ffd700" opacity="0.5" />
  <circle cx="70" cy="58" r="1" fill="#ffaa00" opacity="0.4" />
  <circle cx="55" cy="88" r="1.2" fill="#ffd700" opacity="0.35" />
  <circle cx="238" cy="72" r="1.5" fill="#ffd700" opacity="0.5" />
  <circle cx="230" cy="58" r="1" fill="#ffaa00" opacity="0.4" />
  <circle cx="245" cy="88" r="1.2" fill="#ffd700" opacity="0.35" />
  <circle cx="88" cy="48" r="1" fill="#ffcc44" opacity="0.3" />
  <circle cx="212" cy="48" r="1" fill="#ffcc44" opacity="0.3" />

  <!-- Connecting data lines (network feel) -->
  <line x1="62" y1="72" x2="70" y2="58" stroke="#ffd700" stroke-width="0.5" opacity="0.2" />
  <line x1="70" y1="58" x2="88" y2="48" stroke="#ffd700" stroke-width="0.5" opacity="0.15" />
  <line x1="238" y1="72" x2="230" y2="58" stroke="#ffd700" stroke-width="0.5" opacity="0.2" />
  <line x1="230" y1="58" x2="212" y2="48" stroke="#ffd700" stroke-width="0.5" opacity="0.15" />

  <!-- ===================== TEXT ===================== -->
  <!-- Main wordmark -->
  <text x="150" y="193" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="700" fill="#ffd700" text-anchor="middle" letter-spacing="3" opacity="0.95">AGENTIC LEAD GEN</text>
  <!-- Tagline sub -->
  <text x="150" y="200" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="0" fill="#8899bb" text-anchor="middle" letter-spacing="2">PROSPECT INTELLIGENCE</text>
</svg>` },
  { id: 82, title: "Shield Premium", concept: "heraldic shield with stage icons", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1628;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a2f5a;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f5d060;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#c9940a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#a87200;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffe87a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#c9940a;stop-opacity:1"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <clipPath id="shieldClip">
      <path d="M150,28 L198,42 L198,110 Q198,148 150,170 Q102,148 102,110 L102,42 Z"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#f0f4ff"/>

  <!-- Shield outer glow -->
  <path d="M150,28 L198,42 L198,110 Q198,148 150,170 Q102,148 102,110 L102,42 Z"
        fill="none" stroke="#c9940a" stroke-width="4" opacity="0.3" filter="url(#glow)"/>

  <!-- Shield body -->
  <path d="M150,28 L198,42 L198,110 Q198,148 150,170 Q102,148 102,110 L102,42 Z"
        fill="url(#shieldGrad)" filter="url(#shadow)"/>

  <!-- Shield inner border -->
  <path d="M150,32 L194,45 L194,110 Q194,144 150,164 Q106,144 106,110 L106,45 Z"
        fill="none" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.7"/>

  <!-- Gold dividing cross - vertical -->
  <line x1="150" y1="32" x2="150" y2="164" stroke="url(#goldGrad)" stroke-width="2.5" clip-path="url(#shieldClip)"/>
  <!-- Gold dividing cross - horizontal -->
  <line x1="102" y1="99" x2="198" y2="99" stroke="url(#goldGrad)" stroke-width="2.5" clip-path="url(#shieldClip)"/>

  <!-- Q1 (top-left): Discovery / Radar icon -->
  <g clip-path="url(#shieldClip)">
    <!-- Radar circles -->
    <circle cx="126" cy="68" r="14" fill="none" stroke="#3a7bd5" stroke-width="1.2" opacity="0.6"/>
    <circle cx="126" cy="68" r="9" fill="none" stroke="#3a7bd5" stroke-width="1.2" opacity="0.7"/>
    <circle cx="126" cy="68" r="4" fill="#3a7bd5" opacity="0.9"/>
    <!-- Radar sweep line -->
    <line x1="126" y1="68" x2="135" y2="58" stroke="#5a9ff5" stroke-width="1.5" opacity="0.9"/>
    <!-- Radar blip -->
    <circle cx="132" cy="61" r="1.8" fill="#7fc8ff" opacity="0.9"/>
  </g>

  <!-- Q2 (top-right): Enrichment / Gear icon -->
  <g clip-path="url(#shieldClip)">
    <circle cx="174" cy="68" r="7" fill="none" stroke="#4daa6e" stroke-width="2"/>
    <circle cx="174" cy="68" r="3" fill="#4daa6e"/>
    <!-- Gear teeth -->
    <rect x="172.5" y="58" width="3" height="4" rx="1" fill="#4daa6e"/>
    <rect x="172.5" y="74" width="3" height="4" rx="1" fill="#4daa6e"/>
    <rect x="164" y="66.5" width="4" height="3" rx="1" fill="#4daa6e"/>
    <rect x="180" y="66.5" width="4" height="3" rx="1" fill="#4daa6e"/>
    <rect x="166.5" y="60.5" width="3.5" height="3" rx="1" fill="#4daa6e" transform="rotate(45 168.25 62)"/>
    <rect x="178" y="73" width="3.5" height="3" rx="1" fill="#4daa6e" transform="rotate(45 179.75 74.5)"/>
    <rect x="166.5" y="73" width="3.5" height="3" rx="1" fill="#4daa6e" transform="rotate(-45 168.25 74.5)"/>
    <rect x="178" y="60.5" width="3.5" height="3" rx="1" fill="#4daa6e" transform="rotate(-45 179.75 62)"/>
  </g>

  <!-- Q3 (bottom-left): Contacts / Person + checkmark icon -->
  <g clip-path="url(#shieldClip)">
    <circle cx="126" cy="114" r="6" fill="#e8a020" opacity="0.9"/>
    <path d="M115,132 Q115,124 126,124 Q137,124 137,132" fill="#e8a020" opacity="0.9"/>
    <!-- Checkmark shield overlay -->
    <circle cx="134" cy="113" r="5" fill="#1a2f5a" stroke="#e8a020" stroke-width="1"/>
    <polyline points="131,113 133,115.5 137,111" fill="none" stroke="#f5d060" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Q4 (bottom-right): Outreach / Email send icon -->
  <g clip-path="url(#shieldClip)">
    <!-- Envelope -->
    <rect x="163" y="112" width="22" height="15" rx="2" fill="none" stroke="#d45a7a" stroke-width="1.8"/>
    <polyline points="163,112 174,121 185,112" fill="none" stroke="#d45a7a" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Send arrow -->
    <line x1="178" y1="108" x2="188" y2="104" stroke="#f5d060" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="188,104 182,102 184,108" fill="#f5d060"/>
  </g>

  <!-- Shield outer border final -->
  <path d="M150,28 L198,42 L198,110 Q198,148 150,170 Q102,148 102,110 L102,42 Z"
        fill="none" stroke="url(#goldGrad)" stroke-width="2.5"/>

  <!-- Crown above shield -->
  <g filter="url(#glow)">
    <!-- Crown base band -->
    <rect x="130" y="19" width="40" height="10" rx="1.5" fill="url(#crownGrad)"/>
    <!-- Crown points -->
    <!-- Center point (tallest) -->
    <polygon points="150,5 145,19 155,19" fill="url(#crownGrad)"/>
    <!-- Left point -->
    <polygon points="135,9 131,19 139,19" fill="url(#crownGrad)"/>
    <!-- Right point -->
    <polygon points="165,9 161,19 169,19" fill="url(#crownGrad)"/>
    <!-- Crown jewels -->
    <circle cx="150" cy="6" r="2" fill="#fff" opacity="0.95"/>
    <circle cx="135" cy="10" r="1.5" fill="#fff" opacity="0.9"/>
    <circle cx="165" cy="10" r="1.5" fill="#fff" opacity="0.9"/>
    <circle cx="140" cy="24" r="1.5" fill="#0a1628" opacity="0.6"/>
    <circle cx="150" cy="24" r="1.5" fill="#0a1628" opacity="0.6"/>
    <circle cx="160" cy="24" r="1.5" fill="#0a1628" opacity="0.6"/>
  </g>

  <!-- Bottom text: AGENTIC LEAD GEN -->
  <text x="150" y="185" font-family="Georgia, 'Times New Roman', serif" font-size="11" font-weight="bold"
        fill="#0a1628" text-anchor="middle" letter-spacing="2">AGENTIC LEAD GEN</text>

  <!-- Tagline -->
  <text x="150" y="196" font-family="Georgia, 'Times New Roman', serif" font-size="6.5"
        fill="#8a9bbf" text-anchor="middle" letter-spacing="1.5">B2B INTELLIGENCE · PROTECTED</text>
</svg>` },
  { id: 83, title: "Bridge Connect", concept: "suspension bridge spanning buyer-seller gap", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Sunset gradient background -->
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0533"/>
      <stop offset="35%" stop-color="#6b1f6e"/>
      <stop offset="65%" stop-color="#e85d28"/>
      <stop offset="100%" stop-color="#f5a623"/>
    </linearGradient>
    <!-- Water/ground gradient -->
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1f3c"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <!-- Cliff gradient left -->
    <linearGradient id="cliffLeftGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1c2e1a"/>
      <stop offset="100%" stop-color="#2d4a29"/>
    </linearGradient>
    <!-- Cliff gradient right -->
    <linearGradient id="cliffRightGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2d4a29"/>
      <stop offset="100%" stop-color="#1c2e1a"/>
    </linearGradient>
    <!-- Data stream cable gradient -->
    <linearGradient id="cableGrad1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff6b35" stop-opacity="0.9"/>
      <stop offset="30%" stop-color="#ff9f1c" stop-opacity="1"/>
      <stop offset="60%" stop-color="#c77dff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#7b2fff" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="cableGrad2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ff9f1c" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#c77dff" stop-opacity="0.7"/>
    </linearGradient>
    <!-- Tower gradient -->
    <linearGradient id="towerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a8a9a"/>
      <stop offset="50%" stop-color="#d0d0e0"/>
      <stop offset="100%" stop-color="#8a8a9a"/>
    </linearGradient>
    <!-- Sun glow -->
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff7d6" stop-opacity="1"/>
      <stop offset="40%" stop-color="#f5a623" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#e85d28" stop-opacity="0"/>
    </radialGradient>
    <!-- Deck gradient -->
    <linearGradient id="deckGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8c8d8"/>
      <stop offset="100%" stop-color="#888898"/>
    </linearGradient>
    <!-- Data particle glow -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Reflection gradient -->
    <linearGradient id="reflectGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e85d28" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#f5a623" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background sky -->
  <rect width="300" height="200" fill="url(#skyGrad)"/>

  <!-- Sun glow orb -->
  <ellipse cx="150" cy="108" rx="28" ry="22" fill="url(#sunGlow)" opacity="0.85"/>

  <!-- Atmospheric haze bands -->
  <rect x="0" y="100" width="300" height="6" fill="#f5a623" opacity="0.08"/>
  <rect x="0" y="105" width="300" height="4" fill="#e85d28" opacity="0.06"/>

  <!-- Water below -->
  <rect x="0" y="148" width="300" height="52" fill="url(#waterGrad)"/>

  <!-- Water reflection ripples -->
  <ellipse cx="150" cy="158" rx="40" ry="6" fill="url(#reflectGrad)" opacity="0.5"/>
  <line x1="80" y1="162" x2="220" y2="162" stroke="#f5a623" stroke-width="0.5" opacity="0.15"/>
  <line x1="100" y1="168" x2="200" y2="168" stroke="#f5a623" stroke-width="0.5" opacity="0.1"/>
  <line x1="60" y1="175" x2="240" y2="175" stroke="#c77dff" stroke-width="0.5" opacity="0.08"/>

  <!-- Left cliff -->
  <polygon points="0,148 0,80 55,80 70,95 72,148" fill="url(#cliffLeftGrad)"/>
  <!-- Cliff face shading -->
  <polygon points="55,80 70,95 72,148 65,148 62,98 52,82" fill="#0f1f0d" opacity="0.4"/>
  <!-- Cliff top vegetation hint -->
  <ellipse cx="25" cy="79" rx="18" ry="5" fill="#1a3317" opacity="0.7"/>
  <ellipse cx="42" cy="77" rx="10" ry="4" fill="#1f3d1a" opacity="0.6"/>

  <!-- Right cliff -->
  <polygon points="300,148 300,80 245,80 230,95 228,148" fill="url(#cliffRightGrad)"/>
  <!-- Cliff face shading -->
  <polygon points="245,80 230,95 228,148 235,148 238,98 248,82" fill="#0f1f0d" opacity="0.4"/>
  <!-- Cliff top vegetation hint -->
  <ellipse cx="275" cy="79" rx="18" ry="5" fill="#1a3317" opacity="0.7"/>
  <ellipse cx="258" cy="77" rx="10" ry="4" fill="#1f3d1a" opacity="0.6"/>

  <!-- === BRIDGE === -->

  <!-- Bridge deck (roadway) -->
  <rect x="72" y="129" width="156" height="5" fill="url(#deckGrad)" rx="1"/>
  <!-- Deck underside shadow -->
  <rect x="72" y="133" width="156" height="2" fill="#333344" opacity="0.5"/>

  <!-- Vertical suspender cables (hangers) from deck to main cable -->
  <!-- Left span suspenders -->
  <line x1="90"  y1="129" x2="90"  y2="108" stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <line x1="103" y1="129" x2="103" y2="103" stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <line x1="116" y1="129" x2="116" y2="100" stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <line x1="129" y1="129" x2="129" y2="99"  stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <!-- Right span suspenders -->
  <line x1="210" y1="129" x2="210" y2="108" stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <line x1="197" y1="129" x2="197" y2="103" stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <line x1="184" y1="129" x2="184" y2="100" stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>
  <line x1="171" y1="129" x2="171" y2="99"  stroke="#aaaacc" stroke-width="0.6" opacity="0.6"/>

  <!-- LEFT TOWER -->
  <!-- Tower legs -->
  <rect x="127" y="80" width="5" height="52" fill="url(#towerGrad)" rx="1"/>
  <rect x="136" y="80" width="5" height="52" fill="url(#towerGrad)" rx="1"/>
  <!-- Tower crossbars -->
  <rect x="125" y="88"  width="18" height="3" fill="#b0b0c8" rx="0.5"/>
  <rect x="125" y="97"  width="18" height="3" fill="#b0b0c8" rx="0.5"/>
  <rect x="125" y="106" width="18" height="3" fill="#b0b0c8" rx="0.5"/>
  <!-- Tower caps -->
  <rect x="126" y="78" width="7" height="3" fill="#e0e0f0" rx="1"/>
  <rect x="135" y="78" width="7" height="3" fill="#e0e0f0" rx="1"/>

  <!-- RIGHT TOWER -->
  <rect x="159" y="80" width="5" height="52" fill="url(#towerGrad)" rx="1"/>
  <rect x="168" y="80" width="5" height="52" fill="url(#towerGrad)" rx="1"/>
  <!-- Tower crossbars -->
  <rect x="157" y="88"  width="18" height="3" fill="#b0b0c8" rx="0.5"/>
  <rect x="157" y="97"  width="18" height="3" fill="#b0b0c8" rx="0.5"/>
  <rect x="157" y="106" width="18" height="3" fill="#b0b0c8" rx="0.5"/>
  <!-- Tower caps -->
  <rect x="158" y="78" width="7" height="3" fill="#e0e0f0" rx="1"/>
  <rect x="167" y="78" width="7" height="3" fill="#e0e0f0" rx="1"/>

  <!-- DATA STREAM MAIN CABLES (suspension catenary curves) -->
  <!-- Primary cable - warm data stream -->
  <path d="M72,90 Q100,125 130,98 Q150,88 170,98 Q200,125 228,90"
        fill="none" stroke="url(#cableGrad1)" stroke-width="2.2"
        filter="url(#glow)" opacity="0.95"/>
  <!-- Secondary cable - cool data stream -->
  <path d="M72,94 Q100,130 130,102 Q150,92 170,102 Q200,130 228,94"
        fill="none" stroke="url(#cableGrad2)" stroke-width="1.2"
        filter="url(#glow)" opacity="0.75"/>
  <!-- Third subtle cable -->
  <path d="M72,97 Q100,134 130,105 Q150,95 170,105 Q200,134 228,97"
        fill="none" stroke="#c77dff" stroke-width="0.8"
        opacity="0.4"/>

  <!-- Data particles flowing along cable -->
  <!-- Warm particles (left-to-right) -->
  <circle cx="88"  cy="110" r="1.8" fill="#ff9f1c" filter="url(#glow)" opacity="0.95"/>
  <circle cx="108" cy="119" r="1.4" fill="#ff6b35" filter="url(#glow)" opacity="0.85"/>
  <circle cx="131" cy="99"  r="1.6" fill="#ffcc44" filter="url(#glow)" opacity="0.9"/>
  <circle cx="150" cy="89"  r="2.0" fill="#ffffff"  filter="url(#glow)" opacity="0.95"/>
  <!-- Cool particles (right-to-left) -->
  <circle cx="169" cy="99"  r="1.6" fill="#c77dff" filter="url(#glow)" opacity="0.9"/>
  <circle cx="192" cy="119" r="1.4" fill="#9b5de5" filter="url(#glow)" opacity="0.85"/>
  <circle cx="212" cy="110" r="1.8" fill="#7b2fff" filter="url(#glow)" opacity="0.95"/>
  <!-- Mid-bridge node burst -->
  <circle cx="150" cy="89" r="4" fill="#ff9f1c" opacity="0.15" filter="url(#softGlow)"/>

  <!-- VENDOR label on left cliff -->
  <text x="27" y="74" font-family="'Arial', sans-serif" font-size="7.5" font-weight="700"
        fill="#f5c88a" text-anchor="middle" letter-spacing="0.5" opacity="0.92">VENDOR</text>

  <!-- BUYER label on right cliff -->
  <text x="273" y="74" font-family="'Arial', sans-serif" font-size="7.5" font-weight="700"
        fill="#c9a8ff" text-anchor="middle" letter-spacing="0.5" opacity="0.92">BUYER</text>

  <!-- Brand name -->
  <text x="150" y="171" font-family="'Arial', sans-serif" font-size="11" font-weight="800"
        fill="#ffffff" text-anchor="middle" letter-spacing="1.5" opacity="0.97">AGENTIC LEAD GEN</text>
  <!-- Subtle tagline -->
  <text x="150" y="183" font-family="'Arial', sans-serif" font-size="5.5" font-weight="400"
        fill="#f5a623" text-anchor="middle" letter-spacing="2.5" opacity="0.75">BRIDGE CONNECTION</text>

  <!-- Decorative horizon line -->
  <line x1="0" y1="148" x2="300" y2="148" stroke="#f5a623" stroke-width="0.5" opacity="0.3"/>

  <!-- Subtle star field -->
  <circle cx="20"  cy="12" r="0.7" fill="#fff" opacity="0.6"/>
  <circle cx="55"  cy="8"  r="0.5" fill="#fff" opacity="0.5"/>
  <circle cx="90"  cy="18" r="0.6" fill="#fff" opacity="0.4"/>
  <circle cx="200" cy="10" r="0.7" fill="#fff" opacity="0.55"/>
  <circle cx="240" cy="20" r="0.5" fill="#fff" opacity="0.45"/>
  <circle cx="275" cy="7"  r="0.6" fill="#fff" opacity="0.5"/>
  <circle cx="185" cy="25" r="0.4" fill="#fff" opacity="0.35"/>
  <circle cx="35"  cy="28" r="0.5" fill="#fff" opacity="0.4"/>
</svg>` },
  { id: 84, title: "Diamond Lattice", concept: "molecular diamond wireframe", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0a0f1e"/>
      <stop offset="100%" stop-color="#020408"/>
    </radialGradient>
    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7ecfff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#3a8fcc" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="360%" height="360%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="edgeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a6fa8" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#5ab4e8" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#2a6fa8" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="edgeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1d5a8a" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="#4aa0d0" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#1d5a8a" stop-opacity="0.2"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle grid lines in background -->
  <g opacity="0.04" stroke="#5ab4e8" stroke-width="0.5">
    <line x1="0" y1="40" x2="300" y2="40"/>
    <line x1="0" y1="80" x2="300" y2="80"/>
    <line x1="0" y1="120" x2="300" y2="120"/>
    <line x1="0" y1="160" x2="300" y2="160"/>
    <line x1="60" y1="0" x2="60" y2="200"/>
    <line x1="120" y1="0" x2="120" y2="200"/>
    <line x1="180" y1="0" x2="180" y2="200"/>
    <line x1="240" y1="0" x2="240" y2="200"/>
  </g>

  <!-- Diamond lattice wireframe — isometric-ish 3D projection -->
  <!-- Lattice nodes layout (col, row) projected to screen coords:
       Isometric offset: dx=18, dy=10 for unit cell
       Center cluster around (110, 88)
  -->

  <!-- === BACK LAYER EDGES (darkest) === -->
  <g stroke="url(#edgeGrad2)" stroke-width="0.8" fill="none" opacity="0.45">
    <!-- back-bottom horizontal tier -->
    <line x1="56" y1="82" x2="80" y2="70"/>
    <line x1="80" y1="70" x2="104" y2="82"/>
    <line x1="104" y1="82" x2="128" y2="70"/>
    <line x1="128" y1="70" x2="152" y2="82"/>
    <line x1="152" y1="82" x2="128" y2="94"/>
    <line x1="128" y1="94" x2="104" y2="82"/>
    <line x1="80" y1="94" x2="56" y2="82"/>
    <line x1="80" y1="94" x2="104" y2="82"/>
    <!-- back vertical connections -->
    <line x1="80" y1="70" x2="80" y2="94"/>
    <line x1="128" y1="70" x2="128" y2="94"/>
    <!-- back-top tier -->
    <line x1="56" y1="58" x2="80" y2="46"/>
    <line x1="80" y1="46" x2="104" y2="58"/>
    <line x1="104" y1="58" x2="128" y2="46"/>
    <line x1="128" y1="46" x2="152" y2="58"/>
    <line x1="56" y1="58" x2="56" y2="82"/>
    <line x1="152" y1="58" x2="152" y2="82"/>
    <line x1="80" y1="46" x2="80" y2="70"/>
    <line x1="128" y1="46" x2="128" y2="70"/>
    <line x1="104" y1="58" x2="104" y2="82"/>
  </g>

  <!-- === MID LAYER EDGES === -->
  <g stroke="url(#edgeGrad1)" stroke-width="1.0" fill="none" opacity="0.65">
    <!-- mid horizontal connections -->
    <line x1="56" y1="106" x2="80" y2="94"/>
    <line x1="80" y1="94" x2="104" y2="106"/>
    <line x1="104" y1="106" x2="128" y2="94"/>
    <line x1="128" y1="94" x2="152" y2="106"/>
    <line x1="56" y1="106" x2="80" y2="118"/>
    <line x1="80" y1="118" x2="104" y2="106"/>
    <line x1="104" y1="106" x2="128" y2="118"/>
    <line x1="128" y1="118" x2="152" y2="106"/>
    <!-- mid verticals -->
    <line x1="56" y1="82" x2="56" y2="106"/>
    <line x1="152" y1="82" x2="152" y2="106"/>
    <line x1="80" y1="94" x2="80" y2="118"/>
    <line x1="128" y1="94" x2="128" y2="118"/>
    <!-- diagonal braces mid -->
    <line x1="56" y1="82" x2="80" y2="94"/>
    <line x1="152" y1="82" x2="128" y2="94"/>
  </g>

  <!-- === FRONT LAYER EDGES (brightest) === -->
  <g stroke="#5ab4e8" stroke-width="1.2" fill="none" filter="url(#glow)" opacity="0.85">
    <!-- front-bottom tier -->
    <line x1="56" y1="130" x2="80" y2="118"/>
    <line x1="80" y1="118" x2="104" y2="130"/>
    <line x1="104" y1="130" x2="128" y2="118"/>
    <line x1="128" y1="118" x2="152" y2="130"/>
    <line x1="56" y1="130" x2="80" y2="142"/>
    <line x1="80" y1="142" x2="104" y2="130"/>
    <line x1="104" y1="130" x2="128" y2="142"/>
    <line x1="128" y1="142" x2="152" y2="130"/>
    <!-- front verticals -->
    <line x1="56" y1="106" x2="56" y2="130"/>
    <line x1="152" y1="106" x2="152" y2="130"/>
    <line x1="80" y1="118" x2="80" y2="142"/>
    <line x1="128" y1="118" x2="128" y2="142"/>
    <line x1="104" y1="130" x2="104" y2="154"/>
    <!-- front face diagonals -->
    <line x1="56" y1="106" x2="80" y2="118"/>
    <line x1="152" y1="106" x2="128" y2="118"/>
    <line x1="80" y1="142" x2="56" y2="130"/>
    <line x1="128" y1="142" x2="152" y2="130"/>
  </g>

  <!-- === EXTRA ACCENT EDGES — top cap and right extension === -->
  <g stroke="#7ecfff" stroke-width="1.0" fill="none" opacity="0.5">
    <line x1="104" y1="34" x2="80" y2="46"/>
    <line x1="104" y1="34" x2="128" y2="46"/>
    <line x1="104" y1="34" x2="104" y2="58"/>
    <!-- right wing -->
    <line x1="152" y1="58" x2="176" y2="46"/>
    <line x1="152" y1="82" x2="176" y2="70"/>
    <line x1="176" y1="46" x2="176" y2="70"/>
    <line x1="152" y1="106" x2="176" y2="94"/>
    <line x1="176" y1="70" x2="176" y2="94"/>
    <!-- left extension -->
    <line x1="56" y1="58" x2="32" y2="70"/>
    <line x1="56" y1="82" x2="32" y2="94"/>
    <line x1="32" y1="70" x2="32" y2="94"/>
  </g>

  <!-- === NODES === -->
  <!-- Back tier nodes -->
  <g filter="url(#softGlow)">
    <circle cx="80" cy="46" r="2.2" fill="#3a8fcc" opacity="0.6"/>
    <circle cx="104" cy="58" r="2.2" fill="#3a8fcc" opacity="0.6"/>
    <circle cx="128" cy="46" r="2.2" fill="#3a8fcc" opacity="0.6"/>
    <circle cx="56" cy="58" r="2.0" fill="#3a8fcc" opacity="0.5"/>
    <circle cx="152" cy="58" r="2.0" fill="#3a8fcc" opacity="0.5"/>
    <!-- mid tier -->
    <circle cx="80" cy="70" r="2.2" fill="#4aa8d8" opacity="0.7"/>
    <circle cx="104" cy="82" r="2.5" fill="#5ab4e8" opacity="0.8"/>
    <circle cx="128" cy="70" r="2.2" fill="#4aa8d8" opacity="0.7"/>
    <circle cx="56" cy="82" r="2.0" fill="#4aa8d8" opacity="0.6"/>
    <circle cx="152" cy="82" r="2.0" fill="#4aa8d8" opacity="0.6"/>
    <circle cx="80" cy="94" r="2.5" fill="#5ab4e8" opacity="0.85"/>
    <circle cx="128" cy="94" r="2.5" fill="#5ab4e8" opacity="0.85"/>
    <circle cx="104" cy="106" r="2.8" fill="#7ecfff" opacity="0.9"/>
    <circle cx="56" cy="106" r="2.2" fill="#4aa8d8" opacity="0.7"/>
    <circle cx="152" cy="106" r="2.2" fill="#4aa8d8" opacity="0.7"/>
    <!-- front tier -->
    <circle cx="80" cy="118" r="2.8" fill="#7ecfff" opacity="0.95"/>
    <circle cx="128" cy="118" r="2.8" fill="#7ecfff" opacity="0.95"/>
    <circle cx="104" cy="130" r="3.0" fill="#a8e0ff" opacity="1.0"/>
    <circle cx="56" cy="130" r="2.2" fill="#5ab4e8" opacity="0.75"/>
    <circle cx="152" cy="130" r="2.2" fill="#5ab4e8" opacity="0.75"/>
    <circle cx="80" cy="142" r="2.5" fill="#6cc4f0" opacity="0.85"/>
    <circle cx="128" cy="142" r="2.5" fill="#6cc4f0" opacity="0.85"/>
    <!-- apex node -->
    <circle cx="104" cy="34" r="2.5" fill="#5ab4e8" opacity="0.65"/>
    <!-- extension nodes -->
    <circle cx="176" cy="46" r="1.8" fill="#3a8fcc" opacity="0.4"/>
    <circle cx="176" cy="70" r="1.8" fill="#3a8fcc" opacity="0.4"/>
    <circle cx="176" cy="94" r="1.8" fill="#3a8fcc" opacity="0.4"/>
    <circle cx="32" cy="70" r="1.8" fill="#3a8fcc" opacity="0.4"/>
    <circle cx="32" cy="94" r="1.8" fill="#3a8fcc" opacity="0.4"/>
  </g>

  <!-- Bright halo on key front nodes -->
  <g opacity="0.35">
    <circle cx="104" cy="130" r="6" fill="none" stroke="#a8e0ff" stroke-width="0.8"/>
    <circle cx="80" cy="118" r="5" fill="none" stroke="#7ecfff" stroke-width="0.6"/>
    <circle cx="128" cy="118" r="5" fill="none" stroke="#7ecfff" stroke-width="0.6"/>
    <circle cx="104" cy="106" r="4.5" fill="none" stroke="#5ab4e8" stroke-width="0.5"/>
  </g>

  <!-- === TEXT === -->
  <!-- Main title -->
  <text x="210" y="88" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="700" letter-spacing="1" fill="#e8f6ff" filter="url(#textGlow)" text-anchor="middle">AGENTIC</text>
  <text x="210" y="110" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="400" letter-spacing="2.5" fill="#5ab4e8" filter="url(#glow)" text-anchor="middle">LEAD  GEN</text>

  <!-- Decorative divider line -->
  <line x1="170" y1="118" x2="252" y2="118" stroke="#2a6fa8" stroke-width="0.6" opacity="0.7"/>

  <!-- Tagline -->
  <text x="211" y="131" font-family="'Courier New', Courier, monospace" font-size="7" letter-spacing="1.8" fill="#2a6fa8" text-anchor="middle">STRUCTURED · PRECISE · SCALABLE</text>

  <!-- Corner accent marks -->
  <g stroke="#1d5a8a" stroke-width="0.8" opacity="0.6">
    <polyline points="8,8 8,18 18,18" fill="none"/>
    <polyline points="292,8 292,18 282,18" fill="none"/>
    <polyline points="8,192 8,182 18,182" fill="none"/>
    <polyline points="292,192 292,182 282,182" fill="none"/>
  </g>

  <!-- Version label bottom right -->
  <text x="291" y="196" font-family="'Courier New', Courier, monospace" font-size="5.5" fill="#1d4a6a" text-anchor="end" opacity="0.7">v2.0</text>
</svg>` },
  { id: 85, title: "Wolf Pack", concept: "geometric wolf with blue eye glow", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8f4fd" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#b8d4ee" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0a0f1a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#60b8ff" stop-opacity="1"/>
      <stop offset="40%" stop-color="#3a8fd4" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#1a4a7a" stop-opacity="0.2"/>
    </radialGradient>
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0d1b2e"/>
      <stop offset="100%" stop-color="#060c14"/>
    </radialGradient>
    <filter id="eyeBloom" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="moonBloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="wolfShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000d1a" flood-opacity="0.7"/>
    </filter>
    <clipPath id="viewClip">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle atmospheric gradient overlay -->
  <rect width="300" height="200" fill="#0a1628" opacity="0.3"/>

  <!-- Moon glow backdrop -->
  <circle cx="150" cy="52" r="38" fill="url(#moonGlow)" filter="url(#moonBloom)" opacity="0.6"/>

  <!-- Moon -->
  <circle cx="150" cy="52" r="18" fill="#ddeef8" opacity="0.92" filter="url(#moonBloom)"/>
  <circle cx="144" cy="48" r="13" fill="#0d1b2e" opacity="0.85"/>

  <!-- Tree silhouettes left -->
  <g fill="#060e1a" opacity="0.85">
    <polygon points="22,170 32,120 42,170"/>
    <polygon points="28,170 40,100 52,170"/>
    <polygon points="14,170 22,130 30,170"/>
    <rect x="36" y="155" width="8" height="15"/>
  </g>

  <!-- Tree silhouettes right -->
  <g fill="#060e1a" opacity="0.85">
    <polygon points="248,170 260,100 272,170"/>
    <polygon points="258,170 270,120 282,170"/>
    <polygon points="268,170 278,130 288,170"/>
    <rect x="256" y="155" width="8" height="15"/>
  </g>

  <!-- Wolf head — geometric minimalist construction -->
  <!-- Main skull/head shape -->
  <g filter="url(#wolfShadow)" clip-path="url(#viewClip)">

    <!-- Neck base -->
    <polygon points="128,172 140,148 160,148 172,172" fill="#1e2a38"/>

    <!-- Main head polygon -->
    <polygon points="108,148 120,96 150,82 180,96 192,148 150,158" fill="#1e2a38"/>

    <!-- Left ear -->
    <polygon points="116,110 112,72 138,96" fill="#1a2534"/>
    <!-- Left ear inner -->
    <polygon points="119,107 116,80 134,96" fill="#0d1624" opacity="0.6"/>

    <!-- Right ear -->
    <polygon points="184,110 188,72 162,96" fill="#1a2534"/>
    <!-- Right ear inner -->
    <polygon points="181,107 184,80 166,96" fill="#0d1624" opacity="0.6"/>

    <!-- Snout lower jaw area -->
    <polygon points="134,142 150,136 166,142 162,162 138,162" fill="#18232f"/>

    <!-- Snout muzzle -->
    <polygon points="136,130 150,122 164,130 162,148 138,148" fill="#202e3e"/>

    <!-- Nose tip -->
    <polygon points="144,122 150,116 156,122 150,126" fill="#0d1420"/>

    <!-- Howling open mouth — dark negative space -->
    <ellipse cx="150" cy="152" rx="9" ry="7" fill="#06090f"/>

    <!-- Cheekbone highlight planes -->
    <polygon points="114,130 126,120 132,138 118,142" fill="#243344" opacity="0.7"/>
    <polygon points="186,130 174,120 168,138 182,142" fill="#243344" opacity="0.7"/>

    <!-- Forehead plane highlight -->
    <polygon points="135,100 150,88 165,100 155,112 145,112" fill="#2a3c50" opacity="0.5"/>

  </g>

  <!-- Wolf eye — blue glow (LEFT eye, right from viewer) -->
  <g filter="url(#eyeBloom)">
    <ellipse cx="136" cy="118" rx="7" ry="5.5" fill="#0a1e35" opacity="0.9"/>
    <ellipse cx="136" cy="118" rx="5" ry="3.8" fill="url(#eyeGlow)"/>
    <ellipse cx="136" cy="118" rx="2.5" ry="2" fill="#8dd4ff" opacity="0.95"/>
    <ellipse cx="134.5" cy="117" rx="1" ry="0.8" fill="#ffffff" opacity="0.7"/>
  </g>

  <!-- Right eye — dark/closed (wolf hunting, one eye glowing) -->
  <ellipse cx="164" cy="118" rx="6" ry="4.5" fill="#0d1824" opacity="0.8"/>
  <ellipse cx="164" cy="118" rx="4" ry="2.8" fill="#152030" opacity="0.6"/>

  <!-- Ground / horizon line -->
  <rect x="0" y="168" width="300" height="32" fill="#06090f"/>

  <!-- Ground fog wisps -->
  <ellipse cx="60" cy="170" rx="50" ry="6" fill="#0d1828" opacity="0.6"/>
  <ellipse cx="240" cy="170" rx="50" ry="6" fill="#0d1828" opacity="0.6"/>
  <ellipse cx="150" cy="172" rx="80" ry="5" fill="#0f1e30" opacity="0.4"/>

  <!-- Wordmark: AGENTIC LEAD GEN -->
  <text
    x="150"
    y="187"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="10.5"
    font-weight="700"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="#4a9fd4"
    opacity="0.92">AGENTIC LEAD GEN</text>

  <!-- Thin separator lines flanking text -->
  <line x1="42" y1="183.5" x2="88" y2="183.5" stroke="#2a5a8a" stroke-width="0.5" opacity="0.6"/>
  <line x1="212" y1="183.5" x2="258" y2="183.5" stroke="#2a5a8a" stroke-width="0.5" opacity="0.6"/>

</svg>` },
  { id: 86, title: "Lens Aperture", concept: "camera aperture iris precision focus", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#050709"/>
    </radialGradient>

    <!-- Lens body gradient -->
    <radialGradient id="lensBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1f2e"/>
      <stop offset="60%" stop-color="#0f1420"/>
      <stop offset="100%" stop-color="#070a12"/>
    </radialGradient>

    <!-- Aperture glow gradient -->
    <radialGradient id="apertureGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="15%" stop-color="#a8d4ff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#4a9eff" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="#1a5fcc" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0a1a3a" stop-opacity="0"/>
    </radialGradient>

    <!-- Iris blade gradient -->
    <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a3148"/>
      <stop offset="50%" stop-color="#1c2235"/>
      <stop offset="100%" stop-color="#0e1220"/>
    </linearGradient>

    <linearGradient id="bladeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#323a55"/>
      <stop offset="50%" stop-color="#1e2438"/>
      <stop offset="100%" stop-color="#0e1220"/>
    </linearGradient>

    <!-- Outer ring gradient -->
    <linearGradient id="outerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3a4460"/>
      <stop offset="25%" stop-color="#4a5570"/>
      <stop offset="50%" stop-color="#2a3050"/>
      <stop offset="75%" stop-color="#1a2040"/>
      <stop offset="100%" stop-color="#3a4460"/>
    </linearGradient>

    <!-- Inner ring highlight -->
    <linearGradient id="innerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5a6888"/>
      <stop offset="50%" stop-color="#2a3450"/>
      <stop offset="100%" stop-color="#5a6888"/>
    </linearGradient>

    <!-- Blade edge highlight -->
    <linearGradient id="bladeEdge" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4a5878" stop-opacity="0"/>
      <stop offset="50%" stop-color="#6a7898" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#4a5878" stop-opacity="0"/>
    </linearGradient>

    <!-- Glow filter -->
    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Center glow filter -->
    <filter id="centerGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Soft glow -->
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Clip for lens -->
    <clipPath id="lensClip">
      <circle cx="115" cy="95" r="78"/>
    </clipPath>

    <!-- Text gradient -->
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6a85b0"/>
      <stop offset="40%" stop-color="#9ab5d8"/>
      <stop offset="100%" stop-color="#6a85b0"/>
    </linearGradient>

    <!-- Accent text gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4a9eff"/>
      <stop offset="50%" stop-color="#88ccff"/>
      <stop offset="100%" stop-color="#4a9eff"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- === LENS BODY === -->
  <!-- Outer ring shadow/glow -->
  <circle cx="115" cy="95" r="81" fill="none" stroke="#4a9eff" stroke-width="0.5" opacity="0.15" filter="url(#glowFilter)"/>

  <!-- Outer lens barrel -->
  <circle cx="115" cy="95" r="80" fill="url(#lensBody)" stroke="url(#outerRingGrad)" stroke-width="3"/>

  <!-- Outer ring texture ticks -->
  <g stroke="#3a4460" stroke-width="1" opacity="0.6">
    <line x1="115" y1="15.5" x2="115" y2="19.5"/>
    <line x1="115" y1="170.5" x2="115" y2="174.5"/>
    <line x1="35.5" y1="95" x2="39.5" y2="95"/>
    <line x1="190.5" y1="95" x2="194.5" y2="95"/>
    <!-- diagonal ticks -->
    <line x1="60" y1="40" x2="62.8" y2="43.9"/>
    <line x1="170" y1="40" x2="167.2" y2="43.9"/>
    <line x1="60" y1="150" x2="62.8" y2="146.1"/>
    <line x1="170" y1="150" x2="167.2" y2="146.1"/>
  </g>

  <!-- Depth ring 1 -->
  <circle cx="115" cy="95" r="76" fill="none" stroke="#1a2035" stroke-width="2"/>
  <!-- Depth ring 2 -->
  <circle cx="115" cy="95" r="73" fill="none" stroke="url(#innerRingGrad)" stroke-width="1.5"/>
  <!-- Depth ring 3 inner barrel -->
  <circle cx="115" cy="95" r="69" fill="#0a0d18" stroke="#141828" stroke-width="1"/>

  <!-- === IRIS BLADES (7-blade aperture) === -->
  <!-- Each blade is a curved polygon forming part of the iris -->
  <!-- Blade 1 — top -->
  <path d="M115,95 L101,31 Q115,26 129,31 Z" fill="url(#bladeGrad1)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>
  <!-- Blade 2 — upper right -->
  <path d="M115,95 L168,44 Q178,57 174,72 Z" fill="url(#bladeGrad2)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>
  <!-- Blade 3 — lower right -->
  <path d="M115,95 L183,128 Q177,143 163,149 Z" fill="url(#bladeGrad1)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>
  <!-- Blade 4 — bottom right -->
  <path d="M115,95 L129,159 Q115,164 101,159 Z" fill="url(#bladeGrad2)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>
  <!-- Blade 5 — bottom left -->
  <path d="M115,95 L62,149 Q48,143 47,128 Z" fill="url(#bladeGrad1)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>
  <!-- Blade 6 — upper left -->
  <path d="M115,95 L56,72 Q52,57 62,44 Z" fill="url(#bladeGrad2)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>
  <!-- Blade 7 — top left -->
  <path d="M115,95 L101,31 Q88,38 80,50 Z" fill="url(#bladeGrad1)" stroke="#2a3250" stroke-width="0.8" clip-path="url(#lensClip)"/>

  <!-- Blade edge highlights (metallic sheen) -->
  <path d="M115,95 L101,31 Q115,26 129,31 Z" fill="none" stroke="#4a5870" stroke-width="0.5" opacity="0.7" clip-path="url(#lensClip)"/>
  <path d="M115,95 L168,44 Q178,57 174,72 Z" fill="none" stroke="#4a5870" stroke-width="0.5" opacity="0.5" clip-path="url(#lensClip)"/>
  <path d="M115,95 L183,128 Q177,143 163,149 Z" fill="none" stroke="#4a5870" stroke-width="0.5" opacity="0.7" clip-path="url(#lensClip)"/>
  <path d="M115,95 L129,159 Q115,164 101,159 Z" fill="none" stroke="#4a5870" stroke-width="0.5" opacity="0.5" clip-path="url(#lensClip)"/>
  <path d="M115,95 L62,149 Q48,143 47,128 Z" fill="none" stroke="#4a5870" stroke-width="0.5" opacity="0.7" clip-path="url(#lensClip)"/>
  <path d="M115,95 L56,72 Q52,57 62,44 Z" fill="none" stroke="#4a5870" stroke-width="0.5" opacity="0.5" clip-path="url(#lensClip)"/>

  <!-- Inner aperture ring -->
  <circle cx="115" cy="95" r="28" fill="#050810" stroke="#1a2540" stroke-width="1.5"/>

  <!-- Aperture opening glow layers -->
  <circle cx="115" cy="95" r="26" fill="url(#apertureGlow)" filter="url(#centerGlow)"/>
  <circle cx="115" cy="95" r="20" fill="#4a9eff" opacity="0.3" filter="url(#softGlow)"/>
  <circle cx="115" cy="95" r="14" fill="#88ccff" opacity="0.5" filter="url(#softGlow)"/>
  <circle cx="115" cy="95" r="8" fill="#ffffff" opacity="0.9"/>
  <circle cx="115" cy="95" r="5" fill="#ffffff"/>

  <!-- Lens flare accent -->
  <line x1="109" y1="89" x2="104" y2="84" stroke="#ffffff" stroke-width="0.8" opacity="0.4"/>
  <circle cx="103" cy="83" r="1.5" fill="#ffffff" opacity="0.3"/>

  <!-- Inner aperture rim highlight -->
  <circle cx="115" cy="95" r="27" fill="none" stroke="#3a6aaa" stroke-width="0.8" opacity="0.6"/>

  <!-- Targeting crosshair (subtle) -->
  <line x1="115" y1="82" x2="115" y2="85" stroke="#4a9eff" stroke-width="0.8" opacity="0.5"/>
  <line x1="115" y1="105" x2="115" y2="108" stroke="#4a9eff" stroke-width="0.8" opacity="0.5"/>
  <line x1="102" y1="95" x2="105" y2="95" stroke="#4a9eff" stroke-width="0.8" opacity="0.5"/>
  <line x1="125" y1="95" x2="128" y2="95" stroke="#4a9eff" stroke-width="0.8" opacity="0.5"/>

  <!-- === TEXT === -->
  <!-- "AGENTIC" label -->
  <text x="210" y="78" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="url(#accentGrad)" text-anchor="middle">AGENTIC</text>

  <!-- Divider line -->
  <line x1="165" y1="86" x2="255" y2="86" stroke="#2a4060" stroke-width="0.8" opacity="0.8"/>

  <!-- "LEAD GEN" label -->
  <text x="210" y="105" font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="400" letter-spacing="3.5" fill="url(#textGrad)" text-anchor="middle">LEAD GEN</text>

  <!-- Tagline -->
  <text x="210" y="122" font-family="'Helvetica Neue', Arial, sans-serif" font-size="7.5" font-weight="300" letter-spacing="2.5" fill="#3a5070" text-anchor="middle">PRECISION PROSPECT TARGETING</text>

  <!-- Bottom accent line -->
  <line x1="165" y1="128" x2="255" y2="128" stroke="#1a3050" stroke-width="0.6" opacity="0.6"/>

  <!-- Tech dots decoration -->
  <circle cx="168" cy="140" r="1.2" fill="#2a4a6a"/>
  <circle cx="173" cy="140" r="1.2" fill="#3a5a7a"/>
  <circle cx="178" cy="140" r="1.2" fill="#4a9eff" opacity="0.8"/>
  <circle cx="183" cy="140" r="1.2" fill="#3a5a7a"/>
  <circle cx="188" cy="140" r="1.2" fill="#2a4a6a"/>

  <!-- Bottom brand rule -->
  <rect x="165" y="148" width="90" height="0.5" fill="url(#accentGrad)" opacity="0.25"/>
</svg>` },
  { id: 87, title: "Signal Tower", concept: "radio tower broadcasting channels", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0c29;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#302b63;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#24243e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="arcGlow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background sky -->
  <rect width="300" height="200" fill="url(#skyGrad)"/>

  <!-- Ground strip -->
  <rect x="0" y="170" width="300" height="30" fill="url(#groundGrad)"/>

  <!-- Stars -->
  <circle cx="20" cy="15" r="0.8" fill="white" opacity="0.7"/>
  <circle cx="55" cy="30" r="0.6" fill="white" opacity="0.5"/>
  <circle cx="80" cy="10" r="1" fill="white" opacity="0.8"/>
  <circle cx="110" cy="25" r="0.6" fill="white" opacity="0.4"/>
  <circle cx="200" cy="12" r="0.8" fill="white" opacity="0.6"/>
  <circle cx="230" cy="28" r="0.6" fill="white" opacity="0.5"/>
  <circle cx="260" cy="8" r="1" fill="white" opacity="0.7"/>
  <circle cx="285" cy="22" r="0.7" fill="white" opacity="0.5"/>
  <circle cx="40" cy="50" r="0.5" fill="white" opacity="0.4"/>
  <circle cx="270" cy="45" r="0.5" fill="white" opacity="0.4"/>

  <!-- Broadcast arcs — left side (concentric, different colors) -->
  <!-- Channel 1: Cyan/Teal - innermost left -->
  <path d="M 150 88 A 22 22 0 0 0 128 110" stroke="#00e5ff" stroke-width="2.2" fill="none" opacity="0.9" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 2: Purple - second left -->
  <path d="M 150 88 A 38 38 0 0 0 112 126" stroke="#b44fff" stroke-width="2" fill="none" opacity="0.85" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 3: Pink/Magenta - third left -->
  <path d="M 150 88 A 55 55 0 0 0 95 143" stroke="#ff4fa3" stroke-width="1.8" fill="none" opacity="0.75" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 4: Orange - fourth left -->
  <path d="M 150 88 A 72 72 0 0 0 78 160" stroke="#ff8c42" stroke-width="1.5" fill="none" opacity="0.65" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 5: Yellow - outermost left -->
  <path d="M 150 88 A 90 90 0 0 0 60 178" stroke="#ffe040" stroke-width="1.2" fill="none" opacity="0.5" filter="url(#arcGlow)" stroke-linecap="round"/>

  <!-- Broadcast arcs — right side (concentric, different colors) -->
  <!-- Channel 1: Cyan/Teal - innermost right -->
  <path d="M 150 88 A 22 22 0 0 1 172 110" stroke="#00e5ff" stroke-width="2.2" fill="none" opacity="0.9" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 2: Purple - second right -->
  <path d="M 150 88 A 38 38 0 0 1 188 126" stroke="#b44fff" stroke-width="2" fill="none" opacity="0.85" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 3: Pink/Magenta - third right -->
  <path d="M 150 88 A 55 55 0 0 1 205 143" stroke="#ff4fa3" stroke-width="1.8" fill="none" opacity="0.75" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 4: Orange - fourth right -->
  <path d="M 150 88 A 72 72 0 0 1 222 160" stroke="#ff8c42" stroke-width="1.5" fill="none" opacity="0.65" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 5: Yellow - outermost right -->
  <path d="M 150 88 A 90 90 0 0 1 240 178" stroke="#ffe040" stroke-width="1.2" fill="none" opacity="0.5" filter="url(#arcGlow)" stroke-linecap="round"/>

  <!-- Broadcast arcs — upward (top arcs) -->
  <!-- Channel 1: Cyan - innermost top -->
  <path d="M 128 88 A 22 22 0 0 1 172 88" stroke="#00e5ff" stroke-width="2.2" fill="none" opacity="0.9" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 2: Purple - second top -->
  <path d="M 112 88 A 38 38 0 0 1 188 88" stroke="#b44fff" stroke-width="2" fill="none" opacity="0.85" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 3: Pink - third top -->
  <path d="M 95 88 A 55 55 0 0 1 205 88" stroke="#ff4fa3" stroke-width="1.8" fill="none" opacity="0.75" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 4: Orange - fourth top -->
  <path d="M 78 88 A 72 72 0 0 1 222 88" stroke="#ff8c42" stroke-width="1.5" fill="none" opacity="0.65" filter="url(#arcGlow)" stroke-linecap="round"/>
  <!-- Channel 5: Yellow - outermost top -->
  <path d="M 60 88 A 90 90 0 0 1 240 88" stroke="#ffe040" stroke-width="1.2" fill="none" opacity="0.5" filter="url(#arcGlow)" stroke-linecap="round"/>

  <!-- Tower base legs -->
  <polygon points="150,88 138,170 162,170" fill="#1a1a2e" stroke="#2d2d5e" stroke-width="0.5"/>

  <!-- Tower cross-braces -->
  <line x1="141" y1="105" x2="159" y2="105" stroke="#2d2d5e" stroke-width="1.2"/>
  <line x1="139.5" y1="118" x2="160.5" y2="118" stroke="#2d2d5e" stroke-width="1.2"/>
  <line x1="138" y1="131" x2="162" y2="131" stroke="#2d2d5e" stroke-width="1.2"/>
  <line x1="136.5" y1="144" x2="163.5" y2="144" stroke="#2d2d5e" stroke-width="1.2"/>
  <line x1="135" y1="157" x2="165" y2="157" stroke="#2d2d5e" stroke-width="1.2"/>

  <!-- Tower diagonal braces -->
  <line x1="141" y1="105" x2="139.5" y2="118" stroke="#2d2d5e" stroke-width="0.8" opacity="0.8"/>
  <line x1="159" y1="105" x2="160.5" y2="118" stroke="#2d2d5e" stroke-width="0.8" opacity="0.8"/>
  <line x1="139.5" y1="118" x2="141" y2="105" stroke="#2d2d5e" stroke-width="0.8" opacity="0.5"/>

  <!-- Tower main shaft (dark silhouette) -->
  <rect x="148" y="30" width="4" height="60" fill="#1a1a2e" stroke="#2a2a4e" stroke-width="0.5"/>

  <!-- Tower top platform -->
  <rect x="143" y="85" width="14" height="5" rx="1" fill="#16213e" stroke="#2d2d5e" stroke-width="0.8"/>

  <!-- Tower top antenna tip -->
  <rect x="149.2" y="18" width="1.6" height="14" fill="#1a1a2e"/>
  <circle cx="150" cy="17" r="2.5" fill="#1a1a2e"/>

  <!-- Beacon pulse at tip -->
  <circle cx="150" cy="17" r="3.5" fill="none" stroke="#00e5ff" stroke-width="1" opacity="0.7" filter="url(#glow)"/>
  <circle cx="150" cy="17" r="5" fill="none" stroke="#00e5ff" stroke-width="0.6" opacity="0.4" filter="url(#glow)"/>

  <!-- Tip dot -->
  <circle cx="150" cy="17" r="1.5" fill="#00e5ff" opacity="0.95" filter="url(#glow)"/>

  <!-- Ground base platform -->
  <rect x="134" y="168" width="32" height="4" rx="1" fill="#16213e" stroke="#2d2d5e" stroke-width="0.8"/>

  <!-- Text: Agentic Lead Gen -->
  <text x="150" y="190" font-family="'Arial', 'Helvetica', sans-serif" font-size="11" font-weight="700" fill="#e0e0ff" text-anchor="middle" letter-spacing="2" opacity="0.95">AGENTIC LEAD GEN</text>

  <!-- Subtle tagline -->
  <text x="150" y="200" font-family="'Arial', 'Helvetica', sans-serif" font-size="5.5" fill="#7070a0" text-anchor="middle" letter-spacing="1.5" opacity="0.7">MULTI-CHANNEL SIGNAL</text>
</svg>` },
  { id: 88, title: "Quantum Dots", concept: "particle swarm forming ALG letters", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#050d12"/>
      <stop offset="100%" stop-color="#020608"/>
    </radialGradient>

    <!-- Teal core glow -->
    <radialGradient id="dotTeal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="40%" stop-color="#7fffd4" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#00e5cc" stop-opacity="0"/>
    </radialGradient>

    <!-- White-hot center -->
    <radialGradient id="dotWhite" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="50%" stop-color="#b2fff0" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#00d4b8" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer scatter dot -->
    <radialGradient id="dotOuter" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#40e8cc" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#00a896" stop-opacity="0"/>
    </radialGradient>

    <!-- Dim drift dot -->
    <radialGradient id="dotDim" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#20c8b0" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#008070" stop-opacity="0"/>
    </radialGradient>

    <!-- Letter glow bloom -->
    <filter id="glowBloom" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur2"/>
      <feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Soft particle bloom -->
    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Tiny dot filter -->
    <filter id="tinyGlow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.0"/>
    </filter>

    <!-- Letter A particle dot cluster -->
    <symbol id="letterA_dots">
      <!-- Spine left -->
      <circle cx="28" cy="72" r="1.5" fill="url(#dotTeal)"/>
      <circle cx="30" cy="64" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="32" cy="56" r="1.4" fill="url(#dotWhite)"/>
      <circle cx="34" cy="48" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="36" cy="40" r="1.5" fill="url(#dotWhite)"/>
      <circle cx="38" cy="32" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="40" cy="24" r="1.4" fill="url(#dotWhite)"/>
      <!-- Spine right -->
      <circle cx="52" cy="72" r="1.5" fill="url(#dotTeal)"/>
      <circle cx="50" cy="64" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="48" cy="56" r="1.4" fill="url(#dotWhite)"/>
      <circle cx="46" cy="48" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="44" cy="40" r="1.5" fill="url(#dotWhite)"/>
      <circle cx="42" cy="32" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="40" cy="24" r="1.4" fill="url(#dotWhite)"/>
      <!-- Crossbar -->
      <circle cx="33" cy="52" r="1.2" fill="url(#dotTeal)"/>
      <circle cx="36" cy="52" r="1.4" fill="url(#dotWhite)"/>
      <circle cx="39" cy="52" r="1.3" fill="url(#dotTeal)"/>
      <circle cx="42" cy="52" r="1.4" fill="url(#dotWhite)"/>
      <circle cx="45" cy="52" r="1.2" fill="url(#dotTeal)"/>
      <circle cx="47" cy="52" r="1.1" fill="url(#dotTeal)"/>
    </symbol>

  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- ============================================================ -->
  <!-- SCATTERED FIELD PARTICLES — outer drift cloud                -->
  <!-- ============================================================ -->
  <g filter="url(#tinyGlow)" opacity="0.55">
    <!-- Far-field scatter -->
    <circle cx="8"   cy="15"  r="0.8" fill="#00e5cc"/>
    <circle cx="18"  cy="9"   r="0.6" fill="#40e8cc"/>
    <circle cx="30"  cy="4"   r="0.7" fill="#00d4b8"/>
    <circle cx="45"  cy="12"  r="0.9" fill="#7fffd4"/>
    <circle cx="58"  cy="6"   r="0.6" fill="#00e5cc"/>
    <circle cx="70"  cy="18"  r="0.8" fill="#40e8cc"/>
    <circle cx="84"  cy="8"   r="0.7" fill="#00d4b8"/>
    <circle cx="95"  cy="3"   r="0.6" fill="#7fffd4"/>
    <circle cx="108" cy="14"  r="0.9" fill="#00e5cc"/>
    <circle cx="120" cy="7"   r="0.7" fill="#40e8cc"/>
    <circle cx="135" cy="11"  r="0.8" fill="#00d4b8"/>
    <circle cx="148" cy="5"   r="0.6" fill="#7fffd4"/>
    <circle cx="162" cy="16"  r="0.7" fill="#00e5cc"/>
    <circle cx="175" cy="9"   r="0.9" fill="#40e8cc"/>
    <circle cx="188" cy="4"   r="0.6" fill="#00d4b8"/>
    <circle cx="200" cy="13"  r="0.8" fill="#7fffd4"/>
    <circle cx="215" cy="7"   r="0.7" fill="#00e5cc"/>
    <circle cx="228" cy="17"  r="0.6" fill="#40e8cc"/>
    <circle cx="242" cy="5"   r="0.9" fill="#00d4b8"/>
    <circle cx="255" cy="12"  r="0.7" fill="#7fffd4"/>
    <circle cx="268" cy="8"   r="0.6" fill="#00e5cc"/>
    <circle cx="280" cy="15"  r="0.8" fill="#40e8cc"/>
    <circle cx="293" cy="6"   r="0.7" fill="#00d4b8"/>
    <!-- Bottom scatter -->
    <circle cx="5"   cy="185" r="0.8" fill="#00e5cc"/>
    <circle cx="20"  cy="192" r="0.6" fill="#40e8cc"/>
    <circle cx="38"  cy="188" r="0.7" fill="#00d4b8"/>
    <circle cx="52"  cy="195" r="0.9" fill="#7fffd4"/>
    <circle cx="67"  cy="183" r="0.6" fill="#00e5cc"/>
    <circle cx="80"  cy="191" r="0.8" fill="#40e8cc"/>
    <circle cx="96"  cy="186" r="0.7" fill="#00d4b8"/>
    <circle cx="112" cy="193" r="0.6" fill="#7fffd4"/>
    <circle cx="128" cy="182" r="0.9" fill="#00e5cc"/>
    <circle cx="145" cy="190" r="0.7" fill="#40e8cc"/>
    <circle cx="160" cy="185" r="0.8" fill="#00d4b8"/>
    <circle cx="178" cy="194" r="0.6" fill="#7fffd4"/>
    <circle cx="195" cy="183" r="0.7" fill="#00e5cc"/>
    <circle cx="210" cy="189" r="0.9" fill="#40e8cc"/>
    <circle cx="226" cy="186" r="0.6" fill="#00d4b8"/>
    <circle cx="245" cy="192" r="0.8" fill="#7fffd4"/>
    <circle cx="260" cy="184" r="0.7" fill="#00e5cc"/>
    <circle cx="275" cy="190" r="0.6" fill="#40e8cc"/>
    <circle cx="290" cy="186" r="0.9" fill="#00d4b8"/>
    <!-- Left edge -->
    <circle cx="3"   cy="32"  r="0.7" fill="#00e5cc"/>
    <circle cx="7"   cy="52"  r="0.8" fill="#40e8cc"/>
    <circle cx="4"   cy="70"  r="0.6" fill="#00d4b8"/>
    <circle cx="9"   cy="90"  r="0.9" fill="#7fffd4"/>
    <circle cx="3"   cy="110" r="0.7" fill="#00e5cc"/>
    <circle cx="8"   cy="130" r="0.8" fill="#40e8cc"/>
    <circle cx="5"   cy="150" r="0.6" fill="#00d4b8"/>
    <circle cx="10"  cy="168" r="0.7" fill="#7fffd4"/>
    <!-- Right edge -->
    <circle cx="296" cy="35"  r="0.7" fill="#00e5cc"/>
    <circle cx="292" cy="55"  r="0.8" fill="#40e8cc"/>
    <circle cx="297" cy="75"  r="0.6" fill="#00d4b8"/>
    <circle cx="293" cy="95"  r="0.9" fill="#7fffd4"/>
    <circle cx="298" cy="115" r="0.7" fill="#00e5cc"/>
    <circle cx="294" cy="135" r="0.8" fill="#40e8cc"/>
    <circle cx="297" cy="155" r="0.6" fill="#00d4b8"/>
    <circle cx="292" cy="172" r="0.7" fill="#7fffd4"/>
  </g>

  <!-- ============================================================ -->
  <!-- MID-FIELD ORBITAL PARTICLES — converging toward letters      -->
  <!-- ============================================================ -->
  <g filter="url(#softGlow)" opacity="0.75">

    <!-- Converging toward A (center ~x=40) -->
    <circle cx="14"  cy="95"  r="1.1" fill="#00e5cc"/>
    <circle cx="18"  cy="108" r="0.9" fill="#40e8cc"/>
    <circle cx="12"  cy="82"  r="1.0" fill="#7fffd4"/>
    <circle cx="22"  cy="118" r="1.2" fill="#00d4b8"/>
    <circle cx="16"  cy="70"  r="0.8" fill="#00e5cc"/>
    <circle cx="26"  cy="130" r="1.0" fill="#40e8cc"/>
    <circle cx="20"  cy="60"  r="1.1" fill="#7fffd4"/>
    <circle cx="60"  cy="90"  r="1.0" fill="#00e5cc"/>
    <circle cx="64"  cy="105" r="0.9" fill="#40e8cc"/>
    <circle cx="58"  cy="75"  r="1.1" fill="#7fffd4"/>
    <circle cx="66"  cy="118" r="1.0" fill="#00d4b8"/>
    <circle cx="55"  cy="62"  r="0.8" fill="#00e5cc"/>
    <circle cx="68"  cy="130" r="1.2" fill="#40e8cc"/>

    <!-- Converging toward L (center ~x=130) -->
    <circle cx="82"  cy="88"  r="1.1" fill="#00e5cc"/>
    <circle cx="85"  cy="103" r="0.9" fill="#40e8cc"/>
    <circle cx="78"  cy="75"  r="1.0" fill="#7fffd4"/>
    <circle cx="88"  cy="118" r="1.2" fill="#00d4b8"/>
    <circle cx="80"  cy="62"  r="0.8" fill="#00e5cc"/>
    <circle cx="170" cy="90"  r="1.0" fill="#00e5cc"/>
    <circle cx="174" cy="108" r="0.9" fill="#40e8cc"/>
    <circle cx="167" cy="75"  r="1.1" fill="#7fffd4"/>
    <circle cx="176" cy="120" r="1.0" fill="#00d4b8"/>
    <circle cx="164" cy="62"  r="0.8" fill="#00e5cc"/>
    <circle cx="178" cy="133" r="1.2" fill="#40e8cc"/>

    <!-- Converging toward G (center ~x=230) -->
    <circle cx="192" cy="88"  r="1.1" fill="#00e5cc"/>
    <circle cx="196" cy="103" r="0.9" fill="#40e8cc"/>
    <circle cx="189" cy="75"  r="1.0" fill="#7fffd4"/>
    <circle cx="198" cy="118" r="1.2" fill="#00d4b8"/>
    <circle cx="186" cy="62"  r="0.8" fill="#00e5cc"/>
    <circle cx="270" cy="88"  r="1.0" fill="#00e5cc"/>
    <circle cx="274" cy="105" r="0.9" fill="#40e8cc"/>
    <circle cx="267" cy="75"  r="1.1" fill="#7fffd4"/>
    <circle cx="276" cy="120" r="1.0" fill="#00d4b8"/>
    <circle cx="264" cy="62"  r="0.8" fill="#00e5cc"/>
    <circle cx="278" cy="133" r="1.2" fill="#40e8cc"/>
  </g>

  <!-- ============================================================ -->
  <!-- LETTER A — dense particle cluster                            -->
  <!-- ============================================================ -->
  <g filter="url(#glowBloom)">
    <!-- Left stroke of A -->
    <circle cx="26"  cy="130" r="2.2" fill="url(#dotTeal)"/>
    <circle cx="28"  cy="122" r="2.0" fill="url(#dotWhite)"/>
    <circle cx="30"  cy="114" r="2.3" fill="url(#dotTeal)"/>
    <circle cx="32"  cy="106" r="2.1" fill="url(#dotWhite)"/>
    <circle cx="33"  cy="98"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="35"  cy="90"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="36"  cy="82"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="38"  cy="74"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="39"  cy="66"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="41"  cy="58"  r="2.0" fill="url(#dotWhite)"/>
    <!-- Peak of A -->
    <circle cx="52"  cy="50"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="54"  cy="42"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="56"  cy="34"  r="2.4" fill="url(#dotWhite)"/>
    <circle cx="58"  cy="26"  r="2.2" fill="url(#dotTeal)"/>
    <!-- Right stroke of A -->
    <circle cx="64"  cy="34"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="66"  cy="42"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="68"  cy="50"  r="2.0" fill="url(#dotTeal)"/>
    <circle cx="70"  cy="58"  r="2.2" fill="url(#dotWhite)"/>
    <circle cx="71"  cy="66"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="73"  cy="74"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="74"  cy="82"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="76"  cy="90"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="77"  cy="98"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="79"  cy="106" r="2.1" fill="url(#dotWhite)"/>
    <circle cx="80"  cy="114" r="2.2" fill="url(#dotTeal)"/>
    <circle cx="82"  cy="122" r="2.0" fill="url(#dotWhite)"/>
    <circle cx="83"  cy="130" r="2.2" fill="url(#dotTeal)"/>
    <!-- Crossbar of A -->
    <circle cx="44"  cy="90"  r="1.9" fill="url(#dotTeal)"/>
    <circle cx="48"  cy="90"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="52"  cy="90"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="56"  cy="90"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="60"  cy="90"  r="2.1" fill="url(#dotTeal)"/>
    <circle cx="64"  cy="90"  r="1.9" fill="url(#dotWhite)"/>
    <circle cx="68"  cy="90"  r="2.0" fill="url(#dotTeal)"/>
    <!-- Extra density nodes -->
    <circle cx="43"  cy="118" r="1.5" fill="url(#dotOuter)"/>
    <circle cx="47"  cy="112" r="1.6" fill="url(#dotOuter)"/>
    <circle cx="51"  cy="106" r="1.5" fill="url(#dotOuter)"/>
    <circle cx="63"  cy="112" r="1.6" fill="url(#dotOuter)"/>
    <circle cx="67"  cy="106" r="1.5" fill="url(#dotOuter)"/>
    <circle cx="71"  cy="118" r="1.4" fill="url(#dotOuter)"/>
  </g>

  <!-- ============================================================ -->
  <!-- LETTER L — dense particle cluster                            -->
  <!-- ============================================================ -->
  <g filter="url(#glowBloom)">
    <!-- Vertical stroke -->
    <circle cx="108" cy="26"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="108" cy="34"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="108" cy="42"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="108" cy="50"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="108" cy="58"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="108" cy="66"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="108" cy="74"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="108" cy="82"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="108" cy="90"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="108" cy="98"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="108" cy="106" r="2.3" fill="url(#dotTeal)"/>
    <circle cx="108" cy="114" r="2.1" fill="url(#dotWhite)"/>
    <circle cx="108" cy="122" r="2.2" fill="url(#dotTeal)"/>
    <circle cx="108" cy="130" r="2.0" fill="url(#dotWhite)"/>
    <!-- Horizontal base -->
    <circle cx="116" cy="130" r="2.1" fill="url(#dotTeal)"/>
    <circle cx="124" cy="130" r="2.2" fill="url(#dotWhite)"/>
    <circle cx="132" cy="130" r="2.0" fill="url(#dotTeal)"/>
    <circle cx="140" cy="130" r="2.3" fill="url(#dotWhite)"/>
    <circle cx="148" cy="130" r="2.1" fill="url(#dotTeal)"/>
    <circle cx="156" cy="130" r="2.0" fill="url(#dotWhite)"/>
    <!-- Corner density -->
    <circle cx="114" cy="122" r="1.5" fill="url(#dotOuter)"/>
    <circle cx="120" cy="126" r="1.6" fill="url(#dotOuter)"/>
  </g>

  <!-- ============================================================ -->
  <!-- LETTER G — dense particle cluster                            -->
  <!-- ============================================================ -->
  <g filter="url(#glowBloom)">
    <!-- Top arc of G -->
    <circle cx="230" cy="26"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="220" cy="28"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="212" cy="33"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="205" cy="40"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="200" cy="48"  r="2.2" fill="url(#dotTeal)"/>
    <!-- Left stroke -->
    <circle cx="197" cy="58"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="196" cy="68"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="196" cy="78"  r="2.1" fill="url(#dotWhite)"/>
    <circle cx="196" cy="88"  r="2.2" fill="url(#dotTeal)"/>
    <circle cx="197" cy="98"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="199" cy="108" r="2.3" fill="url(#dotTeal)"/>
    <!-- Bottom arc of G -->
    <circle cx="204" cy="118" r="2.1" fill="url(#dotWhite)"/>
    <circle cx="212" cy="125" r="2.2" fill="url(#dotTeal)"/>
    <circle cx="221" cy="130" r="2.0" fill="url(#dotWhite)"/>
    <circle cx="231" cy="130" r="2.3" fill="url(#dotTeal)"/>
    <circle cx="241" cy="128" r="2.1" fill="url(#dotWhite)"/>
    <circle cx="250" cy="124" r="2.2" fill="url(#dotTeal)"/>
    <!-- Horizontal spur of G -->
    <circle cx="258" cy="118" r="2.0" fill="url(#dotWhite)"/>
    <circle cx="262" cy="110" r="2.3" fill="url(#dotTeal)"/>
    <circle cx="263" cy="100" r="2.1" fill="url(#dotWhite)"/>
    <circle cx="263" cy="90"  r="2.2" fill="url(#dotTeal)"/>
    <!-- Inner spur end cap -->
    <circle cx="255" cy="90"  r="2.0" fill="url(#dotWhite)"/>
    <circle cx="247" cy="90"  r="2.3" fill="url(#dotTeal)"/>
    <circle cx="239" cy="90"  r="2.1" fill="url(#dotWhite)"/>
    <!-- Top right of G -->
    <circle cx="242" cy="30"  r="2.2" fill="url(#dotWhite)"/>
    <circle cx="252" cy="36"  r="2.0" fill="url(#dotTeal)"/>
    <circle cx="259" cy="44"  r="2.3" fill="url(#dotWhite)"/>
    <circle cx="263" cy="54"  r="2.1" fill="url(#dotTeal)"/>
    <!-- Density extras on G arc -->
    <circle cx="206" cy="36"  r="1.5" fill="url(#dotOuter)"/>
    <circle cx="210" cy="130" r="1.6" fill="url(#dotOuter)"/>
    <circle cx="240" cy="120" r="1.5" fill="url(#dotOuter)"/>
    <circle cx="256" cy="48"  r="1.4" fill="url(#dotOuter)"/>
  </g>

  <!-- ============================================================ -->
  <!-- NEAR-LETTER CORONA — particles just outside the letterforms  -->
  <!-- ============================================================ -->
  <g filter="url(#softGlow)" opacity="0.85">
    <!-- A corona -->
    <circle cx="22"  cy="140" r="1.4" fill="#00e5cc"/>
    <circle cx="32"  cy="142" r="1.2" fill="#40e8cc"/>
    <circle cx="55"  cy="20"  r="1.3" fill="#7fffd4"/>
    <circle cx="62"  cy="18"  r="1.1" fill="#00e5cc"/>
    <circle cx="87"  cy="138" r="1.4" fill="#40e8cc"/>
    <circle cx="77"  cy="142" r="1.2" fill="#00d4b8"/>
    <circle cx="19"  cy="126" r="1.0" fill="#00e5cc"/>
    <circle cx="88"  cy="125" r="1.1" fill="#40e8cc"/>
    <circle cx="36"  cy="22"  r="1.2" fill="#7fffd4"/>
    <circle cx="74"  cy="22"  r="1.0" fill="#00e5cc"/>
    <!-- L corona -->
    <circle cx="103" cy="20"  r="1.3" fill="#00e5cc"/>
    <circle cx="114" cy="22"  r="1.1" fill="#40e8cc"/>
    <circle cx="103" cy="136" r="1.4" fill="#7fffd4"/>
    <circle cx="160" cy="136" r="1.2" fill="#00e5cc"/>
    <circle cx="164" cy="128" r="1.0" fill="#40e8cc"/>
    <circle cx="100" cy="110" r="1.1" fill="#00d4b8"/>
    <!-- G corona -->
    <circle cx="226" cy="18"  r="1.3" fill="#00e5cc"/>
    <circle cx="248" cy="20"  r="1.1" fill="#40e8cc"/>
    <circle cx="268" cy="35"  r="1.4" fill="#7fffd4"/>
    <circle cx="270" cy="62"  r="1.2" fill="#00e5cc"/>
    <circle cx="270" cy="96"  r="1.0" fill="#40e8cc"/>
    <circle cx="256" cy="136" r="1.3" fill="#00d4b8"/>
    <circle cx="226" cy="138" r="1.2" fill="#7fffd4"/>
    <circle cx="193" cy="116" r="1.1" fill="#00e5cc"/>
    <circle cx="191" cy="45"  r="1.4" fill="#40e8cc"/>
    <circle cx="236" cy="92"  r="1.2" fill="#7fffd4"/>
    <circle cx="268" cy="88"  r="1.0" fill="#00e5cc"/>
  </g>

  <!-- ============================================================ -->
  <!-- MICRO SPARKLE LAYER — sub-pixel quantum noise                -->
  <!-- ============================================================ -->
  <g opacity="0.6">
    <circle cx="35"  cy="145" r="0.7" fill="#7fffd4"/>
    <circle cx="55"  cy="148" r="0.6" fill="#00e5cc"/>
    <circle cx="70"  cy="143" r="0.8" fill="#40e8cc"/>
    <circle cx="100" cy="147" r="0.7" fill="#7fffd4"/>
    <circle cx="118" cy="144" r="0.6" fill="#00d4b8"/>
    <circle cx="140" cy="148" r="0.8" fill="#00e5cc"/>
    <circle cx="158" cy="145" r="0.7" fill="#40e8cc"/>
    <circle cx="185" cy="147" r="0.6" fill="#7fffd4"/>
    <circle cx="205" cy="144" r="0.8" fill="#00d4b8"/>
    <circle cx="222" cy="148" r="0.7" fill="#00e5cc"/>
    <circle cx="248" cy="146" r="0.6" fill="#40e8cc"/>
    <circle cx="268" cy="144" r="0.8" fill="#7fffd4"/>
    <circle cx="285" cy="148" r="0.7" fill="#00d4b8"/>
    <!-- Floating motes -->
    <circle cx="48"  cy="155" r="0.6" fill="#00e5cc"/>
    <circle cx="92"  cy="158" r="0.7" fill="#40e8cc"/>
    <circle cx="130" cy="155" r="0.6" fill="#7fffd4"/>
    <circle cx="172" cy="158" r="0.8" fill="#00d4b8"/>
    <circle cx="214" cy="155" r="0.6" fill="#00e5cc"/>
    <circle cx="258" cy="158" r="0.7" fill="#40e8cc"/>
    <circle cx="15"  cy="155" r="0.6" fill="#7fffd4"/>
    <circle cx="282" cy="155" r="0.8" fill="#00e5cc"/>
    <!-- Upper motes -->
    <circle cx="24"  cy="45"  r="0.6" fill="#00e5cc"/>
    <circle cx="88"  cy="42"  r="0.7" fill="#40e8cc"/>
    <circle cx="126" cy="45"  r="0.6" fill="#7fffd4"/>
    <circle cx="164" cy="42"  r="0.8" fill="#00d4b8"/>
    <circle cx="210" cy="48"  r="0.6" fill="#00e5cc"/>
    <circle cx="272" cy="42"  r="0.7" fill="#40e8cc"/>
  </g>

  <!-- ============================================================ -->
  <!-- TAGLINE — "AGENTIC LEAD GEN"                                 -->
  <!-- ============================================================ -->
  <text
    x="150"
    y="170"
    font-family="'Courier New', 'Lucida Console', monospace"
    font-size="9"
    font-weight="600"
    letter-spacing="3.5"
    text-anchor="middle"
    fill="#40e8cc"
    opacity="0.82"
    filter="url(#softGlow)"
  >AGENTIC LEAD GEN</text>

  <!-- Tagline underline particle trail -->
  <g opacity="0.45">
    <circle cx="60"  cy="175" r="0.7" fill="#00e5cc"/>
    <circle cx="78"  cy="174" r="0.6" fill="#40e8cc"/>
    <circle cx="96"  cy="175" r="0.8" fill="#7fffd4"/>
    <circle cx="114" cy="174" r="0.6" fill="#00d4b8"/>
    <circle cx="132" cy="175" r="0.7" fill="#00e5cc"/>
    <circle cx="150" cy="174" r="0.9" fill="#7fffd4"/>
    <circle cx="168" cy="175" r="0.7" fill="#40e8cc"/>
    <circle cx="186" cy="174" r="0.6" fill="#00d4b8"/>
    <circle cx="204" cy="175" r="0.8" fill="#00e5cc"/>
    <circle cx="222" cy="174" r="0.6" fill="#40e8cc"/>
    <circle cx="240" cy="175" r="0.7" fill="#7fffd4"/>
  </g>

  <!-- ============================================================ -->
  <!-- CENTRAL CONVERGENCE GLINTS — hottest brightest nodes         -->
  <!-- ============================================================ -->
  <g filter="url(#glowBloom)">
    <!-- A apex hotspot -->
    <circle cx="56"  cy="26"  r="3.0" fill="url(#dotWhite)"/>
    <circle cx="56"  cy="26"  r="1.5" fill="#ffffff" opacity="0.95"/>
    <!-- L top hotspot -->
    <circle cx="108" cy="26"  r="2.8" fill="url(#dotWhite)"/>
    <circle cx="108" cy="26"  r="1.4" fill="#ffffff" opacity="0.95"/>
    <!-- L corner hotspot -->
    <circle cx="108" cy="130" r="2.6" fill="url(#dotWhite)"/>
    <circle cx="108" cy="130" r="1.3" fill="#ffffff" opacity="0.9"/>
    <!-- G top right -->
    <circle cx="265" cy="54"  r="2.8" fill="url(#dotWhite)"/>
    <circle cx="265" cy="54"  r="1.4" fill="#ffffff" opacity="0.95"/>
    <!-- G inner spur tip -->
    <circle cx="263" cy="90"  r="2.6" fill="url(#dotWhite)"/>
    <circle cx="263" cy="90"  r="1.3" fill="#ffffff" opacity="0.9"/>
    <!-- A crossbar midpoint -->
    <circle cx="54"  cy="90"  r="2.5" fill="url(#dotWhite)"/>
    <circle cx="54"  cy="90"  r="1.2" fill="#ffffff" opacity="0.85"/>
  </g>

</svg>` },
  { id: 89, title: "Mission Control", concept: "NASA-style launch dashboard", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- CRT amber glow filter -->
    <filter id="crt-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feBlend in="SourceGraphic" in2="blur" mode="screen"/>
    </filter>
    <filter id="text-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <!-- Scanline pattern -->
    <pattern id="scanlines" x="0" y="0" width="300" height="2" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="300" height="1" fill="rgba(0,0,0,0.18)"/>
    </pattern>
    <!-- Radial amber glow background -->
    <radialGradient id="screen-glow" cx="50%" cy="55%" r="55%">
      <stop offset="0%" stop-color="#3d2800"/>
      <stop offset="60%" stop-color="#1a1000"/>
      <stop offset="100%" stop-color="#0a0800"/>
    </radialGradient>
    <!-- Rocket body gradient -->
    <linearGradient id="rocket-body" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b36000"/>
      <stop offset="40%" stop-color="#ffaa00"/>
      <stop offset="100%" stop-color="#7a4000"/>
    </linearGradient>
    <!-- Flame gradient -->
    <radialGradient id="flame-grad" cx="50%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="30%" stop-color="#ffe066"/>
      <stop offset="70%" stop-color="#ff6600"/>
      <stop offset="100%" stop-color="#ff2200" stop-opacity="0"/>
    </radialGradient>
    <!-- Grid fade -->
    <linearGradient id="grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffaa00" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffaa00" stop-opacity="0.04"/>
    </linearGradient>
    <!-- Arc gradient -->
    <linearGradient id="arc-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff8800" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#ffcc44" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffee99" stop-opacity="0.2"/>
    </linearGradient>
    <!-- Launchpad glow -->
    <radialGradient id="pad-glow" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#ff6600" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ff6600" stop-opacity="0"/>
    </radialGradient>
    <!-- Border frame gradient -->
    <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#cc7700"/>
      <stop offset="50%" stop-color="#ffaa22"/>
      <stop offset="100%" stop-color="#884400"/>
    </linearGradient>
    <!-- Corner clip -->
    <clipPath id="screen-clip">
      <rect x="3" y="3" width="294" height="194" rx="6" ry="6"/>
    </clipPath>
  </defs>

  <!-- Outer bezel -->
  <rect x="0" y="0" width="300" height="200" rx="8" ry="8" fill="#1a0e00"/>
  <rect x="1.5" y="1.5" width="297" height="197" rx="7" ry="7" fill="none" stroke="url(#border-grad)" stroke-width="2.5"/>

  <!-- Screen background -->
  <rect x="3" y="3" width="294" height="194" rx="5" ry="5" fill="url(#screen-glow)" clip-path="url(#screen-clip)"/>

  <!-- Grid lines (perspective ground plane) -->
  <g clip-path="url(#screen-clip)" opacity="0.55">
    <!-- Horizontal grid lines -->
    <line x1="3" y1="148" x2="297" y2="148" stroke="#ffaa00" stroke-width="0.4" opacity="0.4"/>
    <line x1="3" y1="158" x2="297" y2="158" stroke="#ffaa00" stroke-width="0.4" opacity="0.3"/>
    <line x1="3" y1="167" x2="297" y2="167" stroke="#ffaa00" stroke-width="0.3" opacity="0.25"/>
    <line x1="3" y1="175" x2="297" y2="175" stroke="#ffaa00" stroke-width="0.3" opacity="0.2"/>
    <line x1="3" y1="182" x2="297" y2="182" stroke="#ffaa00" stroke-width="0.25" opacity="0.15"/>
    <!-- Vertical perspective lines converging at horizon center -->
    <line x1="150" y1="148" x2="3" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.3"/>
    <line x1="150" y1="148" x2="60" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.3"/>
    <line x1="150" y1="148" x2="108" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.25"/>
    <line x1="150" y1="148" x2="150" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.3"/>
    <line x1="150" y1="148" x2="192" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.25"/>
    <line x1="150" y1="148" x2="240" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.3"/>
    <line x1="150" y1="148" x2="297" y2="197" stroke="#ffaa00" stroke-width="0.3" opacity="0.3"/>
  </g>

  <!-- Trajectory arc (dashed, from launchpad up-right) -->
  <g clip-path="url(#screen-clip)" filter="url(#soft-glow)">
    <path d="M 105 148 Q 140 60 240 25" fill="none" stroke="url(#arc-grad)" stroke-width="1.8" stroke-dasharray="4,3" opacity="0.85"/>
    <!-- Arc tick marks -->
    <line x1="130" y1="93" x2="136" y2="87" stroke="#ffcc44" stroke-width="1" opacity="0.7"/>
    <line x1="162" y1="62" x2="168" y2="57" stroke="#ffcc44" stroke-width="1" opacity="0.6"/>
    <line x1="197" y1="42" x2="203" y2="38" stroke="#ffcc44" stroke-width="1" opacity="0.5"/>
  </g>

  <!-- Stars in upper region -->
  <g clip-path="url(#screen-clip)">
    <circle cx="34" cy="18" r="0.8" fill="#ffdd88" opacity="0.6"/>
    <circle cx="72" cy="11" r="0.6" fill="#ffdd88" opacity="0.5"/>
    <circle cx="118" cy="22" r="0.7" fill="#ffdd88" opacity="0.55"/>
    <circle cx="168" cy="9" r="0.8" fill="#ffdd88" opacity="0.6"/>
    <circle cx="215" cy="18" r="0.6" fill="#ffdd88" opacity="0.5"/>
    <circle cx="255" cy="12" r="0.9" fill="#ffdd88" opacity="0.65"/>
    <circle cx="282" cy="27" r="0.6" fill="#ffdd88" opacity="0.45"/>
    <circle cx="44" cy="38" r="0.5" fill="#ffdd88" opacity="0.4"/>
    <circle cx="88" cy="31" r="0.7" fill="#ffcc66" opacity="0.5"/>
    <circle cx="230" cy="35" r="0.7" fill="#ffdd88" opacity="0.45"/>
    <circle cx="270" cy="44" r="0.5" fill="#ffdd88" opacity="0.4"/>
  </g>

  <!-- Launchpad base glow -->
  <ellipse cx="105" cy="149" rx="22" ry="5" fill="url(#pad-glow)" clip-path="url(#screen-clip)" opacity="0.7"/>

  <!-- Launchpad structure -->
  <g clip-path="url(#screen-clip)" filter="url(#crt-glow)">
    <!-- Pad base platform -->
    <rect x="86" y="147" width="38" height="4" rx="1" fill="#cc6600" opacity="0.95"/>
    <!-- Pad legs -->
    <line x1="92" y1="151" x2="88" y2="157" stroke="#aa5500" stroke-width="2"/>
    <line x1="118" y1="151" x2="122" y2="157" stroke="#aa5500" stroke-width="2"/>
    <line x1="100" y1="151" x2="98" y2="157" stroke="#884400" stroke-width="1.5"/>
    <line x1="110" y1="151" x2="112" y2="157" stroke="#884400" stroke-width="1.5"/>
    <!-- Ground beam -->
    <rect x="86" y="156" width="38" height="2.5" rx="1" fill="#8a4400" opacity="0.9"/>
    <!-- Support tower arm -->
    <rect x="117" y="120" width="3" height="28" rx="1" fill="#995500" opacity="0.8"/>
    <rect x="108" y="120" width="12" height="2" rx="1" fill="#cc7700" opacity="0.7"/>
  </g>

  <!-- Rocket flame/exhaust -->
  <g clip-path="url(#screen-clip)">
    <ellipse cx="105" cy="147" rx="5" ry="2.5" fill="#ffcc00" opacity="0.6" filter="url(#soft-glow)"/>
    <path d="M 101 147 Q 105 162 109 147" fill="url(#flame-grad)" opacity="0.75" filter="url(#soft-glow)"/>
    <path d="M 103 147 Q 105 155 107 147" fill="#ffffff" opacity="0.5" filter="url(#soft-glow)"/>
  </g>

  <!-- Rocket body -->
  <g clip-path="url(#screen-clip)" filter="url(#crt-glow)">
    <!-- Nozzle bell -->
    <path d="M 101 131 L 100 136 L 110 136 L 109 131 Z" fill="#884400"/>
    <!-- Main body -->
    <rect x="101" y="105" width="8" height="28" rx="1" fill="url(#rocket-body)"/>
    <!-- Body detail stripe -->
    <rect x="101" y="117" width="8" height="2" fill="#ffdd00" opacity="0.5"/>
    <!-- Nose cone -->
    <path d="M 101 105 Q 105 90 109 105 Z" fill="#ffaa22"/>
    <!-- Nose tip glow -->
    <circle cx="105" cy="91" r="1.5" fill="#ffe066" opacity="0.9" filter="url(#soft-glow)"/>
    <!-- Fins -->
    <path d="M 101 128 L 96 138 L 101 136 Z" fill="#aa5500"/>
    <path d="M 109 128 L 114 138 L 109 136 Z" fill="#cc6600"/>
    <!-- Window -->
    <circle cx="105" cy="111" r="2.2" fill="#1a1000" stroke="#ffcc44" stroke-width="0.8"/>
    <circle cx="105" cy="111" r="1.2" fill="#ffee88" opacity="0.3"/>
  </g>

  <!-- Data panel left -->
  <g clip-path="url(#screen-clip)" filter="url(#text-glow)">
    <!-- Panel border -->
    <rect x="8" y="10" width="58" height="95" rx="2" fill="none" stroke="#cc7700" stroke-width="0.6" opacity="0.5"/>
    <text x="13" y="22" font-family="monospace" font-size="5.5" fill="#ff9900" opacity="0.9">MISSION</text>
    <text x="13" y="30" font-family="monospace" font-size="5.5" fill="#ff9900" opacity="0.9">STS-AGLG</text>
    <line x1="10" y1="33" x2="64" y2="33" stroke="#cc6600" stroke-width="0.5" opacity="0.6"/>
    <text x="13" y="43" font-family="monospace" font-size="5" fill="#ffaa00" opacity="0.8">STAGE</text>
    <text x="13" y="51" font-family="monospace" font-size="5.5" fill="#ffee44" opacity="0.95">LAUNCH</text>
    <line x1="10" y1="55" x2="64" y2="55" stroke="#cc6600" stroke-width="0.5" opacity="0.4"/>
    <text x="13" y="64" font-family="monospace" font-size="5" fill="#ffaa00" opacity="0.8">LEADS</text>
    <text x="13" y="72" font-family="monospace" font-size="5.5" fill="#ffee44" opacity="0.95">04,829</text>
    <line x1="10" y1="76" x2="64" y2="76" stroke="#cc6600" stroke-width="0.5" opacity="0.4"/>
    <text x="13" y="85" font-family="monospace" font-size="5" fill="#ffaa00" opacity="0.8">STATUS</text>
    <text x="13" y="93" font-family="monospace" font-size="5.5" fill="#44ff88" opacity="0.9">GO/GO</text>
    <!-- Blinking cursor simulation -->
    <rect x="43" y="88" width="3.5" height="5.5" fill="#44ff88" opacity="0.7"/>
  </g>

  <!-- Data panel right -->
  <g clip-path="url(#screen-clip)" filter="url(#text-glow)">
    <rect x="234" y="10" width="58" height="95" rx="2" fill="none" stroke="#cc7700" stroke-width="0.6" opacity="0.5"/>
    <text x="239" y="22" font-family="monospace" font-size="5.5" fill="#ff9900" opacity="0.9">VECTOR</text>
    <text x="239" y="30" font-family="monospace" font-size="5.5" fill="#ffee44" opacity="0.9">3-2-1-GO</text>
    <line x1="236" y1="33" x2="290" y2="33" stroke="#cc6600" stroke-width="0.5" opacity="0.6"/>
    <text x="239" y="43" font-family="monospace" font-size="5" fill="#ffaa00" opacity="0.8">T-MINUS</text>
    <text x="239" y="51" font-family="monospace" font-size="6" fill="#ff4400" opacity="0.95">00:03</text>
    <line x1="236" y1="55" x2="290" y2="55" stroke="#cc6600" stroke-width="0.5" opacity="0.4"/>
    <text x="239" y="64" font-family="monospace" font-size="5" fill="#ffaa00" opacity="0.8">PIPELINE</text>
    <text x="239" y="72" font-family="monospace" font-size="5.5" fill="#ffee44" opacity="0.95">ARMED</text>
    <line x1="236" y1="76" x2="290" y2="76" stroke="#cc6600" stroke-width="0.5" opacity="0.4"/>
    <text x="239" y="85" font-family="monospace" font-size="5" fill="#ffaa00" opacity="0.8">THRUST</text>
    <!-- Thrust bar -->
    <rect x="239" y="88" width="44" height="5" rx="1" fill="#1a0800" stroke="#cc6600" stroke-width="0.5"/>
    <rect x="239" y="88" width="40" height="5" rx="1" fill="#ff6600" opacity="0.85"/>
  </g>

  <!-- Countdown arc indicator (top center) -->
  <g clip-path="url(#screen-clip)" filter="url(#text-glow)">
    <!-- Arc segments as countdown -->
    <path d="M 130 28 A 22 22 0 0 1 152 8" fill="none" stroke="#ff4400" stroke-width="3" stroke-linecap="round"/>
    <path d="M 152 8 A 22 22 0 0 1 174 28" fill="none" stroke="#ff6600" stroke-width="3" stroke-linecap="round"/>
    <path d="M 174 28 A 22 22 0 0 1 164 48" fill="none" stroke="#ff8800" stroke-width="3" stroke-linecap="round"/>
    <path d="M 136 48 A 22 22 0 0 1 130 28" fill="none" stroke="#cc4400" stroke-width="3" stroke-linecap="round" stroke-dasharray="5,2"/>
    <!-- Center number -->
    <text x="152" y="34" font-family="monospace" font-size="13" font-weight="bold" fill="#ff4400" text-anchor="middle" opacity="0.95">3</text>
  </g>

  <!-- Horizon scan line (CRT sweep) -->
  <line x1="3" y1="147" x2="297" y2="147" stroke="#ff8800" stroke-width="0.5" opacity="0.4" clip-path="url(#screen-clip)"/>

  <!-- Logo text block -->
  <g clip-path="url(#screen-clip)" filter="url(#text-glow)">
    <!-- Main title -->
    <text x="150" y="169" font-family="monospace" font-size="11" font-weight="bold" fill="#ffcc00" text-anchor="middle" letter-spacing="1.5" opacity="0.97">AGENTIC LEAD GEN</text>
    <!-- Tagline -->
    <text x="150" y="181" font-family="monospace" font-size="5.5" fill="#ff9900" text-anchor="middle" letter-spacing="2" opacity="0.8">MISSION CONTROL  LAUNCHPAD</text>
    <!-- Bottom separator -->
    <line x1="30" y1="185" x2="270" y2="185" stroke="#cc6600" stroke-width="0.4" opacity="0.5"/>
    <!-- Status bar -->
    <text x="20" y="193" font-family="monospace" font-size="4.5" fill="#ff8800" opacity="0.7">SYS:NOMINAL</text>
    <text x="150" y="193" font-family="monospace" font-size="4.5" fill="#ff8800" text-anchor="middle" opacity="0.7">ALL SYSTEMS GO</text>
    <text x="280" y="193" font-family="monospace" font-size="4.5" fill="#ff8800" text-anchor="end" opacity="0.7">REV:1.0</text>
  </g>

  <!-- Scanline overlay -->
  <rect x="3" y="3" width="294" height="194" rx="5" ry="5" fill="url(#scanlines)" opacity="0.4" clip-path="url(#screen-clip)"/>

  <!-- CRT vignette overlay -->
  <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
    <stop offset="60%" stop-color="transparent"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
  </radialGradient>
  <rect x="3" y="3" width="294" height="194" rx="5" ry="5" fill="url(#vignette)" clip-path="url(#screen-clip)"/>

  <!-- Screen glare highlight -->
  <ellipse cx="100" cy="40" rx="60" ry="25" fill="rgba(255,200,80,0.04)" clip-path="url(#screen-clip)"/>
</svg>` },
  { id: 90, title: "Newton's Cradle", concept: "pipeline momentum transfer balls", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#111122;stop-opacity:1" />
    </linearGradient>

    <!-- Chrome ball gradient -->
    <radialGradient id="chrome1" cx="35%" cy="30%" r="60%">
      <stop offset="0%" style="stop-color:#e8eaf0;stop-opacity:1" />
      <stop offset="30%" style="stop-color:#9ea8b8;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#3a4055;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1e2e;stop-opacity:1" />
    </radialGradient>

    <radialGradient id="chrome2" cx="35%" cy="30%" r="60%">
      <stop offset="0%" style="stop-color:#e8eaf0;stop-opacity:1" />
      <stop offset="30%" style="stop-color:#9ea8b8;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#3a4055;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1e2e;stop-opacity:1" />
    </radialGradient>

    <radialGradient id="chrome3" cx="35%" cy="30%" r="60%">
      <stop offset="0%" style="stop-color:#e8eaf0;stop-opacity:1" />
      <stop offset="30%" style="stop-color:#9ea8b8;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#3a4055;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1e2e;stop-opacity:1" />
    </radialGradient>

    <!-- Active ball glow (swinging ball) -->
    <radialGradient id="activeChrome" cx="35%" cy="30%" r="60%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="25%" style="stop-color:#c8d8ff;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#4a6aaa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a2a5e;stop-opacity:1" />
    </radialGradient>

    <!-- Glow filter for active ball -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- String shadow filter -->
    <filter id="stringShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Frame bar gradient -->
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#7a8aaa;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#c8d0e0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5a6a8a;stop-opacity:1" />
    </linearGradient>

    <!-- Icon stage colors -->
    <radialGradient id="discoverGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#60a0ff;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#60a0ff;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="closeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#60ffaa;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#60ffaa;stop-opacity:0" />
    </radialGradient>

    <!-- Motion trail gradient -->
    <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4a6aff;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#4a6aff;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="trailGradR" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#40ffaa;stop-opacity:0" />
      <stop offset="100%" style="stop-color:#40ffaa;stop-opacity:0.8" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" rx="8" />

  <!-- Subtle grid lines for depth -->
  <line x1="0" y1="100" x2="300" y2="100" stroke="#ffffff" stroke-opacity="0.03" stroke-width="0.5"/>
  <line x1="150" y1="0" x2="150" y2="200" stroke="#ffffff" stroke-opacity="0.03" stroke-width="0.5"/>

  <!-- === NEWTON'S CRADLE FRAME === -->
  <!-- Top horizontal bar -->
  <rect x="55" y="38" width="195" height="5" rx="2.5" fill="url(#frameGrad)" />
  <!-- Left vertical support -->
  <rect x="55" y="38" width="4" height="65" rx="2" fill="url(#frameGrad)" />
  <!-- Right vertical support -->
  <rect x="246" y="38" width="4" height="65" rx="2" fill="url(#frameGrad)" />
  <!-- Top bar highlight -->
  <rect x="55" y="38" width="195" height="1.5" rx="0.75" fill="#ffffff" fill-opacity="0.5" />

  <!-- === LEFT SWINGING BALL (DISCOVER) — pulled back left at ~45° === -->
  <!-- Motion trail arc -->
  <path d="M 72 43 Q 55 75 57 105" stroke="url(#trailGrad)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>

  <!-- Ball 1 strings (angled left — swinging out) -->
  <line x1="74" y1="43" x2="57" y2="107" stroke="#8090aa" stroke-width="0.8" opacity="0.8" filter="url(#stringShadow)"/>
  <line x1="82" y1="43" x2="65" y2="107" stroke="#8090aa" stroke-width="0.8" opacity="0.8" filter="url(#stringShadow)"/>

  <!-- Ball 1 glow halo -->
  <circle cx="61" cy="118" r="14" fill="url(#discoverGlow)" />

  <!-- Ball 1 — swinging (DISCOVER) with active chrome -->
  <circle cx="61" cy="118" r="10" fill="url(#activeChrome)" filter="url(#glow)" />
  <!-- Ball 1 highlight -->
  <circle cx="57" cy="113" r="3" fill="#ffffff" fill-opacity="0.5" />
  <!-- Ball 1 icon: magnifying glass (discover) -->
  <circle cx="60" cy="117" r="3.5" stroke="#c8d8ff" stroke-width="1.2" fill="none" />
  <line x1="63" y1="120" x2="66" y2="123" stroke="#c8d8ff" stroke-width="1.2" stroke-linecap="round" />

  <!-- === BALLS 2–4 (resting, hanging vertical) === -->

  <!-- Ball 2 strings (ENRICH) -->
  <line x1="93" y1="43" x2="93" y2="107" stroke="#7080a0" stroke-width="0.8" opacity="0.7"/>
  <line x1="101" y1="43" x2="101" y2="107" stroke="#7080a0" stroke-width="0.8" opacity="0.7"/>
  <!-- Ball 2 (ENRICH) -->
  <circle cx="97" cy="118" r="10" fill="url(#chrome2)" />
  <circle cx="93" cy="113" r="3" fill="#ffffff" fill-opacity="0.3" />
  <!-- Enrich icon: lightning bolt / spark -->
  <polyline points="98,113 95,118 98,118 95,123" stroke="#a0b4cc" stroke-width="1.3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>

  <!-- Ball 3 strings (QUALIFY) -->
  <line x1="126" y1="43" x2="126" y2="107" stroke="#7080a0" stroke-width="0.8" opacity="0.7"/>
  <line x1="134" y1="43" x2="134" y2="107" stroke="#7080a0" stroke-width="0.8" opacity="0.7"/>
  <!-- Ball 3 (QUALIFY) -->
  <circle cx="130" cy="118" r="10" fill="url(#chrome2)" />
  <circle cx="126" cy="113" r="3" fill="#ffffff" fill-opacity="0.3" />
  <!-- Qualify icon: checkmark in circle -->
  <circle cx="130" cy="118" r="4" stroke="#a0b4cc" stroke-width="1.2" fill="none" />
  <polyline points="127.5,118 129.5,120 133,115" stroke="#a0b4cc" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Ball 4 strings (CONTACT) -->
  <line x1="159" y1="43" x2="159" y2="107" stroke="#7080a0" stroke-width="0.8" opacity="0.7"/>
  <line x1="167" y1="43" x2="167" y2="107" stroke="#7080a0" stroke-width="0.8" opacity="0.7"/>
  <!-- Ball 4 (CONTACT) -->
  <circle cx="163" cy="118" r="10" fill="url(#chrome2)" />
  <circle cx="159" cy="113" r="3" fill="#ffffff" fill-opacity="0.3" />
  <!-- Contact icon: person/envelope -->
  <rect x="159" y="115" width="8" height="6" rx="1" stroke="#a0b4cc" stroke-width="1.2" fill="none"/>
  <polyline points="159,115 163,119 167,115" stroke="#a0b4cc" stroke-width="1.2" fill="none" stroke-linejoin="round"/>

  <!-- === RIGHT SWINGING BALL (CLOSE) — pulled back right at ~45° === -->
  <!-- Motion trail arc -->
  <path d="M 228" y1="43 Q 248 75 244 105" stroke="url(#trailGradR)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M 228 43 Q 248 75 244 105" stroke="url(#trailGradR)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>

  <!-- Ball 5 strings (angled right — swinging out) -->
  <line x1="226" y1="43" x2="239" y2="107" stroke="#8090aa" stroke-width="0.8" opacity="0.8" filter="url(#stringShadow)"/>
  <line x1="234" y1="43" x2="247" y2="107" stroke="#8090aa" stroke-width="0.8" opacity="0.8" filter="url(#stringShadow)"/>

  <!-- Ball 5 glow halo -->
  <circle cx="243" cy="118" r="14" fill="url(#closeGlow)" />

  <!-- Ball 5 — swinging (CLOSE) with active chrome -->
  <circle cx="243" cy="118" r="10" fill="url(#activeChrome)" filter="url(#glow)" />
  <!-- Ball 5 highlight -->
  <circle cx="239" cy="113" r="3" fill="#ffffff" fill-opacity="0.5" />
  <!-- Close icon: handshake / deal star -->
  <polygon points="243,112 244.5,116.5 249,116.5 245.5,119.5 247,124 243,121.5 239,124 240.5,119.5 237,116.5 241.5,116.5" fill="#80ffcc" fill-opacity="0.8" />

  <!-- === SHADOW ELLIPSES UNDER BALLS === -->
  <ellipse cx="61" cy="131" rx="9" ry="2.5" fill="#000000" fill-opacity="0.5" />
  <ellipse cx="97" cy="131" rx="9" ry="2.5" fill="#000000" fill-opacity="0.4" />
  <ellipse cx="130" cy="131" rx="9" ry="2.5" fill="#000000" fill-opacity="0.4" />
  <ellipse cx="163" cy="131" rx="9" ry="2.5" fill="#000000" fill-opacity="0.4" />
  <ellipse cx="243" cy="131" rx="9" ry="2.5" fill="#000000" fill-opacity="0.5" />

  <!-- === STAGE LABELS === -->
  <text x="61" y="148" text-anchor="middle" font-family="'SF Mono', 'Fira Code', monospace" font-size="5.5" fill="#6080aa" letter-spacing="0.3">DISC</text>
  <text x="97" y="148" text-anchor="middle" font-family="'SF Mono', 'Fira Code', monospace" font-size="5.5" fill="#6080aa" letter-spacing="0.3">ENRCH</text>
  <text x="130" y="148" text-anchor="middle" font-family="'SF Mono', 'Fira Code', monospace" font-size="5.5" fill="#6080aa" letter-spacing="0.3">QUAL</text>
  <text x="163" y="148" text-anchor="middle" font-family="'SF Mono', 'Fira Code', monospace" font-size="5.5" fill="#6080aa" letter-spacing="0.3">CONT</text>
  <text x="243" y="148" text-anchor="middle" font-family="'SF Mono', 'Fira Code', monospace" font-size="5.5" fill="#6080aa" letter-spacing="0.3">CLOSE</text>

  <!-- === MOMENTUM TRANSFER INDICATOR (center collision dot) === -->
  <circle cx="174" cy="118" r="2" fill="#ffffff" fill-opacity="0.15" />

  <!-- === TITLE TEXT === -->
  <text x="150" y="172" text-anchor="middle"
        font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="13" font-weight="700" letter-spacing="2"
        fill="#c8d0e8">
    AGENTIC LEAD GEN
  </text>

  <!-- Subtitle -->
  <text x="150" y="185" text-anchor="middle"
        font-family="'SF Mono', 'Fira Code', monospace"
        font-size="6.5" letter-spacing="3"
        fill="#4a5a7a">
    PENDULUM MOMENTUM
  </text>

  <!-- Decorative separator line -->
  <line x1="80" y1="165" x2="220" y2="165" stroke="#2a3a5a" stroke-width="0.5" />
  <circle cx="150" cy="165" r="1.5" fill="#4a6aaa" fill-opacity="0.8"/>

  <!-- Corner accents -->
  <path d="M 8 8 L 20 8 M 8 8 L 8 20" stroke="#2a4a6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M 292 8 L 280 8 M 292 8 L 292 20" stroke="#2a4a6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M 8 192 L 20 192 M 8 192 L 8 180" stroke="#2a4a6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M 292 192 L 280 192 M 292 192 L 292 180" stroke="#2a4a6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>` },
  { id: 91, title: "Serpentine Path", concept: "winding road through business landscape", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark topographic background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0e1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1520;stop-opacity:1" />
    </linearGradient>

    <!-- Amber path glow gradient -->
    <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse"
      x1="20" y1="160" x2="270" y2="50">
      <stop offset="0%" style="stop-color:#d97706;stop-opacity:0.6" />
      <stop offset="50%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:1" />
    </linearGradient>

    <!-- Glow filter for path -->
    <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Soft outer glow for path -->
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Target pulse glow -->
    <filter id="targetGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Icon glow -->
    <filter id="iconGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Target radial glow -->
    <radialGradient id="targetRadial" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#f59e0b;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#d97706;stop-opacity:0" />
    </radialGradient>

    <!-- Circuit dot gradient -->
    <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#fde68a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0.7" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)" />

  <!-- Topographic contour lines -->
  <g opacity="0.09" stroke="#4ade80" stroke-width="0.6" fill="none">
    <ellipse cx="150" cy="100" rx="130" ry="70" />
    <ellipse cx="150" cy="100" rx="110" ry="56" />
    <ellipse cx="150" cy="100" rx="90" ry="44" />
    <ellipse cx="150" cy="100" rx="70" ry="32" />
    <ellipse cx="150" cy="100" rx="50" ry="22" />
    <ellipse cx="150" cy="100" rx="30" ry="13" />
  </g>
  <g opacity="0.05" stroke="#60a5fa" stroke-width="0.4" fill="none">
    <path d="M0,80 Q75,60 150,90 Q225,120 300,70" />
    <path d="M0,110 Q75,90 150,115 Q225,140 300,100" />
    <path d="M0,140 Q75,120 150,145 Q225,165 300,130" />
    <path d="M0,50 Q75,35 150,60 Q225,85 300,45" />
  </g>

  <!-- Grid dots (circuit board feel) -->
  <g opacity="0.12" fill="#475569">
    <circle cx="30" cy="30" r="1" />
    <circle cx="60" cy="30" r="1" />
    <circle cx="90" cy="30" r="1" />
    <circle cx="120" cy="30" r="1" />
    <circle cx="150" cy="30" r="1" />
    <circle cx="180" cy="30" r="1" />
    <circle cx="210" cy="30" r="1" />
    <circle cx="240" cy="30" r="1" />
    <circle cx="270" cy="30" r="1" />
    <circle cx="30" cy="55" r="1" />
    <circle cx="60" cy="55" r="1" />
    <circle cx="90" cy="55" r="1" />
    <circle cx="120" cy="55" r="1" />
    <circle cx="150" cy="55" r="1" />
    <circle cx="180" cy="55" r="1" />
    <circle cx="210" cy="55" r="1" />
    <circle cx="240" cy="55" r="1" />
    <circle cx="270" cy="55" r="1" />
    <circle cx="30" cy="80" r="1" />
    <circle cx="60" cy="80" r="1" />
    <circle cx="90" cy="80" r="1" />
    <circle cx="120" cy="80" r="1" />
    <circle cx="150" cy="80" r="1" />
    <circle cx="180" cy="80" r="1" />
    <circle cx="210" cy="80" r="1" />
    <circle cx="240" cy="80" r="1" />
    <circle cx="270" cy="80" r="1" />
    <circle cx="30" cy="105" r="1" />
    <circle cx="60" cy="105" r="1" />
    <circle cx="90" cy="105" r="1" />
    <circle cx="120" cy="105" r="1" />
    <circle cx="150" cy="105" r="1" />
    <circle cx="180" cy="105" r="1" />
    <circle cx="210" cy="105" r="1" />
    <circle cx="240" cy="105" r="1" />
    <circle cx="270" cy="105" r="1" />
    <circle cx="30" cy="130" r="1" />
    <circle cx="60" cy="130" r="1" />
    <circle cx="90" cy="130" r="1" />
    <circle cx="120" cy="130" r="1" />
    <circle cx="150" cy="130" r="1" />
    <circle cx="180" cy="130" r="1" />
    <circle cx="210" cy="130" r="1" />
    <circle cx="240" cy="130" r="1" />
    <circle cx="270" cy="130" r="1" />
    <circle cx="30" cy="155" r="1" />
    <circle cx="60" cy="155" r="1" />
    <circle cx="90" cy="155" r="1" />
    <circle cx="120" cy="155" r="1" />
    <circle cx="150" cy="155" r="1" />
    <circle cx="180" cy="155" r="1" />
    <circle cx="210" cy="155" r="1" />
    <circle cx="240" cy="155" r="1" />
    <circle cx="270" cy="155" r="1" />
  </g>

  <!-- Ambient path glow (wide, soft) -->
  <path d="M 22,155 C 40,155 55,130 70,115 C 85,100 95,85 110,78
           C 125,71 135,80 150,90 C 165,100 172,112 185,108
           C 198,104 205,90 220,80 C 235,70 248,58 268,52"
    stroke="#f59e0b" stroke-width="14" fill="none" opacity="0.15" filter="url(#softGlow)" />

  <!-- Main serpentine S-path (outer border darker) -->
  <path d="M 22,155 C 40,155 55,130 70,115 C 85,100 95,85 110,78
           C 125,71 135,80 150,90 C 165,100 172,112 185,108
           C 198,104 205,90 220,80 C 235,70 248,58 268,52"
    stroke="#92400e" stroke-width="5" fill="none" stroke-linecap="round" />

  <!-- Main serpentine S-path (bright amber core) -->
  <path d="M 22,155 C 40,155 55,130 70,115 C 85,100 95,85 110,78
           C 125,71 135,80 150,90 C 165,100 172,112 185,108
           C 198,104 205,90 220,80 C 235,70 248,58 268,52"
    stroke="url(#pathGrad)" stroke-width="2.5" fill="none" stroke-linecap="round"
    filter="url(#pathGlow)" />

  <!-- Animated circuit dashes on path -->
  <path d="M 22,155 C 40,155 55,130 70,115 C 85,100 95,85 110,78
           C 125,71 135,80 150,90 C 165,100 172,112 185,108
           C 198,104 205,90 220,80 C 235,70 248,58 268,52"
    stroke="#fde68a" stroke-width="1.2" fill="none" stroke-linecap="round"
    stroke-dasharray="4 8" opacity="0.7" />

  <!-- Company Icon 1 — Building/Corp (start area) -->
  <g transform="translate(13, 138)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="18" height="18" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
    <!-- building icon -->
    <rect x="3" y="8" width="12" height="8" fill="none" stroke="#fbbf24" stroke-width="0.8"/>
    <rect x="6" y="5" width="6" height="11" fill="none" stroke="#fbbf24" stroke-width="0.8"/>
    <rect x="7" y="2" width="4" height="14" fill="none" stroke="#fbbf24" stroke-width="0.8"/>
    <line x1="9" y1="2" x2="9" y2="16" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>
    <!-- windows -->
    <rect x="5" y="10" width="2" height="2" fill="#f59e0b" opacity="0.8"/>
    <rect x="11" y="10" width="2" height="2" fill="#f59e0b" opacity="0.8"/>
    <rect x="5" y="14" width="2" height="2" fill="#f59e0b" opacity="0.5"/>
    <rect x="11" y="14" width="2" height="2" fill="#f59e0b" opacity="0.5"/>
    <!-- circuit node dot -->
    <circle cx="9" cy="2" r="1.5" fill="#fbbf24"/>
  </g>

  <!-- Circuit node on path point 1 -->
  <circle cx="22" cy="155" r="3.5" fill="url(#dotGrad)" filter="url(#iconGlow)" />
  <circle cx="22" cy="155" r="1.5" fill="#fff8" />

  <!-- Company Icon 2 — Gear/Tech (mid-low curve) -->
  <g transform="translate(63, 98)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="18" height="18" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
    <!-- gear icon simplified -->
    <circle cx="9" cy="9" r="4.5" fill="none" stroke="#fbbf24" stroke-width="1.2"/>
    <circle cx="9" cy="9" r="2" fill="#f59e0b" opacity="0.8"/>
    <line x1="9" y1="3" x2="9" y2="5" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="9" y1="13" x2="9" y2="15" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="9" x2="5" y2="9" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="13" y1="9" x2="15" y2="9" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="11.7" y1="11.7" x2="13.1" y2="13.1" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="13.1" y1="4.9" x2="11.7" y2="6.3" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="6.3" y1="11.7" x2="4.9" y2="13.1" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
  </g>

  <!-- Circuit node on path point 2 -->
  <circle cx="70" cy="115" r="3" fill="url(#dotGrad)" filter="url(#iconGlow)" />
  <circle cx="70" cy="115" r="1.2" fill="#fff8" />

  <!-- Company Icon 3 — Network/Graph (top of first curve) -->
  <g transform="translate(103, 61)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="18" height="18" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
    <!-- network nodes -->
    <circle cx="9" cy="5" r="2" fill="none" stroke="#fbbf24" stroke-width="1"/>
    <circle cx="4" cy="13" r="2" fill="none" stroke="#fbbf24" stroke-width="1"/>
    <circle cx="14" cy="13" r="2" fill="none" stroke="#fbbf24" stroke-width="1"/>
    <line x1="9" y1="7" x2="5" y2="11" stroke="#fbbf24" stroke-width="0.8" opacity="0.8"/>
    <line x1="9" y1="7" x2="13" y2="11" stroke="#fbbf24" stroke-width="0.8" opacity="0.8"/>
    <line x1="6" y1="13" x2="12" y2="13" stroke="#fbbf24" stroke-width="0.8" opacity="0.8"/>
    <circle cx="9" cy="5" r="1" fill="#f59e0b"/>
    <circle cx="4" cy="13" r="1" fill="#f59e0b"/>
    <circle cx="14" cy="13" r="1" fill="#f59e0b"/>
  </g>

  <!-- Circuit node on path point 3 -->
  <circle cx="110" cy="78" r="3" fill="url(#dotGrad)" filter="url(#iconGlow)" />
  <circle cx="110" cy="78" r="1.2" fill="#fff8" />

  <!-- Company Icon 4 — Person/Contact (inflection mid) -->
  <g transform="translate(143, 82)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="18" height="18" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
    <!-- person icon -->
    <circle cx="9" cy="6" r="3" fill="none" stroke="#fbbf24" stroke-width="1.2"/>
    <path d="M3,16 C3,11 15,11 15,16" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="9" cy="6" r="1.5" fill="#f59e0b" opacity="0.7"/>
  </g>

  <!-- Circuit node on path point 4 -->
  <circle cx="150" cy="90" r="3.5" fill="url(#dotGrad)" filter="url(#iconGlow)" />
  <circle cx="150" cy="90" r="1.5" fill="#fff8" />

  <!-- Company Icon 5 — Chart/Analytics (second curve) -->
  <g transform="translate(177, 100)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="18" height="18" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
    <!-- bar chart -->
    <rect x="3" y="11" width="3" height="5" fill="#f59e0b" opacity="0.7"/>
    <rect x="7.5" y="7" width="3" height="9" fill="#f59e0b" opacity="0.9"/>
    <rect x="12" y="4" width="3" height="12" fill="#fbbf24"/>
    <line x1="2" y1="16" x2="16" y2="16" stroke="#fbbf24" stroke-width="0.8"/>
    <!-- upward arrow suggestion -->
    <polyline points="4.5,10 9,6 13.5,3" fill="none" stroke="#fde68a" stroke-width="0.8" opacity="0.6"/>
  </g>

  <!-- Circuit node on path point 5 -->
  <circle cx="185" cy="108" r="3" fill="url(#dotGrad)" filter="url(#iconGlow)" />
  <circle cx="185" cy="108" r="1.2" fill="#fff8" />

  <!-- Company Icon 6 — Mail/Outreach (upper curve) -->
  <g transform="translate(213, 62)" filter="url(#iconGlow)">
    <rect x="0" y="0" width="18" height="18" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
    <!-- envelope icon -->
    <rect x="2" y="5" width="14" height="10" rx="1" fill="none" stroke="#fbbf24" stroke-width="1.1"/>
    <polyline points="2,5 9,11 16,5" fill="none" stroke="#fbbf24" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- signal dots -->
    <circle cx="13" cy="4" r="1" fill="#fbbf24" opacity="0.9"/>
    <circle cx="15.5" cy="2.5" r="0.8" fill="#fde68a" opacity="0.7"/>
  </g>

  <!-- Circuit node on path point 6 -->
  <circle cx="220" cy="80" r="3" fill="url(#dotGrad)" filter="url(#iconGlow)" />
  <circle cx="220" cy="80" r="1.2" fill="#fff8" />

  <!-- TARGET — Glowing bullseye at end of path -->
  <!-- Outer ambient glow -->
  <circle cx="268" cy="52" r="22" fill="url(#targetRadial)" opacity="0.35" filter="url(#targetGlow)" />
  <circle cx="268" cy="52" r="16" fill="url(#targetRadial)" opacity="0.25" />

  <!-- Target rings -->
  <circle cx="268" cy="52" r="14" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="0.4" />
  <circle cx="268" cy="52" r="10" fill="none" stroke="#fbbf24" stroke-width="1.5" opacity="0.65" filter="url(#iconGlow)"/>
  <circle cx="268" cy="52" r="6" fill="none" stroke="#fde68a" stroke-width="2" filter="url(#iconGlow)" opacity="0.9"/>

  <!-- Target core -->
  <circle cx="268" cy="52" r="3.5" fill="#fbbf24" filter="url(#targetGlow)" />
  <circle cx="268" cy="52" r="1.8" fill="#fff" opacity="0.95" />

  <!-- Target crosshairs -->
  <line x1="268" y1="36" x2="268" y2="43" stroke="#f59e0b" stroke-width="1" opacity="0.7" stroke-linecap="round"/>
  <line x1="268" y1="61" x2="268" y2="68" stroke="#f59e0b" stroke-width="1" opacity="0.7" stroke-linecap="round"/>
  <line x1="252" y1="52" x2="259" y2="52" stroke="#f59e0b" stroke-width="1" opacity="0.7" stroke-linecap="round"/>
  <line x1="277" y1="52" x2="284" y2="52" stroke="#f59e0b" stroke-width="1" opacity="0.7" stroke-linecap="round"/>

  <!-- Circuit node end -->
  <circle cx="268" cy="52" r="5" fill="none" stroke="#fbbf24" stroke-width="1.5" filter="url(#iconGlow)" opacity="0.5"/>

  <!-- Arrow head at end of path -->
  <polygon points="268,45 264,52 272,52" fill="#fbbf24" opacity="0" />

  <!-- Text: "Agentic Lead Gen" -->
  <text x="150" y="183" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13"
    font-weight="700" fill="#f59e0b" text-anchor="middle" letter-spacing="2.5"
    filter="url(#pathGlow)">AGENTIC LEAD GEN</text>

  <!-- Subtitle separator line -->
  <line x1="60" y1="189" x2="240" y2="189" stroke="#f59e0b" stroke-width="0.4" opacity="0.4"/>

  <!-- Bottom tagline -->
  <text x="150" y="198" font-family="'Helvetica Neue', Arial, sans-serif" font-size="6.5"
    fill="#92400e" text-anchor="middle" letter-spacing="3" font-weight="400">CIRCUIT SERPENTINE PATH</text>

  <!-- Decorative corner circuit traces -->
  <g stroke="#1e40af" stroke-width="0.5" fill="none" opacity="0.2">
    <path d="M0,0 L15,0 L15,8 L22,8" />
    <path d="M300,0 L285,0 L285,8 L278,8" />
    <path d="M0,200 L15,200 L15,192 L22,192" />
    <path d="M300,200 L285,200 L285,192 L278,192" />
  </g>
  <g fill="#1e40af" opacity="0.3">
    <circle cx="22" cy="8" r="1.5"/>
    <circle cx="278" cy="8" r="1.5"/>
    <circle cx="22" cy="192" r="1.5"/>
    <circle cx="278" cy="192" r="1.5"/>
  </g>
</svg>` },
  { id: 92, title: "Arch Portal", concept: "Roman arch framing lead horizon", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Sky/horizon gradient -->
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="40%" stop-color="#0d2a4a"/>
      <stop offset="70%" stop-color="#1a4a7a"/>
      <stop offset="100%" stop-color="#2d7cc1"/>
    </linearGradient>
    <!-- Horizon glow -->
    <radialGradient id="horizonGlow" cx="50%" cy="85%" r="60%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.9"/>
      <stop offset="30%" stop-color="#0080ff" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="#0040aa" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0a1628" stop-opacity="0"/>
    </radialGradient>
    <!-- Stone arch gradient -->
    <linearGradient id="archLeft" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a4020"/>
      <stop offset="40%" stop-color="#8b6535"/>
      <stop offset="70%" stop-color="#c8934a"/>
      <stop offset="100%" stop-color="#e8b86d"/>
    </linearGradient>
    <linearGradient id="archRight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e8b86d"/>
      <stop offset="30%" stop-color="#c8934a"/>
      <stop offset="60%" stop-color="#8b6535"/>
      <stop offset="100%" stop-color="#5a4020"/>
    </linearGradient>
    <linearGradient id="archTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a07040"/>
      <stop offset="50%" stop-color="#c8934a"/>
      <stop offset="100%" stop-color="#e8b86d"/>
    </linearGradient>
    <!-- Stone texture shading -->
    <linearGradient id="pillarLeftShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3a2810"/>
      <stop offset="30%" stop-color="#7a5528"/>
      <stop offset="60%" stop-color="#c8934a"/>
      <stop offset="100%" stop-color="#e8c070"/>
    </linearGradient>
    <linearGradient id="pillarRightShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e8c070"/>
      <stop offset="40%" stop-color="#c8934a"/>
      <stop offset="70%" stop-color="#7a5528"/>
      <stop offset="100%" stop-color="#3a2810"/>
    </linearGradient>
    <!-- Ground gradient -->
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3a5c"/>
      <stop offset="50%" stop-color="#0f2238"/>
      <stop offset="100%" stop-color="#080f1a"/>
    </linearGradient>
    <!-- Perspective road glow -->
    <linearGradient id="roadGlow" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#0080ff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#003366" stop-opacity="0.1"/>
    </linearGradient>
    <!-- Inner arch glow clip -->
    <clipPath id="archClip">
      <path d="M 78,165 L 78,95 A 72,72 0 0,1 222,95 L 222,165 Z"/>
    </clipPath>
    <!-- Glow filter -->
    <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="horizonBlur">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <!-- Star sparkle -->
    <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- ═══════════════ BACKGROUND SKY ═══════════════ -->
  <rect width="300" height="200" fill="url(#skyGrad)"/>

  <!-- Stars -->
  <circle cx="40" cy="18" r="0.8" fill="#ffffff" opacity="0.7"/>
  <circle cx="65" cy="10" r="0.6" fill="#ffffff" opacity="0.5"/>
  <circle cx="95" cy="22" r="1" fill="#ffffff" opacity="0.8"/>
  <circle cx="130" cy="8" r="0.7" fill="#ffffff" opacity="0.6"/>
  <circle cx="175" cy="15" r="0.9" fill="#ffffff" opacity="0.7"/>
  <circle cx="210" cy="7" r="0.6" fill="#ffffff" opacity="0.5"/>
  <circle cx="240" cy="20" r="0.8" fill="#ffffff" opacity="0.6"/>
  <circle cx="268" cy="12" r="1" fill="#ffffff" opacity="0.8"/>
  <circle cx="285" cy="25" r="0.6" fill="#ffffff" opacity="0.5"/>
  <circle cx="52" cy="35" r="0.5" fill="#aaddff" opacity="0.6"/>
  <circle cx="158" cy="30" r="0.7" fill="#aaddff" opacity="0.5"/>
  <circle cx="255" cy="38" r="0.5" fill="#aaddff" opacity="0.6"/>

  <!-- ═══════════════ HORIZON GLOW (behind arch) ═══════════════ -->
  <ellipse cx="150" cy="128" rx="90" ry="35" fill="#00d4ff" opacity="0.12" filter="url(#horizonBlur)"/>
  <ellipse cx="150" cy="132" rx="60" ry="22" fill="#00aaff" opacity="0.18" filter="url(#horizonBlur)"/>
  <ellipse cx="150" cy="136" rx="35" ry="12" fill="#ffffff" opacity="0.15" filter="url(#horizonBlur)"/>

  <!-- ═══════════════ INNER ARCH SCENE (sky inside arch) ═══════════════ -->
  <g clip-path="url(#archClip)">
    <!-- Inner sky deeper blue -->
    <rect x="78" y="55" width="144" height="110" fill="url(#skyGrad)"/>
    <!-- Horizon radial bloom -->
    <ellipse cx="150" cy="128" rx="85" ry="40" fill="url(#horizonGlow)"/>
    <!-- Ground inside arch -->
    <rect x="78" y="130" width="144" height="35" fill="url(#groundGrad)" opacity="0.9"/>
    <!-- Perspective vanishing lines (leads flowing in) -->
    <!-- Road / path lines converging to horizon -->
    <line x1="150" y1="126" x2="78" y2="165" stroke="#00d4ff" stroke-width="0.5" opacity="0.25"/>
    <line x1="150" y1="126" x2="105" y2="165" stroke="#00d4ff" stroke-width="0.5" opacity="0.3"/>
    <line x1="150" y1="126" x2="130" y2="165" stroke="#00d4ff" stroke-width="0.4" opacity="0.35"/>
    <line x1="150" y1="126" x2="170" y2="165" stroke="#00d4ff" stroke-width="0.4" opacity="0.35"/>
    <line x1="150" y1="126" x2="195" y2="165" stroke="#00d4ff" stroke-width="0.5" opacity="0.3"/>
    <line x1="150" y1="126" x2="222" y2="165" stroke="#00d4ff" stroke-width="0.5" opacity="0.25"/>
    <!-- Central road glow path -->
    <polygon points="150,124 140,165 160,165" fill="url(#roadGlow)" opacity="0.5"/>
    <!-- Floating data orbs / leads -->
    <circle cx="150" cy="118" r="2.5" fill="#00d4ff" opacity="0.9" filter="url(#softGlow)"/>
    <circle cx="138" cy="122" r="1.8" fill="#40aaff" opacity="0.7" filter="url(#softGlow)"/>
    <circle cx="162" cy="123" r="1.8" fill="#40aaff" opacity="0.7" filter="url(#softGlow)"/>
    <circle cx="144" cy="131" r="1.2" fill="#80ccff" opacity="0.6"/>
    <circle cx="156" cy="132" r="1.2" fill="#80ccff" opacity="0.6"/>
    <circle cx="135" cy="136" r="1" fill="#aaddff" opacity="0.5"/>
    <circle cx="165" cy="137" r="1" fill="#aaddff" opacity="0.5"/>
    <circle cx="150" cy="140" r="0.8" fill="#cceeff" opacity="0.4"/>
    <!-- Horizon line bright -->
    <line x1="88" y1="127" x2="212" y2="127" stroke="#00d4ff" stroke-width="0.8" opacity="0.5"/>
    <line x1="100" y1="127" x2="200" y2="127" stroke="#ffffff" stroke-width="0.4" opacity="0.6"/>
    <!-- Sun / light source on horizon -->
    <circle cx="150" cy="127" r="6" fill="#ffffff" opacity="0.85" filter="url(#softGlow)"/>
    <circle cx="150" cy="127" r="3.5" fill="#ffffff" opacity="1"/>
    <!-- Distant city nodes -->
    <rect x="130" y="122" width="2" height="5" fill="#00d4ff" opacity="0.5"/>
    <rect x="134" y="120" width="2" height="7" fill="#00aaff" opacity="0.4"/>
    <rect x="164" y="121" width="2" height="6" fill="#00d4ff" opacity="0.5"/>
    <rect x="168" y="123" width="1.5" height="4" fill="#00aaff" opacity="0.4"/>
    <rect x="142" y="119" width="1.5" height="8" fill="#40ccff" opacity="0.45"/>
    <rect x="157" y="120" width="1.5" height="7" fill="#40ccff" opacity="0.45"/>
  </g>

  <!-- ═══════════════ GROUND / BASE ═══════════════ -->
  <rect x="0" y="160" width="300" height="40" fill="#080f1a"/>
  <rect x="0" y="158" width="300" height="4" fill="#1a3a5c" opacity="0.6"/>

  <!-- Stone base blocks -->
  <!-- Left base -->
  <rect x="42" y="155" width="55" height="12" rx="1" fill="#7a5528"/>
  <rect x="44" y="155" width="53" height="3" rx="0.5" fill="#c8934a" opacity="0.5"/>
  <!-- Right base -->
  <rect x="203" y="155" width="55" height="12" rx="1" fill="#7a5528"/>
  <rect x="205" y="155" width="53" height="3" rx="0.5" fill="#c8934a" opacity="0.5"/>

  <!-- ═══════════════ LEFT PILLAR ═══════════════ -->
  <rect x="50" y="72" width="38" height="90" fill="url(#pillarLeftShade)"/>
  <!-- Stone blocks on left pillar -->
  <line x1="50" y1="95" x2="88" y2="95" stroke="#5a3a15" stroke-width="0.8" opacity="0.6"/>
  <line x1="50" y1="115" x2="88" y2="115" stroke="#5a3a15" stroke-width="0.8" opacity="0.6"/>
  <line x1="50" y1="135" x2="88" y2="135" stroke="#5a3a15" stroke-width="0.8" opacity="0.6"/>
  <!-- Highlight edge left pillar -->
  <rect x="83" y="72" width="5" height="90" fill="#f0d090" opacity="0.3"/>
  <!-- Shadow edge -->
  <rect x="50" y="72" width="6" height="90" fill="#2a1808" opacity="0.4"/>

  <!-- ═══════════════ RIGHT PILLAR ═══════════════ -->
  <rect x="212" y="72" width="38" height="90" fill="url(#pillarRightShade)"/>
  <!-- Stone blocks on right pillar -->
  <line x1="212" y1="95" x2="250" y2="95" stroke="#5a3a15" stroke-width="0.8" opacity="0.6"/>
  <line x1="212" y1="115" x2="250" y2="115" stroke="#5a3a15" stroke-width="0.8" opacity="0.6"/>
  <line x1="212" y1="135" x2="250" y2="135" stroke="#5a3a15" stroke-width="0.8" opacity="0.6"/>
  <!-- Highlight edge right pillar -->
  <rect x="212" y="72" width="5" height="90" fill="#f0d090" opacity="0.3"/>
  <!-- Shadow edge -->
  <rect x="244" y="72" width="6" height="90" fill="#2a1808" opacity="0.4"/>

  <!-- ═══════════════ ARCH (Roman semicircle) ═══════════════ -->
  <!-- Arch thickness: outer radius ~83, inner radius ~72, center at (150, 95) -->
  <!-- Outer arch shape -->
  <path d="M 42,100 L 42,95 A 108,95 0 0,1 258,95 L 258,100 A 103,90 0 0,0 47,100 Z" fill="#6b4820" opacity="0.4"/>

  <!-- Main arch ring - left half -->
  <path d="M 50,165 L 50,95 A 100,88 0 0,1 150,7 A 83,72 0 0,0 67,95 L 67,165 Z"
        fill="url(#archLeft)"/>
  <!-- Main arch ring - right half -->
  <path d="M 250,165 L 250,95 A 100,88 0 0,0 150,7 A 83,72 0 0,1 233,95 L 233,165 Z"
        fill="url(#archRight)"/>
  <!-- Arch crown top -->
  <path d="M 150,7 A 83,72 0 0,0 67,95 A 100,88 0 0,1 150,7 Z" fill="#a07040" opacity="0.7"/>
  <path d="M 150,7 A 83,72 0 0,1 233,95 A 100,88 0 0,0 150,7 Z" fill="#a07040" opacity="0.7"/>

  <!-- Stone block lines on arch (decorative) -->
  <!-- Left arch blocks -->
  <path d="M 57,130 A 93,81 0 0,1 62,110" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M 55,110 A 93,81 0 0,1 68,82" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M 70,80 A 93,81 0 0,1 95,57" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M 98,55 A 93,81 0 0,1 130,42" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <!-- Right arch blocks -->
  <path d="M 243,130 A 93,81 0 0,0 238,110" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M 245,110 A 93,81 0 0,0 232,82" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M 230,80 A 93,81 0 0,0 205,57" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M 202,55 A 93,81 0 0,0 170,42" stroke="#5a3a18" stroke-width="0.8" fill="none" opacity="0.7"/>

  <!-- Arch inner edge highlight (warm glow from within) -->
  <path d="M 67,165 L 67,95 A 83,72 0 0,1 233,95 L 233,165"
        stroke="#f0c878" stroke-width="1.2" fill="none" opacity="0.4"/>
  <!-- Blue glow on inner arch edge (digital light from beyond) -->
  <path d="M 67,165 L 67,95 A 83,72 0 0,1 233,95 L 233,165"
        stroke="#00aaff" stroke-width="2" fill="none" opacity="0.2" filter="url(#softGlow)"/>

  <!-- Arch keystone (top center decoration) -->
  <path d="M 138,14 L 150,7 L 162,14 L 158,28 L 142,28 Z" fill="#c8934a"/>
  <path d="M 140,16 L 150,10 L 160,16 L 157,26 L 143,26 Z" fill="#e8b86d"/>
  <line x1="150" y1="10" x2="150" y2="26" stroke="#a07040" stroke-width="0.6" opacity="0.5"/>
  <line x1="141" y1="18" x2="159" y2="18" stroke="#a07040" stroke-width="0.6" opacity="0.5"/>

  <!-- Decorative arch molding outer ring -->
  <path d="M 50,165 L 50,95 A 100,88 0 0,1 250,95 L 250,165"
        stroke="#e8c878" stroke-width="0.8" fill="none" opacity="0.25"/>
  <path d="M 42,165 L 42,95 A 108,95 0 0,1 258,95 L 258,165"
        stroke="#c8a050" stroke-width="1.5" fill="none" opacity="0.15"/>

  <!-- ═══════════════ FOREGROUND SHADOW / DEPTH ═══════════════ -->
  <!-- Shadow cast by arch onto ground -->
  <ellipse cx="150" cy="168" rx="85" ry="8" fill="#000000" opacity="0.3"/>

  <!-- ═══════════════ TEXT ═══════════════ -->
  <!-- "AGENTIC LEAD GEN" text -->
  <text x="150" y="183"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="10.5"
        font-weight="700"
        letter-spacing="3"
        text-anchor="middle"
        fill="#e8c878"
        opacity="0.95">AGENTIC LEAD GEN</text>
  <!-- Subtle text glow -->
  <text x="150" y="183"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="10.5"
        font-weight="700"
        letter-spacing="3"
        text-anchor="middle"
        fill="#ffd080"
        opacity="0.3"
        filter="url(#horizonBlur)">AGENTIC LEAD GEN</text>

  <!-- Tag line -->
  <text x="150" y="195"
        font-family="'Courier New', Courier, monospace"
        font-size="5.5"
        letter-spacing="2.5"
        text-anchor="middle"
        fill="#40aaff"
        opacity="0.75">GATEWAY TO OPPORTUNITY</text>

  <!-- ═══════════════ FLOATING PARTICLE ACCENTS ═══════════════ -->
  <!-- Outside arch, ambient particles -->
  <circle cx="28" cy="140" r="1.2" fill="#c8934a" opacity="0.4"/>
  <circle cx="18" cy="110" r="0.8" fill="#c8934a" opacity="0.3"/>
  <circle cx="275" cy="130" r="1.2" fill="#c8934a" opacity="0.4"/>
  <circle cx="283" cy="105" r="0.8" fill="#c8934a" opacity="0.3"/>
  <!-- Blue digital sparks -->
  <circle cx="35" cy="80" r="1" fill="#00aaff" opacity="0.5"/>
  <circle cx="268" cy="75" r="1" fill="#00aaff" opacity="0.5"/>
  <circle cx="22" cy="60" r="0.7" fill="#40ccff" opacity="0.4"/>
  <circle cx="278" cy="55" r="0.7" fill="#40ccff" opacity="0.4"/>
</svg>` },
  { id: 93, title: "Strategy Chess", concept: "chessboard with AI pieces", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a0e0a;stop-opacity:1" />
    </linearGradient>

    <!-- Mahogany board gradient -->
    <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3d1a0e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#5c2a14;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2a0e08;stop-opacity:1" />
    </linearGradient>

    <!-- Ivory square -->
    <linearGradient id="ivoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0e6d0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d4c4a0;stop-opacity:1" />
    </linearGradient>

    <!-- Obsidian square -->
    <linearGradient id="obsidianGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1c1010;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a0808;stop-opacity:1" />
    </linearGradient>

    <!-- Board edge sheen -->
    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#8b4513;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#6b300f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3d1a0e;stop-opacity:1" />
    </linearGradient>

    <!-- Glowing king gradient -->
    <radialGradient id="kingGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffe566;stop-opacity:1" />
      <stop offset="40%" style="stop-color:#ffa500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ff6600;stop-opacity:0" />
    </radialGradient>

    <!-- King piece body -->
    <linearGradient id="kingBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffe566;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ffc200;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#cc8800;stop-opacity:1" />
    </linearGradient>

    <!-- Ivory piece gradient -->
    <linearGradient id="ivoryPiece" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5ead8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c8b890;stop-opacity:1" />
    </linearGradient>

    <!-- Obsidian piece gradient -->
    <linearGradient id="obsidPiece" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3a2828;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f0808;stop-opacity:1" />
    </linearGradient>

    <!-- Ambient glow filter for king -->
    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle drop shadow for pieces -->
    <filter id="pieceShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.7"/>
    </filter>

    <!-- Board perspective transform -->
    <!-- We draw the board using a perspective projection manually -->

    <!-- Text glow -->
    <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- King aura outer -->
    <radialGradient id="kingAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffaa00;stop-opacity:0.6" />
      <stop offset="60%" style="stop-color:#ff6600;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#ff3300;stop-opacity:0" />
    </radialGradient>

    <!-- Clip path for board area -->
    <clipPath id="boardClip">
      <polygon points="30,95 270,95 230,160 70,160"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle vignette overlay -->
  <radialGradient id="vignetteGrad" cx="50%" cy="50%" r="70%">
    <stop offset="60%" style="stop-color:#000000;stop-opacity:0" />
    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.6" />
  </radialGradient>

  <!-- ==================== CHESSBOARD IN PERSPECTIVE ==================== -->
  <!-- Board drawn as perspective trapezoid, 4x4 visible grid -->
  <!-- Perspective: top edge narrow, bottom edge wide -->
  <!-- Board top-left: (55,82), top-right: (245,82) -->
  <!-- Board bottom-left: (15,158), bottom-right: (285,158) -->

  <!-- Board base (mahogany frame) -->
  <polygon points="48,80 252,80 292,162 8,162" fill="url(#edgeGrad)" stroke="#4a1e0a" stroke-width="1"/>

  <!-- Board inner surface -->
  <polygon points="55,85 245,85 282,158 18,158" fill="url(#boardGrad)"/>

  <!-- Chessboard squares — 4 columns x 3 rows visible in perspective -->
  <!-- Each square is a parallelogram in perspective space -->
  <!-- We compute 5 column dividers and 4 row dividers -->

  <!-- Column positions at top: 55, 105, 155, 205, 245 -->
  <!-- Column positions at bottom: 18, 84, 150, 216, 282 -->
  <!-- Row positions: top=85, r1=109, r2=133, bottom=158 -->

  <!-- Row 1 (top row) squares -->
  <!-- Square (0,0) obsidian -->
  <polygon points="55,85 105,85 84,109 18,109" fill="url(#obsidianGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (1,0) ivory -->
  <polygon points="105,85 155,85 150,109 84,109" fill="url(#ivoryGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (2,0) obsidian -->
  <polygon points="155,85 205,85 216,109 150,109" fill="url(#obsidianGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (3,0) ivory -->
  <polygon points="205,85 245,85 282,109 216,109" fill="url(#ivoryGrad)" stroke="#2a0e08" stroke-width="0.5"/>

  <!-- Row 2 (middle row) squares -->
  <!-- Square (0,1) ivory -->
  <polygon points="18,109 84,109 84,133 18,133" fill="url(#ivoryGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (1,1) obsidian -->
  <polygon points="84,109 150,109 150,133 84,133" fill="url(#obsidianGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (2,1) ivory -->
  <polygon points="150,109 216,109 216,133 150,133" fill="url(#ivoryGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (3,1) obsidian -->
  <polygon points="216,109 282,109 282,133 216,133" fill="url(#obsidianGrad)" stroke="#2a0e08" stroke-width="0.5"/>

  <!-- Row 3 (bottom row) squares -->
  <!-- Square (0,2) obsidian -->
  <polygon points="18,133 84,133 84,158 18,158" fill="url(#obsidianGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (1,2) ivory -->
  <polygon points="84,133 150,133 150,158 84,158" fill="url(#ivoryGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (2,2) obsidian -->
  <polygon points="150,133 216,133 216,158 150,158" fill="url(#obsidianGrad)" stroke="#2a0e08" stroke-width="0.5"/>
  <!-- Square (3,2) ivory -->
  <polygon points="216,133 282,133 282,158 216,158" fill="url(#ivoryGrad)" stroke="#2a0e08" stroke-width="0.5"/>

  <!-- Board edge highlight lines -->
  <line x1="55" y1="85" x2="245" y2="85" stroke="#7a3520" stroke-width="1" opacity="0.8"/>
  <line x1="18" y1="109" x2="282" y2="109" stroke="#7a3520" stroke-width="0.8" opacity="0.6"/>
  <line x1="18" y1="133" x2="282" y2="133" stroke="#7a3520" stroke-width="0.8" opacity="0.6"/>

  <!-- ==================== CHESS PIECES ==================== -->

  <!-- Piece centers (approximate board square centers):
       Col 0 mid-bottom: x~51, Col 1: x~117, Col 2: x~183, Col 3: x~249
       Row 0 center y: 97, Row 1 center y: 121, Row 2 center y: 145 -->

  <!-- ROOK — obsidian piece on square (0,0), top-left area -->
  <!-- Small rook silhouette -->
  <g filter="url(#pieceShadow)">
    <!-- Base -->
    <ellipse cx="80" cy="104" rx="7" ry="3" fill="url(#obsidPiece)" opacity="0.9"/>
    <!-- Shaft -->
    <rect x="76" y="91" width="8" height="13" rx="1" fill="url(#obsidPiece)"/>
    <!-- Battlements -->
    <rect x="75" y="87" width="3" height="5" rx="0.5" fill="url(#obsidPiece)"/>
    <rect x="79" y="87" width="2" height="5" rx="0.5" fill="#1a0a0a"/>
    <rect x="82" y="87" width="3" height="5" rx="0.5" fill="url(#obsidPiece)"/>
    <!-- Highlight -->
    <line x1="77" y1="88" x2="77" y2="103" stroke="#5a3030" stroke-width="0.8" opacity="0.6"/>
  </g>

  <!-- KNIGHT — ivory piece on square (2,0) -->
  <g filter="url(#pieceShadow)">
    <!-- Base -->
    <ellipse cx="183" cy="104" rx="7" ry="3" fill="url(#ivoryPiece)" opacity="0.9"/>
    <!-- Body -->
    <rect x="179" y="94" width="8" height="10" rx="2" fill="url(#ivoryPiece)"/>
    <!-- Head (horse shape simplified) -->
    <ellipse cx="184" cy="90" rx="5" ry="5" fill="url(#ivoryPiece)"/>
    <!-- Snout -->
    <ellipse cx="188" cy="92" rx="3" ry="2.5" fill="url(#ivoryPiece)"/>
    <!-- Ear -->
    <polygon points="181,86 183,82 185,86" fill="url(#ivoryPiece)"/>
    <!-- Eye -->
    <circle cx="186" cy="89" r="1" fill="#2a1a0a"/>
    <!-- Mane highlight -->
    <path d="M181,86 Q180,91 180,95" stroke="#e0d0b0" stroke-width="0.8" fill="none" opacity="0.7"/>
  </g>

  <!-- BISHOP — ivory piece on square (1,1) -->
  <g filter="url(#pieceShadow)">
    <!-- Base -->
    <ellipse cx="117" cy="128" rx="7" ry="3" fill="url(#ivoryPiece)" opacity="0.9"/>
    <!-- Shaft -->
    <path d="M114,128 Q113,118 117,110 Q121,118 120,128Z" fill="url(#ivoryPiece)"/>
    <!-- Ball on top -->
    <circle cx="117" cy="108" r="4" fill="url(#ivoryPiece)"/>
    <!-- Mitre slit -->
    <line x1="117" y1="104" x2="117" y2="112" stroke="#c8b070" stroke-width="0.8" opacity="0.6"/>
    <!-- Highlight -->
    <path d="M115,127 Q114,118 117,110" stroke="#f0e0c0" stroke-width="0.8" fill="none" opacity="0.5"/>
  </g>

  <!-- PAWN — obsidian on square (3,1) -->
  <g filter="url(#pieceShadow)">
    <!-- Base -->
    <ellipse cx="249" cy="127" rx="6" ry="2.5" fill="url(#obsidPiece)" opacity="0.9"/>
    <!-- Shaft -->
    <path d="M246,127 Q245,120 249,114 Q253,120 252,127Z" fill="url(#obsidPiece)"/>
    <!-- Head -->
    <circle cx="249" cy="112" r="4" fill="url(#obsidPiece)"/>
    <!-- Highlight -->
    <path d="M247,127 Q246,120 249,114" stroke="#5a3030" stroke-width="0.8" fill="none" opacity="0.5"/>
  </g>

  <!-- PAWN — ivory on square (0,2) -->
  <g filter="url(#pieceShadow)">
    <!-- Base -->
    <ellipse cx="51" cy="151" rx="6" ry="2.5" fill="url(#ivoryPiece)" opacity="0.9"/>
    <!-- Shaft -->
    <path d="M48,151 Q47,144 51,138 Q55,144 54,151Z" fill="url(#ivoryPiece)"/>
    <!-- Head -->
    <circle cx="51" cy="136" r="4" fill="url(#ivoryPiece)"/>
    <!-- Highlight -->
    <path d="M49,151 Q48,144 51,138" stroke="#f0e0c0" stroke-width="0.8" fill="none" opacity="0.5"/>
  </g>

  <!-- ==================== GLOWING KING — center-right, square (2,2) ==================== -->
  <!-- King is at x~183, y~145 area (slightly forward = larger) -->
  <!-- Outer aura -->
  <ellipse cx="183" cy="142" rx="28" ry="18" fill="url(#kingAura)" opacity="0.8"/>
  <ellipse cx="183" cy="142" rx="18" ry="11" fill="url(#kingGlow)" opacity="0.5"/>

  <!-- King piece with glow filter -->
  <g filter="url(#glowFilter)">
    <!-- Base platform -->
    <ellipse cx="183" cy="154" rx="10" ry="4" fill="url(#kingBody)" opacity="0.9"/>
    <!-- Lower body -->
    <path d="M177,154 Q175,143 178,136 Q183,134 188,136 Q191,143 189,154Z" fill="url(#kingBody)"/>
    <!-- Mid flare -->
    <ellipse cx="183" cy="136" rx="7" ry="2.5" fill="#ffd700"/>
    <!-- Upper shaft -->
    <rect x="181" y="120" width="4" height="16" rx="1" fill="url(#kingBody)"/>
    <!-- Crown base -->
    <rect x="178" y="118" width="10" height="4" rx="1" fill="#ffd700"/>
    <!-- Crown points -->
    <polygon points="178,118 180,110 182,118" fill="#ffd700"/>
    <polygon points="182,118 183,108 184,118" fill="#ffe566"/>
    <polygon points="184,118 186,110 188,118" fill="#ffd700"/>
    <!-- Cross on king -->
    <rect x="182.5" y="104" width="1.5" height="6" fill="#fff5a0"/>
    <rect x="180.5" y="106" width="5.5" height="1.5" fill="#fff5a0"/>
    <!-- Crown jewel dots -->
    <circle cx="180" cy="115" r="1" fill="#ff4400" opacity="0.9"/>
    <circle cx="183" cy="114" r="1.2" fill="#ff6600" opacity="0.9"/>
    <circle cx="186" cy="115" r="1" fill="#ff4400" opacity="0.9"/>
    <!-- Specular highlight on shaft -->
    <path d="M182,154 Q181,143 182,136" stroke="#fff5a0" stroke-width="0.8" fill="none" opacity="0.6"/>
  </g>

  <!-- King glow ring on board -->
  <ellipse cx="183" cy="155" rx="12" ry="4" fill="none" stroke="#ffaa00" stroke-width="1.5" opacity="0.6"/>
  <ellipse cx="183" cy="155" rx="16" ry="6" fill="none" stroke="#ff6600" stroke-width="0.8" opacity="0.3"/>

  <!-- ==================== CIRCUIT / AI MOTIF ==================== -->
  <!-- Subtle circuit traces suggesting AI in top corners -->
  <g opacity="0.25" stroke="#00aaff" stroke-width="0.7" fill="none">
    <line x1="0" y1="20" x2="30" y2="20"/>
    <line x1="30" y1="20" x2="30" y2="35"/>
    <line x1="30" y1="35" x2="50" y2="35"/>
    <circle cx="50" cy="35" r="2" fill="#00aaff" stroke="none"/>
    <line x1="0" y1="30" x2="15" y2="30"/>
    <line x1="15" y1="30" x2="15" y2="45"/>
    <circle cx="15" cy="45" r="1.5" fill="#00aaff" stroke="none"/>
  </g>
  <g opacity="0.25" stroke="#00aaff" stroke-width="0.7" fill="none">
    <line x1="300" y1="20" x2="270" y2="20"/>
    <line x1="270" y1="20" x2="270" y2="35"/>
    <line x1="270" y1="35" x2="250" y2="35"/>
    <circle cx="250" cy="35" r="2" fill="#00aaff" stroke="none"/>
    <line x1="300" y1="30" x2="285" y2="30"/>
    <line x1="285" y1="30" x2="285" y2="45"/>
    <circle cx="285" cy="45" r="1.5" fill="#00aaff" stroke="none"/>
  </g>

  <!-- ==================== TYPOGRAPHY ==================== -->
  <!-- Main title -->
  <text
    x="150"
    y="22"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="16"
    font-weight="bold"
    letter-spacing="2"
    text-anchor="middle"
    fill="#d4a820"
    filter="url(#textGlow)"
  >AGENTIC</text>

  <!-- Subtitle -->
  <text
    x="150"
    y="38"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="10"
    font-weight="normal"
    letter-spacing="4"
    text-anchor="middle"
    fill="#8b7040"
  >LEAD  GEN</text>

  <!-- Separator line with diamond -->
  <line x1="80" y1="48" x2="140" y2="48" stroke="#5c3a10" stroke-width="0.8"/>
  <polygon points="150,44 154,48 150,52 146,48" fill="#d4a820" opacity="0.8"/>
  <line x1="160" y1="48" x2="220" y2="48" stroke="#5c3a10" stroke-width="0.8"/>

  <!-- Bottom tagline -->
  <text
    x="150"
    y="185"
    font-family="'Courier New', monospace"
    font-size="7"
    letter-spacing="2.5"
    text-anchor="middle"
    fill="#5c3a10"
    opacity="0.9"
  >STRATEGY  ·  PRECISION  ·  AI</text>

  <!-- Vignette overlay -->
  <radialGradient id="vignette2" cx="50%" cy="50%" r="70%">
    <stop offset="60%" style="stop-color:#000000;stop-opacity:0" />
    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.5" />
  </radialGradient>
  <rect width="300" height="200" fill="url(#vignette2)"/>
</svg>` },
  { id: 94, title: "Spiral Convergence", concept: "data points spiraling to center", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep space background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#0a0f1e"/>
      <stop offset="100%" stop-color="#020408"/>
    </radialGradient>

    <!-- Central glow gradient -->
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="20%" stop-color="#e8f4ff" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#60b8ff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#1a3a6e" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer halo -->
    <radialGradient id="outerHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4a9fff" stop-opacity="0.15"/>
      <stop offset="60%" stop-color="#1a5fa8" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#0d2a4e" stop-opacity="0"/>
    </radialGradient>

    <!-- Blur filters -->
    <filter id="coreBlur" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3.5"/>
    </filter>
    <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>
    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="tinyGlow" x="-300%" y="-300%" width="700%" height="700%">
      <feGaussianBlur stdDeviation="0.6"/>
    </filter>

    <!-- Spiral arm gradient along path -->
    <linearGradient id="armGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1a6abf" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#7dd3ff" stop-opacity="0.55"/>
    </linearGradient>

    <!-- Clip for clean bounds -->
    <clipPath id="bounds">
      <rect width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Subtle outer halo around spiral center -->
  <circle cx="150" cy="88" r="70" fill="url(#outerHalo)" filter="url(#softGlow)"/>

  <g clip-path="url(#bounds)">

    <!-- ===================== SPIRAL ARMS (stroke paths) ===================== -->
    <!-- Each arm: a bezier that tightens toward center (150, 88) -->

    <!-- Arm 1 - rightward sweep -->
    <path d="M 230 55 C 210 50, 190 55, 175 65 C 163 73, 158 80, 152 86"
          fill="none" stroke="#4a9fff" stroke-width="0.8" stroke-opacity="0.35"
          stroke-linecap="round"/>
    <!-- Arm 1 extension outer -->
    <path d="M 265 42 C 250 38, 238 44, 230 55"
          fill="none" stroke="#2a6aaf" stroke-width="0.5" stroke-opacity="0.2"
          stroke-linecap="round"/>

    <!-- Arm 2 - bottom right sweep -->
    <path d="M 220 125 C 205 115, 190 108, 175 100 C 164 93, 157 90, 151 88"
          fill="none" stroke="#5ab4ff" stroke-width="0.8" stroke-opacity="0.35"
          stroke-linecap="round"/>
    <path d="M 255 150 C 242 138, 230 130, 220 125"
          fill="none" stroke="#2a6aaf" stroke-width="0.5" stroke-opacity="0.2"
          stroke-linecap="round"/>

    <!-- Arm 3 - left sweep -->
    <path d="M 72 120 C 90 112, 108 108, 124 100 C 137 93, 144 90, 149 88"
          fill="none" stroke="#4a9fff" stroke-width="0.8" stroke-opacity="0.35"
          stroke-linecap="round"/>
    <path d="M 40 138 C 52 130, 63 124, 72 120"
          fill="none" stroke="#2a6aaf" stroke-width="0.5" stroke-opacity="0.2"
          stroke-linecap="round"/>

    <!-- Arm 4 - top left sweep -->
    <path d="M 82 52 C 98 55, 115 62, 128 72 C 139 80, 145 84, 149 87"
          fill="none" stroke="#5ab4ff" stroke-width="0.8" stroke-opacity="0.35"
          stroke-linecap="round"/>
    <path d="M 48 38 C 60 42, 72 47, 82 52"
          fill="none" stroke="#2a6aaf" stroke-width="0.5" stroke-opacity="0.2"
          stroke-linecap="round"/>

    <!-- Inner swirl connectors — tighter orbits -->
    <path d="M 175 70 C 168 72, 162 76, 157 81 C 154 84, 152 86, 151 87"
          fill="none" stroke="#7dd3ff" stroke-width="0.6" stroke-opacity="0.45"
          stroke-linecap="round"/>
    <path d="M 172 108 C 165 104, 160 98, 155 93 C 153 91, 151 89, 150.5 88"
          fill="none" stroke="#7dd3ff" stroke-width="0.6" stroke-opacity="0.45"
          stroke-linecap="round"/>
    <path d="M 126 104 C 133 100, 139 96, 144 92 C 147 90, 149 89, 150 88"
          fill="none" stroke="#7dd3ff" stroke-width="0.6" stroke-opacity="0.45"
          stroke-linecap="round"/>
    <path d="M 130 72 C 136 76, 141 80, 145 84 C 147 86, 149 87, 150 88"
          fill="none" stroke="#7dd3ff" stroke-width="0.6" stroke-opacity="0.45"
          stroke-linecap="round"/>

    <!-- ===================== SCATTERED OUTER DOTS ===================== -->
    <!-- Faint, sparse, far from center — light blue -->

    <!-- Ring 5 (outermost, very faint) -->
    <circle cx="265" cy="42"  r="1.4" fill="#2a5a9f" fill-opacity="0.45"/>
    <circle cx="248" cy="28"  r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="230" cy="22"  r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="210" cy="20"  r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="188" cy="18"  r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>
    <circle cx="168" cy="16"  r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="148" cy="15"  r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="128" cy="17"  r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="108" cy="22"  r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>
    <circle cx="90"  cy="28"  r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="50"  cy="38"  r="1.4" fill="#2a5a9f" fill-opacity="0.42"/>
    <circle cx="35"  cy="55"  r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="28"  cy="72"  r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="25"  cy="92"  r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="28"  cy="112" r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>
    <circle cx="36"  cy="130" r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="48"  cy="147" r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="63"  cy="160" r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="82"  cy="170" r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>
    <circle cx="105" cy="176" r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="128" cy="179" r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="150" cy="180" r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="172" cy="178" r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>
    <circle cx="194" cy="174" r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="215" cy="165" r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="234" cy="153" r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="250" cy="138" r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>
    <circle cx="262" cy="120" r="1.2" fill="#2a5a9f" fill-opacity="0.38"/>
    <circle cx="270" cy="100" r="1.0" fill="#2a5a9f" fill-opacity="0.32"/>
    <circle cx="272" cy="78"  r="1.3" fill="#2a5a9f" fill-opacity="0.40"/>
    <circle cx="268" cy="59"  r="1.1" fill="#2a5a9f" fill-opacity="0.35"/>

    <!-- Ring 4 (outer) -->
    <circle cx="230" cy="55"  r="1.8" fill="#3a78c8" fill-opacity="0.55"/>
    <circle cx="215" cy="38"  r="1.6" fill="#3572c2" fill-opacity="0.50"/>
    <circle cx="195" cy="30"  r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="172" cy="27"  r="1.7" fill="#3a78c8" fill-opacity="0.52"/>
    <circle cx="150" cy="26"  r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="128" cy="30"  r="1.8" fill="#3a78c8" fill-opacity="0.55"/>
    <circle cx="107" cy="38"  r="1.6" fill="#3572c2" fill-opacity="0.50"/>
    <circle cx="88"  cy="52"  r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="72"  cy="68"  r="1.7" fill="#3a78c8" fill-opacity="0.52"/>
    <circle cx="62"  cy="88"  r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="65"  cy="108" r="1.8" fill="#3a78c8" fill-opacity="0.55"/>
    <circle cx="72"  cy="128" r="1.6" fill="#3572c2" fill-opacity="0.50"/>
    <circle cx="85"  cy="146" r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="103" cy="160" r="1.7" fill="#3a78c8" fill-opacity="0.52"/>
    <circle cx="124" cy="167" r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="150" cy="169" r="1.8" fill="#3a78c8" fill-opacity="0.55"/>
    <circle cx="175" cy="165" r="1.6" fill="#3572c2" fill-opacity="0.50"/>
    <circle cx="197" cy="156" r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="215" cy="142" r="1.7" fill="#3a78c8" fill-opacity="0.52"/>
    <circle cx="228" cy="124" r="1.5" fill="#3572c2" fill-opacity="0.48"/>
    <circle cx="235" cy="103" r="1.8" fill="#3a78c8" fill-opacity="0.55"/>
    <circle cx="234" cy="79"  r="1.6" fill="#3572c2" fill-opacity="0.50"/>

    <!-- Ring 3 (mid-outer) -->
    <circle cx="220" cy="68"  r="2.0" fill="#4a8ed8" fill-opacity="0.62"/>
    <circle cx="210" cy="52"  r="1.9" fill="#4888d4" fill-opacity="0.60"/>
    <circle cx="194" cy="44"  r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="176" cy="40"  r="2.1" fill="#4a8ed8" fill-opacity="0.65"/>
    <circle cx="150" cy="39"  r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="124" cy="43"  r="2.0" fill="#4a8ed8" fill-opacity="0.62"/>
    <circle cx="106" cy="52"  r="1.9" fill="#4888d4" fill-opacity="0.60"/>
    <circle cx="90"  cy="66"  r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="80"  cy="84"  r="2.1" fill="#4a8ed8" fill-opacity="0.65"/>
    <circle cx="78"  cy="104" r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="84"  cy="122" r="2.0" fill="#4a8ed8" fill-opacity="0.62"/>
    <circle cx="98"  cy="138" r="1.9" fill="#4888d4" fill-opacity="0.60"/>
    <circle cx="116" cy="150" r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="138" cy="155" r="2.1" fill="#4a8ed8" fill-opacity="0.65"/>
    <circle cx="162" cy="154" r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="184" cy="147" r="2.0" fill="#4a8ed8" fill-opacity="0.62"/>
    <circle cx="202" cy="134" r="1.9" fill="#4888d4" fill-opacity="0.60"/>
    <circle cx="214" cy="116" r="1.8" fill="#4888d4" fill-opacity="0.58"/>
    <circle cx="220" cy="96"  r="2.1" fill="#4a8ed8" fill-opacity="0.65"/>

    <!-- Ring 2 (mid-inner) — brighter, denser -->
    <circle cx="200" cy="76"  r="2.2" fill="#5aabee" fill-opacity="0.72"/>
    <circle cx="196" cy="60"  r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="182" cy="53"  r="2.1" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="166" cy="50"  r="2.3" fill="#5aabee" fill-opacity="0.75"/>
    <circle cx="150" cy="50"  r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="134" cy="52"  r="2.2" fill="#5aabee" fill-opacity="0.72"/>
    <circle cx="119" cy="58"  r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="105" cy="68"  r="2.1" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="97"  cy="82"  r="2.3" fill="#5aabee" fill-opacity="0.75"/>
    <circle cx="96"  cy="98"  r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="102" cy="114" r="2.2" fill="#5aabee" fill-opacity="0.72"/>
    <circle cx="114" cy="128" r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="130" cy="138" r="2.1" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="150" cy="142" r="2.3" fill="#5aabee" fill-opacity="0.75"/>
    <circle cx="170" cy="138" r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="186" cy="128" r="2.2" fill="#5aabee" fill-opacity="0.72"/>
    <circle cx="198" cy="112" r="2.0" fill="#58a8ea" fill-opacity="0.70"/>
    <circle cx="204" cy="95"  r="2.3" fill="#5aabee" fill-opacity="0.75"/>

    <!-- Ring 1 (innermost dots) — bright, tight -->
    <circle cx="175" cy="70"  r="2.4" fill="#7dd3ff" fill-opacity="0.82"/>
    <circle cx="168" cy="64"  r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="158" cy="62"  r="2.3" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="150" cy="62"  r="2.5" fill="#7dd3ff" fill-opacity="0.85"/>
    <circle cx="140" cy="64"  r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="131" cy="70"  r="2.4" fill="#7dd3ff" fill-opacity="0.82"/>
    <circle cx="124" cy="78"  r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="120" cy="88"  r="2.3" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="122" cy="98"  r="2.5" fill="#7dd3ff" fill-opacity="0.85"/>
    <circle cx="130" cy="107" r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="140" cy="114" r="2.4" fill="#7dd3ff" fill-opacity="0.82"/>
    <circle cx="150" cy="116" r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="160" cy="113" r="2.3" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="169" cy="107" r="2.5" fill="#7dd3ff" fill-opacity="0.85"/>
    <circle cx="176" cy="98"  r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>
    <circle cx="179" cy="88"  r="2.4" fill="#7dd3ff" fill-opacity="0.82"/>
    <circle cx="177" cy="78"  r="2.2" fill="#7ad0fc" fill-opacity="0.80"/>

    <!-- Micro ring (just outside core) — near-white -->
    <circle cx="162" cy="78"  r="1.8" fill="#b8eaff" fill-opacity="0.90"/>
    <circle cx="156" cy="74"  r="1.7" fill="#c4eeff" fill-opacity="0.88"/>
    <circle cx="150" cy="73"  r="2.0" fill="#c4eeff" fill-opacity="0.90"/>
    <circle cx="144" cy="75"  r="1.7" fill="#c4eeff" fill-opacity="0.88"/>
    <circle cx="139" cy="80"  r="1.8" fill="#b8eaff" fill-opacity="0.90"/>
    <circle cx="137" cy="87"  r="1.7" fill="#c4eeff" fill-opacity="0.88"/>
    <circle cx="139" cy="94"  r="1.8" fill="#b8eaff" fill-opacity="0.90"/>
    <circle cx="144" cy="100" r="1.7" fill="#c4eeff" fill-opacity="0.88"/>
    <circle cx="150" cy="103" r="2.0" fill="#c4eeff" fill-opacity="0.90"/>
    <circle cx="156" cy="101" r="1.7" fill="#c4eeff" fill-opacity="0.88"/>
    <circle cx="162" cy="96"  r="1.8" fill="#b8eaff" fill-opacity="0.90"/>
    <circle cx="164" cy="88"  r="1.7" fill="#c4eeff" fill-opacity="0.88"/>

    <!-- ===================== CORE GLOW LAYERS ===================== -->

    <!-- Soft outer halo (blurred) -->
    <circle cx="150" cy="88" r="22" fill="#4a9fff" fill-opacity="0.18" filter="url(#softGlow)"/>
    <!-- Mid glow -->
    <circle cx="150" cy="88" r="14" fill="#7dd3ff" fill-opacity="0.40" filter="url(#coreBlur)"/>
    <!-- Inner bright glow -->
    <circle cx="150" cy="88" r="8"  fill="#b8e8ff" fill-opacity="0.75" filter="url(#coreBlur)"/>
    <!-- Core dot — sharp white center -->
    <circle cx="150" cy="88" r="4.5" fill="url(#coreGlow)"/>
    <circle cx="150" cy="88" r="3.0" fill="#e8f6ff" fill-opacity="0.97"/>
    <circle cx="150" cy="88" r="1.8" fill="#ffffff"/>

    <!-- Specular highlight -->
    <circle cx="148.8" cy="86.8" r="0.9" fill="#ffffff" fill-opacity="0.95"/>

  </g>

  <!-- ===================== TEXT ===================== -->
  <!-- "AGENTIC" label -->
  <text x="150" y="157"
        font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="13"
        font-weight="300"
        fill="#7dd3ff"
        fill-opacity="0.80"
        letter-spacing="5.5"
        text-anchor="middle">AGENTIC</text>

  <!-- "LEAD GEN" label — bold -->
  <text x="150" y="172"
        font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="15"
        font-weight="600"
        fill="#ffffff"
        fill-opacity="0.95"
        letter-spacing="4"
        text-anchor="middle">LEAD GEN</text>

  <!-- Thin rule above text -->
  <line x1="90" y1="148" x2="210" y2="148"
        stroke="#4a8ed8" stroke-width="0.5" stroke-opacity="0.40"/>

</svg>` },
  { id: 95, title: "Crown Bar Chart", concept: "bars forming crown silhouette", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7B2FBE"/>
      <stop offset="100%" stop-color="#4A0E8F"/>
    </linearGradient>
    <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9B4FDE"/>
      <stop offset="100%" stop-color="#6A1FAF"/>
    </linearGradient>
    <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C47FFF"/>
      <stop offset="100%" stop-color="#8B3FCF"/>
    </linearGradient>
    <linearGradient id="bar4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9B4FDE"/>
      <stop offset="100%" stop-color="#6A1FAF"/>
    </linearGradient>
    <linearGradient id="bar5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7B2FBE"/>
      <stop offset="100%" stop-color="#4A0E8F"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#4A0E8F" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="white"/>

  <!-- Crown bar chart mark -->
  <!-- 5 bars forming crown silhouette: outer bars shorter (crown points), inner bars taller, center tallest -->
  <!-- Crown shape: tall-short-taller-short-tall with pointed tops -->

  <!-- Bar 1 — left outer (crown left point, tall) -->
  <g filter="url(#shadow)">
    <rect x="52" y="48" width="28" height="90" rx="3" ry="3" fill="url(#bar1)"/>
    <!-- Crown point top -->
    <polygon points="52,48 66,30 80,48" fill="url(#bar1)"/>
    <!-- Jewel dot -->
    <circle cx="66" cy="27" r="4" fill="#E8B4FF" filter="url(#glow)"/>
  </g>

  <!-- Bar 2 — left inner (crown valley, shorter) -->
  <g filter="url(#shadow)">
    <rect x="86" y="82" width="28" height="56" rx="3" ry="3" fill="url(#bar2)"/>
    <!-- Flat top — valley of crown -->
    <rect x="86" y="79" width="28" height="6" rx="2" ry="2" fill="url(#bar2)"/>
  </g>

  <!-- Bar 3 — center (crown center point, tallest) -->
  <g filter="url(#shadow)">
    <rect x="120" y="42" width="32" height="96" rx="3" ry="3" fill="url(#bar3)"/>
    <!-- Crown center point -->
    <polygon points="120,42 136,20 152,42" fill="url(#bar3)"/>
    <!-- Center jewel -->
    <circle cx="136" cy="17" r="5" fill="#FFE0FF" filter="url(#glow)"/>
    <!-- Small diamond accent -->
    <polygon points="136,10 140,17 136,24 132,17" fill="#C47FFF" opacity="0.6"/>
  </g>

  <!-- Bar 4 — right inner (crown valley, shorter) -->
  <g filter="url(#shadow)">
    <rect x="158" y="82" width="28" height="56" rx="3" ry="3" fill="url(#bar4)"/>
    <!-- Flat top — valley of crown -->
    <rect x="158" y="79" width="28" height="6" rx="2" ry="2" fill="url(#bar4)"/>
  </g>

  <!-- Bar 5 — right outer (crown right point, tall) -->
  <g filter="url(#shadow)">
    <rect x="192" y="48" width="28" height="90" rx="3" ry="3" fill="url(#bar5)"/>
    <!-- Crown point top -->
    <polygon points="192,48 206,30 220,48" fill="url(#bar5)"/>
    <!-- Jewel dot -->
    <circle cx="206" cy="27" r="4" fill="#E8B4FF" filter="url(#glow)"/>
  </g>

  <!-- Crown base band connecting all bars -->
  <rect x="52" y="130" width="168" height="8" rx="4" ry="4" fill="#6A1FAF" opacity="0.85"/>

  <!-- Ground line / baseline -->
  <rect x="42" y="138" width="188" height="3" rx="1.5" fill="#4A0E8F" opacity="0.2"/>

  <!-- Subtle tick marks on bars (analytics detail) -->
  <line x1="52" y1="100" x2="80" y2="100" stroke="white" stroke-width="1" opacity="0.25"/>
  <line x1="120" y1="90" x2="152" y2="90" stroke="white" stroke-width="1" opacity="0.25"/>
  <line x1="192" y1="100" x2="220" y2="100" stroke="white" stroke-width="1" opacity="0.25"/>

  <!-- Wordmark -->
  <text x="136" y="162" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="13" font-weight="700" letter-spacing="2" fill="#4A0E8F">AGENTIC</text>
  <text x="136" y="178" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="9.5" font-weight="400" letter-spacing="3.5" fill="#7B2FBE" opacity="0.85">LEAD  GEN</text>

  <!-- Decorative rule lines flanking wordmark -->
  <line x1="42" y1="155" x2="92" y2="155" stroke="#C47FFF" stroke-width="0.75" opacity="0.5"/>
  <line x1="180" y1="155" x2="230" y2="155" stroke="#C47FFF" stroke-width="0.75" opacity="0.5"/>
</svg>` },
  { id: 96, title: "Dual Triangles", concept: "interlocking triangles as diamond", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1E6FFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4DAAFF;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF4D4D;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF7A5A;stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#FFFFFF"/>

  <!-- Icon group centered at x=58, y=100 -->
  <!-- Up-pointing triangle (growth) — electric blue -->
  <polygon
    points="58,44 92,104 24,104"
    fill="url(#blueGrad)"
    fill-opacity="0.92"
    filter="url(#glow)"
  />
  <!-- Down-pointing triangle (funnel) — coral red -->
  <polygon
    points="58,156 24,96 92,96"
    fill="url(#redGrad)"
    fill-opacity="0.92"
    filter="url(#glow)"
  />

  <!-- Overlap region — blended center diamond -->
  <!-- Intersection of the two triangles forms a hexagon/diamond; render as a crisp overlay -->
  <polygon
    points="58,96 75.5,100 58,104 40.5,100"
    fill="#8B44CC"
    fill-opacity="0.55"
  />
  <!-- Wider overlap band -->
  <polygon
    points="40.5,96 75.5,96 75.5,104 40.5,104"
    fill="none"
  />

  <!-- Recompute: exact overlap of two triangles -->
  <!-- Up triangle: points 58,44 92,104 24,104 -->
  <!-- Down triangle: points 58,156 24,96 92,96 -->
  <!-- Overlap is a hexagon: left=(24,100) top-left=(41,96) top-right=(75,96) right=(92,100) bot-right=(75,104) bot-left=(41,104) -->
  <polygon
    points="24,100 41,96 75,96 92,100 75,104 41,104"
    fill="#CC44AA"
    fill-opacity="0.35"
  />

  <!-- Outline strokes for crispness -->
  <polygon
    points="58,44 92,104 24,104"
    fill="none"
    stroke="#1E6FFF"
    stroke-width="1.5"
    stroke-linejoin="round"
  />
  <polygon
    points="58,156 24,96 92,96"
    fill="none"
    stroke="#FF4D4D"
    stroke-width="1.5"
    stroke-linejoin="round"
  />

  <!-- Center dot — precision point -->
  <circle cx="58" cy="100" r="3.5" fill="#FFFFFF" stroke="#333" stroke-width="1"/>

  <!-- Wordmark -->
  <text
    x="114"
    y="88"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="22"
    font-weight="700"
    letter-spacing="-0.5"
    fill="#1A1A2E"
  >Agentic</text>

  <text
    x="114"
    y="113"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="22"
    font-weight="700"
    letter-spacing="-0.5"
    fill="#1E6FFF"
  >Lead</text>

  <text
    x="175"
    y="113"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="22"
    font-weight="700"
    letter-spacing="-0.5"
    fill="#FF4D4D"
  > Gen</text>

  <!-- Tagline -->
  <text
    x="114"
    y="133"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="9.5"
    font-weight="400"
    letter-spacing="2.2"
    fill="#888899"
    text-transform="uppercase"
  >PRECISION · PIPELINE · AI</text>

  <!-- Divider line under wordmark -->
  <line x1="114" y1="120" x2="278" y2="120" stroke="#EBEBF5" stroke-width="1"/>
</svg>` },
  { id: 97, title: "Comet Trail", concept: "blazing comet with data particle tail", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Deep space background gradient -->
    <radialGradient id="spaceBg" cx="30%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0a0a1a"/>
      <stop offset="100%" stop-color="#000005"/>
    </radialGradient>

    <!-- Comet core glow -->
    <radialGradient id="cometCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="30%" stop-color="#e8f4ff" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#7ec8ff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#4a90ff" stop-opacity="0"/>
    </radialGradient>

    <!-- Tail gradient: white core → blue → purple → transparent -->
    <linearGradient id="tailGrad" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="8%" stop-color="#a8d8ff" stop-opacity="0.95"/>
      <stop offset="25%" stop-color="#5b9fff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#7c4dff" stop-opacity="0.55"/>
      <stop offset="75%" stop-color="#5c1e9e" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#2a0060" stop-opacity="0"/>
    </linearGradient>

    <!-- Secondary tail -->
    <linearGradient id="tailGrad2" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#c8e8ff" stop-opacity="0.7"/>
      <stop offset="30%" stop-color="#6b6bff" stop-opacity="0.4"/>
      <stop offset="70%" stop-color="#9b40ff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#4a0080" stop-opacity="0"/>
    </linearGradient>

    <!-- Particle glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Strong core glow -->
    <filter id="coreGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur1"/>
      <feGaussianBlur stdDeviation="8" in="SourceGraphic" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Soft text glow -->
    <filter id="textGlow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip for comet area -->
    <clipPath id="cometClip">
      <rect x="0" y="0" width="300" height="200"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#spaceBg)"/>

  <!-- Subtle star field -->
  <g opacity="0.6">
    <circle cx="15" cy="12" r="0.5" fill="#fff" opacity="0.8"/>
    <circle cx="42" cy="28" r="0.4" fill="#c8d8ff" opacity="0.6"/>
    <circle cx="78" cy="8" r="0.6" fill="#fff" opacity="0.9"/>
    <circle cx="110" cy="18" r="0.3" fill="#fff" opacity="0.5"/>
    <circle cx="145" cy="6" r="0.5" fill="#d0e8ff" opacity="0.7"/>
    <circle cx="178" cy="22" r="0.4" fill="#fff" opacity="0.6"/>
    <circle cx="210" cy="10" r="0.5" fill="#fff" opacity="0.8"/>
    <circle cx="245" cy="30" r="0.3" fill="#c0d0ff" opacity="0.5"/>
    <circle cx="280" cy="15" r="0.4" fill="#fff" opacity="0.7"/>
    <circle cx="290" cy="45" r="0.5" fill="#fff" opacity="0.4"/>
    <circle cx="8" cy="55" r="0.4" fill="#fff" opacity="0.5"/>
    <circle cx="35" cy="68" r="0.3" fill="#d8e8ff" opacity="0.6"/>
    <circle cx="62" cy="50" r="0.5" fill="#fff" opacity="0.7"/>
    <circle cx="25" cy="88" r="0.4" fill="#fff" opacity="0.4"/>
    <circle cx="295" cy="80" r="0.3" fill="#fff" opacity="0.6"/>
    <circle cx="265" cy="62" r="0.5" fill="#c8e0ff" opacity="0.5"/>
    <circle cx="12" cy="130" r="0.4" fill="#fff" opacity="0.5"/>
    <circle cx="40" cy="148" r="0.3" fill="#fff" opacity="0.4"/>
    <circle cx="285" cy="130" r="0.4" fill="#d0d8ff" opacity="0.6"/>
    <circle cx="270" cy="155" r="0.5" fill="#fff" opacity="0.5"/>
    <circle cx="18" cy="170" r="0.3" fill="#fff" opacity="0.4"/>
    <circle cx="52" cy="185" r="0.4" fill="#c8d4ff" opacity="0.5"/>
    <circle cx="92" cy="175" r="0.3" fill="#fff" opacity="0.6"/>
    <circle cx="130" cy="188" r="0.5" fill="#fff" opacity="0.4"/>
    <circle cx="165" cy="178" r="0.3" fill="#d8e4ff" opacity="0.5"/>
    <circle cx="200" cy="190" r="0.4" fill="#fff" opacity="0.6"/>
    <circle cx="240" cy="182" r="0.3" fill="#fff" opacity="0.4"/>
    <circle cx="275" cy="192" r="0.5" fill="#c0ccff" opacity="0.5"/>
  </g>

  <!-- Comet trajectory: from top-left to center-right, angled ~20deg -->
  <!-- Comet core position: ~230, 78 -->

  <!-- === TAIL SYSTEM === -->
  <g clip-path="url(#cometClip)">

    <!-- Main tail body - wide sweep -->
    <path d="M 230 78 C 180 82, 120 90, 60 108 C 30 117, 5 125, -10 132"
          fill="none"
          stroke="url(#tailGrad)"
          stroke-width="18"
          stroke-linecap="round"
          opacity="0.5"/>

    <!-- Main tail body - medium -->
    <path d="M 230 78 C 180 81, 118 88, 55 105 C 25 113, 0 120, -15 127"
          fill="none"
          stroke="url(#tailGrad)"
          stroke-width="10"
          stroke-linecap="round"
          opacity="0.8"/>

    <!-- Core tail - tight bright -->
    <path d="M 230 78 C 185 79, 130 84, 75 98 C 45 106, 15 113, -5 119"
          fill="none"
          stroke="url(#tailGrad)"
          stroke-width="4"
          stroke-linecap="round"
          opacity="1"/>

    <!-- Secondary tail - upper wisp -->
    <path d="M 228 75 C 190 72, 140 71, 85 78 C 55 82, 25 86, 0 88"
          fill="none"
          stroke="url(#tailGrad2)"
          stroke-width="5"
          stroke-linecap="round"
          opacity="0.6"/>

    <!-- Secondary tail - lower wisp -->
    <path d="M 229 81 C 185 88, 130 98, 70 115 C 40 123, 10 130, -10 136"
          fill="none"
          stroke="url(#tailGrad2)"
          stroke-width="6"
          stroke-linecap="round"
          opacity="0.45"/>

    <!-- Data particle trail - scattered nodes -->
    <g filter="url(#glow)">
      <!-- Near particles (bright, blue-white) -->
      <circle cx="215" cy="80" r="1.8" fill="#a8d4ff" opacity="0.95"/>
      <circle cx="205" cy="83" r="1.4" fill="#88c4ff" opacity="0.85"/>
      <circle cx="198" cy="77" r="1.0" fill="#b0d8ff" opacity="0.9"/>
      <circle cx="190" cy="85" r="1.6" fill="#7ab8ff" opacity="0.8"/>
      <circle cx="183" cy="79" r="1.0" fill="#a0ccff" opacity="0.75"/>

      <!-- Mid particles (blue) -->
      <circle cx="172" cy="86" r="1.4" fill="#6aabff" opacity="0.75"/>
      <circle cx="165" cy="81" r="1.1" fill="#80b8ff" opacity="0.7"/>
      <circle cx="158" cy="89" r="1.5" fill="#5a9eff" opacity="0.65"/>
      <circle cx="150" cy="84" r="0.9" fill="#90c0ff" opacity="0.65"/>
      <circle cx="142" cy="90" r="1.3" fill="#5090ff" opacity="0.6"/>
      <circle cx="136" cy="85" r="1.0" fill="#7aacff" opacity="0.6"/>

      <!-- Transition particles (blue-purple) -->
      <circle cx="128" cy="92" r="1.2" fill="#7878ff" opacity="0.55"/>
      <circle cx="120" cy="88" r="0.9" fill="#8880ff" opacity="0.5"/>
      <circle cx="112" cy="94" r="1.1" fill="#9070ff" opacity="0.5"/>
      <circle cx="104" cy="90" r="0.8" fill="#8868ff" opacity="0.45"/>
      <circle cx="97" cy="97" r="1.0" fill="#9060f0" opacity="0.45"/>

      <!-- Far particles (purple, fading) -->
      <circle cx="88" cy="96" r="0.9" fill="#9050e8" opacity="0.38"/>
      <circle cx="80" cy="102" r="1.1" fill="#8848e0" opacity="0.35"/>
      <circle cx="72" cy="99" r="0.7" fill="#7840d8" opacity="0.3"/>
      <circle cx="64" cy="105" r="0.9" fill="#6835cc" opacity="0.28"/>
      <circle cx="56" cy="102" r="0.7" fill="#5828c0" opacity="0.22"/>
      <circle cx="48" cy="108" r="0.8" fill="#4820b0" opacity="0.18"/>
      <circle cx="38" cy="106" r="0.6" fill="#3818a0" opacity="0.14"/>
      <circle cx="28" cy="112" r="0.7" fill="#2d1090" stop-opacity="0.1"/>

      <!-- Scatter off-axis particles -->
      <circle cx="195" cy="73" r="0.9" fill="#90ccff" opacity="0.6"/>
      <circle cx="180" cy="91" r="1.0" fill="#6aa0ff" opacity="0.5"/>
      <circle cx="168" cy="75" r="0.8" fill="#9abcff" opacity="0.55"/>
      <circle cx="155" cy="94" r="0.9" fill="#7090ff" opacity="0.45"/>
      <circle cx="143" cy="80" r="0.7" fill="#8888ff" opacity="0.4"/>
      <circle cx="130" cy="97" r="0.8" fill="#8070f0" opacity="0.38"/>
      <circle cx="117" cy="83" r="0.7" fill="#9068e8" opacity="0.32"/>
      <circle cx="105" cy="99" r="0.8" fill="#8858e0" opacity="0.28"/>
    </g>

    <!-- Comet core halo (outermost glow) -->
    <circle cx="230" cy="78" r="18" fill="url(#cometCore)" opacity="0.35"/>
    <circle cx="230" cy="78" r="12" fill="url(#cometCore)" opacity="0.5"/>
    <circle cx="230" cy="78" r="7" fill="url(#cometCore)" opacity="0.75"/>

    <!-- Comet core (bright nucleus) -->
    <g filter="url(#coreGlow)">
      <circle cx="230" cy="78" r="5" fill="#ffffff" opacity="1"/>
      <circle cx="230" cy="78" r="3" fill="#f0f8ff" opacity="1"/>
      <circle cx="230" cy="78" r="1.5" fill="#ffffff" opacity="1"/>
    </g>

    <!-- Motion streak lines from core -->
    <line x1="230" y1="78" x2="222" y2="80" stroke="#c8e8ff" stroke-width="1.5" opacity="0.7" stroke-linecap="round"/>
    <line x1="230" y1="78" x2="220" y2="76" stroke="#b8d8ff" stroke-width="1" opacity="0.5" stroke-linecap="round"/>
    <line x1="230" y1="78" x2="221" y2="82" stroke="#d0ecff" stroke-width="0.8" opacity="0.45" stroke-linecap="round"/>

  </g>

  <!-- === TEXT === -->
  <!-- "AGENTIC" -->
  <text
    x="150"
    y="138"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="22"
    font-weight="900"
    letter-spacing="5"
    text-anchor="middle"
    fill="#ffffff"
    filter="url(#textGlow)"
    opacity="0.97">AGENTIC</text>

  <!-- "LEAD GEN" -->
  <text
    x="150"
    y="161"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="13"
    font-weight="400"
    letter-spacing="7"
    text-anchor="middle"
    fill="#7ec4ff"
    opacity="0.85">LEAD  GEN</text>

  <!-- Thin divider line under text -->
  <line x1="80" y1="170" x2="220" y2="170" stroke="#4a6aff" stroke-width="0.5" opacity="0.35"/>

  <!-- Tagline -->
  <text
    x="150"
    y="183"
    font-family="'Arial', 'Helvetica Neue', sans-serif"
    font-size="7"
    font-weight="300"
    letter-spacing="3"
    text-anchor="middle"
    fill="#7090c0"
    opacity="0.65">PIPELINE VELOCITY</text>

</svg>` },
  { id: 98, title: "Bold A Identity", concept: "gradient A with arrow crossbar", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="mainGrad" x1="0.5" y1="1" x2="0.5" y2="0">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="40%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Letter A: left leg -->
  <polygon
    points="60,158 88,158 118,68 104,68"
    fill="url(#mainGrad)"
    filter="url(#glow)"
  />

  <!-- Letter A: right leg -->
  <polygon
    points="182,158 210,158 148,68 134,68"
    fill="url(#mainGrad)"
    filter="url(#glow)"
  />

  <!-- Arrow replacing crossbar:
       base bar segments left and right, then arrowhead pointing up -->
  <!-- Left bar segment -->
  <rect x="81" y="107" width="32" height="11" rx="2" fill="url(#mainGrad)" filter="url(#glow)"/>
  <!-- Right bar segment -->
  <rect x="157" y="107" width="32" height="11" rx="2" fill="url(#mainGrad)" filter="url(#glow)"/>

  <!-- Arrow shaft -->
  <rect x="131" y="82" width="8" height="36" rx="2" fill="url(#mainGrad)" filter="url(#glow)"/>

  <!-- Arrowhead (pointing up) -->
  <polygon
    points="135,62 148,84 122,84"
    fill="url(#mainGrad)"
    filter="url(#glow)"
  />

  <!-- Wordmark: "AGENTIC" -->
  <text
    x="56"
    y="180"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="13.5"
    font-weight="700"
    letter-spacing="5"
    fill="url(#textGrad)"
  >AGENTIC</text>

  <!-- Wordmark: "LEAD GEN" -->
  <text
    x="170"
    y="180"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="13.5"
    font-weight="300"
    letter-spacing="4"
    fill="#1e1b4b"
  >LEAD GEN</text>

  <!-- Thin separator line between words -->
  <line x1="163" y1="171" x2="163" y2="182" stroke="#7c3aed" stroke-width="1.2" opacity="0.5"/>
</svg>` },
  { id: 99, title: "Mobius Pipeline", concept: "M\u00f6bius strip with stage labels", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <!-- Dark background gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#0d1a2e"/>
      <stop offset="100%" stop-color="#050b14"/>
    </radialGradient>

    <!-- Metallic blue-silver ribbon gradient (main face) -->
    <linearGradient id="ribbonMain" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#c8d8f0"/>
      <stop offset="18%"  stop-color="#7aaee8"/>
      <stop offset="38%"  stop-color="#3a72c4"/>
      <stop offset="55%"  stop-color="#1a4a8a"/>
      <stop offset="72%"  stop-color="#4a90d9"/>
      <stop offset="88%"  stop-color="#9dc4f0"/>
      <stop offset="100%" stop-color="#c8d8f0"/>
    </linearGradient>

    <!-- Ribbon underside gradient (darker, twisted side) -->
    <linearGradient id="ribbonUnder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#1a2a4a"/>
      <stop offset="40%"  stop-color="#0e1d36"/>
      <stop offset="100%" stop-color="#263a5e"/>
    </linearGradient>

    <!-- Silver highlight gradient for top arc -->
    <linearGradient id="arcTop" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#8ab4e8"/>
      <stop offset="25%"  stop-color="#d4e8ff"/>
      <stop offset="50%"  stop-color="#f0f6ff"/>
      <stop offset="75%"  stop-color="#a0c4f0"/>
      <stop offset="100%" stop-color="#4a80c8"/>
    </linearGradient>

    <!-- Bottom arc gradient -->
    <linearGradient id="arcBottom" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#2a4878"/>
      <stop offset="50%"  stop-color="#1e3560"/>
      <stop offset="100%" stop-color="#3a60a0"/>
    </linearGradient>

    <!-- Edge highlight gradient -->
    <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#7eb8f0" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#2a5498" stop-opacity="0.4"/>
    </linearGradient>

    <!-- Glow filter for ribbon -->
    <filter id="ribbonGlow" x="-20%" y="-30%" width="140%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle glow for text -->
    <filter id="textGlow" x="-30%" y="-80%" width="160%" height="260%">
      <feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Ambient glow behind the loop -->
    <radialGradient id="ambientGlow" cx="50%" cy="52%" r="38%">
      <stop offset="0%"   stop-color="#1a3a7a" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#050b14" stop-opacity="0"/>
    </radialGradient>

    <!-- Clip paths for the Möbius crossing illusion -->
    <clipPath id="clipFront">
      <ellipse cx="150" cy="105" rx="85" ry="44"/>
    </clipPath>
    <clipPath id="clipBack">
      <rect x="65" y="61" width="170" height="44"/>
    </clipPath>

    <!-- Arrow marker -->
    <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0.5 L0,5.5 L5,3 Z" fill="#7eb8f0" opacity="0.85"/>
    </marker>
  </defs>

  <!-- Background -->
  <rect width="300" height="200" fill="url(#bgGrad)"/>

  <!-- Ambient glow halo behind loop -->
  <ellipse cx="150" cy="108" rx="105" ry="54" fill="url(#ambientGlow)"/>

  <!-- ============================================================
       MÖBIUS STRIP — drawn as layered bezier ribbon segments
       The illusion: top-right section crosses OVER bottom-left,
       creating the characteristic half-twist topology.
       Layer order: back-bottom → left-side → right-side → front-top
       ============================================================ -->

  <!-- SEGMENT 1: Bottom arc (back layer — darker, underside) -->
  <!-- Outer bottom edge -->
  <path d="M 82,130
             C 82,148  218,148  218,130"
        fill="none" stroke="url(#arcBottom)" stroke-width="22"
        stroke-linecap="round" opacity="0.9"/>
  <!-- Inner bottom edge highlight -->
  <path d="M 92,128
             C 92,143  208,143  208,128"
        fill="none" stroke="#1e3a6a" stroke-width="6"
        stroke-linecap="round" opacity="0.6"/>
  <!-- Bottom edge sheen -->
  <path d="M 100,131
             C 100,144  200,144  200,131"
        fill="none" stroke="#4a78b8" stroke-width="1.5"
        stroke-linecap="round" opacity="0.5"/>

  <!-- SEGMENT 2: Left descending side (mid layer) -->
  <!-- Left ribbon body -->
  <path d="M 82,80
             C 60,80  60,130  82,130"
        fill="none" stroke="url(#ribbonMain)" stroke-width="22"
        stroke-linecap="butt" filter="url(#ribbonGlow)" opacity="0.95"/>
  <!-- Left edge -->
  <path d="M 71,82 C 52,82 52,128 71,128"
        fill="none" stroke="#9dc4f4" stroke-width="1.5" opacity="0.6"/>

  <!-- SEGMENT 3: Right ascending side (mid layer) -->
  <!-- Right ribbon body -->
  <path d="M 218,80
             C 240,80  240,130  218,130"
        fill="none" stroke="url(#ribbonUnder)" stroke-width="22"
        stroke-linecap="butt" opacity="0.88"/>
  <!-- Right edge sheen -->
  <path d="M 229,82 C 248,82 248,128 229,128"
        fill="none" stroke="#4a78b8" stroke-width="1.5" opacity="0.5"/>

  <!-- SEGMENT 4: Top arc — FRONT layer (bright metallic, over the crossing) -->
  <!-- Top arc body — silver/blue gradient -->
  <path d="M 82,80
             C 82,62  218,62  218,80"
        fill="none" stroke="url(#arcTop)" stroke-width="22"
        stroke-linecap="round" filter="url(#ribbonGlow)" opacity="1"/>
  <!-- Top arc inner highlight (specular) -->
  <path d="M 92,78 C 92,66 208,66 208,78"
        fill="none" stroke="#e8f4ff" stroke-width="4"
        stroke-linecap="round" opacity="0.55"/>
  <!-- Top arc outer edge -->
  <path d="M 82,68 C 82,55 218,55 218,68"
        fill="none" stroke="#6aaae0" stroke-width="2"
        stroke-linecap="round" opacity="0.7"/>
  <!-- Top arc lower edge (shadow) -->
  <path d="M 84,91 C 84,85 216,85 216,91"
        fill="none" stroke="#1a3060" stroke-width="2.5"
        stroke-linecap="round" opacity="0.6"/>

  <!-- ============================================================
       CROSSING POINT — the half-twist (Möbius characteristic)
       Right side crosses to become the back/underside of left side
       ============================================================ -->
  <!-- Crossing shadow/depth left -->
  <path d="M 72,90 C 68,100 68,110 72,120"
        fill="none" stroke="#08101e" stroke-width="8" opacity="0.9"/>
  <!-- Crossing shadow/depth right -->
  <path d="M 228,90 C 232,100 232,110 228,120"
        fill="none" stroke="#08101e" stroke-width="8" opacity="0.7"/>

  <!-- ============================================================
       STAGE LABELS along the strip
       ============================================================ -->

  <!-- DISCOVER — top arc, left portion -->
  <g filter="url(#textGlow)">
    <text x="108" y="74"
          font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          font-size="7.2" font-weight="700" letter-spacing="0.8"
          fill="#e8f4ff" text-anchor="middle" opacity="0.95">DISCOVER</text>
  </g>

  <!-- ENRICH — top arc, right portion -->
  <g filter="url(#textGlow)">
    <text x="192" y="74"
          font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          font-size="7.2" font-weight="700" letter-spacing="0.8"
          fill="#b8d8f8" text-anchor="middle" opacity="0.92">ENRICH</text>
  </g>

  <!-- QUALIFY — bottom arc -->
  <g filter="url(#textGlow)">
    <text x="150" y="144"
          font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          font-size="7.2" font-weight="700" letter-spacing="0.8"
          fill="#7aaad8" text-anchor="middle" opacity="0.85">QUALIFY</text>
  </g>

  <!-- OUTREACH — right side (rotated) -->
  <g filter="url(#textGlow)">
    <text x="243" y="107"
          font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          font-size="6.5" font-weight="700" letter-spacing="0.6"
          fill="#6898c8" text-anchor="middle" opacity="0.8"
          transform="rotate(90, 243, 107)">OUTREACH</text>
  </g>

  <!-- ============================================================
       DIRECTIONAL ARROWS — subtle, along the strip path
       ============================================================ -->
  <!-- Arrow: DISCOVER → ENRICH (top, rightward) -->
  <path d="M 148,69 L 153,69" stroke="#c0dcf8" stroke-width="1.5"
        marker-end="url(#arrowBlue)" opacity="0.7"/>

  <!-- Arrow: bottom leftward (QUALIFY direction) -->
  <path d="M 155,138 L 148,138" stroke="#5a88b8" stroke-width="1.5"
        marker-end="url(#arrowBlue)" opacity="0.55"
        transform="rotate(180,151.5,138)"/>

  <!-- ============================================================
       TITLE TEXT
       ============================================================ -->
  <text x="150" y="175"
        font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="12" font-weight="800" letter-spacing="2.5"
        fill="#d0e8ff" text-anchor="middle" opacity="0.95"
        filter="url(#textGlow)">AGENTIC LEAD GEN</text>

  <!-- Subtitle / tagline -->
  <text x="150" y="190"
        font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="6" font-weight="400" letter-spacing="3"
        fill="#4a78b0" text-anchor="middle" opacity="0.7">PERPETUAL PIPELINE</text>

  <!-- Fine decorative rule under title -->
  <line x1="98" y1="179" x2="202" y2="179"
        stroke="#2a5090" stroke-width="0.5" opacity="0.6"/>

  <!-- Corner accent dots -->
  <circle cx="18"  cy="18"  r="1.5" fill="#1e3a6a" opacity="0.5"/>
  <circle cx="282" cy="18"  r="1.5" fill="#1e3a6a" opacity="0.5"/>
  <circle cx="18"  cy="182" r="1.5" fill="#1e3a6a" opacity="0.5"/>
  <circle cx="282" cy="182" r="1.5" fill="#1e3a6a" opacity="0.5"/>

  <!-- Outer border frame -->
  <rect x="2" y="2" width="296" height="196" rx="6" ry="6"
        fill="none" stroke="#1e3a6a" stroke-width="0.75" opacity="0.5"/>
</svg>` },
  { id: 100, title: "Final Form", concept: "unified arrow + node + person mark", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200" fill="none">
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- Icon mark: unified geometric shape -->
  <!-- Person silhouette head (circle) -->
  <circle cx="150" cy="62" r="13" fill="#0066ff"/>

  <!-- Person silhouette body merged into arrow base -->
  <!-- Body trapezoid that flows into arrow shaft -->
  <path d="M138 80 Q138 76 142 75 L158 75 Q162 76 162 80 L162 104 L138 104 Z" fill="#0066ff"/>

  <!-- Circuit node dots on body — signal connections -->
  <circle cx="138" cy="88" r="3" fill="#ffffff"/>
  <circle cx="162" cy="88" r="3" fill="#ffffff"/>

  <!-- Horizontal circuit lines extending from body -->
  <line x1="121" y1="88" x2="135" y2="88" stroke="#0066ff" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="165" y1="88" x2="179" y2="88" stroke="#0066ff" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Left circuit node -->
  <circle cx="116" cy="88" r="5" fill="none" stroke="#0066ff" stroke-width="2.5"/>
  <circle cx="116" cy="88" r="2" fill="#0066ff"/>

  <!-- Right circuit node -->
  <circle cx="184" cy="88" r="5" fill="none" stroke="#0066ff" stroke-width="2.5"/>
  <circle cx="184" cy="88" r="2" fill="#0066ff"/>

  <!-- Forward arrow: emerges from body base, pointing right-forward -->
  <!-- Arrow shaft -->
  <rect x="138" y="104" width="24" height="10" fill="#0066ff"/>
  <!-- Arrow head — bold forward-pointing chevron -->
  <polygon points="162,96 178,114 162,114" fill="#0066ff"/>
  <polygon points="138,104 162,104 162,114 138,114" fill="#0066ff"/>
  <!-- Clean arrowhead tip -->
  <polygon points="155,99 180,114 155,129 162,114" fill="#0033cc"/>

  <!-- Unified icon redrawn as single clean mark -->
  <!-- Overwrite with clean unified path -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- ===== FINAL UNIFIED MARK ===== -->

  <!-- Head circle -->
  <circle cx="138" cy="58" r="14" fill="#0066ff"/>

  <!-- Body + arrow unified shape -->
  <!-- Shoulder width body flowing into forward arrow -->
  <path d="
    M122 78
    Q122 73 128 72
    L148 72
    L148 72
    L175 58
    L180 67
    L155 78
    L155 108
    Q155 114 149 114
    L131 114
    Q125 114 125 108
    Z
  " fill="#0066ff"/>

  <!-- Arrow head pointing forward-right -->
  <polygon points="155,65 186,82 155,99" fill="#0033cc"/>

  <!-- Circuit node on shoulder -->
  <circle cx="122" cy="90" r="4" fill="none" stroke="#0066ff" stroke-width="2.5"/>
  <circle cx="122" cy="90" r="1.5" fill="#0066ff"/>
  <line x1="126" y1="90" x2="125" y2="90" stroke="#0066ff" stroke-width="2" stroke-linecap="round"/>

  <!-- ===== CLEAN RESTART: single unified SVG mark ===== -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- ICON: 72px tall, centered at x=150 -->
  <!-- Head -->
  <circle cx="150" cy="52" r="14" fill="#0066ff"/>

  <!-- Shoulders + torso -->
  <path d="M132,72 Q132,67 137,66 L163,66 Q168,67 168,72 L168,100 L132,100 Z" fill="#0066ff"/>

  <!-- Left arm / circuit line -->
  <line x1="132" y1="82" x2="112" y2="82" stroke="#0066ff" stroke-width="3" stroke-linecap="round"/>
  <circle cx="107" cy="82" r="5.5" fill="none" stroke="#0066ff" stroke-width="2.5"/>
  <circle cx="107" cy="82" r="2" fill="#0066ff"/>

  <!-- Right arm / circuit line -->
  <line x1="168" y1="82" x2="188" y2="82" stroke="#0066ff" stroke-width="3" stroke-linecap="round"/>
  <circle cx="193" cy="82" r="5.5" fill="none" stroke="#0066ff" stroke-width="2.5"/>
  <circle cx="193" cy="82" r="2" fill="#0066ff"/>

  <!-- Forward arrow from torso base -->
  <!-- Arrow shaft extending right from body right edge -->
  <polygon points="168,89 200,89 214,100 200,111 168,111" fill="#0044dd"/>
  <!-- Arrow tip -->
  <polygon points="200,84 220,100 200,116" fill="#0022bb"/>

  <!-- Body lower fill to blend with arrow -->
  <rect x="132" y="100" width="36" height="8" fill="#0066ff"/>

  <!-- Connector dot at body-arrow junction -->
  <circle cx="168" cy="100" r="4" fill="#ffffff" opacity="0.9"/>

  <!-- ===== ABSOLUTE FINAL VERSION — clean, no overdraw ===== -->
  <rect width="300" height="200" fill="#ffffff"/>

  <!-- GROUP: icon centered at 150, 68 -->
  <g transform="translate(150,68)">

    <!-- Head -->
    <circle cx="0" cy="-32" r="13" fill="#0066ff"/>

    <!-- Torso -->
    <rect x="-16" y="-16" width="32" height="34" rx="4" fill="#0066ff"/>

    <!-- Left circuit arm -->
    <line x1="-16" y1="-2" x2="-36" y2="-2" stroke="#0066ff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="-42" cy="-2" r="5" fill="none" stroke="#0066ff" stroke-width="2.5"/>
    <circle cx="-42" cy="-2" r="1.8" fill="#0066ff"/>

    <!-- Right circuit arm -->
    <line x1="16" y1="-2" x2="36" y2="-2" stroke="#0066ff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="42" cy="-2" r="5" fill="none" stroke="#0066ff" stroke-width="2.5"/>
    <circle cx="42" cy="-2" r="1.8" fill="#0066ff"/>

    <!-- Forward arrow — bottom of torso pointing right -->
    <!-- Arrow body -->
    <polygon points="-16,18 28,18 28,8 -16,8" fill="#0055ee"/>
    <!-- Arrowhead -->
    <polygon points="28,4 46,18 28,32" fill="#0044cc"/>

    <!-- Small circuit dot at top-center of torso (AI node) -->
    <circle cx="0" cy="-16" r="3.5" fill="#ffffff" opacity="0.85"/>

  </g>

  <!-- WORDMARK -->
  <text
    x="150"
    y="138"
    font-family="'Helvetica Neue', Arial, sans-serif"
    font-weight="800"
    font-size="15"
    letter-spacing="3.5"
    fill="#0066ff"
    text-anchor="middle"
    dominant-baseline="auto"
  >AGENTIC LEAD GEN</text>

  <!-- Thin rule under wordmark -->
  <line x1="88" y1="145" x2="212" y2="145" stroke="#0066ff" stroke-width="1" opacity="0.3"/>

</svg>` },
] as const;
