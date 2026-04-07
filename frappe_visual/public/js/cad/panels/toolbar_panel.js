// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ToolbarPanel — Top toolbar for 2D CAD editor
 * ===============================================
 * Tool selection buttons, undo/redo, zoom, save, and custom actions.
 */

export class ToolbarPanel {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			tools: ["select", "wall", "rect", "line", "circle", "door", "window", "measure", "text", "erase"],
			showUndo: true,
			showZoom: true,
			showSave: true,
			onToolChange: null,
			onAction: null,
			customActions: [],
		}, opts);
		this._activeTool = "select";
		this._buttons = new Map();
	}

	init() {
		this.container.classList.add("fv-toolbar-panel");
		this._buildUI();
		return this;
	}

	setActiveTool(name) {
		this._activeTool = name;
		for (const [tool, btn] of this._buttons) {
			btn.classList.toggle("active", tool === name);
		}
	}

	_buildUI() {
		this.container.innerHTML = "";
		this.container.style.cssText = "display:flex;align-items:center;gap:2px;padding:4px 8px;background:var(--card-bg, #fff);border-bottom:1px solid var(--border-color, #e0e0e0);flex-wrap:wrap;";

		// Drawing tools
		const toolGroup = this._createGroup();
		const toolIcons = {
			select: "pointer",
			wall: "line",
			rect: "square",
			line: "line-dashed",
			circle: "circle",
			door: "door",
			window: "app-window",
			measure: "ruler-measure",
			text: "text-size",
			erase: "eraser",
		};

		for (const tool of this.opts.tools) {
			const btn = this._createButton(toolIcons[tool] || "tool", __(tool), () => {
				this.setActiveTool(tool);
				if (this.opts.onToolChange) this.opts.onToolChange(tool);
			});
			btn.dataset.tool = tool;
			this._buttons.set(tool, btn);
			toolGroup.appendChild(btn);
		}
		this.container.appendChild(toolGroup);

		// Separator
		this.container.appendChild(this._createSep());

		// Undo / redo
		if (this.opts.showUndo) {
			const undoGroup = this._createGroup();
			undoGroup.appendChild(this._createButton("arrow-back-up", __("Undo"), () => this._action("undo")));
			undoGroup.appendChild(this._createButton("arrow-forward-up", __("Redo"), () => this._action("redo")));
			this.container.appendChild(undoGroup);
			this.container.appendChild(this._createSep());
		}

		// Zoom controls
		if (this.opts.showZoom) {
			const zoomGroup = this._createGroup();
			zoomGroup.appendChild(this._createButton("zoom-in", __("Zoom In"), () => this._action("zoom-in")));
			zoomGroup.appendChild(this._createButton("zoom-out", __("Zoom Out"), () => this._action("zoom-out")));
			zoomGroup.appendChild(this._createButton("arrows-maximize", __("Fit"), () => this._action("zoom-fit")));
			this.container.appendChild(zoomGroup);
			this.container.appendChild(this._createSep());
		}

		// Save + 3D Preview
		if (this.opts.showSave) {
			const saveGroup = this._createGroup();
			saveGroup.appendChild(this._createButton("device-floppy", __("Save"), () => this._action("save"), "primary"));
			saveGroup.appendChild(this._createButton("3d-cube-sphere", __("3D Preview"), () => this._action("preview-3d")));
			this.container.appendChild(saveGroup);
		}

		// Custom actions
		if (this.opts.customActions.length) {
			this.container.appendChild(this._createSep());
			const customGroup = this._createGroup();
			for (const action of this.opts.customActions) {
				customGroup.appendChild(this._createButton(action.icon || "settings", __(action.label), () => this._action(action.name)));
			}
			this.container.appendChild(customGroup);
		}

		// Mark initial active tool
		this.setActiveTool(this._activeTool);
	}

	_createGroup() {
		const g = document.createElement("div");
		g.className = "fv-toolbar-group";
		g.style.cssText = "display:flex;gap:1px;";
		return g;
	}

	_createButton(icon, title, onClick, variant = "") {
		const btn = document.createElement("button");
		btn.className = `btn btn-xs ${variant === "primary" ? "btn-primary-light" : "btn-default"} fv-toolbar-btn`;
		btn.title = title;
		btn.innerHTML = `<i class="ti ti-${icon}"></i>`;
		btn.style.cssText = "min-width:28px;height:28px;padding:2px 5px;";
		btn.addEventListener("click", onClick);
		return btn;
	}

	_createSep() {
		const sep = document.createElement("div");
		sep.style.cssText = "width:1px;height:20px;background:var(--border-color, #ddd);margin:0 4px;";
		return sep;
	}

	_action(name) {
		if (this.opts.onAction) this.opts.onAction(name);
	}

	dispose() {
		this._buttons.clear();
		this.container.innerHTML = "";
	}
}
