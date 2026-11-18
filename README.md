# GO 72

An existing mobile-first lifestyle storefront and PWA built with Vite, vanilla JavaScript, HTML and CSS. It uses a white background, near-black text, clay accents, serif headings, system body fonts and original local SVG illustrations.

The original 12 products, INR prices, specifications, stock labels and ratings are demo data. Checkout and accounts remain previews: no order, payment, authentication service or inventory deduction is connected. The CMS manages content; the business owner must supply verified product and policy information.

## Development and build

Use Node.js 22.12 or newer in a temporary/cloud workspace.

~~~sh
npm ci
npm run dev
npm run build
npm run preview
~~~

The production build regenerates offline.html and outputs dist/. Do not commit generated output. No operator credentials or server-side secrets belong in VITE_ variables or the frontend bundle.

The Vite dev/preview servers forward /api/ requests to the same Node handlers used by Vercel. Real content reads require BLOB_READ_WRITE_TOKEN. Admin operations also require ADMIN_PUBLISH_KEY. The cloud verification workflow supplies an isolated in-memory Blob adapter for tests; this adapter is not enabled in production.

## Routes and existing components

| Route | Behavior |
| --- | --- |
| / | Homepage hero, categories, featured products, desk spotlight and new arrivals |
| /catalogue, /search | Search, category filters, sorting, loading/error and empty states; view parameters are kept in the URL |
| /category/:slug | Catalogue restricted to an active category |
| /product/:slug | Images, variants, quantities, descriptions, details, delivery information, returns and related products |
| /cart | Variant-aware lines, quantities, removal, currency subtotals and configured delivery estimates/charges |
| /checkout | Read-only sample address, delivery, payment and review; no order or payment |
| /account | Sign-in/account and order-history placeholders |
| /info | Help and privacy information |
| Unknown paths/products | 404 |
| /offline.html | Standalone offline fallback |
| /admin | Publishing-key-protected management data and actions; no public navigation link |

Shared shell/UI helpers are in src/components/. Page modules use the custom History API router. Design tokens and responsive styles remain in src/styles/main.css, with separate admin styles. UI labels stay in src/content.js; CMS settings update the store identity, hero, announcement, support/social links, currency and delivery defaults.

The cart uses go72_cart_v1 in localStorage and stores only stable product/variant IDs and quantities. Product slug edits preserve cart identity. Unpublished, unavailable or removed records are reconciled against fresh public content. Quantities are capped at nine per line and configured stock limits. Different currencies have separate subtotals; no exchange-rate conversion is performed. Delivery fees use the highest applicable line charge, including product overrides; configured regional thresholds waive ordinary regional fees. Checkout still places no orders.

## Private Blob setup and server-side variables

Use the EXISTING go72-deambix Vercel project in team go-72. The owner supplied its dashboard URL and the existing go72.duckdns.org production domain. Previews use their own vercel.app URLs; production/domain changes require approval.

1. Open the existing project's Storage tab. Create/select a PRIVATE Vercel Blob store.
2. Connect a separate private store to Preview so disposable tests cannot affect production content.
3. Enable the store's read-write-token environment-variable connection, named BLOB_READ_WRITE_TOKEN.
4. Add ADMIN_PUBLISH_KEY as a server-side Secret/Sensitive variable for the same environment.
5. Generate the publishing key with a trusted cryptographic password generator: at least 32 random bytes. Paste it directly into Vercel's secret field. Never print it, commit it, place it in a URL or send it in public messages.
6. Redeploy the preview after configuring variables. Connect production storage/variables only when production release is approved.

| Variable | Purpose |
| --- | --- |
| ADMIN_PUBLISH_KEY | One server-side publishing key; no email login |
| BLOB_READ_WRITE_TOKEN | Read/write access to the connected PRIVATE content/image store |

Operator GitHub/Vercel API credentials are separate from application secrets. Keep them in an untracked credential file/store. The application does not expose them. .gitignore excludes .env, .env.*, node_modules/, dist/, .vercel/ and test artifacts.

## Content management and authentication

Visit /admin on the preview and enter the publishing key. Do not share the admin URL or publishing key. The URL can be discovered from source; authentication protects private content and every management operation.

The page keeps the entered key only in memory, sends it in x-go72-admin-key, clears the password field after submission, and clears the session on logout/page exit. It never stores authentication in URLs, localStorage, sessionStorage or cookies. Server verification uses fixed-length hashes and constant-time comparison. Five invalid attempts cause a 15-minute lockout keyed to a hashed client IP and persisted in the private JSON file. A process-local request limit complements that lockout; Vercel Firewall can provide stronger global traffic controls.

The admin manages product creation/editing/duplication, drafts/publication, bulk publish/unpublish, archival/deletion, category relationships, ordered images/alt text, variants, SKU/stock, pricing/currency, descriptions/tags, delivery and return overrides, SEO fields, featured/new-arrival flags, categories, delivery regions and site settings. Image/logo selection uses uploaded or existing approved assets instead of arbitrary external image URLs. Category deletion requires reassignment/removal of referencing products.

