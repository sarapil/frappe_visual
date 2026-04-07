/**
 * Frappe Visual — Component Playground Page
 * ==========================================
 * Live sandbox for testing all frappe_visual components.
 * Accessible at /desk#visual-playground
 */
frappe.pages["visual-playground"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Visual Playground"),
		single_column: true,
	});

	page.set_title_sub(__("Interactive Component Sandbox"));

	// Add toolbar buttons
	page.set_primary_action(
		__("Reset"),
		() => {
			render(page);
			frappe.show_alert({ message: __("Playground reset"), indicator: "green" }, 3);
		},
		"octicon octicon-sync"
	);

	page.set_secondary_action(
		__("Keyboard Shortcuts"),
		() => frappe.visual.keys?.showCheatSheet?.(),
		"octicon octicon-keyboard"
	);

	render(page);
};

/**
 * Component categories for the playground sidebar.
 */
const COMPONENT_CATEGORIES = [
	{
		label: __("Data Visualization"),
		icon: "chart-bar",
		items: [
			{ id: "heatmap", label: __("Heatmap"), fn: "heatmap" },
			{ id: "sparkline", label: __("Sparkline"), fn: "sparkline" },
			{ id: "donut", label: __("Donut Chart"), fn: "donut" },
			{ id: "area", label: __("Area Chart"), fn: "area" },
			{ id: "radar", label: __("Radar Chart"), fn: "radar" },
			{ id: "funnel", label: __("Funnel"), fn: "funnel" },
			{ id: "treemap", label: __("Treemap"), fn: "treemap" },
			{ id: "sankey", label: __("Sankey Diagram"), fn: "sankey" },
		],
	},
	{
		label: __("Business Views"),
		icon: "sitemap",
		items: [
			{ id: "kanban", label: __("Kanban Board"), fn: "kanban" },
			{ id: "calendar", label: __("Calendar"), fn: "calendar" },
			{ id: "gantt", label: __("Gantt Chart"), fn: "gantt" },
			{ id: "tree", label: __("Tree View"), fn: "tree" },
			{ id: "gallery", label: __("Gallery"), fn: "gallery" },
		],
	},
	{
		label: __("Layout Containers"),
		icon: "layout-grid",
		items: [
			{ id: "masonry", label: __("Masonry"), fn: "masonry" },
			{ id: "bento", label: __("Bento Grid"), fn: "bento" },
			{ id: "sortable", label: __("Sortable List"), fn: "sortable" },
		],
	},
	{
		label: __("Navigation"),
		icon: "compass",
		items: [
			{ id: "commandbar", label: __("Command Bar"), fn: "commandBar" },
			{ id: "bottomsheet", label: __("Bottom Sheet"), fn: "bottomSheet" },
			{ id: "speedDial", label: __("Speed Dial"), fn: "speedDial" },
		],
	},
	{
		label: __("Animations"),
		icon: "sparkles",
		items: [
			{ id: "typewriter", label: __("Typewriter"), fn: "typewriter" },
			{ id: "confetti", label: __("Confetti"), fn: "confetti" },
			{ id: "numberTicker", label: __("Number Ticker"), fn: "numberTicker" },
			{ id: "morphingText", label: __("Morphing Text"), fn: "morphingText" },
		],
	},
];

/**
 * Sample data generators for each component type.
 */
