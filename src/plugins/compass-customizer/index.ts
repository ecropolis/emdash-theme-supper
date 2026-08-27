/**
 * Compass Customizer (prototype) — no-code design controls for
 * token-contract themes.
 *
 * The whole trick is small: Ecropolis themes put every design decision
 * in CSS custom properties (see src/styles/tokens.css). This plugin
 * stores a handful of choices in plugin KV, renders an admin page to
 * edit them (Block Kit, so no plugin JS runs in the browser), and
 * injects one `<style>` block into every public page via the
 * `page:fragments` hook. Changes apply on the next page load — no
 * rebuild, no deploy.
 *
 * The injected selector is `html:root` (specificity 0-1-1) so overrides
 * beat the theme's unlayered `:root` rules in theme.css regardless of
 * where the fragment lands in <head>.
 *
 * `page:fragments` is a trusted-only hook, which is why this ships
 * inside the theme (a native, in-process plugin) rather than as a
 * sandboxed marketplace install.
 */

import { definePlugin } from "emdash";
import type { PluginContext, PluginDefinition } from "emdash";

interface DesignSettings {
	preset: string;
	brandLight: string;
	brandDark: string;
	accent: string;
	font: string; // "default" = theme default; otherwise a Google Fonts family
	radius: "sharp" | "soft" | "round";
	displayWeight: "600" | "700";
	gradients: boolean;
	customCss: string;
}

const KV_KEY = "design";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const DEFAULTS: DesignSettings = {
	preset: "ember",
	brandLight: "#8e3b46",
	brandDark: "#d98b91",
	accent: "#b98a2f",
	font: "default",
	radius: "soft",
	displayWeight: "600",
	gradients: true,
	customCss: "",
};

/**
 * Curated palettes. Picking one overwrites the three color fields on
 * save; "custom" leaves whatever is typed in the fields.
 */
const PRESETS: Record<string, { label: string; brandLight: string; brandDark: string; accent: string }> = {
	ember: { label: "Ember & Gold (theme default)", brandLight: "#8e3b46", brandDark: "#d98b91", accent: "#b98a2f" },
	sage: { label: "Sage & Amber", brandLight: "#0f766e", brandDark: "#2dd4bf", accent: "#d97706" },
	ocean: { label: "Ocean & Gold", brandLight: "#0369a1", brandDark: "#38bdf8", accent: "#f59e0b" },
	terracotta: { label: "Terracotta & Teal", brandLight: "#c2410c", brandDark: "#fb923c", accent: "#0d9488" },
	plum: { label: "Plum & Rose", brandLight: "#7e22ce", brandDark: "#c084fc", accent: "#ec4899" },
	forest: { label: "Forest & Ochre", brandLight: "#166534", brandDark: "#4ade80", accent: "#ca8a04" },
	ink: { label: "Ink (monochrome)", brandLight: "#1f2937", brandDark: "#d1d5db", accent: "#6b7280" },
};

const FONTS = [
	{ label: "Theme default (Fraunces + Nunito Sans)", value: "default" },
	{ label: "Inter", value: "Inter" },
	{ label: "Manrope", value: "Manrope" },
	{ label: "DM Sans", value: "DM Sans" },
	{ label: "Nunito Sans", value: "Nunito Sans" },
	{ label: "Lora (serif)", value: "Lora" },
	{ label: "Fraunces (serif)", value: "Fraunces" },
];

const RADII: Record<DesignSettings["radius"], { sm: string; base: string; lg: string }> = {
	sharp: { sm: "3px", base: "5px", lg: "8px" },
	soft: { sm: "6px", base: "10px", lg: "16px" }, // theme default
	round: { sm: "10px", base: "16px", lg: "24px" },
};

async function readSettings(ctx: PluginContext): Promise<DesignSettings | null> {
	const stored = await ctx.kv.get<DesignSettings>(KV_KEY);
	return stored ?? null;
}

