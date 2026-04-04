/**
 * AccordionGroup — Animated collapsible accordion panels
 *
 * frappe.visual.AccordionGroup.create({
 *   container: el,
 *   panels: [
 *     { id:"p1", title:"Section 1", icon:"folder", content:"HTML or Element", open:true },
 *     { id:"p2", title:"Section 2", content:"...", disabled:false },
 *   ],
 *   multiple: false,            // allow multiple open panels
 *   theme: "glass",             // flat|glass|minimal|bordered
 *   animated: true,
 *   onChange: (openIds) => {}
 * })
 */
export class AccordionGroup {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			panels: [],
			multiple: false,
			theme: "glass",
			animated: true,
			onChange: null,
		}, opts);

		const wrap = document.createElement("div");
		wrap.className = `fv-accordion fv-accordion--${o.theme}`;

		const openSet = new Set(o.panels.filter(p => p.open).map(p => p.id));

		function toggle(panelId) {
			if (openSet.has(panelId)) {
				openSet.delete(panelId);
			} else {
				if (!o.multiple) openSet.clear();
				openSet.add(panelId);
			}
			updatePanels();
			if (o.onChange) o.onChange([...openSet]);
		}

		function updatePanels() {
			wrap.querySelectorAll(".fv-accordion__panel").forEach(panel => {
				const id = panel.dataset.panelId;
				const isOpen = openSet.has(id);
				panel.classList.toggle("fv-accordion__panel--open", isOpen);
				const body = panel.querySelector(".fv-accordion__body");
				const chevron = panel.querySelector(".fv-accordion__chevron");
				if (body) {
					if (o.animated) {
						body.style.maxHeight = isOpen ? body.scrollHeight + "px" : "0";
					} else {
						body.style.display = isOpen ? "block" : "none";
					}
				}
				if (chevron) chevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
				panel.querySelector(".fv-accordion__header")?.setAttribute("aria-expanded", isOpen);
			});
		}

		function render() {
			wrap.innerHTML = "";
			o.panels.forEach(panel => {
				const el = document.createElement("div");
				el.className = `fv-accordion__panel${openSet.has(panel.id) ? " fv-accordion__panel--open" : ""}${panel.disabled ? " fv-accordion__panel--disabled" : ""}`;
				el.dataset.panelId = panel.id;

				const isOpen = openSet.has(panel.id);
				el.innerHTML = `
					<button class="fv-accordion__header" aria-expanded="${isOpen}" ${panel.disabled ? "disabled" : ""}>
						${panel.icon ? `<span class="fv-accordion__icon">${panel.icon}</span>` : ""}
						<span class="fv-accordion__title">${AccordionGroup._esc(panel.title)}</span>
						${panel.badge !== undefined ? `<span class="fv-accordion__badge">${panel.badge}</span>` : ""}
						<span class="fv-accordion__chevron" style="transform:${isOpen ? "rotate(180deg)" : "rotate(0deg)"}">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
						</span>
					</button>
					<div class="fv-accordion__body" style="${o.animated ? `max-height:${isOpen ? "2000px" : "0"};overflow:hidden;transition:max-height 0.3s ease` : `display:${isOpen ? "block" : "none"}`}">
						<div class="fv-accordion__content"></div>
					</div>
				`;

				const contentEl = el.querySelector(".fv-accordion__content");
				if (typeof panel.content === "string") contentEl.innerHTML = panel.content;
				else if (panel.content instanceof HTMLElement) contentEl.appendChild(panel.content);

				el.querySelector(".fv-accordion__header").onclick = () => {
					if (!panel.disabled) toggle(panel.id);
				};

				wrap.appendChild(el);
			});
		}

		render();
		o.container.appendChild(wrap);

		return {
			el: wrap,
			toggle,
			openAll() { o.panels.forEach(p => openSet.add(p.id)); updatePanels(); },
			closeAll() { openSet.clear(); updatePanels(); },
			getOpen: () => [...openSet],
			addPanel(panel) { o.panels.push(panel); render(); },
			removePanel(id) { o.panels = o.panels.filter(p => p.id !== id); openSet.delete(id); render(); },
			destroy() { wrap.remove(); },
		};
	}
}