const SAMPLE_DATA = {
	heatmap: () => ({
		data: Array.from({ length: 90 }, (_, i) => ({
			date: frappe.datetime.add_days(frappe.datetime.now_date(), -90 + i),
			value: Math.floor(Math.random() * 20),
		})),
		colorScale: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
	}),
	sparkline: () => ({
		data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100)),
		color: "#6366f1",
		height: 60,
	}),
	donut: () => ({
		data: [
			{ label: __("Active"), value: 45 },
			{ label: __("Pending"), value: 25 },
			{ label: __("Completed"), value: 30 },
		],
	}),
	area: () => ({
		labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
		datasets: [{ label: __("Revenue"), data: [40, 55, 45, 70, 65, 80] }],
	}),
	radar: () => ({
		labels: [__("Speed"), __("Quality"), __("Cost"), __("Support"), __("Features")],
		datasets: [
			{ label: __("Product A"), data: [80, 90, 60, 70, 85] },
			{ label: __("Product B"), data: [70, 65, 80, 90, 75] },
		],
	}),
	funnel: () => ({
		data: [
			{ label: __("Visits"), value: 5000 },
			{ label: __("Leads"), value: 2500 },
			{ label: __("Opportunities"), value: 1200 },
			{ label: __("Proposals"), value: 600 },
			{ label: __("Closed"), value: 200 },
		],
	}),
	treemap: () => ({
		data: [
			{ name: __("Sales"), value: 120, children: [
				{ name: __("Online"), value: 80 },
				{ name: __("Retail"), value: 40 },
			]},
			{ name: __("Marketing"), value: 80 },
			{ name: __("Engineering"), value: 160 },
		],
	}),
	sankey: () => ({
		nodes: [
			{ name: __("Source A") }, { name: __("Source B") },
			{ name: __("Process 1") }, { name: __("Process 2") },
			{ name: __("Output") },
		],
		links: [
			{ source: 0, target: 2, value: 40 },
			{ source: 0, target: 3, value: 20 },
			{ source: 1, target: 2, value: 30 },
			{ source: 1, target: 3, value: 10 },
			{ source: 2, target: 4, value: 70 },
			{ source: 3, target: 4, value: 30 },
		],
	}),
	kanban: () => ({
		columns: [
			{ title: __("To Do"), status: "todo" },
			{ title: __("In Progress"), status: "in_progress" },
			{ title: __("Done"), status: "done" },
		],
		cards: [
			{ title: __("Design mockup"), status: "todo" },
			{ title: __("Write tests"), status: "in_progress" },
			{ title: __("Deploy v1"), status: "done" },
		],
	}),
	calendar: () => ({
		events: [
			{ title: __("Meeting"), start: frappe.datetime.now_datetime(), allDay: false },
			{ title: __("Deadline"), start: frappe.datetime.add_days(frappe.datetime.now_date(), 2), allDay: true },
		],
	}),
	gantt: () => ({
		tasks: [
			{ name: __("Phase 1"), start: "2024-01-01", end: "2024-02-15", progress: 100 },
			{ name: __("Phase 2"), start: "2024-02-01", end: "2024-04-30", progress: 60 },
			{ name: __("Phase 3"), start: "2024-04-01", end: "2024-06-30", progress: 20 },
		],
	}),
	tree: () => ({
		data: {
			label: __("Company"), children: [
				{ label: __("Sales"), children: [
					{ label: __("Online") }, { label: __("Retail") },
				]},
				{ label: __("Engineering"), children: [
					{ label: __("Frontend") }, { label: __("Backend") },
				]},
			],
		},
	}),
	gallery: () => ({
		images: Array.from({ length: 6 }, (_, i) => ({
			src: `/api/method/frappe.utils.file_manager.get_file?file_url=/files/placeholder-${i + 1}.png`,
			title: __("Image {0}", [i + 1]),
		})),
	}),
	masonry: () => ({
		columns: 3,
		items: Array.from({ length: 9 }, (_, i) => ({
			html: `<div class="fv-fx-glass" style="padding:24px;border-radius:8px;min-height:${80 + Math.random() * 120}px"><strong>${__("Card {0}", [i + 1])}</strong><p style="color:var(--text-muted)">${__("Sample masonry item")}</p></div>`,
		})),
	}),
	bento: () => ({
		columns: 4,
		items: [
			{ colSpan: 2, rowSpan: 2, html: `<div class="fv-fx-glass" style="padding:24px;height:100%"><h3>${__("Featured")}</h3></div>` },
			{ colSpan: 1, rowSpan: 1, html: `<div class="fv-fx-glass" style="padding:16px;height:100%">${__("Metric A")}</div>` },
			{ colSpan: 1, rowSpan: 1, html: `<div class="fv-fx-glass" style="padding:16px;height:100%">${__("Metric B")}</div>` },
		],
	}),
	sortable: () => ({
		items: [__("Task 1"), __("Task 2"), __("Task 3"), __("Task 4"), __("Task 5")],
	}),
	typewriter: () => ({
		strings: [__("Building the future..."), __("One component at a time..."), __("frappe.visual")],
		speed: 80,
		loop: true,
	}),
	confetti: () => ({
		particleCount: 150,
		spread: 70,
		origin: { y: 0.6 },
	}),
	numberTicker: () => ({
		from: 0,
		to: 12847,
		duration: 2000,
		prefix: "$",
		decimals: 0,
	}),
	morphingText: () => ({
		texts: [__("Hello"), __("مرحبا"), __("Merhaba"), __("Bonjour")],
		interval: 2000,
	}),
};

