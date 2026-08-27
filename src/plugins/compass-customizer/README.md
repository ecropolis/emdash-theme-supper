# Compass Customizer

No-code design controls for token-contract themes — the EmDash answer to the WordPress customizer.

**Admin → Design** (`/_emdash/admin/plugins/compass-customizer/design`) is a React page ([admin.tsx](admin.tsx), registered via `adminEntry`) with palette preset swatches, native color pickers with hex fields, typeface select, segmented roundness/weight controls, a gradients toggle, and a custom CSS escape hatch — plus a **live preview pane**: the site runs in a same-origin iframe and every control change is painted onto its `documentElement` inline style immediately, before anything is saved, with a light/dark preview toggle. Saving writes one JSON object to plugin KV; visitors see it on their next page load — no rebuild, no deploy.

The React page is deliberately dependency-free beyond React itself (plain `fetch` + the `X-EmDash-Request: 1` header), so it can't break on `@emdash-cms/admin` internals — note that 0.30's actual admin exports differ from the skill docs (`apiFetch` exists, `usePluginAPI` does not).

## How it works

```
Admin Design page (Block Kit form)
        │  form_submit
        ▼
routes.admin handler ── validates hex, applies preset ──► ctx.kv "design"
                                                              │
every public page render                                      │
        │                                                     ▼
"page:fragments" hook ── reads KV ──► <style> html:root { --color-brand: … } </style>
                                      (+ Google Fonts <link> when a font is chosen)
```

Three design decisions worth knowing:

1. **`html:root` selector** (specificity 0-1-1) beats the theme's unlayered `:root` rules in `theme.css` regardless of where the fragment lands in `<head>`. The override stack is deterministic: tokens.css `@layer base` < theme.css `:root` < customizer `html:root`. See [docs/TOKEN-CONTRACT.md](../../../docs/TOKEN-CONTRACT.md).
2. **`page:fragments` is a trusted-only hook**, so this plugin ships inside the theme (native, in-process) rather than as a sandboxed marketplace install. That's a feature: the customizer travels with every Ecropolis theme, and a sandboxed clone can't replicate it.
3. **Two admin surfaces share the same routes**: the React page calls the JSON routes (`settings`, `settings/save`, `settings/reset`), while the Block Kit `admin` route remains as a no-React fallback rendering the same form. The live preview requires no server round-trip at all — it's the token contract applied client-side to the iframe.

## Gotchas learned building this (EmDash 0.30)

- Native-format route handlers take **one** merged context (`RouteContext extends PluginContext`): `ctx.input`, `ctx.kv`, `ctx.log` on the same object. The `(routeCtx, ctx)` two-arg pattern is standard-format only.
- The `hooks.page-fragments:register` capability must be declared **in the `definePlugin` definition** — declaring it only on the descriptor in `astro.config.mjs` gets the hook silently skipped (watch for the `[hooks] … skipping` warning).
- Plugin entrypoints load at server boot; restart `emdash dev` after editing them.
- Admin plugin API routes require the `X-EmDash-Request: 1` header (CSRF) when called outside the admin SPA.
- Shade derivation uses `color-mix(in srgb, var(--color-brand) …)` so derived `-strong`/`-soft` values track `light-dark()` automatically.

## Roadmap (see the strategy doc)

- ~~v2: React admin page with color pickers, live preview pane, per-mode preview toggle~~ — shipped
- Brand kits: named presets saved per account, synced across sites (VendorStreet Pro)
- Logo/favicon upload integration, spacing/density controls, per-block visibility
