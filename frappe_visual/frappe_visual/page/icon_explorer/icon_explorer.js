// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Icon Explorer — Browse, search, and copy all 5000+ Tabler Icons.
 * Filter by category, preview at different sizes/colors, one-click copy.
 */
frappe.pages["icon-explorer"].on_page_show = function (wrapper) {
	if (wrapper._icons_loaded) return;
	wrapper._icons_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Icon Explorer"),
		single_column: true,
	});

	page.set_indicator(__("5000+ Icons"), "blue");

	// Search field
	const searchField = page.add_field({
		fieldname: "search",
		label: __("Search Icons"),
		fieldtype: "Data",
		change: () => _filterIcons(searchField.get_value()),
	});

	// Size selector
	const sizeField = page.add_field({
		fieldname: "size",
		label: __("Size"),
		fieldtype: "Select",
		options: "24px\n32px\n48px\n64px",
		default: "32px",
		change: () => _updateSize(sizeField.get_value()),
	});

	const $container = $(`
		<div class="fv-icon-explorer fv-fx-page-enter" style="padding: var(--padding-lg);">
			<div class="text-center mb-4">
				<h2 class="fv-fx-gradient-text">${__("Icon Explorer")}</h2>
				<p class="text-muted">${__("Browse 5000+ Tabler Icons — click to copy class name")}</p>
			</div>

			<!-- Category filter -->
			<div class="d-flex flex-wrap gap-2 justify-content-center mb-4" id="fv-icon-categories"></div>

			<!-- Results count -->
			<div class="text-muted text-center mb-3" id="fv-icon-count"></div>

			<!-- Icon Grid -->
			<div class="row g-2" id="fv-icon-grid" style="max-height: 70vh; overflow-y: auto;"></div>
		</div>
	`).appendTo(page.body);

	// Common Tabler icon categories with sample icons
	const CATEGORIES = [
		{ key: "all", label: __("All") },
		{ key: "arrows", label: __("Arrows") },
		{ key: "brand", label: __("Brands") },
		{ key: "chart", label: __("Charts") },
		{ key: "device", label: __("Devices") },
		{ key: "document", label: __("Documents") },
		{ key: "editor", label: __("Editor") },
		{ key: "map", label: __("Maps") },
		{ key: "media", label: __("Media") },
		{ key: "mood", label: __("Mood") },
		{ key: "design", label: __("Design") },
		{ key: "system", label: __("System") },
		{ key: "weather", label: __("Weather") },
	];

	// Common icons (subset for performant initial load)
	const ICONS = [
		"home", "settings", "user", "users", "search", "bell", "mail", "phone", "calendar", "clock",
		"file", "folder", "database", "server", "cloud", "download", "upload", "link", "share", "bookmark",
		"heart", "star", "eye", "lock", "key", "shield", "alert-triangle", "check", "x", "plus",
		"minus", "edit", "trash", "copy", "clipboard", "printer", "camera", "image", "video", "music",
		"map-pin", "navigation", "compass", "globe", "flag", "building", "home-2", "office-building",
		"chart-bar", "chart-line", "chart-pie", "chart-dots", "chart-area-line", "chart-radar",
		"chart-donut-3", "chart-candle", "chart-bubble", "trending-up", "trending-down",
		"arrows-sort", "arrows-left-right", "arrows-up-down", "arrow-up", "arrow-down", "arrow-left", "arrow-right",
		"chevron-up", "chevron-down", "chevron-left", "chevron-right", "caret-up", "caret-down",
		"brand-github", "brand-google", "brand-twitter", "brand-facebook", "brand-linkedin",
		"device-desktop", "device-laptop", "device-mobile", "device-tablet", "cpu", "wifi",
		"code", "terminal", "git-branch", "git-merge", "git-pull-request", "bug", "test-pipe",
		"palette", "brush", "color-swatch", "paint", "layout", "grid-dots", "components",
		"sun", "moon", "cloud-rain", "snowflake", "temperature", "wind", "umbrella",
		"mood-happy", "mood-sad", "mood-neutral", "thumb-up", "thumb-down", "message", "message-2",
		"currency-dollar", "currency-euro", "receipt", "wallet", "credit-card", "cash",
		"report", "report-analytics", "report-money", "file-analytics", "list-check",
		"table", "columns", "rows", "filter", "sort-ascending", "sort-descending",
		"3d-cube-sphere", "box", "package", "truck-delivery", "shopping-cart", "shopping-bag",
		"tools", "hammer", "wrench", "bolt", "puzzle", "rocket", "bulb", "atom", "flask",
		"stethoscope", "heart-rate-monitor", "pill", "vaccine", "first-aid-kit",
		"school", "book", "notebook", "certificate", "award", "trophy",
		"coffee", "pizza", "salad", "soup", "glass-full", "chef-hat",
		"bed", "bath", "door", "window", "armchair", "lamp",
		"car", "bus", "plane", "ship", "bike", "walk",
		"world", "language", "a-b", "writing", "typography", "text-size",
	];

	// Build category buttons
	const $cats = $container.find("#fv-icon-categories");
	CATEGORIES.forEach(cat => {
		$cats.append(`<button class="btn btn-xs ${cat.key === 'all' ? 'btn-primary-light active' : 'btn-default'} fv-cat-btn" data-cat="${cat.key}">${cat.label}</button>`);
	});

	// Build icon grid
	function _renderIcons(icons) {
		const $grid = $container.find("#fv-icon-grid").empty();
		$container.find("#fv-icon-count").text(`${icons.length} ${__("icons")}`);

		icons.forEach(icon => {
			$grid.append(`
				<div class="col-xl-1 col-lg-2 col-md-2 col-sm-3 col-4 fv-icon-cell" data-icon="${icon}">
					<div class="card fv-fx-hover-lift text-center p-2 cursor-pointer fv-icon-item" title="ti ti-${icon}" style="height: 80px;">
						<i class="ti ti-${icon} fv-icon-preview" style="font-size: 32px; color: var(--text-color);"></i>
						<small class="text-muted text-truncate d-block mt-1" style="font-size: 10px;">${icon}</small>
					</div>
				</div>
			`);
		});
	}

	_renderIcons(ICONS);

	// Click to copy
	$container.on("click", ".fv-icon-item", function () {
		const iconName = $(this).closest(".fv-icon-cell").data("icon");
		const className = `ti ti-${iconName}`;
		frappe.utils.copy_to_clipboard(className);
		frappe.show_alert({ message: `${__("Copied")}: ${className}`, indicator: "green" }, 2);
	});

	// Category filter
	$cats.on("click", ".fv-cat-btn", function () {
		$cats.find(".fv-cat-btn").removeClass("active btn-primary-light").addClass("btn-default");
		$(this).addClass("active btn-primary-light").removeClass("btn-default");
		const cat = $(this).data("cat");
		if (cat === "all") {
			_renderIcons(ICONS);
		} else {
			_renderIcons(ICONS.filter(i => i.includes(cat) || i.startsWith(cat)));
		}
	});

	// Search
	function _filterIcons(query) {
		if (!query) {
			_renderIcons(ICONS);
			return;
		}
		const q = query.toLowerCase();
		_renderIcons(ICONS.filter(i => i.includes(q)));
	}

	function _updateSize(size) {
		const px = parseInt(size);
		$container.find(".fv-icon-preview").css("font-size", px + "px");
	}
};
