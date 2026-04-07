// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Scene Engine Showcase — Demonstrates all 18 Scene Engine components
 * with all 5 presets (Office, Library, Clinic, Workshop, Cafe).
 * Switch presets live, bind mock Frappe data, and export scenes.
 */
frappe.pages["scene-engine-showcase"].on_page_show = function (wrapper) {
	if (wrapper._scene_loaded) return;
	wrapper._scene_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Scene Engine Showcase"),
		single_column: true,
	});

	page.set_indicator(__("18 Components"), "green");

	const PRESETS = [
		{ key: "office", label: __("Office"), icon: "ti ti-building", theme: "warm", desc: __("Business dashboards — CRM, Finance, General") },
		{ key: "library", label: __("Library"), icon: "ti ti-book", theme: "cool", desc: __("Knowledge systems — LMS, Documentation, Wiki") },
		{ key: "clinic", label: __("Clinic"), icon: "ti ti-heart-rate-monitor", theme: "cool", desc: __("Healthcare dashboards — Patient, Labs, Pharmacy") },
		{ key: "workshop", label: __("Workshop"), icon: "ti ti-hammer", theme: "warm", desc: __("Construction & Manufacturing — Projects, Tasks, BOQ") },
		{ key: "cafe", label: __("Cafe"), icon: "ti ti-coffee", theme: "warm", desc: __("Hospitality & Restaurant — Orders, Tables, Revenue") },
	];

	const $container = $(`
		<div class="fv-scene-showcase fv-fx-page-enter" style="padding: var(--padding-lg);">
			<div class="text-center mb-5">
				<h2 class="fv-fx-gradient-text">${__("Immersive SVG Scene Engine")}</h2>
				<p class="text-muted">${__("Replace flat workspaces with animated SVG rooms where KPIs appear as picture frames, documents scatter on a desk, and books line a shelf.")}</p>
			</div>

			<!-- Preset Selector -->
			<div class="d-flex flex-wrap gap-3 justify-content-center mb-4" id="fv-preset-selector"></div>

			<!-- Scene Viewport -->
			<div class="card fv-fx-glass mb-4" style="min-height: 500px; overflow: hidden;">
				<div class="card-body p-0" id="fv-scene-viewport">
					<div class="text-center p-5 text-muted">
						<i class="ti ti-3d-cube-sphere" style="font-size: 4rem; opacity: 0.3;"></i>
						<p class="mt-3">${__("Select a preset above to load a scene")}</p>
					</div>
				</div>
			</div>

			<!-- Components Reference Grid -->
			<h4 class="mb-3">${__("Scene Engine Components (18)")}</h4>
			<div class="row" id="fv-scene-components"></div>
		</div>
	`).appendTo(page.body);

	// Build preset cards
	const $selector = $container.find("#fv-preset-selector");
	PRESETS.forEach(p => {
		$selector.append(`
			<div class="card fv-fx-hover-lift cursor-pointer fv-preset-card" data-preset="${p.key}" style="width: 180px;">
				<div class="card-body text-center p-3">
					<i class="${p.icon}" style="font-size: 2rem; color: var(--primary);"></i>
					<h6 class="mt-2 mb-1">${p.label}</h6>
					<small class="text-muted">${p.desc}</small>
				</div>
			</div>
		`);
	});

	// Components reference
	const COMPONENTS = [
		{ name: "SceneEngine", desc: __("Core SVG rendering engine") },
		{ name: "SceneRoom", desc: __("Room container with walls, floor, and lighting") },
		{ name: "SceneFrame", desc: __("KPI picture frames on walls") },
		{ name: "SceneDesk", desc: __("Interactive desk surface with documents") },
		{ name: "SceneDocument", desc: __("Draggable document on desk") },
		{ name: "SceneShelf", desc: __("Bookshelf with clickable items") },
		{ name: "SceneBoard", desc: __("Pinboard with sticky notes and cards") },
		{ name: "SceneWidget", desc: __("Embeddable live widget in scene") },
		{ name: "SceneLighting", desc: __("Dynamic lighting effects") },
		{ name: "ScenePresetOffice", desc: __("Business office preset") },
		{ name: "ScenePresetLibrary", desc: __("Library / knowledge preset") },
		{ name: "ScenePresetClinic", desc: __("Healthcare clinic preset") },
		{ name: "ScenePresetWorkshop", desc: __("Construction workshop preset") },
		{ name: "ScenePresetCafe", desc: __("Restaurant / cafe preset") },
		{ name: "SceneDataBinder", desc: __("Binds live Frappe data to scene elements") },
		{ name: "SceneRefresher", desc: __("Auto-refresh timer for live data") },
		{ name: "SceneNavigator", desc: __("Pan, zoom, minimap for scene") },
		{ name: "SceneExporter", desc: __("Export scene as SVG / PNG / PDF") },
	];

	const $compGrid = $container.find("#fv-scene-components");
	COMPONENTS.forEach(c => {
		$compGrid.append(`
			<div class="col-md-3 col-sm-6 mb-3">
				<div class="card fv-fx-glass p-3" style="height: 100%;">
					<strong>${c.name}</strong>
					<small class="text-muted d-block mt-1">${c.desc}</small>
				</div>
			</div>
		`);
	});

	// Preset click handler
	$selector.on("click", ".fv-preset-card", function () {
		$selector.find(".fv-preset-card").removeClass("border-primary");
		$(this).addClass("border-primary");
		const preset = $(this).data("preset");
		_loadPreset(preset);
	});

	function _loadPreset(presetKey) {
		const $vp = $container.find("#fv-scene-viewport");
		$vp.html(`<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">${__("Loading scene...")}</p></div>`);

		frappe.require("frappe_visual.bundle.js", () => {
			const v = frappe.visual;
			if (!v) return;

			$vp.empty();
			const preset = PRESETS.find(p => p.key === presetKey);
			const fnName = `scenePreset${presetKey.charAt(0).toUpperCase() + presetKey.slice(1)}`;

			try {
				if (typeof v[fnName] === "function") {
					v[fnName]({
						container: "#fv-scene-viewport",
						theme: preset.theme,
						frames: [
							{ label: __("Revenue"), value: "$125K", status: "success" },
							{ label: __("Orders"), value: "342", status: "warning" },
							{ label: __("Active"), value: "89%", status: "info" },
						],
						documents: [
							{ label: __("Pending"), count: 8, color: "#ef4444" },
							{ label: __("Approved"), count: 24, color: "#22c55e" },
						],
						books: [
							{ label: __("Reports"), color: "#6366f1" },
							{ label: __("Guides"), color: "#f59e0b" },
						],
					});
				} else {
					$vp.html(`
						<div class="text-center p-5">
							<i class="${preset.icon}" style="font-size: 5rem; color: var(--primary); opacity: 0.5;"></i>
							<h3 class="mt-3 fv-fx-gradient-text">${preset.label} ${__("Scene")}</h3>
							<p class="text-muted">${preset.desc}</p>
							<div class="row justify-content-center mt-4">
								<div class="col-md-3"><div class="card fv-fx-glass p-3 text-center"><h2>$125K</h2><small>${__("Revenue")}</small></div></div>
								<div class="col-md-3"><div class="card fv-fx-glass p-3 text-center"><h2>342</h2><small>${__("Orders")}</small></div></div>
								<div class="col-md-3"><div class="card fv-fx-glass p-3 text-center"><h2>89%</h2><small>${__("Occupancy")}</small></div></div>
							</div>
						</div>
					`);
				}
			} catch (e) {
				frappe.show_alert({ message: __("Scene preset not available in current build"), indicator: "orange" });
			}
		});
	}
};
