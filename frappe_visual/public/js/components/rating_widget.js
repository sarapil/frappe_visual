// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — RatingWidget
 * ===============================
 * Star / heart / emoji / custom-icon rating with half-value support,
 * hover preview, labels, animated transitions, and read-only mode.
 *
 * Usage:
 *   frappe.visual.RatingWidget.create('#el', {
 *     value: 3.5,
 *     max: 5,
 *     icon: 'star',          // star | heart | circle | emoji
 *     allowHalf: true,
 *     onChange: v => console.log(v)
 *   })
 *
 * @module frappe_visual/components/rating_widget
 */

const ICONS = {
	star: { empty: "☆", filled: "★" },
	heart: { empty: "♡", filled: "♥" },
	circle: { empty: "○", filled: "●" },
};

const EMOJI_SET = ["😡", "😟", "😐", "😊", "🤩"];

export class RatingWidget {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("RatingWidget: container not found");

		this.opts = Object.assign({
			theme: "glass",
			value: 0,
			max: 5,
			icon: "star",           // star | heart | circle | emoji | custom string
			allowHalf: false,
			allowClear: true,       // click same value to clear
			readOnly: false,
			disabled: false,
			size: "md",             // sm | md | lg | xl
			color: "#f59e0b",
			emptyColor: "#cbd5e1",
			showLabel: true,
			showCount: false,
			count: 0,
			labels: null,           // array of labels per value: ['Terrible','Bad','OK','Good','Excellent']
			animate: true,
			onChange: null,
		}, opts);

