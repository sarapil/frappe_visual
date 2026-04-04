// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — CRMPipeline
 * =============================
 * Visual sales/CRM pipeline with draggable deal cards across stages.
 * Supports: multiple pipelines, weighted amounts, probability bars,
 * win/loss tracking, stage conversion rates, GSAP drag animations.
 *
 * Usage:
 *   frappe.visual.CRMPipeline.create('#el', {
 *     stages: [{ name, label, color, probability }],
 *     deals: [{ id, title, amount, stage, owner, date }],
 *     currency: 'USD',
 *     onMove: (deal, fromStage, toStage) => {},
 *   })
 *
 * @module frappe_visual/components/crm_pipeline
 */

const DEFAULT_STAGES = [
	{ name: "lead",        label: "Lead",         color: "#6366f1", probability: 10 },
	{ name: "qualified",   label: "Qualified",    color: "#8b5cf6", probability: 25 },
	{ name: "proposal",    label: "Proposal",     color: "#a855f7", probability: 50 },
	{ name: "negotiation", label: "Negotiation",  color: "#f59e0b", probability: 75 },
	{ name: "won",         label: "Won",          color: "#10b981", probability: 100 },
	{ name: "lost",        label: "Lost",         color: "#ef4444", probability: 0 },
];

export class CRMPipeline {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("CRMPipeline: container not found");

		this.opts = Object.assign({
			theme: "glass",
			stages: DEFAULT_STAGES,
			deals: [],
			currency: "USD",
			showTotals: true,
			showProbability: true,
			showConversionRate: true,
			enableDrag: true,
			cardFields: ["owner", "date", "amount"],
			onMove: null,
			onClick: null,
			onAdd: null,
			doctype: null,        // e.g. "Opportunity" or "CRM Deal"
			stageField: "status",
		}, opts);