/** Build the CSS override block from saved settings. */
function buildCss(s: DesignSettings): string {
	const lines: string[] = [];

	lines.push(`--color-brand: light-dark(${s.brandLight}, ${s.brandDark});`);
	lines.push(`--color-brand-strong: color-mix(in srgb, var(--color-brand) 85%, black);`);
	lines.push(`--color-brand-soft: color-mix(in srgb, var(--color-brand) 65%, white);`);
	lines.push(`--color-accent: ${s.accent};`);
	lines.push(`--color-accent-soft: color-mix(in srgb, ${s.accent} 60%, white);`);

	if (s.radius !== "soft") {
		const r = RADII[s.radius];
		lines.push(`--radius-sm: ${r.sm};`);
		lines.push(`--radius: ${r.base};`);
		lines.push(`--radius-lg: ${r.lg};`);
	}

	if (s.displayWeight !== "600") {
		lines.push(`--font-weight-display: ${s.displayWeight};`);
	}

	if (!s.gradients) {
		lines.push(`--gradient-brand: var(--color-brand);`);
		lines.push(`--gradient-brand-strong: var(--color-brand-strong);`);
		lines.push(`--gradient-brand-soft: var(--color-brand-soft);`);
		lines.push(`--gradient-headline: var(--color-text);`);
	}

	if (s.font && s.font !== "default") {
		lines.push(`--font-body: "${s.font}", sans-serif;`);
		lines.push(`--font-heading: "${s.font}", sans-serif;`);
	}

	let css = `html:root {\n\t${lines.join("\n\t")}\n}`;

	if (s.customCss) {
		// Belt and braces: the value comes from an admin form, but never
		// let it terminate the style element.
		css += `\n\n/* Custom CSS */\n${s.customCss.replaceAll(/<\/style/gi, "")}`;
	}

	return css;
}

function fontLinksHtml(family: string): string {
	const encoded = family.replaceAll(" ", "+");
	return (
		`<link rel="preconnect" href="https://fonts.googleapis.com">` +
		`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
		`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800&display=swap">`
	);
}

/** Blocks for the admin Design page, prefilled from saved settings. */
function designPageBlocks(s: DesignSettings, saved: boolean) {
	return {
		blocks: [
			{ type: "header", text: "Design" },
			{
				type: "context",
				text: "Changes apply to the live site on the next page load — no rebuild. Colors accept 6-digit hex (e.g. #0f766e). Picking a palette overrides the three color fields when you save.",
			},
			...(saved
				? []
				: [
						{
							type: "banner",
							title: "Using theme defaults",
							description: "Nothing is overridden yet. Save once to start customizing.",
							variant: "default",
						},
					]),
			{
				type: "form",
				block_id: "design",
				fields: [
					{
						type: "select",
						action_id: "preset",
						label: "Palette",
						initial_value: s.preset,
						options: [
							{ label: "Custom (use the color fields below)", value: "custom" },
							...Object.entries(PRESETS).map(([value, p]) => ({ label: p.label, value })),
						],
					},
					{ type: "text_input", action_id: "brandLight", label: "Brand color — light mode", initial_value: s.brandLight, placeholder: "#0f766e" },
					{ type: "text_input", action_id: "brandDark", label: "Brand color — dark mode", initial_value: s.brandDark, placeholder: "#2dd4bf" },
					{ type: "text_input", action_id: "accent", label: "Accent color", initial_value: s.accent, placeholder: "#d97706" },
					{
						type: "select",
						action_id: "font",
						label: "Typeface",
						initial_value: s.font,
						options: FONTS,
					},
					{
						type: "select",
						action_id: "radius",
						label: "Corner roundness",
						initial_value: s.radius,
						options: [
							{ label: "Sharp", value: "sharp" },
							{ label: "Soft (theme default)", value: "soft" },
							{ label: "Round", value: "round" },
						],
					},
					{
						type: "select",
						action_id: "displayWeight",
						label: "Headline weight",
						initial_value: s.displayWeight,
						options: [
							{ label: "Medium (theme default)", value: "600" },
							{ label: "Bold", value: "700" },
						],
					},
					{ type: "toggle", action_id: "gradients", label: "Brand gradients (off = flat colors)", initial_value: s.gradients },
					{
						type: "text_input",
						action_id: "customCss",
						label: "Custom CSS (advanced)",
						initial_value: s.customCss,
						multiline: true,
						placeholder: ":root { --wide-width: 1320px; }",
					},
				],
				submit: { label: "Save design", action_id: "save_design" },
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: "Reset to theme defaults",
						action_id: "reset_design",
						confirm: {
							title: "Reset design?",
							text: "All customizer overrides will be removed. The theme's built-in design returns on the next page load.",
							confirm: "Reset",
							deny: "Cancel",
						},
					},
				],
			},
		],
	};
}

