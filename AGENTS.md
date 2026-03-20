# Project Instructions

## Crawl Baseline
- Full crawls must use the corrected district catalog, not raw fallback rows.
- Customer-facing/admin-visible data must come only from crawled live prices in `public/prices.json`.
- Never show or export estimated prices. If there is no crawled live price, hide the apartment from exports/map/mind map/export previews.
- Keep these outputs synchronized after every crawl:
  - crawl result JSON
  - admin map
  - admin mind map
  - admin tier export HTML/PDF
- Preserve all listing-status badges that come from crawl data or verified metadata:
  - owner verification fallback badge
  - no listings / missing size-range badges
  - first-floor lowest-price badge

## District Validation
- The normalized catalog in `src/data/catalog-apartments.ts` is the source of truth for visible apartments.
- For routine daily crawls, a full district audit is not required if apartment inventory and mappings have not changed.
- Run `npm run audit:districts` whenever:
  - new apartments are added
  - `naverComplexId` mappings are changed
  - district/name normalization rules are edited

## Export Safety
- Exports must stay copy/paste-safe and immediately viewable.
- HTML/PDF exports must never include uncrawled `basePrice` fallback rows.

## Team Mode And Memory
- This project uses the workspace-level team mode defaults in:
  - `C:\Users\dlwls\Desktop\first codex\AGENTS.md`
- For session continuity, keep these files current:
  - `C:\Users\dlwls\Desktop\first codex\memory.md`
  - `C:\Users\dlwls\Desktop\first codex\decisions.md`
  - `C:\Users\dlwls\Desktop\first codex\team_log.md`
- Important finalized corrections must be synced into canonical source files, not left only in temporary normalization layers.
