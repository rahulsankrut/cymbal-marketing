import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import express from 'express';
import { CampaignVault } from './vault/campaignVault.js';
import { createStudioApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

// Load .env if present
const envPath = join(ROOT_DIR, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

const DATA_DIR = process.env.STUDIO_DATA_DIR || join(ROOT_DIR, '.data');
const PORT = Number(process.env.PORT || 4190);
const HOST = process.env.HOST || (process.env.K_SERVICE ? '0.0.0.0' : '127.0.0.1');

async function start() {
  const vault = new CampaignVault(DATA_DIR);
  await vault.seedDefaultBrandKitAndTemplates();

  // Auto-create a default active campaign if none exists yet so the studio opens ready to explore
  const existing = await vault.listCampaigns();
  if (existing.length === 0) {
    await vault.createCampaign({ templateId: 'tpl-supersonic-avionics-8921' });
  }

  const app = createStudioApp({ vault });

  // Serve built frontend in production if dist/ exists
  const distDir = join(ROOT_DIR, 'dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/prototypes', (_req, res) => {
      res.sendFile(join(distDir, 'prototypes', 'index.html'));
    });
    app.get(/^\/(?!api|media|prototypes).*/, (_req, res) => {
      res.sendFile(join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Cymbal Aerospace Marketing Studio] API & Media Vault listening on http://${HOST}:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start Cymbal Aerospace Marketing Studio:', err);
  process.exit(1);
});
