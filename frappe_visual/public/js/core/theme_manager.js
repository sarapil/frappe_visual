/**
 * ThemeManager — Dynamic Theming for Frappe Visual
 * ==================================================
 * Manages dark/light mode, RTL, and doctype-semantic color mapping.
 * Listens to Frappe theme changes and auto-updates all visual components.
 */

const CSS_VARS_LIGHT = {
	"--fv-bg-primary": "#ffffff",
	"--fv-bg-secondary": "#f8fafc",
	"--fv-bg-tertiary": "#f1f5f9",
	"--fv-bg-surface": "#ffffff",
	"--fv-bg-overlay": "rgba(255,255,255,0.95)",
	"--fv-text-primary": "#1e293b",
	"--fv-text-secondary": "#64748b",
	"--fv-text-tertiary": "#94a3b8",
	"--fv-text-inverse": "#ffffff",
	"--fv-border-primary": "#e2e8f0",
	"--fv-border-secondary": "#cbd5e1",
	"--fv-accent": "#6366f1",
	"--fv-accent-light": "#818cf8",
	"--fv-accent-bg": "rgba(99,102,241,0.08)",
	"--fv-success": "#10b981",
	"--fv-warning": "#f59e0b",
	"--fv-danger": "#ef4444",
	"--fv-info": "#3b82f6",
	"--fv-shadow-sm": "0 1px 2px rgba(0,0,0,0.05)",
	"--fv-shadow-md": "0 4px 6px -1px rgba(0,0,0,0.1)",
	"--fv-shadow-lg": "0 10px 15px -3px rgba(0,0,0,0.1)",
	"--fv-shadow-glow": "0 0 20px rgba(99,102,241,0.15)",
	"--fv-radius-sm": "6px",
	"--fv-radius-md": "10px",
	"--fv-radius-lg": "16px",
	"--fv-radius-full": "9999px",
	"--fv-minimap-bg": "rgba(241,245,249,0.95)",
	"--fv-minimap-border": "#e2e8f0",
	"--fv-floating-bg": "rgba(255,255,255,0.98)",
	"--fv-floating-border": "#e2e8f0",
	"--fv-ambient-glow": "0",
};

const CSS_VARS_DARK = {
	"--fv-bg-primary": "#0f172a",
	"--fv-bg-secondary": "#1e293b",
	"--fv-bg-tertiary": "#334155",
	"--fv-bg-surface": "#1e293b",
	"--fv-bg-overlay": "rgba(15,23,42,0.95)",
	"--fv-text-primary": "#f1f5f9",
	"--fv-text-secondary": "#94a3b8",
	"--fv-text-tertiary": "#64748b",
	"--fv-text-inverse": "#0f172a",
	"--fv-border-primary": "#334155",
	"--fv-border-secondary": "#475569",
	"--fv-accent": "#818cf8",
	"--fv-accent-light": "#a5b4fc",
	"--fv-accent-bg": "rgba(129,140,248,0.12)",
	"--fv-success": "#34d399",
	"--fv-warning": "#fbbf24",
	"--fv-danger": "#f87171",
	"--fv-info": "#60a5fa",
	"--fv-shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
	"--fv-shadow-md": "0 4px 6px -1px rgba(0,0,0,0.4)",
	"--fv-shadow-lg": "0 10px 15px -3px rgba(0,0,0,0.5)",
	"--fv-shadow-glow": "0 0 20px rgba(129,140,248,0.25)",
	"--fv-radius-sm": "6px",
	"--fv-radius-md": "10px",
	"--fv-radius-lg": "16px",
	"--fv-radius-full": "9999px",
	"--fv-minimap-bg": "rgba(30,41,59,0.95)",
	"--fv-minimap-border": "#334155",
	"--fv-floating-bg": "rgba(30,41,59,0.98)",
	"--fv-floating-border": "#475569",
	"--fv-ambient-glow": "0",
};

export class ThemeManager {
	static _initialized = false;
	static _isDark = false;
	static _isRTL = false;
	static _listeners = [];

	/**
	 * Initialize theme system. Called once on bundle load.
	 */
	static init() {
		if (ThemeManager._initialized) return;
		ThemeManager._initialized = true;

		// Detect initial state
		ThemeManager._isDark = frappe.visual.isDarkMode();
		ThemeManager._isRTL = frappe.visual.isRTL();

		// Apply vars
		ThemeManager._applyVars();

		// Watch for theme changes
		const observer = new MutationObserver((mutations) => {
			for (const m of mutations) {
				if (
					m.attributeName === "data-theme" ||
					m.attributeName === "class" ||
					m.attributeName === "dir" ||
					m.attributeName === "lang"
				) {
					ThemeManager._onThemeChange();
					break;
				}
			}
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme", "class", "dir", "lang"],
		});

		// Also watch system preference
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", () => ThemeManager._onThemeChange());
	}

	static _onThemeChange() {
		const wasDark = ThemeManager._isDark;
		const wasRTL = ThemeManager._isRTL;

		ThemeManager._isDark = frappe.visual.isDarkMode();
		ThemeManager._isRTL = frappe.visual.isRTL();

		if (wasDark !== ThemeManager._isDark || wasRTL !== ThemeManager._isRTL) {
			ThemeManager._applyVars();
			ThemeManager._notifyListeners();
		}
	}

	static _applyVars() {
		const vars = ThemeManager._isDark ? CSS_VARS_DARK : CSS_VARS_LIGHT;
		const root = document.documentElement;

		Object.entries(vars).forEach(([key, value]) => {
			root.style.setProperty(key, value);
		});

		// Toggle class on body for CSS overrides
		document.body.classList.toggle("fv-dark", ThemeManager._isDark);
		document.body.classList.toggle("fv-rtl", ThemeManager._isRTL);
	}

	/**
	 * Register a callback for theme changes.
	 * @param {Function} fn - Called with { isDark, isRTL }
	 */
	static onChange(fn) {
		ThemeManager._listeners.push(fn);
	}

	static _notifyListeners() {
		const state = {
			isDark: ThemeManager._isDark,
			isRTL: ThemeManager._isRTL,
		};
		ThemeManager._listeners.forEach((fn) => fn(state));
	}

	/** Current dark mode state */
	static get isDark() {
		return ThemeManager._isDark;
	}

	/** Current RTL state */
	static get isRTL() {
		return ThemeManager._isRTL;
	}

	/**
	 * Get Cytoscape stylesheet array for current theme.
	 * Useful for passing to cy.style().
	 */
	static getCytoscapeTheme() {
		const dark = ThemeManager._isDark;
		return [
			{
				selector: "node",
				style: {
					color: dark ? "#f1f5f9" : "#1e293b",
					"text-outline-color": dark ? "#1e293b" : "#ffffff",
					"text-outline-width": dark ? 1 : 0,
				},
			},
			{
				selector: "edge",
				style: {
					"line-color": dark ? "#475569" : "#cbd5e1",
					"target-arrow-color": dark ? "#475569" : "#cbd5e1",
				},
			},
		];
	}
}
