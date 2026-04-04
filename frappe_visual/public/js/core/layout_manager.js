// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * LayoutManager — Multi-layout Support with ELK.js
 * ===================================================
 * Provides advanced layout algorithms and switching UI.
 */

export class LayoutManager {
	static LAYOUTS = {
		"fcose": { label: "Force (Smart)", icon: "🌐", group: "force" },
		"elk-layered": { label: "Hierarchical", icon: "📐", group: "hierarchical" },
		"elk-mrtree": { label: "Tree", icon: "🌳", group: "hierarchical" },
		"elk-stress": { label: "Stress", icon: "🔄", group: "force" },
		"elk-radial": { label: "Radial", icon: "◎", group: "radial" },
		"breadthfirst": { label: "Breadth-first", icon: "📊", group: "hierarchical" },
		"circle": { label: "Circle", icon: "⭕", group: "radial" },
		"concentric": { label: "Concentric", icon: "🎯", group: "radial" },
		"grid": { label: "Grid", icon: "▦", group: "grid" },
	};

	/**
	 * Create a layout switcher toolbar.
	 * @param {HTMLElement} container - Where to place the toolbar
	 * @param {GraphEngine} engine - The graph engine to control
	 * @param {string} [activeLayout] - Currently active layout
	 */
	static createToolbar(container, engine, activeLayout = "fcose") {
		const toolbar = document.createElement("div");
		toolbar.className = "fv-layout-toolbar";

		const groups = {};
		Object.entries(LayoutManager.LAYOUTS).forEach(([key, config]) => {
			if (!groups[config.group]) groups[config.group] = [];
			groups[config.group].push({ key, ...config });
		});

		Object.entries(groups).forEach(([groupName, layouts]) => {
			const group = document.createElement("div");
			group.className = "fv-layout-group";

			layouts.forEach(({ key, label, icon }) => {
				const btn = document.createElement("button");
				btn.className = `fv-layout-btn ${key === activeLayout ? "active" : ""}`;
				btn.title = label;
				btn.innerHTML = `<span class="fv-layout-icon">${icon}</span><span class="fv-layout-label">${label}</span>`;

				btn.addEventListener("click", () => {
					toolbar.querySelectorAll(".fv-layout-btn").forEach((b) =>
						b.classList.remove("active")
					);
					btn.classList.add("active");

					if (engine.animEngine) {
						engine.animEngine.animateLayoutTransition(() => {
							engine.runLayout(key);
						});
					} else {
						engine.runLayout(key);
					}
				});

				group.appendChild(btn);
			});

			toolbar.appendChild(group);
		});

		container.appendChild(toolbar);
		return toolbar;
	}

	/**
	 * Create a search + filter bar.
	 * @param {HTMLElement} container
	 * @param {GraphEngine} engine
	 * @param {Array} nodeTypes - Available types for filtering
	 */
	static createSearchBar(container, engine, nodeTypes = []) {
		const bar = document.createElement("div");
		bar.className = "fv-search-bar";
		bar.innerHTML = `
			<div class="fv-search-input-wrap">
				<svg class="fv-search-icon" viewBox="0 0 24 24" width="16" height="16">
					<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
					<line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/>
				</svg>
				<input type="text" class="fv-search-input" placeholder="${__("Search nodes...")}">
				<button class="fv-search-clear" style="display:none">✕</button>
			</div>
			${
				nodeTypes.length > 0
					? `<select class="fv-type-filter">
					<option value="">${__("All types")}</option>
					${nodeTypes.map((t) => `<option value="${t}">${t}</option>`).join("")}
				</select>`
					: ""
			}
		`;

		const input = bar.querySelector(".fv-search-input");
		const clearBtn = bar.querySelector(".fv-search-clear");
		const typeFilter = bar.querySelector(".fv-type-filter");

		let debounce;
		input.addEventListener("input", () => {
			clearTimeout(debounce);
			clearBtn.style.display = input.value ? "" : "none";
			debounce = setTimeout(() => engine.search(input.value), 250);
		});

		clearBtn.addEventListener("click", () => {
			input.value = "";
			clearBtn.style.display = "none";
			engine.clearFilter();
		});

		if (typeFilter) {
			typeFilter.addEventListener("change", () => {
				engine.filterByType(typeFilter.value);
			});
		}

		container.appendChild(bar);
		return bar;
	}

	/**
	 * Create viewport controls (zoom, fit, export).
	 * @param {HTMLElement} container
	 * @param {GraphEngine} engine
	 */
	static createViewControls(container, engine) {
		const controls = document.createElement("div");
		controls.className = "fv-view-controls";
		controls.innerHTML = `
			<button class="fv-ctrl-btn" data-action="zoom-in" title="${__("Zoom In")}">＋</button>
			<button class="fv-ctrl-btn" data-action="zoom-out" title="${__("Zoom Out")}">－</button>
			<button class="fv-ctrl-btn" data-action="fit" title="${__("Fit to View")}">⊞</button>
			<button class="fv-ctrl-btn" data-action="export-svg" title="${__("Export SVG")}">📄</button>
			<button class="fv-ctrl-btn" data-action="export-png" title="${__("Export PNG")}">🖼️</button>
		`;

		controls.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-action]");
			if (!btn) return;

			switch (btn.dataset.action) {
				case "zoom-in":
					engine.zoomIn();
					break;
				case "zoom-out":
					engine.zoomOut();
					break;
				case "fit":
					engine.fit();
					break;
				case "export-svg":
					LayoutManager._downloadSVG(engine);
					break;
				case "export-png":
					LayoutManager._downloadPNG(engine);
					break;
			}
		});

		container.appendChild(controls);
		return controls;
	}

	static _downloadSVG(engine) {
		const svg = engine.toSVG();
		const blob = new Blob([svg], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "visual-graph.svg";
		a.click();
		URL.revokeObjectURL(url);
	}

	static _downloadPNG(engine) {
		const dataUrl = engine.toPNG();
		const a = document.createElement("a");
		a.href = dataUrl;
		a.download = "visual-graph.png";
		a.click();
	}
}
