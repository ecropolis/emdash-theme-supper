This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
npx emdash dev        # Start dev server (runs migrations, seeds, generates types)
npx emdash types      # Regenerate TypeScript types from schema
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, taxonomy, menus)                    |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout with EmDash wiring (menus, header CTA, footer, theme switcher)         |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall.

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"` and guard on the object (`data.image && ...`), never `.src`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- Always call `Astro.cache.set(cacheHint)` on pages that query content.
- Taxonomy names in queries must match the seed's `"name"` exactly: this theme uses `menu_section` (singular).
- D1 booleans come back as 0/1 — guard JSX with `!!value` or a literal 0 renders.

## This Theme: Supper

A restaurant theme (restaurants, cafés, bars) by Ecropolis. The organizing idea: the menu is structured content — dishes are entries with price/dietary/section — and every page funnels toward a reservation. Demo content is a fictional Chicago wood-fire restaurant, "Ember & Rye".

## Pages

| Page         | Path            | What it shows                                                                 |
| ------------ | --------------- | ----------------------------------------------------------------------------- |
| Home         | `/`             | Restaurant blocks in any order, authored on the `home` page entry             |
| Menu         | `/menu`         | All `menu_items` grouped by `menu_section` term, course order, anchor ids     |
| Our story    | `/about`        | Blocks + prose + gallery                                                      |
| Reservations | `/reservations` | Hero + hours (`#visit` anchor) + Compass Forms reservation request + FAQ      |
| Any page     | `/{slug}`       | Catch-all over the `pages` collection                                         |

## Schema

- `pages`: `title`, `content` (Portable Text containing restaurant blocks).
- `menu_items`: `title` (dish name), `description` (one line), `price` (string, number only — the renderer adds the $), `image` (shown only in card layouts), `dietary` (comma string like "V, GF" rendered as chips), `featured` (boolean, drives "favorites" blocks), `sort_order` (integer, within section).
- Taxonomy `menu_section` (flat) on `menu_items`: starters / mains / desserts / drinks. `/menu` orders known slugs by course and appends any editor-added sections after.
- Four menus: `primary`, `cta` (first item renders as the header reserve button), `footer_menu`, `footer_visit`.

## Restaurant blocks

A local plugin at `src/plugins/restaurant-blocks/` registers seven Portable Text block types, rendered via `src/components/blocks/*` (dispatched from `RestaurantBlocks.astro`).

| Block            | Fields                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `resto.hero`     | `headline`, `subheadline`, `badge`, primary/secondary CTA label+URL pairs, `imageUrl`, `imageAlt`, `centered` |
| `resto.menu`     | `headline`, `subheadline`, `section` (term slug, empty = all), `featuredOnly`, `limit`, `showImages` (cards vs classic list), `ctaLabel`/`ctaUrl` — **renders `menu_items`**, carries no dishes itself |
| `resto.hours`    | `headline`, repeater of `{ label, value }`, `phone`, `email`, `address` (multiline), `note`        |
| `resto.gallery`  | `headline`, repeater of `{ url, alt }` photos                                                      |
| `resto.reviews`  | `headline`, repeater of `{ quote, author, detail }`                                                |
| `resto.faq`      | `headline`, repeater of `{ question, answer }`                                                     |
| `resto.cta`      | `headline`, `subheadline`, `ctaLabel`, `ctaUrl`                                                    |

Block Kit constraints are the usual: flattened CTA pairs, scalar-only repeaters, image inputs as URL strings. Icons come from a small Phosphor set in `astro.config.mjs`: `calendar-check, clock, envelope, fork-knife, map-pin, phone, star`.

## Bundled Compass plugins

- **Compass Forms** (`@ecropolis/emdash-plugin-compass-forms`) — the seeded Reservations page carries a `compass.form` block (`formKey: reservations`, custom fields incl. a date/party textarea). Submissions in **Admin → Form Submissions**; notification email under Plugins → Compass Forms → Settings.
- **Compass Mail** (`@ecropolis/emdash-plugin-compass-mail`) — email transport (SendGrid/Resend, BYO key). Configure under Plugins → Compass Mail → Settings, then select under Settings → Email.
- **Compass Customizer** (theme-local, `src/plugins/compass-customizer/`) — Admin → Design; injects `html:root` token overrides via the trusted `page:fragments` hook. Token precedence: `tokens.css` (`@layer base`) < `theme.css` (`:root`) < customizer (`html:root`). Never add higher-specificity token declarations.

## Visual character

Candlelit dinner-house. **Fraunces** (soft serif) on `--font-heading` via a second font pipeline entry (`--font-display-face`), **Nunito Sans** body. Display weight 600 — serifs don't want heavy. Warm grounds (cream by day, near-black by night), wine brand + old-gold accent, set in `src/styles/theme.css`:

- `--color-brand: light-dark(#8e3b46, #d98b91)` with `-strong` / `-soft`
- `--color-accent: #b98a2f`
- Warm neutrals override the default cool slate (`--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-border`)

Menu typography is the signature: dotted leaders between dish and price, serif prices with a small raised `$` (added by CSS — the price field is the bare number).

## What not to do

- Don't put dishes in page copy. The `menu_items` collection is the source of truth; the `/menu` page, favorites blocks, and dietary chips all read from it.
- Don't write the `$` into price fields — the renderer adds it. Bare numbers keep future integrations (ordering, POS sync) possible.
- Don't add a menu section by editing code — add a `menu_section` term in the admin; `/menu` picks it up (appended after the course-order slugs).
- Don't write generic restaurant copy ("A culinary journey"). The demo voice is concrete on purpose — farms, hours, walk-in policy.
- Don't use `getStaticPaths()` on content routes — everything renders server-side.
