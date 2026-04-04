/**
 * TabStrip — Animated horizontal/vertical tab strip
 *
 * frappe.visual.TabStrip.create({
 *   container: el,
 *   tabs: [
 *     { id:"general", label:"General", icon:"settings", badge:3, content:el|html },
 *     { id:"advanced", label:"Advanced", disabled:true },
 *   ],
 *   activeTab: "general",
 *   orientation: "horizontal",   // horizontal|vertical
 *   variant: "underline",        // underline|pills|boxed|minimal
 *   closable: false,
 *   draggable: false,
 *   onChange: (tabId) => {},
 *   onClose: (tabId) => {},
 * })
 */
export class TabStrip {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			tabs: [],
			activeTab: null,
			orientation: "horizontal",
			variant: "underline",
			closable: false,
			draggable: false,
			onChange: null,
			onClose: null,
		}, opts);

		const wrap = document.createElement("div");
		wrap.className = `fv-tab-strip fv-tab-strip--${o.orientation} fv-tab-strip--${o.variant}`;

		const nav = document.createElement("div");
		nav.className = "fv-tab-strip__nav";
		nav.setAttribute("role", "tablist");

		const slider = document.createElement("div");
		slider.className = "fv-tab-strip__slider";
		nav.appendChild(slider);

		const content = document.createElement("div");
		content.className = "fv-tab-strip__content";

		let active = o.activeTab || (o.tabs[0] && o.tabs[0].id);

		function renderTab(tab) {
			const btn = document.createElement("button");
			btn.className = `fv-tab-strip__tab${tab.id === active ? " fv-tab-strip__tab--active" : ""}${tab.disabled ? " fv-tab-strip__tab--disabled" : ""}`;
			btn.setAttribute("role", "tab");
			btn.setAttribute("aria-selected", tab.id === active);
			btn.setAttribute("data-tab-id", tab.id);
			if (tab.disabled) btn.disabled = true;

			let inner = "";
			if (tab.icon) inner += `<span class="fv-tab-strip__icon">${tab.icon}</span>`;
			inner += `<span class="fv-tab-strip__label">${TabStrip._esc(tab.label)}</span>`;
			if (tab.badge !== undefined) inner += `<span class="fv-tab-strip__badge">${tab.badge}</span>`;
			if (o.closable) inner += `<span class="fv-tab-strip__close" data-close="${tab.id}">&times;</span>`;
			btn.innerHTML = inner;

			btn.onclick = () => {
				if (tab.disabled) return;
				setActive(tab.id);
			};

			if (o.closable) {
				const closeBtn = btn.querySelector(".fv-tab-strip__close");
				if (closeBtn) closeBtn.onclick = (e) => {
					e.stopPropagation();
					if (o.onClose) o.onClose(tab.id);
				};
			}

			return btn;
		}

		function renderContent(tab) {
			const panel = document.createElement("div");
			panel.className = `fv-tab-strip__panel${tab.id === active ? " fv-tab-strip__panel--active" : ""}`;
			panel.setAttribute("role", "tabpanel");
			panel.setAttribute("data-panel-id", tab.id);
			if (tab.content) {
				if (typeof tab.content === "string") panel.innerHTML = tab.content;
				else if (tab.content instanceof HTMLElement) panel.appendChild(tab.content);
			}
			return panel;
		}

		function updateSlider() {
			const activeBtn = nav.querySelector(".fv-tab-strip__tab--active");
			if (!activeBtn) return;
			if (o.orientation === "horizontal") {
				slider.style.width = activeBtn.offsetWidth + "px";
				slider.style.left = activeBtn.offsetLeft + "px";
				slider.style.top = "";
				slider.style.height = "";
			} else {
				slider.style.height = activeBtn.offsetHeight + "px";
				slider.style.top = activeBtn.offsetTop + "px";
				slider.style.width = "";
				slider.style.left = "";
			}
		}

		function setActive(tabId) {
			if (tabId === active) return;
			active = tabId;
			nav.querySelectorAll(".fv-tab-strip__tab").forEach(b => {
				const isActive = b.dataset.tabId === tabId;
				b.classList.toggle("fv-tab-strip__tab--active", isActive);
				b.setAttribute("aria-selected", isActive);
			});
			content.querySelectorAll(".fv-tab-strip__panel").forEach(p => {
				p.classList.toggle("fv-tab-strip__panel--active", p.dataset.panelId === tabId);
			});
			updateSlider();
			if (o.onChange) o.onChange(tabId);
		}

		function render() {
			nav.querySelectorAll(".fv-tab-strip__tab").forEach(t => t.remove());
			content.innerHTML = "";
			o.tabs.forEach(tab => {
				nav.appendChild(renderTab(tab));
				content.appendChild(renderContent(tab));
			});
			requestAnimationFrame(updateSlider);
		}

		render();
		wrap.appendChild(nav);
		wrap.appendChild(content);
		o.container.appendChild(wrap);

		// Keyboard navigation
		nav.addEventListener("keydown", (e) => {
			const tabs = [...nav.querySelectorAll(".fv-tab-strip__tab:not(:disabled)")];
			const idx = tabs.indexOf(document.activeElement);
			if (idx < 0) return;
			const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
			if (next) { e.preventDefault(); const ni = (idx + next + tabs.length) % tabs.length; tabs[ni].focus(); tabs[ni].click(); }
		});

		return {
			el: wrap,
			setActive,
			getActive: () => active,
			addTab(tab) { o.tabs.push(tab); render(); },
			removeTab(id) { o.tabs = o.tabs.filter(t => t.id !== id); if (active === id && o.tabs.length) setActive(o.tabs[0].id); render(); },
			updateBadge(id, val) { const t = o.tabs.find(t => t.id === id); if (t) { t.badge = val; render(); } },
			destroy() { wrap.remove(); },
		};
	}
}
