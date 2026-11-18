# GO 72

A mobile-first lifestyle storefront and PWA shell built with Vite, vanilla JavaScript, HTML and CSS. A white interface, clay accent, concise shopping copy and original SVG product illustrations.

**Demo only:** the 12 products, INR prices, specifications, stock labels and ratings are placeholders. No real orders, payments, inventory, suppliers, databases or authentication are connected. No analytics, ads, tracking, cookies or customer-data collection. Checkout uses read-only sample information.

## Development in a temporary/cloud workspace

Use Node.js **22.12 or newer**. Vite is the only build dependency; there is no runtime framework or UI library.

~~~sh
npm ci
npm run dev
npm run build
npm run preview
~~~

If the lockfile is not yet present, use npm install first. Forward the Vite port privately through your cloud workspace. Production output is dist/. The build regenerates offline.html from src/content.js. Do not commit generated output.

## Features and structure

| Route | Behavior |
| --- | --- |
| / | Shop by category, featured products, new arrivals and a desk-accessories banner |
| /catalogue, /search | Live search, category filters, sorting, skeletons, empty state; URL query parameters preserve the view |
| /product/:id | Gallery, sample prices, colours, quantity, sticky mobile Add to Cart, related products |
| /cart | Variant-aware merging, quantities, removal, subtotal, shipping placeholder |
| /checkout | Address, delivery, payment and review UI with read-only sample data; no order placed |
| /account | Sign-in/sign-up and order-history placeholders; no credential inputs |
| /info | Privacy, demo and business-support information |
| Unknown paths/products | 404 screen |
| /offline.html | Standalone offline fallback |

Interface copy: src/content.js. Product copy and data: src/data/products.json. Design tokens: the first rule in src/styles/main.css. Shared components, custom router, API access and cart state live under src/. Published content is loaded through /api/content. The original product JSON is retained as migration input, and is not copied to the public build.

The cart uses the versioned go72_cart_v1 localStorage key. The install dismissal preference uses go72_install_dismissed_v1. No real personal data is stored. Invalid storage is handled gracefully. Quantities are capped at nine per demo line; this is a UI limit, not real inventory. Finish demo preserves the cart.

## PWA

manifest.webmanifest provides GO 72 identity, standalone display, white background/theme and 192px/512px PNG icons plus a maskable icon. Assets are original and local.

sw.js uses network-first navigation and product JSON, with an app-shell/offline fallback. Cache-first is limited to same-origin static assets. Checkout, account, payment, auth and API routes bypass caching; offline checkout/account navigation shows the standalone offline page. Static caches are bounded and obsolete GO 72 caches are removed on activation. Bump the worker version when changing cache strategy.

Worker registration is disabled during Vite development. Test it on a production preview on localhost or HTTPS. Updates do not force a mid-session reload. Installation is optional, offered only when supported and remembered when dismissed. Images need to have been visited to be available offline.

## Cloud verification

.github/workflows/quality.yml checks syntax, installs dependencies, builds, scans source/output for secret-like content, starts dev and preview servers, and runs Chromium/Playwright plus axe-core in an ephemeral GitHub-hosted runner. Test tools are not frontend dependencies.

It verifies filters/search/sorting, loading/empty states, variants/gallery, cart logic/persistence/totals, read-only checkout, account/404/unavailable states, storage recovery, keyboard navigation, zero cookies, manifest, worker registration and offline cache exclusions. Screenshots cover **360, 390, 414, 1280 and 1440px**. Basic WCAG A/AA checks cover eight screens and complement manual review; this is not accessibility certification.

~~~sh
npm run build
npm install --no-save --package-lock=false @playwright/test@1.65.1 axe-core@4.14.1
npx playwright install --with-deps chromium
node scripts/audit.cjs
npm run check
~~~

The latest GitHub Actions run supplies go72-quality (JSON report, screenshots and lockfile metadata) and go72-dist (deployable build). Artifacts expire after 14 days. Generated files are ignored.

