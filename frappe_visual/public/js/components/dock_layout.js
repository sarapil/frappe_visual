/**
 * DockLayout — Multi-panel dockable layout manager
 *
 * frappe.visual.DockLayout.create({
 *   container: el,
 *   panels: [
 *     { id:"main", title:"Editor", content:el, position:"center" },
 *     { id:"sidebar", title:"Explorer", content:el, position:"left", width:280 },
 *     { id:"output", title:"Output", content:el, position:"bottom", height:200, collapsible:true },
 *     { id:"props", title:"Properties", content:el, position:"right", width:300, hidden:true },
 *   ],
 *   gutter: 4,                  // resize gutter width
 *   minPanelSize: 100,
 *   animated: true,
 *   onLayoutChange: (layout) => {},
 *   onPanelToggle: (id, visible) => {},
 * })
 */
export class DockLayout {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			panels: [],
			gutter: 4,
			minPanelSize: 100,
			animated: true,
			onLayoutChange: null,
			onPanelToggle: null,
		}, opts);

		const wrap = document.createElement("div");
		wrap.className = "fv-dock-layout";

		const positions = { left: [], right: [], top: [], bottom: [], center: [] };
		o.panels.forEach(p => {
			const pos = p.position || "center";
			if (positions[pos]) positions[pos].push(p);
		});

		function createPanel(panel) {
			const el = document.createElement("div");
			el.className = `fv-dock-layout__panel fv-dock-layout__panel--${panel.position}${panel.hidden ? " fv-dock-layout__panel--hidden" : ""}`;
			el.dataset.panelId = panel.id;

			if (panel.position !== "center") {
				if (panel.width) el.style.width = panel.width + "px";
				if (panel.height) el.style.height = panel.height + "px";
			} else {
				el.style.flex = "1";
			}

			const header = document.createElement("div");
			header.className = "fv-dock-layout__header";
			header.innerHTML = `
				<span class="fv-dock-layout__title">${DockLayout._esc(panel.title || panel.id)}</span>
				<div class="fv-dock-layout__actions">
					${panel.collapsible ? `<button class="fv-dock-layout__btn" data-action="collapse" title="Collapse">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
					</button>` : ""}
					<button class="fv-dock-layout__btn" data-action="toggle" title="Hide">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
					</button>
				</div>
			`;

			header.querySelector('[data-action="toggle"]')?.addEventListener("click", () => {
				togglePanel(panel.id);
			});

			header.querySelector('[data-action="collapse"]')?.addEventListener("click", () => {
				const body = el.querySelector(".fv-dock-layout__body");
				const isCollapsed = el.classList.toggle("fv-dock-layout__panel--collapsed");
				if (body) body.style.display = isCollapsed ? "none" : "block";
			});

			const body = document.createElement("div");
			body.className = "fv-dock-layout__body";
			if (panel.content) {
				if (typeof panel.content === "string") body.innerHTML = panel.content;
				else if (panel.content instanceof HTMLElement) body.appendChild(panel.content);
			}

			el.appendChild(header);
			el.appendChild(body);
			return el;
		}

		function createGutter(direction) {
			const gutter = document.createElement("div");
			gutter.className = `fv-dock-layout__gutter fv-dock-layout__gutter--${direction}`;
			const isH = direction === "vertical";
			gutter.style.cssText = isH
				? `width:${o.gutter}px;cursor:col-resize;flex-shrink:0`
				: `height:${o.gutter}px;cursor:row-resize;flex-shrink:0`;

			gutter.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				gutter.setPointerCapture(e.pointerId);
				const prev = gutter.previousElementSibling;
				const next = gutter.nextElementSibling;
				if (!prev || !next) return;

				const startPos = isH ? e.clientX : e.clientY;
				const prevSize = isH ? prev.offsetWidth : prev.offsetHeight;
				const nextSize = isH ? next.offsetWidth : next.offsetHeight;

				const onMove = (ev) => {
					const delta = (isH ? ev.clientX : ev.clientY) - startPos;
					const newPrev = Math.max(o.minPanelSize, prevSize + delta);
					const newNext = Math.max(o.minPanelSize, nextSize - delta);
					if (isH) { prev.style.width = newPrev + "px"; next.style.width = newNext + "px"; }
					else { prev.style.height = newPrev + "px"; next.style.height = newNext + "px"; }
				};

				const onUp = () => {
					gutter.removeEventListener("pointermove", onMove);
					gutter.removeEventListener("pointerup", onUp);
					if (o.onLayoutChange) o.onLayoutChange(getLayout());
				};

				gutter.addEventListener("pointermove", onMove);
				gutter.addEventListener("pointerup", onUp);
			});

			return gutter;
		}

		function build() {
			wrap.innerHTML = "";

			// Top panels
			positions.top.forEach(p => { wrap.appendChild(createPanel(p)); wrap.appendChild(createGutter("horizontal")); });

			// Middle row: left | center | right
			const middle = document.createElement("div");
			middle.className = "fv-dock-layout__middle";
			middle.style.cssText = "display:flex;flex:1;overflow:hidden";

			positions.left.forEach(p => { middle.appendChild(createPanel(p)); middle.appendChild(createGutter("vertical")); });
			positions.center.forEach(p => middle.appendChild(createPanel(p)));
			positions.right.forEach(p => { middle.appendChild(createGutter("vertical")); middle.appendChild(createPanel(p)); });

			wrap.appendChild(middle);

			// Bottom panels
			positions.bottom.forEach(p => { wrap.appendChild(createGutter("horizontal")); wrap.appendChild(createPanel(p)); });
		}

		function togglePanel(id) {
			const el = wrap.querySelector(`[data-panel-id="${id}"]`);
			if (!el) return;
			const hidden = el.classList.toggle("fv-dock-layout__panel--hidden");
			const panel = o.panels.find(p => p.id === id);
			if (panel) panel.hidden = hidden;
			if (o.onPanelToggle) o.onPanelToggle(id, !hidden);
		}

		function getLayout() {
			return o.panels.map(p => ({
				id: p.id,
				position: p.position,
				hidden: p.hidden || false,
				width: wrap.querySelector(`[data-panel-id="${p.id}"]`)?.offsetWidth,
				height: wrap.querySelector(`[data-panel-id="${p.id}"]`)?.offsetHeight,
			}));
		}

		build();
		o.container.appendChild(wrap);

		return {
			el: wrap,
			togglePanel,
			showPanel(id) { const el = wrap.querySelector(`[data-panel-id="${id}"]`); if (el) { el.classList.remove("fv-dock-layout__panel--hidden"); const p = o.panels.find(p => p.id === id); if (p) p.hidden = false; } },
			hidePanel(id) { const el = wrap.querySelector(`[data-panel-id="${id}"]`); if (el) { el.classList.add("fv-dock-layout__panel--hidden"); const p = o.panels.find(p => p.id === id); if (p) p.hidden = true; } },
			getLayout,
			destroy() { wrap.remove(); },
		};
	}
}
