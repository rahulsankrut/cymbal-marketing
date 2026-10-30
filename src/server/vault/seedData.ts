import type { BrandKit, StarterCampaignTemplate } from '../../shared/types.js';

export const DEFAULT_CYMBAL_BRAND_KIT: BrandKit = {
  id: 'brandkit-cymbal-aerospace-core',
  name: 'Cymbal Aerospace — Corporate & Flight Systems',
  organization: 'Cymbal Aerospace Corporation',
  tagline: 'Engineering the Stratosphere and Beyond',
  visualIdentityRules: [
    'Use clean titanium-white and obsidian-slate aircraft liveries accented with Mach-Blue (#0EA5E9) and Afterburner-Amber (#F59E0B) telemetry highlights.',
    'Frame aircraft and avionics with cinematic anamorphic depth, crisp stratospheric sunlight, or high-contrast hangar rim lighting.',
    'Keep HUD and mission-control graphics uncluttered, technically legible, and grounded in modern glass-cockpit ergonomics.',
    'Never display cartoon, stylized comic, or distorted structural geometry on airframes, turbine blades, or orbital buses.',
  ],
  aerospaceRealismRules: [
    'Control surfaces (ailerons, twin canted vertical stabilizers, leading-edge slats) must exhibit physically accurate aerodynamic geometry.',
    'Supersonic Mach cones, contrails, and cryogenic hydrogen exhaust plumes must match altitude and atmospheric pressure conditions.',
    'Cockpit instrumentation and flight crew flight-suits must reflect certified aerospace operations.',
  ],
  regulatoryClaimGuardrails: [
    'Never claim FAA/EASA Part 25 certification is complete for pre-production prototypes without an explicit "Subject to Regulatory Certification" qualifier.',
    'Do not promise "100% zero failure rate" or "guaranteed immunity to turbulence/weather"—use verified engineering reliability metrics (e.g., triple-redundant fly-by-optics).',
    'Never depict restricted military targeting reticles or export-controlled ITAR schematics.',
  ],
  colorPalette: [
    { name: 'Stratosphere Obsidian', hex: '#0A0F1D', usage: 'Primary mission-control & night sky background' },
    { name: 'Titanium Fuselage White', hex: '#F1F5F9', usage: 'Primary airframe livery & headline typography' },
    { name: 'Mach Ion Blue', hex: '#0EA5E9', usage: 'Avionics HUD telemetry, propulsion accents & primary CTA' },
    { name: 'Afterburner Amber', hex: '#F59E0B', usage: 'Thrust indicators, Mach warnings & precision highlights' },
    { name: 'Carbon Composite Slate', hex: '#1E293B', usage: 'Structural panels & secondary studio surfaces' },
  ],
  defaultVoicePersona: {
    voiceId: 'Puck',
    displayName: 'Commander Elena Vance — Chief Flight Narrator',
    gender: 'female',
    languageCode: 'en-US',
    personaPrompt:
      'An authoritative, calm, and inspiring aerospace test pilot and chief engineer in her 40s with crisp mid-Atlantic diction and warm cinematic gravitas.',
  },
  defaultMusicPrompt:
    'Cinematic aerospace orchestral hybrid score: warm analog synthesizer arpeggios, soaring French horn and string swells, and precise sub-bass pulse building to an inspiring stratospheric crescendo.',
  isDefault: true,
  updatedAt: '2026-10-30T12:00:00.000Z',
};

