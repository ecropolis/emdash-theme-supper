/**
 * Compass Customizer — React admin page (v2).
 *
 * Registered via `adminEntry` on the plugin descriptor; the admin SPA
 * imports this module and renders `pages["/design"]` inside the shell.
 *
 * Deliberately dependency-free beyond React: plugin API calls go through
 * plain fetch with the `X-EmDash-Request: 1` CSRF header, so this entry
 * never breaks on admin-package internals.
 *
 * The live preview works because the admin and the public site share an
 * origin: we hold the site in an <iframe> and write the token overrides
 * straight onto its documentElement inline style (which outranks every
 * stylesheet). Nothing is persisted until Save posts to the plugin KV —
 * at which point the page:fragments hook takes over for real visitors.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Radius = "sharp" | "soft" | "round";

interface DesignSettings {
	preset: string;
	brandLight: string;
	brandDark: string;
	accent: string;
	font: string;
	radius: Radius;
	displayWeight: "600" | "700";
	gradients: boolean;
	customCss: string;
}

interface SettingsPayload {
	settings: DesignSettings;
	saved: boolean;
	presets: Record<string, { label: string; brandLight: string; brandDark: string; accent: string }>;
	fonts: Array<{ label: string; value: string }>;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const RADII: Record<Radius, { sm: string; base: string; lg: string }> = {
	sharp: { sm: "3px", base: "5px", lg: "8px" },
	soft: { sm: "6px", base: "10px", lg: "16px" },
	round: { sm: "10px", base: "16px", lg: "24px" },
};

const MANAGED_PROPS = [
	"--color-brand",
	"--color-brand-strong",
	"--color-brand-soft",
	"--color-accent",
	"--color-accent-soft",
	"--radius-sm",
	"--radius",
	"--radius-lg",
	"--font-weight-display",
	"--gradient-brand",
	"--gradient-brand-strong",
	"--gradient-brand-soft",
	"--gradient-headline",
	"--font-body",
	"--font-heading",
];

async function api<T>(path: string, body?: unknown): Promise<T> {
	const res = await fetch(`/_emdash/api/plugins/compass-customizer/${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
		credentials: "include",
		body: JSON.stringify(body ?? {}),
	});
	const json = await res.json();
	if (!res.ok || json?.success === false) {
		throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
	}
	return (json?.data ?? json) as T;
}

/** Paint the current (unsaved) settings into the preview iframe. */
function applyPreview(iframe: HTMLIFrameElement | null, s: DesignSettings, mode: "light" | "dark") {
	const doc = iframe?.contentDocument;
	if (!doc?.documentElement) return;
	const root = doc.documentElement;

	for (const prop of MANAGED_PROPS) root.style.removeProperty(prop);

	root.style.setProperty("--color-brand", `light-dark(${s.brandLight}, ${s.brandDark})`);
	root.style.setProperty("--color-brand-strong", "color-mix(in srgb, var(--color-brand) 85%, black)");
	root.style.setProperty("--color-brand-soft", "color-mix(in srgb, var(--color-brand) 65%, white)");
	root.style.setProperty("--color-accent", s.accent);
	root.style.setProperty("--color-accent-soft", `color-mix(in srgb, ${s.accent} 60%, white)`);

	if (s.radius !== "soft") {
		const r = RADII[s.radius];
		root.style.setProperty("--radius-sm", r.sm);
		root.style.setProperty("--radius", r.base);
		root.style.setProperty("--radius-lg", r.lg);
	}

	if (s.displayWeight !== "600") {
		root.style.setProperty("--font-weight-display", s.displayWeight);
	}

	if (!s.gradients) {
		root.style.setProperty("--gradient-brand", "var(--color-brand)");
		root.style.setProperty("--gradient-brand-strong", "var(--color-brand-strong)");
		root.style.setProperty("--gradient-brand-soft", "var(--color-brand-soft)");
		root.style.setProperty("--gradient-headline", "var(--color-text)");
	}

	// Typeface: load the webfont into the frame, then point the tokens at it
	const fontLinkId = "cc-preview-font";
	const existingLink = doc.getElementById(fontLinkId);
	if (s.font && s.font !== "default") {
		const href = `https://fonts.googleapis.com/css2?family=${s.font.replaceAll(" ", "+")}:wght@400;500;600;700;800&display=swap`;
		if (existingLink instanceof HTMLLinkElement) {
			if (existingLink.href !== href) existingLink.href = href;
		} else {
			const link = doc.createElement("link");
			link.id = fontLinkId;
			link.rel = "stylesheet";
			link.href = href;
			doc.head.appendChild(link);
		}
		root.style.setProperty("--font-body", `"${s.font}", sans-serif`);
		root.style.setProperty("--font-heading", `"${s.font}", sans-serif`);
	} else if (existingLink) {
		existingLink.remove();
	}

	// Custom CSS
	const cssId = "cc-preview-css";
	let styleEl = doc.getElementById(cssId);
	if (s.customCss) {
		if (!styleEl) {
			styleEl = doc.createElement("style");
			styleEl.id = cssId;
			doc.head.appendChild(styleEl);
		}
		styleEl.textContent = s.customCss;
	} else if (styleEl) {
		styleEl.remove();
	}

	// Light/dark preview toggle: mirrors the theme's cookie mechanism
	root.classList.remove("light", "dark");
	root.classList.add(mode);
}

