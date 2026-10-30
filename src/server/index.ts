import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { CampaignVault } from './vault/campaignVault.js';
import { createStudioApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const DATA_DIR = process.env.STUDIO_DATA_DIR || join(ROOT_DIR, '.data');
const PORT = Number(process.env.PORT || 4190);

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
    app.get(/^\/(?!api|media).*/, (_req, res) => {
      res.sendFile(join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Cymbal Aerospace Marketing Studio] API & Media Vault listening on http://127.0.0.1:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start Cymbal Aerospace Marketing Studio:', err);
  process.exit(1);
});
