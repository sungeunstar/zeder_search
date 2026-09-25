# Seaside strategy workshop — 2026-09-25

The customer homepage now contains an original, real-time Three.js seaside workshop rather than a player-controlled island. The supplied concept image guides composition, not a background texture. Geometry, shading, ocean, foliage and the artisan are generated locally. No proprietary models, user footage or embedded font files are distributed.

## Interaction

- Customer: one question and composer. Focus skips the optional five-second camera approach.
- Chat: left overlay; the visible workbench/board reflects the current local strategy.
- `thinking` follows the existing response-in-progress indicator. It stops on completion or error. No fabricated marketer activity, results, paid work or campaigns.
- `draft`, `requested`, `reviewed` and `preparing` remain the existing versioned domain states. A review stamp only follows an actual locally recorded review/approval.
- Marketer: separate 2D studio, with the WebGL renderer stopped off customer routes.

## Files

`public/world/atelier.js`: camera, lighting, quality, lifecycle.
`public/world/workshop.js`: original architecture, artisan and state-linked board.
`public/world/foliage.js`: shared instanced trees with explicit placement.
`public/world-controller.js`: reads the existing persisted state, connects UI and scene.
`public/world.css`: minimal homepage and responsive chat overlay.

The old island renderer remains as reference code but is not imported by the customer entry point.

## Rendering and accessibility

Hardware desktop uses 128,000 grass blades; mobile/software GPUs use 44,000 and reduced leaf counts. Software-renderer pixel ratio is capped. The view respects reduced motion, offers pause/replay, handles context loss and continues to expose the composer without WebGL. Rendering stops on hidden tabs and studio routes. The depth-of-field pass uses the renderer's real depth texture.

## Run / deploy

Node.js >=22; `npm install`, `npm run dev`. `npm run build` generates `dist/` and locally packages the pinned Three.js runtime. Vercel uses the repository's existing configuration. `node scripts/standalone.mjs output.html` creates a self-contained offline preview.

This is still a browser-local prototype. Without server credentials, the conversation is explicitly demo mode. No actual account-to-account collaboration, payments, campaign publishing or prospect discovery is enabled. Keys belong on the server only. Configure `OPENAI_API_KEY`, `OPENAI_MODEL` and a strong `ZEDER_PREVIEW_KEY` for protected model testing; production authentication, durable storage and distributed usage limits remain separate work.

## Verification

`npm test` covers domain, API, copy and scene contracts. `node tests/browser.mjs` runs genuine HTTP/WebGL browser checks in CI. Local offline browser checks use set_content and explicitly declared memory-storage adapters where navigation is blocked; do not treat those as deployment verification.
