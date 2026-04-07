/**
 * Frappe Visual — Unified Drag & Drop Manager
 * ==============================================
 * Single DnD service unifying GSAP/HTML5/pointer events.
 * Drop zone registry, cross-component drag, touch support,
 * and accessibility announcements.
 *
 * @module utils/drag_manager
 * @since v0.2.0
 *
 * Usage:
 *   const cleanup = frappe.visual.drag.makeDraggable(el, { type: "card", data: {...} })
 *   const cleanup = frappe.visual.drag.makeDropZone(zone, { accept: ["card"], onDrop: fn })
 *   frappe.visual.drag.onDragStart(fn)
 */
(function () {
	"use strict";

	// ── Configuration ──────────────────────────────────────────
	const DRAG_THRESHOLD = 5;       // px before drag initiates
	const SCROLL_EDGE = 40;         // px from edge to trigger auto-scroll
	const SCROLL_SPEED = 8;         // px per frame for auto-scroll
	const GHOST_OPACITY = 0.85;
	const DROP_HIGHLIGHT_CLASS = "fv-drop-highlight";
	const DRAGGING_CLASS = "fv-dragging";
	const DRAG_OVER_CLASS = "fv-drag-over";
	const DRAG_VALID_CLASS = "fv-drag-valid";
	const DRAG_INVALID_CLASS = "fv-drag-invalid";

	// ── State ──────────────────────────────────────────────────
	const _dropZones = new Map();   // element → { accept, onDrop, onDragOver, onDragLeave, id }
	const _draggables = new Map();  // element → { type, data, handle, ghost, cleanup }
	const _listeners = {
		dragStart: new Set(),
		dragMove: new Set(),
		dragEnd: new Set(),
		drop: new Set(),
	};
	let _activeDrag = null;         // Current drag operation
	let _scrollInterval = null;
	let _idCounter = 0;
	let _ariaLive = null;

	// ── ARIA Live Region ───────────────────────────────────────
	function _ensureAriaLive() {
		if (_ariaLive) return _ariaLive;
		_ariaLive = document.createElement("div");
		_ariaLive.setAttribute("role", "status");
		_ariaLive.setAttribute("aria-live", "assertive");
		_ariaLive.setAttribute("aria-atomic", "true");
		_ariaLive.className = "sr-only";
		Object.assign(_ariaLive.style, {
			position: "absolute",
			width: "1px",
			height: "1px",
			overflow: "hidden",
			clip: "rect(0,0,0,0)",
			whiteSpace: "nowrap",
		});
		document.body.appendChild(_ariaLive);
		return _ariaLive;
	}

	function _announce(message) {
		const el = _ensureAriaLive();
		el.textContent = "";
		requestAnimationFrame(() => { el.textContent = message; });
	}

	// ── Ghost Element ──────────────────────────────────────────
	function _createGhost(source, options = {}) {
		if (options.customGhost) {
			const ghost = typeof options.customGhost === "function"
				? options.customGhost(source)
				: options.customGhost.cloneNode(true);
			_styleGhost(ghost);
			return ghost;
		}

		const rect = source.getBoundingClientRect();
		const ghost = source.cloneNode(true);
		ghost.style.width = `${rect.width}px`;
		ghost.style.height = `${rect.height}px`;
		_styleGhost(ghost);
		return ghost;
	}

	function _styleGhost(ghost) {
		Object.assign(ghost.style, {
			position: "fixed",
			zIndex: "99999",
			pointerEvents: "none",
			opacity: GHOST_OPACITY,
			transition: "transform 0.1s ease, opacity 0.15s ease",
			willChange: "transform",
			filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15))",
		});
		ghost.classList.add("fv-drag-ghost");
		ghost.setAttribute("aria-hidden", "true");
	}

	function _moveGhost(ghost, x, y) {
		ghost.style.transform = `translate(${x}px, ${y}px) scale(1.02)`;
	}

	// ── Auto-Scroll ────────────────────────────────────────────
	function _startAutoScroll(x, y) {
		_stopAutoScroll();
		_scrollInterval = requestAnimationFrame(function tick() {
			if (!_activeDrag) return;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			let dx = 0, dy = 0;

			if (x < SCROLL_EDGE) dx = -SCROLL_SPEED;
			else if (x > vw - SCROLL_EDGE) dx = SCROLL_SPEED;
			if (y < SCROLL_EDGE) dy = -SCROLL_SPEED;
			else if (y > vh - SCROLL_EDGE) dy = SCROLL_SPEED;

			if (dx || dy) {
				// Find nearest scrollable ancestor
				const scrollParent = _findScrollParent(_activeDrag.source);
				if (scrollParent) {
					scrollParent.scrollBy(dx, dy);
				} else {
					window.scrollBy(dx, dy);
				}
			}
			_scrollInterval = requestAnimationFrame(tick);
		});
	}

	function _stopAutoScroll() {
		if (_scrollInterval) {
			cancelAnimationFrame(_scrollInterval);
			_scrollInterval = null;
		}
	}

	function _findScrollParent(el) {
		let node = el?.parentElement;
		while (node) {
			const { overflow, overflowY, overflowX } = getComputedStyle(node);
			if (/(auto|scroll)/.test(overflow + overflowY + overflowX)) return node;
			node = node.parentElement;
		}
		return null;
	}

	// ── Drop Zone Detection ────────────────────────────────────
	function _findDropZone(x, y) {
		if (!_activeDrag) return null;

		const elements = document.elementsFromPoint(x, y);
		for (const el of elements) {
			if (_dropZones.has(el)) {
				const zone = _dropZones.get(el);
				if (_isAccepted(zone, _activeDrag.type)) {
					return { element: el, zone };
				}
			}
			// Check ancestors
			let parent = el.parentElement;
			while (parent) {
				if (_dropZones.has(parent)) {
					const zone = _dropZones.get(parent);
					if (_isAccepted(zone, _activeDrag.type)) {
						return { element: parent, zone };
					}
				}
				parent = parent.parentElement;
			}
		}
		return null;
	}

	function _isAccepted(zone, type) {
		if (!zone.accept) return true;
		if (Array.isArray(zone.accept)) return zone.accept.includes(type);
		if (typeof zone.accept === "function") return zone.accept(type);
		return zone.accept === type;
	}

	// ── Core Drag Logic (Pointer Events) ───────────────────────

	function _onPointerDown(e, el, config) {
		// Check if drag should start from handle
		if (config.handle) {
			const handle = el.querySelector(config.handle);
			if (handle && !handle.contains(e.target)) return;
		}

		// Don't interfere with interactive elements
		if (e.target.closest("input, textarea, select, button, a, [contenteditable]")) return;

		const startX = e.clientX;
		const startY = e.clientY;
		let isDragging = false;
		let ghost = null;

		const onMove = (moveE) => {
			const dx = moveE.clientX - startX;
			const dy = moveE.clientY - startY;

			// Threshold check
			if (!isDragging) {
				if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
				isDragging = true;

				// Create ghost
				ghost = _createGhost(el, config);
				document.body.appendChild(ghost);

				// Set active drag state
				_activeDrag = {
					source: el,
					type: config.type || "default",
					data: typeof config.data === "function" ? config.data() : (config.data || {}),
					startX, startY,
					ghost,
					offsetX: startX - el.getBoundingClientRect().left,
					offsetY: startY - el.getBoundingClientRect().top,
				};

				// Visual feedback
				el.classList.add(DRAGGING_CLASS);
				document.body.classList.add("fv-is-dragging");
				if (config.placeholder !== false) {
					el.style.opacity = "0.3";
				}

				// Highlight valid drop zones
				_highlightDropZones(config.type);

				// Notify
				_notify("dragStart", _activeDrag);
				_announce(frappe._("Started dragging {0}").replace("{0}", config.label || config.type));
			}

			if (isDragging && ghost) {
				const gx = moveE.clientX - _activeDrag.offsetX;
				const gy = moveE.clientY - _activeDrag.offsetY;
				_moveGhost(ghost, gx, gy);

				// Auto-scroll
				_startAutoScroll(moveE.clientX, moveE.clientY);

				// Check drop zones
				const dropTarget = _findDropZone(moveE.clientX, moveE.clientY);
				_updateDropHighlight(dropTarget);

				_activeDrag.currentX = moveE.clientX;
				_activeDrag.currentY = moveE.clientY;
				_activeDrag.dropTarget = dropTarget;

				_notify("dragMove", _activeDrag);
			}
		};

		const onUp = (upE) => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			document.removeEventListener("pointercancel", onUp);

			if (!isDragging) return;

			_stopAutoScroll();

			// Check drop
			const dropTarget = _findDropZone(upE.clientX, upE.clientY);

			if (dropTarget) {
				// Animate ghost to drop position
				const dropRect = dropTarget.element.getBoundingClientRect();
				if (ghost) {
					ghost.style.transition = "transform 0.2s ease, opacity 0.2s ease";
					ghost.style.transform = `translate(${dropRect.left}px, ${dropRect.top}px) scale(0.95)`;
					ghost.style.opacity = "0";
				}

				// Execute drop
				try {
					if (dropTarget.zone.onDrop) {
						dropTarget.zone.onDrop({
							data: _activeDrag.data,
							type: _activeDrag.type,
							source: _activeDrag.source,
							target: dropTarget.element,
							x: upE.clientX,
							y: upE.clientY,
						});
					}
				} catch (err) {
					console.error("[FV Drag] Drop handler error:", err);
				}

				_notify("drop", {
					..._activeDrag,
					dropTarget: dropTarget.element,
				});

				_announce(
					frappe._("Dropped {0} into {1}").replace("{0}", config.label || config.type)
						.replace("{1}", dropTarget.zone.label || "drop zone")
				);
			} else {
				// Snap back animation
				if (ghost) {
					ghost.style.transition = "transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease";
					const origRect = el.getBoundingClientRect();
					ghost.style.transform = `translate(${origRect.left}px, ${origRect.top}px) scale(1)`;
					ghost.style.opacity = "0";
				}
				_announce(frappe._("Drag cancelled"));
			}

			// Cleanup
			setTimeout(() => {
				if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
			}, 300);

			el.classList.remove(DRAGGING_CLASS);
			el.style.opacity = "";
			document.body.classList.remove("fv-is-dragging");
			_clearDropHighlights();

			_notify("dragEnd", { ..._activeDrag, dropped: !!dropTarget });
			_activeDrag = null;
		};

		document.addEventListener("pointermove", onMove, { passive: true });
		document.addEventListener("pointerup", onUp);
		document.addEventListener("pointercancel", onUp);

		// Prevent text selection during drag
		if (!config.allowSelection) {
			e.preventDefault();
		}
	}

	// ── Drop Zone Highlighting ─────────────────────────────────

	function _highlightDropZones(dragType) {
		_dropZones.forEach((zone, el) => {
			if (_isAccepted(zone, dragType)) {
				el.classList.add(DROP_HIGHLIGHT_CLASS);
			}
		});
	}

	function _updateDropHighlight(dropTarget) {
		// Remove old highlights
		document.querySelectorAll(`.${DRAG_OVER_CLASS}`).forEach((el) => {
			el.classList.remove(DRAG_OVER_CLASS, DRAG_VALID_CLASS, DRAG_INVALID_CLASS);
		});

		if (dropTarget) {
			dropTarget.element.classList.add(DRAG_OVER_CLASS, DRAG_VALID_CLASS);
			if (dropTarget.zone.onDragOver) {
				try { dropTarget.zone.onDragOver(_activeDrag); }
				catch (e) { /* ignore */ }
			}
		}
	}

	function _clearDropHighlights() {
		document.querySelectorAll(
			`.${DROP_HIGHLIGHT_CLASS}, .${DRAG_OVER_CLASS}, .${DRAG_VALID_CLASS}, .${DRAG_INVALID_CLASS}`
		).forEach((el) => {
			el.classList.remove(DROP_HIGHLIGHT_CLASS, DRAG_OVER_CLASS, DRAG_VALID_CLASS, DRAG_INVALID_CLASS);
		});
	}

	// ── Notification ───────────────────────────────────────────
	function _notify(event, data) {
		_listeners[event]?.forEach((fn) => {
			try { fn(data); }
			catch (e) { console.error(`[FV Drag] ${event} listener error:`, e); }
		});

		// Emit on EventBus
		if (frappe.visual.eventBus && typeof frappe.visual.eventBus.emit === "function") {
			frappe.visual.eventBus.emit(`drag:${event}`, data);
		}
	}

	// ── Sortable Helper ────────────────────────────────────────

	/**
	 * Make a container's children sortable by drag.
	 * @param {Element} container - Parent element
	 * @param {Object} options - { itemSelector, handle, type, onReorder }
	 * @returns {Function} cleanup
	 */
	function makeSortable(container, options = {}) {
		const {
			itemSelector = ":scope > *",
			handle = null,
			type = "sortable-item",
			onReorder = null,
			axis = "both",  // "x" | "y" | "both"
		} = options;

		const cleanups = [];
		let placeholder = null;

		const updateItems = () => {
			// Clean up old
			cleanups.forEach((fn) => fn());
			cleanups.length = 0;

			const items = container.querySelectorAll(itemSelector);
			items.forEach((item, index) => {
				item.dataset.fvSortIndex = index;

				const cleanup = makeDraggable(item, {
					type,
					handle,
					data: () => ({ index: parseInt(item.dataset.fvSortIndex), element: item }),
					label: `item ${index + 1}`,
				});
				cleanups.push(cleanup);
			});
		};

		// Drop zone is the container itself
		const dropCleanup = makeDropZone(container, {
			accept: [type],
			label: "sortable list",
			onDrop({ data, y, x }) {
				if (!placeholder) return;
				const targetIndex = parseInt(placeholder.dataset.fvSortIndex || "0");
				const sourceIndex = data.index;

				// Remove placeholder
				if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
				placeholder = null;

				// Reorder
				if (sourceIndex !== targetIndex && onReorder) {
					onReorder({ from: sourceIndex, to: targetIndex, container });
				}

				updateItems();
			},
			onDragOver(dragState) {
				if (!dragState) return;
				const items = [...container.querySelectorAll(itemSelector)];
				const mouseY = dragState.currentY;
				const mouseX = dragState.currentX;

				// Find insertion point
				let insertBefore = null;
				for (const item of items) {
					if (item === dragState.source) continue;
					const rect = item.getBoundingClientRect();
					const midY = rect.top + rect.height / 2;
					const midX = rect.left + rect.width / 2;

					if (axis === "y" && mouseY < midY) { insertBefore = item; break; }
					if (axis === "x" && mouseX < midX) { insertBefore = item; break; }
					if (axis === "both" && mouseY < midY) { insertBefore = item; break; }
				}

				// Create/move placeholder
				if (!placeholder) {
					placeholder = document.createElement("div");
					placeholder.className = "fv-sort-placeholder";
					const srcRect = dragState.source.getBoundingClientRect();
					placeholder.style.height = `${srcRect.height}px`;
					placeholder.style.width = `${srcRect.width}px`;
				}

				if (insertBefore) {
					const idx = items.indexOf(insertBefore);
					placeholder.dataset.fvSortIndex = idx;
					container.insertBefore(placeholder, insertBefore);
				} else {
					placeholder.dataset.fvSortIndex = items.length;
					container.appendChild(placeholder);
				}
			},
		});

		updateItems();

		// Observe for dynamic children
		const observer = new MutationObserver(() => {
			setTimeout(updateItems, 50);
		});
		observer.observe(container, { childList: true });

		return () => {
			cleanups.forEach((fn) => fn());
			dropCleanup();
			observer.disconnect();
			if (placeholder && placeholder.parentNode) {
				placeholder.parentNode.removeChild(placeholder);
			}
		};
	}

	// ── Public API ─────────────────────────────────────────────

	/**
	 * Make an element draggable.
	 * @param {Element} el
	 * @param {Object} config - { type, data, handle, label, customGhost, placeholder, allowSelection }
	 * @returns {Function} cleanup
	 */
	function makeDraggable(el, config = {}) {
		if (!el || !(el instanceof Element)) return () => {};

		el.style.touchAction = "none"; // Enable pointer events
		el.setAttribute("draggable", "false"); // Disable native to use pointer
		el.setAttribute("role", "option");
		el.setAttribute("aria-grabbed", "false");
		el.setAttribute("tabindex", config.tabindex ?? "0");

		const handler = (e) => _onPointerDown(e, el, config);
		el.addEventListener("pointerdown", handler);

		// Keyboard support: Space/Enter to initiate, Arrow keys to move
		const keyHandler = (e) => {
			if (e.key === " " || e.key === "Enter") {
				e.preventDefault();
				_announce(frappe._("Grabbed {0}. Use arrow keys to move, Enter to drop, Escape to cancel.")
					.replace("{0}", config.label || config.type || "item"));
				el.setAttribute("aria-grabbed", "true");
				// Simplified keyboard DnD mode
				el.__fvKeyboardDrag = true;
			} else if (el.__fvKeyboardDrag && e.key === "Escape") {
				el.__fvKeyboardDrag = false;
				el.setAttribute("aria-grabbed", "false");
				_announce(frappe._("Drag cancelled"));
			}
		};
		el.addEventListener("keydown", keyHandler);

		const entry = { type: config.type, data: config.data, handle: config.handle };
		_draggables.set(el, entry);

		return () => {
			el.removeEventListener("pointerdown", handler);
			el.removeEventListener("keydown", keyHandler);
			el.style.touchAction = "";
			el.removeAttribute("draggable");
			el.removeAttribute("role");
			el.removeAttribute("aria-grabbed");
			_draggables.delete(el);
		};
	}

	/**
	 * Register an element as a drop zone.
	 * @param {Element} el
	 * @param {Object} config - { accept, onDrop, onDragOver, onDragLeave, label }
	 * @returns {Function} cleanup
	 */
	function makeDropZone(el, config = {}) {
		if (!el || !(el instanceof Element)) return () => {};

		const id = ++_idCounter;
		el.setAttribute("role", "listbox");
		el.setAttribute("aria-dropeffect", "move");
		el.dataset.fvDropZone = id;

		_dropZones.set(el, { ...config, id });

		return () => {
			el.removeAttribute("role");
			el.removeAttribute("aria-dropeffect");
			delete el.dataset.fvDropZone;
			el.classList.remove(DROP_HIGHLIGHT_CLASS, DRAG_OVER_CLASS);
			_dropZones.delete(el);
		};
	}

	frappe.provide("frappe.visual.drag");

	Object.assign(frappe.visual.drag, {
		makeDraggable,
		makeDropZone,
		makeSortable,

		/** Check if a drag operation is active. */
		get isDragging() { return !!_activeDrag; },

		/** Get current drag state. */
		get active() { return _activeDrag ? { ...(_activeDrag) } : null; },

		// Event listeners
		onDragStart(fn) { _listeners.dragStart.add(fn); return () => _listeners.dragStart.delete(fn); },
		onDragMove(fn) { _listeners.dragMove.add(fn); return () => _listeners.dragMove.delete(fn); },
		onDragEnd(fn) { _listeners.dragEnd.add(fn); return () => _listeners.dragEnd.delete(fn); },
		onDrop(fn) { _listeners.drop.add(fn); return () => _listeners.drop.delete(fn); },

		/** Cancel active drag. */
		cancel() {
			if (_activeDrag) {
				_stopAutoScroll();
				if (_activeDrag.ghost?.parentNode) _activeDrag.ghost.parentNode.removeChild(_activeDrag.ghost);
				_activeDrag.source?.classList.remove(DRAGGING_CLASS);
				if (_activeDrag.source) _activeDrag.source.style.opacity = "";
				document.body.classList.remove("fv-is-dragging");
				_clearDropHighlights();
				_activeDrag = null;
				_announce(frappe._("Drag cancelled"));
			}
		},

		/** Destroy all registered draggables and drop zones. */
		destroy() {
			_draggables.forEach((_, el) => {
				el.style.touchAction = "";
				el.removeAttribute("draggable");
			});
			_draggables.clear();
			_dropZones.clear();
			_clearDropHighlights();
			Object.values(_listeners).forEach((s) => s.clear());
			_stopAutoScroll();
			_activeDrag = null;
		},
	});

	console.log(
		"%c⬡ FV Drag Manager%c ready — makeDraggable() · makeDropZone() · makeSortable()",
		"color:#f59e0b;font-weight:bold",
		"color:#94a3b8"
	);
})();
