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
    voiceId: 'Kore',
    displayName: 'Kore — Crisp & Upbeat Commercial Narrator',
    gender: 'female',
    languageCode: 'en-US',
    speakingRate: 1.25,
    vocalStylePreset: 'Crisp, upbeat, fast-paced commercial narrator',
    personaPrompt:
      'A brisk, upbeat, and clear commercial narrator with crisp modern pacing and engaging warmth.',
  },
  defaultMusicPrompt:
    'Upbeat modern orchestral and synth pulse with bright strings, warm piano, and crisp percussion at 118 BPM.',
  isDefault: true,
  updatedAt: '2026-10-30T12:00:00.000Z',
};

export const STARTER_CAMPAIGN_TEMPLATES: StarterCampaignTemplate[] = [
  {
    id: 'tpl-supersonic-avionics-8921',
    title: 'Paper Plane to Rocket Ship',
    subtitle: 'Backyard Wonder · Inspiring Future Flyers',
    targetAudience: 'Families & Everyday Viewers',
    spotDurationSeconds: 18,
    aspectRatio: '16:9',
    creativeBrief:
      'A folded blue paper airplane tossed in a sunny backyard transforms mid-flight into a sleek Cymbal jet soaring above the clouds.',
    keyProductClaims: [
      'Simple, wonder-filled visual story anyone can follow.',
      'Sparks curiosity about how airplanes fly.',
    ],
    musicalMoodPrompt:
      'Playful, upbeat orchestral adventure with bright pizzicato strings, glockenspiel, and cheerful horns at 120 BPM.',
    suggestedAnchors: [
      {
        name: 'Friendly Sky-Blue Jet',
        category: 'aircraft',
        description: 'Sleek white and sky-blue Cymbal jet gleaming in bright morning sunlight.',
        generationPrompt:
          'Bright, clean cinematic shot of a friendly sleek white and sky-blue (#0EA5E9) Cymbal jet soaring through fluffy white morning clouds.',
      },
      {
        name: 'Backyard Launch Lawn',
        category: 'environment',
        description: 'Sunny green backyard looking up at a bright blue sky.',
        generationPrompt:
          'Sunny green backyard on a clear morning with a bright blue sky and soft white clouds.',
      },
    ],
  },
  {
    id: 'tpl-hydrogen-cryo-propulsion',
    title: 'CubeSat Orbital Weather Launch',
    subtitle: 'Small-Sat Engineering · Lab to Low-Earth Orbit',
    targetAudience: 'Aerospace Engineers & STEM Innovators',
    spotDurationSeconds: 18,
    aspectRatio: '16:9',
    creativeBrief:
      'An engineering team builds a compact shoebox-sized weather satellite in the lab, launches it at sunrise, and receives its first live storm image from orbit.',
    keyProductClaims: [
      'Compact CubeSat engineering from cleanroom bench to orbit.',
      'Real-time Earth weather imaging from low-Earth orbit.',
    ],
    musicalMoodPrompt:
      'Upbeat indie electronic synth pulse with warm acoustic guitar and driving drums at 118 BPM.',
    suggestedAnchors: [
      {
        name: 'CubeSat Weather Prototype',
        category: 'avionics',
        description: 'Compact 10cm cube satellite with blue solar panels on an electronics bench.',
        generationPrompt:
          'Photorealistic shot of a compact shoebox-sized CubeSat satellite with gleaming blue solar panels on a clean aerospace electronics lab bench.',
      },
      {
        name: 'Space Systems Integration Lab',
        category: 'environment',
        description: 'Bright modern aerospace lab with telemetry monitors.',
        generationPrompt:
          'Bright modern aerospace engineering lab with engineers gathered around a monitor displaying live orbital telemetry.',
      },
    ],
  },
  {
    id: 'tpl-orbital-telemetry-constellation',
    title: 'New York to London in 3 Hours',
    subtitle: 'Zero-Emission Supersonic Flagship',
    targetAudience: 'Airline Executives, Business Travelers & Investors',
    spotDurationSeconds: 18,
    aspectRatio: '16:9',
    creativeBrief:
      'Business travelers board Cymbal’s sleek zero-emission jet in New York, enjoy a quiet cabin above the clouds at twice the speed of sound, and land refreshed in London in just three hours.',
    keyProductClaims: [
      'New York to London in 3 hours with zero carbon emissions.',
      'Whisper-quiet supersonic cabin (Subject to Regulatory Certification).',
    ],
    musicalMoodPrompt:
      'Crisp, modern executive keynote pulse with warm strings and confident piano at 116 BPM.',
    suggestedAnchors: [
      {
        name: 'CX-700 Supersonic Airliner',
        category: 'aircraft',
        description: 'Sleek titanium-white supersonic passenger jet with Mach-Blue accent stripe.',
        generationPrompt:
          'Photorealistic hero shot of the Cymbal CX-700 sleek titanium-white supersonic passenger jet with a Mach-Blue (#0EA5E9) stripe cruising smoothly above the clouds.',
      },
      {
        name: 'Whisper-Quiet Executive Cabin',
        category: 'environment',
        description: 'Spacious, sunlit modern aircraft cabin with panoramic windows.',
        generationPrompt:
          'Photorealistic interior of a quiet, sunlit modern executive aircraft cabin with large panoramic windows looking out at the blue stratosphere.',
      },
    ],
  },
];
