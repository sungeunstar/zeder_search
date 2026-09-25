# Request-driven seaside workshop

The customer stays in a bottom-centered conversation dock. Full conversation history and strategy documents open explicitly in accessible dialogs. The actual strategy document can also be opened from a projected workbench button or its real 3D mesh. The marker and dock resolve the same thread/version. The marketer studio remains separate.

## Semantic state is not animation state

`work-snapshot.js` consumes application state, including a live generation ID, response ID and the selected submitted/reviewed/approved plan version. Reloading an unfinished request marks it interrupted rather than claiming a background job is still running. The director never completes a request from an animation timer.

`work-director.js` is independent of Three.js. `observe(snapshot)` owns event transitions; `update(dt)` owns presentation. Timers can finish a walk or a hand movement, not research, human review or an external action.

| Input topic | Station | While a response is pending |
| --- | --- | --- |
| Business brief | Front desk | Receive and read the request |
| Target, channel, offer, strategy | Board | Walk around the workbench and make notes |
| Research direction | Shelf | Consult a notebook; no claim that browsing occurred |
| Copy or content | Desk | Write on the desk |

Input classification is a bounded keyword mapping for **visual behavior**, not an LLM claim of inferred intent. Unknown inputs use the desk. No user/model text executes animation code.

## Transitions

- New generation: receive → walk to relevant station → think/research until the actual response.
- Question returned: processing ends immediately; the character presents/reads the available answer then waits for input. No output document is invented.
- New plan version returned: the result is immediately available in the UI. Reading, carrying and placing it are presentation of an already available result, never an artificial API delay.
- Requested human review: wait. This local preview does not imply a real marketer has accepted or started the request.
- Stop or provider error: interrupt the current path/gesture, preserve the input, display stopped/error state. Retry starts a new generation.
- New input supersedes unfinished presentation. Loading/revisiting an existing thread restores a settled state without replaying an imaginary job.
- Reduced motion: no locomotion; logical states and result buttons remain available. A manual pause freezes presentation, not application operations.

Movement follows the left aisle around the workbench, with a turning root, articulated arms and legs, a carried document and a pencil that appears only for writing. The orbit range is increased to ±0.24 rad on desktop and remains bounded, damped and independent of the task's state. Hovering over conversation controls or an open dialog does not steer the camera.

## Current limits

The public preview remains demo-mode unless its existing server configuration is supplied. No customer search, advertising, publication, email sending, payment or cross-account collaboration is added. The figure animates the conversation and existing strategy/review workflow, not an unimplemented background marketing agent. The procedural model is not equivalent to the generated concept image's fidelity.

## Verification

Run `npm test`, `npm run build`, and `node tests/browser.mjs` (Chromium via Playwright). Browser checks exercise native HTTP/storage and actual WebGL. Optional `BASE_URL`/`EXPECT_COMMIT` validate a deployment. Deterministic animation checkpoints are visual/kinematic tests, not real-time performance measurements. Local offline checks use the standalone bundle with explicit memory-storage adapters when navigation is blocked.
