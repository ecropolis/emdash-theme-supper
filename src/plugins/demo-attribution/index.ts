/**
 * Demo attribution strip — DEMO DEPLOYMENT ONLY.
 *
 * Injects a small branded strip after the theme footer on every public
 * page via the trusted `page:fragments` hook (body:end placement), the
 * same mechanism the Compass Customizer uses. It is deliberately not
 * part of the theme: astro.config.mjs only registers this plugin when
 * the build runs with DEMO_ATTRIBUTION=1 (see the `deploy:demo`
 * script), so sites scaffolded from this template never include it.
 */

import { definePlugin } from "emdash";
import type { PluginDefinition } from "emdash";

const UTM = "utm_source=supper-demo&utm_medium=site-strip&utm_campaign=emdash-themes";

// Superhero Technologies brand violet (#5933d8, their declared
// theme-color), deepened for the strip ground.
const STRIP_HTML = `
<aside style="background:#170b3d;border-top:2px solid #5933d8;color:#cfc3f5;font-family:'Nunito Sans',-apple-system,sans-serif;font-size:13.5px;line-height:1.5;">
	<div style="max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;justify-content:space-between;">
		<span>
			This is a live demo of
			<a href="https://github.com/ecropolis/emdash-theme-supper" style="color:#fff;font-weight:600;text-decoration:underline;text-underline-offset:2px;">Supper</a>,
			a free theme for EmDash CMS.
		</span>
		<span style="font-weight:600;color:#fff;">
			<a href="https://superherotech.ai/?${UTM}" style="color:#fff;text-decoration:underline;text-underline-offset:2px;">SuperheroTech.ai</a>
			<span style="color:#9d86e8;">design</span>
			<span style="color:#5933d8;padding:0 2px;">+</span>
			<a href="https://ecropolis.com/?${UTM}" style="color:#fff;text-decoration:underline;text-underline-offset:2px;">Ecropolis</a>
			<span style="color:#9d86e8;">build</span>
		</span>
	</div>
</aside>`;

const definition: PluginDefinition = {
	id: "demo-attribution",
	version: "0.1.0",
	capabilities: ["hooks.page-fragments:register"],

	hooks: {
		"page:fragments": async () => [
			{
				kind: "html",
				placement: "body:end",
				html: STRIP_HTML,
				key: "demo-attribution-strip",
			},
		],
	},
};

export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
