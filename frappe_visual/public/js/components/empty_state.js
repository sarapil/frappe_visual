/**
 * Frappe Visual — EmptyState
 * ============================
 * Beautiful empty/zero-state illustrations with actions,
 * animated icons, suggestions, and contextual hints.
 *
 * Usage:
 *   const empty = EmptyState.create(container, {
 *     illustration: 'no-data',    // preset or custom SVG/URL
 *     title: 'No Records Found',
 *     description: 'Try adjusting your filters or create a new record.',
 *     actions: [
 *       { label: 'Create New', variant: 'primary', onClick: () => {} },
 *       { label: 'Import Data', variant: 'outline', onClick: () => {} },
 *     ],
 *     suggestions: ['Tip: Use the search bar to find specific records'],
 *     size: 'md',                  // 'sm' | 'md' | 'lg'
 *     theme: 'glass',              // 'glass' | 'flat' | 'minimal'
 *     animate: true,
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

const ILLUSTRATIONS = {
	"no-data": `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x="25" y="20" width="70" height="80" rx="8" fill="var(--fv-empty-bg, #f1f5f9)" stroke="var(--fv-empty-stroke, #cbd5e1)" stroke-width="2"/>
		<line x1="38" y1="42" x2="82" y2="42" stroke="var(--fv-empty-line, #e2e8f0)" stroke-width="4" stroke-linecap="round"/>
		<line x1="38" y1="55" x2="72" y2="55" stroke="var(--fv-empty-line, #e2e8f0)" stroke-width="4" stroke-linecap="round"/>
		<line x1="38" y1="68" x2="62" y2="68" stroke="var(--fv-empty-line, #e2e8f0)" stroke-width="4" stroke-linecap="round"/>
		<circle cx="85" cy="85" r="20" fill="var(--fv-empty-accent, #dbeafe)" stroke="var(--fv-primary, #6366f1)" stroke-width="2"/>
		<text x="85" y="92" text-anchor="middle" font-size="24" fill="var(--fv-primary, #6366f1)">?</text>
	</svg>`,
	"no-results": `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="50" cy="50" r="30" fill="var(--fv-empty-bg, #f1f5f9)" stroke="var(--fv-empty-stroke, #cbd5e1)" stroke-width="2"/>
		<line x1="72" y1="72" x2="100" y2="100" stroke="var(--fv-primary, #6366f1)" stroke-width="4" stroke-linecap="round"/>
		<line x1="38" y1="50" x2="62" y2="50" stroke="var(--fv-empty-line, #e2e8f0)" stroke-width="3" stroke-linecap="round"/>
	</svg>`,
	"no-permission": `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x="30" y="45" width="60" height="45" rx="6" fill="var(--fv-empty-bg, #f1f5f9)" stroke="var(--fv-empty-stroke, #cbd5e1)" stroke-width="2"/>
		<path d="M45 45V35C45 26.7 51.7 20 60 20C68.3 20 75 26.7 75 35V45" stroke="var(--fv-primary, #6366f1)" stroke-width="3" stroke-linecap="round"/>
		<circle cx="60" cy="65" r="5" fill="var(--fv-primary, #6366f1)"/>
		<line x1="60" y1="70" x2="60" y2="78" stroke="var(--fv-primary, #6366f1)" stroke-width="3" stroke-linecap="round"/>
	</svg>`,
	success: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="60" cy="60" r="40" fill="var(--fv-empty-bg, #f0fdf4)" stroke="#22c55e" stroke-width="2"/>
		<polyline points="42,60 54,72 78,48" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>`,
	error: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="60" cy="60" r="40" fill="var(--fv-empty-bg, #fef2f2)" stroke="#ef4444" stroke-width="2"/>
		<line x1="48" y1="48" x2="72" y2="72" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
		<line x1="72" y1="48" x2="48" y2="72" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
	</svg>`,
	maintenance: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="60" cy="60" r="35" fill="var(--fv-empty-bg, #f1f5f9)" stroke="var(--fv-empty-stroke, #cbd5e1)" stroke-width="2"/>
		<path d="M55 45L65 55L55 65" fill="none" stroke="var(--fv-primary, #6366f1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
		<circle cx="60" cy="55" r="8" fill="none" stroke="var(--fv-primary, #6366f1)" stroke-width="2"/>
		<path d="M45 80L50 70L70 70L75 80" fill="none" stroke="var(--fv-empty-stroke, #cbd5e1)" stroke-width="2" stroke-linecap="round"/>
	</svg>`,
};

export class EmptyState {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				illustration: "no-data",
				title: "",
				description: "",
				actions: [],
				suggestions: [],
				size: "md",
				theme: "glass",
				animate: true,
			},
			opts
		);

		this._init();
	}

	static create(container, opts = {}) {
		return new EmptyState(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { illustration, title, description, actions, suggestions, size, theme, animate } =
			this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-es fv-es-${size} fv-es-${theme}`;
		if (animate) wrap.classList.add("fv-es-animated");

		// Illustration
		const illustWrap = document.createElement("div");
		illustWrap.className = "fv-es-illustration";

		if (ILLUSTRATIONS[illustration]) {
			illustWrap.innerHTML = ILLUSTRATIONS[illustration];
		} else if (
			illustration.startsWith("<svg") ||
			illustration.startsWith("<img")
		) {
			illustWrap.innerHTML = illustration;
		} else if (illustration.startsWith("http") || illustration.startsWith("/")) {
			illustWrap.innerHTML = `<img src="${_esc(illustration)}" alt="" class="fv-es-img" />`;
		} else {
			// Emoji or text
			illustWrap.innerHTML = `<span class="fv-es-emoji">${_esc(illustration)}</span>`;
		}
		wrap.appendChild(illustWrap);

		// Title
		if (title) {
			const h = document.createElement("h3");
			h.className = "fv-es-title";
			h.textContent = title;
			wrap.appendChild(h);
		}

		// Description
		if (description) {
			const p = document.createElement("p");
			p.className = "fv-es-desc";
			p.textContent = description;
			wrap.appendChild(p);
		}

		// Actions
		if (actions.length > 0) {
			const actionsWrap = document.createElement("div");
			actionsWrap.className = "fv-es-actions";

			actions.forEach((action) => {
				const btn = document.createElement("button");
				btn.className = `fv-es-btn fv-es-btn-${action.variant || "primary"}`;

				if (action.icon) {
					btn.innerHTML = `<span class="fv-es-btn-icon">${_esc(action.icon)}</span> `;
				}

				const label = document.createElement("span");
				label.textContent = action.label;
				btn.appendChild(label);

				if (action.onClick) {
					btn.addEventListener("click", action.onClick);
				}

				actionsWrap.appendChild(btn);
			});

			wrap.appendChild(actionsWrap);
		}

		// Suggestions
		if (suggestions.length > 0) {
			const sugWrap = document.createElement("div");
			sugWrap.className = "fv-es-suggestions";

			const sugTitle = document.createElement("div");
			sugTitle.className = "fv-es-sug-title";
			sugTitle.textContent =
				typeof __ !== "undefined" ? __("Suggestions") : "Suggestions";
			sugWrap.appendChild(sugTitle);

			const list = document.createElement("ul");
			list.className = "fv-es-sug-list";
			suggestions.forEach((sug) => {
				const li = document.createElement("li");
				li.textContent = typeof sug === "string" ? sug : sug.text;
				if (typeof sug === "object" && sug.onClick) {
					li.style.cursor = "pointer";
					li.classList.add("fv-es-sug-clickable");
					li.addEventListener("click", sug.onClick);
				}
				list.appendChild(li);
			});
			sugWrap.appendChild(list);

			wrap.appendChild(sugWrap);
		}

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;

		// Animate in
		if (animate) {
			requestAnimationFrame(() => {
				wrap.classList.add("fv-es-visible");
			});
		}
	}

	/* ── Public API ─────────────────────────────────────── */

	update(opts) {
		Object.assign(this.opts, opts);
		this._render();
	}

	setTitle(title) {
		this.opts.title = title;
		const el = this.el && this.el.querySelector(".fv-es-title");
		if (el) el.textContent = title;
	}

	setDescription(desc) {
		this.opts.description = desc;
		const el = this.el && this.el.querySelector(".fv-es-desc");
		if (el) el.textContent = desc;
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
