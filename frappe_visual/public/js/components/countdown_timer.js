/**
 * CountdownTimer — Animated countdown with customizable display
 *
 * frappe.visual.CountdownTimer.create({
 *   container: el,
 *   targetDate: "2025-12-31T23:59:59",  // or Date object
 *   format: "dhms",                      // d=days, h=hours, m=minutes, s=seconds
 *   onComplete: () => {},
 *   onTick: (remaining) => {},
 *   labels: { d: "Days", h: "Hours", m: "Minutes", s: "Seconds" },
 *   theme: "glass",                      // glass|flat|minimal
 *   size: "md",                          // sm|md|lg
 *   showSeparator: true,
 * })
 */
export class CountdownTimer {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			targetDate: null,
			format: "dhms",
			onComplete: null,
			onTick: null,
			labels: { d: "Days", h: "Hours", m: "Minutes", s: "Seconds" },
			theme: "glass",
			size: "md",
			showSeparator: true,
		}, opts);

		const target = o.targetDate instanceof Date ? o.targetDate : new Date(o.targetDate);
		const el = document.createElement("div");
		el.className = `fv-countdown fv-countdown--${o.theme} fv-countdown--${o.size}`;

		const segments = o.format.split("").filter(c => "dhms".includes(c));

		function buildHTML() {
			return segments.map((seg, i) => {
				const sep = (o.showSeparator && i < segments.length - 1) ? `<span class="fv-countdown__sep">:</span>` : "";
				return `
					<div class="fv-countdown__unit" data-unit="${seg}">
						<div class="fv-countdown__value">
							<span class="fv-countdown__num" data-seg="${seg}">00</span>
						</div>
						<div class="fv-countdown__label">${CountdownTimer._esc(o.labels[seg] || seg)}</div>
					</div>${sep}`;
			}).join("");
		}

		el.innerHTML = buildHTML();
		if (o.container) o.container.appendChild(el);

		const numEls = {};
		segments.forEach(seg => { numEls[seg] = el.querySelector(`[data-seg="${seg}"]`); });

		let intervalId = null;
		let paused = false;
		let prevValues = {};

		function calc() {
			const now = Date.now();
			let diff = Math.max(0, target.getTime() - now);
			const s = Math.floor(diff / 1000);
			const m = Math.floor(s / 60);
			const h = Math.floor(m / 60);
			const d = Math.floor(h / 24);
			return {
				d: String(d).padStart(2, "0"),
				h: String(h % 24).padStart(2, "0"),
				m: String(m % 60).padStart(2, "0"),
				s: String(s % 60).padStart(2, "0"),
				total: diff,
			};
		}

		function update() {
			if (paused) return;
			const v = calc();
			segments.forEach(seg => {
				if (numEls[seg] && v[seg] !== prevValues[seg]) {
					numEls[seg].textContent = v[seg];
					numEls[seg].classList.remove("fv-countdown__num--flip");
					void numEls[seg].offsetWidth; // force reflow
					numEls[seg].classList.add("fv-countdown__num--flip");
					prevValues[seg] = v[seg];
				}
			});
			if (o.onTick) o.onTick(v);
			if (v.total <= 0) {
				clearInterval(intervalId);
				el.classList.add("fv-countdown--complete");
				if (o.onComplete) o.onComplete();
			}
		}

		update();
		intervalId = setInterval(update, 1000);

		return {
			el,
			pause() { paused = true; },
			resume() { paused = false; },
			setTarget(dt) {
				const newTarget = dt instanceof Date ? dt : new Date(dt);
				Object.assign(target, { time: newTarget.getTime() });
			},
			destroy() { clearInterval(intervalId); el.remove(); },
		};
	}
}
