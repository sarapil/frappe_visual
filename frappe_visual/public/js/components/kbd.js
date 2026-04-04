/**
 * Kbd — Keyboard shortcut display
 * =================================
 * Renders keyboard shortcuts with platform-aware symbols (⌘/Ctrl).
 *
 * frappe.visual.Kbd.create({
 *   target: "#shortcut",
 *   keys: ["Ctrl", "Shift", "P"],  // auto-converts Ctrl→⌘ on Mac
 *   separator: "+",                  // "+" | " " | "then"
 *   size: "md",                      // sm | md | lg
 *   variant: "default",              // default | flat | outline
 *   platformAware: true              // convert Ctrl↔⌘ based on OS
 * })
 *
 * // Or render inline:
 * frappe.visual.Kbd.inline(["Ctrl", "K"])  // returns HTML string
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const KEY_MAP = {
	Ctrl:      IS_MAC ? "⌘" : "Ctrl",
	Alt:       IS_MAC ? "⌥" : "Alt",
	Shift:     IS_MAC ? "⇧" : "Shift",
	Meta:      IS_MAC ? "⌘" : "Win",
	Cmd:       IS_MAC ? "⌘" : "Ctrl",
	Enter:     "↵",
	Backspace: "⌫",
	Delete:    "⌦",
	Escape:    "Esc",
	Tab:       "⇥",
	Space:     "␣",
	ArrowUp:   "↑",
	ArrowDown: "↓",
	ArrowLeft: "←",
	ArrowRight:"→",
};

export class Kbd {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			keys: [],
			separator: "+",
			size: "md",
			variant: "default",
			platformAware: true,
		}, opts);

		if (this.target) this.render();
	}

	static create(opts) { return new Kbd(opts); }

	/** Returns HTML string for inline usage */
	static inline(keys, opts = {}) {
		const k = new Kbd({ ...opts, keys });
		return k.toHTML();
	}

	toHTML() {
		const mapped = this.keys.map((k) =>
			this.platformAware && KEY_MAP[k] ? KEY_MAP[k] : k
		);

		const sep = this.separator === "then"
			? `<span class="fv-kbd-then">then</span>`
			: `<span class="fv-kbd-sep">${_esc(this.separator)}</span>`;

		return `<span class="fv-kbd fv-kbd-${this.size} fv-kbd-${this.variant}">${
			mapped.map((k) => `<kbd class="fv-kbd-key">${_esc(k)}</kbd>`).join(sep)
		}</span>`;
	}

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		el.innerHTML = this.toHTML();
		this._el = el.firstElementChild;
	}
}