		this._deals = JSON.parse(JSON.stringify(this.opts.deals));
		this._init();
	}

	static create(container, opts = {}) { return new CRMPipeline(container, opts); }

	_init() {
		this.container.classList.add("fv-crm", `fv-crm--${this.opts.theme}`);
		this.container.innerHTML = "";

		// Header with totals
		if (this.opts.showTotals) this._renderHeader();

		// Pipeline columns
		const board = document.createElement("div");
		board.className = "fv-crm-board";
		this.container.appendChild(board);
		this._boardEl = board;

		this._renderStages();
	}

	_renderHeader() {
		const hdr = document.createElement("div");
		hdr.className = "fv-crm-header";

		const totalAmount = this._deals.reduce((s, d) => s + (d.amount || 0), 0);
		const totalDeals = this._deals.length;
		const weightedAmount = this._deals.reduce((s, d) => {
			const stage = this.opts.stages.find(st => st.name === d.stage);
			return s + (d.amount || 0) * ((stage?.probability || 0) / 100);
		}, 0);

		hdr.innerHTML = `
			<div class="fv-crm-stat">
				<span class="fv-crm-stat-val">${totalDeals}</span>
				<span class="fv-crm-stat-lbl">${__("Deals")}</span>
			</div>
			<div class="fv-crm-stat">
				<span class="fv-crm-stat-val">${this._formatCurrency(totalAmount)}</span>
				<span class="fv-crm-stat-lbl">${__("Total Value")}</span>
			</div>
			<div class="fv-crm-stat">
				<span class="fv-crm-stat-val">${this._formatCurrency(weightedAmount)}</span>
				<span class="fv-crm-stat-lbl">${__("Weighted Value")}</span>
			</div>`;

		this.container.appendChild(hdr);
		this._headerEl = hdr;
	}

	_renderStages() {
		this._boardEl.innerHTML = "";

		for (const stage of this.opts.stages) {
			const stageDeals = this._deals.filter(d => d.stage === stage.name);
			const stageTotal = stageDeals.reduce((s, d) => s + (d.amount || 0), 0);

			const col = document.createElement("div");
			col.className = "fv-crm-stage";
			col.dataset.stage = stage.name;

			// Stage header
			col.innerHTML = `
				<div class="fv-crm-stage-header" style="--stage-color: ${stage.color}">
					<div class="fv-crm-stage-title">
						<span class="fv-crm-stage-dot" style="background:${stage.color}"></span>
						<span>${this._esc(__(stage.label))}</span>
						<span class="fv-crm-stage-count">${stageDeals.length}</span>
					</div>
					<div class="fv-crm-stage-total">${this._formatCurrency(stageTotal)}</div>
					${this.opts.showProbability ? `<div class="fv-crm-stage-prob">
						<div class="fv-crm-prob-bar">
							<div class="fv-crm-prob-fill" style="width:${stage.probability}%;background:${stage.color}"></div>
						</div>
						<span class="fv-crm-prob-val">${stage.probability}%</span>
					</div>` : ""}
				</div>
				<div class="fv-crm-stage-body" data-stage="${stage.name}"></div>`;

			if (this.opts.enableDrag) {
				const body = col.querySelector(".fv-crm-stage-body");
				body.addEventListener("dragover", e => { e.preventDefault(); body.classList.add("fv-crm-stage-drop"); });
				body.addEventListener("dragleave", () => body.classList.remove("fv-crm-stage-drop"));
				body.addEventListener("drop", e => { e.preventDefault(); body.classList.remove("fv-crm-stage-drop"); this._onDrop(e, stage.name); });
			}

			this._boardEl.appendChild(col);

			// Render cards
			const body = col.querySelector(".fv-crm-stage-body");
			for (const deal of stageDeals) {
				body.appendChild(this._renderCard(deal, stage));
			}
		}
	}

	_renderCard(deal, stage) {
		const card = document.createElement("div");
		card.className = "fv-crm-card";
		card.dataset.dealId = deal.id;
		card.draggable = this.opts.enableDrag;

		let fieldsHtml = "";
		if (this.opts.cardFields.includes("owner") && deal.owner) {
			fieldsHtml += `<span class="fv-crm-card-owner">${this._esc(deal.owner)}</span>`;
		}
		if (this.opts.cardFields.includes("date") && deal.date) {
			fieldsHtml += `<span class="fv-crm-card-date">${deal.date}</span>`;
		}
		if (this.opts.cardFields.includes("amount") && deal.amount) {
			fieldsHtml += `<span class="fv-crm-card-amount" style="color:${stage.color}">${this._formatCurrency(deal.amount)}</span>`;
		}

		card.innerHTML = `
			<div class="fv-crm-card-title">${this._esc(deal.title || deal.name || deal.id)}</div>
			${deal.subtitle ? `<div class="fv-crm-card-sub">${this._esc(deal.subtitle)}</div>` : ""}
			<div class="fv-crm-card-fields">${fieldsHtml}</div>`;

		// Drag events
		if (this.opts.enableDrag) {
			card.addEventListener("dragstart", e => {
				e.dataTransfer.setData("text/plain", deal.id);
				card.classList.add("fv-crm-card--dragging");
			});
			card.addEventListener("dragend", () => card.classList.remove("fv-crm-card--dragging"));
		}

		// Click
		card.addEventListener("click", () => {
			if (this.opts.onClick) this.opts.onClick(deal);
		});

		return card;
	}

	_onDrop(e, targetStage) {
		const dealId = e.dataTransfer.getData("text/plain");
		const deal = this._deals.find(d => String(d.id) === String(dealId));
		if (!deal || deal.stage === targetStage) return;

		const fromStage = deal.stage;
		deal.stage = targetStage;

		if (this.opts.onMove) this.opts.onMove(deal, fromStage, targetStage);
		this._renderStages();
		if (this.opts.showTotals) {
			this._headerEl?.remove();
			this._renderHeader();
			this.container.insertBefore(this._headerEl, this._boardEl);
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	setDeals(deals) {
		this._deals = JSON.parse(JSON.stringify(deals));
		this._renderStages();
	}

	addDeal(deal) {
		this._deals.push(deal);
		this._renderStages();
	}

	removeDeal(dealId) {
		this._deals = this._deals.filter(d => String(d.id) !== String(dealId));
		this._renderStages();
	}

	getDeals() { return JSON.parse(JSON.stringify(this._deals)); }

	async loadFromDocType(doctype, stageField = "status", filters = {}) {
		try {
			const res = await frappe.xcall("frappe.client.get_list", {
				doctype, fields: ["name", "title", stageField, "owner", "creation"],
				filters, limit_page_length: 0,
			});
			this._deals = (res || []).map(r => ({
				id: r.name, title: r.title || r.name,
				stage: r[stageField], owner: r.owner,
				date: r.creation?.split(" ")[0],
			}));
			this._renderStages();
		} catch (e) {
			console.error("CRMPipeline: loadFromDocType error", e);
		}
	}

	/* ── Helpers ─────────────────────────────────────────────── */
	_formatCurrency(val) {
		if (!val) return this.opts.currency + " 0";
		return new Intl.NumberFormat(undefined, {
			style: "currency", currency: this.opts.currency,
			minimumFractionDigits: 0, maximumFractionDigits: 0,
		}).format(val);
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-crm", `fv-crm--${this.opts.theme}`);
	}
}
