/**
 * LangSwitcher — Visual language switcher with flags and labels
 *
 * Renders a dropdown or inline selector for switching UI language.
 * Integrates with Frappe's i18n system and supports tier-based
 * language grouping (T1 mandatory, T2 priority, T3 marketplace).
 *
 * frappe.visual.LangSwitcher.create({ container: "#navbar-lang", style: "dropdown" })
 */
export class LangSwitcher {
	static create(opts = {}) { return new LangSwitcher(opts); }

	static LANGUAGES = {
		ar: { flag: "🇸🇦", name: "العربية",   nameEn: "Arabic",     tier: 1, dir: "rtl" },
		en: { flag: "🇬🇧", name: "English",    nameEn: "English",    tier: 1, dir: "ltr" },
		tr: { flag: "🇹🇷", name: "Türkçe",     nameEn: "Turkish",    tier: 2, dir: "ltr" },
		fr: { flag: "🇫🇷", name: "Français",   nameEn: "French",     tier: 2, dir: "ltr" },
		ur: { flag: "🇵🇰", name: "اردو",       nameEn: "Urdu",       tier: 2, dir: "rtl" },
		hi: { flag: "🇮🇳", name: "हिन्दी",      nameEn: "Hindi",      tier: 2, dir: "ltr" },
		fa: { flag: "🇮🇷", name: "فارسی",      nameEn: "Persian",    tier: 2, dir: "rtl" },
		es: { flag: "🇪🇸", name: "Español",    nameEn: "Spanish",    tier: 3, dir: "ltr" },
		de: { flag: "🇩🇪", name: "Deutsch",    nameEn: "German",     tier: 3, dir: "ltr" },
		pt: { flag: "🇧🇷", name: "Português",  nameEn: "Portuguese", tier: 3, dir: "ltr" },
		id: { flag: "🇮🇩", name: "Indonesia",  nameEn: "Indonesian", tier: 3, dir: "ltr" },
		zh: { flag: "🇨🇳", name: "中文",        nameEn: "Chinese",    tier: 3, dir: "ltr" },
	};

	constructor(opts) {
		this.opts = Object.assign({
			container: null, style: "dropdown", showFlags: true, showNativeName: true,
			showTiers: false, maxTier: 3, onSwitch: null, compact: false
		}, opts);
		this._current = this._detectCurrent();
		this._open = false;
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	get current() { return this._current; }
	get currentLang() { return LangSwitcher.LANGUAGES[this._current] || null; }

	switchTo(code) {
		if (!LangSwitcher.LANGUAGES[code]) return;
		this._current = code;
		this._updateUI();
		// Call Frappe's language switcher if available
		if (typeof frappe !== "undefined" && frappe.xcall) {
			frappe.xcall("frappe.client.set_value", {
				doctype: "User", name: frappe.session.user,
				fieldname: "language", value: code
			}).then(() => {
				if (this.opts.onSwitch) this.opts.onSwitch(code);
				else window.location.reload();
			});
		} else {
			this.opts.onSwitch?.(code);
		}
	}

	/** Get languages filtered by tier */
	getLanguages(maxTier) {
		const tier = maxTier || this.opts.maxTier;
		return Object.entries(LangSwitcher.LANGUAGES)
			.filter(([, v]) => v.tier <= tier)
			.map(([code, info]) => ({ code, ...info }));
	}

	destroy() {
		this._el?.remove();
		document.removeEventListener("click", this._outsideHandler);
	}

	/* ── private ────────────────────────────────────────────── */

	_detectCurrent() {
		if (typeof frappe !== "undefined" && frappe.boot?.lang) return frappe.boot.lang;
		return document.documentElement.getAttribute("lang") || "en";
	}

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;

		this._el = document.createElement("div");
		this._el.className = "fv-lang-switcher fv-lang-switcher--" + this.opts.style;
		if (this.opts.compact) this._el.classList.add("fv-lang-switcher--compact");
		this._el.setAttribute("role", "listbox");
		this._el.setAttribute("aria-label", __("Select language"));

		if (this.opts.style === "dropdown") {
			this._buildDropdown();
		} else {
			this._buildInline();
		}
		parent.appendChild(this._el);

		// Outside click to close dropdown
		this._outsideHandler = (e) => {
			if (this._open && !this._el.contains(e.target)) this._closeDropdown();
		};
		document.addEventListener("click", this._outsideHandler);
	}

