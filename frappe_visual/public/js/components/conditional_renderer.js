/**
 * ConditionalRenderer — Show/hide/swap DOM based on conditions
 *
 * frappe.visual.ConditionalRenderer.create({
 *   container: el,
 *   conditions: [
 *     { when: (ctx) => ctx.role === "admin", render: el|html|()=>el, key:"admin-panel" },
 *     { when: (ctx) => ctx.role === "user",  render: "<p>User view</p>", key:"user-panel" },
 *     { default: true, render: "<p>Guest view</p>", key:"guest-panel" },
 *   ],
 *   context: { role: "admin" },
 *   animated: true,
 *   mode: "replace",          // replace|toggle (toggle keeps all, shows/hides)
 * })
 *
 * instance.set("role", "user")  // auto-switches rendered content
 */
export class ConditionalRenderer {
	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			conditions: [],
			context: {},
			animated: true,
			mode: "replace",
		}, opts);

		const wrap = document.createElement("div");
		wrap.className = "fv-conditional-renderer";
		o.container.appendChild(wrap);

		const ctx = { ...o.context };
		const rendered = new Map(); // key -> element
		let currentKey = null;

		function resolveContent(render) {
			if (typeof render === "function") {
				const result = render(ctx);
				if (typeof result === "string") { const d = document.createElement("div"); d.innerHTML = result; return d; }
				return result;
			}
			if (typeof render === "string") { const d = document.createElement("div"); d.innerHTML = render; return d; }
			if (render instanceof HTMLElement) return render;
			return null;
		}

		function evaluate() {
			let matchedCondition = null;
			for (const cond of o.conditions) {
				if (cond.default) { matchedCondition = matchedCondition || cond; continue; }
				if (cond.when && cond.when(ctx)) { matchedCondition = cond; break; }
			}

			if (!matchedCondition) {
				if (o.mode === "replace") wrap.innerHTML = "";
				else rendered.forEach((el) => { el.style.display = "none"; });
				currentKey = null;
				return;
			}

			const key = matchedCondition.key || o.conditions.indexOf(matchedCondition);

			if (key === currentKey) return;

			if (o.mode === "toggle") {
				rendered.forEach((el, k) => {
					el.style.display = k === key ? "" : "none";
					if (o.animated && k === key) {
						el.style.opacity = "0";
						requestAnimationFrame(() => { el.style.transition = "opacity 0.25s"; el.style.opacity = "1"; });
					}
				});

				if (!rendered.has(key)) {
					const el = resolveContent(matchedCondition.render);
					if (el) { rendered.set(key, el); wrap.appendChild(el); }
				}
			} else {
				// Replace mode
				const el = resolveContent(matchedCondition.render);
				if (el) {
					if (o.animated) {
						el.style.opacity = "0";
						wrap.innerHTML = "";
						wrap.appendChild(el);
						requestAnimationFrame(() => { el.style.transition = "opacity 0.25s"; el.style.opacity = "1"; });
					} else {
						wrap.innerHTML = "";
						wrap.appendChild(el);
					}
					rendered.set(key, el);
				}
			}

			currentKey = key;
		}

		// Initialize all toggle-mode elements
		if (o.mode === "toggle") {
			o.conditions.forEach(cond => {
				const key = cond.key || o.conditions.indexOf(cond);
				const el = resolveContent(cond.render);
				if (el) { el.style.display = "none"; wrap.appendChild(el); rendered.set(key, el); }
			});
		}

		evaluate();

		return {
			el: wrap,
			set(key, value) { ctx[key] = value; evaluate(); },
			setContext(updates) { Object.assign(ctx, updates); evaluate(); },
			get context() { return { ...ctx }; },
			get activeKey() { return currentKey; },
			refresh() { currentKey = null; evaluate(); },
			destroy() { wrap.remove(); rendered.clear(); },
		};
	}
}
