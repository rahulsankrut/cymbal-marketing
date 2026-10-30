import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { CampaignVault } from '../src/server/vault/campaignVault.js';
import { createStudioApp } from '../src/server/app.js';

describe('Slice 001 — Pre-Seeded Cymbal Aerospace Brand Kit, Starter Templates & Stage 1 API', () => {
  let tempDir: string;
  let vault: CampaignVault;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'cymbal-studio-001-'));
    vault = new CampaignVault(tempDir);
    await vault.seedDefaultBrandKitAndTemplates();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('seeds the official Cymbal Aerospace Brand Kit and 3 starter campaign templates on bootstrap', async () => {
    const app = createStudioApp({ vault });
    const res = await request(app).get('/api/bootstrap').expect(200);

    expect(res.body.brandKits).toHaveLength(1);
    expect(res.body.brandKits[0].name).toContain('Cymbal Aerospace');
    expect(res.body.brandKits[0].colorPalette.length).toBeGreaterThanOrEqual(4);
    expect(res.body.brandKits[0].aerospaceRealismRules.length).toBeGreaterThanOrEqual(3);
    expect(res.body.brandKits[0].regulatoryClaimGuardrails.length).toBeGreaterThanOrEqual(3);

    expect(res.body.starterTemplates).toHaveLength(3);
    const titles = res.body.starterTemplates.map((t: { title: string }) => t.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Supersonic Avionics'),
        expect.stringContaining('Hydrogen Propulsion'),
        expect.stringContaining('Orbital Telemetry'),
      ])
    );
  });

  it('creates a campaign from a starter template with suggested reference anchors and supports Brand Kit upsert', async () => {
    const app = createStudioApp({ vault });
    const boot = await request(app).get('/api/bootstrap').expect(200);
    const template = boot.body.starterTemplates[0];
    const defaultBrandKit = boot.body.brandKits[0];

    const createRes = await request(app)
      .post('/api/campaigns')
      .send({
        templateId: template.id,
        brandKitId: defaultBrandKit.id,
      })
      .expect(201);

    expect(createRes.body.title).toBe(template.title);
    expect(createRes.body.creativeBrief).toBe(template.creativeBrief);
    expect(createRes.body.anchors.length).toBeGreaterThanOrEqual(2);
    expect(createRes.body.currentStage).toBe(1);

    // Upsert a custom Brand Kit
    const customKitRes = await request(app)
      .post('/api/brand-kits')
      .send({
        name: 'Cymbal Defense & Space Division',
        organization: 'Cymbal Aerospace Corp.',
        tagline: 'Precision Across Every Orbit',
        visualIdentityRules: ['High-contrast orbital telemetry HUD overlays'],
        aerospaceRealismRules: ['Accurate orbital mechanics and vacuum plume physics'],
        regulatoryClaimGuardrails: ['ITAR-compliant unclassified visual depictions only'],
        colorPalette: [{ name: 'Orbital Obsidian', hex: '#070B14', usage: 'Primary background' }],
        defaultVoicePersona: defaultBrandKit.defaultVoicePersona,
        defaultMusicPrompt: 'Deep cinematic analog synth pulse with orchestral brass swells',
      })
      .expect(201);

    expect(customKitRes.body.name).toBe('Cymbal Defense & Space Division');

    const kitsAfter = await vault.listBrandKits();
    expect(kitsAfter).toHaveLength(2);
  });
});
