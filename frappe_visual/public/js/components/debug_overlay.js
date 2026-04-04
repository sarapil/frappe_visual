/**
 * DebugOverlay — Developer debug overlay with live state inspection
 *
 * frappe.visual.DebugOverlay.create({
 *   container: document.body,
 *   position: "bottom-right",    // top-left|top-right|bottom-left|bottom-right
 *   collapsed: true,
 *   panels: [
 *     { id:"state", title:"State", render:(el) => { el.textContent = JSON.stringify(myStore.getState()); } },
 *     { id:"events", title:"Events", render:(el) => { ... } },
 *   ],
 *   hotkey: "ctrl+shift+d",
 *   showFPS: true,
 *   showMemory: true,
 *   showNetwork: false,
 *   theme: "dark",
 * })
 */
export class DebugOverlay {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			position: "bottom-right",
			collapsed: true,
			panels: [],
			hotkey: "ctrl+shift+d",
			showFPS: true,
			showMemory: true,
			showNetwork: false,
			theme: "dark",
			maxLogs: 200,
		}, opts);

		const overlay = document.createElement("div");
		overlay.className = `fv-debug-overlay fv-debug-overlay--${o.position} fv-debug-overlay--${o.theme}`;
		if (o.collapsed) overlay.classList.add("fv-debug-overlay--collapsed");

		// Header
		const header = document.createElement("div");
		header.className = "fv-debug-overlay__header";
		header.innerHTML = `
			<span class="fv-debug-overlay__title">🔧 Debug</span>
			<span class="fv-debug-overlay__metrics"></span>
			<button class="fv-debug-overlay__toggle">${o.collapsed ? "▲" : "▼"}</button>
		`;
		header.querySelector(".fv-debug-overlay__toggle").onclick = () => {
			const c = overlay.classList.toggle("fv-debug-overlay--collapsed");
			header.querySelector(".fv-debug-overlay__toggle").textContent = c ? "▲" : "▼";
		};
		overlay.appendChild(header);

		// Body
		const body = document.createElement("div");
		body.className = "fv-debug-overlay__body";

		// Tab bar for panels
		const tabs = document.createElement("div");
		tabs.className = "fv-debug-overlay__tabs";

		const panels = document.createElement("div");
		panels.className = "fv-debug-overlay__panels";

		// Console log panel
		const consoleLogs = [];
		const consolePanel = document.createElement("div");
		consolePanel.className = "fv-debug-overlay__panel fv-debug-overlay__panel--active";
		consolePanel.dataset.panelId = "_console";

		const consoleTab = document.createElement("button");
		consoleTab.className = "fv-debug-overlay__tab fv-debug-overlay__tab--active";
		consoleTab.textContent = "Console";
		consoleTab.dataset.tabId = "_console";
		tabs.appendChild(consoleTab);
		panels.appendChild(consolePanel);

		// Custom panels
		o.panels.forEach(p => {
			const tab = document.createElement("button");
			tab.className = "fv-debug-overlay__tab";
			tab.textContent = p.title;
			tab.dataset.tabId = p.id;
			tabs.appendChild(tab);

			const panel = document.createElement("div");
			panel.className = "fv-debug-overlay__panel";
			panel.dataset.panelId = p.id;
			if (p.render) p.render(panel);
			panels.appendChild(panel);
		});

		// Tab switching
		tabs.addEventListener("click", (e) => {
			const tab = e.target.closest(".fv-debug-overlay__tab");
			if (!tab) return;
			tabs.querySelectorAll(".fv-debug-overlay__tab").forEach(t => t.classList.remove("fv-debug-overlay__tab--active"));
			panels.querySelectorAll(".fv-debug-overlay__panel").forEach(p => p.classList.remove("fv-debug-overlay__panel--active"));
			tab.classList.add("fv-debug-overlay__tab--active");
			const panel = panels.querySelector(`[data-panel-id="${tab.dataset.tabId}"]`);
			if (panel) panel.classList.add("fv-debug-overlay__panel--active");
		});

		body.appendChild(tabs);
		body.appendChild(panels);
		overlay.appendChild(body);

		// FPS / Memory metrics
		let fpsFrames = 0, fpsLast = performance.now(), fpsVal = 0;
		const metricsEl = header.querySelector(".fv-debug-overlay__metrics");

		function updateMetrics() {
			fpsFrames++;
			const now = performance.now();
			if (now - fpsLast >= 1000) {
				fpsVal = Math.round(fpsFrames * 1000 / (now - fpsLast));
				fpsFrames = 0;
				fpsLast = now;
			}

			let text = "";
			if (o.showFPS) text += `${fpsVal} FPS`;
			if (o.showMemory && performance.memory) {
				const mb = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
				text += `${text ? " · " : ""}${mb} MB`;
			}
			metricsEl.textContent = text;
			animId = requestAnimationFrame(updateMetrics);
		}

		let animId = requestAnimationFrame(updateMetrics);

		// Hotkey
		const hotkeyParts = o.hotkey.split("+").map(s => s.trim().toLowerCase());
		const onKey = (e) => {
			const match = hotkeyParts.every(k => {
				if (k === "ctrl") return e.ctrlKey;
				if (k === "shift") return e.shiftKey;
				if (k === "alt") return e.altKey;
				if (k === "meta") return e.metaKey;
				return e.key.toLowerCase() === k;
			});
			if (match) {
				e.preventDefault();
				overlay.classList.toggle("fv-debug-overlay--collapsed");
			}
		};
		document.addEventListener("keydown", onKey);

		o.container.appendChild(overlay);

		return {
			el: overlay,
			log(msg, type = "info") {
				const entry = document.createElement("div");
				entry.className = `fv-debug-overlay__log fv-debug-overlay__log--${type}`;
				entry.textContent = `[${new Date().toLocaleTimeString()}] ${typeof msg === "object" ? JSON.stringify(msg) : msg}`;
				consolePanel.appendChild(entry);
				consoleLogs.push(entry);
				if (consoleLogs.length > o.maxLogs) { consoleLogs.shift()?.remove(); }
				consolePanel.scrollTop = consolePanel.scrollHeight;
			},
			clear() { consolePanel.innerHTML = ""; consoleLogs.length = 0; },
			toggle() { overlay.classList.toggle("fv-debug-overlay--collapsed"); },
			show() { overlay.classList.remove("fv-debug-overlay--collapsed"); },
			hide() { overlay.classList.add("fv-debug-overlay--collapsed"); },
			refreshPanel(id) { const p = o.panels.find(p => p.id === id); if (p?.render) { const el = panels.querySelector(`[data-panel-id="${id}"]`); if (el) { el.innerHTML = ""; p.render(el); } } },
			destroy() { cancelAnimationFrame(animId); document.removeEventListener("keydown", onKey); overlay.remove(); },
		};
	}
}
