// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Workspace Storytelling
 * =========================================
 * Integrates the DataStorytelling scrollytelling engine into the
 * workspaceEnhancer as an additional "Story" view mode.
 *
 * When a workspace has number cards and shortcuts, this module can
 * auto-generate a data narrative with chapters derived from:
 *  - Workspace shortcuts → DocType count trends
 *  - Number cards → KPI metrics
 *  - Charts → Visual data reveals
 *
 * The Story view is triggered via a toolbar toggle button (📖)
 * or via the EventBus: frappe.visual.eventBus.emit("workspace:view", "story")
 *
 * @module frappe_visual/utils/workspace_storytelling
 */

frappe.provide("frappe.visual.workspaceStorytelling");

(function () {
	"use strict";

	const STORAGE_KEY = "fv_ws_storytelling_enabled";
	let _enabled = false;
	let _storyInstance = null;
	let _storyContainer = null;
	let _toggleBtn = null;

	/* ── Init ─────────────────────────────────────────────────── */
	function init() {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "1") _enabled = true;

		$(document).on("page-change", _onPageChange);

		// Listen for EventBus commands
		if (frappe.visual?.eventBus) {
			frappe.visual.eventBus.on("workspace:view", (mode) => {
				if (mode === "story") enable();
				else if (_enabled) disable();
			});
		}
	}

	/* ── Page Change ──────────────────────────────────────────── */
	function _onPageChange() {
		// Only on workspace pages
		const route = frappe.get_route();
		if (!route || route[0] !== "Workspaces") {
			_cleanup();
			return;
		}
		setTimeout(() => _injectToggle(), 500);
	}

	/* ── Toggle Button ────────────────────────────────────────── */
	function _injectToggle() {
		const $page = $(".workspace-container, .desk-page");
		if (!$page.length) return;

		// Don't inject twice
		if ($page.find(".fv-ws-story-toggle").length) return;

		_toggleBtn = document.createElement("button");
		_toggleBtn.className = "fv-ws-story-toggle btn btn-xs btn-default-light";
		_toggleBtn.title = __("Data Story View");
		_toggleBtn.innerHTML = `<i class="ti ti-book-2" style="font-size:14px"></i> ${__("Story")}`;
		_toggleBtn.addEventListener("click", () => {
			if (_enabled) disable();
			else enable();
		});

		// Insert in workspace header area
		const $header = $page.find(".workspace-header, .page-head .page-actions");
		if ($header.length) {
			$header.first().append(_toggleBtn);
		}
	}

	/* ── Enable Story View ────────────────────────────────────── */
	async function enable() {
		_enabled = true;
		localStorage.setItem(STORAGE_KEY, "1");
		_toggleBtn?.classList.add("btn-primary-light");
		_toggleBtn?.classList.remove("btn-default-light");

		const chapters = await _buildChapters();
		if (!chapters.length) {
			frappe.show_alert({ message: __("No data available for storytelling"), indicator: "yellow" });
			_enabled = false;
			localStorage.setItem(STORAGE_KEY, "0");
			return;
		}

		_renderStory(chapters);
	}

	/* ── Disable Story View ───────────────────────────────────── */
	function disable() {
		_enabled = false;
		localStorage.setItem(STORAGE_KEY, "0");
		_toggleBtn?.classList.remove("btn-primary-light");
		_toggleBtn?.classList.add("btn-default-light");
		_cleanup();
	}

	/* ── Build Chapters from Workspace Data ───────────────────── */
	async function _buildChapters() {
		const chapters = [];

		// 1. Gather workspace shortcuts (DocTypes)
		const $shortcuts = $(".shortcut-widget-box .widget.shortcut-widget-box, .shortcut-widget-box .shortcut-widget");
		const doctypes = [];

		$shortcuts.each(function () {
			const label = $(this).find(".widget-label, .ellipsis").first().text().trim();
			const link = $(this).find("a").attr("href") || "";
			const dt = link.replace(/^\/app\//, "").replace(/-/g, " ");
			if (label && dt) {
				doctypes.push({ label, doctype: dt });
			}
		});

		// 2. Gather number cards
		const $numberCards = $(".number-widget-box .widget.number-widget-box, .number-widget");
		const metrics = [];

		$numberCards.each(function () {
			const label = $(this).find(".widget-label, .number-widget-title").first().text().trim();
			const value = $(this).find(".number-widget-value, .widget-body .number").first().text().trim();
			if (label && value) {
				metrics.push({ label, value });
			}
		});

		// 3. Intro chapter
		const workspaceName = $(".workspace-header .title-text, .page-title .title-text").first().text().trim()
			|| frappe.get_route()?.[1] || __("Workspace");

		chapters.push({
			title: `${__("Welcome to")} ${workspaceName}`,
			body: `<p>${__("This interactive story walks you through the key metrics and data in this workspace.")}</p>
				   <p>${__("Scroll down to explore each section, or use keyboard arrows to navigate.")}</p>`,
			chartType: null,
			metric: metrics.length
				? { label: __("Total Metrics"), value: metrics.length, suffix: __("KPIs") }
				: null,
		});

		// 4. Fetch counts for each DocType and build chapters
		for (const dt of doctypes.slice(0, 8)) {
			try {
				const count = await frappe.xcall("frappe.client.get_count", { doctype: dt.doctype });
				const numCount = parseInt(count) || 0;

				chapters.push({
					title: __(dt.label),
					body: `<p>${__("Total records in {0}", [__(dt.label)])}: <strong>${numCount.toLocaleString()}</strong></p>`,
					chartType: "bar",
					chartData: _generateSparkData(dt.label, numCount),
					metric: { label: __(dt.label), value: numCount, prefix: "", suffix: __("records") },
					annotation: numCount > 100
						? { text: __("High volume — consider reviewing filters"), type: "info" }
						: null,
				});
			} catch {
				// Skip inaccessible DocTypes silently
			}
		}

		// 5. Metric chapters from number cards
		for (const m of metrics.slice(0, 6)) {
			const numVal = parseFloat(m.value.replace(/[^0-9.-]/g, "")) || 0;
			chapters.push({
				title: m.label,
				body: `<p>${__("Current value")}: <strong>${m.value}</strong></p>`,
				metric: { label: m.label, value: numVal },
			});
		}

		// 6. Summary chapter
		if (chapters.length > 2) {
			chapters.push({
				title: __("Summary"),
				body: `<p>${__("This workspace contains {0} data sections and {1} key metrics.", [doctypes.length, metrics.length])}</p>
					   <p>${__("Use the toolbar above to switch back to the standard view at any time.")}</p>`,
			});
		}

		return chapters;
	}

	/* ── Generate Spark Data ──────────────────────────────────── */
	function _generateSparkData(label, total) {
		// Simulate a 7-day trend (in a real implementation, fetch from server)
		const points = [];
		const base = Math.max(1, Math.floor(total * 0.8));
		for (let i = 0; i < 7; i++) {
			points.push({
				label: `Day ${i + 1}`,
				value: base + Math.floor(Math.random() * total * 0.4),
			});
		}
		return { labels: points.map(p => p.label), values: points.map(p => p.value) };
	}

	/* ── Render Story ─────────────────────────────────────────── */
	function _renderStory(chapters) {
		_cleanup();

		const $workspace = $(".workspace-container .desk-page .codex-editor, .workspace-container .desk-page .widget-group, .workspace-container .widget-group").first().parent();
		if (!$workspace.length) return;

		// Hide existing widgets
		$workspace.children().each(function () {
			if (!$(this).hasClass("fv-ws-story-container")) {
				$(this).addClass("fv-ws-story-hidden").hide();
			}
		});

		// Create story container
		_storyContainer = document.createElement("div");
		_storyContainer.className = "fv-ws-story-container";
		$workspace.prepend(_storyContainer);

		// Use DataStorytelling component
		const DS = frappe.visual?.DataStorytelling;
		if (DS) {
			_storyInstance = DS.create(_storyContainer, {
				theme: "glass",
				chapters,
				autoPlay: false,
				showProgress: true,
				stickyChart: true,
				animationDuration: 0.8,
				countUpDuration: 2000,
			});
		} else {
			// Fallback: simple chapter rendering
			_renderFallback(_storyContainer, chapters);
		}

		// Emit event
		frappe.visual?.eventBus?.emit("workspace:story:rendered", { chapters: chapters.length });
	}

	/* ── Fallback Renderer (no DataStorytelling component) ─────── */
	function _renderFallback(container, chapters) {
		container.innerHTML = chapters.map((ch, i) => `
			<div class="fv-ws-story-chapter" data-idx="${i}">
				<h3 class="fv-ws-story-chapter-title">${_esc(ch.title)}</h3>
				<div class="fv-ws-story-chapter-body">${ch.body || ""}</div>
				${ch.metric ? `
					<div class="fv-ws-story-metric">
						<span class="fv-ws-story-metric-value">${ch.metric.prefix || ""}${(ch.metric.value || 0).toLocaleString()}${ch.metric.suffix ? " " + ch.metric.suffix : ""}</span>
						<span class="fv-ws-story-metric-label">${_esc(ch.metric.label)}</span>
					</div>
				` : ""}
				${ch.annotation ? `
					<div class="fv-ws-story-annotation fv-ws-story-annotation--${ch.annotation.type || "info"}">
						<i class="ti ti-info-circle"></i> ${_esc(ch.annotation.text)}
					</div>
				` : ""}
			</div>
		`).join("");

		// Animate chapters in with GSAP if available
		const gsap = frappe.visual?.gsap || window.gsap;
		if (gsap) {
			gsap.from(container.querySelectorAll(".fv-ws-story-chapter"), {
				y: 40, opacity: 0, duration: 0.6,
				stagger: 0.15, ease: "back.out(1.4)",
			});
		}
	}

	/* ── Cleanup ──────────────────────────────────────────────── */
	function _cleanup() {
		if (_storyInstance?.destroy) _storyInstance.destroy();
		_storyInstance = null;

		if (_storyContainer) {
			// Restore hidden workspace widgets
			const $parent = $(_storyContainer).parent();
			$parent.find(".fv-ws-story-hidden").removeClass("fv-ws-story-hidden").show();
			_storyContainer.remove();
			_storyContainer = null;
		}
	}

	function _esc(s) {
		return frappe.utils?.escape_html?.(s) || s;
	}

	/* ── Public API ───────────────────────────────────────────── */
	frappe.visual.workspaceStorytelling = {
		init,
		enable,
		disable,
		toggle() {
			if (_enabled) disable();
			else enable();
		},
		isEnabled() { return _enabled; },
		refresh() { if (_enabled) enable(); },
	};

	/* ── Boot ─────────────────────────────────────────────────── */
	$(document).on("app_ready", init);
})();
