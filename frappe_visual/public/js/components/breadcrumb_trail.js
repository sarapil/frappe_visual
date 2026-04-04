/**
 * BreadcrumbTrail — Rich breadcrumb navigation with dropdowns
 *
 * frappe.visual.BreadcrumbTrail.create({
 *   container: el,
 *   items: [
 *     { label:"Home", icon:"home", href:"/" },
 *     { label:"Module", href:"/app/module", children:[{label:"Sub",href:"/app/sub"}] },
 *     { label:"Current", active:true }
 *   ],
 *   separator: "chevron",        // chevron|slash|dot|arrow
 *   collapsible: true,           // collapse middle items on overflow
 *   maxVisible: 4,               // max items before collapsing
 *   theme: "glass",              // flat|glass|minimal
 *   onChange: (item) => {}
 * })
 */
export class BreadcrumbTrail {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static SEPARATORS = {
		chevron: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`,
		slash: `<span style="opacity:0.3;font-size:1.1em">/</span>`,
		dot: `<span style="opacity:0.4;font-size:0.6em">●</span>`,
		arrow: `<span style="opacity:0.4">→</span>`,
	};

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			items: [],
			separator: "chevron",
			collapsible: true,
			maxVisible: 4,
			theme: "glass",
			onChange: null,
		}, opts);

		const wrap = document.createElement("nav");
		wrap.className = `fv-breadcrumb fv-breadcrumb--${o.theme}`;
		wrap.setAttribute("aria-label", "Breadcrumb");

		const isRTL = document.documentElement.dir === "rtl";
		const sep = BreadcrumbTrail.SEPARATORS[o.separator] || BreadcrumbTrail.SEPARATORS.chevron;

		function render(items) {
			wrap.innerHTML = "";
			const ol = document.createElement("ol");
			ol.className = "fv-breadcrumb__list";

			let displayItems = [...items];
			const collapsed = o.collapsible && displayItems.length > o.maxVisible;

			if (collapsed) {
				const first = displayItems[0];
				const last = displayItems.slice(-(o.maxVisible - 2));
				displayItems = [first, { _collapsed: true, _hidden: items.slice(1, items.length - (o.maxVisible - 2)) }, ...last];
			}

			displayItems.forEach((item, idx) => {
				if (idx > 0) {
					const sepEl = document.createElement("li");
					sepEl.className = "fv-breadcrumb__sep";
					sepEl.setAttribute("aria-hidden", "true");
					sepEl.innerHTML = isRTL ? sep.replace("9 18l6-6-6-6", "15 6l-6 6 6 6") : sep;
					ol.appendChild(sepEl);
				}

				const li = document.createElement("li");
				li.className = "fv-breadcrumb__item";

				if (item._collapsed) {
					li.innerHTML = `<button class="fv-breadcrumb__collapse-btn" aria-label="Show more">…</button>`;
					const btn = li.querySelector("button");
					btn.onclick = (e) => {
						e.stopPropagation();
						const dd = document.createElement("div");
						dd.className = "fv-breadcrumb__dropdown";
						item._hidden.forEach(h => {
							const a = document.createElement("a");
							a.className = "fv-breadcrumb__dropdown-item";
							a.href = h.href || "#";
							a.textContent = h.label;
							a.onclick = (ev) => { ev.preventDefault(); dd.remove(); if (o.onChange) o.onChange(h); };
							dd.appendChild(a);
						});
						li.appendChild(dd);
						const close = (ev) => { if (!dd.contains(ev.target)) { dd.remove(); document.removeEventListener("click", close); } };
						setTimeout(() => document.addEventListener("click", close), 0);
					};
				} else if (item.active) {
					li.setAttribute("aria-current", "page");
					li.innerHTML = `<span class="fv-breadcrumb__current">${item.icon ? `<span class="fv-breadcrumb__icon">${item.icon}</span> ` : ""}${BreadcrumbTrail._esc(item.label)}</span>`;
				} else {
					const a = document.createElement("a");
					a.className = "fv-breadcrumb__link";
					a.href = item.href || "#";
					a.innerHTML = `${item.icon ? `<span class="fv-breadcrumb__icon">${item.icon}</span> ` : ""}${BreadcrumbTrail._esc(item.label)}`;
					if (item.children && item.children.length) {
						a.innerHTML += ` <span class="fv-breadcrumb__caret">▾</span>`;
						a.onclick = (e) => {
							e.preventDefault();
							const dd = document.createElement("div");
							dd.className = "fv-breadcrumb__dropdown";
							item.children.forEach(c => {
								const ca = document.createElement("a");
								ca.className = "fv-breadcrumb__dropdown-item";
								ca.href = c.href || "#";
								ca.textContent = c.label;
								ca.onclick = (ev) => { ev.preventDefault(); dd.remove(); if (o.onChange) o.onChange(c); };
								dd.appendChild(ca);
							});
							li.appendChild(dd);
							const close = (ev) => { if (!dd.contains(ev.target)) { dd.remove(); document.removeEventListener("click", close); } };
							setTimeout(() => document.addEventListener("click", close), 0);
						};
					} else {
						a.onclick = (e) => { e.preventDefault(); if (o.onChange) o.onChange(item); };
					}
					li.appendChild(a);
				}

				ol.appendChild(li);
			});

			wrap.appendChild(ol);
		}

		render(o.items);
		o.container.appendChild(wrap);

		return {
			el: wrap,
			update(items) { o.items = items; render(items); },
			destroy() { wrap.remove(); },
		};
	}
}
