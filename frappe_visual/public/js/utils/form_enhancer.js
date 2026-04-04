// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Form Enhancer
 * ==============================
 * Auto-injects visual dashboards, relationship mini-graphs,
 * KPI stat ribbons, and quick-nav links into standard Frappe forms.
 *
 * Hooks into frappe.ui.form events globally so EVERY DocType
 * automatically gets an enhanced form dashboard — zero config needed.
 *
 * Usage (auto):
 *   Loads automatically via bundle. All forms get enhanced.
 *
 * Usage (manual toggle):
 *   frappe.visual.formEnhancer.enable()
 *   frappe.visual.formEnhancer.disable()
 *   frappe.visual.formEnhancer.configure({ showGraph: false })
 */

frappe.provide("frappe.visual.formEnhancer");

(function () {
    "use strict";

    const STORAGE_KEY = "fv_form_enhancer_enabled";
    const CACHE_TTL = 5 * 60 * 1000; // 5 min cache for relationship data
    const MAX_GRAPH_NODES = 12;

    /* ── State ─────────────────────────────────────────────────── */
    let _enabled = true;
    let _config = {
        showGraph: true,
        showStats: true,
        showQuickLinks: true,
        showTimeline: true,
        animate: true,
        compactMode: false,
    };
    let _cache = {};
    let _enhancedForms = new WeakSet();

    /* ── Initialization ────────────────────────────────────────── */
    function init() {
        // Respect user preference
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) _enabled = stored === "1";

        // Hook into form refresh globally
        $(document).on("form-refresh", _onFormRefresh);

        // Also hook into the standard form render pipeline
        if (frappe.ui && frappe.ui.form) {
            const origSetup = frappe.ui.form.Form.prototype.setup_dashboard;
            if (origSetup) {
                frappe.ui.form.Form.prototype.setup_dashboard = function () {
                    origSetup.call(this);
                    if (_enabled) {
                        _enhanceForm(this);
                    }
                };
            }
        }
    }

    /* ── Form Refresh Handler ──────────────────────────────────── */
    function _onFormRefresh(e, frm) {
        if (!_enabled || !frm) return;
        // Delay slightly to let standard dashboard render first
        setTimeout(() => _enhanceForm(frm), 150);
    }

    /* ── Main Enhancer ─────────────────────────────────────────── */
    async function _enhanceForm(frm) {
        if (!frm || !frm.doc || !frm.doctype) return;
        if (frm.doc.__islocal) return; // Skip new (unsaved) documents

        const dashboardWrapper = frm.dashboard?.wrapper;
        if (!dashboardWrapper) return;

        const $wrapper = $(dashboardWrapper);

        // Don't enhance twice for same doc
        const enhanceKey = `${frm.doctype}::${frm.doc.name}`;
        const existing = $wrapper.find(".fv-form-enhance-panel");
        if (existing.length && existing.attr("data-enhance-key") === enhanceKey) {
            return;
        }
        existing.remove();

        // Create enhance panel
        const $panel = $(`<div class="fv-form-enhance-panel fv-fx-page-enter" data-enhance-key="${enhanceKey}"></div>`);
        $wrapper.prepend($panel);

        try {
            // Fetch relationship data (cached)
            const relData = await _getRelationships(frm.doctype);
            const linkedCounts = await _getLinkedCounts(frm.doctype, frm.doc.name);

            _renderEnhancedDashboard($panel, frm, relData, linkedCounts);

            // GSAP animation
            if (_config.animate && frappe.visual?.gsap) {
                const cards = $panel.find(".fv-fe-stat, .fv-fe-link-card, .fv-fe-graph-container");
                if (cards.length) {
                    frappe.visual.gsap.from(cards.toArray(), {
                        opacity: 0,
                        y: 10,
                        scale: 0.97,
                        duration: 0.3,
                        stagger: 0.04,
                        ease: "power2.out",
                    });
                }
            }
        } catch (err) {
            console.warn("Frappe Visual FormEnhancer:", err);
        }
    }

    /* ── Render Dashboard ──────────────────────────────────────── */
    function _renderEnhancedDashboard($panel, frm, relData, linkedCounts) {
        const nodes = relData?.nodes || [];
        const edges = relData?.edges || [];
        const doctype = frm.doctype;
        const docname = frm.doc.name;

        // Filter nodes to only directly connected types
        const connected = _getConnectedNodes(doctype, nodes, edges);

        let html = '<div class="fv-fe-container">';

        // ── 1. Stats ribbon ────────────────────────────────
        if (_config.showStats) {
            html += _buildStatsRibbon(frm, connected, linkedCounts);
        }

        // ── 2. Relationship mini-graph ─────────────────────
        if (_config.showGraph && connected.length > 0) {
            html += _buildMiniGraph(doctype, connected, edges, linkedCounts);
        }

        // ── 3. Quick navigation links ──────────────────────
        if (_config.showQuickLinks && connected.length > 0) {
            html += _buildQuickLinks(doctype, docname, connected, linkedCounts);
        }

        html += "</div>";
        $panel.html(html);

        // Bind click events
        _bindEvents($panel, frm);
    }

    /* ── Stats Ribbon ──────────────────────────────────────────── */
    function _buildStatsRibbon(frm, connected, linkedCounts) {
        const total = Object.values(linkedCounts).reduce((s, v) => s + v, 0);
        const linkTypes = Object.keys(linkedCounts).length;

        // Document-specific stats
        const stats = [];

        // Status indicator
        if (frm.doc.status || frm.doc.workflow_state || frm.doc.docstatus !== undefined) {
            const status = frm.doc.workflow_state || frm.doc.status || _getDocStatus(frm.doc.docstatus);
            stats.push({
                label: __("Status"),
                value: __(status),
                icon: "ti-circle-check",
                color: _statusColor(status),
            });
        }

        // Owner
        if (frm.doc.owner) {
            stats.push({
                label: __("Created By"),
                value: frappe.user.full_name(frm.doc.owner),
                icon: "ti-user",
                color: "#6366f1",
            });
        }

        // Modified date
        if (frm.doc.modified) {
            stats.push({
                label: __("Last Modified"),
                value: frappe.datetime.prettyDate(frm.doc.modified),
                icon: "ti-clock",
                color: "#8b5cf6",
            });
        }

        // Linked documents count
        stats.push({
            label: __("Linked Documents"),
            value: total,
            icon: "ti-link",
            color: "#0ea5e9",
        });

        // Connection types
        stats.push({
            label: __("Connection Types"),
            value: linkTypes,
            icon: "ti-share",
            color: "#10b981",
        });

        let html = '<div class="fv-fe-stats-ribbon">';
        stats.forEach((s) => {
            html += `
                <div class="fv-fe-stat fv-fx-hover-lift" style="--fv-stat-accent: ${s.color}">
                    <div class="fv-fe-stat-icon"><i class="${s.icon}"></i></div>
                    <div class="fv-fe-stat-body">
                        <div class="fv-fe-stat-value">${frappe.utils.escape_html(String(s.value))}</div>
                        <div class="fv-fe-stat-label">${frappe.utils.escape_html(s.label)}</div>
                    </div>
                </div>`;
        });
        html += "</div>";
        return html;
    }

    /* ── Mini-Graph (SVG) ──────────────────────────────────────── */
    function _buildMiniGraph(doctype, connected, edges, linkedCounts) {
        const nodes = connected.slice(0, MAX_GRAPH_NODES);
        const count = nodes.length;
        if (count === 0) return "";

        const width = 320;
        const height = 200;
        const cx = width / 2;
        const cy = height / 2;
        const rx = 120;
        const ry = 70;

        let svg = `<div class="fv-fe-graph-container fv-fx-glass">
            <div class="fv-fe-graph-title">
                <i class="ti ti-topology-star-3"></i>
                ${__("Relationships")}
                <button class="fv-fe-graph-expand" title="${__("Expand")}">
                    <i class="ti ti-arrows-maximize"></i>
                </button>
            </div>
            <svg class="fv-fe-graph-svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}">`;

        // Draw edges
        const angleStep = (2 * Math.PI) / count;
        nodes.forEach((node, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const nx = cx + rx * Math.cos(angle);
            const ny = cy + ry * Math.sin(angle);
            svg += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}"
                stroke="var(--fv-border-secondary, #e2e8f0)" stroke-width="1.5"
                stroke-dasharray="4,3" opacity="0.5">
                <animate attributeName="stroke-dashoffset" values="0;-14" dur="3s" repeatCount="indefinite"/>
            </line>`;
        });

        // Center node
        const centerColor = _autoColor(doctype);
        svg += `
            <circle cx="${cx}" cy="${cy}" r="26" fill="${centerColor}" opacity="0.12"/>
            <circle cx="${cx}" cy="${cy}" r="22" fill="${centerColor}" opacity="0.2"/>
            <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" font-weight="700"
                fill="var(--fv-text-primary, #1e293b)">${_truncate(doctype, 14)}</text>`;

        // Outer nodes
        nodes.forEach((node, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const nx = cx + rx * Math.cos(angle);
            const ny = cy + ry * Math.sin(angle);
            const nodeLabel = node.label || node.doctype || node.id || "";
            const nColor = _autoColor(nodeLabel);
            const linkCount = linkedCounts[nodeLabel] || 0;

            svg += `
                <g class="fv-fe-graph-node" data-doctype="${frappe.utils.escape_html(nodeLabel)}" style="cursor:pointer">
                    <circle cx="${nx}" cy="${ny}" r="18" fill="${nColor}" opacity="0.12"/>
                    <circle cx="${nx}" cy="${ny}" r="14" fill="${nColor}" opacity="0.25"/>
                    <text x="${nx}" y="${ny - 2}" text-anchor="middle" font-size="7" font-weight="600"
                        fill="var(--fv-text-secondary, #475569)">${_truncate(nodeLabel, 10)}</text>
                    ${linkCount > 0 ? `
                        <text x="${nx}" y="${ny + 8}" text-anchor="middle" font-size="7"
                            fill="${nColor}" font-weight="700">${linkCount}</text>
                    ` : ""}
                </g>`;
        });

        svg += "</svg></div>";
        return svg;
    }

    /* ── Quick Links ───────────────────────────────────────────── */
    function _buildQuickLinks(doctype, docname, connected, linkedCounts) {
        const links = connected.slice(0, 8).filter((n) => {
            const label = n.label || n.doctype || "";
            return label && label !== doctype;
        });

        if (!links.length) return "";

        let html = `<div class="fv-fe-links-section">
            <div class="fv-fe-links-title">
                <i class="ti ti-external-link"></i>
                ${__("Quick Navigation")}
            </div>
            <div class="fv-fe-links-grid">`;

        links.forEach((node) => {
            const label = node.label || node.doctype || "";
            const color = _autoColor(label);
            const count = linkedCounts[label] || 0;
            const route = _buildRoute(label, doctype, docname);

            html += `
                <a class="fv-fe-link-card fv-fx-hover-lift" href="${route}" style="--fv-link-accent: ${color}">
                    <span class="fv-fe-link-dot" style="background: ${color}"></span>
                    <span class="fv-fe-link-name">${__(label)}</span>
                    ${count > 0 ? `<span class="fv-fe-link-badge" style="background: ${color}22; color: ${color}">${count}</span>` : ""}
                </a>`;
        });

        html += "</div></div>";
        return html;
    }

    /* ── Data Fetching ─────────────────────────────────────────── */
    async function _getRelationships(doctype) {
        const cacheKey = `rel:${doctype}`;
        if (_cache[cacheKey] && Date.now() - _cache[cacheKey].ts < CACHE_TTL) {
            return _cache[cacheKey].data;
        }

        try {
            const data = await frappe.xcall(
                "frappe_visual.api.get_doctype_relationships",
                { doctype, depth: 1 }
            );
            _cache[cacheKey] = { data, ts: Date.now() };
            return data;
        } catch {
            return { nodes: [], edges: [] };
        }
    }

    async function _getLinkedCounts(doctype, docname) {
        try {
            const result = await frappe.xcall(
                "frappe_visual.api.get_linked_document_counts",
                { doctype, docname }
            );
            return result || {};
        } catch {
            // Fallback: use frappe.get_list count approach
            return {};
        }
    }

    /* ── Event Bindings ────────────────────────────────────────── */
    function _bindEvents($panel, frm) {
        // Graph node click → navigate to filtered list
        $panel.find(".fv-fe-graph-node").on("click", function () {
            const dt = $(this).data("doctype");
            if (dt) {
                frappe.set_route("List", dt, { [frm.doctype]: frm.doc.name });
            }
        });

        // Expand graph button → open full relationship explorer
        $panel.find(".fv-fe-graph-expand").on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            _openFullExplorer(frm);
        });
    }

    /* ── Full Relationship Explorer (Modal) ────────────────────── */
    function _openFullExplorer(frm) {
        const dialog = new frappe.ui.Dialog({
            title: `${__(frm.doctype)} — ${__("Relationships")}`,
            size: "extra-large",
            fields: [
                {
                    fieldtype: "HTML",
                    fieldname: "explorer_html",
                },
            ],
        });

        dialog.show();

        const $container = dialog.fields_dict.explorer_html.$wrapper;
        $container.css({ minHeight: "500px", padding: "8px" });

        // Use the RelationshipExplorer component if available
        if (frappe.visual?.RelationshipExplorer) {
            frappe.visual.RelationshipExplorer.create(
                $container[0],
                frm.doctype,
                { depth: 2, layout: "elk-radial" }
            );
        } else {
            $container.html(
                `<div style="padding:24px;text-align:center;color:var(--text-muted)">
                    ${__("Loading relationship explorer...")}
                </div>`
            );
        }
    }

    /* ── Helpers ────────────────────────────────────────────────── */
    function _getConnectedNodes(doctype, nodes, edges) {
        const connected = new Set();
        (edges || []).forEach((e) => {
            const src = (e.source || "").replace("doctype:", "");
            const tgt = (e.target || "").replace("doctype:", "");
            if (src === doctype || src.includes(doctype)) connected.add(tgt);
            if (tgt === doctype || tgt.includes(doctype)) connected.add(src);
        });

        return (nodes || [])
            .filter((n) => {
                const label = n.label || n.doctype || n.id || "";
                return connected.has(label) || connected.has(n.id);
            })
            .filter((n) => (n.label || n.doctype || "") !== doctype);
    }

    function _getDocStatus(docstatus) {
        const map = { 0: "Draft", 1: "Submitted", 2: "Cancelled" };
        return map[docstatus] || "Draft";
    }

    function _statusColor(status) {
        const s = (status || "").toLowerCase();
        if (["active", "enabled", "submitted", "approved", "completed", "open"].includes(s)) return "#10b981";
        if (["cancelled", "closed", "rejected", "disabled"].includes(s)) return "#ef4444";
        if (["pending", "draft", "hold", "on hold"].includes(s)) return "#f59e0b";
        return "#6366f1";
    }

    function _autoColor(str) {
        const colors = [
            "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
            "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9",
            "#3b82f6", "#a855f7",
        ];
        let hash = 0;
        for (let i = 0; i < (str || "").length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    function _truncate(s, max) {
        return (s || "").length > max ? s.slice(0, max - 1) + "…" : s || "";
    }

    function _buildRoute(targetDoctype, sourceDoctype, sourceName) {
        const slug = (targetDoctype || "").toLowerCase().replace(/ /g, "-");
        return `/app/${slug}?${encodeURIComponent(sourceDoctype)}=${encodeURIComponent(sourceName)}`;
    }

    /* ── CSS Injection ─────────────────────────────────────────── */
    function _injectCSS() {
        if (document.getElementById("fv-form-enhancer-css")) return;
        const style = document.createElement("style");
        style.id = "fv-form-enhancer-css";
        style.textContent = `
/* ── Form Enhancer Panel ───────────────────────────────── */
.fv-form-enhance-panel {
    margin: 0 0 12px 0;
    border-radius: 10px;
    overflow: hidden;
}

.fv-fe-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* ── Stats Ribbon ──────────────────────────────────────── */
.fv-fe-stats-ribbon {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px;
    scrollbar-width: thin;
}

.fv-fe-stat {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 8px;
    background: var(--fv-bg-secondary, #f8fafc);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    min-width: 140px;
    flex-shrink: 0;
    transition: all 0.2s ease;
    cursor: default;
}

.fv-fe-stat:hover {
    border-color: var(--fv-stat-accent, #6366f1);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--fv-stat-accent, #6366f1) 15%, transparent);
}

.fv-fe-stat-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--fv-stat-accent, #6366f1) 10%, transparent);
    color: var(--fv-stat-accent, #6366f1);
    font-size: 16px;
    flex-shrink: 0;
}

.fv-fe-stat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.fv-fe-stat-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--fv-text-primary, #1e293b);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.fv-fe-stat-label {
    font-size: 11px;
    color: var(--fv-text-muted, #94a3b8);
    line-height: 1.3;
    white-space: nowrap;
}

/* ── Mini Graph ────────────────────────────────────────── */
.fv-fe-graph-container {
    border-radius: 10px;
    background: var(--fv-bg-secondary, #f8fafc);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    overflow: hidden;
}

.fv-fe-graph-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--fv-text-secondary, #475569);
    border-bottom: 1px solid var(--fv-border-primary, #e2e8f0);
}

.fv-fe-graph-title i:first-child {
    font-size: 15px;
    color: var(--fv-primary, #6366f1);
}

.fv-fe-graph-expand {
    margin-inline-start: auto;
    background: none;
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    border-radius: 6px;
    padding: 3px 6px;
    cursor: pointer;
    color: var(--fv-text-muted, #94a3b8);
    transition: all 0.2s;
}

.fv-fe-graph-expand:hover {
    color: var(--fv-primary, #6366f1);
    border-color: var(--fv-primary, #6366f1);
    background: color-mix(in srgb, var(--fv-primary, #6366f1) 5%, transparent);
}

.fv-fe-graph-svg {
    display: block;
    margin: 0 auto;
    max-height: 200px;
}

.fv-fe-graph-svg text {
    pointer-events: none;
    user-select: none;
}

.fv-fe-graph-node:hover circle {
    opacity: 0.4 !important;
    transition: opacity 0.2s;
}

/* ── Quick Links ───────────────────────────────────────── */
.fv-fe-links-section {
    border-radius: 10px;
    background: var(--fv-bg-secondary, #f8fafc);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    overflow: hidden;
}

.fv-fe-links-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--fv-text-secondary, #475569);
    border-bottom: 1px solid var(--fv-border-primary, #e2e8f0);
}

.fv-fe-links-title i {
    font-size: 15px;
    color: var(--fv-primary, #6366f1);
}

.fv-fe-links-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 14px;
}

.fv-fe-link-card {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 6px;
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    font-size: 12px;
    font-weight: 500;
    color: var(--fv-text-primary, #1e293b);
    text-decoration: none;
    transition: all 0.2s ease;
    background: var(--fv-bg-primary, #fff);
}

.fv-fe-link-card:hover {
    border-color: var(--fv-link-accent, #6366f1);
    color: var(--fv-link-accent, #6366f1);
    box-shadow: 0 2px 6px color-mix(in srgb, var(--fv-link-accent, #6366f1) 15%, transparent);
    text-decoration: none;
}

.fv-fe-link-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.fv-fe-link-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    margin-inline-start: 2px;
}

/* ── RTL Support ───────────────────────────────────────── */
[dir="rtl"] .fv-fe-stats-ribbon {
    flex-direction: row-reverse;
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
    .fv-fe-stats-ribbon {
        flex-wrap: nowrap;
    }
    .fv-fe-stat {
        min-width: 120px;
        padding: 6px 10px;
    }
    .fv-fe-stat-icon {
        width: 28px;
        height: 28px;
        font-size: 14px;
    }
    .fv-fe-stat-value {
        font-size: 12px;
    }
    .fv-fe-graph-svg {
        max-height: 160px;
    }
}

/* ── Dark mode ─────────────────────────────────────────── */
[data-theme="dark"] .fv-fe-stat,
[data-theme="dark"] .fv-fe-graph-container,
[data-theme="dark"] .fv-fe-links-section {
    background: var(--fv-bg-secondary, #1e293b);
    border-color: var(--fv-border-primary, #334155);
}

[data-theme="dark"] .fv-fe-link-card {
    background: var(--fv-bg-primary, #0f172a);
    border-color: var(--fv-border-primary, #334155);
}

/* ── Print: hide the enhancer ──────────────────────────── */
@media print {
    .fv-form-enhance-panel { display: none !important; }
}
`;
        document.head.appendChild(style);
    }

    /* ── Public API ────────────────────────────────────────────── */
    frappe.visual.formEnhancer = {
        enable() {
            _enabled = true;
            localStorage.setItem(STORAGE_KEY, "1");
        },

        disable() {
            _enabled = false;
            localStorage.setItem(STORAGE_KEY, "0");
            // Remove existing panels
            $(".fv-form-enhance-panel").remove();
        },

        toggle() {
            if (_enabled) this.disable();
            else this.enable();
            return _enabled;
        },

        configure(opts) {
            Object.assign(_config, opts);
        },

        isEnabled() {
            return _enabled;
        },

        clearCache() {
            _cache = {};
        },

        /** Manually enhance a specific form */
        enhanceForm(frm) {
            return _enhanceForm(frm);
        },
    };

    /* ── Boot ──────────────────────────────────────────────────── */
    _injectCSS();
    $(document).ready(init);
})();