		this._value = this.opts.value;
		this._hoverValue = -1;
		this._init();
	}

	static create(container, opts = {}) { return new RatingWidget(container, opts); }

	_init() {
		this.container.classList.add("fv-rw", `fv-rw--${this.opts.theme}`, `fv-rw--${this.opts.size}`);
		if (this.opts.readOnly) this.container.classList.add("fv-rw--readonly");
		if (this.opts.disabled) this.container.classList.add("fv-rw--disabled");
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		const wrap = document.createElement("div");
		wrap.className = "fv-rw-items";
		this.container.appendChild(wrap);

		const isEmoji = this.opts.icon === "emoji";

		for (let i = 1; i <= this.opts.max; i++) {
			if (isEmoji) {
				wrap.appendChild(this._renderEmoji(i));
			} else {
				wrap.appendChild(this._renderIcon(i));
			}
		}

		// Label / value display
		if (this.opts.showLabel || this.opts.showCount) {
			const info = document.createElement("div");
			info.className = "fv-rw-info";
			this.container.appendChild(info);
			this._infoEl = info;
			this._updateInfo();
		}
	}

	_renderIcon(index) {
		const iconSet = ICONS[this.opts.icon] || { empty: this.opts.icon, filled: this.opts.icon };
		const item = document.createElement("span");
		item.className = "fv-rw-item";
		item.dataset.index = index;

		if (this.opts.allowHalf) {
			// Two halves
			const leftHalf = document.createElement("span");
			leftHalf.className = "fv-rw-half fv-rw-half--left";
			leftHalf.dataset.value = index - 0.5;
			leftHalf.textContent = iconSet.filled;

			const rightHalf = document.createElement("span");
			rightHalf.className = "fv-rw-half fv-rw-half--right";
			rightHalf.dataset.value = index;
			rightHalf.textContent = iconSet.filled;

			item.appendChild(leftHalf);
			item.appendChild(rightHalf);

			// Background (empty)
			const bg = document.createElement("span");
			bg.className = "fv-rw-bg";
			bg.textContent = iconSet.empty;
			bg.style.color = this.opts.emptyColor;
			item.appendChild(bg);

			this._updateIconState(item, index, leftHalf, rightHalf);

			if (!this.opts.readOnly && !this.opts.disabled) {
				leftHalf.addEventListener("mouseenter", () => this._setHover(index - 0.5));
				rightHalf.addEventListener("mouseenter", () => this._setHover(index));
				leftHalf.addEventListener("click", () => this._select(index - 0.5));
				rightHalf.addEventListener("click", () => this._select(index));
				item.addEventListener("mouseleave", () => this._clearHover());
			}
		} else {
			// Full icon
			item.textContent = iconSet.empty;
			item.style.color = this.opts.emptyColor;
			this._updateFullIcon(item, index, iconSet);

			if (!this.opts.readOnly && !this.opts.disabled) {
				item.addEventListener("mouseenter", () => this._setHover(index));
				item.addEventListener("mouseleave", () => this._clearHover());
				item.addEventListener("click", () => this._select(index));
			}
		}

		return item;
	}

	_renderEmoji(index) {
		const emoji = EMOJI_SET[Math.min(index - 1, EMOJI_SET.length - 1)];
		const item = document.createElement("span");
		item.className = "fv-rw-item fv-rw-emoji";
		item.textContent = emoji;
		item.dataset.index = index;

		const activeVal = this._hoverValue >= 0 ? this._hoverValue : this._value;
		item.classList.toggle("fv-rw-emoji--active", index === Math.ceil(activeVal));
		item.style.opacity = index <= Math.ceil(activeVal) ? "1" : "0.3";
		item.style.transform = index === Math.ceil(activeVal) ? "scale(1.3)" : "scale(1)";

		if (!this.opts.readOnly && !this.opts.disabled) {
			item.addEventListener("mouseenter", () => this._setHover(index));
			item.addEventListener("mouseleave", () => this._clearHover());
			item.addEventListener("click", () => this._select(index));
		}

		return item;
	}

	_updateIconState(item, index, leftHalf, rightHalf) {
		const val = this._hoverValue >= 0 ? this._hoverValue : this._value;
		const color = this.opts.color;

		if (val >= index) {
			leftHalf.style.color = color;
			leftHalf.style.opacity = "1";
			rightHalf.style.color = color;
			rightHalf.style.opacity = "1";
		} else if (val >= index - 0.5) {
			leftHalf.style.color = color;
			leftHalf.style.opacity = "1";
			rightHalf.style.opacity = "0";
		} else {
			leftHalf.style.opacity = "0";
			rightHalf.style.opacity = "0";
		}
	}

	_updateFullIcon(item, index, iconSet) {
		const val = this._hoverValue >= 0 ? this._hoverValue : this._value;
		if (index <= val) {
			item.textContent = iconSet.filled;
			item.style.color = this.opts.color;
		} else {
			item.textContent = iconSet.empty;
			item.style.color = this.opts.emptyColor;
		}
	}

	_setHover(val) {
		this._hoverValue = val;
		this._render();
	}

	_clearHover() {
		this._hoverValue = -1;
		this._render();
	}

	_select(val) {
		if (this.opts.allowClear && this._value === val) {
			this._value = 0;
		} else {
			this._value = val;
		}
		this._hoverValue = -1;
		this._render();
		if (this.opts.onChange) this.opts.onChange(this._value);
	}

	_updateInfo() {
		if (!this._infoEl) return;
		const parts = [];
		if (this.opts.showLabel) {
			if (this.opts.labels && this._value > 0) {
				const idx = Math.ceil(this._value) - 1;
				parts.push(`<span class="fv-rw-label">${this._esc(this.opts.labels[idx] || "")}</span>`);
			} else if (this._value > 0) {
				parts.push(`<span class="fv-rw-label">${this._value}/${this.opts.max}</span>`);
			}
		}
		if (this.opts.showCount && this.opts.count > 0) {
			parts.push(`<span class="fv-rw-count">(${this.opts.count.toLocaleString()})</span>`);
		}
		this._infoEl.innerHTML = parts.join(" ");
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this._value; }
	setValue(v) { this._value = Math.max(0, Math.min(this.opts.max, v)); this._render(); }
	setReadOnly(r) { this.opts.readOnly = r; this._render(); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-rw", `fv-rw--${this.opts.theme}`, `fv-rw--${this.opts.size}`, "fv-rw--readonly", "fv-rw--disabled");
	}
}