const definition: PluginDefinition = {
	id: "compass-customizer",
	version: "0.1.0",
	// For native-format plugins the capability must be declared here in
	// the definition — the descriptor copy in astro.config.mjs is
	// documentation only.
	capabilities: ["hooks.page-fragments:register"],

	hooks: {
		"page:fragments": async (_event: unknown, ctx: PluginContext) => {
			const settings = await readSettings(ctx);
			if (!settings) return null;

			const fragments: Array<Record<string, unknown>> = [];

			if (settings.font && settings.font !== "default") {
				fragments.push({
					kind: "html",
					placement: "head",
					html: fontLinksHtml(settings.font),
					key: "compass-customizer-fonts",
				});
			}

			fragments.push({
				kind: "html",
				placement: "head",
				html: `<style data-compass-customizer>\n${buildCss(settings)}\n</style>`,
				key: "compass-customizer-tokens",
			});

			return fragments;
		},
	},

	routes: {
		// JSON routes for the React admin page (admin.tsx). The Block Kit
		// `admin` route below stays as the no-React fallback surface.
		settings: {
			handler: async (ctx: any) => {
				const saved = await readSettings(ctx);
				return {
					settings: saved ?? DEFAULTS,
					saved: saved !== null,
					presets: PRESETS,
					fonts: FONTS,
				};
			},
		},

		"settings/save": {
			handler: async (ctx: any) => {
				const v = (ctx.input ?? {}) as Record<string, unknown>;
				const preset = String(v.preset ?? "custom");
				const palette = PRESETS[preset];

				const next: DesignSettings = {
					preset,
					brandLight: palette ? palette.brandLight : String(v.brandLight ?? "").trim(),
					brandDark: palette ? palette.brandDark : String(v.brandDark ?? "").trim(),
					accent: palette ? palette.accent : String(v.accent ?? "").trim(),
					font: String(v.font || "default"),
					radius: (["sharp", "soft", "round"].includes(String(v.radius)) ? v.radius : "soft") as DesignSettings["radius"],
					displayWeight: String(v.displayWeight) === "700" ? "700" : "600",
					gradients: v.gradients !== false,
					customCss: String(v.customCss ?? ""),
				};

				for (const [field, value] of [
					["Brand color (light)", next.brandLight],
					["Brand color (dark)", next.brandDark],
					["Accent color", next.accent],
				] as const) {
					if (!HEX_RE.test(value)) {
						return { ok: false, error: `${field} must be a 6-digit hex value like #0f766e` };
					}
				}

				await ctx.kv.set(KV_KEY, next);
				ctx.log.info("Design settings saved (react)", { preset: next.preset });
				return { ok: true, settings: next };
			},
		},

		"settings/reset": {
			handler: async (ctx: any) => {
				await ctx.kv.delete(KV_KEY);
				return { ok: true, settings: DEFAULTS };
			},
		},

		admin: {
			// Native-format route handlers take a single merged context:
			// RouteContext extends PluginContext (input + kv + log + ...).
			handler: async (ctx: any) => {
				const interaction = ctx.input as {
					type: string;
					page?: string;
					action_id?: string;
					values?: Record<string, unknown>;
				};

				if (interaction.type === "page_load") {
					const saved = await readSettings(ctx);
					return designPageBlocks(saved ?? DEFAULTS, saved !== null);
				}

				if (interaction.type === "form_submit" && interaction.action_id === "save_design") {
					const v = interaction.values ?? {};
					const preset = String(v.preset ?? "custom");
					const palette = PRESETS[preset];

					const next: DesignSettings = {
						preset,
						brandLight: palette ? palette.brandLight : String(v.brandLight ?? "").trim(),
						brandDark: palette ? palette.brandDark : String(v.brandDark ?? "").trim(),
						accent: palette ? palette.accent : String(v.accent ?? "").trim(),
						font: String(v.font || "default"),
						radius: (["sharp", "soft", "round"].includes(String(v.radius)) ? v.radius : "soft") as DesignSettings["radius"],
						displayWeight: String(v.displayWeight) === "700" ? "700" : "600",
						gradients: v.gradients !== false,
						customCss: String(v.customCss ?? ""),
					};

					for (const [field, value] of [
						["Brand color (light)", next.brandLight],
						["Brand color (dark)", next.brandDark],
						["Accent color", next.accent],
					] as const) {
						if (!HEX_RE.test(value)) {
							return {
								...designPageBlocks(next, true),
								toast: { message: `${field} must be a 6-digit hex value like #0f766e`, type: "error" },
							};
						}
					}

					await ctx.kv.set(KV_KEY, next);
					ctx.log.info("Design settings saved", { preset: next.preset });

					return {
						...designPageBlocks(next, true),
						toast: { message: "Design saved — reload the site to see it", type: "success" },
					};
				}

				if (interaction.type === "block_action" && interaction.action_id === "reset_design") {
					await ctx.kv.delete(KV_KEY);
					return {
						...designPageBlocks(DEFAULTS, false),
						toast: { message: "Design reset to theme defaults", type: "success" },
					};
				}

				return { blocks: [] };
			},
		},
	},
};

export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
