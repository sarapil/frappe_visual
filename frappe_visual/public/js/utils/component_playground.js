/**
 * Frappe Visual — Component Playground
 * ======================================
 * Interactive Storybook-like page for discovering, testing,
 * and previewing 307+ components with live prop editing.
 *
 * Access: /desk/visual-playground
 *
 * @module utils/component_playground
 * @since v0.2.0
 *
 * Features:
 *   - Component catalog with search & category filter
 *   - Live preview with prop editing
 *   - Code snippet generation
 *   - Dark/light theme toggle
 *   - Responsive preview (mobile/tablet/desktop)
 *   - Component API documentation panel
 */
(function () {
	"use strict";

	// ── Component Catalog ──────────────────────────────────────
	// Auto-populated from frappe.visual namespace
	function _buildCatalog() {
		const catalog = [];
		const skip = new Set([
			"responsive", "plugins", "drag", "eventBus", "deskWorkspace",
			"cytoscape", "ELK", "gsap", "Draggable", "lottie", "icons",
			"generator", "template", "formDashboard",
		]);

		if (!frappe.visual) return catalog;

		Object.keys(frappe.visual).forEach((key) => {
			if (skip.has(key)) return;
			const val = frappe.visual[key];
			if (typeof val !== "function" && typeof val?.create !== "function") return;

			// Categorize by wave/type
			const meta = frappe.visual.plugins?.getMeta(key) || {};
			catalog.push({
				name: key,
				category: meta.category || _guessCategory(key),
				description: meta.description || "",
				hasCreate: typeof val?.create === "function" || typeof val === "function",
			});
		});

		catalog.sort((a, b) => a.name.localeCompare(b.name));
		return catalog;
	}

	function _guessCategory(name) {
		const n = name.toLowerCase();
		if (/chart|graph|spark|heat|donut|funnel|radar|sankey|treemap|sunburst|area|bullet|waterfall|gauge/i.test(n)) return "chart";
		if (/form|input|select|picker|slider|toggle|rating|otp|pin|signature|chip|currency|cron|tag/i.test(n)) return "input";
		if (/table|grid|virtual|column|row|cell|sortable.*header|spread|filter.*bar/i.test(n)) return "table";
		if (/nav|bread|tab|stepper|anchor|bottom|speed|float.*nav|command|rail|dock/i.test(n)) return "navigation";
		if (/toast|alert|banner|snack|dialog|popover|drawer|confirm|notification|progress.*modal|callout/i.test(n)) return "feedback";
		if (/scene|room|frame|desk|shelf|board|widget|lighting|preset/i.test(n)) return "scene";
		if (/kanban|calendar|gantt|tree|map|gallery|dashboard|timeline|workflow/i.test(n)) return "visualization";
		if (/image|video|audio|media|pdf|code.*editor|markdown|emoji|avatar|carousel|lightbox/i.test(n)) return "media";
		if (/a11y|screen.*reader|reduced|high.*contrast|font.*scaler|keyboard.*nav|aria|rtl|lang/i.test(n)) return "accessibility";
		if (/presence|cursor|comment|reaction|mention|change.*tracker|approval|share/i.test(n)) return "collaboration";
		if (/skeleton|shimmer|loading|lazy|placeholder|content.*loader|infinite/i.test(n)) return "loading";
		if (/state|event|store|computed|validator|conditional|feature.*flag|debug|perf/i.test(n)) return "state";
		return "component";
	}

	const CATEGORY_ICONS = {
		chart: "chart-line",
		input: "forms",
		table: "table",
		navigation: "compass",
		feedback: "bell",
		scene: "3d-cube-sphere",
		visualization: "eye",
		media: "photo",
		accessibility: "accessible",
		collaboration: "users-group",
		loading: "loader",
		state: "database",
		component: "puzzle",
		custom: "star",
	};

	const CATEGORY_COLORS = {
		chart: "#6366f1",
		input: "#10b981",
		table: "#f59e0b",
		navigation: "#3b82f6",
		feedback: "#ef4444",
		scene: "#8b5cf6",
		visualization: "#06b6d4",
		media: "#ec4899",
		accessibility: "#14b8a6",
		collaboration: "#f97316",
		loading: "#64748b",
		state: "#a855f7",
		component: "#6366f1",
		custom: "#84cc16",
	};

	// ── Playground Page ────────────────────────────────────────

	function _renderPlayground(wrapper) {
		const catalog = _buildCatalog();
		const categories = [...new Set(catalog.map((c) => c.category))].sort();

		wrapper.innerHTML = "";
		wrapper.className = "fv-playground";

		// ── Layout ──
		const layout = document.createElement("div");
		layout.className = "fv-playground__layout";

		// Sidebar
		const sidebar = document.createElement("div");
		sidebar.className = "fv-playground__sidebar";
		sidebar.innerHTML = `
			<div class="fv-playground__header">
				<h3>⬡ ${frappe._("Component Playground")}</h3>
				<span class="fv-playground__count">${catalog.length} ${frappe._("components")}</span>
			</div>
			<div class="fv-playground__search">
				<input type="search" placeholder="${frappe._("Search components...")}"
					class="fv-playground__search-input" />
			</div>
			<div class="fv-playground__categories"></div>
			<div class="fv-playground__list"></div>
		`;

		// Main area
		const main = document.createElement("div");
		main.className = "fv-playground__main";
		main.innerHTML = `
			<div class="fv-playground__toolbar">
				<div class="fv-playground__toolbar-left">
					<span class="fv-playground__component-name">${frappe._("Select a component")}</span>
				</div>
				<div class="fv-playground__toolbar-right">
					<button class="btn btn-xs fv-pg-viewport" data-vp="mobile" title="${frappe._("Mobile")}">📱</button>
					<button class="btn btn-xs fv-pg-viewport" data-vp="tablet" title="${frappe._("Tablet")}">📋</button>
					<button class="btn btn-xs fv-pg-viewport active" data-vp="desktop" title="${frappe._("Desktop")}">🖥️</button>
					<button class="btn btn-xs fv-pg-theme" title="${frappe._("Toggle theme")}">🌓</button>
				</div>
			</div>
			<div class="fv-playground__preview-wrapper">
				<div class="fv-playground__preview"></div>
			</div>
			<div class="fv-playground__panels">
				<div class="fv-playground__panel fv-playground__props">
					<h4>⚙️ ${frappe._("Properties")}</h4>
					<div class="fv-playground__props-content">
						<p class="text-muted">${frappe._("Select a component to see its properties")}</p>
					</div>
				</div>
				<div class="fv-playground__panel fv-playground__code">
					<h4>📋 ${frappe._("Code")}</h4>
					<pre class="fv-playground__code-block"><code>${frappe._("// Select a component to see usage code")}</code></pre>
					<button class="btn btn-xs btn-default fv-pg-copy">${frappe._("Copy")}</button>
				</div>
			</div>
		`;

		layout.appendChild(sidebar);
		layout.appendChild(main);
		wrapper.appendChild(layout);

		// ── Category Chips ──
		const catContainer = sidebar.querySelector(".fv-playground__categories");
		let activeCategory = null;

		const allChip = document.createElement("button");
		allChip.className = "fv-playground__cat-chip active";
		allChip.textContent = frappe._("All");
		allChip.dataset.cat = "";
		catContainer.appendChild(allChip);

		categories.forEach((cat) => {
			const chip = document.createElement("button");
			chip.className = "fv-playground__cat-chip";
			chip.dataset.cat = cat;
			const count = catalog.filter((c) => c.category === cat).length;
			chip.innerHTML = `<span style="color:${CATEGORY_COLORS[cat] || "#999"}">${cat}</span> <small>(${count})</small>`;
			catContainer.appendChild(chip);
		});

		catContainer.addEventListener("click", (e) => {
			const chip = e.target.closest(".fv-playground__cat-chip");
			if (!chip) return;
			catContainer.querySelectorAll(".fv-playground__cat-chip").forEach((c) => c.classList.remove("active"));
			chip.classList.add("active");
			activeCategory = chip.dataset.cat || null;
			filterList();
		});

		// ── Component List ──
		const listContainer = sidebar.querySelector(".fv-playground__list");

		function renderList(items) {
			listContainer.innerHTML = "";
			items.forEach((item) => {
				const el = document.createElement("div");
				el.className = "fv-playground__list-item";
				el.dataset.name = item.name;
				const color = CATEGORY_COLORS[item.category] || "#999";
				el.innerHTML = `
					<span class="fv-playground__list-dot" style="background:${color}"></span>
					<span class="fv-playground__list-name">${item.name}</span>
					<small class="fv-playground__list-cat">${item.category}</small>
				`;
				listContainer.appendChild(el);
			});
		}

		const searchInput = sidebar.querySelector(".fv-playground__search-input");
		function filterList() {
			const query = (searchInput.value || "").toLowerCase().trim();
			const filtered = catalog.filter((c) => {
				if (activeCategory && c.category !== activeCategory) return false;
				if (query && !c.name.toLowerCase().includes(query)) return false;
				return true;
			});
			renderList(filtered);
		}

		searchInput.addEventListener("input", frappe.utils.debounce(filterList, 200));
		filterList();

		// ── Component Selection ──
		let _activeComponent = null;

		listContainer.addEventListener("click", (e) => {
			const item = e.target.closest(".fv-playground__list-item");
			if (!item) return;
			listContainer.querySelectorAll(".fv-playground__list-item").forEach((i) => i.classList.remove("active"));
			item.classList.add("active");
			_activeComponent = item.dataset.name;
			_loadComponent(_activeComponent, main);
		});

		// ── Viewport Buttons ──
		const previewWrapper = main.querySelector(".fv-playground__preview-wrapper");
		main.querySelectorAll(".fv-pg-viewport").forEach((btn) => {
			btn.addEventListener("click", () => {
				main.querySelectorAll(".fv-pg-viewport").forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");
				const vp = btn.dataset.vp;
				previewWrapper.className = "fv-playground__preview-wrapper";
				if (vp === "mobile") {
					previewWrapper.style.maxWidth = "375px";
					previewWrapper.style.margin = "0 auto";
				} else if (vp === "tablet") {
					previewWrapper.style.maxWidth = "768px";
					previewWrapper.style.margin = "0 auto";
				} else {
					previewWrapper.style.maxWidth = "";
					previewWrapper.style.margin = "";
				}
			});
		});

		// ── Theme Toggle ──
		main.querySelector(".fv-pg-theme").addEventListener("click", () => {
			const preview = main.querySelector(".fv-playground__preview");
			preview.classList.toggle("fv-pg-dark");
		});

		// ── Copy Button ──
		main.querySelector(".fv-pg-copy").addEventListener("click", () => {
			const code = main.querySelector(".fv-playground__code-block code").textContent;
			navigator.clipboard.writeText(code).then(() => {
				frappe.show_alert({ message: frappe._("Copied!"), indicator: "green" }, 2);
			});
		});
	}

	function _loadComponent(name, main) {
		const preview = main.querySelector(".fv-playground__preview");
		const nameEl = main.querySelector(".fv-playground__component-name");
		const propsContent = main.querySelector(".fv-playground__props-content");
		const codeBlock = main.querySelector(".fv-playground__code-block code");

		nameEl.textContent = name;
		preview.innerHTML = "";

		const Constructor = frappe.visual[name];
		if (!Constructor) {
			preview.innerHTML = `<div class="text-muted p-4">${frappe._("Component not found on frappe.visual namespace")}</div>`;
			return;
		}

		// Try to instantiate with default config
		const container = document.createElement("div");
		container.className = "fv-playground__component-container";
		container.style.padding = "20px";
		preview.appendChild(container);

		const sampleConfig = _getSampleConfig(name);

		try {
			if (typeof Constructor.create === "function") {
				Constructor.create(container, sampleConfig);
			} else if (typeof Constructor === "function") {
				new Constructor(container, sampleConfig);
			}
		} catch (e) {
			container.innerHTML = `
				<div class="fv-playground__error">
					<strong>${frappe._("Render Error")}:</strong>
					<pre>${e.message}</pre>
					<small>${frappe._("This component may require specific initialization parameters.")}</small>
				</div>
			`;
		}

		// Generate props panel
		_renderPropsPanel(name, sampleConfig, propsContent, () => {
			// Re-render on prop change
			_loadComponent(name, main);
		});

		// Generate code snippet
		const configStr = JSON.stringify(sampleConfig, null, 2);
		codeBlock.textContent = `// Create ${name}\nfrappe.require("frappe_visual.bundle.js", () => {\n  frappe.visual.${name}.create(container, ${configStr});\n});`;
	}

	function _renderPropsPanel(name, config, container, onChange) {
		container.innerHTML = "";

		if (!config || Object.keys(config).length === 0) {
			container.innerHTML = `<p class="text-muted">${frappe._("No configurable properties detected")}</p>`;
			return;
		}

		Object.entries(config).forEach(([key, value]) => {
			const row = document.createElement("div");
			row.className = "fv-playground__prop-row";

			const label = document.createElement("label");
			label.textContent = key;
			label.className = "fv-playground__prop-label";
			row.appendChild(label);

			let input;
			if (typeof value === "boolean") {
				input = document.createElement("input");
				input.type = "checkbox";
				input.checked = value;
				input.addEventListener("change", () => { config[key] = input.checked; });
			} else if (typeof value === "number") {
				input = document.createElement("input");
				input.type = "number";
				input.value = value;
				input.addEventListener("input", () => { config[key] = parseFloat(input.value) || 0; });
			} else if (typeof value === "string") {
				if (value.startsWith("#") && value.length <= 9) {
					input = document.createElement("input");
					input.type = "color";
					input.value = value;
					input.addEventListener("input", () => { config[key] = input.value; });
				} else {
					input = document.createElement("input");
					input.type = "text";
					input.value = value;
					input.addEventListener("input", () => { config[key] = input.value; });
				}
			} else if (Array.isArray(value)) {
				input = document.createElement("textarea");
				input.rows = 3;
				input.value = JSON.stringify(value, null, 1);
				input.addEventListener("input", () => {
					try { config[key] = JSON.parse(input.value); } catch (_) { /* ignore */ }
				});
			} else {
				input = document.createElement("span");
				input.className = "text-muted";
				input.textContent = typeof value;
			}

			input.className = "fv-playground__prop-input";
			row.appendChild(input);
			container.appendChild(row);
		});
	}

	function _getSampleConfig(name) {
		// Sensible defaults per component type
		const lower = name.toLowerCase();

		if (/chart|sparkline|gauge|funnel|radar|donut|area|bullet|waterfall|sankey|treemap|sunburst|heatmap/i.test(lower)) {
			return {
				title: `${name} Demo`,
				data: [
					{ label: "Jan", value: 42 },
					{ label: "Feb", value: 58 },
					{ label: "Mar", value: 35 },
					{ label: "Apr", value: 71 },
					{ label: "May", value: 63 },
				],
				color: "#6366f1",
				animated: true,
			};
		}

		if (/kanban/i.test(lower)) {
			return {
				columns: [
					{ title: "To Do", cards: [{ title: "Task 1" }, { title: "Task 2" }] },
					{ title: "In Progress", cards: [{ title: "Task 3" }] },
					{ title: "Done", cards: [{ title: "Task 4" }] },
				],
			};
		}

		if (/table|grid|spread/i.test(lower)) {
			return {
				columns: [
					{ label: "Name", fieldname: "name", width: 200 },
					{ label: "Status", fieldname: "status", width: 120 },
					{ label: "Amount", fieldname: "amount", width: 100 },
				],
				data: [
					{ name: "Item A", status: "Active", amount: 1200 },
					{ name: "Item B", status: "Pending", amount: 850 },
					{ name: "Item C", status: "Closed", amount: 2300 },
				],
			};
		}

		if (/toast|alert|banner|snack|callout/i.test(lower)) {
			return { message: `This is a ${name} demo`, type: "info", dismissible: true };
		}

		if (/badge|status|dot/i.test(lower)) {
			return { label: "Active", color: "#10b981" };
		}

		return {
			title: `${name} Demo`,
			description: `Interactive preview of ${name}`,
		};
	}

	// ── Page Registration ──────────────────────────────────────

	function initPlaygroundPage() {
		// Register as a Frappe page
		if (typeof frappe.pages === "undefined") return;

		frappe.pages["visual-playground"] = {
			onload(wrapper) {
				frappe.require("frappe_visual.bundle.js", () => {
					_renderPlayground(wrapper);
				});
			},
		};

		// Also expose as API
		frappe.provide("frappe.visual.playground");
		frappe.visual.playground.open = function () {
			frappe.set_route("visual-playground");
		};
		frappe.visual.playground.render = _renderPlayground;
		frappe.visual.playground.catalog = _buildCatalog;
	}

	// Initialize when page system is ready
	$(document).ready(() => {
		setTimeout(initPlaygroundPage, 100);
	});
})();
