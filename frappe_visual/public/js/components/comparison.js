// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Comparison — Before / after image comparison slider
 * =====================================================
 * Draggable divider to compare two overlaid images.
 *
 * frappe.visual.Comparison.create({
 *   target: "#compare",
 *   before: { src: "/img/before.jpg", label: "Before" },
 *   after:  { src: "/img/after.jpg",  label: "After" },
 *   initialPosition: 50,  // percentage
 *   direction: "horizontal", // horizontal | vertical
 *   height: "400px",
 *   rounded: true,
 *   onChange: (pos) => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class Comparison {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			before: { src: "", label: "Before" },
			after: { src: "", label: "After" },
			initialPosition: 50,
			direction: "horizontal",
			height: "400px",
			rounded: true,
			onChange: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new Comparison(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const isH = this.direction === "horizontal";
		const pos = this.initialPosition;

		const wrap = document.createElement("div");
		wrap.className = `fv-cmp ${this.rounded ? "fv-cmp-rounded" : ""}`;
		wrap.style.cssText = `position:relative;overflow:hidden;height:${this.height};user-select:none;cursor:col-resize;`;

		/* After (bottom layer) */
		wrap.innerHTML = `
			<img class="fv-cmp-after" src="${_esc(this.after.src)}" alt="${_esc(this.after.label)}" style="width:100%;height:100%;object-fit:cover;display:block;" />
			<div class="fv-cmp-before-wrap" style="position:absolute;inset:0;overflow:hidden;${isH ? `width:${pos}%` : `height:${pos}%`}">
				<img class="fv-cmp-before" src="${_esc(this.before.src)}" alt="${_esc(this.before.label)}" style="width:100%;height:100%;object-fit:cover;display:block;${isH ? `min-width:${wrap.offsetWidth || 400}px` : ""}" />
			</div>
			<div class="fv-cmp-handle" style="position:absolute;${isH ? `left:${pos}%;top:0;bottom:0;width:4px;margin-left:-2px` : `top:${pos}%;left:0;right:0;height:4px;margin-top:-2px`};background:#fff;box-shadow:0 0 8px rgba(0,0,0,0.3);z-index:2;">
				<div class="fv-cmp-grip" style="position:absolute;${isH ? "top:50%;left:50%;transform:translate(-50%,-50%)" : "left:50%;top:50%;transform:translate(-50%,-50%)"};width:28px;height:28px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b;">
					${isH ? "⇔" : "⇕"}
				</div>
			</div>
			${this.before.label ? `<span class="fv-cmp-label fv-cmp-label-before" style="position:absolute;${isH ? "left:12px" : "top:12px;left:12px"};bottom:12px;padding:4px 10px;background:rgba(0,0,0,0.6);color:#fff;border-radius:4px;font-size:0.75rem;font-weight:600;z-index:3">${_esc(this.before.label)}</span>` : ""}
			${this.after.label ? `<span class="fv-cmp-label fv-cmp-label-after" style="position:absolute;${isH ? "right:12px" : "bottom:12px;right:12px"};bottom:12px;padding:4px 10px;background:rgba(0,0,0,0.6);color:#fff;border-radius:4px;font-size:0.75rem;font-weight:600;z-index:3">${_esc(this.after.label)}</span>` : ""}
		`;

		el.innerHTML = "";
		el.appendChild(wrap);

		this._wrap = wrap;
		this._beforeWrap = wrap.querySelector(".fv-cmp-before-wrap");
		this._handle = wrap.querySelector(".fv-cmp-handle");

		/* Drag handling */
		const move = (clientX, clientY) => {
			const rect = wrap.getBoundingClientRect();
			let pct;
			if (isH) {
				pct = ((clientX - rect.left) / rect.width) * 100;
			} else {
				pct = ((clientY - rect.top) / rect.height) * 100;
			}
			pct = Math.max(0, Math.min(100, pct));

			if (isH) {
				this._beforeWrap.style.width = `${pct}%`;
				this._handle.style.left = `${pct}%`;
			} else {
				this._beforeWrap.style.height = `${pct}%`;
				this._handle.style.top = `${pct}%`;
			}
			this.onChange?.(pct);
		};

		let dragging = false;
		wrap.addEventListener("mousedown", () => { dragging = true; });
		window.addEventListener("mousemove", (e) => { if (dragging) move(e.clientX, e.clientY); });
		window.addEventListener("mouseup", () => { dragging = false; });

		wrap.addEventListener("touchstart", () => { dragging = true; }, { passive: true });
		wrap.addEventListener("touchmove", (e) => { if (dragging) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
		wrap.addEventListener("touchend", () => { dragging = false; });
	}
}
