# Workshop interaction v2

Based on ef9c0cc (Pretendard/Montserrat). Existing chat, single human review, ocean, day/night and mouse orbit are preserved.

## Changes
- Original articulated maker with ten AnimationClips blended using AnimationMixer. Hands use analytical two-link IK and fixed limb lengths, gait phase follows distance. Desk work blends into a seated pose; walking rises out of it. This is NOT a GLTF/SkinnedMesh or motion-capture asset replacement.
- World-space desk, shelf and board contacts align hands and stationery. Notebook pages turn, a reference folio moves to the hands, the desk shows actual first-plan tools. Target/offer/first-action board content comes from the selected thread version. Review seals only reflect actual reviewed/preparing app state.
- Task camera offsets are bounded and disabled during ambient movement, mobile reduces the cue, and input focus or an open document holds the camera still. User orbit is preserved.
- Lightweight external loader JS/CSS avoids CSP inline-script failures. The bar advances at real scene preparation checkpoints and finishes only after a first rendered frame. It is milestone progress, not measured download byte percentage. Slow loading offers a conversation-first action instead of inventing a failure or delaying ready content.

## Verification and boundaries
143 local Node tests and build passed, including six new contact/framing/state/loader tests. Real Three.js/WebGL scene states were inspected in Chromium using the self-contained HTML, software rendering and a test-only memory storage adapter because native HTTP browser navigation in the authoring environment was restricted. This local verification is not a production browser end-to-end test; repository CI runs the native browser regression suite separately.

Character and object animation never completes a task, approves marketing spend, sends messages, manufactures a review or performs web research. Demo-mode app data remain local to each browser. Real LLM, cross-account collaboration and external execution require existing integration configuration.
