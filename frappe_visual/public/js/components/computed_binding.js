/**
 * ComputedBinding — Auto-update DOM elements from reactive expressions
 *
 * frappe.visual.ComputedBinding.create({
 *   container: el,
 *   bindings: {
 *     "#total":  { expr: (ctx) => ctx.price * ctx.qty, format: (v) => `$${v.toFixed(2)}` },
 *     ".status": { expr: (ctx) => ctx.active ? "Active" : "Inactive", attr: "textContent" },
 *     ".badge":  { expr: (ctx) => ctx.count, attr: "data-count", class: { "has-items": (ctx) => ctx.count > 0 } },
 *   },
 *   context: { price:10, qty:2, active:true, count:5 },
 * })
 *
 * instance.set("qty", 3)  // auto-updates #total
 */
export class ComputedBinding {
	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			bindings: {},
			context: {},
			debounce: 16,
		}, opts);

		const ctx = new Proxy({ ...o.context }, {
			set(target, key, value) {
				target[key] = value;
				scheduleUpdate();
				return true;
			}
		});

		let updateTimer = null;

		function scheduleUpdate() {
			if (updateTimer) return;
			updateTimer = setTimeout(() => { updateTimer = null; update(); }, o.debounce);
		}

		function update() {
			Object.entries(o.bindings).forEach(([selector, binding]) => {
				const els = o.container.querySelectorAll(selector);
				if (!els.length) return;

				let value;
				try { value = binding.expr(ctx); } catch (e) { return; }
				if (binding.format) value = binding.format(value);

				els.forEach(el => {
					const attr = binding.attr || "textContent";
					if (attr === "textContent" || attr === "innerText") {
						el.textContent = value;
					} else if (attr === "innerHTML") {
						el.innerHTML = value;
					} else if (attr === "value") {
						el.value = value;
					} else if (attr === "class") {
						// value is className to toggle
						el.classList.toggle(value, true);
					} else if (attr.startsWith("style.")) {
						el.style[attr.slice(6)] = value;
					} else {
						el.setAttribute(attr, value);
					}

					// Class bindings
					if (binding.class) {
						Object.entries(binding.class).forEach(([cls, pred]) => {
							el.classList.toggle(cls, !!pred(ctx));
						});
					}

					// Style bindings
					if (binding.style) {
						Object.entries(binding.style).forEach(([prop, fn]) => {
							el.style[prop] = fn(ctx);
						});
					}

					// Visibility
					if (binding.visible !== undefined) {
						const vis = typeof binding.visible === "function" ? binding.visible(ctx) : binding.visible;
						el.style.display = vis ? "" : "none";
					}
				});
			});
		}

		// Initial update
		update();

		return {
			get context() { return ctx; },
			set(key, value) { ctx[key] = value; },
			batch(updates) { Object.assign(ctx, updates); scheduleUpdate(); },
			update,
			addBinding(selector, binding) { o.bindings[selector] = binding; update(); },
			removeBinding(selector) { delete o.bindings[selector]; },
			destroy() { clearTimeout(updateTimer); },
		};
	}
}
