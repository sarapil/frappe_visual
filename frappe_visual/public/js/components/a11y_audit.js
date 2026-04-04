/**
 * A11yAudit — Runtime accessibility audit tool
 *
 * Scans the current page for common accessibility issues and reports
 * them in an overlay panel. Checks: alt text, labels, contrast,
 * ARIA attributes, heading hierarchy, keyboard accessibility.
 *
 * frappe.visual.A11yAudit.create({ autoRun: false })
 */
export class A11yAudit {
	static create(opts = {}) { return new A11yAudit(opts); }

	static SEVERITY = { error: "error", warning: "warning", info: "info" };

	constructor(opts) {
		this.opts = Object.assign({
			container: null, autoRun: false, showOverlay: true, highlightIssues: true
		}, opts);
		this._issues = [];
		this._overlayEl = null;
		if (this.opts.autoRun) this.run();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Run a full audit and return issues */
	run(scope) {
		const root = scope
			? (typeof scope === "string" ? document.querySelector(scope) : scope)
			: document.body;
		this._issues = [];
		this._checkImages(root);
		this._checkForms(root);
		this._checkHeadings(root);
		this._checkLinks(root);
		this._checkAria(root);
		this._checkContrast(root);
		this._checkKeyboard(root);
		this._checkLanguage();
		if (this.opts.showOverlay) this._renderOverlay();
		if (this.opts.highlightIssues) this._highlight();
		return this._issues;
	}

	get issues() { return this._issues; }
	get errorCount() { return this._issues.filter(i => i.severity === "error").length; }
	get warningCount() { return this._issues.filter(i => i.severity === "warning").length; }
	get score() {
		const total = this._issues.length;
		if (total === 0) return 100;
		const errors = this.errorCount;
		const warnings = this.warningCount;
		return Math.max(0, Math.round(100 - errors * 10 - warnings * 3));
	}

	/** Clear highlights and overlay */
	clear() {
		document.querySelectorAll(".fv-a11y-highlight").forEach(el => {
			el.classList.remove("fv-a11y-highlight", "fv-a11y-highlight--error", "fv-a11y-highlight--warning");
			el.removeAttribute("data-fv-a11y-issue");
		});
		this._overlayEl?.remove();
		this._overlayEl = null;
	}

	destroy() { this.clear(); }

	/* ── checks ─────────────────────────────────────────────── */

	_checkImages(root) {
		root.querySelectorAll("img").forEach(img => {
			if (!img.getAttribute("alt") && img.getAttribute("alt") !== "") {
				this._add("error", __("Image missing alt text"), img, "Add alt attribute to <img>");
			} else if (img.getAttribute("alt") === "" && !img.getAttribute("role")) {
				this._add("info", __("Decorative image should have role=presentation"), img);
			}
		});
		root.querySelectorAll("svg:not([aria-hidden])").forEach(svg => {
			if (!svg.getAttribute("aria-label") && !svg.querySelector("title")) {
				this._add("warning", __("SVG missing aria-label or <title>"), svg);
			}
		});
	}

	_checkForms(root) {
		root.querySelectorAll("input, select, textarea").forEach(input => {
			if (input.type === "hidden") return;
			const id = input.id;
			const hasLabel = id && root.querySelector(`label[for="${id}"]`);
			const hasAria = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
			const hasTitle = input.getAttribute("title");
			const hasPlaceholder = input.getAttribute("placeholder");
			if (!hasLabel && !hasAria && !hasTitle) {
				this._add("error", __("Form input missing label"), input,
					hasPlaceholder ? "Has placeholder but needs aria-label" : "Add <label> or aria-label");
			}
		});
		root.querySelectorAll("button").forEach(btn => {
			if (!btn.textContent.trim() && !btn.getAttribute("aria-label") && !btn.querySelector("img[alt]")) {
				this._add("error", __("Button has no accessible name"), btn);
			}
		});
	}

	_checkHeadings(root) {
		const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
		let lastLevel = 0;
		headings.forEach(h => {
			const level = parseInt(h.tagName[1]);
			if (level > lastLevel + 1 && lastLevel > 0) {
				this._add("warning", __("Skipped heading level: h{0} → h{1}", [lastLevel, level]), h);
			}
			lastLevel = level;
			if (!h.textContent.trim()) {
				this._add("error", __("Empty heading element"), h);
			}
		});
		const h1s = root.querySelectorAll("h1");
		if (h1s.length > 1) {
			this._add("warning", __("Multiple h1 elements found ({0})", [h1s.length]), h1s[1]);
		}
	}

	_checkLinks(root) {
		root.querySelectorAll("a").forEach(a => {
			if (!a.textContent.trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt]")) {
				this._add("error", __("Link has no accessible text"), a);
			}
			if (a.getAttribute("target") === "_blank" && !a.textContent.includes("new")) {
				const hasWarning = a.getAttribute("aria-label")?.includes("new") ||
					a.querySelector("[aria-hidden]")?.textContent.includes("new");
				if (!hasWarning) {
					this._add("info", __("Link opens in new tab without warning"), a);
				}
			}
		});
	}

	_checkAria(root) {
		root.querySelectorAll("[aria-labelledby]").forEach(el => {
			const id = el.getAttribute("aria-labelledby");
			if (!document.getElementById(id)) {
				this._add("error", __("aria-labelledby references missing id: {0}", [id]), el);
			}
		});
		root.querySelectorAll("[aria-describedby]").forEach(el => {
			const id = el.getAttribute("aria-describedby");
			if (!document.getElementById(id)) {
				this._add("warning", __("aria-describedby references missing id: {0}", [id]), el);
			}
		});
		root.querySelectorAll("[role]").forEach(el => {
			const role = el.getAttribute("role");
			const interactive = ["button", "link", "checkbox", "radio", "tab", "menuitem", "switch"];
			if (interactive.includes(role) && el.getAttribute("tabindex") === null && el.tagName !== "BUTTON" && el.tagName !== "A") {
				this._add("error", __("Interactive role '{0}' needs tabindex", [role]), el);
			}
		});
	}

