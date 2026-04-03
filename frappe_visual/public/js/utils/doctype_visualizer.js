/**
 * Frappe Visual — DocType Visualizer
 * ===================================
 * Transform any DocType into interactive visual interfaces:
 * - Visual List View with cards, grid, or kanban
 * - Visual Form with grouped sections
 * - Quick Entry dialogs with modern UI
 * - Relationship explorer for linked documents
 */

frappe.provide("frappe.visual.doctype");

frappe.visual.doctype = {
    /**
     * Render a DocType list as visual cards
     * @param {HTMLElement} container - Target container
     * @param {string} doctype - DocType name
     * @param {Object} options - Configuration options
     */
    async cardList(container, doctype, options = {}) {
        const $container = $(container);
        $container.empty().addClass("fv-doctype-cards fv-fx-page-enter");

        const config = {
            filters: options.filters || {},
            fields: options.fields || ["name", "modified"],
            orderBy: options.orderBy || "modified desc",
            pageLength: options.pageLength || 20,
            cardTemplate: options.cardTemplate || null,
            groupBy: options.groupBy || null,
            searchFields: options.searchFields || ["name"],
            actions: options.actions || ["view", "edit", "delete"],
            color: options.color || "primary",
            ...options
        };

        // Get meta
        const meta = await frappe.get_meta(doctype);

        // Build header
        const $header = $(`
            <div class="fv-cards-header fv-fx-glass">
                <div class="fv-cards-title">
                    <i class="ti ti-${this._getDocTypeIcon(doctype, meta)}"></i>
                    <div>
                        <h3>${__(doctype)}</h3>
                        <span class="fv-cards-count">...</span>
                    </div>
                </div>
                <div class="fv-cards-actions">
                    <div class="fv-cards-search">
                        <i class="ti ti-search"></i>
                        <input type="text" placeholder="${__("Search...")}">
                    </div>
                    <div class="fv-cards-view-toggle">
                        <button class="fv-view-btn active" data-view="cards" title="${__("Cards")}">
                            <i class="ti ti-layout-grid"></i>
                        </button>
                        <button class="fv-view-btn" data-view="list" title="${__("List")}">
                            <i class="ti ti-list"></i>
                        </button>
                        <button class="fv-view-btn" data-view="kanban" title="${__("Kanban")}">
                            <i class="ti ti-layout-kanban"></i>
                        </button>
                    </div>
                    ${frappe.perm.has_perm(doctype, 0, "create") ? `
                        <button class="btn btn-primary fv-cards-new">
                            <i class="ti ti-plus"></i>
                            ${__("New")}
                        </button>
                    ` : ""}
                </div>
            </div>
        `).appendTo($container);

        // Cards container
        const $cardsContainer = $('<div class="fv-cards-grid"></div>').appendTo($container);

        // Pagination
        const $pagination = $('<div class="fv-cards-pagination"></div>').appendTo($container);

        let currentPage = 0;
        let currentView = "cards";
        let searchQuery = "";

        // Load data
        const loadData = async () => {
            $cardsContainer.html(`
                <div class="fv-cards-loading">
                    <div class="fv-spinner"></div>
                    <span>${__("Loading...")}</span>
                </div>
            `);

            try {
                // Build filters with search
                let filters = { ...config.filters };
                if (searchQuery) {
                    const searchFilters = config.searchFields.map(f => [doctype, f, "like", `%${searchQuery}%`]);
                    if (searchFilters.length > 1) {
                        filters = [filters, ["or", ...searchFilters]];
                    }
                }

                const result = await frappe.call({
                    method: "frappe.client.get_list",
                    args: {
                        doctype: doctype,
                        fields: ["name", ...config.fields],
                        filters: config.filters,
                        or_filters: searchQuery ? config.searchFields.map(f => [f, "like", `%${searchQuery}%`]) : null,
                        order_by: config.orderBy,
                        limit_start: currentPage * config.pageLength,
                        limit_page_length: config.pageLength,
                    }
                });

                const records = result.message || [];

                // Update count
                const countResult = await frappe.call({
                    method: "frappe.client.get_count",
                    args: { doctype: doctype, filters: config.filters }
                });
                const totalCount = countResult.message || 0;
                $header.find(".fv-cards-count").text(`${totalCount} ${__("records")}`);

                // Render based on view
                $cardsContainer.empty();
                
                if (records.length === 0) {
                    $cardsContainer.html(`
                        <div class="fv-cards-empty fv-fx-glass">
                            <i class="ti ti-folder-off"></i>
                            <p>${__("No records found")}</p>
                            ${frappe.perm.has_perm(doctype, 0, "create") ? `
                                <button class="btn btn-primary fv-cards-new-empty">
                                    <i class="ti ti-plus"></i>
                                    ${__("Create first")} ${__(doctype)}
                                </button>
                            ` : ""}
                        </div>
                    `);
                } else {
                    if (currentView === "cards") {
                        this._renderCards($cardsContainer, records, doctype, meta, config);
                    } else if (currentView === "list") {
                        this._renderList($cardsContainer, records, doctype, meta, config);
                    } else if (currentView === "kanban") {
                        this._renderKanban($cardsContainer, records, doctype, meta, config);
                    }
                }

                // Pagination
                const totalPages = Math.ceil(totalCount / config.pageLength);
                this._renderPagination($pagination, currentPage, totalPages, (page) => {
                    currentPage = page;
                    loadData();
                });

            } catch (error) {
                $cardsContainer.html(`
                    <div class="fv-cards-error fv-fx-glass">
                        <i class="ti ti-alert-triangle"></i>
                        <p>${__("Failed to load data")}</p>
                        <button class="btn btn-secondary" onclick="location.reload()">
                            ${__("Retry")}
                        </button>
                    </div>
                `);
            }
        };

        // Bind events
        $header.find(".fv-cards-search input").on("input", frappe.utils.debounce((e) => {
            searchQuery = e.target.value;
            currentPage = 0;
            loadData();
        }, 300));

        $header.find(".fv-view-btn").on("click", function() {
            $header.find(".fv-view-btn").removeClass("active");
            $(this).addClass("active");
            currentView = $(this).data("view");
            loadData();
        });

        $header.find(".fv-cards-new").on("click", () => {
            if (config.quickEntry) {
                frappe.visual.doctype.quickEntry(doctype, config.defaultValues || {}, () => loadData());
            } else {
                frappe.new_doc(doctype, config.defaultValues || {});
            }
        });

        $container.on("click", ".fv-cards-new-empty", () => {
            frappe.new_doc(doctype, config.defaultValues || {});
        });

        // Initial load
        loadData();

        // Return refresh function
        return { refresh: loadData };
    },

    /**
     * Render a visual form for a document
     * @param {HTMLElement} container - Target container
     * @param {string} doctype - DocType name
     * @param {string} name - Document name (or null for new)
     * @param {Object} options - Configuration options
     */
    async visualForm(container, doctype, name = null, options = {}) {
        const $container = $(container);
        $container.empty().addClass("fv-visual-form fv-fx-page-enter");

        const meta = await frappe.get_meta(doctype);
        let doc = name ? await this._fetchDoc(doctype, name) : { doctype: doctype };

        // Group fields by sections
        const sections = this._groupFormFields(meta.fields);

        // Build form header
        const $header = $(`
            <div class="fv-form-header fv-fx-glass">
                <div class="fv-form-title">
                    <i class="ti ti-${this._getDocTypeIcon(doctype, meta)}"></i>
                    <div>
                        <h2>${name ? doc.name : __("New") + " " + __(doctype)}</h2>
                        ${doc.modified ? `<span class="fv-form-modified">${__("Modified")} ${frappe.datetime.prettyDate(doc.modified)}</span>` : ""}
                    </div>
                </div>
                <div class="fv-form-actions">
                    ${meta.is_submittable && doc.docstatus === 0 ? `
                        <button class="btn btn-primary fv-form-submit">
                            <i class="ti ti-check"></i>
                            ${__("Submit")}
                        </button>
                    ` : ""}
                    <button class="btn btn-primary fv-form-save">
                        <i class="ti ti-device-floppy"></i>
                        ${__("Save")}
                    </button>
                </div>
            </div>
        `).appendTo($container);

        // Build form body with visual sections
        const $body = $('<div class="fv-form-body"></div>').appendTo($container);
        const $grid = $('<div class="fv-form-grid"></div>').appendTo($body);

        sections.forEach((section, index) => {
            const $section = $(`
                <div class="fv-form-section fv-fx-glass fv-fx-hover-lift" data-section="${index}">
                    <div class="fv-section-header">
                        <i class="ti ti-${section.icon || 'forms'}"></i>
                        <h4>${__(section.label || "Details")}</h4>
                        <button class="fv-section-toggle">
                            <i class="ti ti-chevron-up"></i>
                        </button>
                    </div>
                    <div class="fv-section-fields"></div>
                </div>
            `).appendTo($grid);

            const $fields = $section.find(".fv-section-fields");

            section.fields.forEach(field => {
                if (field.hidden || field.fieldtype === "Column Break") return;
                this._renderFormField($fields, field, doc);
            });

            // Toggle section
            $section.find(".fv-section-toggle").on("click", () => {
                $section.toggleClass("collapsed");
            });
        });

        // Linked documents sidebar
        if (name && options.showLinks !== false) {
            const $sidebar = $(`
                <div class="fv-form-sidebar fv-fx-glass">
                    <h4><i class="ti ti-link"></i> ${__("Linked Documents")}</h4>
                    <div class="fv-sidebar-links"></div>
                </div>
            `).appendTo($body);

            this._loadLinkedDocs($sidebar.find(".fv-sidebar-links"), doctype, name);
        }

        // Bind save action
        $header.find(".fv-form-save").on("click", async () => {
            const formData = this._collectFormData($container);
            try {
                const result = await frappe.call({
                    method: name ? "frappe.client.save" : "frappe.client.insert",
                    args: { doc: { doctype: doctype, name: name, ...formData } }
                });
                frappe.show_alert({ message: __("Saved successfully"), indicator: "green" });
                if (!name && result.message) {
                    // Redirect to saved doc
                    frappe.set_route("Form", doctype, result.message.name);
                }
            } catch (error) {
                frappe.msgprint({ title: __("Error"), indicator: "red", message: error.message });
            }
        });
    },

    /**
     * Show a quick entry dialog with modern UI
     * @param {string} doctype - DocType name
     * @param {Object} defaults - Default values
     * @param {Function} callback - Callback on save
     */
    async quickEntry(doctype, defaults = {}, callback = null) {
        const meta = await frappe.get_meta(doctype);
        
        // Get quick entry fields (reqd or in_list_view)
        const quickFields = meta.fields.filter(f => 
            (f.reqd || f.in_list_view) && 
            !["Section Break", "Column Break", "Tab Break", "Table"].includes(f.fieldtype) &&
            !f.hidden
        ).slice(0, 8);

        // Build dialog
        const $dialog = $(`
            <div class="fv-quick-entry-overlay">
                <div class="fv-quick-entry fv-fx-glass fv-fx-page-enter">
                    <div class="fv-qe-header">
                        <div class="fv-qe-icon">
                            <i class="ti ti-${this._getDocTypeIcon(doctype, meta)}"></i>
                        </div>
                        <div class="fv-qe-title">
                            <h3>${__("New")} ${__(doctype)}</h3>
                            <p>${__("Quick entry form")}</p>
                        </div>
                        <button class="fv-qe-close">
                            <i class="ti ti-x"></i>
                        </button>
                    </div>
                    <div class="fv-qe-body"></div>
                    <div class="fv-qe-footer">
                        <button class="btn btn-secondary fv-qe-cancel">${__("Cancel")}</button>
                        <button class="btn btn-default fv-qe-full">
                            <i class="ti ti-arrows-maximize"></i>
                            ${__("Full Form")}
                        </button>
                        <button class="btn btn-primary fv-qe-save">
                            <i class="ti ti-check"></i>
                            ${__("Save")}
                        </button>
                    </div>
                </div>
            </div>
        `).appendTo(document.body);

        const $body = $dialog.find(".fv-qe-body");

        // Render fields
        quickFields.forEach(field => {
            this._renderFormField($body, field, defaults);
        });

        // Bind events
        const close = () => {
            $dialog.addClass("fv-closing");
            setTimeout(() => $dialog.remove(), 300);
        };

        $dialog.find(".fv-qe-close, .fv-qe-cancel").on("click", close);
        $dialog.find(".fv-quick-entry-overlay").on("click", (e) => {
            if (e.target === e.currentTarget) close();
        });

        $dialog.find(".fv-qe-full").on("click", () => {
            close();
            frappe.new_doc(doctype, defaults);
        });

        $dialog.find(".fv-qe-save").on("click", async () => {
            const formData = this._collectFormData($dialog);
            try {
                const result = await frappe.call({
                    method: "frappe.client.insert",
                    args: { doc: { doctype: doctype, ...defaults, ...formData } }
                });
                frappe.show_alert({ message: __("Created successfully"), indicator: "green" });
                close();
                if (callback) callback(result.message);
            } catch (error) {
                frappe.msgprint({ title: __("Error"), indicator: "red", message: error.message });
            }
        });

        // Focus first input
        setTimeout(() => $dialog.find("input, select, textarea").first().focus(), 100);
    },

    /**
     * Show relationship explorer for a document
     * @param {HTMLElement} container - Target container
     * @param {string} doctype - DocType name
     * @param {string} name - Document name
     */
    async relationshipExplorer(container, doctype, name) {
        const $container = $(container);
        $container.empty().addClass("fv-relationship-explorer");

        // Load relationships using frappe.visual ERD component
        if (frappe.visual?.erd) {
            frappe.visual.erd($container[0], {
                doctype: doctype,
                document: name,
                depth: 2,
                height: 500
            });
        } else {
            // Fallback: show linked documents as cards
            const $header = $(`
                <div class="fv-rel-header fv-fx-glass">
                    <h3><i class="ti ti-hierarchy-2"></i> ${__("Relationships")}: ${name}</h3>
                </div>
            `).appendTo($container);

            const $body = $('<div class="fv-rel-body"></div>').appendTo($container);
            await this._loadLinkedDocs($body, doctype, name, true);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════

    _renderCards($container, records, doctype, meta, config) {
        $container.addClass("fv-view-cards");
        
        records.forEach(record => {
            const title = record[config.titleField] || record.name;
            const subtitle = config.subtitleField ? record[config.subtitleField] : "";
            const status = config.statusField ? record[config.statusField] : null;

            const $card = $(`
                <div class="fv-record-card fv-fx-glass fv-fx-hover-lift" data-name="${record.name}">
                    <div class="fv-card-body">
                        <div class="fv-card-title">${frappe.utils.escape_html(title)}</div>
                        ${subtitle ? `<div class="fv-card-subtitle">${frappe.utils.escape_html(subtitle)}</div>` : ""}
                        ${status ? `<span class="fv-card-status" data-status="${status}">${__(status)}</span>` : ""}
                    </div>
                    <div class="fv-card-footer">
                        <span class="fv-card-modified">${frappe.datetime.prettyDate(record.modified)}</span>
                        <div class="fv-card-actions">
                            <button class="fv-card-action fv-card-view" title="${__("View")}">
                                <i class="ti ti-eye"></i>
                            </button>
                            <button class="fv-card-action fv-card-edit" title="${__("Edit")}">
                                <i class="ti ti-pencil"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).appendTo($container);

            $card.find(".fv-card-view").on("click", (e) => {
                e.stopPropagation();
                frappe.set_route("Form", doctype, record.name);
            });

            $card.find(".fv-card-edit").on("click", (e) => {
                e.stopPropagation();
                frappe.set_route("Form", doctype, record.name);
            });

            $card.on("click", () => {
                frappe.set_route("Form", doctype, record.name);
            });
        });
    },

    _renderList($container, records, doctype, meta, config) {
        $container.addClass("fv-view-list").removeClass("fv-view-cards");

        const $table = $(`
            <table class="fv-list-table">
                <thead>
                    <tr>
                        <th>${__("Name")}</th>
                        ${config.fields.slice(0, 4).map(f => `<th>${__(meta.fields.find(mf => mf.fieldname === f)?.label || f)}</th>`).join("")}
                        <th>${__("Modified")}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `).appendTo($container);

        const $tbody = $table.find("tbody");

        records.forEach(record => {
            const $row = $(`
                <tr data-name="${record.name}">
                    <td><a href="/app/${frappe.router.slug(doctype)}/${record.name}">${record.name}</a></td>
                    ${config.fields.slice(0, 4).map(f => `<td>${frappe.utils.escape_html(record[f] || "")}</td>`).join("")}
                    <td>${frappe.datetime.prettyDate(record.modified)}</td>
                    <td>
                        <button class="btn btn-xs btn-default fv-list-edit">
                            <i class="ti ti-pencil"></i>
                        </button>
                    </td>
                </tr>
            `).appendTo($tbody);

            $row.find(".fv-list-edit").on("click", () => {
                frappe.set_route("Form", doctype, record.name);
            });
        });
    },

    _renderKanban($container, records, doctype, meta, config) {
        $container.addClass("fv-view-kanban").removeClass("fv-view-cards fv-view-list");

        // Find status field
        const statusField = config.statusField || 
            meta.fields.find(f => f.fieldtype === "Select" && f.in_list_view)?.fieldname ||
            "status";

        const statusMeta = meta.fields.find(f => f.fieldname === statusField);
        const statuses = statusMeta?.options?.split("\n").filter(s => s) || ["Open", "Closed"];

        const $kanban = $('<div class="fv-kanban-board"></div>').appendTo($container);

        statuses.forEach(status => {
            const statusRecords = records.filter(r => r[statusField] === status);
            
            $(`
                <div class="fv-kanban-column" data-status="${status}">
                    <div class="fv-kanban-header">
                        <span class="fv-kanban-title">${__(status)}</span>
                        <span class="fv-kanban-count">${statusRecords.length}</span>
                    </div>
                    <div class="fv-kanban-cards">
                        ${statusRecords.map(r => `
                            <div class="fv-kanban-card fv-fx-glass" data-name="${r.name}">
                                <div class="fv-kanban-card-title">${r.name}</div>
                                <div class="fv-kanban-card-meta">${frappe.datetime.prettyDate(r.modified)}</div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).appendTo($kanban);
        });

        // Card click
        $kanban.find(".fv-kanban-card").on("click", function() {
            frappe.set_route("Form", doctype, $(this).data("name"));
        });
    },

    _renderPagination($container, currentPage, totalPages, onPageChange) {
        $container.empty();
        if (totalPages <= 1) return;

        const $nav = $('<div class="fv-pagination"></div>').appendTo($container);

        // Previous
        $(`<button class="fv-page-btn" ${currentPage === 0 ? "disabled" : ""}>
            <i class="ti ti-chevron-right"></i>
        </button>`).appendTo($nav).on("click", () => {
            if (currentPage > 0) onPageChange(currentPage - 1);
        });

        // Page numbers
        const maxVisible = 5;
        let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible);
        if (end - start < maxVisible) start = Math.max(0, end - maxVisible);

        for (let i = start; i < end; i++) {
            $(`<button class="fv-page-btn ${i === currentPage ? "active" : ""}">${i + 1}</button>`)
                .appendTo($nav)
                .on("click", () => onPageChange(i));
        }

        // Next
        $(`<button class="fv-page-btn" ${currentPage >= totalPages - 1 ? "disabled" : ""}>
            <i class="ti ti-chevron-left"></i>
        </button>`).appendTo($nav).on("click", () => {
            if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
        });
    },

    _groupFormFields(fields) {
        const sections = [];
        let currentSection = { label: "", icon: "forms", fields: [] };

        fields.forEach(field => {
            if (field.fieldtype === "Section Break") {
                if (currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    label: field.label || "",
                    icon: this._getSectionIcon(field.label),
                    collapsible: field.collapsible,
                    fields: []
                };
            } else if (field.fieldtype === "Tab Break") {
                // Treat tabs as sections for now
                if (currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    label: field.label || "",
                    icon: "folder",
                    fields: []
                };
            } else {
                currentSection.fields.push(field);
            }
        });

        if (currentSection.fields.length > 0) {
            sections.push(currentSection);
        }

        return sections;
    },

    _renderFormField($container, field, doc) {
        const value = doc[field.fieldname] || field.default || "";
        const required = field.reqd ? '<span class="fv-required">*</span>' : "";
        let html = "";

        const fieldClass = `fv-field fv-field-${field.fieldtype.toLowerCase().replace(/\s/g, "-")}`;

        switch (field.fieldtype) {
            case "Data":
            case "Phone":
            case "Email":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <input type="${field.fieldtype === "Email" ? "email" : "text"}" 
                               name="${field.fieldname}" 
                               value="${frappe.utils.escape_html(value)}"
                               placeholder="${__(field.placeholder || field.label)}"
                               ${field.reqd ? "required" : ""}>
                        ${field.description ? `<span class="fv-field-desc">${__(field.description)}</span>` : ""}
                    </div>
                `;
                break;

            case "Int":
            case "Float":
            case "Currency":
            case "Percent":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <input type="number" 
                               name="${field.fieldname}" 
                               value="${value}"
                               step="${field.fieldtype === "Int" ? "1" : "0.01"}"
                               ${field.reqd ? "required" : ""}>
                    </div>
                `;
                break;

            case "Check":
                html = `
                    <div class="${fieldClass}">
                        <label class="fv-checkbox">
                            <input type="checkbox" name="${field.fieldname}" ${value ? "checked" : ""}>
                            <span>${__(field.label)}</span>
                        </label>
                    </div>
                `;
                break;

            case "Select":
                const options = (field.options || "").split("\n").filter(o => o);
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <select name="${field.fieldname}" ${field.reqd ? "required" : ""}>
                            <option value="">${__("Select...")}</option>
                            ${options.map(o => `<option value="${o}" ${value === o ? "selected" : ""}>${__(o)}</option>`).join("")}
                        </select>
                    </div>
                `;
                break;

            case "Link":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <div class="fv-link-field">
                            <input type="text" 
                                   name="${field.fieldname}" 
                                   value="${frappe.utils.escape_html(value)}"
                                   data-doctype="${field.options}"
                                   placeholder="${__("Search")} ${__(field.options)}..."
                                   autocomplete="off">
                            <button type="button" class="fv-link-search">
                                <i class="ti ti-search"></i>
                            </button>
                        </div>
                    </div>
                `;
                break;

            case "Date":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <input type="date" name="${field.fieldname}" value="${value}" ${field.reqd ? "required" : ""}>
                    </div>
                `;
                break;

            case "Datetime":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <input type="datetime-local" name="${field.fieldname}" value="${value}" ${field.reqd ? "required" : ""}>
                    </div>
                `;
                break;

            case "Time":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <input type="time" name="${field.fieldname}" value="${value}" ${field.reqd ? "required" : ""}>
                    </div>
                `;
                break;

            case "Text":
            case "Small Text":
            case "Long Text":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <textarea name="${field.fieldname}" 
                                  rows="${field.fieldtype === "Long Text" ? 6 : 3}"
                                  ${field.reqd ? "required" : ""}>${frappe.utils.escape_html(value)}</textarea>
                    </div>
                `;
                break;

            case "Text Editor":
            case "Markdown Editor":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <textarea name="${field.fieldname}" rows="6" class="fv-rich-text">${frappe.utils.escape_html(value)}</textarea>
                    </div>
                `;
                break;

            case "Attach":
            case "Attach Image":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <div class="fv-attach-field">
                            <input type="file" name="${field.fieldname}" ${field.fieldtype === "Attach Image" ? "accept='image/*'" : ""}>
                            ${value ? `<a href="${value}" target="_blank" class="fv-attach-link">${__("View file")}</a>` : ""}
                        </div>
                    </div>
                `;
                break;

            case "Color":
                html = `
                    <div class="${fieldClass}">
                        <label>${__(field.label)}${required}</label>
                        <input type="color" name="${field.fieldname}" value="${value || "#000000"}">
                    </div>
                `;
                break;

            default:
                // Skip unsupported field types
                return;
        }

        $container.append(html);

        // Initialize link field autocomplete
        if (field.fieldtype === "Link") {
            this._initLinkField($container.find(`[name="${field.fieldname}"]`), field.options);
        }
    },

    _initLinkField($input, doctype) {
        let timeout;
        const $wrapper = $input.closest(".fv-link-field");

        $input.on("input", function() {
            clearTimeout(timeout);
            const query = $(this).val();
            if (query.length < 2) return;

            timeout = setTimeout(async () => {
                const results = await frappe.call({
                    method: "frappe.client.get_list",
                    args: {
                        doctype: doctype,
                        filters: [["name", "like", `%${query}%`]],
                        fields: ["name"],
                        limit_page_length: 10
                    }
                });

                const items = results.message || [];
                
                // Remove existing dropdown
                $wrapper.find(".fv-link-dropdown").remove();

                if (items.length > 0) {
                    const $dropdown = $(`
                        <div class="fv-link-dropdown">
                            ${items.map(i => `<div class="fv-link-option" data-value="${i.name}">${i.name}</div>`).join("")}
                        </div>
                    `).appendTo($wrapper);

                    $dropdown.find(".fv-link-option").on("click", function() {
                        $input.val($(this).data("value"));
                        $dropdown.remove();
                    });
                }
            }, 200);
        });

        $input.on("blur", () => {
            setTimeout(() => $wrapper.find(".fv-link-dropdown").remove(), 200);
        });

        $wrapper.find(".fv-link-search").on("click", () => {
            frappe.set_route("List", doctype);
        });
    },

    _collectFormData($container) {
        const data = {};
        $container.find("[name]").each(function() {
            const $el = $(this);
            const name = $el.attr("name");
            if ($el.attr("type") === "checkbox") {
                data[name] = $el.is(":checked") ? 1 : 0;
            } else if ($el.attr("type") === "file") {
                // Handle file upload separately
            } else {
                data[name] = $el.val();
            }
        });
        return data;
    },

    async _fetchDoc(doctype, name) {
        const result = await frappe.call({
            method: "frappe.client.get",
            args: { doctype: doctype, name: name }
        });
        return result.message || {};
    },

    async _loadLinkedDocs($container, doctype, name, expanded = false) {
        try {
            const result = await frappe.call({
                method: "frappe.desk.form.utils.get_linked_docs",
                args: { doctype: doctype, name: name }
            });

            const links = result.message || {};
            $container.empty();

            Object.entries(links).forEach(([linkedDoctype, docs]) => {
                if (docs.length === 0) return;

                const $section = $(`
                    <div class="fv-linked-section ${expanded ? 'expanded' : ''}">
                        <div class="fv-linked-header">
                            <i class="ti ti-${this._getDocTypeIcon(linkedDoctype)}"></i>
                            <span>${__(linkedDoctype)}</span>
                            <span class="fv-linked-count">${docs.length}</span>
                        </div>
                        <div class="fv-linked-items">
                            ${docs.slice(0, expanded ? 100 : 5).map(d => `
                                <a href="/app/${frappe.router.slug(linkedDoctype)}/${d.name}" class="fv-linked-item">
                                    ${d.name}
                                </a>
                            `).join("")}
                            ${docs.length > (expanded ? 100 : 5) ? `<span class="fv-linked-more">+${docs.length - (expanded ? 100 : 5)} ${__("more")}</span>` : ""}
                        </div>
                    </div>
                `).appendTo($container);

                $section.find(".fv-linked-header").on("click", () => {
                    $section.toggleClass("expanded");
                });
            });

            if (Object.keys(links).length === 0) {
                $container.html(`<p class="fv-no-links">${__("No linked documents")}</p>`);
            }

        } catch (error) {
            $container.html(`<p class="fv-error">${__("Failed to load links")}</p>`);
        }
    },

    _getDocTypeIcon(doctype, meta = null) {
        const iconMap = {
            "User": "user",
            "Customer": "users",
            "Supplier": "building-store",
            "Item": "package",
            "Sales Order": "file-invoice",
            "Purchase Order": "shopping-cart",
            "Sales Invoice": "receipt",
            "Purchase Invoice": "receipt-2",
            "Stock Entry": "arrows-exchange",
            "Journal Entry": "notebook",
            "Employee": "id-badge",
            "Project": "folder",
            "Task": "checkbox",
            "Issue": "alert-circle",
            "Lead": "user-plus",
            "Opportunity": "target",
            "Quotation": "file-text",
        };

        if (iconMap[doctype]) return iconMap[doctype];
        if (meta?.icon) return meta.icon.replace("icon-", "").replace("octicon ", "");
        return "file";
    },

    _getSectionIcon(label) {
        if (!label) return "forms";
        const l = label.toLowerCase();
        if (l.includes("address")) return "map-pin";
        if (l.includes("contact")) return "phone";
        if (l.includes("account")) return "wallet";
        if (l.includes("tax")) return "receipt-tax";
        if (l.includes("shipping")) return "truck";
        if (l.includes("billing")) return "credit-card";
        if (l.includes("price")) return "tag";
        if (l.includes("detail")) return "list-details";
        if (l.includes("note")) return "notes";
        if (l.includes("setting")) return "settings";
        if (l.includes("more")) return "dots";
        return "forms";
    }
};

// ═══════════════════════════════════════════════════════════════════
// CSS STYLES
// ═══════════════════════════════════════════════════════════════════

(function() {
    if (document.getElementById("fv-doctype-styles")) return;

    const style = document.createElement("style");
    style.id = "fv-doctype-styles";
    style.textContent = `
        /* Cards List */
        .fv-doctype-cards {
            padding: 24px;
        }

        .fv-cards-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-radius: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .fv-cards-title {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .fv-cards-title i {
            font-size: 32px;
            color: var(--primary);
        }

        .fv-cards-title h3 {
            margin: 0;
        }

        .fv-cards-count {
            color: var(--text-muted);
            font-size: 14px;
        }

        .fv-cards-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .fv-cards-search {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--fg-color);
        }

        .fv-cards-search i {
            color: var(--text-muted);
        }

        .fv-cards-search input {
            border: none;
            outline: none;
            background: transparent;
            width: 180px;
        }

        .fv-cards-view-toggle {
            display: flex;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
        }

        .fv-view-btn {
            padding: 8px 12px;
            border: none;
            background: var(--fg-color);
            cursor: pointer;
            transition: all 0.2s;
        }

        .fv-view-btn:hover {
            background: var(--bg-light-gray);
        }

        .fv-view-btn.active {
            background: var(--primary);
            color: white;
        }

        /* Cards Grid */
        .fv-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }

        .fv-cards-grid.fv-view-list {
            display: block;
        }

        .fv-cards-grid.fv-view-kanban {
            display: block;
        }

        .fv-record-card {
            padding: 20px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .fv-card-title {
            font-weight: 600;
            margin-bottom: 4px;
        }

        .fv-card-subtitle {
            color: var(--text-muted);
            font-size: 13px;
        }

        .fv-card-status {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 11px;
            margin-top: 8px;
            background: var(--bg-light-gray);
        }

        .fv-card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color);
        }

        .fv-card-modified {
            color: var(--text-muted);
            font-size: 12px;
        }

        .fv-card-actions {
            display: flex;
            gap: 8px;
        }

        .fv-card-action {
            padding: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 6px;
            color: var(--text-muted);
            transition: all 0.2s;
        }

        .fv-card-action:hover {
            background: var(--bg-light-gray);
            color: var(--primary);
        }

        /* List View */
        .fv-list-table {
            width: 100%;
            border-collapse: collapse;
        }

        .fv-list-table th {
            text-align: start;
            padding: 12px 16px;
            background: var(--bg-light-gray);
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--text-muted);
        }

        .fv-list-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .fv-list-table tr:hover {
            background: var(--bg-light-gray);
        }

        /* Kanban View */
        .fv-kanban-board {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 16px;
        }

        .fv-kanban-column {
            min-width: 280px;
            background: var(--bg-light-gray);
            border-radius: 12px;
            padding: 16px;
        }

        .fv-kanban-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .fv-kanban-title {
            font-weight: 600;
        }

        .fv-kanban-count {
            background: var(--fg-color);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
        }

        .fv-kanban-cards {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .fv-kanban-card {
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
        }

        .fv-kanban-card-title {
            font-weight: 500;
            margin-bottom: 4px;
        }

        .fv-kanban-card-meta {
            font-size: 11px;
            color: var(--text-muted);
        }

        /* Empty & Error States */
        .fv-cards-empty,
        .fv-cards-error,
        .fv-cards-loading {
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px;
            text-align: center;
            border-radius: 16px;
        }

        .fv-cards-empty i,
        .fv-cards-error i {
            font-size: 48px;
            color: var(--text-muted);
            margin-bottom: 16px;
        }

        .fv-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: fv-spin 1s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes fv-spin {
            to { transform: rotate(360deg); }
        }

        /* Pagination */
        .fv-cards-pagination {
            margin-top: 24px;
        }

        .fv-pagination {
            display: flex;
            justify-content: center;
            gap: 8px;
        }

        .fv-page-btn {
            padding: 8px 14px;
            border: 1px solid var(--border-color);
            background: var(--fg-color);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .fv-page-btn:hover:not(:disabled) {
            background: var(--bg-light-gray);
        }

        .fv-page-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .fv-page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Visual Form */
        .fv-visual-form {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .fv-form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-radius: 16px;
            margin-bottom: 24px;
        }

        .fv-form-title {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .fv-form-title i {
            font-size: 32px;
            color: var(--primary);
        }

        .fv-form-title h2 {
            margin: 0;
        }

        .fv-form-modified {
            color: var(--text-muted);
            font-size: 13px;
        }

        .fv-form-actions {
            display: flex;
            gap: 12px;
        }

        .fv-form-body {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 24px;
        }

        @media (max-width: 1024px) {
            .fv-form-body {
                grid-template-columns: 1fr;
            }
        }

        .fv-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }

        .fv-form-section {
            padding: 20px;
            border-radius: 16px;
        }

        .fv-form-section.collapsed .fv-section-fields {
            display: none;
        }

        .fv-form-section.collapsed .fv-section-toggle i {
            transform: rotate(180deg);
        }

        .fv-section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .fv-section-header i {
            color: var(--primary);
        }

        .fv-section-header h4 {
            flex: 1;
            margin: 0;
        }

        .fv-section-toggle {
            padding: 4px;
            border: none;
            background: transparent;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .fv-section-fields {
            display: grid;
            gap: 16px;
        }

        .fv-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .fv-field label {
            font-weight: 500;
            font-size: 13px;
        }

        .fv-required {
            color: var(--red-500);
        }

        .fv-field input,
        .fv-field select,
        .fv-field textarea {
            padding: 10px 14px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 14px;
            background: var(--fg-color);
            transition: border-color 0.2s;
        }

        .fv-field input:focus,
        .fv-field select:focus,
        .fv-field textarea:focus {
            border-color: var(--primary);
            outline: none;
        }

        .fv-field-desc {
            font-size: 11px;
            color: var(--text-muted);
        }

        .fv-checkbox {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }

        .fv-checkbox input {
            width: 18px;
            height: 18px;
        }

        .fv-link-field {
            display: flex;
            gap: 8px;
            position: relative;
        }

        .fv-link-field input {
            flex: 1;
        }

        .fv-link-search {
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--fg-color);
            cursor: pointer;
        }

        .fv-link-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 40px;
            background: var(--fg-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-top: 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 100;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .fv-link-option {
            padding: 10px 14px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .fv-link-option:hover {
            background: var(--bg-light-gray);
        }

        /* Sidebar */
        .fv-form-sidebar {
            padding: 20px;
            border-radius: 16px;
            height: fit-content;
        }

        .fv-form-sidebar h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 16px;
        }

        .fv-linked-section {
            margin-bottom: 12px;
        }

        .fv-linked-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.2s;
        }

        .fv-linked-header:hover {
            background: var(--bg-light-gray);
        }

        .fv-linked-count {
            margin-inline-start: auto;
            background: var(--primary-light);
            color: var(--primary);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        }

        .fv-linked-items {
            display: none;
            padding-inline-start: 32px;
        }

        .fv-linked-section.expanded .fv-linked-items {
            display: block;
        }

        .fv-linked-item {
            display: block;
            padding: 6px 0;
            font-size: 13px;
            color: var(--text-color);
            text-decoration: none;
        }

        .fv-linked-item:hover {
            color: var(--primary);
        }

        .fv-linked-more {
            font-size: 12px;
            color: var(--text-muted);
        }

        /* Quick Entry Dialog */
        .fv-quick-entry-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1050;
            animation: fv-fade-in 0.2s ease;
        }

        .fv-quick-entry-overlay.fv-closing {
            animation: fv-fade-out 0.2s ease forwards;
        }

        @keyframes fv-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fv-fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        .fv-quick-entry {
            width: 500px;
            max-width: 95vw;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 20px;
            animation: fv-slide-up 0.3s ease;
        }

        @keyframes fv-slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .fv-qe-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
        }

        .fv-qe-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--primary-light);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .fv-qe-icon i {
            font-size: 24px;
            color: var(--primary);
        }

        .fv-qe-title {
            flex: 1;
        }

        .fv-qe-title h3 {
            margin: 0;
        }

        .fv-qe-title p {
            margin: 2px 0 0;
            color: var(--text-muted);
            font-size: 13px;
        }

        .fv-qe-close {
            padding: 8px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 8px;
            transition: background 0.2s;
        }

        .fv-qe-close:hover {
            background: var(--bg-light-gray);
        }

        .fv-qe-body {
            padding: 24px;
            display: grid;
            gap: 16px;
        }

        .fv-qe-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid var(--border-color);
        }

        /* RTL */
        [dir="rtl"] .fv-cards-header,
        [dir="rtl"] .fv-form-header,
        [dir="rtl"] .fv-qe-header {
            flex-direction: row-reverse;
        }

        [dir="rtl"] .fv-cards-title,
        [dir="rtl"] .fv-form-title {
            flex-direction: row-reverse;
        }

        [dir="rtl"] .fv-card-footer {
            flex-direction: row-reverse;
        }
    `;
    document.head.appendChild(style);
})();
