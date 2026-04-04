/**
 * Placeholder — Structured placeholder / empty-state block
 *
 * frappe.visual.Placeholder.create({
 *   icon: 'inbox',
 *   title: 'No records',
 *   description: 'Create your first item to get started.',
 *   action: { label: 'Create', onClick: () => {} }
 * })
 */

export class Placeholder {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			icon: "inbox",
			iconSize: 48,
			title: "",
			description: "",
			action: null,        // { label, onClick, variant? }
			image: null,         // custom image URL instead of icon
			lottie: null,        // lottie JSON URL
			variant: "centered", // centered | inline | card
			theme: "glass",
			dark: document.documentElement.classList.contains("dark"),
		}, opts);

		this._esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
		this.id = "fv-placeholder-" + Math.random().toString(36).slice(2, 9);
		this._build();
	}

	/* ── build ─────────────────────────────────────────────── */
	_build() {
		const el = document.createElement("div");
		el.id = this.id;
		el.className = `fv-placeholder fv-placeholder--${this.variant} fv-placeholder--${this.dark ? "dark" : "light"}`;

		let html = `<div class="fv-placeholder__inner">`;

		// Visual
		if (this.image) {
			html += `<img class="fv-placeholder__image" src="${this._esc(this.image)}" alt="" style="max-width:${this.iconSize * 2}px;">`;
		} else if (this.lottie) {
			html += `<div class="fv-placeholder__lottie" data-src="${this._esc(this.lottie)}" style="width:${this.iconSize * 2}px;height:${this.iconSize * 2}px;"></div>`;
		} else if (this.icon) {
			const svg = typeof frappe !== "undefined" && frappe.visual?.icons?.render
				? frappe.visual.icons.render(this.icon, { size: this.iconSize })
				: `<span style="font-size:${this.iconSize}px;opacity:0.3;">📄</span>`;
			html += `<div class="fv-placeholder__icon">${svg}</div>`;
		}

		if (this.title) html += `<h4 class="fv-placeholder__title">${this._esc(this.title)}</h4>`;
		if (this.description) html += `<p class="fv-placeholder__desc">${this._esc(this.description)}</p>`;

		if (this.action) {
			html += `<button class="fv-placeholder__action btn btn-${this.action.variant || "primary"} btn-sm">${this._esc(this.action.label || "Action")}</button>`;
		}

		html += `</div>`;
		el.innerHTML = html;

		if (this.action?.onClick) {
			el.querySelector(".fv-placeholder__action")?.addEventListener("click", this.action.onClick);
		}

		// Lottie auto-init
		if (this.lottie && typeof lottie !== "undefined") {
			const container = el.querySelector(".fv-placeholder__lottie");
			if (container) {
				lottie.loadAnimation({ container, path: this.lottie, renderer: "svg", loop: true, autoplay: true });
			}
		}

		this.el = el;
		if (this.target) {
			const t = typeof this.target === "string" ? document.querySelector(this.target) : this.target;
			if (t) t.appendChild(el);
		}
	}

	/* ── API ───────────────────────────────────────────────── */
	setTitle(t) { const h = this.el?.querySelector(".fv-placeholder__title"); if (h) h.textContent = t; }
	setDescription(d) { const p = this.el?.querySelector(".fv-placeholder__desc"); if (p) p.textContent = d; }
	show() { if (this.el) this.el.style.display = ""; }
	hide() { if (this.el) this.el.style.display = "none"; }

	destroy() {
		if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
		this.el = null;
	}

	static create(opts) { return new Placeholder(opts); }
}
