// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Desk Workspace
 * ================================
 * Transforms Frappe's desk into a VS Code-style split workspace.
 *
 * Architecture (Progressive Disclosure — جيكوب نيلسن 1995):
 * ─────────────────────────────────────────────────────────────
 * Standard Frappe desk:
 *   #body → sidebar → page-container → list/form
 *
 * With DeskWorkspace:
 *   #body → sidebar → page-container (unchanged)
 *              └── .fv-detail-panel  (slides in from the right)
 *
 * The detail panel is a floating glass panel injected at <body> level
 * that slides in when a list row is clicked, showing VisualFormDashboard
 * without ANY page reload or route change.
 *
 * Features:
 * ─────────
 * 1. ⌘K / Ctrl+K  — Global CommandPalette (instant search & navigate)
 * 2. Split View    — Per-list toggle: click row → preview in right panel
 * 3. Nav Sidebar   — Persistent mini workspace nav (optional, user toggle)
 * 4. ContextMenu   — Right-click circular menu on list rows
 * 5. Spring GSAP   — elastic.out / back.out for all panel transitions
 * 6. Keyboard Nav  — Esc close, ↑↓ navigate records, Ctrl+Enter open full
 *
 * Usage:
 * ──────
 *   frappe.visual.deskWorkspace.init()         // bootstrap (auto on app_ready)
 *   frappe.visual.deskWorkspace.openDetail(doctype, docname)
 *   frappe.visual.deskWorkspace.closeDetail()
 *   frappe.visual.deskWorkspace.toggleNavSidebar()
 */

frappe.provide("frappe.visual.deskWorkspace");

