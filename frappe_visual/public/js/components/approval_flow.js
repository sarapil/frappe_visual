/**
 * ApprovalFlow — Visual approval workflow with step indicators
 *
 * Renders a horizontal or vertical approval pipeline showing current
 * status, approvers, timestamps, and action buttons. Integrates with
 * Frappe workflow states for real documents.
 *
 * frappe.visual.ApprovalFlow.create({
 *   container: "#approval-section", doctype: "Purchase Order", docname: "PO-001"
 * })
 */
export class ApprovalFlow {
	static create(opts = {}) { return new ApprovalFlow(opts); }

	static STATUS = {
		pending:  { icon: "⏳", color: "#f59e0b", label: "Pending" },
		approved: { icon: "✅", color: "#22c55e", label: "Approved" },
		rejected: { icon: "❌", color: "#ef4444", label: "Rejected" },
		skipped:  { icon: "⏭️", color: "#94a3b8", label: "Skipped" },
		current:  { icon: "👆", color: "#6366f1", label: "Awaiting Action" },
	};

	constructor(opts) {
		this.opts = Object.assign({
			container: null, doctype: "", docname: "",
			orientation: "horizontal", steps: [], showActions: true,
			onApprove: null, onReject: null, onComment: null
		}, opts);
		this._steps = this.opts.steps;
		this._build();
		if (this.opts.doctype && this.opts.docname) this._loadWorkflow();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Set steps programmatically */
	setSteps(steps) {
		this._steps = steps;
		this._render();
	}

	/** Update a specific step's status */
	updateStep(index, { status, user, timestamp, comment } = {}) {
		const step = this._steps[index];
		if (!step) return;
		if (status) step.status = status;
		if (user) step.user = user;
		if (timestamp) step.timestamp = timestamp;
		if (comment) step.comment = comment;
		this._render();
	}

	/** Get the current step index */
	get currentStepIndex() {
		return this._steps.findIndex(s => s.status === "current" || s.status === "pending");
	}

	/** Get overall status */
	get overallStatus() {
		if (this._steps.every(s => s.status === "approved")) return "approved";
		if (this._steps.some(s => s.status === "rejected")) return "rejected";
		return "pending";
	}

	destroy() { this._el?.remove(); }

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;
		this._el = document.createElement("div");
		this._el.className = `fv-approval-flow fv-af--${this.opts.orientation}`;
		this._el.setAttribute("role", "list");
		this._el.setAttribute("aria-label", __("Approval workflow"));
		parent.appendChild(this._el);
		this._render();
	}

	async _loadWorkflow() {
		if (typeof frappe === "undefined" || !frappe.xcall) return;
		try {
			// Load workflow transitions for this doctype
			const doc = await frappe.xcall("frappe.client.get", {
				doctype: this.opts.doctype, name: this.opts.docname
			});
			if (!doc) return;
			const workflow = await frappe.xcall("frappe.client.get_list", {
				doctype: "Workflow Transition",
				filters: { parent: doc.workflow || "" },
				fields: ["state", "action", "next_state", "allowed"],
				order_by: "idx"
			});
			if (workflow && workflow.length) {
				const states = new Set();
				workflow.forEach(t => { states.add(t.state); states.add(t.next_state); });
				this._steps = Array.from(states).map(state => ({
					label: state,
					status: state === doc.workflow_state ? "current" : "pending",
					role: workflow.find(t => t.next_state === state)?.allowed || ""
				}));
				this._render();
			}
		} catch { /* silently fail */ }
	}

	_render() {
		if (!this._el) return;
		const steps = this._steps;
		if (!steps.length) { this._el.innerHTML = `<p class="fv-af-empty">${__("No workflow defined")}</p>`; return; }

		let html = '<div class="fv-af-steps">';
		steps.forEach((step, i) => {
			const st = ApprovalFlow.STATUS[step.status] || ApprovalFlow.STATUS.pending;
			const isLast = i === steps.length - 1;
			html += `<div class="fv-af-step fv-af-step--${step.status}" role="listitem"
				aria-label="${this._esc(step.label)} - ${__(st.label)}">
				<div class="fv-af-node">
					<div class="fv-af-circle" style="background:${st.color}">${st.icon}</div>
					${!isLast ? `<div class="fv-af-connector ${step.status === "approved" ? "fv-af-connector--done" : ""}"></div>` : ""}
				</div>
				<div class="fv-af-info">
					<div class="fv-af-label">${this._esc(step.label)}</div>
					${step.role ? `<div class="fv-af-role">${this._esc(step.role)}</div>` : ""}
					${step.user ? `<div class="fv-af-user">${this._esc(step.user.split("@")[0])}</div>` : ""}
					${step.timestamp ? `<div class="fv-af-time">${this._timeAgo(step.timestamp)}</div>` : ""}
					${step.comment ? `<div class="fv-af-comment">"${this._esc(step.comment)}"</div>` : ""}
				</div>
			</div>`;
		});
		html += "</div>";

		// Action buttons for current step
		const currentIdx = this.currentStepIndex;
		if (this.opts.showActions && currentIdx >= 0 && steps[currentIdx].status === "current") {
			html += `<div class="fv-af-actions">
				<button class="fv-af-approve">${__("Approve")}</button>
				<button class="fv-af-reject">${__("Reject")}</button>
				<input class="fv-af-comment-input" placeholder="${__("Add comment (optional)")}">
			</div>`;
		}

		this._el.innerHTML = html;

		// Bind actions
		this._el.querySelector(".fv-af-approve")?.addEventListener("click", () => {
			const comment = this._el.querySelector(".fv-af-comment-input")?.value || "";
			this.updateStep(currentIdx, { status: "approved", user: frappe.session?.user, timestamp: Date.now(), comment });
			if (currentIdx + 1 < steps.length) this.updateStep(currentIdx + 1, { status: "current" });
			this.opts.onApprove?.(currentIdx, comment);
		});
		this._el.querySelector(".fv-af-reject")?.addEventListener("click", () => {
			const comment = this._el.querySelector(".fv-af-comment-input")?.value || "";
			this.updateStep(currentIdx, { status: "rejected", user: frappe.session?.user, timestamp: Date.now(), comment });
			this.opts.onReject?.(currentIdx, comment);
		});
	}

	_timeAgo(ts) {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return __("just now");
		if (s < 3600) return __("{0}m", [Math.floor(s / 60)]);
		if (s < 86400) return __("{0}h", [Math.floor(s / 3600)]);
		return __("{0}d", [Math.floor(s / 86400)]);
	}
	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