function ColorField(props: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	const valid = HEX_RE.test(props.value);
	return (
		<label className="cc-field">
			<span className="cc-label">{props.label}</span>
			<span className="cc-colorrow">
				<input
					type="color"
					value={valid ? props.value : "#888888"}
					onChange={(e) => props.onChange(e.target.value)}
					aria-label={`${props.label} picker`}
				/>
				<input
					type="text"
					className={valid ? "cc-hex" : "cc-hex cc-invalid"}
					value={props.value}
					spellCheck={false}
					onChange={(e) => props.onChange(e.target.value)}
				/>
			</span>
		</label>
	);
}

function Segmented<T extends string>(props: {
	label: string;
	value: T;
	options: Array<{ label: string; value: T }>;
	onChange: (v: T) => void;
}) {
	return (
		<div className="cc-field">
			<span className="cc-label">{props.label}</span>
			<div className="cc-seg" role="group" aria-label={props.label}>
				{props.options.map((o) => (
					<button
						key={o.value}
						type="button"
						className={o.value === props.value ? "cc-segbtn cc-on" : "cc-segbtn"}
						onClick={() => props.onChange(o.value)}
					>
						{o.label}
					</button>
				))}
			</div>
		</div>
	);
}

function DesignPage() {
	const [data, setData] = useState<SettingsPayload | null>(null);
	const [s, setS] = useState<DesignSettings | null>(null);
	const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<"light" | "dark">("light");
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		api<SettingsPayload>("settings")
			.then((d) => {
				setData(d);
				setS(d.settings);
			})
			.catch((e) => setStatus({ kind: "err", text: String(e.message ?? e) }));
	}, []);

	// Repaint the preview whenever settings or mode change (and on frame load)
	useEffect(() => {
		if (s) applyPreview(iframeRef.current, s, mode);
	}, [s, mode]);

	const onFrameLoad = useCallback(() => {
		if (s) applyPreview(iframeRef.current, s, mode);
	}, [s, mode]);

	if (!s || !data) {
		return <div className="cc-wrap"><p>{status?.text ?? "Loading design settings…"}</p></div>;
	}

	const set = (patch: Partial<DesignSettings>) => {
		setStatus(null);
		setS({ ...s, ...patch });
	};
	const setColor = (patch: Partial<DesignSettings>) => set({ ...patch, preset: "custom" });

	const save = async () => {
		setSaving(true);
		setStatus(null);
		try {
			const r = await api<{ ok: boolean; error?: string; settings?: DesignSettings }>("settings/save", s);
			if (!r.ok) {
				setStatus({ kind: "err", text: r.error ?? "Could not save" });
			} else {
				setS(r.settings!);
				setStatus({ kind: "ok", text: "Saved — live for visitors on their next page load" });
			}
		} catch (e: any) {
			setStatus({ kind: "err", text: String(e.message ?? e) });
		} finally {
			setSaving(false);
		}
	};

	const reset = async () => {
		setSaving(true);
		setStatus(null);
		try {
			const r = await api<{ ok: boolean; settings: DesignSettings }>("settings/reset");
			setS(r.settings);
			iframeRef.current?.contentWindow?.location.reload();
			setStatus({ kind: "ok", text: "Reset to theme defaults" });
		} catch (e: any) {
			setStatus({ kind: "err", text: String(e.message ?? e) });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="cc-wrap">
			<style>{CSS_TEXT}</style>

			<div className="cc-head">
				<div>
					<h1 className="cc-title">Design</h1>
					<p className="cc-sub">Changes preview instantly on the right. Nothing reaches visitors until you save.</p>
				</div>
				<div className="cc-headactions">
					{status && <span className={status.kind === "ok" ? "cc-status cc-status-ok" : "cc-status cc-status-err"}>{status.text}</span>}
					<button type="button" className="cc-btn" onClick={reset} disabled={saving}>Reset</button>
					<button type="button" className="cc-btn cc-primary" onClick={save} disabled={saving}>
						{saving ? "Saving…" : "Save design"}
					</button>
				</div>
			</div>

			<div className="cc-cols">
				<div className="cc-controls">
					<div className="cc-field">
						<span className="cc-label">Palette</span>
						<div className="cc-swatches">
							{Object.entries(data.presets).map(([key, p]) => (
								<button
									key={key}
									type="button"
									title={p.label}
									className={s.preset === key ? "cc-swatch cc-on" : "cc-swatch"}
									onClick={() => set({ preset: key, brandLight: p.brandLight, brandDark: p.brandDark, accent: p.accent })}
								>
									<span className="cc-dots">
										<i style={{ background: p.brandLight }} />
										<i style={{ background: p.brandDark }} />
										<i style={{ background: p.accent }} />
									</span>
									<span className="cc-swatchlabel">{p.label.replace(" (theme default)", "")}</span>
								</button>
							))}
						</div>
					</div>

					<ColorField label="Brand — light mode" value={s.brandLight} onChange={(v) => setColor({ brandLight: v })} />
					<ColorField label="Brand — dark mode" value={s.brandDark} onChange={(v) => setColor({ brandDark: v })} />
					<ColorField label="Accent" value={s.accent} onChange={(v) => setColor({ accent: v })} />

					<label className="cc-field">
						<span className="cc-label">Typeface</span>
						<select className="cc-select" value={s.font} onChange={(e) => set({ font: e.target.value })}>
							{data.fonts.map((f) => (
								<option key={f.value} value={f.value}>{f.label}</option>
							))}
						</select>
					</label>

					<Segmented
						label="Corner roundness"
						value={s.radius}
						options={[
							{ label: "Sharp", value: "sharp" as Radius },
							{ label: "Soft", value: "soft" as Radius },
							{ label: "Round", value: "round" as Radius },
						]}
						onChange={(v) => set({ radius: v })}
					/>

					<Segmented
						label="Headline weight"
						value={s.displayWeight}
						options={[
							{ label: "Medium", value: "600" as const },
							{ label: "Bold", value: "700" as const },
						]}
						onChange={(v) => set({ displayWeight: v })}
					/>

					<label className="cc-field cc-inline">
						<input
							type="checkbox"
							checked={s.gradients}
							onChange={(e) => set({ gradients: e.target.checked })}
						/>
						<span className="cc-label" style={{ margin: 0 }}>Brand gradients (off = flat colors)</span>
					</label>

					<label className="cc-field">
						<span className="cc-label">Custom CSS (advanced)</span>
						<textarea
							className="cc-css"
							rows={5}
							spellCheck={false}
							placeholder={":root { --wide-width: 1320px; }"}
							value={s.customCss}
							onChange={(e) => set({ customCss: e.target.value })}
						/>
					</label>
				</div>

				<div className="cc-preview">
					<div className="cc-previewbar">
						<span className="cc-label" style={{ margin: 0 }}>Live preview</span>
						<div className="cc-seg">
							<button type="button" className={mode === "light" ? "cc-segbtn cc-on" : "cc-segbtn"} onClick={() => setMode("light")}>Light</button>
							<button type="button" className={mode === "dark" ? "cc-segbtn cc-on" : "cc-segbtn"} onClick={() => setMode("dark")}>Dark</button>
						</div>
						<button
							type="button"
							className="cc-btn cc-small"
							onClick={() => iframeRef.current?.contentWindow?.location.reload()}
						>
							Reload
						</button>
					</div>
					<iframe ref={iframeRef} src="/" title="Site preview" className="cc-frame" onLoad={onFrameLoad} />
				</div>
			</div>
		</div>
	);
}

