// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Skeleton
 * ==========================
 * Content loading placeholder with animated shimmer effect,
 * pre-built patterns (text, card, table, form), and custom shapes.
 *
 * Usage:
 *   const skel = Skeleton.create(container, {
 *     pattern: 'card',           // 'text' | 'card' | 'table' | 'form' | 'list' | 'profile' | 'custom'
 *     rows: 5,                   // for text/table patterns
 *     columns: 3,                // for table pattern
 *     cards: 3,                  // for card pattern
 *     animated: true,
 *     borderRadius: 8,
 *     theme: 'glass',            // 'glass' | 'flat'
 *     customLayout: [            // for 'custom' pattern
 *       { type: 'circle', size: 48 },
 *       { type: 'rect', width: '60%', height: 16 },
 *       { type: 'rect', width: '100%', height: 12 },
 *     ],
 *   });
 */

export class Skeleton {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				pattern: "text",
				rows: 4,
				columns: 3,
				cards: 3,
				animated: true,
				borderRadius: 8,
				theme: "glass",
				customLayout: [],
			},
			opts
		);

		this._init();
	}

	static create(container, opts = {}) {
		return new Skeleton(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { pattern, animated, theme } = this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-sk fv-sk-${theme}`;
		if (animated) wrap.classList.add("fv-sk-animated");

		switch (pattern) {
			case "text":
				this._renderText(wrap);
				break;
			case "card":
				this._renderCards(wrap);
				break;
			case "table":
				this._renderTable(wrap);
				break;
			case "form":
				this._renderForm(wrap);
				break;
			case "list":
				this._renderList(wrap);
				break;
			case "profile":
				this._renderProfile(wrap);
				break;
			case "custom":
				this._renderCustom(wrap);
				break;
			default:
				this._renderText(wrap);
		}

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;
	}

	_bone(type, width, height, extra = {}) {
		const el = document.createElement("div");
		el.className = `fv-sk-bone fv-sk-${type}`;

		if (width) el.style.width = typeof width === "number" ? width + "px" : width;
		if (height) el.style.height = typeof height === "number" ? height + "px" : height;
		if (extra.borderRadius) el.style.borderRadius = extra.borderRadius + "px";
		if (extra.margin) el.style.margin = extra.margin;

		return el;
	}

	_renderText(wrap) {
		const group = document.createElement("div");
		group.className = "fv-sk-text";

		const widths = ["100%", "92%", "85%", "70%", "45%"];
		for (let i = 0; i < this.opts.rows; i++) {
			group.appendChild(
				this._bone("rect", widths[i % widths.length], 14, {
					borderRadius: 4,
					margin: "0 0 10px 0",
				})
			);
		}
		wrap.appendChild(group);
	}

	_renderCards(wrap) {
		const grid = document.createElement("div");
		grid.className = "fv-sk-cards";
		grid.style.display = "grid";
		grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(250px, 1fr))`;
		grid.style.gap = "16px";

		for (let i = 0; i < this.opts.cards; i++) {
			const card = document.createElement("div");
			card.className = "fv-sk-card";
			card.style.borderRadius = this.opts.borderRadius + "px";

			card.appendChild(this._bone("rect", "100%", 160, { borderRadius: this.opts.borderRadius }));
			card.appendChild(this._bone("rect", "70%", 18, { borderRadius: 4, margin: "14px 14px 0" }));
			card.appendChild(this._bone("rect", "90%", 12, { borderRadius: 4, margin: "8px 14px 0" }));
			card.appendChild(this._bone("rect", "50%", 12, { borderRadius: 4, margin: "6px 14px 14px" }));

			grid.appendChild(card);
		}
		wrap.appendChild(grid);
	}

	_renderTable(wrap) {
		const table = document.createElement("div");
		table.className = "fv-sk-table";

		// Header row
		const header = document.createElement("div");
		header.className = "fv-sk-table-row fv-sk-table-header";
		for (let j = 0; j < this.opts.columns; j++) {
			header.appendChild(
				this._bone("rect", "100%", 16, { borderRadius: 4 })
			);
		}
		table.appendChild(header);

		// Data rows
		for (let i = 0; i < this.opts.rows; i++) {
			const row = document.createElement("div");
			row.className = "fv-sk-table-row";
			const widths = ["80%", "65%", "90%", "55%", "75%"];
			for (let j = 0; j < this.opts.columns; j++) {
				row.appendChild(
					this._bone("rect", widths[(i + j) % widths.length], 14, {
						borderRadius: 4,
					})
				);
			}
			table.appendChild(row);
		}
		wrap.appendChild(table);
	}

	_renderForm(wrap) {
		const form = document.createElement("div");
		form.className = "fv-sk-form";

		for (let i = 0; i < this.opts.rows; i++) {
			const field = document.createElement("div");
			field.className = "fv-sk-form-field";

			field.appendChild(
				this._bone("rect", `${60 + Math.random() * 30}%`, 12, {
					borderRadius: 4,
					margin: "0 0 8px 0",
				})
			);
			field.appendChild(
				this._bone("rect", "100%", 38, {
					borderRadius: this.opts.borderRadius,
				})
			);

			form.appendChild(field);
		}

		// Submit button
		form.appendChild(
			this._bone("rect", 120, 40, {
				borderRadius: this.opts.borderRadius,
				margin: "8px 0 0 0",
			})
		);

		wrap.appendChild(form);
	}

	_renderList(wrap) {
		const list = document.createElement("div");
		list.className = "fv-sk-list";

		for (let i = 0; i < this.opts.rows; i++) {
			const item = document.createElement("div");
			item.className = "fv-sk-list-item";

			item.appendChild(this._bone("circle", 40, 40));

			const text = document.createElement("div");
			text.className = "fv-sk-list-text";
			text.appendChild(
				this._bone("rect", `${50 + Math.random() * 30}%`, 14, { borderRadius: 4 })
			);
			text.appendChild(
				this._bone("rect", `${70 + Math.random() * 20}%`, 10, {
					borderRadius: 4,
					margin: "6px 0 0 0",
				})
			);
			item.appendChild(text);

			list.appendChild(item);
		}
		wrap.appendChild(list);
	}

	_renderProfile(wrap) {
		const profile = document.createElement("div");
		profile.className = "fv-sk-profile";

		// Avatar
		const avatarArea = document.createElement("div");
		avatarArea.className = "fv-sk-profile-header";
		avatarArea.appendChild(this._bone("circle", 80, 80));

		const nameArea = document.createElement("div");
		nameArea.className = "fv-sk-profile-name";
		nameArea.appendChild(this._bone("rect", 150, 20, { borderRadius: 4 }));
		nameArea.appendChild(
			this._bone("rect", 100, 14, { borderRadius: 4, margin: "8px 0 0 0" })
		);
		avatarArea.appendChild(nameArea);
		profile.appendChild(avatarArea);

		// Stats
		const stats = document.createElement("div");
		stats.className = "fv-sk-profile-stats";
		for (let i = 0; i < 3; i++) {
			const stat = document.createElement("div");
			stat.className = "fv-sk-profile-stat";
			stat.appendChild(this._bone("rect", 50, 24, { borderRadius: 4 }));
			stat.appendChild(this._bone("rect", 60, 12, { borderRadius: 4, margin: "6px 0 0 0" }));
			stats.appendChild(stat);
		}
		profile.appendChild(stats);

		// Bio text
		profile.appendChild(this._bone("rect", "100%", 12, { borderRadius: 4, margin: "16px 0 0 0" }));
		profile.appendChild(this._bone("rect", "80%", 12, { borderRadius: 4, margin: "8px 0 0 0" }));

		wrap.appendChild(profile);
	}

	_renderCustom(wrap) {
		const { customLayout } = this.opts;

		customLayout.forEach((item) => {
			if (item.type === "circle") {
				wrap.appendChild(
					this._bone("circle", item.size || 40, item.size || 40, {
						margin: item.margin,
					})
				);
			} else if (item.type === "rect") {
				wrap.appendChild(
					this._bone("rect", item.width || "100%", item.height || 16, {
						borderRadius: item.borderRadius || this.opts.borderRadius,
						margin: item.margin,
					})
				);
			} else if (item.type === "gap") {
				const gap = document.createElement("div");
				gap.style.height = (item.height || 16) + "px";
				wrap.appendChild(gap);
			}
		});
	}

	/* ── Public API ─────────────────────────────────────── */

	show() {
		if (this.el) this.el.style.display = "";
	}

	hide() {
		if (this.el) this.el.style.display = "none";
	}

	setPattern(pattern) {
		this.opts.pattern = pattern;
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
