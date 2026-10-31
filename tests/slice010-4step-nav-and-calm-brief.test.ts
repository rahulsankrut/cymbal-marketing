import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SIMPLIFIED_STEPS,
  mapBackendStageToStep,
  computeSimplifiedStepReadiness,
  buildCalmBriefViewState,
} from '../src/client/viewModel/studioViewModel.js';
import type { CampaignDetail, StarterCampaignTemplate } from '../src/shared/types.js';

function createSampleCampaign(overrides: Partial<CampaignDetail> = {}): CampaignDetail {
  return {
    id: 'camp-1',
    title: 'CX-900 Supersonic Avionics Launch',
    brandKitId: 'bk-cymbal-global',
    templateId: 'tpl-supersonic-avionics-8921',
    targetAudience: 'Global Airline Fleet VPs',
    spotDurationSeconds: 18,
    aspectRatio: '16:9',
    creativeBrief: 'Launch keynote film for the CX-900 Supersonic Flight Deck.',
    keyProductClaims: [],
    musicalMoodPrompt: 'Warm analog synth pulse with orchestral strings.',
    currentStage: 1,
    masterStale: false,
    voicePersona: {
      voiceId: 'voice-elena',
      displayName: 'Commander Elena Vance',
      gender: 'female',
      languageCode: 'en-US',
      personaPrompt: 'Calm authoritative test pilot.',
    },
    anchors: [],
    scenes: [],
    takes: [],
    createdAt: '2026-10-30T00:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z',
    ...overrides,
  };
}

describe('Slice 010 — 4-Step Storycraft Pill Navigation & Calm Brief View-Model', () => {
  it('defines exactly 4 simplified steps with zero raw model ID badges and maps 6 backend stages into 4 UX steps', () => {
    expect(SIMPLIFIED_STEPS.map((s) => s.label)).toEqual([
      '1. Brief',
      '2. Storyboard & Visuals',
      '3. Voice & Soundtrack',
      '4. Final Cut',
    ]);
    for (const step of SIMPLIFIED_STEPS) {
      expect('modelBadge' in step).toBe(false);
    }

    expect(mapBackendStageToStep(1)).toBe(1);
    expect(mapBackendStageToStep(2)).toBe(2);
    expect(mapBackendStageToStep(3)).toBe(2);
    expect(mapBackendStageToStep(4)).toBe(2);
    expect(mapBackendStageToStep(5)).toBe(3);
    expect(mapBackendStageToStep(6)).toBe(4);
  });

  it('builds a calm Step 1 Brief view state that omits Brand Guardrails and Custom Brand Kit forms', () => {
    const campaign = createSampleCampaign({ currentStage: 2 });
    const templates: StarterCampaignTemplate[] = [
      {
        id: 'tpl-supersonic-avionics-8921',
        title: 'CX-900 Supersonic Avionics',
        subtitle: 'Mach 2.2 Flight Deck',
        targetAudience: 'Global Airline Fleet VPs',
        spotDurationSeconds: 18,
        aspectRatio: '16:9',
        creativeBrief: 'Launch film',
        keyProductClaims: [],
        musicalMoodPrompt: 'Synth pulse',
        suggestedAnchors: [],
      },
    ];

    const briefView = buildCalmBriefViewState(campaign, templates);
    expect(briefView.title).toBe('CX-900 Supersonic Avionics Launch');
    expect(briefView.starterTemplates).toHaveLength(1);
    expect(briefView.showBrandGuardrails).toBe(false);
    expect(briefView.showCustomBrandKitForm).toBe(false);

    const readiness = computeSimplifiedStepReadiness(campaign);
    expect(readiness[1]).toBe(true);
    expect(readiness[2]).toBe(false);
  });

  it('wires SIMPLIFIED_STEPS in App.tsx and removes Brand Guardrails & Custom Brand Kit clutter from Step 1', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/client/App.tsx'), 'utf8');
    expect(appSource).toContain('SIMPLIFIED_STEPS');
    expect(appSource).not.toContain('Create Division Brand Kit');
    expect(appSource).not.toContain('Approved Livery & Telemetry Color Tokens');
  });
});
