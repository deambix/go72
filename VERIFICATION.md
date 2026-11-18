# GO 72 CMS verification

Tested code commit: 49715d9fe5245a1d582157489b14887fd11e0599

Cloud run: https://github.com/deambix/go72/actions/runs/44368141018

- Strict npm ci, production build, source/output checks and CMS contract/API tests passed.
- 10 functional groups, 34 responsive checks and 10 automated accessibility checks passed.
- Browser JavaScript errors: 0.
- Widths: 360, 390, 414, 1280 and 1440px. Browser: 157.0.8103.78.
- Key access/lockout, products/publication, categories, uploads/reordering, variants, delivery, settings, backups/restoration, cart, search, PWA and keyboard navigation were checked.
- Generated server-only test credentials were absent from public build output. Content containing configured secrets is rejected.
- Zod is pinned to patched version 4.6.6 through an npm override.

Storage verification used an explicitly labelled in-memory adapter for the Blob SDK contract. It does not prove a live Vercel Blob connection.

Live preview: https://go72-deambix-git-cms-private-blob-go-72.vercel.app/

Admin: https://go72-deambix-git-cms-private-blob-go-72.vercel.app/admin

The owner reported {"error":"Content unavailable"} from the live content API. The current operator credential cannot access the known Vercel project/environment resources and receives 403 for storage access. Live Blob setup and ADMIN_PUBLISH_KEY configuration remain pending. No live secret was generated or configured by this work. See README for the private Preview store and server-side environment setup.

All repository work was performed through GitHub APIs and ephemeral GitHub runners. No repository/dependency/build files were added to the local workspace. Production deployment and domain changes were not performed by this agent.
