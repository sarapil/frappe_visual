/**
 * AspectRatio — Maintain aspect ratio container
 * ===============================================
 * Responsive container that keeps content at a fixed aspect ratio.
 *
 * frappe.visual.AspectRatio.create({
 *   target: "#video-wrap",
 *   ratio: "16/9",        // "16/9" | "4/3" | "1/1" | "21/9" | "3/4" | custom "W/H"
 *   content: "<iframe …>",
 *   maxWidth: "800px",
 *   bg: "#000",
 *   rounded: true
 * })
 */

export class AspectRatio {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			ratio: "16/9",
			content: "",
			maxWidth: null,
			bg: null,
			rounded: false,
		}, opts);

		this.render();
	}

	static create(opts) { return new AspectRatio(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-ar ${this.rounded ? "fv-ar-rounded" : ""}`;
		if (this.maxWidth) wrap.style.maxWidth = this.maxWidth;

		/* Parse ratio */
		const [w, h] = this.ratio.split("/").map(Number);
		const pct = (h && w) ? ((h / w) * 100).toFixed(4) : 56.25; /* 16:9 default */

		wrap.style.position = "relative";
		wrap.style.width = "100%";
		wrap.style.paddingBottom = `${pct}%`;
		if (this.bg) wrap.style.background = this.bg;

		/* Inner */
		const inner = document.createElement("div");
		inner.className = "fv-ar-inner";
		inner.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";

		if (typeof this.content === "string") {
			inner.innerHTML = this.content;
			/* Make first child fill */
			const first = inner.firstElementChild;
			if (first) {
				first.style.width = "100%";
				first.style.height = "100%";
				first.style.objectFit = "cover";
			}
		} else if (this.content instanceof HTMLElement) {
			this.content.style.width = "100%";
			this.content.style.height = "100%";
			inner.appendChild(this.content);
		}

		wrap.appendChild(inner);
		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;
	}

	setRatio(ratio) {
		this.ratio = ratio;
		const [w, h] = ratio.split("/").map(Number);
		if (w && h) this._wrap.style.paddingBottom = `${((h / w) * 100).toFixed(4)}%`;
	}
}
