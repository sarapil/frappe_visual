// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Whiteboard DocType Linking
 * =============================================
 * Extends the Whiteboard component with:
 *  - "Document" tool: drop a Frappe DocType card onto the canvas
 *  - Link any element → real Frappe document (via context menu)
 *  - Server persistence: save / load via api/v1/whiteboard.py
 *  - Auto-save debounce (2 s after last change)
 *  - EventBus integration (whiteboard:save, whiteboard:link)
 *
 * Auto-initializes on import. Zero config.
 *
 * @module frappe_visual/utils/whiteboard_doclink
 */

frappe.provide("frappe.visual.whiteboardDocLink");

(function () {
	"use strict";

	const AUTOSAVE_DELAY = 2000;
	const LINK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

	let _autoSaveTimer = null;

	/* ── Extend Whiteboard Prototype ───────────────────────────── */
	function _patchWhiteboard() {
		const WB = frappe.visual?.Whiteboard;
		if (!WB) return;

		// Guard against double-patching
		if (WB._docLinkPatched) return;
		WB._docLinkPatched = true;

		const proto = WB.prototype;

		/* ── New: linked_documents map ──────────────────────── */
		const origInit = proto._init;
		proto._init = function () {
			this._linkedDocs = {};      // { elementId: { doctype, docname, label } }
			this._whiteboardName = null; // server-side FV Visual Asset name
			origInit.call(this);
			this._addDocLinkTool();
			this._addDocLinkCSS();
		};

		/* ── Add "Document" tool to toolbar ────────────────── */
		proto._addDocLinkTool = function () {
			if (!this._toolbarEl) return;

			// Add separator
			const sep = document.createElement("div");
			sep.className = "fv-wb-sep";
			this._toolbarEl.appendChild(sep);

			// "Link Doc" button
			const linkBtn = document.createElement("button");
			linkBtn.className = "fv-wb-tool";
			linkBtn.title = __("Link Document");
			linkBtn.innerHTML = LINK_ICON;
			linkBtn.addEventListener("click", () => this._promptDocLink());
			this._toolbarEl.appendChild(linkBtn);

			// "Add DocType Node" button
			const docBtn = document.createElement("button");
			docBtn.className = "fv-wb-tool";
			docBtn.title = __("Add Document Card");
			docBtn.innerHTML = "📄";
			docBtn.addEventListener("click", () => this._addDocCard());
			this._toolbarEl.appendChild(docBtn);

			// "Save" button
			const saveBtn = document.createElement("button");
			saveBtn.className = "fv-wb-tool";
			saveBtn.title = __("Save to Server");
			saveBtn.innerHTML = "💾";
			saveBtn.addEventListener("click", () => this.saveToServer());
			this._toolbarEl.appendChild(saveBtn);

			// "Load" button
			const loadBtn = document.createElement("button");
			loadBtn.className = "fv-wb-tool";
			loadBtn.title = __("Load from Server");
			loadBtn.innerHTML = "📂";
			loadBtn.addEventListener("click", () => this._showLoadDialog());
			this._toolbarEl.appendChild(loadBtn);
		};

		/* ── Add DocType Card Element ──────────────────────── */
		proto._addDocCard = function () {
			const self = this;
			// Prompt for doctype + docname using Frappe's link control
			const d = new frappe.ui.Dialog({
				title: __("Add Document Card"),
				fields: [
					{
						fieldname: "doctype",
						fieldtype: "Link",
						options: "DocType",
						label: __("DocType"),
						reqd: 1,
					},
					{
						fieldname: "docname",
						fieldtype: "Dynamic Link",
						options: "doctype",
						label: __("Document"),
						reqd: 1,
					},
				],
				primary_action_label: __("Add"),
				primary_action(values) {
					d.hide();
					const label = `${values.doctype}\n${values.docname}`;
					// Add as a styled sticky note
					const color = _doctypeColor(values.doctype);
					const id = self._addElement({
						type: "sticky",
						x: 100 + Math.random() * 200,
						y: 100 + Math.random() * 200,
						width: 180,
						height: 80,
						text: label,
						color,
					});

					// Link it
					self._linkedDocs[id] = {
						doctype: values.doctype,
						docname: values.docname,
						label,
					};

					self._addLinkBadge(id);
					self._scheduleAutoSave();
					_emitBus("whiteboard:link", { elementId: id, ...values });
				},
			});
			d.show();
		};

		/* ── Link Existing Element to Document ────────────── */
		proto._promptDocLink = function () {
			const elId = this._selectedId;
			if (!elId) {
				frappe.show_alert({ message: __("Select an element first"), indicator: "orange" });
				return;
			}
			const self = this;
			const d = new frappe.ui.Dialog({
				title: __("Link to Document"),
				fields: [
					{ fieldname: "doctype", fieldtype: "Link", options: "DocType", label: __("DocType"), reqd: 1 },
					{ fieldname: "docname", fieldtype: "Dynamic Link", options: "doctype", label: __("Document"), reqd: 1 },
				],
				primary_action_label: __("Link"),
				primary_action(values) {
					d.hide();
					self._linkedDocs[elId] = {
						doctype: values.doctype,
						docname: values.docname,
						label: `${values.doctype}: ${values.docname}`,
					};
					self._addLinkBadge(elId);
					self._scheduleAutoSave();
					_emitBus("whiteboard:link", { elementId: elId, ...values });
					frappe.show_alert({ message: __("Element linked to {0}", [values.docname]), indicator: "green" });
				},
			});
			d.show();
		};

		/* ── Visual Link Badge on SVG Element ─────────────── */
		proto._addLinkBadge = function (elId) {
			const svgEl = this._elemLayer?.querySelector(`[data-id="${elId}"]`);
			if (!svgEl) return;

			// Remove existing badge
			svgEl.querySelectorAll(".fv-wb-link-badge").forEach(b => b.remove());

			const linked = this._linkedDocs[elId];
			if (!linked) return;

			const ns = "http://www.w3.org/2000/svg";
			const badge = document.createElementNS(ns, "g");
			badge.setAttribute("class", "fv-wb-link-badge");

			// Position: top-right of element
			const el = this._elements.find(e => e.id === elId);
			const bx = (el?.x ?? el?.cx ?? 0) + (el?.width ?? el?.rx ?? 100) - 16;
			const by = (el?.y ?? (el?.cy ? el.cy - (el?.ry ?? 0) : 0)) - 4;

			const circle = document.createElementNS(ns, "circle");
			circle.setAttribute("cx", bx + 8);
			circle.setAttribute("cy", by + 8);
			circle.setAttribute("r", 8);
			circle.setAttribute("fill", "#6366f1");
			circle.setAttribute("stroke", "#fff");
			circle.setAttribute("stroke-width", "1.5");

			const text = document.createElementNS(ns, "text");
			text.setAttribute("x", bx + 8);
			text.setAttribute("y", by + 12);
			text.setAttribute("fill", "#fff");
			text.setAttribute("font-size", "10");
			text.setAttribute("text-anchor", "middle");
			text.textContent = "🔗";

			badge.appendChild(circle);
			badge.appendChild(text);

			// Click badge to navigate
			badge.style.cursor = "pointer";
			badge.addEventListener("click", (e) => {
				e.stopPropagation();
				frappe.set_route("Form", linked.doctype, linked.docname);
			});

			svgEl.appendChild(badge);
		};

		/* ── Server Save / Load ───────────────────────────── */
		proto.saveToServer = async function (name) {
			const boardName = name || this._whiteboardName || `Whiteboard ${frappe.datetime.now_datetime()}`;
			try {
				const result = await frappe.xcall(
					"frappe_visual.api.v1.whiteboard.save_whiteboard",
					{
						name: boardName,
						canvas_data: {
							elements: this.exportJSON(),
							linkedDocs: this._linkedDocs,
							zoom: this._zoom,
							pan: this._pan,
						},
						linked_documents: Object.values(this._linkedDocs),
					}
				);
				this._whiteboardName = result?.name || boardName;
				frappe.show_alert({ message: __("Whiteboard saved"), indicator: "green" });
				_emitBus("whiteboard:save", { name: this._whiteboardName });
			} catch (err) {
				frappe.show_alert({ message: __("Save failed"), indicator: "red" });
				console.error("Whiteboard save error:", err);
			}
		};

		proto.loadFromServer = async function (name) {
			try {
				const result = await frappe.xcall(
					"frappe_visual.api.v1.whiteboard.load_whiteboard",
					{ name }
				);
				if (!result) return;

				const data = typeof result.canvas_data === "string"
					? JSON.parse(result.canvas_data)
					: result.canvas_data;

				if (data.elements) this.importJSON(data.elements);
				if (data.linkedDocs) {
					this._linkedDocs = data.linkedDocs;
					// Restore link badges
					for (const elId of Object.keys(this._linkedDocs)) {
						this._addLinkBadge(elId);
					}
				}
				if (data.zoom) this.zoomTo(data.zoom);
				if (data.pan) {
					this._pan = data.pan;
					this._applyTransform();
				}
				this._whiteboardName = name;
				frappe.show_alert({ message: __("Whiteboard loaded"), indicator: "blue" });
				_emitBus("whiteboard:load", { name });
			} catch (err) {
				frappe.show_alert({ message: __("Load failed"), indicator: "red" });
				console.error("Whiteboard load error:", err);
			}
		};

		proto._showLoadDialog = async function () {
			const self = this;
			try {
				const boards = await frappe.xcall(
					"frappe_visual.api.v1.whiteboard.list_whiteboards",
					{}
				);
				if (!boards?.length) {
					frappe.show_alert({ message: __("No saved whiteboards"), indicator: "orange" });
					return;
				}
				const d = new frappe.ui.Dialog({
					title: __("Load Whiteboard"),
					fields: [
						{
							fieldname: "board",
							fieldtype: "Select",
							label: __("Whiteboard"),
							options: boards.map(b => b.name).join("\n"),
							reqd: 1,
						},
					],
					primary_action_label: __("Load"),
					primary_action(values) {
						d.hide();
						self.loadFromServer(values.board);
					},
				});
				d.show();
			} catch {
				frappe.show_alert({ message: __("Could not list whiteboards"), indicator: "red" });
			}
		};

		/* ── Auto-save debounce ───────────────────────────── */
		proto._scheduleAutoSave = function () {
			if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
			_autoSaveTimer = setTimeout(() => {
				if (this._whiteboardName) {
					this.saveToServer(this._whiteboardName);
				}
			}, AUTOSAVE_DELAY);
		};

		// Hook into existing _emitChange to trigger auto-save
		const origEmitChange = proto._emitChange;
		proto._emitChange = function () {
			origEmitChange.call(this);
			this._scheduleAutoSave();
		};

		/* ── Get linked doc for element ───────────────────── */
		proto.getLinkedDoc = function (elementId) {
			return this._linkedDocs[elementId] || null;
		};

		proto.getAllLinkedDocs = function () {
			return { ...this._linkedDocs };
		};

		proto.unlinkElement = function (elementId) {
			delete this._linkedDocs[elementId];
			const svgEl = this._elemLayer?.querySelector(`[data-id="${elementId}"]`);
			svgEl?.querySelectorAll(".fv-wb-link-badge").forEach(b => b.remove());
			this._scheduleAutoSave();
		};

		/* ── CSS for link badge ───────────────────────────── */
		proto._addDocLinkCSS = function () {
			if (document.getElementById("fv-wb-doclink-css")) return;
			const style = document.createElement("style");
			style.id = "fv-wb-doclink-css";
			style.textContent = `
.fv-wb-link-badge { pointer-events: auto; }
.fv-wb-link-badge circle { transition: fill 0.2s; }
.fv-wb-link-badge:hover circle { fill: #4f46e5; }
.fv-wb-link-badge text { pointer-events: none; }
`;
			document.head.appendChild(style);
		};
	}

	/* ── Helpers ────────────────────────────────────────────────── */
	function _doctypeColor(dt) {
		const colors = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#ddd6fe", "#fed7aa", "#fce7f3", "#cffafe"];
		let hash = 0;
		for (let i = 0; i < dt.length; i++) hash = dt.charCodeAt(i) + ((hash << 5) - hash);
		return colors[Math.abs(hash) % colors.length];
	}

	function _emitBus(event, data) {
		if (frappe.visual?.eventBus?.emit) {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	/* ── Public API ────────────────────────────────────────────── */
	frappe.visual.whiteboardDocLink = {
		/** Manually trigger patching (normally auto) */
		init: _patchWhiteboard,
	};

	/* ── Boot ──────────────────────────────────────────────────── */
	// Patch as soon as Whiteboard class is available
	if (frappe.visual?.Whiteboard) {
		_patchWhiteboard();
	} else {
		// Wait for bundle registration
		const _wait = setInterval(() => {
			if (frappe.visual?.Whiteboard) {
				clearInterval(_wait);
				_patchWhiteboard();
			}
		}, 200);
		// Give up after 10s
		setTimeout(() => clearInterval(_wait), 10000);
	}
})();
