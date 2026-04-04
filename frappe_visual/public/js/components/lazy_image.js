/**
 * LazyImage — Progressive / lazy-loaded image with placeholder
 *
 * frappe.visual.LazyImage.create({ src: '/img.jpg', alt: 'Photo', placeholder: 'blur', width: 300 })
 */

export class LazyImage {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			src: "",
			alt: "",
			placeholder: "shimmer",  // shimmer | blur | color | none
			placeholderSrc: "",      // low-res src for blur
			placeholderColor: "#e5e7eb",
			width: null,
			height: null,
			borderRadius: "8px",
			objectFit: "cover",
			rootMargin: "200px",
			threshold: 0.01,
			onLoad: null,
			onError: null,
			theme: "glass",
			dark: document.documentElement.classList.contains("dark"),
		}, opts);

		this._esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
		this.id = "fv-lazy-img-" + Math.random().toString(36).slice(2, 9);
		this._loaded = false;
		this._build();
	}

	/* ── build ─────────────────────────────────────────────── */
	_build() {
		const wrap = document.createElement("div");
		wrap.id = this.id;
		wrap.className = `fv-lazy-image fv-lazy-image--${this.placeholder}`;
		Object.assign(wrap.style, {
			position: "relative",
			overflow: "hidden",
			borderRadius: this.borderRadius,
			width: this.width ? `${this.width}px` : "100%",
			height: this.height ? `${this.height}px` : "auto",
			background: this.placeholderColor,
		});

		// Placeholder layer
		if (this.placeholder === "shimmer") {
			const shim = document.createElement("div");
			shim.className = "fv-lazy-image__shimmer";
			shim.style.cssText = "position:absolute;inset:0;background:linear-gradient(-45deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%);background-size:200% 100%;animation:fvShimmer 1.4s infinite linear;";
			wrap.appendChild(shim);
		} else if (this.placeholder === "blur" && this.placeholderSrc) {
			const low = document.createElement("img");
			low.src = this.placeholderSrc;
			low.alt = "";
			low.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${this.objectFit};filter:blur(20px);transform:scale(1.1);`;
			wrap.appendChild(low);
			this._lowImg = low;
		}

		// Actual image (hidden until loaded)
		const img = document.createElement("img");
		img.alt = this.alt;
		img.style.cssText = `width:100%;height:100%;object-fit:${this.objectFit};opacity:0;transition:opacity 0.4s ease;`;
		img.addEventListener("load", () => this._onLoaded());
		img.addEventListener("error", () => this._onErr());
		wrap.appendChild(img);

		this._img = img;
		this.el = wrap;

		if (this.target) {
			const t = typeof this.target === "string" ? document.querySelector(this.target) : this.target;
			if (t) t.appendChild(wrap);
		}

		this._observe();
	}

	/* ── intersection observer ─────────────────────────────── */
	_observe() {
		if (!("IntersectionObserver" in window)) { this._loadSrc(); return; }
		this._io = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) { this._loadSrc(); this._io.disconnect(); }
		}, { rootMargin: this.rootMargin, threshold: this.threshold });
		this._io.observe(this.el);
	}

	_loadSrc() { if (this.src) this._img.src = this.src; }

	_onLoaded() {
		this._loaded = true;
		this._img.style.opacity = "1";
		if (this._lowImg) this._lowImg.style.opacity = "0";
		const shim = this.el.querySelector(".fv-lazy-image__shimmer");
		if (shim) shim.style.display = "none";
		if (typeof this.onLoad === "function") this.onLoad(this);
	}

	_onErr() {
		this.el.classList.add("fv-lazy-image--error");
		if (typeof this.onError === "function") this.onError(this);
	}

	/* ── API ───────────────────────────────────────────────── */
	setSrc(src) { this.src = src; this._img.src = src; }
	isLoaded() { return this._loaded; }

	destroy() {
		if (this._io) this._io.disconnect();
		if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
		this.el = null;
	}

	static create(opts) { return new LazyImage(opts); }
}