const CSS_TEXT = `
.cc-wrap { padding: 4px 8px 24px; max-width: 1400px; }
.cc-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.cc-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.cc-sub { margin: 0; opacity: .65; font-size: 13px; }
.cc-headactions { display: flex; align-items: center; gap: 10px; }
.cc-status { font-size: 12.5px; max-width: 320px; }
.cc-status-ok { color: #22c55e; }
.cc-status-err { color: #f87171; }
.cc-btn { font: inherit; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 7px; border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit; cursor: pointer; }
.cc-btn:hover { border-color: rgba(128,128,128,.7); }
.cc-btn:disabled { opacity: .5; cursor: default; }
.cc-btn.cc-primary { background: #0f766e; border-color: #0f766e; color: #fff; }
.cc-btn.cc-primary:hover { background: #0d635c; }
.cc-btn.cc-small { padding: 4px 10px; font-size: 12px; }
.cc-cols { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
@media (max-width: 980px) { .cc-cols { grid-template-columns: 1fr; } }
.cc-controls { display: flex; flex-direction: column; gap: 16px; }
.cc-field { display: flex; flex-direction: column; gap: 6px; }
.cc-field.cc-inline { flex-direction: row; align-items: center; gap: 10px; }
.cc-label { font-size: 11.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.cc-colorrow { display: flex; gap: 8px; align-items: center; }
.cc-colorrow input[type="color"] { width: 38px; height: 32px; padding: 2px; border: 1px solid rgba(128,128,128,.4); border-radius: 7px; background: transparent; cursor: pointer; }
.cc-hex { font-family: ui-monospace, monospace; font-size: 13px; padding: 6px 10px; border-radius: 7px; border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit; width: 110px; }
.cc-hex.cc-invalid { border-color: #f87171; }
.cc-select, .cc-css { font: inherit; font-size: 13.5px; padding: 7px 10px; border-radius: 7px; border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit; }
.cc-css { font-family: ui-monospace, monospace; font-size: 12.5px; resize: vertical; }
.cc-seg { display: inline-flex; border: 1px solid rgba(128,128,128,.4); border-radius: 7px; overflow: hidden; width: fit-content; }
.cc-segbtn { font: inherit; font-size: 12.5px; font-weight: 600; padding: 6px 12px; border: none; background: transparent; color: inherit; cursor: pointer; opacity: .7; }
.cc-segbtn + .cc-segbtn { border-left: 1px solid rgba(128,128,128,.3); }
.cc-segbtn.cc-on { background: rgba(15,118,110,.18); color: #14b8a6; opacity: 1; }
.cc-swatches { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cc-swatch { display: flex; align-items: center; gap: 8px; font: inherit; font-size: 12px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(128,128,128,.35); background: transparent; color: inherit; cursor: pointer; text-align: left; }
.cc-swatch.cc-on { border-color: #14b8a6; box-shadow: 0 0 0 1px #14b8a6; }
.cc-dots { display: inline-flex; gap: 3px; flex-shrink: 0; }
.cc-dots i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,.15); }
.cc-swatchlabel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-preview { border: 1px solid rgba(128,128,128,.35); border-radius: 10px; overflow: hidden; }
.cc-previewbar { display: flex; align-items: center; gap: 12px; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(128,128,128,.35); }
.cc-frame { display: block; width: 100%; height: min(72vh, 900px); border: none; background: #fff; }
`;

export const pages = {
	"/design": DesignPage,
};

export const widgets = {};
