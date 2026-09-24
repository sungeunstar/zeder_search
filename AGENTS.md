# Development guardrails

- Customer starts with a single conversational composer, NEVER a marketing dashboard or setup form.
- Customer and marketer surfaces are distinct. Structured strategy editing belongs to /#/studio.
- Recommend execution paths and tools from context. Don't force customers to select tools.
- Preserve submitted/reviewed/approved versions. Changes create versions; side effects require explicit approval.
- Demo responses MUST be labeled. Provider errors must not silently become demo success.
- No invented research, customers, results, assignments, prices, messages sent or published content.
- API keys stay server-side. This preview has no account isolation; don't call local role switching authorization.
- Escape every user/model value rendered as HTML. Never eval generated content.
- Use node:test for domain and API tests: npm test. Build: npm run build.
- Offline browser QA: node scripts/preview.mjs && python tests/ui_smoke.py. It uses test adapters, not production server navigation.
- Document incomplete integrations in README. Do not introduce a live paid endpoint without authentication and usage controls.
