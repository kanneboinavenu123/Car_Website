/**
 * NOCTIS — Configuration & Design Parameters
 * All scrollytelling distances, chapter thresholds, frame paths,
 * HUD readouts, callout coordinates, and lineup specs are defined here.
 */

const CONFIG = {
  // Brand tokens & Colors (for JS-driven canvas/state rendering)
  tokens: {
    asphalt: '#07080A',
    graphite: '#121418',
    fog: '#8A8F98',
    bone: '#EDEAE4',
    xenon: '#CFE3FF',
    taillight: '#E1251B',
    hairline: 'rgba(237, 234, 228, 0.12)',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
  },

  // Section heights (applied to scrollytelling wrappers)
  sectionHeights: {
    hero: '600vh',
    statement: '100vh',
    dismantle: '350vh',
    lineup: '100vh',
    reserve: '100vh'
  },

  // Image sequence frames configuration
  frames: {
    hero: {
      count: 600,
      desktopPath: 'assets/frames/hero/frame_{index}.webp',
      mobilePath: 'assets/frames/hero-mobile/frame_{index}.webp',
      padLength: 4,
      initialPreloadCount: 40 // Preload 1..40 before dismissing preloader
    },
    dismantle: {
      count: 200,
      desktopPath: 'assets/frames/dismantle/frame_{index}.webp',
      mobilePath: 'assets/frames/dismantle-mobile/frame_{index}.webp',
      padLength: 4
    }
  },

  // SECTION 1: HERO Scrollytelling Chapters & HUD
  hero: {
    lerpFactor: 0.15,
    fadeToBlackStart: 0.95, // Last 5% of scroll fades canvas to solid #07080A
    hud: {
      maxSpeed: 118,      // 000 -> 118 KM/H
      maxDistance: 4.2    // 0.0 -> 4.2 KM
    },
    chapters: [
      {
        id: 'chapter-1',
        hudChapter: '01/04',
        range: [0.00, 0.14],
        title: 'NOCTIS',
        subtitle: 'The city is asleep.',
        hint: 'SCROLL TO WAKE IT',
        type: 'intro'
      },
      {
        id: 'chapter-2',
        hudChapter: '02/04',
        range: [0.22, 0.40],
        title: "It doesn't need the city's light.",
        type: 'statement'
      },
      {
        id: 'chapter-3',
        hudChapter: '03/04',
        range: [0.50, 0.68],
        title: 'It brings its own.',
        type: 'statement'
      },
      {
        id: 'chapter-4',
        hudChapter: '04/04',
        range: [0.80, 1.00],
        title: 'GT-E',
        specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
        cta: 'Discover the GT-E',
        ctaTarget: '#lineup',
        type: 'specs'
      }
    ]
  },

  // SECTION 2: STATEMENT (Word-by-word scroll reveal)
  statement: {
    label: '02 — ENGINEERING',
    text: 'Every part was designed to disappear into one line of light.'
  },

  // SECTION 3: DISMANTLE Scrollytelling & Structural Callouts
  dismantle: {
    lerpFactor: 0.15,
    title: 'Look closer.',
    calloutStartProgress: 0.70,
    // Callout positions (percentage of stage viewport [x%, y%])
    // Line connects dot to label + text
    callouts: [
      {
        id: 'body',
        dot: { x: 44, y: 22 },
        labelPos: { x: 18, y: 16 },
        title: 'BODY',
        desc: 'Carbon composite monocoque',
        fadeRange: [0.72, 0.82]
      },
      {
        id: 'battery',
        dot: { x: 52, y: 76 },
        labelPos: { x: 68, y: 84 },
        title: 'BATTERY',
        desc: '110 kWh structural pack',
        fadeRange: [0.79, 0.89]
      },
      {
        id: 'drive',
        dot: { x: 26, y: 71 },
        labelPos: { x: 10, y: 78 },
        title: 'DRIVE',
        desc: 'Dual axial-flux motors, 680 kW',
        fadeRange: [0.85, 0.95]
      },
      {
        id: 'light',
        dot: { x: 78, y: 46 },
        labelPos: { x: 72, y: 32 },
        title: 'LIGHT',
        desc: 'Single-line LED signature',
        fadeRange: [0.91, 1.00]
      }
    ]
  },

  // SECTION 4: LINEUP (Interactive hover accordion)
  lineup: {
    label: '03 — THE LINEUP',
    heading: 'Five ways to drive the night.',
    defaultActiveIndex: 0,
    hoverDebounceMs: 80,
    models: [
      {
        id: 'gt-e',
        number: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        specs: [
          { label: 'RANGE', value: '640 km' },
          { label: '0–100 KM/H', value: '3.1 s' },
          { label: 'POWER', value: '680 kW' }
        ],
        image: 'assets/cars/gt-e.webp',
        alt: 'NOCTIS GT-E grand tourer coupe in matte graphite',
        swatches: ['#282A2E', '#07080A', '#EDEAE4', '#1A1C20']
      },
      {
        id: 's',
        number: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        specs: [
          { label: 'RANGE', value: '600 km' },
          { label: '0–100 KM/H', value: '3.6 s' },
          { label: 'POWER', value: '520 kW' }
        ],
        image: 'assets/cars/s.webp',
        alt: 'NOCTIS S four-door sport sedan in satin bone white',
        swatches: ['#EDEAE4', '#282A2E', '#07080A', '#8A8F98']
      },
      {
        id: 'x',
        number: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        specs: [
          { label: 'RANGE', value: '560 km' },
          { label: '0–100 KM/H', value: '4.2 s' },
          { label: 'POWER', value: '480 kW' }
        ],
        image: 'assets/cars/x.webp',
        alt: 'NOCTIS X SUV with coupe roofline in midnight blue',
        swatches: ['#141D2B', '#282A2E', '#EDEAE4', '#07080A']
      },
      {
        id: 'r',
        number: '04',
        name: 'R',
        tagline: 'Built for the track.',
        specs: [
          { label: 'RANGE', value: '420 km' },
          { label: '0–100 KM/H', value: '2.4 s' },
          { label: 'POWER', value: '900 kW' }
        ],
        image: 'assets/cars/r.webp',
        alt: 'NOCTIS R track coupe with fixed rear wing in satin black with red accents',
        swatches: ['#0A0B0E', '#E1251B', '#282A2E', '#EDEAE4']
      },
      {
        id: 'one',
        number: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        specs: [
          { label: 'RANGE', value: 'Concept' },
          { label: '0–100 KM/H', value: 'Concept' },
          { label: 'POWER', value: 'Concept' }
        ],
        image: 'assets/cars/one.webp',
        alt: 'NOCTIS ONE concept hypercar in liquid silver',
        swatches: ['#C8CBD0', '#07080A', '#282A2E', '#EDEAE4']
      }
    ]
  },

  // SECTION 5: RESERVE
  reserve: {
    heading: 'Drive the night.',
    subtext: 'Bespoke hand-assembly. Allocations strictly limited to 500 numbered chassis per annum.',
    buttonText: 'RESERVE YOUR NOCTIS'
  },

  // CUSTOM CURSOR
  cursor: {
    lerp: 0.18,
    flashDurationMs: 120
  }
};

// Freeze config to prevent inadvertent mutations
Object.freeze(CONFIG);