	_buildDropdown() {
		const cur = LangSwitcher.LANGUAGES[this._current] || {};
		// Trigger button
		const trigger = document.createElement("button");
		trigger.className = "fv-ls-trigger";
		trigger.setAttribute("aria-haspopup", "listbox");
		trigger.setAttribute("aria-expanded", "false");
		trigger.innerHTML = this._renderLangLabel(this._current, cur, true);
		trigger.addEventListener("click", (e) => {
			e.stopPropagation();
			this._open ? this._closeDropdown() : this._openDropdown();
		});
		this._trigger = trigger;
		this._el.appendChild(trigger);

		// Dropdown panel
		const panel = document.createElement("div");
		panel.className = "fv-ls-panel";
		panel.setAttribute("role", "listbox");
		panel.style.display = "none";
		this._renderOptions(panel);
		this._panel = panel;
		this._el.appendChild(panel);
	}

	_buildInline() {
		const langs = this.getLanguages();
		langs.forEach(lang => {
			const btn = document.createElement("button");
			btn.className = "fv-ls-option" + (lang.code === this._current ? " fv-ls-option--active" : "");
			btn.setAttribute("role", "option");
			btn.setAttribute("aria-selected", String(lang.code === this._current));
			btn.dataset.lang = lang.code;
			btn.innerHTML = this._renderLangLabel(lang.code, lang, false);
			btn.addEventListener("click", () => this.switchTo(lang.code));
			this._el.appendChild(btn);
		});
	}

	_renderOptions(panel) {
		const langs = this.getLanguages();
		let currentTier = 0;
		langs.forEach(lang => {
			if (this.opts.showTiers && lang.tier !== currentTier) {
				currentTier = lang.tier;
				const divider = document.createElement("div");
				divider.className = "fv-ls-tier-label";
				divider.textContent = `T${currentTier}`;
				panel.appendChild(divider);
			}
			const opt = document.createElement("button");
			opt.className = "fv-ls-option" + (lang.code === this._current ? " fv-ls-option--active" : "");
			opt.setAttribute("role", "option");
			opt.setAttribute("aria-selected", String(lang.code === this._current));
			opt.dataset.lang = lang.code;
			opt.innerHTML = this._renderLangLabel(lang.code, lang, false);
			opt.addEventListener("click", () => { this.switchTo(lang.code); this._closeDropdown(); });
			panel.appendChild(opt);
		});
	}

	_renderLangLabel(code, info, isTrigger) {
		let parts = [];
		if (this.opts.showFlags) parts.push(`<span class="fv-ls-flag">${info.flag || ""}</span>`);
		if (this.opts.compact && isTrigger) {
			parts.push(`<span class="fv-ls-code">${code.toUpperCase()}</span>`);
		} else {
			const name = this.opts.showNativeName ? info.name : info.nameEn;
			parts.push(`<span class="fv-ls-name">${name || code}</span>`);
		}
		if (isTrigger) parts.push(`<span class="fv-ls-chevron">▾</span>`);
		return parts.join("");
	}

	_openDropdown() {
		this._open = true;
		this._panel.style.display = "";
		this._trigger.setAttribute("aria-expanded", "true");
		this._el.classList.add("fv-ls--open");
	}

	_closeDropdown() {
		this._open = false;
		this._panel.style.display = "none";
		this._trigger.setAttribute("aria-expanded", "false");
		this._el.classList.remove("fv-ls--open");
	}

	_updateUI() {
		const cur = LangSwitcher.LANGUAGES[this._current] || {};
		if (this._trigger) {
			this._trigger.innerHTML = this._renderLangLabel(this._current, cur, true);
		}
		this._el.querySelectorAll(".fv-ls-option").forEach(opt => {
			const active = opt.dataset.lang === this._current;
			opt.classList.toggle("fv-ls-option--active", active);
			opt.setAttribute("aria-selected", String(active));
		});
	}
}
