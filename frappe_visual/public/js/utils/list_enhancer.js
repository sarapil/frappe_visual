// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — List Enhancer
 * ==============================
 * Adds a visual card/grid/kanban toggle to standard Frappe list views.
 * Injects a toolbar button group that lets users switch between the
 * default table view and rich visual alternatives — powered by
 * frappe.visual.doctype.cardList.
 *
 * Auto-loads on every list view. Zero configuration needed.
 *
 * Usage (auto):
 *   Loads automatically via bundle. All list views get toggle button.
 *
 * Usage (manual):
 *   frappe.visual.listEnhancer.enable()
 *   frappe.visual.listEnhancer.disable()
 */

frappe.provide("frappe.visual.listEnhancer");

(function () {
    "use strict";

    const STORAGE_KEY = "fv_list_enhancer_enabled";
    const VIEW_PREF_PREFIX = "fv_list_view_";

    /* ── State ─────────────────────────────────────────────────── */
    let _enabled = true;
    let _currentEnhanced = null; // Track the currently enhanced list view

    /* ── Initialization ────────────────────────────────────────── */
    function init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) _enabled = stored === "1";

        // Hook into route changes to detect list views
        $(document).on("page-change", _onPageChange);

        // Also hook into list view render
        if (frappe.views && frappe.views.ListView) {
            const origRender = frappe.views.ListView.prototype.render;
            frappe.views.ListView.prototype.render = function () {
                origRender.call(this);
                if (_enabled) {
                    setTimeout(() => _enhanceListView(this), 200);
                }
            };
        }
    }

    /* ── Page Change Handler ───────────────────────────────────── */
    function _onPageChange() {
        if (!_enabled) return;
        // Wait for list view to be ready
        setTimeout(() => {
            const route = frappe.get_route();
            if (route && route[0] === "List" && cur_list) {
                _enhanceListView(cur_list);
            }
        }, 300);
    }

    /* ── Main Enhancer ─────────────────────────────────────────── */
    function _enhanceListView(listView) {
        if (!listView || !listView.doctype) return;

        const $page = listView.$page || listView.page?.$page;
        if (!$page) return;

        // Don't add toggle twice
        if ($page.find(".fv-list-view-toggle").length) return;

        const doctype = listView.doctype;
        const savedView = localStorage.getItem(VIEW_PREF_PREFIX + doctype);

        // Build toggle buttons
        const $toggle = $(`
            <div class="fv-list-view-toggle btn-group btn-group-sm" role="group">
                <button class="btn btn-default fv-lv-btn ${!savedView || savedView === 'table' ? 'active' : ''}"
                    data-view="table" title="${__("Table View")}">
                    <i class="ti ti-table"></i>
                </button>
                <button class="btn btn-default fv-lv-btn ${savedView === 'cards' ? 'active' : ''}"
                    data-view="cards" title="${__("Card View")}">
                    <i class="ti ti-layout-grid"></i>
                </button>
                <button class="btn btn-default fv-lv-btn ${savedView === 'kanban' ? 'active' : ''}"
                    data-view="kanban" title="${__("Kanban View")}">
                    <i class="ti ti-layout-kanban"></i>
                </button>
                <button class="btn btn-default fv-lv-btn ${savedView === 'timeline' ? 'active' : ''}"
                    data-view="timeline" title="${__("Timeline View")}">
                    <i class="ti ti-timeline-event"></i>
                </button>
            </div>
        `);

        // Insert into the list view actions area
        const $actions = $page.find(".page-actions");
        if ($actions.length) {
            $actions.prepend($toggle);
        } else {
            const $head = $page.find(".list-row-head, .frappe-list .result");
            if ($head.length) {
                $toggle.css({ margin: "0 8px 8px 0" });
                $head.first().before($toggle);
            }
        }

        // Create visual view container (hidden by default)
        let $visualContainer = $page.find(".fv-list-visual-container");
        if (!$visualContainer.length) {
            $visualContainer = $('<div class="fv-list-visual-container" style="display:none;"></div>');
            const $result = $page.find(".frappe-list .result, .frappe-list");
            if ($result.length) {
                $result.first().after($visualContainer);
            }
        }

        // Bind toggle events
        $toggle.find(".fv-lv-btn").on("click", function () {
            const view = $(this).data("view");
            $toggle.find(".fv-lv-btn").removeClass("active");
            $(this).addClass("active");
            localStorage.setItem(VIEW_PREF_PREFIX + doctype, view);
            _switchView(listView, view, $visualContainer);
        });

        // Apply saved view on load
        if (savedView && savedView !== "table") {
            _switchView(listView, savedView, $visualContainer);
        }
    }

    /* ── View Switcher ─────────────────────────────────────────── */
    async function _switchView(listView, view, $visualContainer) {
        const $standardList = listView.$result || listView.page?.$page?.find(".frappe-list .result");
        const $frozenRow = listView.page?.$page?.find(".list-row-head");
        const $sidebar = listView.page?.$page?.find(".list-sidebar, .layout-side-section");

        if (view === "table") {
            // Show standard list, hide visual container
            if ($standardList) $standardList.show();
            if ($frozenRow) $frozenRow.show();
            $visualContainer.hide().empty();
            _currentEnhanced = null;
            return;
        }

        // Hide standard list, show visual container
        if ($standardList) $standardList.hide();
        if ($frozenRow && view !== "table") $frozenRow.hide();
        $visualContainer.show().empty();

        const doctype = listView.doctype;
        const filters = listView.get_filters_for_args ? listView.get_filters_for_args() : {};

        if (view === "cards") {
            await _renderCardView($visualContainer, doctype, filters, listView);
        } else if (view === "kanban") {
            await _renderKanbanView($visualContainer, doctype, filters, listView);
        } else if (view === "timeline") {
            await _renderTimelineView($visualContainer, doctype, filters, listView);
        }

        _currentEnhanced = view;

        // GSAP entrance animation
        if (frappe.visual?.gsap) {
            const items = $visualContainer.find(".fv-le-card, .fv-le-kanban-card, .fv-le-timeline-item");
            if (items.length) {
                frappe.visual.gsap.from(items.toArray(), {
                    opacity: 0, y: 15, scale: 0.96,
                    duration: 0.3, stagger: 0.03,
                    ease: "power2.out",
                });
            }
        }
    }

    /* ── Card View ─────────────────────────────────────────────── */
    async function _renderCardView($container, doctype, filters, listView) {
        const meta = await frappe.get_meta(doctype);
        const fields = _getDisplayFields(meta);
        const titleField = meta.title_field || "name";
        const imageField = meta.image_field || null;

        // Fetch data
        const data = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype,
                filters: filters || {},
                fields: ["name", titleField, "modified", "owner", ...fields.map((f) => f.fieldname)],
                order_by: "modified desc",
                limit_page_length: 50,
            },
        });

        const records = data?.message || [];
        const statusField = _findStatusField(meta);

        let html = '<div class="fv-le-cards-grid">';

        records.forEach((doc) => {
            const title = doc[titleField] || doc.name;
            const color = _autoColor(title);
            const status = statusField ? doc[statusField.fieldname] : null;

            html += `
                <div class="fv-le-card fv-fx-hover-lift" data-name="${frappe.utils.escape_html(doc.name)}">
                    <div class="fv-le-card-accent" style="background: ${color}"></div>
                    <div class="fv-le-card-body">
                        <div class="fv-le-card-header">
                            <div class="fv-le-card-title">${frappe.utils.escape_html(title)}</div>
                            ${status ? `<span class="fv-le-card-status" style="--fv-status-color: ${_statusColor(status)}">${__(status)}</span>` : ""}
                        </div>
                        <div class="fv-le-card-id">${frappe.utils.escape_html(doc.name)}</div>
                        <div class="fv-le-card-fields">`;

            fields.slice(0, 4).forEach((field) => {
                const val = doc[field.fieldname];
                if (val !== null && val !== undefined && val !== "") {
                    html += `
                        <div class="fv-le-card-field">
                            <span class="fv-le-field-label">${__(field.label)}</span>
                            <span class="fv-le-field-value">${_formatValue(val, field)}</span>
                        </div>`;
                }
            });

            html += `</div>
                        <div class="fv-le-card-footer">
                            <span class="fv-le-card-modified">
                                <i class="ti ti-clock"></i>
                                ${frappe.datetime.prettyDate(doc.modified)}
                            </span>
                            <span class="fv-le-card-avatar" title="${frappe.user.full_name(doc.owner)}">
                                ${frappe.avatar(doc.owner, "avatar-xs")}
                            </span>
                        </div>
                    </div>
                </div>`;
        });

        if (!records.length) {
            html += `<div class="fv-le-empty">
                <i class="ti ti-database-off"></i>
                <p>${__("No records found")}</p>
            </div>`;
        }

        html += "</div>";
        $container.html(html);

        // Click to open document
        $container.find(".fv-le-card").on("click", function () {
            const name = $(this).data("name");
            frappe.set_route("Form", doctype, name);
        });
    }

    /* ── Kanban View ───────────────────────────────────────────── */
    async function _renderKanbanView($container, doctype, filters, listView) {
        const meta = await frappe.get_meta(doctype);
        const statusField = _findStatusField(meta);

        if (!statusField) {
            $container.html(`
                <div class="fv-le-empty">
                    <i class="ti ti-layout-kanban"></i>
                    <p>${__("No status field found for Kanban view")}</p>
                    <small>${__("This DocType needs a Select field with status options")}</small>
                </div>`);
            return;
        }

        const columns = (statusField.options || "")
            .split("\n")
            .filter((o) => o.trim());

        if (!columns.length) {
            $container.html(`<div class="fv-le-empty"><p>${__("No status options defined")}</p></div>`);
            return;
        }

        // Fetch all records
        const titleField = meta.title_field || "name";
        const data = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype,
                filters: filters || {},
                fields: ["name", titleField, statusField.fieldname, "modified", "owner"],
                order_by: "modified desc",
                limit_page_length: 200,
            },
        });

        const records = data?.message || [];

        // Group by status
        const groups = {};
        columns.forEach((col) => (groups[col] = []));
        records.forEach((doc) => {
            const status = doc[statusField.fieldname] || columns[0];
            if (!groups[status]) groups[status] = [];
            groups[status].push(doc);
        });

        let html = '<div class="fv-le-kanban-board">';
        columns.forEach((col) => {
            const color = _statusColor(col);
            const items = groups[col] || [];
            html += `
                <div class="fv-le-kanban-column">
                    <div class="fv-le-kanban-header" style="--fv-col-color: ${color}">
                        <span class="fv-le-kanban-dot" style="background: ${color}"></span>
                        <span class="fv-le-kanban-col-title">${__(col)}</span>
                        <span class="fv-le-kanban-count">${items.length}</span>
                    </div>
                    <div class="fv-le-kanban-items">`;

            items.forEach((doc) => {
                html += `
                    <div class="fv-le-kanban-card fv-fx-hover-lift" data-name="${frappe.utils.escape_html(doc.name)}">
                        <div class="fv-le-kanban-card-title">${frappe.utils.escape_html(doc[titleField] || doc.name)}</div>
                        <div class="fv-le-kanban-card-meta">
                            <span>${frappe.datetime.prettyDate(doc.modified)}</span>
                            ${frappe.avatar(doc.owner, "avatar-xs")}
                        </div>
                    </div>`;
            });

            if (!items.length) {
                html += `<div class="fv-le-kanban-empty">${__("Empty")}</div>`;
            }

            html += "</div></div>";
        });
        html += "</div>";

        $container.html(html);

        // Click to open document
        $container.find(".fv-le-kanban-card").on("click", function () {
            frappe.set_route("Form", doctype, $(this).data("name"));
        });
    }

    /* ── Timeline View ─────────────────────────────────────────── */
    async function _renderTimelineView($container, doctype, filters, listView) {
        const meta = await frappe.get_meta(doctype);
        const titleField = meta.title_field || "name";

        const data = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype,
                filters: filters || {},
                fields: ["name", titleField, "creation", "modified", "owner"],
                order_by: "creation desc",
                limit_page_length: 50,
            },
        });

        const records = data?.message || [];

        // Group by date
        const groups = {};
        records.forEach((doc) => {
            const date = frappe.datetime.str_to_obj(doc.creation);
            const key = frappe.datetime.obj_to_str(date).split(" ")[0];
            if (!groups[key]) groups[key] = [];
            groups[key].push(doc);
        });

        let html = '<div class="fv-le-timeline">';
        Object.entries(groups).forEach(([date, items]) => {
            const formattedDate = frappe.datetime.prettyDate(date);
            html += `
                <div class="fv-le-timeline-date">
                    <div class="fv-le-timeline-date-label">${formattedDate}</div>
                </div>`;

            items.forEach((doc) => {
                const color = _autoColor(doc[titleField] || doc.name);
                html += `
                    <div class="fv-le-timeline-item fv-fx-hover-lift" data-name="${frappe.utils.escape_html(doc.name)}">
                        <div class="fv-le-timeline-dot" style="background: ${color}"></div>
                        <div class="fv-le-timeline-content">
                            <div class="fv-le-timeline-title">${frappe.utils.escape_html(doc[titleField] || doc.name)}</div>
                            <div class="fv-le-timeline-meta">
                                <span class="fv-le-timeline-id">${frappe.utils.escape_html(doc.name)}</span>
                                <span>·</span>
                                <span>${frappe.user.full_name(doc.owner)}</span>
                                <span>·</span>
                                <span>${frappe.datetime.prettyDate(doc.creation)}</span>
                            </div>
                        </div>
                    </div>`;
            });
        });

        if (!records.length) {
            html += `<div class="fv-le-empty">
                <i class="ti ti-timeline-event-x"></i>
                <p>${__("No records found")}</p>
            </div>`;
        }

        html += "</div>";
        $container.html(html);

        // Click to open document
        $container.find(".fv-le-timeline-item").on("click", function () {
            frappe.set_route("Form", doctype, $(this).data("name"));
        });
    }

    /* ── Helpers ────────────────────────────────────────────────── */
    function _getDisplayFields(meta) {
        const exclude = ["name", "owner", "modified", "creation", "docstatus", "idx", "amended_from"];
        return (meta.fields || [])
            .filter((f) =>
                f.in_list_view &&
                !f.hidden &&
                !exclude.includes(f.fieldname) &&
                !["Section Break", "Column Break", "Tab Break", "HTML"].includes(f.fieldtype)
            )
            .slice(0, 6);
    }

    function _findStatusField(meta) {
        // Look for common status fields
        const candidates = ["status", "workflow_state", "docstatus", "state", "stage"];
        for (const name of candidates) {
            const field = (meta.fields || []).find(
                (f) => f.fieldname === name && f.fieldtype === "Select" && f.options
            );
            if (field) return field;
        }
        // Fallback: first Select field with options
        return (meta.fields || []).find(
            (f) => f.fieldtype === "Select" && f.options && !f.hidden
        );
    }

    function _formatValue(val, field) {
        if (!val && val !== 0) return "-";
        const ft = field.fieldtype;
        if (ft === "Currency") return frappe.format(val, field);
        if (ft === "Date") return frappe.datetime.str_to_user(val);
        if (ft === "Datetime") return frappe.datetime.prettyDate(val);
        if (ft === "Check") return val ? "✓" : "✗";
        if (ft === "Percent") return `${parseFloat(val).toFixed(1)}%`;
        if (ft === "Int" || ft === "Float") return frappe.format(val, field);
        const str = String(val);
        return str.length > 30 ? str.slice(0, 30) + "…" : frappe.utils.escape_html(str);
    }

    function _statusColor(status) {
        const s = (status || "").toLowerCase();
        if (["active", "enabled", "submitted", "approved", "completed", "open", "paid", "delivered"].includes(s)) return "#10b981";
        if (["cancelled", "closed", "rejected", "disabled", "overdue", "expired"].includes(s)) return "#ef4444";
        if (["pending", "draft", "hold", "on hold", "partially", "waiting"].includes(s)) return "#f59e0b";
        if (["in progress", "working", "running", "processing"].includes(s)) return "#3b82f6";
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

    /* ── CSS Injection ─────────────────────────────────────────── */
    function _injectCSS() {
        if (document.getElementById("fv-list-enhancer-css")) return;
        const style = document.createElement("style");
        style.id = "fv-list-enhancer-css";
        style.textContent = `
/* ── View Toggle ───────────────────────────────────────── */
.fv-list-view-toggle {
    margin-inline-end: 8px;
}

.fv-list-view-toggle .fv-lv-btn {
    padding: 4px 10px;
    font-size: 14px;
}

.fv-list-view-toggle .fv-lv-btn.active {
    background: var(--fv-primary, #6366f1);
    color: #fff;
    border-color: var(--fv-primary, #6366f1);
}

.fv-list-view-toggle .fv-lv-btn i {
    vertical-align: middle;
}

/* ── Card View ─────────────────────────────────────────── */
.fv-le-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    padding: 12px 0;
}

.fv-le-card {
    border-radius: 10px;
    background: var(--fv-bg-primary, #fff);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
}

.fv-le-card:hover {
    border-color: var(--fv-primary, #6366f1);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
}

.fv-le-card-accent {
    height: 3px;
    width: 100%;
}

.fv-le-card-body {
    padding: 12px 16px;
}

.fv-le-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 4px;
}

.fv-le-card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--fv-text-primary, #1e293b);
    line-height: 1.3;
}

.fv-le-card-status {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--fv-status-color, #6366f1) 12%, transparent);
    color: var(--fv-status-color, #6366f1);
    white-space: nowrap;
    flex-shrink: 0;
}

.fv-le-card-id {
    font-size: 11px;
    color: var(--fv-text-muted, #94a3b8);
    margin-bottom: 8px;
    font-family: var(--font-monospace, monospace);
}

.fv-le-card-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    margin-bottom: 10px;
}

.fv-le-card-field {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.fv-le-field-label {
    font-size: 10px;
    color: var(--fv-text-muted, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.fv-le-field-value {
    font-size: 12px;
    color: var(--fv-text-secondary, #475569);
    font-weight: 500;
}

.fv-le-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid var(--fv-border-primary, #e2e8f0);
}

.fv-le-card-modified {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--fv-text-muted, #94a3b8);
}

.fv-le-card-modified i {
    font-size: 13px;
}

/* ── Kanban View ───────────────────────────────────────── */
.fv-le-kanban-board {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 12px 0;
    min-height: 300px;
}

.fv-le-kanban-column {
    flex: 0 0 260px;
    max-width: 260px;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    background: var(--fv-bg-secondary, #f8fafc);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    overflow: hidden;
}

.fv-le-kanban-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 2px solid var(--fv-col-color, #e2e8f0);
    background: var(--fv-bg-primary, #fff);
}

.fv-le-kanban-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.fv-le-kanban-col-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--fv-text-primary, #1e293b);
    flex: 1;
}

.fv-le-kanban-count {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--fv-col-color, #6366f1) 12%, transparent);
    color: var(--fv-col-color, #6366f1);
}

.fv-le-kanban-items {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 500px;
}

.fv-le-kanban-card {
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--fv-bg-primary, #fff);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    cursor: pointer;
    transition: all 0.2s ease;
}

.fv-le-kanban-card:hover {
    border-color: var(--fv-primary, #6366f1);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
}

.fv-le-kanban-card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--fv-text-primary, #1e293b);
    margin-bottom: 4px;
    line-height: 1.3;
}

.fv-le-kanban-card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--fv-text-muted, #94a3b8);
}

.fv-le-kanban-empty {
    text-align: center;
    padding: 20px;
    color: var(--fv-text-muted, #94a3b8);
    font-size: 12px;
    font-style: italic;
}

/* ── Timeline View ─────────────────────────────────────── */
.fv-le-timeline {
    padding: 12px 0 12px 24px;
    border-inline-start: 2px solid var(--fv-border-primary, #e2e8f0);
    margin-inline-start: 16px;
}

.fv-le-timeline-date {
    margin: 16px 0 8px -25px;
}

.fv-le-timeline-date:first-child {
    margin-top: 0;
}

.fv-le-timeline-date-label {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 12px;
    background: var(--fv-primary, #6366f1);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
}

.fv-le-timeline-item {
    position: relative;
    padding: 10px 14px;
    margin: 6px 0;
    margin-inline-start: 16px;
    border-radius: 8px;
    background: var(--fv-bg-primary, #fff);
    border: 1px solid var(--fv-border-primary, #e2e8f0);
    cursor: pointer;
    transition: all 0.2s ease;
}

.fv-le-timeline-item:hover {
    border-color: var(--fv-primary, #6366f1);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
}

.fv-le-timeline-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    inset-inline-start: -22px;
    top: 16px;
    border: 2px solid var(--fv-bg-primary, #fff);
}

.fv-le-timeline-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--fv-text-primary, #1e293b);
    margin-bottom: 2px;
}

.fv-le-timeline-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--fv-text-muted, #94a3b8);
    flex-wrap: wrap;
}

.fv-le-timeline-id {
    font-family: var(--font-monospace, monospace);
}

/* ── Empty State ───────────────────────────────────────── */
.fv-le-empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--fv-text-muted, #94a3b8);
}

.fv-le-empty i {
    font-size: 48px;
    margin-bottom: 12px;
    display: block;
    opacity: 0.5;
}

.fv-le-empty p {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
}

.fv-le-empty small {
    font-size: 12px;
}

/* ── Dark Mode ─────────────────────────────────────────── */
[data-theme="dark"] .fv-le-card,
[data-theme="dark"] .fv-le-kanban-card,
[data-theme="dark"] .fv-le-timeline-item {
    background: var(--fv-bg-secondary, #1e293b);
    border-color: var(--fv-border-primary, #334155);
}

[data-theme="dark"] .fv-le-kanban-column {
    background: var(--fv-bg-tertiary, #0f172a);
    border-color: var(--fv-border-primary, #334155);
}

[data-theme="dark"] .fv-le-kanban-header {
    background: var(--fv-bg-secondary, #1e293b);
}

/* ── RTL ───────────────────────────────────────────────── */
[dir="rtl"] .fv-le-timeline {
    border-inline-start: 2px solid var(--fv-border-primary, #e2e8f0);
    border-inline-end: none;
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
    .fv-le-cards-grid {
        grid-template-columns: 1fr;
    }
    .fv-le-kanban-board {
        flex-wrap: nowrap;
    }
    .fv-le-kanban-column {
        flex: 0 0 220px;
        max-width: 220px;
    }
}

/* ── Print ─────────────────────────────────────────────── */
@media print {
    .fv-list-view-toggle,
    .fv-list-visual-container { display: none !important; }
}
`;
        document.head.appendChild(style);
    }

    /* ── Public API ────────────────────────────────────────────── */
    frappe.visual.listEnhancer = {
        enable() {
            _enabled = true;
            localStorage.setItem(STORAGE_KEY, "1");
        },

        disable() {
            _enabled = false;
            localStorage.setItem(STORAGE_KEY, "0");
            $(".fv-list-view-toggle").remove();
            $(".fv-list-visual-container").remove();
        },

        toggle() {
            if (_enabled) this.disable();
            else this.enable();
            return _enabled;
        },

        isEnabled() {
            return _enabled;
        },
    };

    /* ── Boot ──────────────────────────────────────────────────── */
    _injectCSS();
    $(document).ready(init);
})();
