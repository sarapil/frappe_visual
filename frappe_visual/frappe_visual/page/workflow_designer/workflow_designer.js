// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Workflow Designer — Visual workflow builder for creating and editing
 * Frappe Workflow documents. Drag-drop stages, connect transitions,
 * export to Workflow DocType.
 */
frappe.pages["workflow-designer"].on_page_show = function (wrapper) {
	if (wrapper._wf_loaded) return;
	wrapper._wf_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Workflow Designer"),
		single_column: true,
	});

	page.set_indicator(__("Visual Builder"), "blue");

	// Toolbar
	page.set_primary_action(__("Save as Workflow"), () => _saveAsWorkflow(), "ti ti-device-floppy");
	page.add_menu_item(__("Load Existing Workflow"), () => _loadWorkflow());
	page.add_menu_item(__("Save as Visual Asset"), () => _saveAsAsset());
	page.add_menu_item(__("Export as SVG"), () => _export("svg"));
	page.add_menu_item(__("Clear Canvas"), () => _clearCanvas());

	let workflowData = { states: [], transitions: [] };
	let selectedState = null;

	const $container = $(`
		<div class="fv-workflow-designer fv-fx-page-enter" style="padding: 0; height: calc(100vh - 120px); display: flex;">
			<!-- Left Panel: Properties -->
			<div class="fv-wf-panel fv-fx-glass" style="width: 280px; border-inline-end: 1px solid var(--border-color); overflow-y: auto; padding: var(--padding-md);">
				<h6 class="mb-3"><i class="ti ti-settings me-1"></i>${__("Properties")}</h6>

				<div class="mb-3">
					<label class="form-label">${__("Workflow Name")}</label>
					<input type="text" class="form-control form-control-sm" id="fv-wf-name" placeholder="${__("My Workflow")}">
				</div>
				<div class="mb-3">
					<label class="form-label">${__("Document Type")}</label>
					<input type="text" class="form-control form-control-sm" id="fv-wf-doctype" placeholder="${__("e.g., Sales Order")}">
				</div>

				<hr>
				<h6 class="mb-2">${__("Add State")}</h6>
				<div class="d-flex gap-2 mb-3">
					<input type="text" class="form-control form-control-sm flex-grow-1" id="fv-wf-new-state" placeholder="${__("State name")}">
					<button class="btn btn-xs btn-primary" id="fv-wf-add-state"><i class="ti ti-plus"></i></button>
				</div>

				<div id="fv-wf-state-list"></div>

				<hr>
				<h6 class="mb-2">${__("State Colors")}</h6>
				<div class="d-flex flex-wrap gap-2" id="fv-wf-colors">
					<span class="badge bg-primary cursor-pointer fv-wf-color" data-color="#6366F1">Primary</span>
					<span class="badge bg-success cursor-pointer fv-wf-color" data-color="#22c55e">Success</span>
					<span class="badge bg-warning cursor-pointer fv-wf-color" data-color="#f59e0b">Warning</span>
					<span class="badge bg-danger cursor-pointer fv-wf-color" data-color="#ef4444">Danger</span>
					<span class="badge bg-info cursor-pointer fv-wf-color" data-color="#06b6d4">Info</span>
				</div>
			</div>

			<!-- Main Canvas -->
			<div class="flex-grow-1 position-relative" style="overflow: hidden;">
				<svg id="fv-wf-canvas" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background: var(--card-bg);">
					<defs>
						<pattern id="wf-grid" width="30" height="30" patternUnits="userSpaceOnUse">
							<path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--border-color)" stroke-width="0.3"/>
						</pattern>
						<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
							<polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted)"/>
						</marker>
					</defs>
					<rect width="100%" height="100%" fill="url(#wf-grid)"/>
					<g id="fv-wf-transitions"></g>
					<g id="fv-wf-states"></g>
				</svg>

				<!-- Instructions overlay -->
				<div id="fv-wf-instructions" class="position-absolute text-center text-muted" style="top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">
					<i class="ti ti-git-branch" style="font-size: 4rem; opacity: 0.2;"></i>
					<p class="mt-2">${__("Add states from the left panel, then drag to connect them")}</p>
				</div>
			</div>
		</div>
	`).appendTo(page.body);

	// Add state button
	$container.find("#fv-wf-add-state").on("click", () => {
		const name = $container.find("#fv-wf-new-state").val().trim();
		if (!name) return;
		if (workflowData.states.find(s => s.name === name)) {
			frappe.show_alert({ message: __("State already exists"), indicator: "orange" });
			return;
		}

		const x = 100 + (workflowData.states.length % 4) * 200;
		const y = 100 + Math.floor(workflowData.states.length / 4) * 150;
		workflowData.states.push({ name, x, y, color: "#6366F1" });
		$container.find("#fv-wf-new-state").val("");
		$container.find("#fv-wf-instructions").hide();
		_renderWorkflow();
	});

	function _renderWorkflow() {
		const statesG = document.getElementById("fv-wf-states");
		const transG = document.getElementById("fv-wf-transitions");
		if (!statesG || !transG) return;

		statesG.innerHTML = "";
		transG.innerHTML = "";

		// Render transitions
		workflowData.transitions.forEach(t => {
			const from = workflowData.states.find(s => s.name === t.from);
			const to = workflowData.states.find(s => s.name === t.to);
			if (!from || !to) return;

			const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("x1", from.x + 70);
			line.setAttribute("y1", from.y + 20);
			line.setAttribute("x2", to.x + 70);
			line.setAttribute("y2", to.y + 20);
			line.setAttribute("stroke", "var(--text-muted)");
			line.setAttribute("stroke-width", "2");
			line.setAttribute("marker-end", "url(#arrowhead)");
			transG.appendChild(line);
		});

		// Render states
		workflowData.states.forEach(state => {
			const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
			g.setAttribute("transform", `translate(${state.x}, ${state.y})`);
			g.setAttribute("class", "fv-wf-state-node");
			g.style.cursor = "grab";

			g.innerHTML = `
				<rect width="140" height="40" rx="8" fill="${state.color}" opacity="0.15" stroke="${state.color}" stroke-width="2"/>
				<text x="70" y="25" text-anchor="middle" fill="var(--text-color)" font-size="13" font-weight="500">${state.name}</text>
			`;

			// Drag behavior
			let isDragging = false, startX, startY;
			g.addEventListener("mousedown", (e) => {
				isDragging = true;
				startX = e.clientX - state.x;
				startY = e.clientY - state.y;
				selectedState = state;
				g.style.cursor = "grabbing";
			});

			document.addEventListener("mousemove", (e) => {
				if (!isDragging || selectedState !== state) return;
				state.x = e.clientX - startX;
				state.y = e.clientY - startY;
				_renderWorkflow();
			});

			document.addEventListener("mouseup", () => {
				isDragging = false;
				if (g) g.style.cursor = "grab";
			});

			statesG.appendChild(g);
		});

		// Update state list in panel
		const $list = $container.find("#fv-wf-state-list").empty();
		workflowData.states.forEach((state, i) => {
			$list.append(`
				<div class="d-flex align-items-center gap-2 mb-2 p-2 rounded" style="background: var(--bg-color);">
					<div style="width: 12px; height: 12px; border-radius: 50%; background: ${state.color};"></div>
					<span class="flex-grow-1 small">${state.name}</span>
					<button class="btn btn-xs btn-danger fv-wf-remove-state" data-idx="${i}"><i class="ti ti-trash" style="font-size: 11px;"></i></button>
				</div>
			`);
		});
	}

	// Remove state
	$container.on("click", ".fv-wf-remove-state", function () {
		const idx = $(this).data("idx");
		const removed = workflowData.states.splice(idx, 1)[0];
		workflowData.transitions = workflowData.transitions.filter(t => t.from !== removed.name && t.to !== removed.name);
		_renderWorkflow();
	});

	function _saveAsWorkflow() {
		const name = $container.find("#fv-wf-name").val().trim();
		const doctype = $container.find("#fv-wf-doctype").val().trim();
		if (!name || !doctype) {
			frappe.show_alert({ message: __("Please enter Workflow Name and Document Type"), indicator: "orange" });
			return;
		}
		frappe.show_alert({ message: __("Workflow save — coming soon"), indicator: "blue" });
	}

	function _loadWorkflow() {
		frappe.prompt(
			{ label: __("Workflow"), fieldname: "workflow", fieldtype: "Link", options: "Workflow" },
			(values) => {
				frappe.call({
					method: "frappe.client.get",
					args: { doctype: "Workflow", name: values.workflow },
					callback: (r) => {
						if (!r.message) return;
						const wf = r.message;
						$container.find("#fv-wf-name").val(wf.workflow_name || wf.name);
						$container.find("#fv-wf-doctype").val(wf.document_type);

						workflowData.states = (wf.states || []).map((s, i) => ({
							name: s.state,
							x: 100 + (i % 4) * 200,
							y: 100 + Math.floor(i / 4) * 150,
							color: s.style === "Success" ? "#22c55e" : s.style === "Danger" ? "#ef4444" : s.style === "Warning" ? "#f59e0b" : "#6366F1",
						}));
						workflowData.transitions = (wf.transitions || []).map(t => ({
							from: t.state, to: t.next_state, action: t.action,
						}));

						$container.find("#fv-wf-instructions").hide();
						_renderWorkflow();
					},
				});
			},
			__("Load Workflow"),
		);
	}

	function _saveAsAsset() {
		frappe.call({
			method: "frappe_visual.api.v1.whiteboard.save_whiteboard",
			args: {
				title: $container.find("#fv-wf-name").val() || __("Untitled Workflow"),
				data: JSON.stringify(workflowData),
			},
			callback: (r) => {
				if (r.message?.status === "success") {
					frappe.show_alert({ message: __("Saved as Visual Asset"), indicator: "green" });
				}
			},
		});
	}

	function _clearCanvas() {
		workflowData = { states: [], transitions: [] };
		_renderWorkflow();
		$container.find("#fv-wf-instructions").show();
	}

	function _export(format) {
		const svg = document.getElementById("fv-wf-canvas");
		if (!svg) return;
		const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "workflow.svg";
		a.click();
		URL.revokeObjectURL(url);
	}
};
