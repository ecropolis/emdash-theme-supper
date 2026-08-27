/**
 * Restaurant blocks plugin (inline, theme-local).
 *
 * The block types a restaurant assembles its pages from: hero, menu
 * (pulls from the menu_items collection), hours & contact, gallery,
 * reviews, FAQ, and a reservation CTA banner. Editors insert them in
 * the admin's Portable Text editor; they render via
 * src/components/blocks/* (dispatched from RestaurantBlocks.astro).
 *
 * Same Block Kit constraints as every EmDash plugin block: no nested
 * object element (CTA label/url pairs are flattened to sibling fields),
 * repeater sub-fields are scalar only, and image inputs in the block
 * modal are URL strings.
 *
 * The menu block carries no dishes itself — it's a placement marker
 * with display options; the renderer queries the `menu_items`
 * collection (optionally one `menu_section` taxonomy term), so editors
 * manage dishes as real content entries.
 */

import { definePlugin } from "emdash";
import type { PluginDefinition } from "emdash";

const definition: PluginDefinition = {
	id: "restaurant-blocks",
	version: "0.1.0",

	admin: {
		portableTextBlocks: [
			{
				type: "resto.hero",
				label: "Hero",
				category: "Sections",
				description: "Big welcome section with a reservation CTA",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "text_input",
						action_id: "subheadline",
						label: "Subheadline",
						multiline: true,
					},
					{ type: "text_input", action_id: "badge", label: "Badge (small text above headline)" },
					{ type: "text_input", action_id: "primaryCtaLabel", label: "Primary CTA label" },
					{ type: "text_input", action_id: "primaryCtaUrl", label: "Primary CTA URL" },
					{
						type: "text_input",
						action_id: "secondaryCtaLabel",
						label: "Secondary CTA label",
					},
					{ type: "text_input", action_id: "secondaryCtaUrl", label: "Secondary CTA URL" },
					{ type: "text_input", action_id: "imageUrl", label: "Image URL" },
					{ type: "text_input", action_id: "imageAlt", label: "Image alt text" },
					{ type: "toggle", action_id: "centered", label: "Center the layout (no image)" },
				],
			},

			{
				type: "resto.menu",
				label: "Menu",
				category: "Sections",
				description: "Dishes from the Menu Items collection",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "text_input",
						action_id: "subheadline",
						label: "Subheadline",
						multiline: true,
					},
					{
						type: "text_input",
						action_id: "section",
						label: "Menu section slug (leave empty for all)",
						placeholder: "mains",
					},
					{ type: "toggle", action_id: "featuredOnly", label: "Featured dishes only" },
					{
						type: "number_input",
						action_id: "limit",
						label: "Max dishes to show (0 = all)",
					},
					{ type: "toggle", action_id: "showImages", label: "Show dish photos" },
					{ type: "text_input", action_id: "ctaLabel", label: "Link label under the list" },
					{ type: "text_input", action_id: "ctaUrl", label: "Link URL under the list" },
				],
			},

			{
				type: "resto.hours",
				label: "Hours & Contact",
				category: "Sections",
				description: "Opening hours with phone, email, and address",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "repeater",
						action_id: "hours",
						label: "Hours",
						item_label: "Row",
						min_items: 1,
						max_items: 8,
						fields: [
							{ type: "text_input", action_id: "label", label: "Days", placeholder: "Tue – Sat" },
							{ type: "text_input", action_id: "value", label: "Hours", placeholder: "5pm – 11pm" },
						],
					},
					{ type: "text_input", action_id: "phone", label: "Phone" },
					{ type: "text_input", action_id: "email", label: "Email" },
					{ type: "text_input", action_id: "address", label: "Address", multiline: true },
					{ type: "text_input", action_id: "note", label: "Note (e.g. walk-ins policy)", multiline: true },
				],
			},

			{
				type: "resto.gallery",
				label: "Gallery",
				category: "Sections",
				description: "A row of photos",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "repeater",
						action_id: "images",
						label: "Photos",
						item_label: "Photo",
						min_items: 1,
						max_items: 8,
						fields: [
							{ type: "text_input", action_id: "url", label: "Image URL" },
							{ type: "text_input", action_id: "alt", label: "Alt text" },
						],
					},
				],
			},

			{
				type: "resto.reviews",
				label: "Reviews",
				category: "Sections",
				description: "Guest review cards",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "repeater",
						action_id: "reviews",
						label: "Reviews",
						item_label: "Review",
						min_items: 1,
						fields: [
							{ type: "text_input", action_id: "quote", label: "Quote", multiline: true },
							{ type: "text_input", action_id: "author", label: "Guest name" },
							{
								type: "text_input",
								action_id: "detail",
								label: "Detail (e.g. source or occasion)",
							},
						],
					},
				],
			},

			{
				type: "resto.faq",
				label: "FAQ",
				category: "Sections",
				description: "Frequently asked questions",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "repeater",
						action_id: "items",
						label: "Questions",
						item_label: "Question",
						min_items: 1,
						fields: [
							{ type: "text_input", action_id: "question", label: "Question" },
							{
								type: "text_input",
								action_id: "answer",
								label: "Answer",
								multiline: true,
							},
						],
					},
				],
			},

			{
				type: "resto.cta",
				label: "Reservation CTA",
				category: "Sections",
				description: "Full-width banner with a reserve button",
				fields: [
					{ type: "text_input", action_id: "headline", label: "Headline" },
					{
						type: "text_input",
						action_id: "subheadline",
						label: "Subheadline",
						multiline: true,
					},
					{ type: "text_input", action_id: "ctaLabel", label: "Button label" },
					{ type: "text_input", action_id: "ctaUrl", label: "Button URL" },
				],
			},
		],
	},
};

export function createPlugin() {
	return definePlugin(definition);
}

export default createPlugin;