	_checkContrast(root) {
		const sample = root.querySelectorAll("p, span, a, button, label, h1, h2, h3, h4, h5, h6");
		const checked = new Set();
		Array.from(sample).slice(0, 50).forEach(el => {
			const text = el.textContent.trim();
			if (!text || checked.has(el)) return;
			checked.add(el);
			const style = getComputedStyle(el);
			const fg = style.color;
			const bg = this._getEffectiveBg(el);
			if (fg && bg) {
				const ratio = this._contrastRatio(fg, bg);
				const isLarge = parseFloat(style.fontSize) >= 18 || (parseFloat(style.fontSize) >= 14 && style.fontWeight >= 700);
				const threshold = isLarge ? 3 : 4.5;
				if (ratio < threshold) {
					this._add("warning", __("Low contrast ratio: {0}:1 (needs {1}:1)", [ratio.toFixed(1), threshold]), el);
				}
			}
		});
	}

	_checkKeyboard(root) {
		root.querySelectorAll("[onclick]:not(button):not(a):not(input)").forEach(el => {
			if (!el.getAttribute("tabindex") && !el.getAttribute("role")) {
				this._add("warning", __("Clickable element not keyboard accessible"), el);
			}
		});
	}

	_checkLanguage() {
		if (!document.documentElement.getAttribute("lang")) {
			this._add("error", __("Page missing lang attribute on <html>"), document.documentElement);
		}
	}

	/* ── helpers ─────────────────────────────────────────────── */

	_add(severity, message, element, suggestion) {
		this._issues.push({ severity, message, element, suggestion: suggestion || "",
			selector: this._getSelector(element) });
	}

	_getSelector(el) {
		if (!el || el === document.documentElement) return "html";
		if (el.id) return "#" + el.id;
		const tag = el.tagName?.toLowerCase() || "?";
		const cls = el.className ? "." + String(el.className).split(" ").slice(0, 2).join(".") : "";
		return tag + cls;
	}

	_highlight() {
		this._issues.forEach(issue => {
			if (!issue.element || !issue.element.classList) return;
			issue.element.classList.add("fv-a11y-highlight", "fv-a11y-highlight--" + issue.severity);
			issue.element.dataset.fvA11yIssue = issue.message;
		});
	}

	_renderOverlay() {
		this._overlayEl?.remove();
		const el = document.createElement("div");
		el.className = "fv-a11y-overlay";
		const score = this.score;
		const color = score >= 90 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";
		el.innerHTML = `<div class="fv-a11y-header">
			<span class="fv-a11y-title">♿ ${__("Accessibility Audit")}</span>
			<span class="fv-a11y-score" style="color:${color}">${score}/100</span>
			<button class="fv-a11y-close" aria-label="${__("Close")}">✕</button>
		</div>
		<div class="fv-a11y-summary">
			<span class="fv-a11y-errors">🔴 ${this.errorCount} ${__("errors")}</span>
			<span class="fv-a11y-warnings">🟡 ${this.warningCount} ${__("warnings")}</span>
			<span class="fv-a11y-infos">🔵 ${this._issues.filter(i => i.severity === "info").length} ${__("info")}</span>
		</div>
		<div class="fv-a11y-list">${this._issues.map(i =>
			`<div class="fv-a11y-issue fv-a11y-issue--${i.severity}">
				<span class="fv-a11y-badge">${i.severity === "error" ? "🔴" : i.severity === "warning" ? "🟡" : "🔵"}</span>
				<div><strong>${i.message}</strong><br><code>${this._esc(i.selector)}</code>
				${i.suggestion ? `<br><em>${this._esc(i.suggestion)}</em>` : ""}</div>
			</div>`).join("")}
		</div>`;
		el.querySelector(".fv-a11y-close").addEventListener("click", () => this.clear());
		// Click on issue to scroll to element
		el.querySelectorAll(".fv-a11y-issue").forEach((row, idx) => {
			row.style.cursor = "pointer";
			row.addEventListener("click", () => {
				this._issues[idx]?.element?.scrollIntoView({ behavior: "smooth", block: "center" });
			});
		});
		Object.assign(el.style, { position: "fixed", bottom: "16px", right: "16px",
			width: "380px", maxHeight: "480px", overflow: "auto", zIndex: "99999",
			background: "var(--fv-hc-bg, #1a1a2e)", color: "var(--fv-hc-fg, #e0e0e0)",
			borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,.3)", padding: "16px",
			fontFamily: "system-ui, sans-serif", fontSize: "13px" });
		document.body.appendChild(el);
		this._overlayEl = el;
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }

	_getEffectiveBg(el) {
		let current = el;
		while (current && current !== document.body) {
			const bg = getComputedStyle(current).backgroundColor;
			if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
			current = current.parentElement;
		}
		return "rgb(255,255,255)";
	}

	_parseColor(str) {
		const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		return m ? [+m[1], +m[2], +m[3]] : null;
	}

	_luminance(rgb) {
		const [r, g, b] = rgb.map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}

	_contrastRatio(fg, bg) {
		const fgRgb = this._parseColor(fg);
		const bgRgb = this._parseColor(bg);
		if (!fgRgb || !bgRgb) return 21;
		const l1 = this._luminance(fgRgb);
		const l2 = this._luminance(bgRgb);
		const lighter = Math.max(l1, l2);
		const darker = Math.min(l1, l2);
		return (lighter + 0.05) / (darker + 0.05);
	}
}
