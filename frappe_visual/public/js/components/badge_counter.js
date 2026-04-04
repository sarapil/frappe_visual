/**
 * BadgeCounter — Animated numeric badge with overflow formatting
 *
 * frappe.visual.BadgeCounter.create({
 *   container: el,             // element to attach badge to
 *   count: 5,
 *   max: 99,                   // shows "99+" when exceeded
 *   type: "danger",            // danger|warning|info|success|neutral
 *   size: "md",                // sm|md|lg
 *   dot: false,                // show dot instead of number
 *   pulse: false,              // animated pulse
 *   position: "top-right",     // top-right|top-left|bottom-right|bottom-left|inline
 *   showZero: false,
 * })
 */
export class BadgeCounter {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static TYPES = {
		danger:  "#ef4444",
		warning: "#f59e0b",
		info:    "#3b82f6",
		success: "#22c55e",
		neutral: "#6b7280",
	};

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			count: 0,
			max: 99,
			type: "danger",
			size: "md",
			dot: false,
			pulse: false,
			position: "top-right",
			showZero: false,
		}, opts);

		let count = o.count;
		const bg = BadgeCounter.TYPES[o.type] || BadgeCounter.TYPES.danger;

		const badge = document.createElement("span");
		badge.className = `fv-badge-counter fv-badge-counter--${o.size} fv-badge-counter--${o.position}`;
		if (o.dot) badge.classList.add("fv-badge-counter--dot");
		if (o.pulse) badge.classList.add("fv-badge-counter--pulse");
		badge.style.background = bg;

		function render() {
			if (o.dot) {
				badge.textContent = "";
				badge.style.display = (count > 0 || o.showZero) ? "" : "none";
			} else {
				const display = count > o.max ? `${o.max}+` : String(count);
				badge.textContent = display;
				badge.style.display = (count > 0 || o.showZero) ? "" : "none";
			}
			// Pop animation
			badge.classList.remove("fv-badge-counter--pop");
			void badge.offsetWidth;
			badge.classList.add("fv-badge-counter--pop");
		}

		render();

		if (o.container) {
			if (o.position !== "inline") {
				const cs = getComputedStyle(o.container);
				if (cs.position === "static") o.container.style.position = "relative";
			}
			o.container.appendChild(badge);
		}

		return {
			el: badge,
			setCount(n) { count = n; render(); },
			increment(n = 1) { count += n; render(); },
			decrement(n = 1) { count = Math.max(0, count - n); render(); },
			getCount() { return count; },
			setType(t) {
				badge.style.background = BadgeCounter.TYPES[t] || BadgeCounter.TYPES.danger;
			},
			hide() { badge.style.display = "none"; },
			show() { render(); },
			destroy() { badge.remove(); },
		};
	}
}