Each write requires the key and the current content revision. Publication/unpublication, deletion, archival and restoration actions require explicit confirmation. Conflicts are rejected; reload before applying the edit again. Errors do not return internal paths, traces or secret values. Content containing a configured publishing key or Blob token is rejected before persistence. The cloud build check uses generated test-only credentials to verify that server variables are absent from public build output; it does not create live secrets.

## JSON schema and persistence

go72-data.json is the single private persistent content source. The first configured read initializes it from the EXISTING demo records in server/seed.json. It does not fabricate business data or overwrite corrupted content.

Schema version 1 contains:

- schemaVersion, revision, updatedAt, updatedBy: admin, checksum.
- products: stable ID, editable slug, category ID, descriptions, price/compare-at price/currency, stock/SKU/tags, ordered image references/alt text, variants, delivery/returns overrides, SEO, publication status, featured/new-arrival flags and existing details.
- categories: ID, name/slug/description, image reference, sort order, active/archive status.
- deliveryRegions: ID, name/coverage, charge/currency, free threshold, estimate and enabled status.
- settings: store identity/logo, support, announcement, hero, social links, currency and delivery/returns defaults.
- assets: returned private Blob URLs and validated image metadata, plus existing local illustrations.
- _security: bounded, private invalid-attempt/lockout metadata.

Limits include a 2 MB UTF-8 JSON document, 1,000 products, 100 categories, 100 delivery regions, 20 images and 30 variants per product. Slugs, relationships, duplicate identifiers/slugs, amounts, URLs and input types are validated. A canonical SHA-256 checksum detects accidental corruption; it is not a digital signature.

Reads bypass Blob's cache. Writes save a private snapshot first, then replace go72-data.json using its current ETag with ifMatch. Conflicting writes cannot silently overwrite each other. No database, server filesystem or /tmp directory stores persistent content.

## Images and public APIs

PNG/JPEG/WebP uploads are capped at 3 MB and checked for type/signature and size. Uploads go through authenticated server routes into the same private store. Binary image data is used only during upload transport; JSON persists returned URLs and metadata.

Public content/image responses are no-store. Public /api/content includes published products in active categories, active categories, enabled regions and public settings. It omits security metadata and private Blob image URLs. /api/media resolves asset IDs referenced by visible content; unpublished-only assets are not publicly served.

| API | Access |
| --- | --- |
| GET /api/content | Public, sanitized published content |
| GET /api/media?assetId=... | Public image only when referenced by visible content |
| GET /api/admin/state | Publishing key; management content |
| POST /api/admin/products | Publishing key; save/duplicate/publication/archive/delete |
| POST /api/admin/categories | Publishing key; save/archive/delete |
| POST /api/admin/delivery | Publishing key; save/delete |
| POST /api/admin/settings | Publishing key; settings write |
| POST /api/admin/upload | Publishing key; validated private image upload |
| GET /api/admin/image?assetId=... | Publishing key; private image preview |
| GET /api/admin/backup | Publishing key; authenticated JSON export |
| POST /api/admin/restore | Publishing key plus confirmation/revision; validated restore |

An upload can leave an unused Blob object if a subsequent content write conflicts. Check references before removing unused objects. Product deletion does not automatically delete shared images.

## Backup and restore

A versioned private snapshot is saved before each update, including lockout-metadata updates:

backups/go72-data.r<revision>.<checksum>.<uuid>.json

Backups are retained until the owner removes them. Monitor storage usage.

Use the admin Backups tab to download an authenticated JSON export. To restore, select the export and confirm replacement. The server validates schema/checksum, snapshots current content and creates a new revision while preserving current lockout metadata.

If corruption prevents admin access, restore a valid private snapshot to go72-data.json through the Vercel Storage dashboard, preserving private access and JSON content type. Never publish raw data files or backups.

## PWA and verification

manifest.webmanifest provides standalone mode, GO 72 identity and 192/512px PNG plus maskable icons. Worker registration is disabled during Vite development and enabled on production previews, including when app code initializes after the page load event. Static asset caches are bounded and old GO 72 caches are removed.

Content APIs, management, checkout/account and authentication paths bypass caching. Offline navigation shows the standalone fallback instead of an outdated catalogue. Installation is optional; dismissal uses go72_install_dismissed_v1. An already open page refreshes content on navigation, not through live multi-user synchronization.

~~~sh
npm ci
npm run build
npm run test:cms
~~~

.github/workflows/quality.yml checks syntax, install/build, schema/corruption/concurrency, authentication/lockout, CMS API operations and source/output secret-like patterns. Chromium/Playwright and axe checks cover storefront and admin behavior, mobile widths 360/390/414 and desktop widths 1280/1440. Reports/screenshots and the deployable build are cloud artifacts, retained for 14 days.

CMS tests explicitly use an in-memory adapter for the Blob SDK contract. They do not verify a live Vercel Blob connection. Live checks require project access, configured secrets/private storage and access to the protected preview. Deployment Protection may require signing into the Vercel team. Do not treat a successful Vercel build as proof of working content storage.

## Business responsibility and license

Product accuracy, pricing, taxes, delivery, refunds, policies and legal compliance remain the business owner's responsibility. Verified specifications, support and delivery/return/legal information are required before launch. This work does not add real commerce, authentication, fulfilment or a traditional database.

MIT; see LICENSE. Original code and placeholder illustrations are included. The license does not grant trademark rights or imply ownership of the client business.
