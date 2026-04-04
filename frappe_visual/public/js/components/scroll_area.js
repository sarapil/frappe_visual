// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * ScrollArea — Custom scrollbar component
 * ==========================================
 * Styled scrollbar with auto-hide, thin/wide variants, custom thumb colors.
 *
 * frappe.visual.ScrollArea.create({
 *   target: "#container",
 *   content: "<div>…long content…</div>",
 *   maxHeight: "400px",
 *   maxWidth: null,
 *   scrollbarSize: "thin",   // thin | medium | wide
 *   autoHide: true,          // hide scrollbar when not scrolling
 *   thumbColor: null,        // custom thumb color
 *   direction: "vertical",   // vertical | horizontal | both
 *   onScroll: (scrollTop, scrollLeft) => {}
 * })
 */

export class ScrollArea {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			content: "",
			maxHeight: "400px",
			maxWidth: null,
			scrollbarSize: "thin",
			autoHide: true,
			thumbColor: null,
			direction: "vertical",
			onScroll: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new ScrollArea(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-scroll fv-scroll-${this.scrollbarSize} fv-scroll-${this.direction}`;
		if (this.autoHide) wrap.classList.add("fv-scroll-autohide");

		if (this.maxHeight) wrap.style.maxHeight = this.maxHeight;
		if (this.maxWidth) wrap.style.maxWidth = this.maxWidth;

		const overflowMap = {
			vertical: "overflow-y: auto; overflow-x: hidden",
			horizontal: "overflow-x: auto; overflow-y: hidden",
			both: "overflow: auto",
		};
		wrap.style.cssText += `;${overflowMap[this.direction] || overflowMap.vertical}`;

		if (this.thumbColor) {
			wrap.style.setProperty("--fv-scroll-thumb", this.thumbColor);
		}

		/* Content */
		if (typeof this.content === "string") {
			wrap.innerHTML = this.content;
		} else if (this.content instanceof HTMLElement) {
			wrap.appendChild(this.content);
		}

		/* Scroll event */
		if (this.onScroll) {
			wrap.addEventListener("scroll", () => {
				this.onScroll(wrap.scrollTop, wrap.scrollLeft);
			}, { passive: true });
		}

		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;
	}

	scrollTo(top = 0, left = 0, smooth = true) {
		this._wrap?.scrollTo({ top, left, behavior: smooth ? "smooth" : "auto" });
	}

	scrollToBottom(smooth = true) {
		if (this._wrap) this.scrollTo(this._wrap.scrollHeight, 0, smooth);
	}

	destroy() { this._wrap?.remove(); }
}
