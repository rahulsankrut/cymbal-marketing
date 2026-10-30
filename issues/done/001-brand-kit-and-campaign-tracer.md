# Tracer Bullet: Pre-Seeded Cymbal Aerospace Brand Kit, Starter Templates & Stage 1 Workspace

## Parent PRD

`issues/prd.md`

## Type

AFK

## What to build

Deliver the end-to-end vertical tracer bullet across storage (`CampaignVault`), backend REST API (`/api/bootstrap`, `/api/campaigns`, `/api/brand-kits`), and frontend React + Vite + Tailwind workspace (`StudioWorkspaceUI`). On startup, automatically seed the official Cymbal Aerospace Brand Kit (color palette, visual identity rules, aerospace technical realism rules, regulatory claim prohibitions, and default Voice Design narrator persona) and three one-click starter campaign templates (*Next-Gen Supersonic Avionics Launch*, *Zero-Emission Hydrogen Propulsion Spotlight*, *Orbital Telemetry Constellation*). Enable users to launch a new campaign from a template or custom brief, view/edit Brand Kits in Stage 1, and navigate the 6-Stage Studio Pipeline shell.

## Acceptance criteria

- [x] Full-stack TypeScript workspace (`package.json`, backend server, React + Vite + Tailwind frontend, and Vitest test runner) starts cleanly and serves `/api/bootstrap`
- [x] `CampaignVault` automatically seeds the official Cymbal Aerospace Brand Kit and 3 starter campaign templates on initialization if not present
- [x] Users can create a campaign from any of the 3 starter templates or a custom brief, and view/edit/create Brand Kits in Stage 1 of the UI
- [x] Behavioral boundary tests for `CampaignVault` seeding, Brand Kit CRUD, and campaign creation pass (`RED -> GREEN`)

## Blocked by

None - can start immediately

## User stories addressed

- User story 1
- User story 2