## GitHub and environment variables

Public repository: https://github.com/deambix/go72

This project was authored from scratch and uploaded through GitHub Git Data APIs. Source and build files were not saved to the developer laptop, and existing local projects were not read or reused. Build/test work runs in GitHub’s cloud runner.

**No environment variables are exposed to this frontend.** The CMS requires server-side ADMIN_PUBLISH_KEY and BLOB_READ_WRITE_TOKEN; see content-management setup below. Operator GitHub and optional Vercel tokens belong in an untracked .env or secure credential store and are used only for repository/deployment operations. Never expose tokens through src/, product JSON, VITE_* variables, source, logs or commits. .gitignore excludes .env, .env.*, node_modules/, dist/, .vercel/ and test output. The workflow uses its built-in, read-only token; no personal token is stored in source or repository settings.

Make small descriptive commits, run the quality workflow, and push to GitHub. Production deployment requires explicit approval.

## Vercel preview handoff

The owner supplied a dashboard screenshot of the existing go72-deambix project in team go-72, with go72.duckdns.org connected. The current operator token cannot access that team. An authorized token is required for preview deployment and Blob setup. vercel.json defines Vite, npm run build, dist output, client-router rewrites and non-cached service-worker headers. No application secrets are required.

For a preview-first setup from a temporary/cloud checkout, sign in to Vercel and run:

~~~sh
npx vercel
~~~

Follow project setup prompts and use the generated preview URL. Do not use --prod before explicit approval. Connect deambix/go72 in Vercel Project Settings → Git when ready and verify the production branch/automatic deployment behavior. Dashboard import can immediately create a production deployment; use the CLI preview flow when preview must come first.

Settings: framework Vite; root repository root; install npm ci; build npm run build; output dist; frontend environment variables none. After deployment, verify direct product-route visits/reloads, search, cart, icons/manifest, worker scope and offline fallback on the preview URL.

## Custom domain, later

No custom domain is configured or claimed live. After approval, add the selected domain under Vercel Project Settings → Domains. Copy the **exact A/ALIAS or CNAME record and any verification TXT record displayed for that domain** into the DNS provider. Targets can depend on the project/account, so do not guess an IP or hostname. Preserve unrelated mail/verification records. Record the exact required DNS entries and wait for Vercel verification plus HTTPS issuance before claiming the domain is live.

## Developer responsibility

The developer builds the website. The business owner is responsible for products, suppliers, orders, payments, fulfilment, refunds, policies, taxes, legal compliance and customer support. The owner must provide verified specifications, support contact details and required delivery/returns/legal information before launch. Placeholder values and illustrations are not product claims.

## Roadmap

1. Real commerce backend with verified products, inventory and supplier ownership.
2. Checkout/payment integration, shipping, tax, refunds and approved policies.
3. Authentication, accounts, order tracking and customer support.
4. Business operational controls beyond the lightweight content manager.
5. Optional Rust internal tooling for imports, validation or backend operations.

Anything beyond the frontend/PWA scope requires agreement before implementation.

## License

MIT — see [LICENSE](LICENSE). Original code and placeholder illustrations are included. The license does not grant trademark rights or imply ownership of the client business.

## Verification result

