// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Keyboard Shortcut Cheatsheet
 * ===============================================
 * Ctrl+/ opens a floating overlay showing all registered shortcuts.
 * Groups shortcuts by context: Global, List, Form, Panel, Navigation.
 * Auto-discovers shortcuts from keyboard_navigator + desk_workspace.
 *
 * Usage:
 *   frappe.visual.shortcutCheatsheet.show()
 *   frappe.visual.shortcutCheatsheet.hide()
 *   frappe.visual.shortcutCheatsheet.register(key, label, context, action)
 *
 * Built-in: Ctrl+/ toggles the cheatsheet
 */

frappe.provide("frappe.visual.shortcutCheatsheet");

(function () {
	"use strict";

	let _overlayEl = null;
	let _visible = false;

	// ── Shortcut Registry ──────────────────────────────────────────
	const _shortcuts = [
		// Global
		{ key: "Ctrl+K", label: __("Command Palette"), context: "global", icon: "search" },
		{ key: "Ctrl+/", label: __("Keyboard Shortcuts"), context: "global", icon: "keyboard" },
		{ key: "Ctrl+Shift+N", label: __("Toggle Nav Sidebar"), context: "global", icon: "layout-sidebar" },
		{ key: "Esc", label: __("Close panel / overlay"), context: "global", icon: "x" },

		// List View
		{ key: "Split", label: __("Toggle Split View"), context: "list", icon: "columns" },
		{ key: "↑ / ↓", label: __("Navigate records"), context: "list", icon: "arrows-vertical" },
		{ key: "Right-click", label: __("Context menu"), context: "list", icon: "menu-2" },

		// Detail Panel
		{ key: "Ctrl+Enter", label: __("Open full form"), context: "panel", icon: "external-link" },
		{ key: "Esc", label: __("Close detail panel"), context: "panel", icon: "x" },
		{ key: "↑ / ↓", label: __("Previous / next record"), context: "panel", icon: "arrows-vertical" },
		{ key: "Ctrl+Tab", label: __("Switch tabs"), context: "panel", icon: "file-stack" },
		{ key: "Ctrl+W", label: __("Close current tab"), context: "panel", icon: "file-x" },

		// Form
		{ key: "Ctrl+S", label: __("Save document"), context: "form", icon: "device-floppy" },
		{ key: "Ctrl+Enter", label: __("Submit document"), context: "form", icon: "check" },

		// Navigation
		{ key: "Alt+←", label: __("Go back"), context: "navigation", icon: "arrow-left" },
		{ key: "Alt+→", label: __("Go forward"), context: "navigation", icon: "arrow-right" },
		{ key: "Ctrl+H", label: __("Home"), context: "navigation", icon: "home" },
	];

	const CONTEXT_LABELS = {
		global: { label: __("Global"), icon: "world", color: "#6366f1" },
		list: { label: __("List View"), icon: "list", color: "#22c55e" },
		panel: { label: __("Detail Panel"), icon: "layout-sidebar-right", color: "#f59e0b" },
		form: { label: __("Form View"), icon: "file-text", color: "#3b82f6" },
		navigation: { label: __("Navigation"), icon: "compass", color: "#ec4899" },
	};

	// ── Registration ───────────────────────────────────────────────
	function register(key, label, context = "global", icon = "command") {
		_shortcuts.push({ key, label, context, icon });
		// Emit event for any listeners
		frappe.visual.eventBus?.emit("shortcut:register", { key, label, context });
	}

	// ── Build Overlay ──────────────────────────────────────────────
	function _buildOverlay() {
		if (_overlayEl) return _overlayEl;

		const overlay = document.createElement("div");
		overlay.id = "fv-shortcut-cheatsheet";
		overlay.className = "fv-sc-overlay";
		overlay.setAttribute("role", "dialog");
		overlay.setAttribute("aria-label", __("Keyboard Shortcuts"));

		// Group shortcuts by context
		const groups = {};
		for (const sc of _shortcuts) {
			const ctx = sc.context || "global";
			if (!groups[ctx]) groups[ctx] = [];
			groups[ctx].push(sc);
		}

		let html = `
			<div class="fv-sc-backdrop"></div>
			<div class="fv-sc-dialog fv-fx-glass">
				<div class="fv-sc-header">
					<h3 class="fv-sc-title">
						<i class="ti ti-keyboard"></i>
						${__("Keyboard Shortcuts")}
					</h3>
					<button class="fv-sc-close" aria-label="${__("Close")}">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
				<div class="fv-sc-body">
		`;

		for (const [ctx, items] of Object.entries(groups)) {
			const meta = CONTEXT_LABELS[ctx] || { label: ctx, icon: "keyboard", color: "#94a3b8" };
			html += `
				<div class="fv-sc-group">
					<h4 class="fv-sc-group-title" style="--ctx-color: ${meta.color}">
						<i class="ti ti-${meta.icon}"></i>
						${meta.label}
					</h4>
					<div class="fv-sc-items">
			`;
			for (const item of items) {
				const keys = item.key.split("+").map(k =>
					`<kbd class="fv-sc-kbd">${k.trim()}</kbd>`
				).join('<span class="fv-sc-plus">+</span>');

				html += `
					<div class="fv-sc-item">
						<span class="fv-sc-item-label">
							<i class="ti ti-${item.icon}" style="color: ${meta.color}"></i>
							${item.label}
						</span>
						<span class="fv-sc-item-keys">${keys}</span>
					</div>
				`;
			}
			html += `</div></div>`;
		}

		html += `
				</div>
				<div class="fv-sc-footer">
					<span class="fv-sc-footer-hint">${__("Press")} <kbd class="fv-sc-kbd">Ctrl</kbd><span class="fv-sc-plus">+</span><kbd class="fv-sc-kbd">/</kbd> ${__("to toggle")}</span>
				</div>
			</div>
		`;

		overlay.innerHTML = html;
		document.body.appendChild(overlay);
		_overlayEl = overlay;

		// Event bindings
		overlay.querySelector(".fv-sc-close")?.addEventListener("click", hide);
		overlay.querySelector(".fv-sc-backdrop")?.addEventListener("click", hide);

		return overlay;
	}

	// ── Show / Hide ────────────────────────────────────────────────
	function show() {
		const overlay = _buildOverlay();

		overlay.classList.add("fv-sc-visible");
		_visible = true;

		if (frappe.visual?.gsap) {
			const dialog = overlay.querySelector(".fv-sc-dialog");
			frappe.visual.gsap.fromTo(dialog,
				{ opacity: 0, scale: 0.92, y: 20 },
				{ opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.5)" }
			);
		}
	}

	function hide() {
		if (!_overlayEl || !_visible) return;

		if (frappe.visual?.gsap) {
			const dialog = _overlayEl.querySelector(".fv-sc-dialog");
			frappe.visual.gsap.to(dialog, {
				opacity: 0, scale: 0.95, y: 10, duration: 0.2, ease: "power2.in",
				onComplete: () => {
					_overlayEl.classList.remove("fv-sc-visible");
					_visible = false;
				},
			});
		} else {
			_overlayEl.classList.remove("fv-sc-visible");
			_visible = false;
		}
	}

	function toggle() {
		_visible ? hide() : show();
	}

	// ── Ctrl+/ Binding ─────────────────────────────────────────────
	document.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "/") {
			const tag = document.activeElement?.tagName?.toLowerCase();
			if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
			e.preventDefault();
			toggle();
		}

		if (e.key === "Escape" && _visible) {
			e.preventDefault();
			hide();
		}
	});

	// ── CSS ────────────────────────────────────────────────────────
	function _injectCSS() {
		if (document.getElementById("fv-shortcut-cheatsheet-css")) return;
		const style = document.createElement("style");
		style.id = "fv-shortcut-cheatsheet-css";
		style.textContent = `
.fv-sc-overlay {
	display: none;
	position: fixed;
	inset: 0;
	z-index: var(--fv-z-modals, 1000);
	align-items: center;
	justify-content: center;
}
.fv-sc-overlay.fv-sc-visible { display: flex; }
.fv-sc-backdrop {
	position: absolute;
	inset: 0;
	background: rgba(0,0,0,0.4);
	backdrop-filter: blur(4px);
}
.fv-sc-dialog {
	position: relative;
	width: 580px;
	max-width: 92vw;
	max-height: 80vh;
	border-radius: 16px;
	background: var(--fv-glass-bg, rgba(255,255,255,0.88));
	backdrop-filter: blur(20px) saturate(1.4);
	border: 1px solid var(--fv-glass-border, rgba(255,255,255,0.35));
	box-shadow: 0 24px 80px rgba(0,0,0,0.18);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.fv-sc-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 22px 14px;
	border-block-end: 1px solid rgba(0,0,0,0.06);
}
.fv-sc-title {
	font-size: 16px;
	font-weight: 700;
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	color: var(--text-color, #1e293b);
}
.fv-sc-title i { color: var(--fv-accent, #6366f1); font-size: 18px; }
.fv-sc-close {
	background: none; border: none; cursor: pointer;
	color: var(--text-muted); padding: 4px; border-radius: 6px;
	transition: background 0.15s;
}
.fv-sc-close:hover { background: rgba(0,0,0,0.06); }
.fv-sc-body {
	padding: 16px 22px;
	overflow-y: auto;
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
}
.fv-sc-group {
	flex: 1 1 240px;
	min-width: 240px;
}
.fv-sc-group-title {
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--ctx-color, #6366f1);
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 10px;
	padding-block-end: 6px;
	border-block-end: 2px solid color-mix(in srgb, var(--ctx-color) 20%, transparent);
}
.fv-sc-group-title i { font-size: 14px; }
.fv-sc-items { display: flex; flex-direction: column; gap: 4px; }
.fv-sc-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px 8px;
	border-radius: 8px;
	transition: background 0.15s;
}
.fv-sc-item:hover { background: rgba(0,0,0,0.04); }
.fv-sc-item-label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: var(--text-color, #334155);
}
.fv-sc-item-label i { font-size: 14px; opacity: 0.7; }
.fv-sc-item-keys {
	display: flex;
	align-items: center;
	gap: 3px;
}
.fv-sc-kbd {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 22px;
	height: 22px;
	padding: 0 6px;
	font-size: 11px;
	font-family: inherit;
	font-weight: 600;
	color: var(--text-muted, #64748b);
	background: rgba(0,0,0,0.05);
	border: 1px solid rgba(0,0,0,0.1);
	border-radius: 5px;
	box-shadow: 0 1px 0 rgba(0,0,0,0.08);
}
.fv-sc-plus {
	font-size: 10px;
	color: var(--text-muted);
	margin: 0 1px;
}
.fv-sc-footer {
	padding: 10px 22px;
	border-block-start: 1px solid rgba(0,0,0,0.06);
	text-align: center;
}
.fv-sc-footer-hint {
	font-size: 11px;
	color: var(--text-muted);
}
/* Dark mode */
[data-theme="dark"] .fv-sc-dialog {
	background: rgba(15,15,28,0.92);
	border-color: rgba(255,255,255,0.08);
}
[data-theme="dark"] .fv-sc-kbd {
	background: rgba(255,255,255,0.08);
	border-color: rgba(255,255,255,0.12);
	color: #94a3b8;
}
[data-theme="dark"] .fv-sc-item:hover {
	background: rgba(255,255,255,0.04);
}
/* RTL */
[dir="rtl"] .fv-sc-item {
	flex-direction: row-reverse;
}
/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
	.fv-sc-dialog { transition: none !important; }
}
`;
		document.head.appendChild(style);
	}

	_injectCSS();

	// ── Public API ─────────────────────────────────────────────────
	frappe.visual.shortcutCheatsheet = {
		show,
		hide,
		toggle,
		register,
		get isVisible() { return _visible; },
		get shortcuts() { return [..._shortcuts]; },
	};
})();