function render(page) {
	const $container = $(page.body);
	$container.empty();

	frappe.require("frappe_visual.bundle.js", () => {
		// Build playground layout: sidebar + preview
		$container.html(`
			<div class="fv-playground-layout" style="display:flex;gap:0;min-height:calc(100vh - 120px)">
				<aside class="fv-playground-sidebar" style="width:280px;border-inline-end:1px solid var(--border-color);overflow-y:auto;padding:16px;flex-shrink:0">
					<div class="fv-playground-search" style="margin-bottom:16px">
						<input type="text" class="form-control input-sm"
							placeholder="${__("Search components...")}"
							style="border-radius:8px" />
					</div>
					<div class="fv-playground-categories"></div>
				</aside>
				<main class="fv-playground-main" style="flex:1;padding:24px;overflow-y:auto">
					<div class="fv-playground-header fv-fx-page-enter" style="text-align:center;padding:60px 20px">
						<div style="font-size:56px;margin-bottom:16px">🧪</div>
						<h2 style="margin:0 0 8px">${__("Component Playground")}</h2>
						<p style="color:var(--text-muted);max-width:500px;margin:0 auto">
							${__("Select a component from the sidebar to preview it with sample data. Edit config to experiment.")}
						</p>
					</div>
					<div class="fv-playground-preview" style="display:none">
						<div class="fv-playground-preview-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
							<h3 class="fv-playground-title" style="margin:0"></h3>
							<div class="fv-playground-actions" style="display:flex;gap:8px">
								<button class="btn btn-xs btn-default fv-playground-btn-reset">${__("Reset Data")}</button>
								<button class="btn btn-xs btn-default fv-playground-btn-config">${__("Edit Config")}</button>
							</div>
						</div>
						<div class="fv-playground-render fv-fx-glass" style="border-radius:12px;padding:24px;min-height:300px;position:relative"></div>
						<div class="fv-playground-config" style="display:none;margin-top:16px">
							<label style="font-weight:600;margin-bottom:6px;display:block">${__("Configuration (JSON)")}</label>
							<textarea class="fv-playground-config-editor form-control" rows="10"
								style="font-family:var(--font-stack-monospace);font-size:12px;border-radius:8px"></textarea>
							<div style="margin-top:8px;display:flex;gap:8px">
								<button class="btn btn-xs btn-primary fv-playground-btn-apply">${__("Apply")}</button>
								<button class="btn btn-xs btn-default fv-playground-btn-cancel">${__("Cancel")}</button>
							</div>
						</div>
					</div>
				</main>
			</div>
		`);

		// Render sidebar categories
		const $cats = $container.find(".fv-playground-categories");
		COMPONENT_CATEGORIES.forEach(cat => {
			const $cat = $(`
				<div class="fv-playground-cat" style="margin-bottom:16px">
					<div style="font-weight:600;font-size:12px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.5px">
						${cat.label}
					</div>
				</div>
			`);
			cat.items.forEach(item => {
				const $item = $(`
					<div class="fv-playground-item" data-id="${item.id}" data-fn="${item.fn}"
						style="padding:8px 12px;border-radius:8px;cursor:pointer;margin-bottom:2px;transition:background 0.15s;font-size:13px">
						${item.label}
					</div>
				`);
				$item.on("mouseenter", function() { $(this).css("background", "var(--bg-light-gray)"); });
				$item.on("mouseleave", function() {
					if (!$(this).hasClass("active")) $(this).css("background", "");
				});
				$item.on("click", () => selectComponent(item, $container));
				$cat.append($item);
			});
			$cats.append($cat);
		});

		// Search filter
		$container.find(".fv-playground-search input").on("input", function() {
			const q = $(this).val().toLowerCase();
			$container.find(".fv-playground-item").each(function() {
				const match = $(this).text().toLowerCase().includes(q);
				$(this).toggle(match);
			});
		});

		// Config editor buttons
		$container.find(".fv-playground-btn-config").on("click", () => {
			$container.find(".fv-playground-config").toggle();
		});
		$container.find(".fv-playground-btn-cancel").on("click", () => {
			$container.find(".fv-playground-config").hide();
		});
		$container.find(".fv-playground-btn-apply").on("click", () => {
			try {
				const cfg = JSON.parse($container.find(".fv-playground-config-editor").val());
				renderComponent(window._fv_playground_active_id, cfg, $container);
				$container.find(".fv-playground-config").hide();
				frappe.show_alert({ message: __("Config applied"), indicator: "green" }, 2);
			} catch (e) {
				frappe.show_alert({ message: __("Invalid JSON: {0}", [e.message]), indicator: "red" }, 4);
			}
		});
		$container.find(".fv-playground-btn-reset").on("click", () => {
			const id = window._fv_playground_active_id;
			if (id && SAMPLE_DATA[id]) {
				const data = SAMPLE_DATA[id]();
				$container.find(".fv-playground-config-editor").val(JSON.stringify(data, null, 2));
				renderComponent(id, data, $container);
			}
		});
	});
}

