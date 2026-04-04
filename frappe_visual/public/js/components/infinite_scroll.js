/**
 * InfiniteScroll — Auto-loading scroll container
 * =================================================
 * Triggers a callback when the user scrolls near the bottom.
 *
 * frappe.visual.InfiniteScroll.create({
 *   target: "#list-container",
 *   loadMore: async (page) => { ... return items; },
 *   threshold: 200,         // px from bottom to trigger
 *   pageSize: 20,
 *   renderItem: (item) => `<div>${item.name}</div>`,
 *   emptyMessage: "No items found",
 *   loadingHtml: null,      // custom loading indicator
 *   className: ""
 * })
 */

export class InfiniteScroll {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			loadMore: null,
			threshold: 200,
			pageSize: 20,
			renderItem: (item) => `<div>${JSON.stringify(item)}</div>`,
			emptyMessage: "No items found",
			loadingHtml: null,
			className: "",
		}, opts);
		this._page = 0;
		this._loading = false;
		this._done = false;
		this.render();
	}

	static create(opts) { return new InfiniteScroll(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-inf ${this.className}`;
		wrap.style.cssText = "overflow-y:auto;max-height:inherit;height:inherit;";

		const content = document.createElement("div");
		content.className = "fv-inf-content";

		const loader = document.createElement("div");
		loader.className = "fv-inf-loader";
		loader.style.cssText = "text-align:center;padding:16px;display:none;";
		loader.innerHTML = this.loadingHtml || `<div class="fv-inf-spinner" style="display:inline-block;width:24px;height:24px;border:2px solid var(--border-color,#e5e7eb);border-top-color:var(--primary,#6366f1);border-radius:50%;animation:fvInfSpin .6s linear infinite;"></div>`;

		const empty = document.createElement("div");
		empty.className = "fv-inf-empty";
		empty.style.cssText = "text-align:center;padding:32px;color:var(--text-muted,#999);display:none;";
		empty.textContent = this.emptyMessage;

		wrap.appendChild(content);
		wrap.appendChild(loader);
		wrap.appendChild(empty);

		el.innerHTML = "";
		el.appendChild(wrap);

		this._wrap = wrap;
		this._content = content;
		this._loader = loader;
		this._empty = empty;

		/* Scroll listener */
		wrap.addEventListener("scroll", () => this._check());

		/* Initial load */
		this._loadNext();
	}

	async _loadNext() {
		if (this._loading || this._done || !this.loadMore) return;
		this._loading = true;
		this._loader.style.display = "";

		try {
			const items = await this.loadMore(this._page);
			if (!items || items.length === 0) {
				this._done = true;
				this._loader.style.display = "none";
				if (this._page === 0) this._empty.style.display = "";
				return;
			}

			items.forEach(item => {
				const html = this.renderItem(item);
				if (typeof html === "string") {
					this._content.insertAdjacentHTML("beforeend", html);
				} else {
					this._content.appendChild(html);
				}
			});

			this._page++;
			if (items.length < this.pageSize) this._done = true;
		} finally {
			this._loading = false;
			this._loader.style.display = "none";
		}
	}

	_check() {
		const { scrollTop, scrollHeight, clientHeight } = this._wrap;
		if (scrollHeight - scrollTop - clientHeight < this.threshold) {
			this._loadNext();
		}
	}

	reset() {
		this._page = 0;
		this._done = false;
		this._content.innerHTML = "";
		this._empty.style.display = "none";
		this._loadNext();
	}
}
