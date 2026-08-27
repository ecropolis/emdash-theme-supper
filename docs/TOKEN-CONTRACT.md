# The Ecropolis Theme Token Contract (v1)

The contract that makes Ecropolis themes customizable without code. Any theme that implements it gets full support from the Compass Customizer plugin — and any tool that writes these tokens can restyle any compliant theme.

## The idea

A theme's entire visual identity is expressed as CSS custom properties, declared in three strict layers:

| Layer | File | CSS layer | Purpose |
| --- | --- | --- | --- |
| 1. Defaults | `src/styles/tokens.css` | `@layer base` | Every token, with its default value. Never edited by users. |
| 2. Theme overrides | `src/styles/theme.css` | unlayered `:root` | The theme's shipped identity (brand colors, weights). Beats layer 1 by layer rules. |
| 3. Runtime overrides | injected `<style>` | unlayered `html:root` | Written by the Compass Customizer at render time. Beats layer 2 by specificity (0-1-1 vs 0-1-0), regardless of position in `<head>`. |

Because each layer wins by *mechanism* (cascade layers, then specificity) rather than by source order, the stack is deterministic: **defaults < theme < customizer**, always.

## Required tokens

A compliant theme must define, and exclusively use, these tokens for the concerns they name.

### Color (light-dark aware)

Every color token uses `light-dark(<light>, <dark>)` so one declaration carries both modes. The root sets `color-scheme: light dark`, and an explicit user choice pins the scheme via `:root.light` / `:root.dark`.

| Token | Meaning |
| --- | --- |
| `--color-bg` | Page background |
| `--color-surface` | Cards, panels |
| `--color-text` | Body text |
| `--color-muted` | Secondary text |
| `--color-border` | Hairlines |
| `--color-brand` | Primary brand color (links, prices, emphasis) |
| `--color-brand-strong` | Darker brand shade (CTA resting state) |
| `--color-brand-soft` | Lighter brand shade (hover borders, glows) |
| `--color-accent` / `--color-accent-soft` | Gradient partner / soft accent |
| `--color-on-brand` | Text/icons on brand surfaces |
| `--color-success` / `--color-warning` / `--color-danger` | Semantic states |

Shade derivation: tools MAY derive `-strong` and `-soft` from the base via `color-mix()` (the customizer does: 85% toward black, 65% toward white). Themes SHOULD tolerate derived shades — don't hand-tune components against exact shipped hex values.

### Gradients

`--gradient-brand`, `--gradient-brand-strong`, `--gradient-brand-soft`, `--gradient-headline`. Defined in terms of the brand/accent tokens so a rebrand follows automatically. A "flat" design sets each to a solid color — components MUST use these tokens in `background:`-compatible positions so a solid value degrades gracefully.

### Typography

| Token | Meaning |
| --- | --- |
| `--font-body` | Body typeface (bound to the webfont pipeline in `astro.config.mjs`) |
| `--font-heading` | Heading typeface (defaults to `var(--font-body)`) |
| `--font-weight-heading` | h2–h6, card titles |
| `--font-weight-display` | Hero/section headlines, logo |
| `--font-size-xs` … `--font-size-6xl` | Type scale |
| `--leading-*`, `--tracking-*` | Line heights, letter spacing |

Runtime font swaps inject a Google Fonts stylesheet and override `--font-body` / `--font-heading`. Themes MUST give every face a fallback stack.

### Shape, space, elevation

| Token | Meaning |
| --- | --- |
| `--radius-sm` / `--radius` / `--radius-lg` / `--radius-full` | Corner rounding scale |
| `--spacing-xs` … `--spacing-5xl` | Spacing scale |
| `--max-width` / `--wide-width` | Reading and layout widths |
| `--shadow-sm` / `--shadow` / `--shadow-lg` / `--shadow-xl` | Elevation |
| `--transition-fast` / `--transition-base` / `--transition-slow` | Motion |

## Compliance rules

1. **No raw values in components** for anything a token names. A hex color or px radius in a component is a contract violation.
2. **`light-dark()` for every color**, with a plain-light fallback block under `@supports not (color: light-dark(...))`.
3. **Defaults live in `@layer base`**; theme identity in unlayered `theme.css`; nothing in the theme uses higher specificity than `:root`.
4. **Gradients must degrade to solids.**
5. **Fonts must have fallback stacks.**

## Versioning

This is v1. The customizer writes only v1 tokens. Additions are minor versions (new tokens with safe defaults); renames or semantic changes are major and require a customizer migration.

## For third-party theme authors

Adopt the contract by copying `src/styles/tokens.css` and the layering setup from any Ecropolis theme (MIT licensed) and following the rules above. Compliant themes are compatible with the Compass Customizer without any per-theme integration.