function selectComponent(item, $container) {
	// Update sidebar active state
	$container.find(".fv-playground-item").removeClass("active").css("background", "");
	$container.find(`.fv-playground-item[data-id="${item.id}"]`)
		.addClass("active")
		.css("background", "var(--bg-light-gray)");

	// Show preview, hide welcome
	$container.find(".fv-playground-header").hide();
	$container.find(".fv-playground-preview").show();
	$container.find(".fv-playground-title").text(item.label);
	$container.find(".fv-playground-config").hide();

	// Store active id
	window._fv_playground_active_id = item.id;

	// Get sample data and render
	const data = SAMPLE_DATA[item.id] ? SAMPLE_DATA[item.id]() : {};
	$container.find(".fv-playground-config-editor").val(JSON.stringify(data, null, 2));
	renderComponent(item.id, data, $container);
}

function renderComponent(id, config, $container) {
	const $render = $container.find(".fv-playground-render");
	$render.empty();

	const el = $render[0];

	// Find matching category item
	let fnName = id;
	for (const cat of COMPONENT_CATEGORIES) {
		const found = cat.items.find(i => i.id === id);
		if (found) { fnName = found.fn; break; }
	}

	try {
		if (typeof frappe.visual[fnName] === "function") {
			frappe.visual[fnName](el, config);
		} else if (fnName === "commandBar") {
			// Special: command bar is a global action
			$render.html(`
				<div style="text-align:center;padding:40px">
					<p>${__("Press")} <kbd>⌘</kbd> + <kbd>K</kbd> ${__("to open the Command Bar")}</p>
					<button class="btn btn-primary btn-sm" onclick="frappe.visual.commandBar?.open?.()">
						${__("Open Command Bar")}
					</button>
				</div>
			`);
		} else if (fnName === "confetti") {
			$render.html(`
				<div style="text-align:center;padding:40px">
					<button class="btn btn-primary btn-sm" id="fv-playground-confetti-btn">
						🎉 ${__("Launch Confetti")}
					</button>
				</div>
			`);
			$render.find("#fv-playground-confetti-btn").on("click", () => {
				if (frappe.visual.confetti) frappe.visual.confetti(config);
			});
		} else if (fnName === "bottomSheet") {
			$render.html(`
				<div style="text-align:center;padding:40px">
					<button class="btn btn-primary btn-sm" id="fv-playground-bs-btn">
						${__("Open Bottom Sheet")}
					</button>
				</div>
			`);
			$render.find("#fv-playground-bs-btn").on("click", () => {
				if (frappe.visual.bottomSheet) {
					frappe.visual.bottomSheet({
						title: __("Sample Bottom Sheet"),
						content: `<p style="padding:20px">${__("This is a bottom sheet component from frappe_visual.")}</p>`,
					});
				}
			});
		} else if (fnName === "speedDial") {
			$render.html(`
				<div style="text-align:center;padding:40px;position:relative;min-height:200px">
					<p>${__("Speed Dial appears in the bottom-right corner")}</p>
				</div>
			`);
			if (frappe.visual.speedDial) {
				frappe.visual.speedDial(el, {
					actions: [
						{ label: __("Action 1"), icon: "plus", onClick: () => frappe.show_alert(__("Action 1")) },
						{ label: __("Action 2"), icon: "edit", onClick: () => frappe.show_alert(__("Action 2")) },
					],
				});
			}
		} else {
			// Fallback: show component info
			$render.html(`
				<div style="text-align:center;padding:40px;color:var(--text-muted)">
					<div style="font-size:32px;margin-bottom:12px">📦</div>
					<p>${__("Component")} <strong>${fnName}</strong> ${__("is defined in the bundle.")}</p>
					<p style="font-size:12px">${__("Usage:")} <code>frappe.visual.${fnName}(container, config)</code></p>
					<pre style="text-align:start;max-height:200px;overflow:auto;margin-top:16px;padding:12px;background:var(--bg-light-gray);border-radius:8px;font-size:11px">${JSON.stringify(config, null, 2)}</pre>
				</div>
			`);
		}
	} catch (e) {
		$render.html(`
			<div style="text-align:center;padding:40px;color:var(--red-500)">
				<div style="font-size:32px;margin-bottom:12px">⚠️</div>
				<p>${__("Error rendering component:")}</p>
				<pre style="font-size:12px;color:var(--text-muted)">${frappe.utils.escape_html(e.message)}</pre>
			</div>
		`);
	}
}
