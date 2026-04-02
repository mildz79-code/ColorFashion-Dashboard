# OpsMaster — ColorFashion Dashboard

## Project Overview
OpsMaster is an operations intelligence platform for ColorFashion. It is a single-page HTML dashboard (`opsmaster.html`) with a Supabase backend.

## Key Files
- `opsmaster.html` — main dashboard (all 6 modules)
- `supabase-data.js` — Supabase data layer (queries, real-time subscriptions)
- `schema.sql` — database schema; run in Supabase SQL editor to set up tables
- `importer.js` — data import utilities
- `employee-tracking.html` — standalone employee tracking view
- `index.html` — splash/entry screen that auto-redirects to `opsmaster.html`

## Dashboard Modules
1. Master Dash
2. Order / Production
3. Energy Dashboard
4. Shipping
5. Employee Tracking
6. Cost Structure

## Supabase Setup
1. Create a project at supabase.com
2. Run `schema.sql` in the SQL editor
3. Copy your Project URL and `anon` public key from **Settings → API**
4. Set `SUPABASE_URL` and `SUPABASE_ANON` in `supabase-data.js`

## Deployment

- Hosted on **Netlify**
- Entry point: `index.html` (splash screen) → `opsmaster.html` (dashboard)
- Supabase project: `jswowdnamlitzizmyytv`
- To deploy: push to `main` branch — Netlify auto-deploys
- Custom domain: add in Netlify dashboard under **Domain settings**
- Redirect rules: `netlify.toml` and `_redirects` (both present)

## Budget Dashboard Module
- Location: budget/
- React prototype: cf-budget-dashboard.jsx (light theme, calendar + analytics pages)
- DAX measures: cf-budget-measures.dax (22 measures across 4 folders)
- QuickBooks template: quickbooks-import-template.csv
- Supabase schema: expenses-schema.sql (optional web-based tracking)
- Power BI connects to IDSERVER/dye for orders + QuickBooks CSV for expenses
- Design: Light background, Inter typeface, navy/slate palette, no emojis
