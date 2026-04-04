/**
 * Frappe Visual — TabNav
 * ========================
 * Animated tab navigation with sliding indicator, icons, badges,
 * closable tabs, overflow scroll, and keyboard navigation.
 *
 * Usage:
 *   const tabs = TabNav.create(container, {
 *     tabs: [
 *       { id: 'general', label: 'General', icon: 'settings' },
 *       { id: 'users', label: 'Users', icon: 'users', badge: 12 },
 *       { id: 'logs', label: 'Logs', closable: true }
 *     ],
 *     active: 'general',
 *     variant: 'underline',    // 'underline' | 'pills' | 'enclosed' | 'lifted'
 *     size: 'md',              // 'sm' | 'md' | 'lg'
 *     fullWidth: false,
 *     scrollable: true,
 *     onChange: (tabId) => {},
 *     onClose: (tabId) => {},
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

export class TabNav {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				tabs: [],
				active: null,
				variant: "underline",
				size: "md",
				fullWidth: false,
				scrollable: true,
				onChange: null,
				onClose: null,
			},
			opts
		);

		this._active = this.opts.active || (this.opts.tabs[0] && this.opts.tabs[0].id);
		this._init();
	}

	static create(container, opts = {}) {
		return new TabNav(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
		this._bindKeyboard();
		requestAnimationFrame(() => this._updateIndicator());
	}

	_render() {
		const { tabs, variant, size, fullWidth, scrollable } = this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-tn fv-tn-${variant} fv-tn-${size}`;
		if (fullWidth) wrap.classList.add("fv-tn-full");
		if (scrollable) wrap.classList.add("fv-tn-scrollable");
		wrap.setAttribute("role", "tablist");

		// Scroll arrows for overflow
		if (scrollable) {
			const leftArr = document.createElement("button");
			leftArr.className = "fv-tn-scroll fv-tn-scroll-start";
			leftArr.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`;
			leftArr.addEventListener("click", () => this._scroll(-200));
			wrap.appendChild(leftArr);
		}

		const list = document.createElement("div");
		list.className = "fv-tn-list";
		this._listEl = list;

		// Sliding indicator
		if (variant === "underline" || variant === "lifted") {
			const indicator = document.createElement("div");
			indicator.className = "fv-tn-indicator";
			list.appendChild(indicator);
			this._indicator = indicator;
		}

		tabs.forEach((tab) => {
			const btn = document.createElement("button");
			btn.className = "fv-tn-tab";
			btn.setAttribute("role", "tab");
			btn.setAttribute("aria-selected", tab.id === this._active ? "true" : "false");
			btn.setAttribute("data-tab", tab.id);
			if (tab.disabled) btn.disabled = true;
			if (tab.id === this._active) btn.classList.add("fv-tn-active");

			const content = [];

			if (tab.icon) {
				content.push(`<span class="fv-tn-icon">${_esc(tab.icon)}</span>`);
			}
			content.push(`<span class="fv-tn-label">${_esc(tab.label)}</span>`);

			if (tab.badge !== undefined && tab.badge !== null) {
				content.push(`<span class="fv-tn-badge">${_esc(String(tab.badge))}</span>`);
			}

			btn.innerHTML = content.join("");

			if (tab.closable) {
				const closeBtn = document.createElement("span");
				closeBtn.className = "fv-tn-close";
				closeBtn.innerHTML = "×";
				closeBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					this._closeTab(tab.id);
				});
				btn.appendChild(closeBtn);
			}

			btn.addEventListener("click", () => {
				if (!tab.disabled) this.setActive(tab.id);
			});

			list.appendChild(btn);
		});

		if (scrollable) {
			const rightArr = document.createElement("button");
			rightArr.className = "fv-tn-scroll fv-tn-scroll-end";
			rightArr.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
			rightArr.addEventListener("click", () => this._scroll(200));
			wrap.appendChild(rightArr);
		}

		wrap.appendChild(list);

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;
	}

	_updateIndicator() {
		if (!this._indicator || !this._listEl) return;

		const activeBtn = this._listEl.querySelector(".fv-tn-active");
		if (!activeBtn) return;

		const listRect = this._listEl.getBoundingClientRect();
		const btnRect = activeBtn.getBoundingClientRect();

		this._indicator.style.width = `${btnRect.width}px`;
		this._indicator.style.transform = `translateX(${btnRect.left - listRect.left + this._listEl.scrollLeft}px)`;
	}

	_scroll(delta) {
		if (!this._listEl) return;
		this._listEl.scrollBy({ left: delta, behavior: "smooth" });
	}

	_closeTab(tabId) {
		const idx = this.opts.tabs.findIndex((t) => t.id === tabId);
		if (idx === -1) return;

		this.opts.tabs.splice(idx, 1);

		if (this._active === tabId) {
			const newActive = this.opts.tabs[Math.min(idx, this.opts.tabs.length - 1)];
			this._active = newActive ? newActive.id : null;
		}

		this._render();
		requestAnimationFrame(() => this._updateIndicator());

		if (this.opts.onClose) this.opts.onClose(tabId);
		if (this.opts.onChange && this._active) this.opts.onChange(this._active);
	}

	_bindKeyboard() {
		this.container.addEventListener("keydown", (e) => {
			const tabs = this.opts.tabs.filter((t) => !t.disabled);
			const currentIdx = tabs.findIndex((t) => t.id === this._active);

			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				const next = tabs[(currentIdx + 1) % tabs.length];
				if (next) this.setActive(next.id);
			} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				const prev = tabs[(currentIdx - 1 + tabs.length) % tabs.length];
				if (prev) this.setActive(prev.id);
			}
		});
	}

	/* ── Public API ─────────────────────────────────────── */

	setActive(tabId) {
		if (tabId === this._active) return;

		this._active = tabId;

		const allBtns = this._listEl.querySelectorAll(".fv-tn-tab");
		allBtns.forEach((btn) => {
			const isActive = btn.getAttribute("data-tab") === tabId;
			btn.classList.toggle("fv-tn-active", isActive);
			btn.setAttribute("aria-selected", isActive ? "true" : "false");
		});

		requestAnimationFrame(() => this._updateIndicator());

		// Scroll into view
		const activeBtn = this._listEl.querySelector(".fv-tn-active");
		if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", inline: "nearest" });

		if (this.opts.onChange) this.opts.onChange(tabId);
	}

	getActive() {
		return this._active;
	}

	setBadge(tabId, value) {
		const tab = this.opts.tabs.find((t) => t.id === tabId);
		if (tab) {
			tab.badge = value;
			const btn = this._listEl.querySelector(`[data-tab="${tabId}"] .fv-tn-badge`);
			if (btn) btn.textContent = value;
		}
	}

	addTab(tab) {
		this.opts.tabs.push(tab);
		this._render();
		requestAnimationFrame(() => this._updateIndicator());
	}

	removeTab(tabId) {
		this._closeTab(tabId);
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
