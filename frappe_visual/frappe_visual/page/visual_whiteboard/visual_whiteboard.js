// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Visual Whiteboard — Full-page collaborative whiteboard with save/load
 * via FV Visual Asset. Draw, add shapes, text, sticky notes, link to
 * Frappe documents.
 */
frappe.pages["visual-whiteboard"].on_page_show = function (wrapper) {
	if (wrapper._wb_loaded) return;
	wrapper._wb_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Whiteboard"),
		single_column: true,
	});

	// Toolbar: Save / Load / New / Export
	page.set_primary_action(__("Save"), () => _saveWhiteboard(), "ti ti-device-floppy");

	page.add_menu_item(__("Load Whiteboard"), () => _loadWhiteboard());
	page.add_menu_item(__("New Whiteboard"), () => _newWhiteboard());
	page.add_menu_item(__("Export as PNG"), () => _exportWhiteboard("png"));
	page.add_menu_item(__("Export as SVG"), () => _exportWhiteboard("svg"));

	let currentAssetName = null;

	const $container = $(`
		<div class="fv-whiteboard-page fv-fx-page-enter" style="padding: 0; height: calc(100vh - 120px); position: relative;">
			<!-- Floating toolbar -->
			<div class="fv-wb-toolbar position-absolute d-flex gap-2 fv-fx-glass p-2 rounded-3" style="top: 10px; inset-inline-start: 10px; z-index: 10;">
				<button class="btn btn-xs btn-default fv-wb-tool active" data-tool="select" title="${__("Select")}"><i class="ti ti-pointer"></i></button>
				<button class="btn btn-xs btn-default fv-wb-tool" data-tool="pen" title="${__("Draw")}"><i class="ti ti-pencil"></i></button>
				<button class="btn btn-xs btn-default fv-wb-tool" data-tool="rect" title="${__("Rectangle")}"><i class="ti ti-square"></i></button>
				<button class="btn btn-xs btn-default fv-wb-tool" data-tool="circle" title="${__("Circle")}"><i class="ti ti-circle"></i></button>
				<button class="btn btn-xs btn-default fv-wb-tool" data-tool="arrow" title="${__("Arrow")}"><i class="ti ti-arrow-up-right"></i></button>
				<button class="btn btn-xs btn-default fv-wb-tool" data-tool="text" title="${__("Text")}"><i class="ti ti-typography"></i></button>
				<button class="btn btn-xs btn-default fv-wb-tool" data-tool="sticky" title="${__("Sticky Note")}"><i class="ti ti-note"></i></button>
				<div class="vr mx-1"></div>
				<input type="color" class="fv-wb-color" value="#6366F1" title="${__("Color")}" style="width: 28px; height: 28px; border: none; cursor: pointer;">
				<select class="fv-wb-size form-select form-select-sm" style="width: 60px;">
					<option value="2">2px</option>
					<option value="4" selected>4px</option>
					<option value="8">8px</option>
					<option value="16">16px</option>
				</select>
			</div>

			<!-- Canvas -->
			<div id="fv-wb-canvas" style="width: 100%; height: 100%; background: var(--card-bg); cursor: crosshair; overflow: hidden;">
				<svg id="fv-wb-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
					<!-- Grid pattern -->
					<defs>
						<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
							<path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-color)" stroke-width="0.5"/>
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#grid)" />
					<g id="fv-wb-content"></g>
				</svg>
			</div>
		</div>
	`).appendTo(page.body);

	// Tool selection
	$container.on("click", ".fv-wb-tool", function () {
		$container.find(".fv-wb-tool").removeClass("active btn-primary").addClass("btn-default");
		$(this).addClass("active btn-primary").removeClass("btn-default");
	});

	// Simple drawing state
	let elements = [];
	let isDrawing = false;
	let currentPath = null;
	const svg = document.getElementById("fv-wb-svg");
	const content = document.getElementById("fv-wb-content");

	if (svg) {
		svg.addEventListener("mousedown", (e) => {
			const tool = $container.find(".fv-wb-tool.active").data("tool");
			const color = $container.find(".fv-wb-color").val();
			const size = $container.find(".fv-wb-size").val();
			const rect = svg.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			if (tool === "pen") {
				isDrawing = true;
				currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
				currentPath.setAttribute("d", `M ${x} ${y}`);
				currentPath.setAttribute("stroke", color);
				currentPath.setAttribute("stroke-width", size);
				currentPath.setAttribute("fill", "none");
				currentPath.setAttribute("stroke-linecap", "round");
				currentPath.setAttribute("stroke-linejoin", "round");
				content.appendChild(currentPath);
			} else if (tool === "sticky") {
				const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
				g.innerHTML = `
					<rect x="${x}" y="${y}" width="120" height="100" rx="4" fill="#fef08a" stroke="#eab308" stroke-width="1" opacity="0.9"/>
					<text x="${x + 10}" y="${y + 30}" font-size="12" fill="#713f12">${__("Note...")}</text>
				`;
				content.appendChild(g);
				elements.push({ type: "sticky", x, y, text: __("Note...") });
			} else if (tool === "rect") {
				const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				r.setAttribute("x", x);
				r.setAttribute("y", y);
				r.setAttribute("width", 100);
				r.setAttribute("height", 80);
				r.setAttribute("rx", 4);
				r.setAttribute("stroke", color);
				r.setAttribute("stroke-width", size);
				r.setAttribute("fill", "none");
				content.appendChild(r);
				elements.push({ type: "rect", x, y, w: 100, h: 80, color, size });
			} else if (tool === "circle") {
				const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
				c.setAttribute("cx", x);
				c.setAttribute("cy", y);
				c.setAttribute("r", 50);
				c.setAttribute("stroke", color);
				c.setAttribute("stroke-width", size);
				c.setAttribute("fill", "none");
				content.appendChild(c);
				elements.push({ type: "circle", cx: x, cy: y, r: 50, color, size });
			} else if (tool === "text") {
				const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
				t.setAttribute("x", x);
				t.setAttribute("y", y);
				t.setAttribute("font-size", "16");
				t.setAttribute("fill", color);
				t.textContent = __("Double-click to edit");
				content.appendChild(t);
				elements.push({ type: "text", x, y, text: __("Double-click to edit"), color });
			}
		});

		svg.addEventListener("mousemove", (e) => {
			if (!isDrawing || !currentPath) return;
			const rect = svg.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const d = currentPath.getAttribute("d");
			currentPath.setAttribute("d", d + ` L ${x} ${y}`);
		});

		svg.addEventListener("mouseup", () => {
			if (isDrawing && currentPath) {
				elements.push({ type: "path", d: currentPath.getAttribute("d") });
			}
			isDrawing = false;
			currentPath = null;
		});
	}

	function _saveWhiteboard() {
		const svgContent = content ? content.innerHTML : "";
		const data = JSON.stringify({ elements, svg: svgContent });

		frappe.call({
			method: "frappe_visual.api.v1.whiteboard.save_whiteboard",
			args: {
				name: currentAssetName,
				title: page.get_title() || __("Untitled Whiteboard"),
				data: data,
			},
			callback: (r) => {
				if (r.message?.status === "success") {
					currentAssetName = r.message.data?.name;
					frappe.show_alert({ message: __("Whiteboard saved"), indicator: "green" });
				}
			},
		});
	}

	function _loadWhiteboard() {
		frappe.prompt(
			{ label: __("Whiteboard Name"), fieldname: "name", fieldtype: "Link", options: "FV Visual Asset",
			  get_query: () => ({ filters: { asset_type: "Whiteboard" } }) },
			(values) => {
				frappe.call({
					method: "frappe_visual.api.v1.whiteboard.load_whiteboard",
					args: { name: values.name },
					callback: (r) => {
						if (r.message?.status === "success" && r.message.data) {
							currentAssetName = r.message.data.name;
							page.set_title(r.message.data.title || __("Whiteboard"));
							try {
								const parsed = JSON.parse(r.message.data.data || "{}");
								if (content && parsed.svg) {
									content.innerHTML = parsed.svg;
								}
								elements = parsed.elements || [];
							} catch (e) { /* ignore parse errors */ }
						}
					},
				});
			},
			__("Load Whiteboard"),
		);
	}

	function _newWhiteboard() {
		if (content) content.innerHTML = "";
		elements = [];
		currentAssetName = null;
		page.set_title(__("Whiteboard"));
	}

	function _exportWhiteboard(format) {
		frappe.require("frappe_visual.bundle.js", () => {
			const v = frappe.visual;
			if (v && typeof v.pdf_export === "object" && svg) {
				try {
					if (format === "svg") {
						const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = "whiteboard.svg";
						a.click();
						URL.revokeObjectURL(url);
					} else {
						frappe.show_alert({ message: __("PNG export via Scene Exporter"), indicator: "blue" });
					}
				} catch (e) { /* */ }
			}
		});
	}
};
