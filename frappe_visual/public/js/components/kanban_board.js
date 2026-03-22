/**
 * KanbanBoard — Trello/Wekan-style Drag-and-Drop Board
 * ======================================================
 * A visual Kanban board that integrates with Frappe DocTypes.
 * Uses GSAP Draggable for smooth drag-and-drop, ColorSystem for
 * semantic card coloring, FloatingWindow for card details, and
 * AnimationEngine patterns for entrance/exit transitions.
 *
 * Usage:
 *   KanbanBoard.create('#container', {
 *     doctype: 'Task',
 *     fieldname: 'status',
 *     columns: [
 *       { value: 'Open',        label: 'مفتوح',  color: '#3b82f6', icon: '📋' },
 *       { value: 'Working',     label: 'جاري',   color: '#f59e0b', icon: '⚡' },
 *       { value: 'Completed',   label: 'مكتمل',  color: '#10b981', icon: '✅' },
 *     ],
 *     cardFields: ['subject', 'priority', 'assigned_to'],
 *     swimlaneField: 'priority',
 *     onCardMove: (card, fromCol, toCol) => {},
 *     onCardClick: (card) => {},
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class KanbanBoard {
	/**
	 * Factory method.
	 * @param {string|HTMLElement} container
	 * @param {Object} opts
	 * @returns {KanbanBoard}
	 */
	static create(container, opts) {
		return new KanbanBoard(container, opts);
	}

	/**
	 * @param {string|HTMLElement} container - CSS selector or DOM element
	 * @param {Object} opts
	 * @param {string}   [opts.doctype]       - Frappe DocType name (for auto-fetch)
	 * @param {string}   [opts.fieldname]     - Status field to group by
	 * @param {Array}    opts.columns         - Column definitions: { value, label, color, icon, wipLimit }
	 * @param {Array}    [opts.cards]         - Pre-loaded cards (skip fetch)
	 * @param {Array}    [opts.cardFields]    - Extra fields to display on card face
	 * @param {string}   [opts.titleField]    - Field to use as card title (default: 'name' or 'subject' or 'title')
	 * @param {string}   [opts.swimlaneField] - Field for horizontal swimlanes
	 * @param {Object}   [opts.swimlanes]     - Swimlane definitions: { value: { label, color } }
	 * @param {Function} [opts.onCardMove]    - (card, fromColumn, toColumn) => Promise|void
	 * @param {Function} [opts.onCardClick]   - (card) => void
	 * @param {Function} [opts.onCardDblClick]- (card) => void
	 * @param {Function} [opts.renderCard]    - Custom card renderer: (card, cardEl) => void
	 * @param {boolean}  [opts.showCounts=true]
	 * @param {boolean}  [opts.showAddButton=true]
	 * @param {boolean}  [opts.animate=true]
	 * @param {boolean}  [opts.compact=false]  - Compact card mode
	 * @param {Object}   [opts.filters]        - Additional Frappe filters for data fetch
	 * @param {string}   [opts.orderBy]        - Order field (default: 'modified desc')
	 */
	constructor(container, opts) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;

		this.opts = Object.assign(
			{
				columns: [],
				cards: null,
				cardFields: [],
				titleField: null,
				swimlaneField: null,
				swimlanes: null,
				showCounts: true,
				showAddButton: true,
				animate: true,
				compact: false,
				filters: {},
				orderBy: "modified desc",
			},
			opts
		);

		this.columns = new Map();
		this._cards = new Map();
		this._dragInstances = [];
		this._gsap = null;
		this._Draggable = null;

		this._init();
	}

	// ── Initialization ───────────────────────────────────────────
	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		this._Draggable = frappe.visual?.Draggable || window.Draggable;

		this._buildBoard();

		if (this.opts.cards) {
			this._populateCards(this.opts.cards);
		} else if (this.opts.doctype && this.opts.fieldname) {
			await this._fetchCards();
		}

		if (this.opts.animate) {
			this._animateEntrance();
		}
	}

	// ── Build DOM ────────────────────────────────────────────────
	_buildBoard() {
		this.container.classList.add("fv-kanban");
		if (this.opts.compact) {
			this.container.classList.add("fv-kanban-compact");
		}

		this.boardEl = document.createElement("div");
		this.boardEl.className = "fv-kanban-board";
		this.container.appendChild(this.boardEl);

		this.opts.columns.forEach((col) => {
			const colEl = this._buildColumn(col);
			this.boardEl.appendChild(colEl);
		});
	}

	_buildColumn(colDef) {
		const col = document.createElement("div");
		col.className = "fv-kanban-col";
		col.dataset.column = colDef.value;

		const color = colDef.color || ColorSystem.autoColor(colDef.value).border;

		col.innerHTML = `
			<div class="fv-kanban-col-header" style="--fv-kanban-col-color: ${color}">
				<div class="fv-kanban-col-title">
					${colDef.icon ? `<span class="fv-kanban-col-icon">${colDef.icon}</span>` : ""}
					<span class="fv-kanban-col-label">${colDef.label || colDef.value}</span>
					<span class="fv-kanban-col-count">0</span>
				</div>
				${colDef.wipLimit ? `<span class="fv-kanban-wip-limit" title="WIP Limit: ${colDef.wipLimit}">max ${colDef.wipLimit}</span>` : ""}
				${this.opts.showAddButton ? `<button class="fv-kanban-add-btn" title="Add card">+</button>` : ""}
			</div>
			<div class="fv-kanban-col-body" data-column="${colDef.value}"></div>
		`;

		// Add button handler
		const addBtn = col.querySelector(".fv-kanban-add-btn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this._onAddCard(colDef));
		}

		const colBody = col.querySelector(".fv-kanban-col-body");

		this.columns.set(colDef.value, {
			def: colDef,
			el: col,
			bodyEl: colBody,
			cards: [],
		});

		return col;
	}

	// ── Card Building ────────────────────────────────────────────
	_buildCard(card) {
		const cardEl = document.createElement("div");
		cardEl.className = "fv-kanban-card";
		cardEl.dataset.name = card.name;
		cardEl.draggable = false; // We use GSAP Draggable, not native

		// Determine title
		const titleField =
			this.opts.titleField ||
			(card.subject ? "subject" : card.title ? "title" : "name");
		const title = card[titleField] || card.name;

		// Card type color
		const typeColor = card._color || card.color || null;

		if (typeColor) {
			cardEl.style.setProperty("--fv-kanban-card-accent", typeColor);
		}

		// Priority indicator
		const priority = card.priority || card.urgency;
		const priorityClass = priority
			? `fv-kanban-priority-${priority.toLowerCase().replace(/\s+/g, "-")}`
			: "";

		cardEl.innerHTML = `
			<div class="fv-kanban-card-inner ${priorityClass}">
				${typeColor ? `<div class="fv-kanban-card-color-bar" style="background:${typeColor}"></div>` : ""}
				<div class="fv-kanban-card-content">
					<div class="fv-kanban-card-title">${frappe.utils.escape_html(title)}</div>
					${this._buildCardFields(card)}
					${this._buildCardMeta(card)}
				</div>
			</div>
		`;

		// Custom renderer override
		if (this.opts.renderCard) {
			this.opts.renderCard(card, cardEl);
		}

		// Click handler
		cardEl.addEventListener("click", (e) => {
			if (cardEl.classList.contains("fv-kanban-dragging")) return;
			if (this.opts.onCardClick) {
				this.opts.onCardClick(card, cardEl);
			} else if (this.opts.doctype) {
				frappe.set_route("Form", this.opts.doctype, card.name);
			}
		});

		// Double-click handler
		if (this.opts.onCardDblClick) {
			cardEl.addEventListener("dblclick", () => {
				this.opts.onCardDblClick(card, cardEl);
			});
		}

		// Setup drag
		this._setupCardDrag(cardEl, card);

		return cardEl;
	}

	_buildCardFields(card) {
		if (!this.opts.cardFields.length) return "";

		const fields = this.opts.cardFields
			.filter((f) => card[f] && f !== (this.opts.titleField || "subject"))
			.map((f) => {
				const val = card[f];
				// Detect user/avatar fields
				if (f === "assigned_to" || f === "_assign" || f === "owner") {
					return `<span class="fv-kanban-field fv-kanban-avatar" title="${val}">
						${frappe.avatar(val, "avatar-xs")}
					</span>`;
				}
				// Detect date fields
				if (f.includes("date") || f === "due_date" || f === "expected_delivery_date") {
					const formatted = frappe.datetime.str_to_user(val);
					const isOverdue =
						frappe.datetime.get_diff(val, frappe.datetime.get_today()) < 0;
					return `<span class="fv-kanban-field fv-kanban-date ${isOverdue ? "fv-kanban-overdue" : ""}" title="${f}">
						📅 ${formatted}
					</span>`;
				}
				// Generic field
				return `<span class="fv-kanban-field" title="${f}">${frappe.utils.escape_html(val)}</span>`;
			})
			.join("");

		return fields ? `<div class="fv-kanban-card-fields">${fields}</div>` : "";
	}

	_buildCardMeta(card) {
		const parts = [];

		// Indicator dot
		if (card.indicator_color || card.indicator) {
			const color = card.indicator_color || card.indicator;
			parts.push(`<span class="fv-kanban-indicator" style="background:${color}"></span>`);
		}

		// Tags / labels
		if (card._tags || card.tags) {
			const tags = (card._tags || card.tags || "")
				.split(",")
				.filter(Boolean)
				.slice(0, 3);
			tags.forEach((t) => {
				const tagColor = ColorSystem.autoColor(t.trim());
				parts.push(
					`<span class="fv-kanban-tag" style="background:${tagColor.bg};color:${tagColor.text};border:1px solid ${tagColor.border}">${t.trim()}</span>`
				);
			});
		}

		// Comment count
		if (card._comment_count) {
			parts.push(
				`<span class="fv-kanban-meta-item" title="Comments">💬 ${card._comment_count}</span>`
			);
		}

		return parts.length
			? `<div class="fv-kanban-card-meta">${parts.join("")}</div>`
			: "";
	}

	// ── Drag and Drop ────────────────────────────────────────────
	_setupCardDrag(cardEl, card) {
		if (!this._Draggable) {
			this._setupFallbackDrag(cardEl, card);
			return;
		}

		const board = this;
		const dragInstance = this._Draggable.create(cardEl, {
			type: "x,y",
			cursor: "grab",
			activeCursor: "grabbing",
			zIndexBoost: true,
			onPress() {
				cardEl.classList.add("fv-kanban-lifting");
			},
			onDragStart() {
				cardEl.classList.remove("fv-kanban-lifting");
				cardEl.classList.add("fv-kanban-dragging");
				board._createPlaceholder(cardEl);
				board._highlightDropZones(true);
			},
			onDrag() {
				board._updateDropTarget(cardEl);
			},
			onDragEnd() {
				cardEl.classList.remove("fv-kanban-dragging");
				board._highlightDropZones(false);
				board._handleDrop(cardEl, card);
			},
			onRelease() {
				cardEl.classList.remove("fv-kanban-lifting");
			},
		})[0];

		this._dragInstances.push(dragInstance);
	}

	_setupFallbackDrag(cardEl, card) {
		// HTML5 fallback drag-and-drop
		cardEl.draggable = true;

		cardEl.addEventListener("dragstart", (e) => {
			e.dataTransfer.setData("text/plain", card.name);
			cardEl.classList.add("fv-kanban-dragging");
			this._highlightDropZones(true);
		});

		cardEl.addEventListener("dragend", () => {
			cardEl.classList.remove("fv-kanban-dragging");
			this._highlightDropZones(false);
		});
	}

	_createPlaceholder(cardEl) {
		// Remove old placeholder
		this._removePlaceholder();

		this._placeholder = document.createElement("div");
		this._placeholder.className = "fv-kanban-placeholder";
		this._placeholder.style.height = cardEl.offsetHeight + "px";

		// Insert placeholder where card was
		cardEl.parentNode?.insertBefore(this._placeholder, cardEl);
	}

	_removePlaceholder() {
		if (this._placeholder) {
			this._placeholder.remove();
			this._placeholder = null;
		}
	}

	_highlightDropZones(show) {
		this.columns.forEach((colData) => {
			colData.bodyEl.classList.toggle("fv-kanban-drop-active", show);
		});
	}

	_updateDropTarget(cardEl) {
		const cardRect = cardEl.getBoundingClientRect();
		const cardCenterX = cardRect.left + cardRect.width / 2;
		const cardCenterY = cardRect.top + cardRect.height / 2;

		// Find which column we're over
		let targetCol = null;
		this.columns.forEach((colData) => {
			const colRect = colData.bodyEl.getBoundingClientRect();
			if (
				cardCenterX >= colRect.left &&
				cardCenterX <= colRect.right &&
				cardCenterY >= colRect.top - 50 &&
				cardCenterY <= colRect.bottom + 50
			) {
				targetCol = colData;
			}
			colData.bodyEl.classList.remove("fv-kanban-drop-hover");
		});

		if (targetCol) {
			targetCol.bodyEl.classList.add("fv-kanban-drop-hover");

			// Move placeholder to nearest position in target column
			const children = Array.from(targetCol.bodyEl.querySelectorAll(".fv-kanban-card:not(.fv-kanban-dragging)"));
			let insertBefore = null;

			for (const child of children) {
				const childRect = child.getBoundingClientRect();
				if (cardCenterY < childRect.top + childRect.height / 2) {
					insertBefore = child;
					break;
				}
			}

			this._removePlaceholder();
			this._placeholder = document.createElement("div");
			this._placeholder.className = "fv-kanban-placeholder";
			this._placeholder.style.height = cardEl.offsetHeight + "px";

			if (insertBefore) {
				targetCol.bodyEl.insertBefore(this._placeholder, insertBefore);
			} else {
				targetCol.bodyEl.appendChild(this._placeholder);
			}

			this._currentDropTarget = { col: targetCol, before: insertBefore };
		}
	}

	async _handleDrop(cardEl, card) {
		if (!this._currentDropTarget) {
			// Snap back
			this._animateSnapBack(cardEl);
			this._removePlaceholder();
			return;
		}

		const { col: targetCol, before: insertBefore } = this._currentDropTarget;
		const fromColumn = card[this.opts.fieldname || "_column"];
		const toColumn = targetCol.def.value;

		// Check WIP limit
		if (
			targetCol.def.wipLimit &&
			targetCol.cards.length >= targetCol.def.wipLimit &&
			fromColumn !== toColumn
		) {
			this._animateSnapBack(cardEl);
			this._removePlaceholder();
			frappe.show_alert(
				{
					message: __("WIP limit reached for {0}", [
						targetCol.def.label || toColumn,
					]),
					indicator: "orange",
				},
				5
			);
			return;
		}

		// Animate card to placeholder position
		const placeholderRect = this._placeholder?.getBoundingClientRect();

		if (this._gsap && placeholderRect) {
			await new Promise((resolve) => {
				this._gsap.to(cardEl, {
					x: 0,
					y: 0,
					duration: 0.25,
					ease: "power2.out",
					onComplete: resolve,
				});
			});
		}

		// Reset transform
		if (this._gsap) {
			this._gsap.set(cardEl, { x: 0, y: 0, zIndex: "" });
		} else {
			cardEl.style.transform = "";
			cardEl.style.zIndex = "";
		}

		// Move card in DOM
		if (insertBefore) {
			targetCol.bodyEl.insertBefore(cardEl, insertBefore);
		} else {
			targetCol.bodyEl.appendChild(cardEl);
		}
		this._removePlaceholder();

		// Update internal state
		const oldCol = this.columns.get(fromColumn);
		if (oldCol && fromColumn !== toColumn) {
			oldCol.cards = oldCol.cards.filter((c) => c.name !== card.name);
			this._updateColumnCount(fromColumn);
		}
		card[this.opts.fieldname || "_column"] = toColumn;
		if (!targetCol.cards.find((c) => c.name === card.name)) {
			targetCol.cards.push(card);
		}
		this._updateColumnCount(toColumn);

		this._currentDropTarget = null;

		// Animate settle
		if (this._gsap) {
			this._gsap.fromTo(
				cardEl,
				{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" },
				{
					scale: 1,
					boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
					duration: 0.3,
					ease: "power2.out",
				}
			);
		}

		// Callback
		if (fromColumn !== toColumn && this.opts.onCardMove) {
			try {
				await this.opts.onCardMove(card, fromColumn, toColumn);
			} catch (err) {
				// Revert on error
				console.error("Card move failed:", err);
				frappe.show_alert({ message: __("Failed to move card"), indicator: "red" });
				this._moveCardToColumn(card, cardEl, fromColumn);
			}
		}
	}

	_animateSnapBack(cardEl) {
		if (this._gsap) {
			this._gsap.to(cardEl, {
				x: 0,
				y: 0,
				duration: 0.4,
				ease: "elastic.out(1, 0.5)",
				onComplete: () => {
					this._gsap.set(cardEl, { clearProps: "all" });
				},
			});
		} else {
			cardEl.style.transform = "";
		}
	}

	// ── Data Fetching ────────────────────────────────────────────
	async _fetchCards() {
		try {
			const fields = [
				"name",
				this.opts.fieldname,
				...this.opts.cardFields,
				...(this.opts.titleField ? [this.opts.titleField] : ["subject", "title"]),
				...(this.opts.swimlaneField ? [this.opts.swimlaneField] : []),
				"_comments",
				"_assign",
				"modified",
			].filter((f, i, arr) => arr.indexOf(f) === i); // unique

			const data = await frappe.xcall(
				"frappe_visual.api.get_kanban_data",
				{
					doctype: this.opts.doctype,
					fieldname: this.opts.fieldname,
					fields: fields,
					filters: this.opts.filters || {},
					order_by: this.opts.orderBy,
				}
			);

			this._populateCards(data.cards || data);
		} catch (err) {
			console.error("KanbanBoard: Failed to fetch cards", err);
			this._showEmptyState();
		}
	}

	_populateCards(cards) {
		// Clear existing
		this.columns.forEach((colData) => {
			colData.bodyEl.innerHTML = "";
			colData.cards = [];
		});
		this._cards.clear();

		// Group by swimlane if configured
		if (this.opts.swimlaneField) {
			this._populateWithSwimlanes(cards);
			return;
		}

		// Simple column population
		cards.forEach((card) => {
			const colValue = card[this.opts.fieldname] || card._column;
			const colData = this.columns.get(colValue);

			if (!colData) return; // Skip cards with unknown status

			const cardEl = this._buildCard(card);
			colData.bodyEl.appendChild(cardEl);
			colData.cards.push(card);
			this._cards.set(card.name, { data: card, el: cardEl });
		});

		// Update counts
		this.columns.forEach((_, key) => this._updateColumnCount(key));

		// Setup HTML5 drop targets (fallback)
		if (!this._Draggable) {
			this._setupFallbackDropTargets();
		}
	}

	_populateWithSwimlanes(cards) {
		// Group cards by swimlane value
		const lanes = new Map();
		cards.forEach((card) => {
			const laneValue = card[this.opts.swimlaneField] || "__none__";
			if (!lanes.has(laneValue)) lanes.set(laneValue, []);
			lanes.get(laneValue).push(card);
		});

		// Create swimlane headers and sub-rows
		this.boardEl.classList.add("fv-kanban-swimlanes");

		lanes.forEach((laneCards, laneValue) => {
			const laneDef = this.opts.swimlanes?.[laneValue] || {};
			const laneLabel = laneDef.label || laneValue;
			const laneColor = laneDef.color || ColorSystem.autoColor(laneValue).border;

			// Swimlane header (spans all columns)
			const laneHeader = document.createElement("div");
			laneHeader.className = "fv-kanban-swimlane-header";
			laneHeader.style.setProperty("--fv-swimlane-color", laneColor);
			laneHeader.innerHTML = `
				<span class="fv-kanban-swimlane-label">${laneLabel}</span>
				<span class="fv-kanban-swimlane-count">${laneCards.length}</span>
			`;
			this.boardEl.appendChild(laneHeader);

			// Swimlane row of columns
			const laneRow = document.createElement("div");
			laneRow.className = "fv-kanban-swimlane-row";
			this.boardEl.appendChild(laneRow);

			this.opts.columns.forEach((colDef) => {
				const laneColBody = document.createElement("div");
				laneColBody.className = "fv-kanban-col-body fv-kanban-swimlane-cell";
				laneColBody.dataset.column = colDef.value;
				laneColBody.dataset.swimlane = laneValue;
				laneRow.appendChild(laneColBody);

				laneCards
					.filter((c) => (c[this.opts.fieldname] || c._column) === colDef.value)
					.forEach((card) => {
						const cardEl = this._buildCard(card);
						laneColBody.appendChild(cardEl);

						const colData = this.columns.get(colDef.value);
						if (colData) {
							colData.cards.push(card);
						}
						this._cards.set(card.name, { data: card, el: cardEl });
					});
			});
		});

		this.columns.forEach((_, key) => this._updateColumnCount(key));
	}

	_setupFallbackDropTargets() {
		this.columns.forEach((colData) => {
			const body = colData.bodyEl;
			body.addEventListener("dragover", (e) => {
				e.preventDefault();
				body.classList.add("fv-kanban-drop-hover");
			});
			body.addEventListener("dragleave", () => {
				body.classList.remove("fv-kanban-drop-hover");
			});
			body.addEventListener("drop", (e) => {
				e.preventDefault();
				body.classList.remove("fv-kanban-drop-hover");
				const cardName = e.dataTransfer.getData("text/plain");
				const cardInfo = this._cards.get(cardName);
				if (cardInfo) {
					body.appendChild(cardInfo.el);
					this._handleFallbackDrop(cardInfo, colData.def.value);
				}
			});
		});
	}

	async _handleFallbackDrop(cardInfo, toColumn) {
		const card = cardInfo.data;
		const fromColumn = card[this.opts.fieldname || "_column"];
		card[this.opts.fieldname || "_column"] = toColumn;

		this.columns.forEach((_, key) => this._updateColumnCount(key));

		if (fromColumn !== toColumn && this.opts.onCardMove) {
			try {
				await this.opts.onCardMove(card, fromColumn, toColumn);
			} catch (err) {
				console.error("Card move failed:", err);
			}
		}
	}

	// ── Column Helpers ───────────────────────────────────────────
	_updateColumnCount(colValue) {
		const colData = this.columns.get(colValue);
		if (!colData) return;

		const count = colData.bodyEl.querySelectorAll(".fv-kanban-card").length;
		const countEl = colData.el.querySelector(".fv-kanban-col-count");
		if (countEl) {
			countEl.textContent = count;
		}

		// WIP limit warning
		if (colData.def.wipLimit) {
			colData.el.classList.toggle(
				"fv-kanban-wip-exceeded",
				count > colData.def.wipLimit
			);
			colData.el.classList.toggle(
				"fv-kanban-wip-at-limit",
				count === colData.def.wipLimit
			);
		}
	}

	// ── Add Card ─────────────────────────────────────────────────
	_onAddCard(colDef) {
		if (this.opts.doctype) {
			frappe.new_doc(this.opts.doctype, {
				[this.opts.fieldname]: colDef.value,
			});
		}
	}

	// ── Animations ───────────────────────────────────────────────
	_animateEntrance() {
		if (!this._gsap) return;

		const cards = this.container.querySelectorAll(".fv-kanban-card");
		this._gsap.from(cards, {
			opacity: 0,
			y: 20,
			scale: 0.95,
			duration: 0.4,
			stagger: 0.04,
			ease: "power3.out",
		});
	}

	// ── Empty State ──────────────────────────────────────────────
	_showEmptyState() {
		this.columns.forEach((colData) => {
			if (colData.cards.length === 0) {
				colData.bodyEl.innerHTML = `
					<div class="fv-kanban-empty">
						<span style="font-size:24px;opacity:0.3">📋</span>
						<span style="font-size:12px;color:var(--fv-text-tertiary)">${__("No cards")}</span>
					</div>
				`;
			}
		});
	}

	// ── Public API ───────────────────────────────────────────────

	/**
	 * Add a card to a specific column.
	 * @param {Object} card - Card data with at minimum { name }
	 * @param {string} [column] - Column value (or uses fieldname from card)
	 */
	addCard(card, column) {
		const colValue = column || card[this.opts.fieldname] || card._column;
		const colData = this.columns.get(colValue);
		if (!colData) return;

		const cardEl = this._buildCard(card);
		colData.bodyEl.appendChild(cardEl);
		colData.cards.push(card);
		this._cards.set(card.name, { data: card, el: cardEl });
		this._updateColumnCount(colValue);

		// Animate entrance
		if (this._gsap) {
			this._gsap.from(cardEl, {
				opacity: 0,
				y: -15,
				scale: 0.9,
				duration: 0.35,
				ease: "back.out(1.5)",
			});
		}
	}

	/**
	 * Remove a card by name.
	 * @param {string} cardName
	 */
	removeCard(cardName) {
		const cardInfo = this._cards.get(cardName);
		if (!cardInfo) return;

		const remove = () => {
			cardInfo.el.remove();
			this._cards.delete(cardName);
			this.columns.forEach((colData, key) => {
				colData.cards = colData.cards.filter((c) => c.name !== cardName);
				this._updateColumnCount(key);
			});
		};

		if (this._gsap) {
			this._gsap.to(cardInfo.el, {
				opacity: 0,
				scale: 0.8,
				y: -10,
				duration: 0.3,
				ease: "power2.in",
				onComplete: remove,
			});
		} else {
			remove();
		}
	}

	/**
	 * Update a card's data and re-render.
	 * @param {string} cardName
	 * @param {Object} updates - Fields to update
	 */
	updateCard(cardName, updates) {
		const cardInfo = this._cards.get(cardName);
		if (!cardInfo) return;

		Object.assign(cardInfo.data, updates);
		const newEl = this._buildCard(cardInfo.data);
		cardInfo.el.replaceWith(newEl);
		cardInfo.el = newEl;

		// If column changed, move it
		const newCol = updates[this.opts.fieldname];
		if (newCol) {
			this._moveCardToColumn(cardInfo.data, newEl, newCol);
		}
	}

	_moveCardToColumn(card, cardEl, colValue) {
		const colData = this.columns.get(colValue);
		if (!colData) return;

		colData.bodyEl.appendChild(cardEl);
		colData.cards.push(card);
		card[this.opts.fieldname || "_column"] = colValue;

		this.columns.forEach((_, key) => this._updateColumnCount(key));
	}

	/**
	 * Refresh all cards from server.
	 */
	async refresh() {
		if (this.opts.doctype && this.opts.fieldname) {
			await this._fetchCards();
			if (this.opts.animate) {
				this._animateEntrance();
			}
		}
	}

	/**
	 * Get all cards in a specific column.
	 * @param {string} colValue
	 * @returns {Array}
	 */
	getColumnCards(colValue) {
		const colData = this.columns.get(colValue);
		return colData ? [...colData.cards] : [];
	}

	/**
	 * Get card data by name.
	 * @param {string} cardName
	 * @returns {Object|null}
	 */
	getCard(cardName) {
		const info = this._cards.get(cardName);
		return info ? info.data : null;
	}

	/**
	 * Filter cards by a predicate.
	 * @param {Function} predicate - (card) => boolean
	 */
	filterCards(predicate) {
		this._cards.forEach((cardInfo) => {
			const visible = predicate(cardInfo.data);
			cardInfo.el.style.display = visible ? "" : "none";
		});
	}

	/**
	 * Clear all filters.
	 */
	clearFilter() {
		this._cards.forEach((cardInfo) => {
			cardInfo.el.style.display = "";
		});
	}

	/**
	 * Search cards by text.
	 * @param {string} query
	 */
	search(query) {
		const q = (query || "").toLowerCase().trim();
		if (!q) {
			this.clearFilter();
			return;
		}
		this.filterCards((card) => {
			return Object.values(card).some(
				(v) => typeof v === "string" && v.toLowerCase().includes(q)
			);
		});
	}

	/**
	 * Destroy the board and clean up.
	 */
	destroy() {
		this._dragInstances.forEach((d) => d.kill?.());
		this._dragInstances = [];
		this._removePlaceholder();
		this.container.innerHTML = "";
		this.container.classList.remove("fv-kanban", "fv-kanban-compact");
		this.columns.clear();
		this._cards.clear();
	}
}