export const STARTER_CAMPAIGN_TEMPLATES: StarterCampaignTemplate[] = [
  {
    id: 'tpl-supersonic-avionics-8921',
    title: 'VisionX-9: Next-Gen Supersonic Avionics Launch',
    subtitle: 'Triple-Redundant Fly-By-Optics & Predictive Shear HUD',
    targetAudience: 'Commercial Airline Fleet Executives & Chief Pilots',
    spotDurationSeconds: 24,
    aspectRatio: '16:9',
    creativeBrief:
      'Launch Cymbal Aerospace’s VisionX-9 Supersonic Flight Deck aboard the flagship CX-700 delta-wing airliner. Open in a high-contrast titanium hangar at dawn, transition into the panoramic glass cockpit showing predictive clear-air turbulence lidar overlays, and culminate with a smooth Mach 1.8 cruise above the curvature of the Earth at 55,000 feet.',
    keyProductClaims: [
      'Predictive photonic LIDAR detects clear-air shear 40 nautical miles ahead.',
      'Triple-redundant fly-by-optics architecture reduces avionics harness weight by 38%.',
      'Designed for FAA/EASA Next-Gen Supersonic Transport compliance (Subject to Regulatory Certification).',
    ],
    musicalMoodPrompt:
      'Precision glass-cockpit electronic pulse evolving into a majestic stratospheric orchestral brass and string theme at 112 BPM.',
    suggestedAnchors: [
      {
        name: 'CX-700 Supersonic Airliner',
        category: 'aircraft',
        description: 'Sleek needle-nose delta-wing commercial supersonic transport in Titanium White and Mach-Blue Cymbal Aerospace livery.',
        generationPrompt:
          'Photorealistic aerospace studio reference sheet of the Cymbal Aerospace CX-700 needle-nose delta-wing supersonic commercial airliner, titanium-white composite fuselage with a sharp Mach-Blue (#0EA5E9) cheatline and twin canted vertical stabilizers, three-quarter front profile, clean studio lighting.',
      },
      {
        name: 'VisionX-9 Panoramic Glass Cockpit',
        category: 'avionics',
        description: 'Wraparound holographic HUD and dual side-stick glass flight deck with Mach-Blue photonic LIDAR weather topology.',
        generationPrompt:
          'Photorealistic wide interior shot of the Cymbal Aerospace VisionX-9 supersonic glass cockpit, dark carbon-composite glare shield, three panoramic OLED primary flight displays and translucent Mach-Blue (#0EA5E9) holographic HUD projecting 3D atmospheric wind-shear vectors.',
      },
      {
        name: 'Captain Marcus Sterling',
        category: 'character',
        description: 'Lead Cymbal Aerospace test pilot in charcoal flight suit with subtle Mach-Blue mission patch.',
        generationPrompt:
          'Photorealistic portrait of Captain Marcus Sterling, seasoned 45-year-old aerospace chief test pilot wearing a tailored charcoal-slate Cymbal Aerospace flight jacket with a Mach-Blue mission patch, seated in a modern flight deck, confident expression.',
      },
    ],
  },
  {
    id: 'tpl-hydrogen-cryo-propulsion',
    title: 'HyStream-400: Zero-Emission Hydrogen Propulsion Spotlight',
    subtitle: 'Liquid Hydrogen Cryogenic Turbofan for Transcontinental Fleets',
    targetAudience: 'Aviation Sustainability Officers & Sovereign Infrastructure Funds',
    spotDurationSeconds: 24,
    aspectRatio: '16:9',
    creativeBrief:
      'Showcase the Cymbal HyStream-400 liquid-hydrogen turbofan engine. Begin with a close-up of sculpted carbon-titanium fan blades inside an acoustic test cell, reveal cryogenic liquid-hydrogen thermal channels glowing with cool cyan telemetry, and cut to a whisper-quiet twin-engine regional climb out over alpine peaks leaving only pure water-vapor condensation.',
    keyProductClaims: [
      'Zero carbon dioxide emissions at cruise with 99.4% combustion stability.',
      'Closed-loop cryogenic thermal recovery boosts specific fuel efficiency by 22%.',
      'Ground-tested across 4,500 simulated flight cycles (Subject to Regulatory Certification).',
    ],
    musicalMoodPrompt:
      'Crystalline ambient piano and warm modular synth textures swelling into an uplifting acoustic-orchestral horizon theme.',
    suggestedAnchors: [
      {
        name: 'HyStream-400 Cryogenic Turbofan',
        category: 'aircraft',
        description: 'High-bypass open-nacelle turbofan with sculpted carbon-titanium fan blades and Mach-Blue cryogenic manifold.',
        generationPrompt:
          'Photorealistic aerospace product hero shot of the Cymbal Aerospace HyStream-400 liquid-hydrogen high-bypass turbofan engine on a precision test stand, sculpted matte carbon-titanium fan blades with titanium-white nacelle and glowing Mach-Blue cryogenic fuel manifold lines.',
      },
      {
        name: 'Alpine Cryo-Test Flight Corridor',
        category: 'environment',
        description: 'Crystal-clear morning sky above snow-capped Swiss Alps with pristine sunrise light.',
        generationPrompt:
          'Photorealistic aerial cinematography environment above snow-covered alpine peaks at sunrise, crisp stratospheric blue sky, golden rim lighting on mountain ridges, 70mm IMAX aerial lens.',
      },
    ],
  },
  {
    id: 'tpl-orbital-telemetry-constellation',
    title: 'AetherLink: Orbital Telemetry Constellation',
    subtitle: 'Sub-Millisecond Laser Crosslink Telemetry for Global Aviation',
    targetAudience: 'Global Air Traffic Modernization Agencies & Satellite Operators',
    spotDurationSeconds: 24,
    aspectRatio: '16:9',
    creativeBrief:
      'Present Cymbal Aerospace’s AetherLink low-Earth-orbit optical satellite mesh. Start with a precision satellite deployment in low-Earth orbit above the nocturnal terminator line, visualize eye-safe optical laser crosslinks connecting polar flight routes, and finish inside Cymbal Mission Control as global transpolar aircraft maintain uninterrupted real-time 8K flight-deck telemetry.',
    keyProductClaims: [
      '100 Gbps optical inter-satellite laser crosslinks across polar and oceanic airspaces.',
      'Sub-15ms glass-to-ground latency for autonomous flight-deck weather and traffic routing.',
      'Radiation-hardened Hall-effect ion thrusters for 12-year orbital station-keeping.',
    ],
    musicalMoodPrompt:
      'Deep cosmic pulse with precision clockwork percussion and luminous glass marimba motifs building to an expansive orbital finale.',
    suggestedAnchors: [
      {
        name: 'AetherLink-V2 Optical Satellite Bus',
        category: 'aircraft',
        description: 'Hexagonal gold-and-obsidian LEO spacecraft with deployable blue-cell solar wings and optical laser gimbal.',
        generationPrompt:
          'Photorealistic orbital spacecraft render of the Cymbal Aerospace AetherLink-V2 LEO satellite above Earth’s glowing blue atmospheric limb, hexagonal carbon-obsidian bus, deployable solar arrays, precision gimbaled optical laser communications telescope.',
      },
      {
        name: 'Cymbal Orbital Mission Control',
        category: 'environment',
        description: 'curved dark-obsidian telemetry theater with 3D polar flight-corridor globe projection.',
        generationPrompt:
          'Photorealistic wide shot of Cymbal Aerospace Orbital Mission Control, dark obsidian architectural surfaces, curved ultra-wide telemetry wall displaying a 3D Earth globe with Mach-Blue (#0EA5E9) polar flight routes and amber satellite orbit arcs.',
      },
    ],
  },
];
