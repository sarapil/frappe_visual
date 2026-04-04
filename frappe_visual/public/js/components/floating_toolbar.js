/**
 * FloatingToolbar — Draggable floating toolbar with tool groups
 *
 * frappe.visual.FloatingToolbar.create({
 *   container: el,
 *   position: { x:100, y:100 },  // initial position
 *   orientation: "horizontal",     // horizontal|vertical
 *   tools: [
 *     { id:"bold", icon:"bold", tooltip:"Bold (Ctrl+B)", toggle:true },
 *     { id:"italic", icon:"italic", tooltip:"Italic", toggle:true },
 *     { type:"separator" },
 *     { id:"color", icon:"palette", tooltip:"Color", dropdown:true, content:el },
 *     { id:"save", icon:"device-floppy", tooltip:"Save", variant:"primary" },
 *   ],
 *   draggable: true,
 *   autoHide: 0,                  // ms to auto-hide (0=off)
 *   snap: true,                   // snap to edges
 *   theme: "glass",               // flat|glass|dark
 *   onAction: (toolId, active) => {},
 * })
 */
export class FloatingToolbar {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			position: { x: 100, y: 100 },
			orientation: "horizontal",
			tools: [],
			draggable: true,
			autoHide: 0,
			snap: true,
			theme: "glass",
			onAction: null,
		}, opts);

		const bar = document.createElement("div");
		bar.className = `fv-floating-toolbar fv-floating-toolbar--${o.orientation} fv-floating-toolbar--${o.theme}`;
		bar.style.cssText = `position:fixed;left:${o.position.x}px;top:${o.position.y}px;z-index:9990;display:flex;${o.orientation === "vertical" ? "flex-direction:column;" : ""}align-items:center;gap:2px;padding:4px;border-radius:10px;`;

		const activeToggles = new Set();
		let hideTimer = null;

		function resetAutoHide() {
			if (o.autoHide <= 0) return;
			clearTimeout(hideTimer);
			bar.style.opacity = "1";
			hideTimer = setTimeout(() => { bar.style.opacity = "0.3"; }, o.autoHide);
		}

		bar.addEventListener("mouseenter", () => { bar.style.opacity = "1"; clearTimeout(hideTimer); });
		bar.addEventListener("mouseleave", resetAutoHide);

		o.tools.forEach(tool => {
			if (tool.type === "separator") {
				const sep = document.createElement("div");
				sep.className = "fv-floating-toolbar__sep";
				bar.appendChild(sep);
				return;
			}

			const btn = document.createElement("button");
			btn.className = `fv-floating-toolbar__btn${tool.variant ? ` fv-floating-toolbar__btn--${tool.variant}` : ""}`;
			btn.dataset.toolId = tool.id;
			btn.title = tool.tooltip || tool.id;
			btn.innerHTML = tool.icon
				? `<svg width="18" height="18"><use href="#icon-${tool.icon}"/></svg>`
				: FloatingToolbar._esc(tool.label || tool.id);

			if (tool.toggle) {
				btn.onclick = () => {
					const isActive = activeToggles.has(tool.id);
					if (isActive) activeToggles.delete(tool.id); else activeToggles.add(tool.id);
					btn.classList.toggle("fv-floating-toolbar__btn--active", !isActive);
					if (o.onAction) o.onAction(tool.id, !isActive);
					resetAutoHide();
				};
			} else if (tool.dropdown && tool.content) {
				btn.onclick = (e) => {
					e.stopPropagation();
					const existing = bar.querySelector(".fv-floating-toolbar__dropdown");
					if (existing) { existing.remove(); return; }

					const dd = document.createElement("div");
					dd.className = "fv-floating-toolbar__dropdown";
					if (typeof tool.content === "string") dd.innerHTML = tool.content;
					else if (tool.content instanceof HTMLElement) dd.appendChild(tool.content.cloneNode(true));
					btn.style.position = "relative";
					btn.appendChild(dd);
					const close = (ev) => { if (!dd.contains(ev.target) && ev.target !== btn) { dd.remove(); document.removeEventListener("click", close); } };
					setTimeout(() => document.addEventListener("click", close), 0);
				};
			} else {
				btn.onclick = () => { if (o.onAction) o.onAction(tool.id, true); resetAutoHide(); };
			}

			bar.appendChild(btn);
		});

		// Draggable
		if (o.draggable) {
			let dragging = false;
			bar.addEventListener("pointerdown", (e) => {
				if (e.target.closest(".fv-floating-toolbar__btn") || e.target.closest(".fv-floating-toolbar__dropdown")) return;
				e.preventDefault();
				bar.setPointerCapture(e.pointerId);
				dragging = true;
				const startX = e.clientX - bar.offsetLeft;
				const startY = e.clientY - bar.offsetTop;
				bar.style.cursor = "grabbing";

				const onMove = (ev) => {
					if (!dragging) return;
					let x = ev.clientX - startX;
					let y = ev.clientY - startY;

					if (o.snap) {
						const margin = 12;
						const maxX = window.innerWidth - bar.offsetWidth - margin;
						const maxY = window.innerHeight - bar.offsetHeight - margin;
						x = Math.max(margin, Math.min(maxX, x));
						y = Math.max(margin, Math.min(maxY, y));
						// Snap to edges
						if (x < 30) x = margin;
						if (x > maxX - 18) x = maxX;
						if (y < 30) y = margin;
						if (y > maxY - 18) y = maxY;
					}

					bar.style.left = x + "px";
					bar.style.top = y + "px";
				};

				const onUp = () => {
					dragging = false;
					bar.removeEventListener("pointermove", onMove);
					bar.removeEventListener("pointerup", onUp);
					bar.style.cursor = "";
				};

				bar.addEventListener("pointermove", onMove);
				bar.addEventListener("pointerup", onUp);
			});
		}

		o.container.appendChild(bar);
		resetAutoHide();

		return {
			el: bar,
			setActive(toolId, active) {
				const btn = bar.querySelector(`[data-tool-id="${toolId}"]`);
				if (btn) { btn.classList.toggle("fv-floating-toolbar__btn--active", active); if (active) activeToggles.add(toolId); else activeToggles.delete(toolId); }
			},
			getActive: () => [...activeToggles],
			show() { bar.style.display = ""; resetAutoHide(); },
			hide() { bar.style.display = "none"; },
			moveTo(x, y) { bar.style.left = x + "px"; bar.style.top = y + "px"; },
			destroy() { bar.remove(); },
		};
	}
}
