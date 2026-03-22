/**
 * ColorSystem — Semantic Color Palette for Frappe Visual
 * ========================================================
 * Maps DocType categories and data types to consistent colors.
 * Each node type has: bg, border, text, icon, shape, width, height.
 *
 * These colors are fixed identifiers in the app's design language,
 * automatically distinguishing different data types visually.
 */

// ── Master Palette ───────────────────────────────────────────────
const PALETTE = {
	// Primary hues (Indigo spectrum)
	indigo:   { bg: "#eef2ff", border: "#6366f1", text: "#3730a3" },
	violet:   { bg: "#f5f3ff", border: "#8b5cf6", text: "#5b21b6" },
	purple:   { bg: "#faf5ff", border: "#a855f7", text: "#7e22ce" },

	// Cool spectrum
	blue:     { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
	cyan:     { bg: "#ecfeff", border: "#06b6d4", text: "#0e7490" },
	teal:     { bg: "#f0fdfa", border: "#14b8a6", text: "#0f766e" },

	// Warm spectrum
	emerald:  { bg: "#ecfdf5", border: "#10b981", text: "#047857" },
	green:    { bg: "#f0fdf4", border: "#22c55e", text: "#15803d" },
	lime:     { bg: "#f7fee7", border: "#84cc16", text: "#4d7c0f" },
	yellow:   { bg: "#fefce8", border: "#eab308", text: "#a16207" },
	amber:    { bg: "#fffbeb", border: "#f59e0b", text: "#b45309" },
	orange:   { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },

	// Alert spectrum
	red:      { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c" },
	rose:     { bg: "#fff1f2", border: "#f43f5e", text: "#be123c" },
	pink:     { bg: "#fdf2f8", border: "#ec4899", text: "#be185d" },

	// Neutral
	slate:    { bg: "#f8fafc", border: "#64748b", text: "#334155" },
	gray:     { bg: "#f9fafb", border: "#6b7280", text: "#374151" },
	zinc:     { bg: "#fafafa", border: "#71717a", text: "#3f3f46" },
};

// ── Node Type Definitions ────────────────────────────────────────
// Maps semantic types to visual properties
const NODE_TYPES = {
	// ─── Frappe Core ─────────────────────────────────────────────
	"module":        { ...PALETTE.indigo,  icon: "📦", shape: "roundrectangle", width: 160, height: 55 },
	"doctype":       { ...PALETTE.blue,    icon: "📄", shape: "roundrectangle", width: 150, height: 50 },
	"page":          { ...PALETTE.violet,  icon: "📑", shape: "roundrectangle", width: 140, height: 48 },
	"report":        { ...PALETTE.cyan,    icon: "📊", shape: "roundrectangle", width: 140, height: 48 },
	"workspace":     { ...PALETTE.purple,  icon: "🏠", shape: "roundrectangle", width: 160, height: 55 },
	"dashboard":     { ...PALETTE.teal,    icon: "📈", shape: "roundrectangle", width: 150, height: 50 },

	// ─── Data Categories ─────────────────────────────────────────
	"master":        { ...PALETTE.emerald, icon: "📋", shape: "roundrectangle", width: 150, height: 50 },
	"transaction":   { ...PALETTE.amber,   icon: "📝", shape: "roundrectangle", width: 150, height: 50 },
	"settings":      { ...PALETTE.slate,   icon: "⚙️", shape: "roundrectangle", width: 140, height: 48 },
	"log":           { ...PALETTE.gray,    icon: "📜", shape: "roundrectangle", width: 130, height: 45 },

	// ─── Relationships ───────────────────────────────────────────
	"link":          { ...PALETTE.blue,    icon: "🔗", shape: "ellipse", width: 50, height: 50 },
	"child-table":   { ...PALETTE.cyan,    icon: "📎", shape: "roundrectangle", width: 130, height: 40 },

	// ─── Actions ─────────────────────────────────────────────────
	"action":        { ...PALETTE.orange,  icon: "⚡", shape: "diamond", width: 60, height: 60 },
	"webhook":       { ...PALETTE.rose,    icon: "🪝", shape: "diamond", width: 55, height: 55 },
	"scheduler":     { ...PALETTE.yellow,  icon: "⏰", shape: "octagon", width: 55, height: 55 },

	// ─── Users & Roles ───────────────────────────────────────────
	"user":          { ...PALETTE.pink,    icon: "👤", shape: "ellipse", width: 55, height: 55 },
	"role":          { ...PALETTE.purple,  icon: "🛡️", shape: "roundrectangle", width: 120, height: 40 },

	// ─── Network / Infrastructure ────────────────────────────────
	"server":        { ...PALETTE.zinc,    icon: "🖥️", shape: "roundrectangle", width: 140, height: 50 },
	"device":        { ...PALETTE.teal,    icon: "📡", shape: "roundrectangle", width: 140, height: 50 },
	"interface":     { ...PALETTE.cyan,    icon: "🔌", shape: "ellipse", width: 50, height: 50 },
	"vpn":           { ...PALETTE.indigo,  icon: "🔒", shape: "roundrectangle", width: 130, height: 45 },
	"firewall":      { ...PALETTE.red,     icon: "🛡️", shape: "roundrectangle", width: 140, height: 50 },
	"wifi":          { ...PALETTE.blue,    icon: "📶", shape: "roundrectangle", width: 130, height: 45 },

	// ─── Communication ───────────────────────────────────────────
	"whatsapp":      { ...PALETTE.green,   icon: "💬", shape: "roundrectangle", width: 140, height: 48 },
	"telegram":      { ...PALETTE.blue,    icon: "✈️", shape: "roundrectangle", width: 140, height: 48 },
	"call":          { ...PALETTE.amber,   icon: "📞", shape: "roundrectangle", width: 130, height: 45 },
	"meeting":       { ...PALETTE.violet,  icon: "🎥", shape: "roundrectangle", width: 140, height: 48 },

	// ─── Status ──────────────────────────────────────────────────
	"active":        { ...PALETTE.emerald, icon: "✅", shape: "roundrectangle", width: 120, height: 40 },
	"warning":       { ...PALETTE.amber,   icon: "⚠️", shape: "roundrectangle", width: 120, height: 40 },
	"error":         { ...PALETTE.red,     icon: "❌", shape: "roundrectangle", width: 120, height: 40 },
	"disabled":      { ...PALETTE.gray,    icon: "🚫", shape: "roundrectangle", width: 120, height: 40 },
	"coming-soon":   { ...PALETTE.slate,   icon: "🔮", shape: "roundrectangle", width: 140, height: 40 },

	// ─── Default ─────────────────────────────────────────────────
	"default":       { ...PALETTE.slate,   icon: "●",  shape: "roundrectangle", width: 130, height: 45 },
	"group":         { ...PALETTE.indigo,  icon: "📦", shape: "roundrectangle", width: 200, height: 80 },
};

// ── Edge Type Definitions ────────────────────────────────────────
const EDGE_TYPES = {
	"default":       { color: "#94a3b8", width: 1.5, style: "solid" },
	"link":          { color: "#6366f1", width: 2, style: "solid" },
	"child":         { color: "#3b82f6", width: 2, style: "solid" },
	"dependency":    { color: "#f59e0b", width: 1.5, style: "dashed" },
	"reference":     { color: "#8b5cf6", width: 1.5, style: "dotted" },
	"flow":          { color: "#10b981", width: 2.5, style: "solid" },
	"data-flow":     { color: "#06b6d4", width: 2, style: "solid" },
	"vpn-tunnel":    { color: "#6366f1", width: 3, style: "dashed" },
	"api-call":      { color: "#f97316", width: 1.5, style: "dashed" },
	"realtime":      { color: "#ec4899", width: 2, style: "solid" },
	"permission":    { color: "#a855f7", width: 1.5, style: "dotted" },
	"coming-soon":   { color: "#cbd5e1", width: 1, style: "dotted" },
};

export class ColorSystem {
	/**
	 * Get visual config for a node type.
	 */
	static getNodeType(type) {
		return NODE_TYPES[type] || NODE_TYPES["default"];
	}

	/**
	 * Get visual config for an edge type.
	 */
	static getEdgeType(type) {
		return EDGE_TYPES[type] || EDGE_TYPES["default"];
	}

	/**
	 * Get all defined node types.
	 */
	static getAllNodeTypes() {
		return { ...NODE_TYPES };
	}

	/**
	 * Get all defined edge types.
	 */
	static getAllEdgeTypes() {
		return { ...EDGE_TYPES };
	}

	/**
	 * Register a custom node type (used by apps to extend).
	 */
	static registerNodeType(name, config) {
		const base = PALETTE[config.palette] || PALETTE.slate;
		NODE_TYPES[name] = {
			...base,
			icon: config.icon || "●",
			shape: config.shape || "roundrectangle",
			width: config.width || 130,
			height: config.height || 45,
			...config,
		};
	}

	/**
	 * Register a custom edge type.
	 */
	static registerEdgeType(name, config) {
		EDGE_TYPES[name] = {
			color: "#94a3b8",
			width: 1.5,
			style: "solid",
			...config,
		};
	}

	/**
	 * Get the full palette.
	 */
	static get palette() {
		return { ...PALETTE };
	}

	/**
	 * Auto-assign a color from palette based on string hash.
	 */
	static autoColor(str) {
		const keys = Object.keys(PALETTE);
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const idx = Math.abs(hash) % keys.length;
		return PALETTE[keys[idx]];
	}
}
