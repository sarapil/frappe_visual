/**
 * RTLAutoMirror — Automatic RTL mirroring for custom UI components
 *
 * Detects RTL context and applies logical property transforms, icon mirroring,
 * and layout adjustments. Provides utilities for RTL-safe positioning.
 *
 * frappe.visual.RTLAutoMirror.create({ watch: true })
 */
export class RTLAutoMirror {
	static create(opts = {}) { return new RTLAutoMirror(opts); }

	constructor(opts) {
		this.opts = Object.assign({ watch: true, mirrorIcons: true, mirrorTransforms: true }, opts);
		this._observers = [];
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Check if current context is RTL */
	get isRTL() {
		return document.documentElement.dir === "rtl" ||
			document.documentElement.getAttribute("lang") === "ar" ||
			getComputedStyle(document.body).direction === "rtl";
	}

	/** Get the correct inline start/end keywords */
	get inlineStart() { return this.isRTL ? "right" : "left"; }
	get inlineEnd() { return this.isRTL ? "left" : "right"; }

	/** Convert physical position to logical */
	logical(leftVal, rightVal) { return this.isRTL ? rightVal : leftVal; }

	/** Mirror a transform value */
	mirrorTransform(transform) {
		if (!this.isRTL || !transform) return transform;
		return transform
			.replace(/translateX\(([^)]+)\)/g, (_, v) => {
				const num = parseFloat(v);
				return `translateX(${-num}${v.replace(String(num), "")})`;
			})
			.replace(/rotate\(([^)]+)\)/g, (_, v) => {
				const num = parseFloat(v);
				return `rotate(${-num}deg)`;
			});
	}

	/** Get correct CSS for a positioned element */
	positionCSS(inlineOffset, blockOffset = 0) {
		const prop = this.isRTL ? "right" : "left";
		return { [prop]: typeof inlineOffset === "number" ? inlineOffset + "px" : inlineOffset,
			top: typeof blockOffset === "number" ? blockOffset + "px" : blockOffset };
	}

	/** Apply logical properties to an element */
	applyLogical(el, { marginStart, marginEnd, paddingStart, paddingEnd, borderStart, borderEnd } = {}) {
		if (!el) return;
		if (marginStart !== undefined) el.style.marginInlineStart = marginStart;
		if (marginEnd !== undefined) el.style.marginInlineEnd = marginEnd;
		if (paddingStart !== undefined) el.style.paddingInlineStart = paddingStart;
		if (paddingEnd !== undefined) el.style.paddingInlineEnd = paddingEnd;
		if (borderStart !== undefined) el.style.borderInlineStart = borderStart;
		if (borderEnd !== undefined) el.style.borderInlineEnd = borderEnd;
	}

	/** Mirror a set of directional icons */
	mirrorIcons(container) {
		if (!this.isRTL) return;
		const sel = typeof container === "string" ? document.querySelector(container) : container;
		if (!sel) return;
		const icons = sel.querySelectorAll("[data-fv-mirror-rtl]");
		icons.forEach(icon => {
			if (icon.dataset.fvMirrored) return;
			icon.style.transform = (icon.style.transform || "") + " scaleX(-1)";
			icon.dataset.fvMirrored = "true";
		});
	}

	/** Process all fv-rtl-auto elements in a container */
	process(container) {
		const root = typeof container === "string" ? document.querySelector(container) : container || document.body;
		if (!root) return;
		// Mirror directional icons
		if (this.opts.mirrorIcons) this.mirrorIcons(root);
		// Swap physical margins/paddings on marked elements
		if (this.isRTL) {
			root.querySelectorAll("[data-fv-rtl-swap]").forEach(el => {
				if (el.dataset.fvRtlSwapped) return;
				const ml = el.style.marginLeft; const mr = el.style.marginRight;
				el.style.marginLeft = mr; el.style.marginRight = ml;
				const pl = el.style.paddingLeft; const pr = el.style.paddingRight;
				el.style.paddingLeft = pr; el.style.paddingRight = pl;
				el.dataset.fvRtlSwapped = "true";
			});
		}
		// Apply text alignment
		root.querySelectorAll("[data-fv-rtl-align]").forEach(el => {
			el.style.textAlign = this.isRTL ? "right" : "left";
		});
	}

	/** Watch for new elements and auto-process them */
	observe(container) {
		const root = typeof container === "string" ? document.querySelector(container) : container || document.body;
		if (!root) return;
		const observer = new MutationObserver(() => this.process(root));
		observer.observe(root, { childList: true, subtree: true });
		this._observers.push(observer);
		this.process(root);
		return observer;
	}

	destroy() {
		this._observers.forEach(o => o.disconnect());
		this._observers = [];
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		if (this.opts.watch) {
			// Watch for dir changes on documentElement
			this._dirObserver = new MutationObserver(() => this.process());
			this._dirObserver.observe(document.documentElement, {
				attributes: true, attributeFilter: ["dir", "lang"]
			});
			this._observers.push(this._dirObserver);
		}
	}
}
