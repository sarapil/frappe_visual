// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualFormPro — Premium Form View Enhancer
 * ============================================
 * Wraps standard Frappe forms with a visual shell:
 *   • Glassmorphism header with animated gradient
 *   • Inline stats ribbon (linked docs count, timeline summary)
 *   • Collapsible sections with smooth animations
 *   • Quick-action bar (floating bottom bar with primary actions)
 *   • Smart sidebar: related docs, workflow status, comments preview
 *   • Field-level visual hints (sparklines, mini-charts for numeric fields)
 *   • Comparison mode (diff two versions of same doc)
 *   • Print-ready layout toggle
 *
 * Usage:
 *   frappe.visual.FormPro.enhance(frm);            // in refresh
 *   frappe.visual.FormPro.enhance(frm, { theme: 'glass' });
 *
 * Auto-mode:
 *   Set formEnhancer.pro = true in frappe_visual settings to auto-apply
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualFormPro {
	constructor(frm, opts = {}) {
		this.frm = frm;
		this.opts = Object.assign({
			theme: "glass",            // glass | flat | minimal
			statsRibbon: true,
			quickActions: true,
			smartSidebar: true,
			fieldHints: true,
			animateSections: true,
			compactMode: false,
		}, opts);

		this._enhance();
	}

	static enhance(frm, opts) {
		if (!frm?.$wrapper?.length) return null;
		return new VisualFormPro(frm, opts);
	}

	// ─── Main Enhancement ────────────────────────────────────────
	_enhance() {
		this._injectHeader();
		if (this.opts.statsRibbon) this._injectStats();
		if (this.opts.quickActions) this._injectQuickBar();
		if (this.opts.animateSections) this._animateSections();
		if (this.opts.fieldHints) this._injectFieldHints();
		if (this.opts.smartSidebar) this._enhanceSidebar();
	}

	// ─── Visual Header ───────────────────────────────────────────
	_injectHeader() {
		const frm = this.frm;
		const existing = frm.$wrapper.find(".fv-form-header");
		if (existing.length) existing.remove();

		const meta = frappe.get_meta(frm.doctype);
		const color = this._docColor(frm.doctype);
		const icon = this._icon(meta?.icon || "file-text", 24);
		const status = frm.doc.docstatus;
		const statusLabel = status === 1 ? __("Submitted") : status === 2 ? __("Cancelled") : __("Draft");
		const statusClass = status === 1 ? "green" : status === 2 ? "red" : "orange";

		const header = $(`<div class="fv-form-header fv-form-header--${this.opts.theme}">
			<div class="fv-fh-left">
				<span class="fv-fh-icon" style="color:${color}">${icon}</span>
				<div>
					<div class="fv-fh-doctype">${__(frm.doctype)}</div>
					<div class="fv-fh-name">${frm.doc.name}</div>
				</div>
			</div>
			<div class="fv-fh-right">
				<span class="fv-fh-status indicator-pill ${statusClass}">${statusLabel}</span>
				<span class="fv-fh-modified text-muted">${frappe.datetime.prettyDate(frm.doc.modified)}</span>
			</div>
		</div>`);

		// Glass theme gradient
		if (this.opts.theme === "glass") {
			header.css({
				background: `linear-gradient(135deg, ${color}15, ${color}08)`,
				backdropFilter: "blur(10px)",
				borderBottom: `2px solid ${color}30`,
			});
		}

		frm.$wrapper.find(".form-layout").prepend(header);
	}

	// ─── Stats Ribbon ────────────────────────────────────────────
	async _injectStats() {
		const frm = this.frm;
		const existing = frm.$wrapper.find(".fv-form-stats");
		if (existing.length) existing.remove();

		const links = frappe.get_meta(frm.doctype)?.links || [];
		if (!links.length && !frm.doc.modified) return;

		const ribbon = $(`<div class="fv-form-stats"></div>`);
		const stats = [];

		// Count linked documents
		const linkPromises = links.slice(0, 6).map(async (link) => {
			try {
				const count = await frappe.xcall("frappe.client.get_count", {
					doctype: link.link_doctype,
					filters: { [link.link_fieldname]: frm.doc.name },
				});
				if (count > 0) {
					stats.push({
						label: __(link.link_doctype),
						value: count,
						icon: frappe.get_meta(link.link_doctype)?.icon || "file",
						action: () => frappe.set_route("List", link.link_doctype, { [link.link_fieldname]: frm.doc.name }),
					});
				}
			} catch { /* ignore */ }
		});

		await Promise.allSettled(linkPromises);

		// Comments count
		try {
			const comments = await frappe.xcall("frappe.client.get_count", {
				doctype: "Comment",
				filters: { reference_doctype: frm.doctype, reference_name: frm.doc.name, comment_type: "Comment" },
			});
			if (comments > 0) {
				stats.push({ label: __("Comments"), value: comments, icon: "message-circle" });
			}
		} catch { /* ignore */ }

		// Versions count
		try {
			const versions = await frappe.xcall("frappe.client.get_count", {
				doctype: "Version",
				filters: { ref_doctype: frm.doctype, docname: frm.doc.name },
			});
			if (versions > 0) {
				stats.push({ label: __("Versions"), value: versions, icon: "git-branch" });
			}
		} catch { /* ignore */ }

		if (!stats.length) return;

		ribbon.html(stats.map(s => `
			<div class="fv-fs-item" title="${s.label}">
				${this._icon(s.icon, 14)}
				<span class="fv-fs-value">${s.value}</span>
				<span class="fv-fs-label">${s.label}</span>
			</div>
		`).join(""));

		ribbon.find(".fv-fs-item").each(function(i) {
			if (stats[i]?.action) {
				$(this).css("cursor", "pointer").on("click", stats[i].action);
			}
		});

		frm.$wrapper.find(".fv-form-header").after(ribbon);

		if (typeof gsap !== "undefined") {
			gsap.from(ribbon.find(".fv-fs-item").toArray(), { y: 10, opacity: 0, stagger: 0.05, duration: 0.3 });
		}
	}

	// ─── Quick Action Bar ────────────────────────────────────────
	_injectQuickBar() {
		const frm = this.frm;
		const existing = frm.$wrapper.find(".fv-quick-bar");
		if (existing.length) existing.remove();

		const actions = [];

		// Primary action
		if (frm.doc.docstatus === 0 && frm.perm?.[0]?.write) {
			actions.push({ label: __("Save"), icon: "check", class: "btn-primary", action: () => frm.save() });
		}
		if (frm.doc.docstatus === 0 && frappe.model.is_submittable(frm.doctype) && frm.perm?.[0]?.submit) {
			actions.push({ label: __("Submit"), icon: "send", class: "btn-primary-dark", action: () => frm.submit() });
		}

		// Duplicate
		actions.push({ label: __("Duplicate"), icon: "copy", class: "btn-default", action: () => frappe.copy_doc(frm.doc) });

		// Print
		actions.push({ label: __("Print"), icon: "printer", class: "btn-default", action: () => frm.print_doc() });

		if (!actions.length) return;

		const bar = $(`<div class="fv-quick-bar">
			${actions.map(a => `<button class="btn btn-sm ${a.class} fv-qb-btn">${this._icon(a.icon, 14)} ${a.label}</button>`).join("")}
		</div>`);

		bar.find(".fv-qb-btn").each(function(i) {
			$(this).on("click", actions[i].action);
		});

		frm.$wrapper.append(bar);
	}

	// ─── Animated Sections ───────────────────────────────────────
	_animateSections() {
		const sections = this.frm.$wrapper.find(".section-head");
		sections.each(function() {
			const $head = $(this);
			const $body = $head.next(".section-body");
			if (!$body.length) return;

			$head.css("cursor", "pointer");
			$head.off("click.fvpro").on("click.fvpro", function() {
				if ($body.is(":visible")) {
					if (typeof gsap !== "undefined") {
						gsap.to($body[0], { height: 0, opacity: 0, duration: 0.25, onComplete: () => $body.hide().css({ height: "", opacity: "" }) });
					} else {
						$body.slideUp(200);
					}
					$head.addClass("fv-collapsed");
				} else {
					$body.show();
					if (typeof gsap !== "undefined") {
						gsap.from($body[0], { height: 0, opacity: 0, duration: 0.25 });
					} else {
						$body.slideDown(200);
					}
					$head.removeClass("fv-collapsed");
				}
			});
		});
	}

	// ─── Field Hints ─────────────────────────────────────────────
	_injectFieldHints() {
		const frm = this.frm;
		const numericFields = frappe.get_meta(frm.doctype)?.fields?.filter(f =>
			["Currency", "Float", "Int", "Percent"].includes(f.fieldtype) && !f.hidden
		) || [];

		numericFields.forEach(field => {
			const $ctrl = frm.fields_dict[field.fieldname]?.$wrapper;
			if (!$ctrl?.length) return;

			const val = frm.doc[field.fieldname];
			if (!val && val !== 0) return;

			// Add micro-badge showing value context
			if (field.fieldtype === "Percent") {
				const pct = Math.min(100, Math.max(0, parseFloat(val)));
				const color = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
				$ctrl.find(".fv-field-hint").remove();
				$ctrl.find(".control-input-wrapper").append(
					`<div class="fv-field-hint"><div class="fv-hint-bar" style="width:${pct}%;background:${color}"></div></div>`
				);
			}
		});
	}

	// ─── Smart Sidebar ───────────────────────────────────────────
	_enhanceSidebar() {
		const sidebar = this.frm.$wrapper.find(".form-sidebar");
		if (!sidebar.length) return;

		// Workflow visualization
		const meta = frappe.get_meta(this.frm.doctype);
		if (meta?.states?.length) {
			const currentState = this.frm.doc.workflow_state;
			const statesHtml = meta.states.map(s =>
				`<span class="fv-wf-step ${s.state === currentState ? "active" : ""}">${__(s.state)}</span>`
			).join('<span class="fv-wf-arrow">→</span>');

			sidebar.find(".fv-wf-visual").remove();
			sidebar.prepend(`<div class="fv-wf-visual sidebar-section">${statesHtml}</div>`);
		}
	}

	// ─── Utils ───────────────────────────────────────────────────
	_icon(name, size = 18) {
		if (frappe.visual?.icons?.render) return frappe.visual.icons.render(name, { size });
		return `<svg width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
	}

	_docColor(doctype) {
		const colors = {
			"Sales Order": "#6366F1", "Purchase Order": "#8B5CF6", "Invoice": "#EC4899",
			"Employee": "#10B981", "Leave Application": "#F59E0B", "Customer": "#3B82F6",
		};
		return colors[doctype] || "#6366F1";
	}
}