(function () {
	"use strict";

	// ── Constants ──────────────────────────────────────────────────
	const SPLIT_KEY_PREFIX = "fv_dw_split_";
	const PANEL_WIDTH_KEY = "fv_dw_panel_width";
	const NAV_SIDEBAR_KEY = "fv_dw_nav_sidebar";
	const DEFAULT_PANEL_WIDTH = 42; // percent of viewport
	const MIN_PANEL_WIDTH_PX = 240;
	const MAX_PANEL_WIDTH_PERCENT = 75;
	const CMD_PALETTE_KEY = "k";

	// ── State ──────────────────────────────────────────────────────
	let _panelEl = null;
	let _panelVisible = false;
	let _currentDoctype = null;
	let _currentDocname = null;
	let _currentList = null;
	let _panelWidth = DEFAULT_PANEL_WIDTH;
	let _navSidebarEl = null;
	let _navSidebarVisible = false;
	let _cmdPaletteBound = false;
	let _contextMenuBound = false;
	let _isDraggingPanel = false;
	let _dragStartX = 0;
	let _dragStartWidth = 0;
	let _splitActiveOn = {}; // { [doctype]: true }

	// Tab system state
	const MAX_TABS = 12;
	let _tabs = [];           // [{ id, doctype, docname, label, active }]
	let _activeTabId = null;

	// Recent records
	const RECENT_KEY = "fv_dw_recent";
	const MAX_RECENT = 20;
	let _recentRecords = [];  // [{ doctype, docname, label, timestamp }]

	// ── Initialization ─────────────────────────────────────────────
	function init() {
		_loadPrefs();
		_bindCmdK();
		_bindKeyboardNav();
		_bindPageChange();
		_injectCSS();
	}

	function _loadPrefs() {
		const storedWidth = parseFloat(localStorage.getItem(PANEL_WIDTH_KEY));
		if (!isNaN(storedWidth)) _panelWidth = storedWidth;

		const storedNav = localStorage.getItem(NAV_SIDEBAR_KEY);
		if (storedNav === "1") {
			// Defer until DOM is ready
			setTimeout(_buildNavSidebar, 800);
		}

		// Load recent records from localStorage (synced to server in background)
		try {
			_recentRecords = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
		} catch { _recentRecords = []; }

		// Async sync from server
		_syncRecentFromServer();
	}

	// ── CMD+K Palette ──────────────────────────────────────────────
	function _bindCmdK() {
		if (_cmdPaletteBound) return;
		_cmdPaletteBound = true;

		document.addEventListener("keydown", async (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === CMD_PALETTE_KEY) {
				// Skip if typing inside an input or editor
				const tag = document.activeElement?.tagName?.toLowerCase();
				if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
					return; // Let the input handle it
				}
				e.preventDefault();
				e.stopPropagation();
				await _ensureBundle();
				frappe.visual.CommandPalette?.toggle?.();
			}
		});
	}

	// ── Keyboard Navigation in Detail Panel ───────────────────────
	function _bindKeyboardNav() {
		document.addEventListener("keydown", (e) => {
			if (!_panelVisible) return;

			if (e.key === "Escape") {
				e.preventDefault();
				closeDetail();
				return;
			}

			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault();
				_openFullForm();
				return;
			}

			// Arrow navigation through list rows
			if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				e.preventDefault();
				_navigateList(e.key === "ArrowUp" ? -1 : 1);
			}

			// Ctrl+Tab — switch between tabs
			if (e.ctrlKey && e.key === "Tab") {
				e.preventDefault();
				_cycleTab(e.shiftKey ? -1 : 1);
			}

			// Ctrl+W — close current tab
			if (e.ctrlKey && e.key === "w") {
				e.preventDefault();
				_closeTab(_activeTabId);
			}
		});
	}

	// ── Page Change ────────────────────────────────────────────────
	function _bindPageChange() {
		$(document).on("page-change", () => {
			setTimeout(_onPageChange, 350);
		});
	}

	function _onPageChange() {
		const route = frappe.get_route?.();
		if (!route) return;

		const page = route[0];
		const doctype = route[1];

		if (page === "List" && doctype) {
			_currentDoctype = doctype;
			_currentList = null;
			_waitForListView(doctype);
		} else if (page === "Form") {
			// Full form navigation — close split panel
			if (_panelVisible) closeDetail();
		} else {
			// Non-list page: hide panel
			if (_panelVisible) closeDetail(true); // silent close
		}
	}

	function _waitForListView(doctype) {
		let attempts = 0;
		const check = () => {
			attempts++;
			// cur_list is Frappe's global current list view instance
			if (typeof cur_list !== "undefined" && cur_list?.doctype === doctype) {
				_onListReady(cur_list);
			} else if (attempts < 15) {
				setTimeout(check, 150);
			}
		};
		check();
	}

	function _onListReady(listView) {
		_currentList = listView;
		_injectSplitButton(listView);
		_bindListRowClicks(listView);
		_bindContextMenu(listView);

		// Re-open split if it was active for this doctype
		if (_splitActiveOn[listView.doctype]) {
			_markSplitActive(listView, true);
		}
	}

	// ── Split Toggle Button ────────────────────────────────────────
	function _injectSplitButton(listView) {
		const $page = listView?.$page;
		if (!$page || $page.find(".fv-dw-split-btn").length) return;

		const isActive = _splitActiveOn[listView.doctype];

		const $btn = $(`
			<button class="btn btn-sm fv-dw-split-btn ${isActive ? "fv-dw-split-active" : ""}"
				title="${__("Split View — click row to preview without leaving the list")} (VS Code style)">
				<svg class="fv-dw-split-icon" width="14" height="14" viewBox="0 0 24 24"
					fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<rect x="3" y="3" width="18" height="18" rx="2"/>
					<line x1="12" y1="3" x2="12" y2="21"/>
				</svg>
				<span>${isActive ? __("Split ✓") : __("Split")}</span>
			</button>
		`);

		const $actions = $page.find(".page-actions").first();
		if ($actions.length) {
			$actions.prepend($btn);
		}

		$btn.on("click", () => {
			const nowActive = !_splitActiveOn[listView.doctype];
			_markSplitActive(listView, nowActive);

			if (!nowActive && _panelVisible && _currentDoctype === listView.doctype) {
				closeDetail();
			}
		});
	}

	function _markSplitActive(listView, active) {
		if (active) {
			_splitActiveOn[listView.doctype] = true;
		} else {
			delete _splitActiveOn[listView.doctype];
		}

		const $btn = listView.$page?.find(".fv-dw-split-btn");
		if ($btn?.length) {
			$btn.toggleClass("fv-dw-split-active", active);
			$btn.find("span").text(active ? __("Split ✓") : __("Split"));
		}
	}

	// ── List Row Clicks ────────────────────────────────────────────
	function _bindListRowClicks(listView) {
		const $page = listView?.$page;
		if (!$page) return;

		// Use event delegation — works even as list re-renders
		$page.off("click.fvDWRow").on("click.fvDWRow", ".list-row .level", async (e) => {
			if (!_splitActiveOn[listView.doctype]) return;

			// Don't intercept checkboxes, action buttons, or links
			const $target = $(e.target);
			if ($target.closest(".list-row-checkbox, .btn, .dropdown, .actions-btn-group, .indicator-pill").length) {
				return;
			}

			const $row = $target.closest(".list-row");
			if (!$row.length) return;

			const docname = $row.attr("data-name");
			if (!docname) return;

			// Let Frappe handle normal navigation unless split is active
			e.preventDefault();
			e.stopPropagation();

			_highlightRow($row, listView);
			await openDetail(listView.doctype, docname);
		});
	}

	function _highlightRow($row, listView) {
		// Deselect previous active row
		listView.$page?.find(".fv-dw-row-active").removeClass("fv-dw-row-active");
		$row.addClass("fv-dw-row-active");
	}

	// ── Context Menu (Right-click) ─────────────────────────────────
	function _bindContextMenu(listView) {
		if (_contextMenuBound) return;
		_contextMenuBound = true;

		const $page = listView?.$page;
		if (!$page) return;

		$page.off("contextmenu.fvDW").on("contextmenu.fvDW", ".list-row", async (e) => {
			if (!frappe.visual.ContextMenu) return;

			const $row = $(e.currentTarget);
			const docname = $row.attr("data-name");
			const doctype = listView.doctype;
			if (!docname) return;

			e.preventDefault();

			await _ensureBundle();

			frappe.visual.ContextMenu.show({
				x: e.clientX,
				y: e.clientY,
				items: [
					{
						label: __("Preview"),
						icon: "eye",
						action: () => {
							_markSplitActive(listView, true);
							openDetail(doctype, docname);
						},
					},
					{
						label: __("Open Full Form"),
						icon: "external-link",
						action: () => frappe.set_route("Form", doctype, docname),
					},
					{
						label: __("Duplicate"),
						icon: "copy",
						action: () => frappe.model.open_mapped_doc({
							method: "frappe.model.mapper.map_doc",
							source_doctype: doctype,
							source_name: docname,
							target_doctype: doctype,
						}),
					},
					{ divider: true },
					{
						label: __("New"),
						icon: "plus",
						action: () => frappe.new_doc(doctype),
					},
					{
						label: __("Delete"),
						icon: "trash",
						danger: true,
						action: () => {
							frappe.confirm(
								__("Delete {0}?", [docname]),
								() => frappe.xcall("frappe.client.delete", { doctype, name: docname })
									.then(() => listView.refresh?.())
							);
						},
					},
				],
			});
		});
	}

	// ── Keyboard Record Navigation ─────────────────────────────────
	function _navigateList(direction) {
		if (!_currentList || !_currentDocname) return;

		const $rows = _currentList.$page?.find(".list-row");
		if (!$rows?.length) return;

		const $active = $rows.filter(".fv-dw-row-active");
		let idx = $active.length ? $rows.index($active) : -1;
		idx += direction;

		if (idx < 0 || idx >= $rows.length) return;

		const $next = $rows.eq(idx);
		const docname = $next.attr("data-name");
		if (docname) {
			_highlightRow($next, _currentList);
			openDetail(_currentDoctype, docname);
		}
	}

	// ── Detail Panel ───────────────────────────────────────────────
	function _ensurePanel() {
		if (_panelEl && document.body.contains(_panelEl)) return _panelEl;

		const panel = document.createElement("div");
		panel.id = "fv-detail-panel";
		panel.className = "fv-dw-panel fv-fx-glass";
		panel.setAttribute("role", "complementary");
		panel.setAttribute("aria-label", __("Record Detail Panel"));
		panel.setAttribute("aria-hidden", "true");

		const savedW = parseFloat(localStorage.getItem(PANEL_WIDTH_KEY)) || DEFAULT_PANEL_WIDTH;

		panel.innerHTML = `
			<div class="fv-dw-panel-resize-handle" title="${__("Drag to resize")}">
				<div class="fv-dw-resize-grip">
					<span></span><span></span><span></span>
				</div>
			</div>
			<div class="fv-dw-tab-strip" id="fv-dw-tab-strip"></div>
			<div class="fv-dw-panel-header">
				<div class="fv-dw-panel-breadcrumb">
					<span class="fv-dw-panel-doctype-label"></span>
					<span class="fv-dw-panel-sep">›</span>
					<span class="fv-dw-panel-docname-label"></span>
				</div>
				<div class="fv-dw-panel-controls">
					<button class="fv-dw-ctrl-btn fv-dw-btn-nav-prev" title="${__("Previous record (↑)")}">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="18 15 12 9 6 15"/>
						</svg>
					</button>
					<button class="fv-dw-ctrl-btn fv-dw-btn-nav-next" title="${__("Next record (↓)")}">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
					<div class="fv-dw-ctrl-sep"></div>
					<button class="fv-dw-ctrl-btn fv-dw-btn-open-full" title="${__("Open full form (Ctrl+Enter)")}">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
							<polyline points="15 3 21 3 21 9"/>
							<line x1="10" y1="14" x2="21" y2="3"/>
						</svg>
					</button>
					<button class="fv-dw-ctrl-btn fv-dw-btn-close" title="${__("Close panel (Esc)")}">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			</div>
			<div class="fv-dw-panel-body">
				<div class="fv-dw-panel-placeholder">
					<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
						<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
						<polyline points="14 2 14 8 20 8"/>
						<line x1="16" y1="13" x2="8" y2="13"/>
						<line x1="16" y1="17" x2="8" y2="17"/>
						<polyline points="10 9 9 9 8 9"/>
					</svg>
					<p class="fv-dw-placeholder-text">${__("Select a record to preview")}</p>
					<p class="fv-dw-placeholder-hint">${__("Use ↑↓ to navigate · Esc to close · Ctrl+Enter to open full")}</p>
				</div>
			</div>
		`;

		panel.style.setProperty("--fv-panel-width", savedW + "vw");
		document.body.appendChild(panel);
		_panelEl = panel;

		_bindPanelEvents(panel);
		return panel;
	}

	function _bindPanelEvents(panel) {
		// Close button
		panel.querySelector(".fv-dw-btn-close")?.addEventListener("click", closeDetail);

		// Open full form button
		panel.querySelector(".fv-dw-btn-open-full")?.addEventListener("click", _openFullForm);

		// Navigation buttons
		panel.querySelector(".fv-dw-btn-nav-prev")?.addEventListener("click", () => _navigateList(-1));
		panel.querySelector(".fv-dw-btn-nav-next")?.addEventListener("click", () => _navigateList(1));

		// Resize handle — drag to change width
		const handle = panel.querySelector(".fv-dw-panel-resize-handle");
		if (handle) {
			handle.addEventListener("mousedown", _startPanelResize);
		}
	}

	// ── Panel Resize ───────────────────────────────────────────────
	function _startPanelResize(e) {
		e.preventDefault();
		_isDraggingPanel = true;
		_dragStartX = e.clientX;
		_dragStartWidth = parseFloat(_panelEl?.style.getPropertyValue("--fv-panel-width")) || DEFAULT_PANEL_WIDTH;

		document.addEventListener("mousemove", _onPanelDrag);
		document.addEventListener("mouseup", _stopPanelResize);
		document.body.classList.add("fv-dw-resizing");
	}

	function _onPanelDrag(e) {
		if (!_isDraggingPanel || !_panelEl) return;

		const deltaX = _dragStartX - e.clientX;
		const deltaPercent = (deltaX / window.innerWidth) * 100;
		let newWidth = _dragStartWidth + deltaPercent;

		// Clamp
		const minPercent = (MIN_PANEL_WIDTH_PX / window.innerWidth) * 100;
		newWidth = Math.max(minPercent, Math.min(MAX_PANEL_WIDTH_PERCENT, newWidth));

		_panelEl.style.setProperty("--fv-panel-width", newWidth + "vw");
		_panelWidth = newWidth;
	}

	function _stopPanelResize() {
		_isDraggingPanel = false;
		document.removeEventListener("mousemove", _onPanelDrag);
		document.removeEventListener("mouseup", _stopPanelResize);
		document.body.classList.remove("fv-dw-resizing");
		localStorage.setItem(PANEL_WIDTH_KEY, _panelWidth);
	}

	// ── Open Detail ────────────────────────────────────────────────
	async function openDetail(doctype, docname) {
		_currentDoctype = doctype;
		_currentDocname = docname;

		const panel = _ensurePanel();

		// Update breadcrumb
		panel.querySelector(".fv-dw-panel-doctype-label").textContent = __(doctype);
		panel.querySelector(".fv-dw-panel-docname-label").textContent = docname;

		// Show panel with GSAP spring animation
		if (!_panelVisible) {
			panel.removeAttribute("aria-hidden");
			panel.classList.add("fv-dw-panel--visible");
			document.body.classList.add("fv-dw-panel-open");
			_panelVisible = true;

			// Spring-physics entrance
			await _ensureBundle();
			if (frappe.visual.gsap) {
				frappe.visual.gsap.fromTo(
					panel,
					{ x: "100%", opacity: 0 },
					{
						x: "0%",
						opacity: 1,
						duration: 0.5,
						ease: "elastic.out(1, 0.7)",
						clearProps: "transform",
					}
				);
			}
		}

		// ── Tab Management ──
		_addOrSwitchTab(doctype, docname);

		// ── Track recent record ──
		_addToRecent(doctype, docname);

		// ── Emit event ──
		frappe.visual.eventBus?.emit("detail:open", { doctype, docname });

		// Load content
		await _loadRecord(panel, doctype, docname);
	}

	async function _loadRecord(panel, doctype, docname) {
		const $body = $(panel).find(".fv-dw-panel-body");

		// Loading state with skeleton
		$body.html(`
			<div class="fv-dw-panel-loading">
				<div class="fv-dw-skeleton-header"></div>
				<div class="fv-dw-skeleton-stat-row">
					<div class="fv-dw-skeleton-stat"></div>
					<div class="fv-dw-skeleton-stat"></div>
					<div class="fv-dw-skeleton-stat"></div>
				</div>
				<div class="fv-dw-skeleton-body">
					<div class="fv-dw-skeleton-line fv-dw-skeleton-line--wide"></div>
					<div class="fv-dw-skeleton-line fv-dw-skeleton-line--mid"></div>
					<div class="fv-dw-skeleton-line fv-dw-skeleton-line--narrow"></div>
					<div class="fv-dw-skeleton-line fv-dw-skeleton-line--wide"></div>
					<div class="fv-dw-skeleton-line fv-dw-skeleton-line--mid"></div>
				</div>
			</div>
		`);

		try {
			await _ensureBundle();

			const $content = $('<div class="fv-dw-form-container fv-fx-page-enter"></div>');
			$body.empty().append($content);

			// VisualFormDashboard: embedded mode, compact for split panel
			await frappe.visual.VisualFormDashboard.create($content[0], {
				doctype,
				docname,
				compact: true,
				embedded: true,
				showGraph: true,
				showStats: true,
				maxGraphNodes: 8,
				onNodeClick: async (nodeDoctype, nodeDocname) => {
					// Open linked doc in same panel
					if (nodeDoctype && nodeDocname) {
						await openDetail(nodeDoctype, nodeDocname);
					}
				},
			});

			// GSAP stagger entrance for form sections
			if (frappe.visual.gsap) {
				const sections = $content[0].querySelectorAll(
					".fv-fd-section, .fv-fd-stat-card, .fv-fd-graph-wrap"
				);
				if (sections.length) {
					frappe.visual.gsap.from(sections, {
						opacity: 0,
						y: 14,
						scale: 0.97,
						duration: 0.35,
						stagger: 0.05,
						ease: "back.out(1.4)",
					});
				}
			}
		} catch (err) {
			console.warn("[FV DeskWorkspace] form load error:", err);
			$body.html(`
				<div class="fv-dw-panel-error">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
						<circle cx="12" cy="12" r="10"/>
						<line x1="12" y1="8" x2="12" y2="12"/>
						<line x1="12" y1="16" x2="12.01" y2="16"/>
					</svg>
					<p>${__("Could not load record")}</p>
					<a class="fv-dw-error-link" href="/Form/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}">
						${__("Open full form →")}
					</a>
				</div>
			`);
		}
	}

	// ── Close Detail ───────────────────────────────────────────────
	function closeDetail(silent = false) {
		if (!_panelVisible || !_panelEl) return;

		// Emit event
		frappe.visual.eventBus?.emit("detail:close", {});

		if (!silent && frappe.visual?.gsap) {
			frappe.visual.gsap.to(_panelEl, {
				x: "100%",
				opacity: 0,
				duration: 0.3,
				ease: "power3.in",
				onComplete: _hidePanelDOM,
			});
		} else {
			_hidePanelDOM();
		}
	}

	function _hidePanelDOM() {
		if (!_panelEl) return;
		_panelEl.classList.remove("fv-dw-panel--visible");
		_panelEl.setAttribute("aria-hidden", "true");
		document.body.classList.remove("fv-dw-panel-open");
		_panelVisible = false;
		_currentDocname = null;

		// Clear tabs
		_tabs = [];
		_activeTabId = null;
		_renderTabStrip();

		// Clear active row highlight
		$(".fv-dw-row-active").removeClass("fv-dw-row-active");
	}

	// ── Open Full Form ─────────────────────────────────────────────
	function _openFullForm() {
		if (_currentDoctype && _currentDocname) {
			frappe.set_route("Form", _currentDoctype, _currentDocname);
		}
	}

	// ── Persistent Navigation Sidebar ─────────────────────────────
	function _buildNavSidebar() {
		if (_navSidebarEl && document.body.contains(_navSidebarEl)) return;

		const sidebar = document.createElement("div");
		sidebar.id = "fv-nav-sidebar";
		sidebar.className = "fv-dw-nav-sidebar fv-fx-glass";
		sidebar.setAttribute("role", "navigation");
		sidebar.setAttribute("aria-label", __("Workspace Navigation"));

		sidebar.innerHTML = `
			<div class="fv-dw-nav-header">
				<div class="fv-dw-nav-logo" title="${__("Frappe Visual")}">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
						<polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"
							fill="#6366f1" opacity="0.9"/>
						<polygon points="12 7 17 10 17 14 12 17 7 14 7 10 12 7"
							fill="#fff" opacity="0.9"/>
					</svg>
				</div>
				<button class="fv-dw-nav-toggle" title="${__("Collapse")}">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="3" y1="6" x2="21" y2="6"/>
						<line x1="3" y1="12" x2="21" y2="12"/>
						<line x1="3" y1="18" x2="21" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="fv-dw-nav-section">
				<div class="fv-dw-nav-section-title">
					<i class="ti ti-clock" style="font-size:12px"></i>
					<span>${__("Recent")}</span>
				</div>
				<div id="fv-dw-recent-list" class="fv-dw-recent-list"></div>
			</div>
			<div class="fv-dw-nav-section">
				<div class="fv-dw-nav-section-title">
					<i class="ti ti-layout-dashboard" style="font-size:12px"></i>
					<span>${__("Workspaces")}</span>
				</div>
			</div>
			<nav class="fv-dw-nav-items" id="fv-dw-nav-items"></nav>
			<div class="fv-dw-nav-footer">
				<button class="fv-dw-nav-item fv-dw-nav-settings" title="${__("Settings")}">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						<circle cx="12" cy="12" r="3"/>
						<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
					</svg>
				</button>
			</div>
		`;

		document.body.appendChild(sidebar);
		_navSidebarEl = sidebar;
		_navSidebarVisible = true;
		document.body.classList.add("fv-dw-nav-open");

		// Populate recent records and workspaces
		_updateRecentSection();
		_populateNavItems();

		// Toggle button
		sidebar.querySelector(".fv-dw-nav-toggle")?.addEventListener("click", () => {
			sidebar.classList.toggle("fv-dw-nav-collapsed");
		});

		// GSAP slide-in
		if (frappe.visual?.gsap) {
			frappe.visual.gsap.from(sidebar, {
				x: "-100%",
				opacity: 0,
				duration: 0.45,
				ease: "power3.out",
			});
		}
	}

	async function _populateNavItems() {
		try {
			const workspaces = await frappe.xcall("frappe.desk.desktop.get_workspace_sidebar_items");
			const $navItems = document.getElementById("fv-dw-nav-items");
			if (!$navItems) return;

			const items = workspaces?.pages || workspaces || [];
			const ICON_MAP = {
				"Home": "home",
				"Accounts": "report-money",
				"HR": "users",
				"Sales": "building-store",
				"Purchase": "shopping-cart",
				"Manufacturing": "settings",
			};

			items.slice(0, 20).forEach((ws) => {
				const name = ws.title || ws.name;
				const icon = ICON_MAP[name] || "layout-dashboard";
				const color = _autoColor(name);

				const btn = document.createElement("button");
				btn.className = "fv-dw-nav-item";
				btn.title = name;
				btn.innerHTML = `
					<span class="fv-dw-nav-icon" style="color:${color}">
						<i class="ti ti-${icon}" style="font-size:16px;"></i>
					</span>
					<span class="fv-dw-nav-label">${frappe.utils.escape_html(name)}</span>
				`;

				btn.addEventListener("click", () => {
					frappe.set_route("Workspaces", ws.name || ws.title);
				});

				$navItems.appendChild(btn);
			});

			// Animate entrance
			if (frappe.visual?.gsap) {
				frappe.visual.gsap.from($navItems.querySelectorAll(".fv-dw-nav-item"), {
					opacity: 0,
					x: -12,
					duration: 0.3,
					stagger: 0.04,
					ease: "power2.out",
				});
			}
		} catch (e) {
			// Silently fail if workspace API not available
		}
	}

	// ── Ensure Bundle Loaded ───────────────────────────────────────
	async function _ensureBundle() {
		if (!frappe.visual._loaded) {
			await frappe.visual.engine?.();
		}
	}

	// ── CSS Injection ──────────────────────────────────────────────
	function _injectCSS() {
		if (document.getElementById("fv-desk-workspace-runtime-css")) return;
		const style = document.createElement("style");
		style.id = "fv-desk-workspace-runtime-css";
		style.textContent = `
/* ── Active Row Highlight ─────────────────────────────────── */
.list-row.fv-dw-row-active {
	background: color-mix(in srgb, var(--fv-accent, #6366f1) 6%, transparent) !important;
	border-inline-start: 3px solid var(--fv-accent, #6366f1);
	transition: background 0.2s;
}

/* ── Split Button ─────────────────────────────────────────── */
.fv-dw-split-btn {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	border-radius: 6px;
	border: 1px solid var(--border-color, #e2e8f0);
	background: transparent;
	color: var(--text-muted, #6b7280);
	cursor: pointer;
	padding: 4px 10px;
	transition: all 0.2s;
	margin-inline-end: 6px;
}
.fv-dw-split-btn:hover {
	background: color-mix(in srgb, var(--fv-accent, #6366f1) 8%, transparent);
	border-color: var(--fv-accent, #6366f1);
	color: var(--fv-accent, #6366f1);
}
.fv-dw-split-btn.fv-dw-split-active {
	background: color-mix(in srgb, var(--fv-accent, #6366f1) 12%, transparent);
	border-color: var(--fv-accent, #6366f1);
	color: var(--fv-accent, #6366f1);
	font-weight: 600;
}
.fv-dw-split-icon {
	opacity: 0.7;
}

/* ── Resize Cursor ────────────────────────────────────────── */
body.fv-dw-resizing,
body.fv-dw-resizing * {
	cursor: col-resize !important;
	user-select: none !important;
}

/* ── Skeleton Loading ─────────────────────────────────────── */
@keyframes fv-skeleton-shimmer {
	0% { background-position: -200% 0; }
	100% { background-position: 200% 0; }
}
.fv-dw-skeleton-header,
.fv-dw-skeleton-stat,
.fv-dw-skeleton-line {
	background: linear-gradient(
		90deg,
		var(--skeleton-bg, #f1f5f9) 25%,
		var(--skeleton-shine, #e2e8f0) 50%,
		var(--skeleton-bg, #f1f5f9) 75%
	);
	background-size: 200% 100%;
	animation: fv-skeleton-shimmer 1.4s ease infinite;
	border-radius: 6px;
	margin-block-end: 10px;
}
[data-theme="dark"] .fv-dw-skeleton-header,
[data-theme="dark"] .fv-dw-skeleton-stat,
[data-theme="dark"] .fv-dw-skeleton-line {
	--skeleton-bg: rgba(255,255,255,0.05);
	--skeleton-shine: rgba(255,255,255,0.12);
}
.fv-dw-panel-loading { padding: 20px; }
.fv-dw-skeleton-header { height: 32px; width: 60%; }
.fv-dw-skeleton-stat-row {
	display: flex;
	gap: 10px;
	margin-block: 16px;
}
.fv-dw-skeleton-stat { height: 56px; flex: 1; }
.fv-dw-skeleton-body { }
.fv-dw-skeleton-line--wide  { height: 14px; width: 90%; }
.fv-dw-skeleton-line--mid   { height: 14px; width: 65%; }
.fv-dw-skeleton-line--narrow{ height: 14px; width: 40%; }

/* ── Error State ──────────────────────────────────────────── */
.fv-dw-panel-error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 200px;
	gap: 10px;
	color: var(--text-muted);
	text-align: center;
}
.fv-dw-error-link {
	color: var(--fv-accent, #6366f1);
	font-size: 12px;
}

/* ── Tab Strip ────────────────────────────────────────────── */
.fv-dw-tab-strip {
	display: none;
	align-items: stretch;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: none;
	border-block-end: 1px solid rgba(0,0,0,0.06);
	background: color-mix(in srgb, var(--fv-accent, #6366f1) 3%, transparent);
	min-height: 32px;
}
.fv-dw-tab-strip::-webkit-scrollbar { display: none; }
.fv-dw-tab {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	font-size: 11px;
	white-space: nowrap;
	cursor: pointer;
	border-inline-end: 1px solid rgba(0,0,0,0.05);
	color: var(--text-muted, #64748b);
	transition: background 0.15s, color 0.15s;
	flex-shrink: 0;
}
.fv-dw-tab:hover {
	background: rgba(0,0,0,0.04);
}
.fv-dw-tab--active {
	color: var(--fv-accent, #6366f1);
	background: var(--fv-glass-bg, rgba(255,255,255,0.88));
	font-weight: 600;
	border-block-end: 2px solid var(--fv-accent, #6366f1);
}
.fv-dw-tab-close {
	background: none; border: none; cursor: pointer;
	color: var(--text-muted); padding: 2px; border-radius: 4px;
	opacity: 0; transition: opacity 0.15s, background 0.15s;
	display: flex; align-items: center;
}
.fv-dw-tab:hover .fv-dw-tab-close,
.fv-dw-tab--active .fv-dw-tab-close { opacity: 1; }
.fv-dw-tab-close:hover { background: rgba(0,0,0,0.08); }

/* ── Recent Records in Nav Sidebar ───────────────────────── */
.fv-dw-nav-section { padding: 4px 8px; }
.fv-dw-nav-section-title {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 10px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-muted, #64748b);
	padding: 6px 4px;
	margin-block-end: 2px;
}
.fv-dw-recent-list {
	display: flex;
	flex-direction: column;
	gap: 1px;
}
.fv-dw-recent-item {
	display: flex;
	align-items: center;
	gap: 6px;
	width: 100%;
	padding: 5px 6px;
	border: none;
	background: none;
	cursor: pointer;
	border-radius: 6px;
	font-size: 11px;
	color: var(--text-color, #334155);
	transition: background 0.15s;
	text-align: start;
}
.fv-dw-recent-item:hover {
	background: color-mix(in srgb, var(--fv-accent, #6366f1) 8%, transparent);
}
.fv-dw-recent-icon { flex-shrink: 0; opacity: 0.5; }
.fv-dw-recent-label {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}
.fv-dw-recent-doctype {
	flex-shrink: 0;
	font-size: 9px;
	color: var(--text-muted);
	background: rgba(0,0,0,0.04);
	padding: 1px 5px;
	border-radius: 4px;
}
.fv-dw-recent-empty {
	font-size: 10px;
	color: var(--text-muted);
	padding: 8px 6px;
	text-align: center;
}

/* ── Dark Mode Tabs ───────────────────────────────────────── */
[data-theme="dark"] .fv-dw-tab-strip {
	background: rgba(255,255,255,0.02);
	border-color: rgba(255,255,255,0.06);
}
[data-theme="dark"] .fv-dw-tab:hover { background: rgba(255,255,255,0.04); }
[data-theme="dark"] .fv-dw-tab--active {
	background: rgba(255,255,255,0.06);
}
[data-theme="dark"] .fv-dw-tab-close:hover { background: rgba(255,255,255,0.1); }
`;
		document.head.appendChild(style);
	}

	// ── Tab System ─────────────────────────────────────────────────
	function _addOrSwitchTab(doctype, docname) {
		const tabId = `${doctype}::${docname}`;

		// Check if tab already exists
		const existing = _tabs.find(t => t.id === tabId);
		if (existing) {
			_setActiveTab(tabId);
			return;
		}

		// Enforce max tabs — close oldest inactive
		if (_tabs.length >= MAX_TABS) {
			const oldest = _tabs.find(t => t.id !== _activeTabId);
			if (oldest) _removeTab(oldest.id);
		}

		// Create new tab
		_tabs.push({
			id: tabId,
			doctype,
			docname,
			label: docname.length > 20 ? docname.slice(0, 18) + "…" : docname,
			active: false,
		});

		_setActiveTab(tabId);
	}

	function _setActiveTab(tabId) {
		_activeTabId = tabId;
		for (const tab of _tabs) {
			tab.active = tab.id === tabId;
		}
		_renderTabStrip();

		// Emit tab switch event
		const tab = _tabs.find(t => t.id === tabId);
		if (tab) {
			frappe.visual.eventBus?.emit("detail:tab", {
				doctype: tab.doctype,
				docname: tab.docname,
				tabId,
			});
		}
	}

	function _removeTab(tabId) {
		const idx = _tabs.findIndex(t => t.id === tabId);
		if (idx === -1) return;

		_tabs.splice(idx, 1);

		// If we closed the active tab, switch to nearest
		if (_activeTabId === tabId) {
			if (_tabs.length === 0) {
				closeDetail();
				return;
			}
			const nextIdx = Math.min(idx, _tabs.length - 1);
			const nextTab = _tabs[nextIdx];
			_activeTabId = nextTab.id;
			nextTab.active = true;
			_currentDoctype = nextTab.doctype;
			_currentDocname = nextTab.docname;
			_loadRecord(_panelEl, nextTab.doctype, nextTab.docname);
		}

		_renderTabStrip();
	}

	function _closeTab(tabId) {
		if (!tabId) return;
		_removeTab(tabId);
	}

	function _cycleTab(direction) {
		if (_tabs.length < 2) return;
		const idx = _tabs.findIndex(t => t.id === _activeTabId);
		let next = (idx + direction + _tabs.length) % _tabs.length;
		const tab = _tabs[next];
		_setActiveTab(tab.id);
		_currentDoctype = tab.doctype;
		_currentDocname = tab.docname;

		// Update breadcrumb
		if (_panelEl) {
			_panelEl.querySelector(".fv-dw-panel-doctype-label").textContent = __(tab.doctype);
			_panelEl.querySelector(".fv-dw-panel-docname-label").textContent = tab.docname;
		}

		_loadRecord(_panelEl, tab.doctype, tab.docname);
	}

	function _renderTabStrip() {
		const strip = document.getElementById("fv-dw-tab-strip");
		if (!strip) return;

		if (_tabs.length <= 1) {
			strip.innerHTML = "";
			strip.style.display = "none";
			return;
		}

		strip.style.display = "flex";

		strip.innerHTML = _tabs.map(tab => `
			<div class="fv-dw-tab ${tab.active ? "fv-dw-tab--active" : ""}" data-tab-id="${tab.id}" title="${tab.doctype}: ${tab.docname}">
				<span class="fv-dw-tab-label">${frappe.utils.escape_html(tab.label)}</span>
				<button class="fv-dw-tab-close" data-close-tab="${tab.id}" aria-label="${__("Close tab")}">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
		`).join("");

		// Bind tab click events
		strip.querySelectorAll(".fv-dw-tab").forEach(el => {
			el.addEventListener("click", (e) => {
				if (e.target.closest(".fv-dw-tab-close")) return;
				const tabId = el.dataset.tabId;
				const tab = _tabs.find(t => t.id === tabId);
				if (tab) {
					_setActiveTab(tabId);
					_currentDoctype = tab.doctype;
					_currentDocname = tab.docname;
					if (_panelEl) {
						_panelEl.querySelector(".fv-dw-panel-doctype-label").textContent = __(tab.doctype);
						_panelEl.querySelector(".fv-dw-panel-docname-label").textContent = tab.docname;
					}
					_loadRecord(_panelEl, tab.doctype, tab.docname);
				}
			});
		});

		strip.querySelectorAll(".fv-dw-tab-close").forEach(el => {
			el.addEventListener("click", (e) => {
				e.stopPropagation();
				_closeTab(el.dataset.closeTab);
			});
		});

		// GSAP animate new tabs
		if (frappe.visual?.gsap) {
			const lastTab = strip.lastElementChild;
			if (lastTab && !lastTab.classList.contains("fv-dw-tab-animated")) {
				lastTab.classList.add("fv-dw-tab-animated");
				frappe.visual.gsap.from(lastTab, {
					opacity: 0, x: 20, duration: 0.25, ease: "power2.out",
				});
			}
		}
	}

	// ── Recent Records ────────────────────────────────────────────
	function _addToRecent(doctype, docname) {
		// Remove duplicate
		_recentRecords = _recentRecords.filter(
			r => !(r.doctype === doctype && r.docname === docname)
		);

		// Prepend
		_recentRecords.unshift({
			doctype,
			docname,
			label: docname,
			timestamp: Date.now(),
		});

		// Trim
		_recentRecords = _recentRecords.slice(0, MAX_RECENT);

		// Save to localStorage
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(_recentRecords));
		} catch { /* quota exceeded — ignore */ }

		// Emit event
		frappe.visual.eventBus?.emit("recent:add", { doctype, docname });

		// Update nav sidebar if visible
		_updateRecentSection();

		// Async sync to server
		_syncRecentToServer(doctype, docname);
	}

	function _updateRecentSection() {
		const container = document.getElementById("fv-dw-recent-list");
		if (!container) return;

		container.innerHTML = "";

		if (_recentRecords.length === 0) {
			container.innerHTML = `<div class="fv-dw-recent-empty">${__("No recent records")}</div>`;
			return;
		}

		_recentRecords.slice(0, 10).forEach((rec) => {
			const item = document.createElement("button");
			item.className = "fv-dw-recent-item";
			item.title = `${rec.doctype}: ${rec.docname}`;
			item.innerHTML = `
				<span class="fv-dw-recent-icon">
					<i class="ti ti-file-text" style="font-size:12px"></i>
				</span>
				<span class="fv-dw-recent-label">${frappe.utils.escape_html(rec.docname)}</span>
				<span class="fv-dw-recent-doctype">${frappe.utils.escape_html(__(rec.doctype))}</span>
			`;
			item.addEventListener("click", () => openDetail(rec.doctype, rec.docname));
			container.appendChild(item);
		});
	}

	async function _syncRecentToServer(doctype, docname) {
		try {
			await frappe.xcall(
				"frappe_visual.api.v1.preferences.add_recent_record",
				{ doctype, docname, label: docname }
			);
		} catch { /* silent — server sync is best-effort */ }
	}

	async function _syncRecentFromServer() {
		try {
			const result = await frappe.xcall(
				"frappe_visual.api.v1.preferences.get_recent_records",
				{ limit: MAX_RECENT }
			);
			if (result?.data?.length) {
				// Merge server records with local (local wins for same doc)
				const localKeys = new Set(_recentRecords.map(r => `${r.doctype}:${r.docname}`));
				for (const sr of result.data) {
					const key = `${sr.doctype}:${sr.docname}`;
					if (!localKeys.has(key)) {
						_recentRecords.push(sr);
					}
				}
				_recentRecords = _recentRecords.slice(0, MAX_RECENT);
				localStorage.setItem(RECENT_KEY, JSON.stringify(_recentRecords));
			}
		} catch { /* silent */ }
	}

	// ── Helpers ────────────────────────────────────────────────────
	function _autoColor(str) {
		const palette = [
			"#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
			"#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
		];
		let h = 0;
		for (let i = 0; i < (str || "").length; i++) {
			h = str.charCodeAt(i) + ((h << 5) - h);
		}
		return palette[Math.abs(h) % palette.length];
	}

	// ── Public API ─────────────────────────────────────────────────
	frappe.visual.deskWorkspace = {
		init,
		openDetail,
		closeDetail,
		toggleNavSidebar() {
			if (_navSidebarVisible) {
				_navSidebarEl?.remove();
				_navSidebarEl = null;
				_navSidebarVisible = false;
				document.body.classList.remove("fv-dw-nav-open");
				localStorage.setItem(NAV_SIDEBAR_KEY, "0");
			} else {
				_buildNavSidebar();
				localStorage.setItem(NAV_SIDEBAR_KEY, "1");
			}
		},
		get isDetailVisible() { return _panelVisible; },
		get currentRecord() {
			return { doctype: _currentDoctype, docname: _currentDocname };
		},
		get tabs() { return [..._tabs]; },
		get activeTabId() { return _activeTabId; },
		closeTab(tabId) { _closeTab(tabId); },
		switchTab(tabId) {
			const tab = _tabs.find(t => t.id === tabId);
			if (tab) {
				_setActiveTab(tabId);
				_currentDoctype = tab.doctype;
				_currentDocname = tab.docname;
				_loadRecord(_panelEl, tab.doctype, tab.docname);
			}
		},
		get recentRecords() { return [..._recentRecords]; },
		clearRecent() {
			_recentRecords = [];
			localStorage.removeItem(RECENT_KEY);
			_updateRecentSection();
			frappe.xcall("frappe_visual.api.v1.preferences.clear_recent_records").catch(() => {});
		},
	};

	// ── Boot ───────────────────────────────────────────────────────
	$(document).on("app_ready", () => {
		_injectCSS();
		init();
	});
})();
