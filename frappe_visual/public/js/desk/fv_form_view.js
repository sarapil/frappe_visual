// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVFormView — Visual Form Renderer
 * ====================================
 * Enhances Frappe forms with a visual-first layout:
 * - KPI ribbon at top with computed metrics
 * - Visual field groups with glassmorphism cards
 * - Relationship graph panel
 * - Timeline / activity feed integration
 * - Visual workflow indicator
 * - Quick actions floating panel
 *
 * This wraps the existing Frappe form and injects visual layers.
 * It does NOT replace the form engine — it enhances the display.
 *
 * Usage:
 *   FVFormView.enhance(frm, {
 *     kpis: [{ label: "Total", fieldname: "grand_total", format: "Currency" }],
 *     showRelationships: true,
 *     showTimeline: true,
 *   });
 */

export class FVFormView {
	static enhance(frm, opts = {}) {
		return new FVFormView(frm, opts);
	}

	constructor(frm, opts = {}) {
		this.frm = frm;
		this.opts = Object.assign({
			kpis: [],
			showRelationships: false,
			showTimeline: true,
			showWorkflow: true,
			quickActions: [],
			primaryColor: null,
			cssClass: "",
		}, opts);

		this._kpiBar = null;
		this._sidePanel = null;
		this._workflowBar = null;
		this._init();
	}

	_init() {
		this._injectKPIBar();
		this._injectWorkflowVisual();
		this._enhanceFieldGroups();
		if (this.opts.quickActions.length) {
			this._injectQuickActions();
		}
	}

	/** KPI ribbon below the form title */
	_injectKPIBar() {
		if (!this.opts.kpis.length) return;

		const existing = this.frm.page.wrapper.find(".fv-form-kpi-bar");
		if (existing.length) existing.remove();

		const bar = document.createElement("div");
		bar.className = "fv-form-kpi-bar fv-fx-glass fv-fx-page-enter";
		bar.innerHTML = `<div class="fv-form-kpi-bar__inner">
			${this.opts.kpis.map(kpi => this._renderKPICard(kpi)).join("")}
		</div>`;

		this._kpiBar = bar;

		const formPage = this.frm.page.wrapper.find(".page-head");
		if (formPage.length) {
			formPage.after(bar);
		}
	}

	_renderKPICard(kpi) {
		let value = this.frm.doc[kpi.fieldname];
		if (kpi.compute && typeof kpi.compute === "function") {
			value = kpi.compute(this.frm.doc);
		}

		let displayValue = value;
		if (kpi.format === "Currency") {
			displayValue = format_currency(value || 0, this.frm.doc.currency);
		} else if (kpi.format === "Int") {
			displayValue = cint(value || 0).toLocaleString();
		} else if (kpi.format === "Percent") {
			displayValue = `${flt(value || 0, 1)}%`;
		} else if (kpi.format === "Date" && value) {
			displayValue = frappe.datetime.str_to_user(value);
		}

		const statusClass = kpi.statusFn ? kpi.statusFn(value) : "";

		return `<div class="fv-form-kpi-card fv-fx-hover-lift ${statusClass}">
			${kpi.icon ? `<div class="fv-form-kpi-card__icon"><i class="ti ti-${kpi.icon}"></i></div>` : ""}
			<div class="fv-form-kpi-card__body">
				<div class="fv-form-kpi-card__value">${frappe.utils.escape_html(String(displayValue ?? "—"))}</div>
				<div class="fv-form-kpi-card__label">${frappe.utils.escape_html(kpi.label)}</div>
			</div>
		</div>`;
	}

	/** Visual workflow status indicator */
	_injectWorkflowVisual() {
		if (!this.opts.showWorkflow || !this.frm.doc.workflow_state) return;

		const workflow = this.frm.states?.get_state?.();
		if (!workflow) return;

		const existing = this.frm.page.wrapper.find(".fv-workflow-visual");
		if (existing.length) existing.remove();

		const el = document.createElement("div");
		el.className = "fv-workflow-visual fv-fx-glass";

		const states = this.frm.workflow?.transitions || [];
		const currentState = this.frm.doc.workflow_state;

		el.innerHTML = `<div class="fv-workflow-visual__steps">
			${states.map(s => `
				<div class="fv-workflow-visual__step ${s.state === currentState ? "fv-workflow-visual__step--active" : ""}">
					<div class="fv-workflow-visual__dot"></div>
					<span class="fv-workflow-visual__label">${frappe.utils.escape_html(__(s.state))}</span>
				</div>
			`).join('<div class="fv-workflow-visual__connector"></div>')}
		</div>`;

		const kpiBar = this.frm.page.wrapper.find(".fv-form-kpi-bar");
		if (kpiBar.length) {
			kpiBar.after(el);
		}
	}

	/** Add visual card styling to form field groups */
	_enhanceFieldGroups() {
		const sections = this.frm.page.wrapper.find(".form-section");
		sections.each((i, section) => {
			if (!section.classList.contains("fv-enhanced-section")) {
				section.classList.add("fv-enhanced-section", "fv-fx-glass");
			}
		});
	}

	/** Floating quick action buttons */
	_injectQuickActions() {
		const existing = this.frm.page.wrapper.find(".fv-form-quick-actions");
		if (existing.length) existing.remove();

		const panel = document.createElement("div");
		panel.className = "fv-form-quick-actions fv-fx-glass fv-fx-page-enter";

		panel.innerHTML = this.opts.quickActions.map(action =>
			`<button class="fv-form-quick-action fv-fx-hover-lift"
				data-action="${frappe.utils.escape_html(action.action || "")}"
				title="${frappe.utils.escape_html(action.label)}">
				<i class="ti ti-${action.icon || "bolt"}"></i>
				<span>${frappe.utils.escape_html(action.label)}</span>
			</button>`
		).join("");

		panel.querySelectorAll("button").forEach((btn, i) => {
			btn.addEventListener("click", () => {
				const action = this.opts.quickActions[i];
				if (action?.onClick) action.onClick(this.frm);
			});
		});

		this.frm.page.wrapper.append(panel);
		this._sidePanel = panel;
	}

	/** Refresh KPIs (call from frm.refresh) */
	refresh() {
		if (this._kpiBar) {
			this._kpiBar.querySelector(".fv-form-kpi-bar__inner").innerHTML =
				this.opts.kpis.map(kpi => this._renderKPICard(kpi)).join("");
		}
	}

	destroy() {
		this._kpiBar?.remove();
		this._sidePanel?.remove();
		this._workflowBar?.remove();
		this.frm.page.wrapper.find(".fv-enhanced-section").removeClass("fv-enhanced-section fv-fx-glass");
	}
}
