# Supper — an EmDash theme for restaurants

A theme for restaurants, cafés, and bars whose website exists to answer three questions: *what's on the menu, when are you open, and how do I get a table?* Built with [EmDash](https://github.com/emdash-cms/emdash) and deployed on Cloudflare Workers with D1 and R2.

**Live demo:** [supper.superherotech.ai](https://supper.superherotech.ai)

**Create a site from this theme:**

```bash
npm create astro@latest -- --template github:ecropolis/emdash-theme-supper
```

The menu is structured content, not page copy: dishes live in a **Menu Items collection** with price, description, dietary flags, photo, and a **menu section taxonomy** (starters / mains / desserts / drinks). The `/menu` page groups by section automatically; homepage "favorites" blocks pull featured dishes with photos.

## What's included

- **Menu Items collection + `menu_section` taxonomy** — dishes with prices, one-line descriptions, dietary flags (V / VG / GF rendered as chips), photos, featured flag, per-section ordering. Grouped `/menu` page with course-order sections and anchor links.
- **Seven content blocks** — hero, menu (list or photo-card layouts), hours & contact, gallery, reviews, FAQ, reservation CTA banner.
- **Compass Customizer** — no-code design controls in **Admin → Design** built on the shared [token contract](docs/TOKEN-CONTRACT.md): palette presets, brand colors, typeface, roundness, live preview.
- **Compass Forms** — the seeded Reservations page carries a reservation-request form (name, email, phone, date/party details) with stored submissions, an admin list, and spam basics.
- **Compass Mail** — EmDash's missing email transport comes bundled; add a SendGrid/Resend key and reservation requests land in your inbox.
- **Menu-driven reserve CTA** in the header (`cta` menu), dark/light mode, and demo content for a fictional Chicago wood-fire restaurant so the theme looks real out of the box.

## Pages

| Page | Route | Source |
|---|---|---|
| Home | `/` | `pages` entry `home`, composed of blocks |
| Menu | `/menu` | grouped archive of `menu_items` by `menu_section` |
| Our story | `/about` | `pages` entry, blocks + prose + gallery |
| Reservations | `/reservations` | `pages` entry with hours + reservation form |
| Any page | `/{slug}` | catch-all over the `pages` collection |
| 404 | fallback | — |

## Local development

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:4321/_emdash/admin` and complete the setup wizard — it applies `seed/seed.json` (schema, taxonomy, menus, and demo content) automatically.

## Deploying

```bash
pnpm deploy
```

Requires a Cloudflare account with D1 and R2. Edit `wrangler.jsonc` to set your worker, database, and bucket names.

## Rebranding checklist

1. Site title and tagline — admin → Settings.
2. Colors and typeface — **Admin → Design** (no code), or `src/styles/theme.css` for the shipped identity.
3. Replace the demo menu, page copy, and reviews in the admin — dishes are entries under **Menu Items**.
4. Swap the demo imagery (Unsplash) for your own photos.
5. Point the `cta` menu at your booking system if you use one; otherwise the built-in reservation-request form emails you.

## License

MIT © Ecropolis
