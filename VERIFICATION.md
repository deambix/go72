# GO 72 verification

Tested application commit: 1bf1e8f80bb8856cb45c834fe27cde08ba5d2bac

Cloud runner: GitHub Actions, Ubuntu 24.04, Node.js 22, Vite 8.3.8, Playwright 1.65.1, axe-core 4.14.1.

Run: https://github.com/deambix/go72/actions/runs/44331109318

- Production build and source/credential audit passed.
- Nine functional verification groups passed; no browser JavaScript errors.
- 24 layout checks passed with no horizontal overflow.
- Widths: 360, 390, 414, 1280 and 1440px.
- Eight screens passed basic automated WCAG A/AA checks with zero reported violations.
- Manifest/icons, production worker registration, offline app shell and sensitive-route cache exclusion passed.
- Cart quantities, variants, totals, persistence, removal and malformed storage recovery passed.
- Checkout uses read-only sample details; no order/payment is submitted. Account screens collect no credentials. Browser cookies: zero.
- Main home, catalogue, product, cart, checkout and offline screenshots were visually reviewed from cloud artifacts, without saving them locally.

Quality artifact: https://github.com/deambix/go72/actions/runs/44331109318/artifacts/14439362023

Build artifact: https://github.com/deambix/go72/actions/runs/44331109318/artifacts/14438543997

Artifacts expire after 14 days. The workflow reproduces these outputs. See the README for the known unpatched picomatch development-tool advisory, environment handling and Vercel preview setup. No Vercel deployment or custom domain was created.
