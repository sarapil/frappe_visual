// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Visual Page Templates
 * ======================================
 * Pre-built page templates for common use cases.
 * Each template uses frappe_visual components with premium effects.
 *
 * Templates:
 *   1. Dashboard Command Center
 *   2. Entity Relationship Viewer
 *   3. Workflow Visualizer
 *   4. Hierarchy Explorer
 *   5. Interactive Form Wizard
 *   6. Visual Kanban Workspace
 *   7. Timeline/Gantt View
 *   8. Geographic Map View
 *   9. Gallery Showcase
 *   10. App Overview/About Page
 */

frappe.provide("frappe.visual.templates");

(function() {
    "use strict";

    // ═══════════════════════════════════════════════════════════════════
    // SHARED UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    const createContainer = (id, className = "") => {
        const el = document.createElement("div");
        el.id = id;
        el.className = `fv-template-container ${className} fv-fx-page-enter`;
        el.innerHTML = `
            <div class="fv-fx-morph-blob" style="position:fixed;top:-30%;right:-20%;width:600px;height:600px;opacity:0.03;z-index:0;"></div>
        `;
        return el;
    };

    const createGlassCard = (title, icon, content, options = {}) => {
        const { width = "100%", height = "auto", color = "primary" } = options;
        return `
            <div class="fv-glass-card fv-fx-glass fv-fx-hover-lift" style="width:${width};height:${height};">
                <div class="fv-card-header">
                    ${icon ? `<span class="fv-card-icon">${frappe.visual.icons.render(icon, { size: "lg", color })}</span>` : ""}
                    <h3 class="fv-card-title" data-bilingual>${title}</h3>
                </div>
                <div class="fv-card-body">
                    ${content}
                </div>
            </div>
        `;
    };

    const createKPICard = (label, value, icon, color = "primary", trend = null) => {
        const trendHtml = trend !== null
            ? `<span class="fv-kpi-trend ${trend >= 0 ? 'positive' : 'negative'}">
                   ${frappe.visual.icons.render(trend >= 0 ? "trending-up" : "trending-down", { size: "sm" })}
                   ${Math.abs(trend)}%
               </span>`
            : "";

        return `
            <div class="fv-kpi-card fv-fx-glass fv-fx-hover-shine" data-color="${color}">
                <div class="fv-kpi-icon">${frappe.visual.icons.render(icon, { size: "xl", color })}</div>
                <div class="fv-kpi-content">
                    <div class="fv-kpi-value">${value}</div>
                    <div class="fv-kpi-label" data-bilingual>${label}</div>
                    ${trendHtml}
                </div>
            </div>
        `;
    };

    const createSectionHeader = (title, subtitle = "", icon = null) => {
        return `
            <div class="fv-section-header">
                ${icon ? `<span class="fv-section-icon">${frappe.visual.icons.render(icon, { size: "xl" })}</span>` : ""}
                <div class="fv-section-text">
                    <h2 class="fv-section-title" data-bilingual>${title}</h2>
                    ${subtitle ? `<p class="fv-section-subtitle" data-bilingual>${subtitle}</p>` : ""}
                </div>
            </div>
        `;
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 1: DASHBOARD COMMAND CENTER
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.dashboard = function(container, config) {
        /**
         * Full-featured dashboard with KPIs, charts, and action panels.
         *
         * @param {string|HTMLElement} container - Target container
         * @param {Object} config - Configuration
         * @param {Array} config.kpis - KPI definitions [{label, value, icon, color, trend}]
         * @param {Array} config.charts - Chart configurations
         * @param {Array} config.actions - Quick action buttons
         * @param {Object} config.kanban - Optional kanban config
         * @param {Function} config.onRefresh - Refresh callback
         */
        const defaults = {
            title: __("Command Center"),
            subtitle: __("Real-time overview"),
            kpis: [],
            charts: [],
            actions: [],
            kanban: null,
            refreshInterval: 0,
            onRefresh: null,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = typeof container === "string" ? $(container) : $(container);

        const html = `
            <div class="fv-dashboard fv-fx-page-enter">
                <!-- Background effects -->
                <div class="fv-fx-morph-blob fv-blob-1"></div>
                <div class="fv-fx-morph-blob fv-blob-2"></div>

                <!-- Header -->
                <header class="fv-dashboard-header fv-fx-glass">
                    <div class="fv-header-content">
                        ${createSectionHeader(opts.title, opts.subtitle, "layout-dashboard")}
                        <div class="fv-header-actions">
                            <button class="btn btn-sm btn-secondary fv-refresh-btn">
                                ${frappe.visual.icons.render("refresh", { size: "sm" })}
                                <span data-bilingual>${__("Refresh")}</span>
                            </button>
                        </div>
                    </div>
                </header>

                <!-- KPIs Row -->
                <section class="fv-kpi-row">
                    ${opts.kpis.map(k => createKPICard(k.label, k.value, k.icon, k.color, k.trend)).join("")}
                </section>

                <!-- Main Content -->
                <div class="fv-dashboard-grid">
                    <!-- Charts Area -->
                    <div class="fv-charts-area">
                        ${opts.charts.map((c, i) => `
                            <div class="fv-chart-container fv-fx-glass" id="fv-chart-${i}">
                                <h4 class="fv-chart-title" data-bilingual>${c.title || __("Chart")}</h4>
                                <div class="fv-chart-body"></div>
                            </div>
                        `).join("")}
                    </div>

                    <!-- Side Panel -->
                    <aside class="fv-side-panel">
                        <!-- Quick Actions -->
                        <div class="fv-actions-panel fv-fx-glass">
                            <h4 data-bilingual>${__("Quick Actions")}</h4>
                            <div class="fv-actions-grid">
                                ${opts.actions.map(a => `
                                    <button class="fv-action-btn fv-fx-hover-lift" data-action="${a.action}">
                                        ${frappe.visual.icons.render(a.icon, { size: "lg", color: a.color || "primary" })}
                                        <span data-bilingual>${a.label}</span>
                                    </button>
                                `).join("")}
                            </div>
                        </div>

                        <!-- Kanban Mini -->
                        ${opts.kanban ? `
                            <div class="fv-kanban-mini fv-fx-glass" id="fv-kanban-mini">
                                <h4 data-bilingual>${opts.kanban.title || __("Tasks")}</h4>
                                <div class="fv-kanban-container"></div>
                            </div>
                        ` : ""}
                    </aside>
                </div>
            </div>
        `;

        $container.html(html);

        // Initialize components
        frappe.require("frappe_visual.bundle.js", () => {
            // Animate KPI numbers
            if (frappe.visual.gsap) {
                $container.find(".fv-kpi-value").each(function() {
                    const val = parseFloat($(this).text().replace(/[^0-9.-]/g, ""));
                    if (!isNaN(val)) {
                        const format = $(this).text().replace(val, "{n}");
                        frappe.visual.gsap.from(this, {
                            textContent: 0,
                            duration: 1.5,
                            ease: "power2.out",
                            snap: { textContent: 1 },
                            onUpdate: function() {
                                this.targets()[0].textContent = format.replace("{n}",
                                    Math.round(this.targets()[0].textContent).toLocaleString()
                                );
                            }
                        });
                    }
                });

                // Stagger entrance
                frappe.visual.gsap.from(".fv-kpi-card", {
                    y: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: "back.out(1.2)"
                });
            }

            // Setup Kanban if configured
            if (opts.kanban) {
                frappe.visual.kanban("#fv-kanban-mini .fv-kanban-container", {
                    doctype: opts.kanban.doctype,
                    fieldname: opts.kanban.fieldname || "status",
                    mini: true,
                });
            }

            // Action buttons
            $container.find(".fv-action-btn").on("click", function() {
                const action = $(this).data("action");
                if (opts.actions.find(a => a.action === action)?.onClick) {
                    opts.actions.find(a => a.action === action).onClick();
                }
            });

            // Refresh button
            $container.find(".fv-refresh-btn").on("click", function() {
                if (opts.onRefresh) opts.onRefresh();
            });

            // Auto-refresh
            if (opts.refreshInterval > 0) {
                setInterval(() => {
                    if (opts.onRefresh) opts.onRefresh();
                }, opts.refreshInterval);
            }
        });

        return {
            refresh: () => opts.onRefresh && opts.onRefresh(),
            updateKPI: (index, value) => {
                $container.find(".fv-kpi-value").eq(index).text(value);
            },
        };
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 2: ENTITY RELATIONSHIP VIEWER
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.erd = function(container, config) {
        /**
         * Interactive Entity Relationship Diagram viewer.
         *
         * @param {string|HTMLElement} container
         * @param {Object} config
         * @param {string} config.doctype - Center DocType
         * @param {number} config.depth - Relationship depth
         * @param {boolean} config.showFields - Show field details
         */
        const defaults = {
            doctype: null,
            depth: 2,
            showFields: true,
            layout: "elk",
            title: __("Entity Relationships"),
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-erd-page fv-fx-page-enter">
                <header class="fv-erd-header fv-fx-glass">
                    ${createSectionHeader(opts.title, __("Visual schema explorer"), "hierarchy-3")}
                    <div class="fv-erd-controls">
                        <select class="form-control fv-doctype-select" style="width:200px;">
                            <option value="">${__("Select DocType...")}</option>
                        </select>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-default fv-zoom-in" title="${__("Zoom In")}">
                                ${frappe.visual.icons.render("zoom-in")}
                            </button>
                            <button class="btn btn-sm btn-default fv-zoom-out" title="${__("Zoom Out")}">
                                ${frappe.visual.icons.render("zoom-out")}
                            </button>
                            <button class="btn btn-sm btn-default fv-fit" title="${__("Fit")}">
                                ${frappe.visual.icons.render("maximize")}
                            </button>
                        </div>
                    </div>
                </header>

                <div class="fv-erd-layout">
                    <div class="fv-erd-graph fv-fx-glass" id="fv-erd-graph"></div>
                    <aside class="fv-erd-sidebar fv-fx-glass" id="fv-erd-sidebar">
                        <h4 data-bilingual>${__("DocType Details")}</h4>
                        <div class="fv-erd-details">
                            <p class="text-muted" data-bilingual>${__("Click a node to see details")}</p>
                        </div>
                    </aside>
                </div>
            </div>
        `;

        $container.html(html);

        let erdInstance = null;

        frappe.require("frappe_visual.bundle.js", async () => {
            // Load DocType list
            const doctypes = await frappe.xcall("frappe.client.get_list", {
                doctype: "DocType",
                filters: { istable: 0, issingle: 0 },
                fields: ["name"],
                limit_page_length: 0,
            });

            const $select = $container.find(".fv-doctype-select");
            doctypes.forEach(d => {
                $select.append(`<option value="${d.name}">${d.name}</option>`);
            });

            if (opts.doctype) {
                $select.val(opts.doctype).trigger("change");
            }

            $select.on("change", async function() {
                const dt = $(this).val();
                if (!dt) return;

                // Fetch relationships
                const data = await frappe.xcall("frappe_visual.api.get_doctype_relationships", {
                    doctype: dt,
                    depth: opts.depth,
                    include_fields: opts.showFields,
                });

                if (erdInstance) erdInstance.destroy();

                erdInstance = new frappe.visual.RelationshipExplorer("#fv-erd-graph", {
                    data,
                    layout: opts.layout,
                    onNodeClick: (node) => {
                        const details = `
                            <h5>${node.data.label}</h5>
                            <p class="text-muted">${node.data.module || ""}</p>
                            ${node.data.fields ? `
                                <h6 data-bilingual>${__("Fields")}</h6>
                                <ul class="fv-field-list">
                                    ${node.data.fields.slice(0, 10).map(f => `
                                        <li>
                                            <span class="fv-field-name">${f.fieldname}</span>
                                            <span class="fv-field-type">${f.fieldtype}</span>
                                        </li>
                                    `).join("")}
                                    ${node.data.fields.length > 10 ? `<li class="text-muted">+${node.data.fields.length - 10} more</li>` : ""}
                                </ul>
                            ` : ""}
                            <button class="btn btn-sm btn-primary mt-2" onclick="frappe.set_route('Form', 'DocType', '${node.data.id}')">
                                ${frappe.visual.icons.render("edit")} ${__("Edit DocType")}
                            </button>
                        `;
                        $container.find(".fv-erd-details").html(details);
                    },
                });
            });

            // Zoom controls
            $container.find(".fv-zoom-in").on("click", () => erdInstance?.zoom(1.2));
            $container.find(".fv-zoom-out").on("click", () => erdInstance?.zoom(0.8));
            $container.find(".fv-fit").on("click", () => erdInstance?.fit());
        });

        return {
            setDocType: (dt) => $container.find(".fv-doctype-select").val(dt).trigger("change"),
            refresh: () => $container.find(".fv-doctype-select").trigger("change"),
        };
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 3: WORKFLOW VISUALIZER
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.workflow = function(container, config) {
        /**
         * Visual workflow/process flow viewer.
         *
         * @param {Object} config
         * @param {Array} config.nodes - [{id, label, type, status}]
         * @param {Array} config.edges - [{source, target, label}]
         * @param {string} config.currentNode - Highlight current step
         */
        const defaults = {
            title: __("Workflow"),
            subtitle: __("Process flow visualization"),
            nodes: [],
            edges: [],
            currentNode: null,
            allowEdit: false,
            onNodeClick: null,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-workflow-page fv-fx-page-enter">
                <header class="fv-workflow-header fv-fx-glass">
                    ${createSectionHeader(opts.title, opts.subtitle, "git-merge")}
                </header>

                <div class="fv-workflow-content">
                    <div class="fv-workflow-graph fv-fx-glass" id="fv-workflow-graph"></div>

                    <aside class="fv-workflow-legend fv-fx-glass">
                        <h5 data-bilingual>${__("Legend")}</h5>
                        <ul class="fv-legend-list">
                            <li><span class="fv-legend-dot" style="background:var(--green-500)"></span> <span data-bilingual>${__("Completed")}</span></li>
                            <li><span class="fv-legend-dot" style="background:var(--blue-500)"></span> <span data-bilingual>${__("Current")}</span></li>
                            <li><span class="fv-legend-dot" style="background:var(--gray-400)"></span> <span data-bilingual>${__("Pending")}</span></li>
                            <li><span class="fv-legend-dot" style="background:var(--yellow-500)"></span> <span data-bilingual>${__("On Hold")}</span></li>
                            <li><span class="fv-legend-dot" style="background:var(--red-500)"></span> <span data-bilingual>${__("Rejected")}</span></li>
                        </ul>
                    </aside>
                </div>
            </div>
        `;

        $container.html(html);

        frappe.require("frappe_visual.bundle.js", () => {
            const graph = new frappe.visual.GraphEngine("#fv-workflow-graph", {
                layout: "elk-layered",
                direction: "RIGHT",
                nodes: opts.nodes.map(n => ({
                    id: n.id,
                    label: n.label,
                    type: n.type || "default",
                    classes: [
                        n.status || "pending",
                        n.id === opts.currentNode ? "current" : "",
                    ].filter(Boolean).join(" "),
                })),
                edges: opts.edges,
                style: `
                    node {
                        width: 160px;
                        height: 60px;
                        background-color: var(--fv-surface);
                        border: 2px solid var(--fv-border);
                        label: data(label);
                        text-valign: center;
                        text-halign: center;
                        font-size: 12px;
                        border-radius: 12px;
                    }
                    node.completed {
                        background-color: var(--green-100);
                        border-color: var(--green-500);
                    }
                    node.current {
                        background-color: var(--blue-100);
                        border-color: var(--blue-500);
                        border-width: 3px;
                    }
                    node.rejected {
                        background-color: var(--red-100);
                        border-color: var(--red-500);
                    }
                    edge {
                        width: 2px;
                        line-color: var(--fv-border);
                        target-arrow-shape: triangle;
                        target-arrow-color: var(--fv-border);
                        curve-style: bezier;
                    }
                `,
                onNodeClick: opts.onNodeClick,
            });

            // Animate current node
            if (opts.currentNode && frappe.visual.gsap) {
                frappe.visual.gsap.to(`#fv-workflow-graph [data-id="${opts.currentNode}"]`, {
                    scale: 1.05,
                    duration: 0.5,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                });
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 4: HIERARCHY EXPLORER (TREE)
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.tree = function(container, config) {
        /**
         * Interactive hierarchical tree viewer.
         *
         * @param {Object} config
         * @param {string} config.doctype - DocType with parent field
         * @param {string} config.parentField - Parent link field
         * @param {Array} config.data - Pre-loaded tree data
         */
        const defaults = {
            title: __("Hierarchy"),
            doctype: null,
            parentField: "parent",
            data: null,
            onNodeClick: null,
            expandDepth: 2,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-tree-page fv-fx-page-enter">
                <header class="fv-tree-header fv-fx-glass">
                    ${createSectionHeader(opts.title, __("Hierarchical structure"), "hierarchy")}
                    <div class="fv-tree-controls">
                        <button class="btn btn-sm btn-default fv-expand-all">
                            ${frappe.visual.icons.render("arrows-maximize")} <span data-bilingual>${__("Expand All")}</span>
                        </button>
                        <button class="btn btn-sm btn-default fv-collapse-all">
                            ${frappe.visual.icons.render("arrows-minimize")} <span data-bilingual>${__("Collapse All")}</span>
                        </button>
                    </div>
                </header>

                <div class="fv-tree-container fv-fx-glass" id="fv-tree-container"></div>
            </div>
        `;

        $container.html(html);

        let treeInstance = null;

        frappe.require("frappe_visual.bundle.js", async () => {
            let treeData = opts.data;

            if (!treeData && opts.doctype) {
                treeData = await frappe.xcall("frappe_visual.api.get_tree_data", {
                    doctype: opts.doctype,
                    parent_field: opts.parentField,
                });
            }

            treeInstance = new frappe.visual.VisualTreeView("#fv-tree-container", {
                data: treeData,
                expandDepth: opts.expandDepth,
                onNodeClick: opts.onNodeClick,
            });

            $container.find(".fv-expand-all").on("click", () => treeInstance.expandAll());
            $container.find(".fv-collapse-all").on("click", () => treeInstance.collapseAll());
        });

        return {
            expandAll: () => treeInstance?.expandAll(),
            collapseAll: () => treeInstance?.collapseAll(),
            refresh: () => treeInstance?.refresh(),
        };
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 5: INTERACTIVE FORM WIZARD (STORYBOARD)
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.wizard = function(container, config) {
        /**
         * Multi-step form wizard with visual progress.
         *
         * @param {Object} config
         * @param {Array} config.steps - Step definitions
         * @param {Function} config.onComplete - Completion callback
         */
        const defaults = {
            title: __("Setup Wizard"),
            steps: [],
            onComplete: null,
            showProgress: true,
            allowSkip: false,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-wizard-page fv-fx-page-enter">
                <header class="fv-wizard-header fv-fx-glass">
                    ${createSectionHeader(opts.title, __("Follow the steps"), "list-check")}
                </header>
                <div class="fv-wizard-container fv-fx-glass" id="fv-wizard-container"></div>
            </div>
        `;

        $container.html(html);

        frappe.require("frappe_visual.bundle.js", () => {
            new frappe.visual.Storyboard("#fv-wizard-container", opts.steps, {
                showProgress: opts.showProgress,
                allowSkip: opts.allowSkip,
                onComplete: opts.onComplete,
            });
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 6: VISUAL KANBAN WORKSPACE
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.kanbanWorkspace = function(container, config) {
        /**
         * Full Kanban workspace with filters and actions.
         */
        const defaults = {
            title: __("Kanban Board"),
            doctype: null,
            fieldname: "status",
            filters: {},
            columns: null,
            onCardClick: null,
            onCardMove: null,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-kanban-page fv-fx-page-enter">
                <header class="fv-kanban-header fv-fx-glass">
                    ${createSectionHeader(opts.title, opts.doctype, "layout-kanban")}
                    <div class="fv-kanban-actions">
                        <button class="btn btn-primary btn-sm fv-add-new">
                            ${frappe.visual.icons.render("plus")} <span data-bilingual>${__("Add New")}</span>
                        </button>
                        <button class="btn btn-default btn-sm fv-refresh">
                            ${frappe.visual.icons.render("refresh")}
                        </button>
                    </div>
                </header>

                <div class="fv-kanban-board" id="fv-kanban-board"></div>
            </div>
        `;

        $container.html(html);

        let kanbanInstance = null;

        frappe.require("frappe_visual.bundle.js", () => {
            kanbanInstance = new frappe.visual.KanbanBoard("#fv-kanban-board", {
                doctype: opts.doctype,
                fieldname: opts.fieldname,
                filters: opts.filters,
                columns: opts.columns,
                onCardClick: opts.onCardClick,
                onCardMove: opts.onCardMove,
            });

            $container.find(".fv-add-new").on("click", () => {
                frappe.new_doc(opts.doctype);
            });

            $container.find(".fv-refresh").on("click", () => {
                kanbanInstance.refresh();
            });
        });

        return {
            refresh: () => kanbanInstance?.refresh(),
            addCard: (data) => kanbanInstance?.addCard(data),
        };
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 7: TIMELINE / GANTT VIEW
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.timeline = function(container, config) {
        /**
         * Gantt chart / timeline view.
         */
        const defaults = {
            title: __("Timeline"),
            doctype: null,
            startField: "start_date",
            endField: "end_date",
            nameField: "name",
            data: null,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-timeline-page fv-fx-page-enter">
                <header class="fv-timeline-header fv-fx-glass">
                    ${createSectionHeader(opts.title, __("Project timeline"), "calendar-time")}
                    <div class="fv-timeline-controls">
                        <select class="form-control fv-view-mode" style="width:120px;">
                            <option value="Day">${__("Day")}</option>
                            <option value="Week" selected>${__("Week")}</option>
                            <option value="Month">${__("Month")}</option>
                        </select>
                    </div>
                </header>

                <div class="fv-gantt-container fv-fx-glass" id="fv-gantt-container"></div>
            </div>
        `;

        $container.html(html);

        let ganttInstance = null;

        frappe.require("frappe_visual.bundle.js", async () => {
            let tasks = opts.data;

            if (!tasks && opts.doctype) {
                const records = await frappe.xcall("frappe.client.get_list", {
                    doctype: opts.doctype,
                    fields: [opts.nameField, opts.startField, opts.endField],
                    filters: opts.filters || {},
                    limit_page_length: 100,
                });

                tasks = records.map(r => ({
                    id: r[opts.nameField],
                    name: r[opts.nameField],
                    start: r[opts.startField],
                    end: r[opts.endField],
                }));
            }

            ganttInstance = new frappe.visual.VisualGantt("#fv-gantt-container", {
                tasks,
                viewMode: "Week",
            });

            $container.find(".fv-view-mode").on("change", function() {
                ganttInstance.setViewMode($(this).val());
            });
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // TEMPLATE 8: APP OVERVIEW / ABOUT PAGE
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.templates.appOverview = function(container, config) {
        /**
         * App showcase page with visual storyboard.
         *
         * @param {Object} config
         * @param {string} config.app - App name
         * @param {Object} config.branding - {logo, color, tagline}
         * @param {Array} config.features - Feature list
         * @param {Array} config.slides - Storyboard slides
         */
        const defaults = {
            app: null,
            branding: { color: "var(--primary)", tagline: "" },
            features: [],
            slides: [],
            showAppMap: true,
            showERD: true,
        };

        const opts = Object.assign({}, defaults, config);
        const $container = $(container);

        const html = `
            <div class="fv-app-overview fv-fx-page-enter" style="--app-color:${opts.branding.color};">
                <!-- Hero Section -->
                <section class="fv-hero fv-fx-gradient-animated">
                    <div class="fv-hero-content">
                        ${opts.branding.logo ? `<img src="${opts.branding.logo}" class="fv-hero-logo" alt="${opts.app}">` : ""}
                        <h1 class="fv-hero-title">${opts.app}</h1>
                        <p class="fv-hero-tagline">${opts.branding.tagline}</p>
                    </div>
                </section>

                <!-- Features Grid -->
                <section class="fv-features-section">
                    ${createSectionHeader(__("Features"), __("What you can do"), "sparkles")}
                    <div class="fv-features-grid">
                        ${opts.features.map(f => `
                            <div class="fv-feature-card fv-fx-glass fv-fx-hover-lift">
                                ${frappe.visual.icons.render(f.icon || "check", { size: "xl", color: "primary" })}
                                <h4 data-bilingual>${f.title}</h4>
                                <p data-bilingual>${f.description}</p>
                            </div>
                        `).join("")}
                    </div>
                </section>

                <!-- App Map -->
                ${opts.showAppMap ? `
                    <section class="fv-appmap-section">
                        ${createSectionHeader(__("App Structure"), __("Modules and components"), "sitemap")}
                        <div class="fv-appmap-container fv-fx-glass" id="fv-app-map"></div>
                    </section>
                ` : ""}

                <!-- ERD -->
                ${opts.showERD ? `
                    <section class="fv-erd-section">
                        ${createSectionHeader(__("Data Model"), __("Entity relationships"), "database")}
                        <div class="fv-erd-container fv-fx-glass" id="fv-app-erd"></div>
                    </section>
                ` : ""}

                <!-- Storyboard / Walkthrough -->
                ${opts.slides.length > 0 ? `
                    <section class="fv-walkthrough-section">
                        ${createSectionHeader(__("Walkthrough"), __("Step-by-step guide"), "route")}
                        <div class="fv-walkthrough-container fv-fx-glass" id="fv-walkthrough"></div>
                    </section>
                ` : ""}

                <!-- CTA -->
                <section class="fv-cta-section fv-fx-glass">
                    <h3 data-bilingual>${__("Ready to get started?")}</h3>
                    <div class="fv-cta-buttons">
                        <button class="btn btn-primary btn-lg" onclick="frappe.set_route('Workspaces', '${opts.app}')">
                            ${frappe.visual.icons.render("rocket")} <span data-bilingual>${__("Open App")}</span>
                        </button>
                        <button class="btn btn-default btn-lg fv-start-onboarding">
                            ${frappe.visual.icons.render("school")} <span data-bilingual>${__("Start Tutorial")}</span>
                        </button>
                    </div>
                </section>
            </div>
        `;

        $container.html(html);

        frappe.require("frappe_visual.bundle.js", async () => {
            // App Map
            if (opts.showAppMap && opts.app) {
                const appMapData = await frappe.xcall("frappe_visual.api.get_app_map", {
                    app: opts.app,
                });
                new frappe.visual.AppMap("#fv-app-map", {
                    data: appMapData,
                    layout: "elk-tree",
                });
            }

            // ERD
            if (opts.showERD && opts.app) {
                // Get main DocTypes for this app
                const doctypes = await frappe.xcall("frappe.client.get_list", {
                    doctype: "DocType",
                    filters: { module: ["like", `%${opts.app}%`], istable: 0 },
                    fields: ["name"],
                    limit: 5,
                });

                if (doctypes.length > 0) {
                    const erdData = await frappe.xcall("frappe_visual.api.get_doctype_relationships", {
                        doctype: doctypes[0].name,
                        depth: 2,
                    });
                    new frappe.visual.RelationshipExplorer("#fv-app-erd", {
                        data: erdData,
                    });
                }
            }

            // Storyboard
            if (opts.slides.length > 0) {
                new frappe.visual.Storyboard("#fv-walkthrough", opts.slides, {
                    showProgress: true,
                });
            }

            // Animate entrance
            if (frappe.visual.gsap) {
                frappe.visual.gsap.from(".fv-feature-card", {
                    y: 40, opacity: 0, stagger: 0.1, duration: 0.6, ease: "back.out(1.2)"
                });
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // CSS STYLES
    // ═══════════════════════════════════════════════════════════════════

    const styles = `
        /* Template Base Styles */
        .fv-template-container {
            position: relative;
            min-height: 100vh;
            padding: 24px;
        }

        /* Glass Card */
        .fv-glass-card {
            background: var(--fv-glass-bg, rgba(255,255,255,0.7));
            border: 1px solid var(--fv-glass-border, rgba(255,255,255,0.2));
            border-radius: 16px;
            padding: 20px;
            backdrop-filter: blur(10px);
        }

        .fv-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .fv-card-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        /* KPI Cards */
        .fv-kpi-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 24px 0;
        }

        .fv-kpi-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: 16px;
        }

        .fv-kpi-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--fv-text-primary);
        }

        .fv-kpi-label {
            font-size: 13px;
            color: var(--fv-text-secondary);
        }

        .fv-kpi-trend {
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .fv-kpi-trend.positive { color: var(--green-600); }
        .fv-kpi-trend.negative { color: var(--red-600); }

        /* Section Headers */
        .fv-section-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
        }

        .fv-section-title {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }

        .fv-section-subtitle {
            margin: 4px 0 0;
            color: var(--fv-text-secondary);
        }

        /* Dashboard Grid */
        .fv-dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 24px;
        }

        @media (max-width: 1024px) {
            .fv-dashboard-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Actions Grid */
        .fv-actions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .fv-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 16px;
            border: 1px solid var(--fv-border);
            border-radius: 12px;
            background: transparent;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .fv-action-btn:hover {
            background: var(--fv-surface-hover);
            border-color: var(--primary);
        }

        /* ERD Layout */
        .fv-erd-layout {
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 20px;
            margin-top: 20px;
        }

        .fv-erd-graph {
            min-height: 500px;
            border-radius: 16px;
        }

        .fv-field-list {
            list-style: none;
            padding: 0;
            margin: 8px 0;
            font-size: 12px;
        }

        .fv-field-list li {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid var(--fv-border);
        }

        .fv-field-type {
            color: var(--fv-text-muted);
        }

        /* Workflow Legend */
        .fv-legend-list {
            list-style: none;
            padding: 0;
        }

        .fv-legend-list li {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
        }

        .fv-legend-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        /* Hero Section */
        .fv-hero {
            padding: 80px 40px;
            text-align: center;
            border-radius: 24px;
            margin-bottom: 40px;
        }

        .fv-hero-logo {
            width: 120px;
            height: 120px;
            margin-bottom: 24px;
        }

        .fv-hero-title {
            font-size: 48px;
            font-weight: 800;
            margin: 0;
            color: white;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        .fv-hero-tagline {
            font-size: 20px;
            color: rgba(255,255,255,0.9);
            margin-top: 12px;
        }

        /* Features Grid */
        .fv-features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
        }

        .fv-feature-card {
            padding: 24px;
            text-align: center;
        }

        .fv-feature-card h4 {
            margin: 16px 0 8px;
        }

        .fv-feature-card p {
            color: var(--fv-text-secondary);
            margin: 0;
        }

        /* CTA Section */
        .fv-cta-section {
            text-align: center;
            padding: 48px;
            margin-top: 40px;
        }

        .fv-cta-buttons {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
        }

        /* Blob backgrounds */
        .fv-blob-1 {
            position: fixed;
            top: -30%;
            right: -20%;
            width: 600px;
            height: 600px;
            opacity: 0.05;
            z-index: 0;
        }

        .fv-blob-2 {
            position: fixed;
            bottom: -40%;
            left: -15%;
            width: 500px;
            height: 500px;
            opacity: 0.03;
            z-index: 0;
        }

        /* RTL Support */
        [dir="rtl"] .fv-dashboard-grid {
            grid-template-columns: 300px 1fr;
        }

        [dir="rtl"] .fv-erd-layout {
            grid-template-columns: 280px 1fr;
        }
    `;

    // Inject styles
    if (!document.getElementById("fv-template-styles")) {
        const styleEl = document.createElement("style");
        styleEl.id = "fv-template-styles";
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

})();