The updated shopping interface at commit 0feaaab683e9c9d6e95c5727584a3865e136f8da passed the [cloud quality run](https://github.com/deambix/go72/actions/runs/44340702627). Production build, source/credential checks, functional behavior, 24 layout checks and eight automated accessibility checks passed. Mobile and desktop screenshots were visually reviewed. The JSON report and screenshots are available in the run’s go72-quality artifact; the deployable build is in go72-dist. Vercel has not been deployed by the developer.

### Known development-tool advisory

The current Vite dependency tree includes picomatch 4.0.7, affected by [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), a high-severity regular-expression denial-of-service issue in glob-pattern processing. npm propagates it through dependent build tools. The upstream advisory lists no patched version as of verification. This dependency belongs to development/build tooling and is not in the shipped storefront JavaScript. Keep cloud development ports private and update the toolchain when an upstream fix is released. This advisory is separate from the successful functional and accessibility checks.

## Private content management

The publishing interface is at /admin. There are no public navigation links to it. The URL is discoverable in source; server-side authentication protects management data and actions. Do not share the admin URL or publishing key.

Create or select a PRIVATE Vercel Blob store from the existing project's Storage tab and connect it to Preview first. Enable its BLOB_READ_WRITE_TOKEN environment-variable connection. Add ADMIN_PUBLISH_KEY as a server-side Secret/Sensitive environment variable. Never use a VITE_ prefix for either variable. Generate the publishing key with a trusted cryptographic password generator (at least 32 random bytes) and paste it directly into the secret field; never print or commit it. Redeploy the preview after setting variables. The interface keeps the entered key in page memory, sends it only in x-go72-admin-key, and clears it on logout/page exit. No email login, authentication cookies or browser-storage authentication are used.

Content lives in go72-data.json in the private store. The first configured read initializes it from the existing demo products. Schema version 1 contains revision, updatedAt, updatedBy, checksum, products, categories, deliveryRegions, settings, private image assets and private authentication-attempt metadata. The checksum detects accidental corruption; it is not a digital signature. Invalid content is rejected rather than overwritten. Reads bypass Blob's cache and writes use ETag ifMatch conditions. Conflicting editors must reload. A versioned private snapshot under backups/go72-data.r<revision>.<checksum>.<uuid>.json is written before each update, including authentication-attempt updates. Backups are retained until the owner removes them; monitor storage usage.

Use the admin Backups tab to download an authenticated JSON export. To restore, select the export and explicitly confirm replacement. Restoration validates schema/checksum, saves current content first and creates a new revision while preserving current lockout metadata. If corruption prevents admin access, use the Vercel Storage dashboard to restore a valid private snapshot to go72-data.json with private access and JSON content type. Never publish raw content files or backups.

PNG/JPEG/WebP uploads are capped at 3 MB. Images go through authenticated server routes into the same private store. Only URLs and metadata are persisted. Public image routes resolve asset IDs referenced by currently published products, active categories or the logo. Arbitrary image URLs are not accepted. An upload can leave an unused Blob object if the content write subsequently conflicts; check references before removing unused objects through the Storage dashboard.

Public /api/content returns published products in active categories, active categories, enabled delivery regions and public settings. It omits security metadata and private image URLs. Content/image responses are not cached. Offline navigation shows the standalone fallback, avoiding an outdated catalogue after unpublishing. An already open page refreshes on navigation; this is not live multi-user synchronization. Stable product IDs preserve cart lines when URL slugs change. Mixed currencies have separate subtotals and are never converted. Quantities remain capped at nine and configured stock limits. Checkout and accounts remain previews; no orders, payments or inventory deductions are added.

Cloud development needs the two server-side variables. Run npm run dev; Vite forwards API requests to the same handlers. Output stays dist, with top-level api/ handlers deployed as Vercel Node functions. Routes: /api/content, /api/media and /api/admin/{state,products,categories,delivery,settings,upload,image,backup,restore}. Every write requires the publishing-key header and current content revision. Publication, unpublication, deletion, archival and restoration additionally require explicit confirmation. Five invalid key attempts trigger a 15-minute lockout keyed to a hashed client IP and persisted in Blob. A process-local request limit complements that lockout; Vercel Firewall can supply stronger global traffic controls.

Run npm ci, npm run build, npm run test:cms and the cloud browser workflow. CMS tests explicitly use an in-memory adapter for the Vercel Blob contract. These tests do not verify a live Blob connection. A live preview requires an accessible existing Vercel project, a connected private Blob store and configured secrets. Connect a separate private Preview store so disposable tests do not modify production content. Production deployment and domain changes still require approval.

Product accuracy, pricing, taxes, delivery, refunds, policies and legal compliance remain the business owner's responsibility. Replace sample content with verified information before enabling commerce.
