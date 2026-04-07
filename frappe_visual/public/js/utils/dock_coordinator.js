// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Dock Coordinator
 * ===================================
 * Shared layout negotiation layer that prevents FloatingWindow and
 * DockLayout panels from overlapping. Maintains a registry of
 * "reserved regions" and adjusts window positions accordingly.
 *
 * Architecture:
 * ─────────────
 *  DockLayout panels register their bounding rects as "reserved zones".
 *  FloatingWindow cascade positions consult this registry to avoid
 *  overlap. When a dock panel is toggled/resized, all open floating
 *  windows are nudged out of the newly reserved area.
 *
 * Integration:
 *  - Auto-patches FloatingWindow constructor to consult reserved zones
 *  - Auto-patches DockLayout to emit region changes
 *  - EventBus events: dock:regionChange, window:repositioned
 *
 * @module frappe_visual/utils/dock_coordinator
 */

frappe.provide("frappe.visual.dockCoordinator");

(function () {
	"use strict";

	/* ── Reserved Regions Registry ────────────────────────────── */
	const _regions = new Map(); // id → { x, y, width, height, position }
	const MARGIN = 12; // px gap between windows and panels

	/* ── Init ─────────────────────────────────────────────────── */
	function init() {
		_patchFloatingWindow();
		_patchDockLayout();

		// Listen for EventBus region updates
		if (frappe.visual?.eventBus) {
			frappe.visual.eventBus.on("dock:panelToggle", _onPanelToggle);
			frappe.visual.eventBus.on("dock:panelResize", _onPanelResize);
		}

		// Observe window resize
		window.addEventListener("resize", _debounce(_repositionAll, 200));
	}

	/* ── Region Management ────────────────────────────────────── */
	function registerRegion(id, rect) {
		_regions.set(id, { ...rect });
		_repositionAll();
		frappe.visual?.eventBus?.emit("dock:regionChange", { id, rect, action: "register" });
	}

	function unregisterRegion(id) {
		_regions.delete(id);
		frappe.visual?.eventBus?.emit("dock:regionChange", { id, action: "unregister" });
	}

	function updateRegion(id, rect) {
		if (_regions.has(id)) {
			_regions.set(id, { ...rect });
			_repositionAll();
			frappe.visual?.eventBus?.emit("dock:regionChange", { id, rect, action: "update" });
		}
	}

	function getReservedRegions() {
		return Array.from(_regions.values());
	}

	/* ── Check if a rect overlaps any reserved region ─────────── */
	function _overlaps(rect) {
		for (const region of _regions.values()) {
			if (
				rect.x < region.x + region.width + MARGIN &&
				rect.x + rect.width + MARGIN > region.x &&
				rect.y < region.y + region.height + MARGIN &&
				rect.y + rect.height + MARGIN > region.y
			) {
				return region;
			}
		}
		return null;
	}

	/* ── Find a safe position for a floating window ───────────── */
	function findSafePosition(width, height, preferredX, preferredY) {
		let x = preferredX ?? window.innerWidth - width - 40;
		let y = preferredY ?? 80;

		const rect = { x, y, width, height };
		const overlapping = _overlaps(rect);

		if (overlapping) {
			// Try to place to the left of the overlapping region
			const leftX = overlapping.x - width - MARGIN;
			if (leftX >= 0) {
				x = leftX;
			} else {
				// Try below
				const belowY = overlapping.y + overlapping.height + MARGIN;
				if (belowY + height <= window.innerHeight) {
					y = belowY;
				} else {
					// Try above
					const aboveY = overlapping.y - height - MARGIN;
					if (aboveY >= 0) {
						y = aboveY;
					}
					// else: no safe spot, use original position
				}
			}
		}

		// Clamp to viewport
		x = Math.max(0, Math.min(x, window.innerWidth - width));
		y = Math.max(0, Math.min(y, window.innerHeight - height));

		return { x, y };
	}

	/* ── Reposition all open floating windows away from regions ── */
	function _repositionAll() {
		const FW = frappe.visual?.FloatingWindow;
		if (!FW?._windows?.length) return;

		for (const win of FW._windows) {
			if (!win.el || win.isMinimized) continue;

			const el = win.el;
			const rect = {
				x: parseInt(el.style.left) || 0,
				y: parseInt(el.style.top) || 0,
				width: el.offsetWidth,
				height: el.offsetHeight,
			};

			const overlapping = _overlaps(rect);
			if (overlapping) {
				const safe = findSafePosition(rect.width, rect.height, rect.x, rect.y);
				const gsap = frappe.visual?.gsap || window.gsap;
				if (gsap) {
					gsap.to(el, {
						left: safe.x,
						top: safe.y,
						duration: 0.4,
						ease: "power2.out",
					});
				} else {
					el.style.left = safe.x + "px";
					el.style.top = safe.y + "px";
				}

				frappe.visual?.eventBus?.emit("window:repositioned", {
					windowId: win.id,
					from: { x: rect.x, y: rect.y },
					to: safe,
					reason: "dock-overlap",
				});
			}
		}
	}

	/* ── Patch FloatingWindow ─────────────────────────────────── */
	function _patchFloatingWindow() {
		const FW = frappe.visual?.FloatingWindow;
		if (!FW || FW._dockCoordPatched) return;
		FW._dockCoordPatched = true;

		const origBuild = FW.prototype._build;
		FW.prototype._build = function () {
			// Calculate safe position before building
			const width = this.opts.width || 380;
			const height = this.opts.height || 280;

			if (this.opts.x == null || this.opts.y == null) {
				const winCount = FW._windows.length;
				const defaultX = window.innerWidth - width - 40 - winCount * 30;
				const defaultY = 80 + winCount * 30;

				const safe = findSafePosition(width, height, defaultX, defaultY);
				this.opts.x = safe.x;
				this.opts.y = safe.y;
			}

			origBuild.call(this);

			// Register this window's close to emit event
			const origClose = this.close?.bind(this);
			if (origClose) {
				this.close = () => {
					origClose();
					frappe.visual?.eventBus?.emit("window:closed", { windowId: this.id });
				};
			}
		};
	}

	/* ── Patch DockLayout ─────────────────────────────────────── */
	function _patchDockLayout() {
		const DL = frappe.visual?.DockLayout;
		if (!DL || DL._dockCoordPatched) return;
		DL._dockCoordPatched = true;

		const origCreate = DL.create;
		DL.create = function (opts = {}) {
			const result = origCreate.call(this, opts);

			// Register all visible panel regions
			_registerDockPanels(result.el, opts.panels || []);

			// Wrap togglePanel to update regions
			const origToggle = result.togglePanel;
			result.togglePanel = function (id) {
				origToggle(id);
				_registerDockPanels(result.el, opts.panels || []);
				frappe.visual?.eventBus?.emit("dock:panelToggle", { id });
			};

			// Observe resize changes
			if (typeof ResizeObserver !== "undefined") {
				const ro = new ResizeObserver(() => {
					_registerDockPanels(result.el, opts.panels || []);
				});
				result.el.querySelectorAll(".fv-dock-layout__panel").forEach((panel) => {
					ro.observe(panel);
				});

				const origDestroy = result.destroy;
				result.destroy = function () {
					ro.disconnect();
					// Unregister all regions
					opts.panels?.forEach((p) => unregisterRegion(`dock-${p.id}`));
					origDestroy();
				};
			}

			return result;
		};
	}

	/* ── Register dock panel rects ────────────────────────────── */
	function _registerDockPanels(wrapEl, panels) {
		for (const panel of panels) {
			const el = wrapEl.querySelector(`[data-panel-id="${panel.id}"]`);
			if (!el || el.classList.contains("fv-dock-layout__panel--hidden")) {
				unregisterRegion(`dock-${panel.id}`);
				continue;
			}

			const rect = el.getBoundingClientRect();
			registerRegion(`dock-${panel.id}`, {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: rect.height,
				position: panel.position,
			});
		}
	}

	/* ── EventBus Handlers ────────────────────────────────────── */
	function _onPanelToggle(data) {
		_repositionAll();
	}

	function _onPanelResize(data) {
		if (data?.id && data?.rect) {
			updateRegion(`dock-${data.id}`, data.rect);
		}
	}

	/* ── Utility ──────────────────────────────────────────────── */
	function _debounce(fn, ms) {
		let t;
		return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
	}

	/* ── Public API ───────────────────────────────────────────── */
	frappe.visual.dockCoordinator = {
		init,
		registerRegion,
		unregisterRegion,
		updateRegion,
		getReservedRegions,
		findSafePosition,
		repositionAll: _repositionAll,
	};

	/* ── Boot ─────────────────────────────────────────────────── */
	$(document).on("app_ready", () => {
		// Defer init so FloatingWindow and DockLayout are registered first
		setTimeout(init, 300);
	});
})();
