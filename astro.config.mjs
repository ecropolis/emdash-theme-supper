import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import icon from "astro-iconset";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import compassForms from "@ecropolis/emdash-plugin-compass-forms";
import compassMail from "@ecropolis/emdash-plugin-compass-mail";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	vite: {
		ssr: {
			optimizeDeps: {
				// Pre-bundle so it isn't discovered mid-render, which would trigger
				// a Vite dep re-optimization and break in-flight worker imports
				// under the Cloudflare dev runner (workerd).
				include: ["astro-iconset/components"],
			},
		},
	},
	integrations: [
		react(),
		icon({
			// Only ship the Phosphor icons actually referenced in templates,
			// not the full @iconify-json/ph set (which adds megabytes to the
			// deployed worker bundle).
			include: {
				ph: [
					"calendar-check",
					"clock",
					"envelope",
					"fork-knife",
					"map-pin",
					"phone",
					"star",
				],
			},
		}),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				compassForms(),
				compassMail(),
				{
					id: "restaurant-blocks",
					version: "0.1.0",
					// Absolute file:// URL so the virtual emdash/plugins module
					// can resolve this at build time (relative paths fail because
					// the virtual module has no on-disk location to anchor them).
					entrypoint: new URL("./src/plugins/restaurant-blocks/index.ts", import.meta.url).href,
				},
				// Demo-deployment-only attribution strip (see the plugin's
				// header comment). Never registered for scaffolded sites —
				// only the `deploy:demo` script sets DEMO_ATTRIBUTION=1.
				...(process.env.DEMO_ATTRIBUTION === "1"
					? [
							{
								id: "demo-attribution",
								version: "0.1.0",
								entrypoint: new URL("./src/plugins/demo-attribution/index.ts", import.meta.url).href,
								capabilities: ["hooks.page-fragments:register"],
							},
						]
					: []),
				{
					id: "compass-customizer",
					version: "0.2.0",
					entrypoint: new URL("./src/plugins/compass-customizer/index.ts", import.meta.url).href,
					// React admin page (color pickers + live preview). Statically
					// imported into the admin bundle via the plugin admin registry.
					adminEntry: new URL("./src/plugins/compass-customizer/admin.tsx", import.meta.url).href,
					// Trusted-only hook: injects the design-token override
					// <style> into public pages.
					capabilities: ["hooks.page-fragments:register"],
					adminPages: [{ path: "/design", label: "Design", icon: "palette" }],
				},
			],
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Fraunces",
			cssVariable: "--font-display-face",
			weights: [500, 600, 700],
			fallbacks: ["Georgia", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Nunito Sans",
			cssVariable: "--font-body",
			weights: [400, 600, 700, 800],
			fallbacks: ["sans-serif"],
		},
	],
	devToolbar: { enabled: false },
});
