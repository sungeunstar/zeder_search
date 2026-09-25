# Seaside workshop — TOMOB water / day-night adaptation

## Source inspected

The user's `sungeunstar/tomob-game` was read through the connected GitHub integration:

- `modules/water.js`, blob `19d7f70cd73bf41a628f792fd2ea46a955199969`: twelve directional wave bands; GLSL generated from one spectrum; Gerstner horizontal displacement; inverse-displacement height query; Fresnel, crest scattering, broken foam, and broad/tight moon reflections.
- `modules/sky.js`, blob `ffba1869f5365c5f5dcdda34a84283bd566da16a`: 0=sunrise/.25=noon/.5=sunset/.75=midnight; coordinated light, exposure, sky, fog and water; late star appearance rather than abrupt changes.

This adaptation reuses the spectrum and those coordination patterns, not the whole game's context, boats, weather, combat, textures, or global debug hooks. Original wave amplitude is scaled by 0.085 and spatial frequency by 8.5 for a sheltered, small coastal scene. It is an analytic Gerstner model, **not** a full fluid solver. GPU displacement and `heightAt()` derive from the same data. Existing TOMOB files are not modified.

## Implementation

- `sea-spectrum.js`: immutable spectrum, shared GLSL generation and finite CPU queries.
- `environment-state.js`: day/noon/sunset/night factors, continuous easing, camera orbit math.
- `atmosphere.js`: nonuniform tessellated ocean mesh, actual displaced vertices, crossing procedural micro-normals, shared procedural sky/reflection, sun/moon specular, foam and stars. Original water normal-map assets are not copied; their licensing was not verified.
- `atelier.js`: all lighting/material state tracks the same chosen time. Mouse gives ±4.7° yaw / ±1.4° pitch with damping. Touch does not orbit. Pointer leave/window blur returns the camera target to neutral. Reduced-motion preference disables autonomous motion and applies time selection immediately.
- `workshop.js`: rounded torso, boots, neck/head and apron. Elbow/hand meshes share joint locations. Hands and pencil are posed at tabletop height; writing motion follows real response-generation state, not made-up marketing work.
- `world-controller.js`: three icon buttons (낮 / 노을 / 밤), persisted per browser. No tutorials or setup panel. Marketer studio remains 2D.

Sun and moon elevation and palette are art-directed for this composition, not an astronomical ephemeris. No auto real-world time, location access, or automatic session reset. Default stays sunset unless changed by the user.

## Boundaries

Scene work is not actual marketing execution. The unchanged product is local-browser demo mode without model credentials; cross-account matching and campaign execution remain unconnected. The concept image's fine modelling/detail is still a separate visual target, not a claim of identical fidelity.

## Tests

`npm test` covers spectrum bounds, inverse horizontal displacement, time continuity, dark-night visibility floor, camera orbit radius, input validation, source-level safeguards, and existing product behavior.

`tests/browser.mjs` uses real HTTP, native storage and Chromium/WebGL2, checks actual pointer events, all time presets and reduced motion, and then the existing chat → strategy → marketer review → client approval flow. Source screenshot testing in this sandbox uses an in-memory storage adapter due sandbox browser navigation restrictions; those results are not called production verification.
