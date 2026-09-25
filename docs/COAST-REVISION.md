# Coastal terrain revision — 2026-09-25

This is an improvement to the real-time prototype, not a claim of visual parity with the generated concept image.

## Changed
- Replaced the flat polar top and separate vertical wall with one continuous eroded heightfield. Soil rolls into inclined rock, with variable coastline elevation, gullies and protrusions.
- Added embedded rock formations and shrubs across the soil/rock boundary; removed the constant cut-disc silhouette.
- Added local PBR diffuse/normal material maps from Poly Haven. License and SHA-256 checksums are recorded in SURFACES.json. All assets are self-hosted after the build; no third-party asset calls from visitors.
- Cropped and recolored a physical plank surface for wood beams; bevelled timber edges and finer bark detail.
- Denser smaller foliage, coastal flowers, improved camera framing and warmer horizon. Actual depth-aware lens remains in use.

## Build
`npm install && npm run build` prepares the pinned material bundle. The first build requires access to dl.polyhaven.org. Checksums are mandatory; missing or changed assets fail the build, rather than silently serving different materials. `npm run dev` prepares the same assets before starting the local server.

## Limitations
The workshop and artisan are still procedural models. This revision does not match the conceptual image's modelling, lighting and vegetation detail. Demo chat, local-only storage and no external marketing execution are unchanged.
