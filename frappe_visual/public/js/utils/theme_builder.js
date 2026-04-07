/**
 * Frappe Visual — Visual Theme Builder
 * ======================================
 * Live CSS variable editor for creating and previewing themes.
 * Generates complete theme definitions that can be saved/shared.
 *
 * @module utils/theme_builder
 * @since v0.2.0
 *
 * Usage:
 *   frappe.visual.themeBuilder.open()
 *   frappe.visual.themeBuilder.apply("my-theme")
 *   frappe.visual.themeBuilder.save({ name: "custom-dark" })
 */
(function () {
	"use strict";

	// ── Theme Token Categories ─────────────────────────────────
	const TOKEN_GROUPS = [
		{
			label: __("Brand Colors"),
			key: "brand",
			tokens: [
				{ name: "--primary", label: __("Primary"), type: "color", default: "#6366f1" },
				{ name: "--primary-light", label: __("Primary Light"), type: "color", default: "#818cf8" },
				{ name: "--primary-dark", label: __("Primary Dark"), type: "color", default: "#4f46e5" },
				{ name: "--secondary", label: __("Secondary"), type: "color", default: "#64748b" },
				{ name: "--accent", label: __("Accent"), type: "color", default: "#f59e0b" },
			],
		},
		{
			label: __("Surface Colors"),
			key: "surface",
			tokens: [
				{ name: "--bg-color", label: __("Background"), type: "color", default: "#f8fafc" },
				{ name: "--fg-color", label: __("Foreground"), type: "color", default: "#ffffff" },
				{ name: "--subtle-fg", label: __("Subtle Background"), type: "color", default: "#f1f5f9" },
				{ name: "--border-color", label: __("Border"), type: "color", default: "#e2e8f0" },
				{ name: "--shadow-color", label: __("Shadow"), type: "color", default: "rgba(0,0,0,0.08)" },
			],
		},
		{
			label: __("Typography"),
			key: "typography",
			tokens: [
				{ name: "--text-color", label: __("Text"), type: "color", default: "#1e293b" },
				{ name: "--text-muted", label: __("Muted Text"), type: "color", default: "#64748b" },
				{ name: "--text-light", label: __("Light Text"), type: "color", default: "#94a3b8" },
				{ name: "--font-stack", label: __("Font Family"), type: "text", default: "Inter, system-ui, sans-serif" },
				{ name: "--font-size-base", label: __("Base Size"), type: "range", default: "14", min: 12, max: 20, unit: "px" },
			],
		},
		{
			label: __("Spacing & Radius"),
			key: "spacing",
			tokens: [
				{ name: "--border-radius", label: __("Border Radius"), type: "range", default: "8", min: 0, max: 24, unit: "px" },
				{ name: "--border-radius-sm", label: __("Radius Small"), type: "range", default: "4", min: 0, max: 12, unit: "px" },
				{ name: "--border-radius-lg", label: __("Radius Large"), type: "range", default: "12", min: 0, max: 32, unit: "px" },
				{ name: "--spacing-unit", label: __("Spacing Unit"), type: "range", default: "8", min: 4, max: 16, unit: "px" },
			],
		},
		{
			label: __("Status Colors"),
			key: "status",
			tokens: [
				{ name: "--green-500", label: __("Success"), type: "color", default: "#22c55e" },
				{ name: "--red-500", label: __("Error"), type: "color", default: "#ef4444" },
				{ name: "--yellow-500", label: __("Warning"), type: "color", default: "#eab308" },
				{ name: "--blue-500", label: __("Info"), type: "color", default: "#3b82f6" },
			],
		},
	];

	// ── Predefined Themes ──────────────────────────────────────
	const BUILTIN_THEMES = {
		"arkan-default": {
			label: __("Arkan Default"),
			tokens: {}, // uses all defaults
		},
		"arkan-dark": {
			label: __("Arkan Dark"),
			tokens: {
				"--bg-color": "#0f172a",
				"--fg-color": "#1e293b",
				"--subtle-fg": "#1e293b",
				"--border-color": "#334155",
				"--text-color": "#e2e8f0",
				"--text-muted": "#94a3b8",
				"--text-light": "#64748b",
				"--shadow-color": "rgba(0,0,0,0.3)",
			},
		},
		"ocean-breeze": {
			label: __("Ocean Breeze"),
			tokens: {
				"--primary": "#0ea5e9",
				"--primary-light": "#38bdf8",
				"--primary-dark": "#0284c7",
				"--accent": "#06b6d4",
				"--bg-color": "#f0f9ff",
			},
		},
		"sunset-warm": {
			label: __("Sunset Warm"),
			tokens: {
				"--primary": "#f97316",
				"--primary-light": "#fb923c",
				"--primary-dark": "#ea580c",
				"--accent": "#ef4444",
				"--bg-color": "#fffbeb",
			},
		},
		"forest-green": {
			label: __("Forest Green"),
			tokens: {
				"--primary": "#059669",
				"--primary-light": "#34d399",
				"--primary-dark": "#047857",
				"--accent": "#84cc16",
				"--bg-color": "#f0fdf4",
			},
		},
	};

	// ── State ──────────────────────────────────────────────────
	let _activeTheme = "arkan-default";
	let _customTokens = {};    // Current edits: { varName: value }
	let _savedThemes = {};     // User-saved themes
	let _container = null;
	let _styleEl = null;

	// ── Theme Application ──────────────────────────────────────

	function _getStyleElement() {
		if (_styleEl) return _styleEl;
		_styleEl = document.createElement("style");
		_styleEl.id = "fv-theme-builder";
		document.head.appendChild(_styleEl);
		return _styleEl;
	}

	/**
	 * Apply a set of CSS variable overrides to :root.
	 * @param {Object} tokens - { "--var-name": "value" }
	 */
	function _applyTokens(tokens) {
		const style = _getStyleElement();
		const rules = Object.entries(tokens)
			.map(([k, v]) => `  ${k}: ${v};`)
			.join("\n");
		style.textContent = `:root {\n${rules}\n}`;
	}

	/**
	 * Apply a named theme.
	 * @param {string} themeName
	 */
	function applyTheme(themeName) {
		const builtin = BUILTIN_THEMES[themeName];
		const saved = _savedThemes[themeName];
		const theme = builtin || saved;

		if (!theme) {
			console.warn(`[FV Theme] Unknown theme: ${themeName}`);
			return;
		}

		_activeTheme = themeName;
		_customTokens = { ...theme.tokens };
		_applyTokens(_customTokens);
		_emit("theme:applied", { name: themeName });
	}

	/**
	 * Reset to Frappe defaults (remove overrides).
	 */
	function resetTheme() {
		const style = _getStyleElement();
		style.textContent = "";
		_activeTheme = "arkan-default";
		_customTokens = {};
		_emit("theme:reset");
	}

	/**
	 * Set a single token value live.
	 * @param {string} name - CSS variable name
	 * @param {string} value
	 */
	function setToken(name, value) {
		_customTokens[name] = value;
		document.documentElement.style.setProperty(name, value);
	}

	// ── Theme Persistence ──────────────────────────────────────

	/**
	 * Save current custom tokens as a named theme.
	 * @param {Object} options - { name, label }
	 * @returns {Object} saved theme
	 */
	function saveTheme(options = {}) {
		const name = options.name || `custom-${Date.now()}`;
		const label = options.label || name;

		const theme = {
			label,
			tokens: { ..._customTokens },
			createdAt: new Date().toISOString(),
		};

		_savedThemes[name] = theme;
		_persistSavedThemes();
		_emit("theme:saved", { name, label });

		frappe.toast({ message: __("Theme saved: {0}", [label]), indicator: "green" });
		return theme;
	}

	/**
	 * Delete a saved theme.
	 * @param {string} name
	 */
	function deleteTheme(name) {
		if (BUILTIN_THEMES[name]) {
			frappe.toast({ message: __("Cannot delete built-in themes"), indicator: "orange" });
			return;
		}
		delete _savedThemes[name];
		_persistSavedThemes();
		_emit("theme:deleted", { name });
	}

	/**
	 * Export theme as JSON.
	 * @param {string} [name] - Theme name (defaults to current)
	 * @returns {string} JSON string
	 */
	function exportTheme(name) {
		const tokens = name
			? (BUILTIN_THEMES[name]?.tokens || _savedThemes[name]?.tokens || {})
			: _customTokens;

		const json = JSON.stringify({
			name: name || _activeTheme,
			version: "1.0",
			tokens,
			exportedAt: new Date().toISOString(),
		}, null, 2);

		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `fv-theme-${name || _activeTheme}.json`;
		a.click();
		URL.revokeObjectURL(url);

		return json;
	}

	/**
	 * Import theme from JSON.
	 * @param {string|Object} data - JSON string or parsed object
	 */
	function importTheme(data) {
		const theme = typeof data === "string" ? JSON.parse(data) : data;
		if (!theme.name || !theme.tokens) {
			frappe.toast({ message: __("Invalid theme file"), indicator: "red" });
			return;
		}

		_savedThemes[theme.name] = {
			label: theme.name,
			tokens: theme.tokens,
			createdAt: theme.exportedAt || new Date().toISOString(),
		};
		_persistSavedThemes();
		frappe.toast({ message: __("Theme imported: {0}", [theme.name]), indicator: "green" });
	}

	function _persistSavedThemes() {
		try {
			localStorage.setItem("fv_custom_themes", JSON.stringify(_savedThemes));
		} catch (e) {
			console.warn("[FV Theme] Cannot persist themes:", e);
		}
	}

	function _loadSavedThemes() {
		try {
			const stored = localStorage.getItem("fv_custom_themes");
			if (stored) _savedThemes = JSON.parse(stored);
		} catch (e) {
			/* ignore */
		}
	}

	// ── Theme Builder UI ───────────────────────────────────────

	/**
	 * Open the visual theme builder panel.
	 */
	function openBuilder() {
		const floatingWindow = frappe.visual.floatingWindow || frappe.visual.FloatingWindow;
		if (!floatingWindow) {
			frappe.msgprint(__("FloatingWindow component required"));
			return;
		}

		const container = document.createElement("div");
		container.className = "fv-theme-builder";
		_container = container;

		_renderBuilder(container);

		if (typeof floatingWindow === "function") {
			floatingWindow({
				title: __("Theme Builder"),
				content: container,
				width: 380,
				position: "right",
			});
		} else if (floatingWindow.create) {
			floatingWindow.create(container, {
				title: __("Theme Builder"),
				width: 380,
			});
		}
	}

	function _renderBuilder(container) {
		container.innerHTML = "";

		// Theme selector
		const selector = document.createElement("div");
		selector.className = "fv-theme-builder__selector";
		selector.innerHTML = `<label>${__("Base Theme")}</label>`;

		const select = document.createElement("select");
		const allThemes = { ...BUILTIN_THEMES, ..._savedThemes };
		Object.entries(allThemes).forEach(([key, theme]) => {
			const opt = document.createElement("option");
			opt.value = key;
			opt.textContent = theme.label;
			if (key === _activeTheme) opt.selected = true;
			select.appendChild(opt);
		});
		select.addEventListener("change", () => applyTheme(select.value));
		selector.appendChild(select);
		container.appendChild(selector);

		// Token editors by group
		TOKEN_GROUPS.forEach((group) => {
			const section = document.createElement("div");
			section.className = "fv-theme-builder__group";
			section.innerHTML = `<h4>${group.label}</h4>`;

			group.tokens.forEach((token) => {
				const row = document.createElement("div");
				row.className = "fv-theme-builder__token";

				const label = document.createElement("label");
				label.textContent = token.label;
				row.appendChild(label);

				const currentVal = _customTokens[token.name]
					|| getComputedStyle(document.documentElement).getPropertyValue(token.name).trim()
					|| token.default;

				let input;
				if (token.type === "color") {
					input = document.createElement("input");
					input.type = "color";
					input.value = _normalizeColor(currentVal);
				} else if (token.type === "range") {
					input = document.createElement("input");
					input.type = "range";
					input.min = token.min ?? 0;
					input.max = token.max ?? 100;
					input.value = parseInt(currentVal) || parseInt(token.default);

					const valueLabel = document.createElement("span");
					valueLabel.className = "fv-theme-builder__range-val";
					valueLabel.textContent = `${input.value}${token.unit || ""}`;
					row.appendChild(valueLabel);

					input.addEventListener("input", () => {
						const val = `${input.value}${token.unit || ""}`;
						valueLabel.textContent = val;
						setToken(token.name, val);
					});
					row.appendChild(input);
					section.appendChild(row);
					return;
				} else {
					input = document.createElement("input");
					input.type = "text";
					input.value = currentVal;
				}

				input.addEventListener("input", () => {
					const val = token.type === "color" ? input.value : input.value;
					setToken(token.name, val);
				});

				row.appendChild(input);
				section.appendChild(row);
			});

			container.appendChild(section);
		});

		// Actions
		const actions = document.createElement("div");
		actions.className = "fv-theme-builder__actions";

		const saveBtn = document.createElement("button");
		saveBtn.className = "btn btn-primary btn-sm";
		saveBtn.textContent = __("Save Theme");
		saveBtn.addEventListener("click", () => {
			frappe.prompt(
				{ fieldtype: "Data", label: __("Theme Name"), fieldname: "name", reqd: 1 },
				({ name }) => saveTheme({ name, label: name }),
				__("Save Theme")
			);
		});

		const resetBtn = document.createElement("button");
		resetBtn.className = "btn btn-default btn-sm";
		resetBtn.textContent = __("Reset");
		resetBtn.addEventListener("click", () => {
			resetTheme();
			_renderBuilder(container);
		});

		const exportBtn = document.createElement("button");
		exportBtn.className = "btn btn-default btn-sm";
		exportBtn.textContent = __("Export");
		exportBtn.addEventListener("click", () => exportTheme());

		actions.append(saveBtn, resetBtn, exportBtn);
		container.appendChild(actions);
	}

	function _normalizeColor(val) {
		if (!val || val === "inherit" || val === "initial") return "#6366f1";
		if (val.startsWith("#") && val.length >= 7) return val.slice(0, 7);
		if (val.startsWith("rgb")) {
			const match = val.match(/\d+/g);
			if (match && match.length >= 3) {
				return `#${match.slice(0, 3).map((n) => parseInt(n).toString(16).padStart(2, "0")).join("")}`;
			}
		}
		return "#6366f1";
	}

	function _emit(event, data) {
		if (frappe.visual.eventBus && typeof frappe.visual.eventBus.emit === "function") {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	// ── Init ───────────────────────────────────────────────────
	_loadSavedThemes();

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.themeBuilder");

	Object.assign(frappe.visual.themeBuilder, {
		TOKEN_GROUPS,
		BUILTIN_THEMES,

		open: openBuilder,
		apply: applyTheme,
		reset: resetTheme,
		setToken,
		save: saveTheme,
		delete: deleteTheme,
		export: exportTheme,
		import: importTheme,

		/** Get current theme name. */
		get active() { return _activeTheme; },

		/** Get current custom tokens. */
		get tokens() { return { ..._customTokens }; },

		/** List all available theme names. */
		list() {
			return [
				...Object.keys(BUILTIN_THEMES).map((k) => ({ name: k, label: BUILTIN_THEMES[k].label, builtin: true })),
				...Object.keys(_savedThemes).map((k) => ({ name: k, label: _savedThemes[k].label, builtin: false })),
			];
		},
	});

	console.log(
		"%c⬡ FV ThemeBuilder%c ready — open() · apply() · save() · export()",
		"color:#a855f7;font-weight:bold",
		"color:#94a3b8"
	);
})();
