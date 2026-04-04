// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — App Page Generator
 * ===================================
 * Automatically generates visual pages for any Frappe app:
 * - About page with hero, features, app map, ERD
 * - Settings page with visual configuration
 * - Reports hub with visual report cards
 * - Onboarding wizard
 */

frappe.provide("frappe.visual.generator");

frappe.visual.generator = {
    /**
     * Generate a complete "About" page for any app
     * @param {HTMLElement} container - Target container
     * @param {string} appName - App name (e.g., "erpnext")
     * @param {Object} options - Additional options
     */
    async aboutPage(container, appName, options = {}) {
        const $container = $(container);
        $container.empty().addClass("fv-generated-page fv-fx-page-enter");

        // Show loading
        const $loading = $(`
            <div class="fv-gen-loading">
                <div class="fv-gen-spinner"></div>
                <p>${__("Generating page for")} ${appName}...</p>
            </div>
        `).appendTo($container);

        try {
            // Fetch app info
            const appInfo = await this._fetchAppInfo(appName);
            $loading.remove();

            // Build sections
            this._renderHeroSection($container, appInfo, options);
            this._renderFeaturesSection($container, appInfo, options);
            this._renderAppMapSection($container, appInfo, options);
            this._renderERDSection($container, appInfo, options);
            this._renderRolesSection($container, appInfo, options);
            this._renderCTASection($container, appInfo, options);

            // Initialize animations
            this._initAnimations($container);

        } catch (error) {
            $loading.html(`
                <div class="fv-gen-error">
                    <i class="ti ti-alert-triangle"></i>
                    <p>${__("Failed to load app info")}: ${error.message}</p>
                </div>
            `);
        }
    },

    /**
     * Generate a visual settings page
     * @param {HTMLElement} container - Target container
     * @param {string} settingsDoctype - Settings DocType name
     * @param {Object} options - Additional options
     */
    async settingsPage(container, settingsDoctype, options = {}) {
        const $container = $(container);
        $container.empty().addClass("fv-generated-page fv-settings-page");

        try {
            const meta = await this._fetchDocTypeMeta(settingsDoctype);
            const doc = await this._fetchSingleDoc(settingsDoctype);

            // Group fields by fieldtype and section
            const sections = this._groupFieldsIntoSections(meta.fields);

            // Render header
            $container.append(`
                <div class="fv-settings-header fv-fx-glass">
                    <div class="fv-settings-icon">
                        <i class="ti ti-settings"></i>
                    </div>
                    <div class="fv-settings-info">
                        <h2>${__(meta.name)}</h2>
                        <p>${__(meta.description || "Configure your settings")}</p>
                    </div>
                    <div class="fv-settings-actions">
                        <button class="btn btn-primary fv-save-settings">
                            <i class="ti ti-device-floppy"></i>
                            ${__("Save")}
                        </button>
                    </div>
                </div>
            `);

            // Render sections as visual cards
            const $grid = $('<div class="fv-settings-grid"></div>').appendTo($container);

            sections.forEach((section, index) => {
                const $card = $(`
                    <div class="fv-settings-card fv-fx-glass fv-fx-hover-lift" data-section="${index}">
                        <div class="fv-card-header">
                            <i class="ti ti-${section.icon || 'settings'}"></i>
                            <h4>${__(section.label || "General")}</h4>
                        </div>
                        <div class="fv-card-fields"></div>
                    </div>
                `).appendTo($grid);

                const $fields = $card.find(".fv-card-fields");
                section.fields.forEach(field => {
                    this._renderSettingsField($fields, field, doc);
                });
            });

            // Bind save action
            $container.find(".fv-save-settings").on("click", () => {
                this._saveSettings($container, settingsDoctype);
            });

        } catch (error) {
            $container.html(`
                <div class="fv-gen-error fv-fx-glass">
                    <i class="ti ti-alert-triangle"></i>
                    <p>${__("Failed to load settings")}: ${error.message}</p>
                </div>
            `);
        }
    },

    /**
     * Generate a visual reports hub
     * @param {HTMLElement} container - Target container
     * @param {string} module - Module name to filter reports
     * @param {Object} options - Additional options
     */
    async reportsHub(container, module, options = {}) {
        const $container = $(container);
        $container.empty().addClass("fv-generated-page fv-reports-hub");

        try {
            const reports = await this._fetchReports(module);

            // Render header
            $container.append(`
                <div class="fv-reports-header fv-fx-glass">
                    <div class="fv-reports-icon">
                        <i class="ti ti-report-analytics"></i>
                    </div>
                    <div class="fv-reports-info">
                        <h2>${__("Reports Hub")}</h2>
                        <p>${__(module)} — ${reports.length} ${__("reports available")}</p>
                    </div>
                    <div class="fv-reports-search">
                        <i class="ti ti-search"></i>
                        <input type="text" placeholder="${__("Search reports...")}">
                    </div>
                </div>
            `);

            // Group reports by category
            const categories = this._groupReportsByCategory(reports);

            const $grid = $('<div class="fv-reports-grid"></div>').appendTo($container);

            Object.entries(categories).forEach(([category, catReports]) => {
                const $section = $(`
                    <div class="fv-reports-section">
                        <h3 class="fv-reports-category">
                            <i class="ti ti-folder"></i>
                            ${__(category)}
                            <span class="fv-reports-count">${catReports.length}</span>
                        </h3>
                        <div class="fv-reports-cards"></div>
                    </div>
                `).appendTo($grid);

                const $cards = $section.find(".fv-reports-cards");

                catReports.forEach(report => {
                    $(`
                        <div class="fv-report-card fv-fx-glass fv-fx-hover-lift" 
                             data-report="${report.name}"
                             data-type="${report.report_type}">
                            <div class="fv-report-icon">
                                <i class="ti ti-${this._getReportIcon(report.report_type)}"></i>
                            </div>
                            <div class="fv-report-info">
                                <h4>${__(report.report_name)}</h4>
                                <p>${__(report.description || report.report_type)}</p>
                            </div>
                            <div class="fv-report-badge">
                                ${report.is_standard ? `<span class="badge badge-info">${__("Standard")}</span>` : ""}
                            </div>
                        </div>
                    `).appendTo($cards).on("click", () => {
                        frappe.set_route("query-report", report.name);
                    });
                });
            });

            // Bind search
            $container.find(".fv-reports-search input").on("input", (e) => {
                const query = e.target.value.toLowerCase();
                $container.find(".fv-report-card").each(function() {
                    const text = $(this).text().toLowerCase();
                    $(this).toggle(text.includes(query));
                });
            });

        } catch (error) {
            $container.html(`
                <div class="fv-gen-error fv-fx-glass">
                    <i class="ti ti-alert-triangle"></i>
                    <p>${__("Failed to load reports")}: ${error.message}</p>
                </div>
            `);
        }
    },

    /**
     * Generate an onboarding wizard for any app
     * @param {HTMLElement} container - Target container
     * @param {string} appName - App name
     * @param {Array} steps - Wizard steps configuration
     */
    onboardingWizard(container, appName, steps) {
        const $container = $(container);
        $container.empty().addClass("fv-generated-page fv-onboarding-wizard");

        let currentStep = 0;

        const $wizard = $(`
            <div class="fv-wizard-container fv-fx-glass">
                <div class="fv-wizard-header">
                    <h2>${__("Welcome to")} ${appName}</h2>
                    <p>${__("Let's get you started with a quick tour")}</p>
                </div>
                <div class="fv-wizard-progress">
                    ${steps.map((s, i) => `
                        <div class="fv-wizard-step ${i === 0 ? 'active' : ''}" data-step="${i}">
                            <div class="fv-step-dot">
                                <i class="ti ti-${s.icon || 'circle'}"></i>
                            </div>
                            <span class="fv-step-label">${__(s.title)}</span>
                        </div>
                    `).join("")}
                </div>
                <div class="fv-wizard-content"></div>
                <div class="fv-wizard-nav">
                    <button class="btn btn-secondary fv-wizard-prev" disabled>
                        <i class="ti ti-chevron-right"></i>
                        ${__("Previous")}
                    </button>
                    <button class="btn btn-primary fv-wizard-next">
                        ${__("Next")}
                        <i class="ti ti-chevron-left"></i>
                    </button>
                </div>
            </div>
        `).appendTo($container);

        const $content = $wizard.find(".fv-wizard-content");
        const $prev = $wizard.find(".fv-wizard-prev");
        const $next = $wizard.find(".fv-wizard-next");

        const renderStep = (index) => {
            const step = steps[index];
            $content.empty();

            // Update progress
            $wizard.find(".fv-wizard-step").removeClass("active completed");
            $wizard.find(".fv-wizard-step").each(function(i) {
                if (i < index) $(this).addClass("completed");
                if (i === index) $(this).addClass("active");
            });

            // Render step content
            const $stepContent = $(`
                <div class="fv-step-content fv-fx-page-enter">
                    <div class="fv-step-icon">
                        <i class="ti ti-${step.icon || 'info-circle'}"></i>
                    </div>
                    <h3>${__(step.title)}</h3>
                    <p>${__(step.description)}</p>
                    <div class="fv-step-body"></div>
                </div>
            `).appendTo($content);

            // Render step-specific content
            if (step.component === "app-map" && frappe.visual?.appMap) {
                frappe.visual.appMap($stepContent.find(".fv-step-body")[0], {
                    app: step.app || appName,
                    layout: "elk-layered",
                    height: 400
                });
            } else if (step.component === "erd" && frappe.visual?.erd) {
                frappe.visual.erd($stepContent.find(".fv-step-body")[0], {
                    doctype: step.doctype,
                    height: 400
                });
            } else if (step.html) {
                $stepContent.find(".fv-step-body").html(step.html);
            } else if (step.video) {
                $stepContent.find(".fv-step-body").html(`
                    <video src="${step.video}" controls class="fv-step-video"></video>
                `);
            } else if (step.image) {
                $stepContent.find(".fv-step-body").html(`
                    <img src="${step.image}" alt="${step.title}" class="fv-step-image">
                `);
            }

            // Update navigation
            $prev.prop("disabled", index === 0);
            if (index === steps.length - 1) {
                $next.html(`<i class="ti ti-check"></i> ${__("Finish")}`);
            } else {
                $next.html(`${__("Next")} <i class="ti ti-chevron-left"></i>`);
            }
        };

        // Navigation handlers
        $prev.on("click", () => {
            if (currentStep > 0) {
                currentStep--;
                renderStep(currentStep);
            }
        });

        $next.on("click", () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                renderStep(currentStep);
            } else {
                // Wizard complete
                frappe.show_alert({
                    message: __("Onboarding complete!"),
                    indicator: "green"
                });
                if (steps[currentStep].onComplete) {
                    steps[currentStep].onComplete();
                }
            }
        });

        // Render first step
        renderStep(0);
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════

    async _fetchAppInfo(appName) {
        const result = await frappe.call({
            method: "frappe_visual.api.get_app_info",
            args: { app_name: appName }
        });
        return result.message || {};
    },

    async _fetchDocTypeMeta(doctype) {
        return frappe.get_meta(doctype);
    },

    async _fetchSingleDoc(doctype) {
        const result = await frappe.call({
            method: "frappe.client.get",
            args: { doctype: doctype }
        });
        return result.message || {};
    },

    async _fetchReports(module) {
        const result = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Report",
                filters: { module: module, disabled: 0 },
                fields: ["name", "report_name", "report_type", "description", "is_standard"],
                limit_page_length: 0
            }
        });
        return result.message || [];
    },

    _groupFieldsIntoSections(fields) {
        const sections = [];
        let currentSection = { label: "General", icon: "settings", fields: [] };

        fields.forEach(field => {
            if (field.fieldtype === "Section Break") {
                if (currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    label: field.label || "Section",
                    icon: this._getSectionIcon(field.label),
                    fields: []
                };
            } else if (!["Column Break", "Tab Break"].includes(field.fieldtype) && !field.hidden) {
                currentSection.fields.push(field);
            }
        });

        if (currentSection.fields.length > 0) {
            sections.push(currentSection);
        }

        return sections;
    },

    _groupReportsByCategory(reports) {
        const categories = {};
        reports.forEach(report => {
            const category = report.report_type || "Other";
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(report);
        });
        return categories;
    },

    _renderHeroSection($container, appInfo, options) {
        const color = options.color || appInfo.color || "#6366f1";
        $container.append(`
            <section class="fv-gen-hero" style="--app-color: ${color}">
                <div class="fv-gen-hero-bg"></div>
                <div class="fv-gen-hero-content">
                    ${appInfo.logo ? `<img src="${appInfo.logo}" alt="${appInfo.title}" class="fv-gen-hero-logo">` : 
                      `<div class="fv-gen-hero-icon"><i class="ti ti-${appInfo.icon || 'apps'}"></i></div>`}
                    <h1>${__(appInfo.title || appInfo.name)}</h1>
                    <p class="fv-gen-hero-tagline">${__(appInfo.description || "")}</p>
                    <div class="fv-gen-hero-stats">
                        <div class="fv-stat">
                            <span class="fv-stat-value">${appInfo.modules_count || 0}</span>
                            <span class="fv-stat-label">${__("Modules")}</span>
                        </div>
                        <div class="fv-stat">
                            <span class="fv-stat-value">${appInfo.doctypes_count || 0}</span>
                            <span class="fv-stat-label">${__("DocTypes")}</span>
                        </div>
                        <div class="fv-stat">
                            <span class="fv-stat-value">${appInfo.reports_count || 0}</span>
                            <span class="fv-stat-label">${__("Reports")}</span>
                        </div>
                    </div>
                </div>
            </section>
        `);
    },

    _renderFeaturesSection($container, appInfo, options) {
        const features = options.features || appInfo.features || [];
        if (features.length === 0) return;

        $container.append(`
            <section class="fv-gen-features">
                <h2 class="fv-gen-section-title">
                    <i class="ti ti-sparkles"></i>
                    ${__("Key Features")}
                </h2>
                <div class="fv-gen-features-grid">
                    ${features.map(f => `
                        <div class="fv-gen-feature-card fv-fx-glass fv-fx-hover-lift">
                            <div class="fv-feature-icon">
                                <i class="ti ti-${f.icon || 'check'}"></i>
                            </div>
                            <h4>${__(f.title)}</h4>
                            <p>${__(f.description)}</p>
                        </div>
                    `).join("")}
                </div>
            </section>
        `);
    },

    _renderAppMapSection($container, appInfo, options) {
        if (options.hideAppMap) return;

        const $section = $(`
            <section class="fv-gen-appmap">
                <h2 class="fv-gen-section-title">
                    <i class="ti ti-sitemap"></i>
                    ${__("Application Structure")}
                </h2>
                <div class="fv-gen-appmap-container fv-fx-glass"></div>
            </section>
        `).appendTo($container);

        // Initialize app map if available
        setTimeout(() => {
            if (frappe.visual?.appMap) {
                frappe.visual.appMap($section.find(".fv-gen-appmap-container")[0], {
                    app: appInfo.name,
                    layout: "elk-layered",
                    height: 500
                });
            }
        }, 100);
    },

    _renderERDSection($container, appInfo, options) {
        if (options.hideERD || !options.mainDoctype) return;

        const $section = $(`
            <section class="fv-gen-erd">
                <h2 class="fv-gen-section-title">
                    <i class="ti ti-hierarchy-2"></i>
                    ${__("Data Relationships")}
                </h2>
                <div class="fv-gen-erd-container fv-fx-glass"></div>
            </section>
        `).appendTo($container);

        setTimeout(() => {
            if (frappe.visual?.erd) {
                frappe.visual.erd($section.find(".fv-gen-erd-container")[0], {
                    doctype: options.mainDoctype,
                    height: 400
                });
            }
        }, 100);
    },

    _renderRolesSection($container, appInfo, options) {
        const roles = options.roles || appInfo.roles || [];
        if (roles.length === 0) return;

        $container.append(`
            <section class="fv-gen-roles">
                <h2 class="fv-gen-section-title">
                    <i class="ti ti-users"></i>
                    ${__("User Roles")}
                </h2>
                <div class="fv-gen-roles-grid">
                    ${roles.map(r => `
                        <div class="fv-gen-role-card fv-fx-glass">
                            <div class="fv-role-icon">
                                <i class="ti ti-${r.icon || 'user'}"></i>
                            </div>
                            <h4>${__(r.name)}</h4>
                            <p>${__(r.description || "")}</p>
                            <ul class="fv-role-permissions">
                                ${(r.permissions || []).map(p => `<li><i class="ti ti-check"></i> ${__(p)}</li>`).join("")}
                            </ul>
                        </div>
                    `).join("")}
                </div>
            </section>
        `);
    },

    _renderCTASection($container, appInfo, options) {
        const buttons = options.ctaButtons || [
            { label: __("Get Started"), primary: true, route: `/app/${appInfo.name}` },
            { label: __("Documentation"), route: `/docs/${appInfo.name}` }
        ];

        $container.append(`
            <section class="fv-gen-cta fv-fx-glass">
                <h3>${__("Ready to get started?")}</h3>
                <p>${__("Explore all the features and capabilities")}</p>
                <div class="fv-gen-cta-buttons">
                    ${buttons.map(b => `
                        <button class="btn ${b.primary ? 'btn-primary' : 'btn-secondary'} fv-cta-btn"
                                data-route="${b.route || '#'}" data-action="${b.action || ''}">
                            ${b.icon ? `<i class="ti ti-${b.icon}"></i>` : ''}
                            ${__(b.label)}
                        </button>
                    `).join("")}
                </div>
            </section>
        `);

        $container.find(".fv-cta-btn").on("click", function() {
            const route = $(this).data("route");
            const action = $(this).data("action");
            if (action && typeof window[action] === "function") {
                window[action]();
            } else if (route && route !== "#") {
                frappe.set_route(route);
            }
        });
    },

    _renderSettingsField($container, field, doc) {
        const value = doc[field.fieldname] || field.default || "";
        let html = "";

        switch (field.fieldtype) {
            case "Check":
                html = `
                    <label class="fv-setting-check">
                        <input type="checkbox" name="${field.fieldname}" ${value ? "checked" : ""}>
                        <span>${__(field.label)}</span>
                    </label>
                `;
                break;
            case "Select":
                const options = (field.options || "").split("\n");
                html = `
                    <div class="fv-setting-field">
                        <label>${__(field.label)}</label>
                        <select name="${field.fieldname}">
                            ${options.map(o => `<option value="${o}" ${value === o ? "selected" : ""}>${__(o)}</option>`).join("")}
                        </select>
                    </div>
                `;
                break;
            case "Int":
            case "Float":
            case "Currency":
                html = `
                    <div class="fv-setting-field">
                        <label>${__(field.label)}</label>
                        <input type="number" name="${field.fieldname}" value="${value}">
                    </div>
                `;
                break;
            case "Password":
                html = `
                    <div class="fv-setting-field">
                        <label>${__(field.label)}</label>
                        <input type="password" name="${field.fieldname}" value="${value}">
                    </div>
                `;
                break;
            case "Text":
            case "Small Text":
            case "Long Text":
                html = `
                    <div class="fv-setting-field">
                        <label>${__(field.label)}</label>
                        <textarea name="${field.fieldname}" rows="3">${value}</textarea>
                    </div>
                `;
                break;
            default:
                html = `
                    <div class="fv-setting-field">
                        <label>${__(field.label)}</label>
                        <input type="text" name="${field.fieldname}" value="${value}">
                    </div>
                `;
        }

        if (field.description) {
            html += `<p class="fv-setting-desc">${__(field.description)}</p>`;
        }

        $container.append(html);
    },

    async _saveSettings($container, doctype) {
        const data = {};
        $container.find("[name]").each(function() {
            const $el = $(this);
            const name = $el.attr("name");
            if ($el.attr("type") === "checkbox") {
                data[name] = $el.is(":checked") ? 1 : 0;
            } else {
                data[name] = $el.val();
            }
        });

        try {
            await frappe.call({
                method: "frappe.client.save",
                args: { doc: { doctype: doctype, ...data } }
            });
            frappe.show_alert({
                message: __("Settings saved successfully"),
                indicator: "green"
            });
        } catch (error) {
            frappe.msgprint({
                title: __("Error"),
                indicator: "red",
                message: error.message
            });
        }
    },

    _getSectionIcon(label) {
        const iconMap = {
            "general": "settings",
            "display": "eye",
            "license": "key",
            "theme": "palette",
            "notifications": "bell",
            "email": "mail",
            "security": "shield",
            "api": "api",
            "integration": "plug",
            "advanced": "adjustments"
        };
        const key = (label || "").toLowerCase();
        for (const [k, v] of Object.entries(iconMap)) {
            if (key.includes(k)) return v;
        }
        return "settings";
    },

    _getReportIcon(reportType) {
        const iconMap = {
            "Report Builder": "table",
            "Query Report": "database",
            "Script Report": "code",
            "Custom": "wand"
        };
        return iconMap[reportType] || "file-analytics";
    },

    _initAnimations($container) {
        // Stagger animation for cards
        if (typeof gsap !== "undefined") {
            gsap.from($container.find(".fv-fx-glass").toArray(), {
                y: 30,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power2.out"
            });
        }
    }
};

// ═══════════════════════════════════════════════════════════════════
// CSS STYLES
// ═══════════════════════════════════════════════════════════════════

(function() {
    if (document.getElementById("fv-generator-styles")) return;

    const style = document.createElement("style");
    style.id = "fv-generator-styles";
    style.textContent = `
        /* Generator Base */
        .fv-generated-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
        }

        /* Loading */
        .fv-gen-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--text-muted);
        }

        .fv-gen-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: fv-spin 1s linear infinite;
        }

        @keyframes fv-spin {
            to { transform: rotate(360deg); }
        }

        /* Error */
        .fv-gen-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px;
            text-align: center;
            color: var(--red-500);
        }

        .fv-gen-error i {
            font-size: 48px;
            margin-bottom: 16px;
        }

        /* Hero */
        .fv-gen-hero {
            position: relative;
            padding: 80px 40px;
            border-radius: 24px;
            text-align: center;
            color: white;
            overflow: hidden;
            margin-bottom: 48px;
            background: linear-gradient(135deg, var(--app-color) 0%, color-mix(in srgb, var(--app-color) 70%, #000) 100%);
        }

        .fv-gen-hero-bg {
            position: absolute;
            inset: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.5;
        }

        .fv-gen-hero-content {
            position: relative;
            z-index: 1;
        }

        .fv-gen-hero-logo {
            width: 100px;
            height: 100px;
            margin-bottom: 24px;
        }

        .fv-gen-hero-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border-radius: 20px;
            background: rgba(255,255,255,0.2);
            margin-bottom: 24px;
        }

        .fv-gen-hero-icon i {
            font-size: 40px;
        }

        .fv-gen-hero h1 {
            margin: 0;
            font-size: 42px;
            font-weight: 800;
        }

        .fv-gen-hero-tagline {
            font-size: 18px;
            opacity: 0.9;
            margin: 12px 0 32px;
        }

        .fv-gen-hero-stats {
            display: flex;
            justify-content: center;
            gap: 48px;
        }

        .fv-stat {
            display: flex;
            flex-direction: column;
        }

        .fv-stat-value {
            font-size: 32px;
            font-weight: 700;
        }

        .fv-stat-label {
            font-size: 14px;
            opacity: 0.8;
        }

        /* Section Title */
        .fv-gen-section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 24px;
            font-size: 24px;
            font-weight: 700;
        }

        .fv-gen-section-title i {
            color: var(--primary);
        }

        /* Features */
        .fv-gen-features {
            margin-bottom: 48px;
        }

        .fv-gen-features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
        }

        .fv-gen-feature-card {
            padding: 32px 24px;
            text-align: center;
            border-radius: 20px;
        }

        .fv-feature-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 14px;
            background: var(--primary-light, rgba(99, 102, 241, 0.1));
            margin-bottom: 16px;
        }

        .fv-feature-icon i {
            font-size: 28px;
            color: var(--primary);
        }

        .fv-gen-feature-card h4 {
            margin: 0 0 8px;
            font-size: 18px;
        }

        .fv-gen-feature-card p {
            margin: 0;
            color: var(--text-muted);
            font-size: 14px;
        }

        /* App Map & ERD */
        .fv-gen-appmap,
        .fv-gen-erd {
            margin-bottom: 48px;
        }

        .fv-gen-appmap-container,
        .fv-gen-erd-container {
            min-height: 400px;
            border-radius: 20px;
            padding: 20px;
        }

        /* Roles */
        .fv-gen-roles {
            margin-bottom: 48px;
        }

        .fv-gen-roles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
        }

        .fv-gen-role-card {
            padding: 24px;
            border-radius: 16px;
        }

        .fv-role-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--primary-light);
            margin-bottom: 16px;
        }

        .fv-role-icon i {
            font-size: 24px;
            color: var(--primary);
        }

        .fv-gen-role-card h4 {
            margin: 0 0 8px;
        }

        .fv-gen-role-card > p {
            color: var(--text-muted);
            font-size: 14px;
            margin: 0 0 16px;
        }

        .fv-role-permissions {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .fv-role-permissions li {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            font-size: 13px;
            color: var(--text-muted);
        }

        .fv-role-permissions i {
            color: var(--green-500);
        }

        /* CTA */
        .fv-gen-cta {
            text-align: center;
            padding: 48px;
            border-radius: 24px;
            margin-top: 48px;
        }

        .fv-gen-cta h3 {
            margin: 0 0 8px;
            font-size: 28px;
        }

        .fv-gen-cta > p {
            color: var(--text-muted);
            margin: 0 0 24px;
        }

        .fv-gen-cta-buttons {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        /* Settings Page */
        .fv-settings-header {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
        }

        .fv-settings-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 14px;
            background: var(--primary-light);
        }

        .fv-settings-icon i {
            font-size: 28px;
            color: var(--primary);
        }

        .fv-settings-info {
            flex: 1;
        }

        .fv-settings-info h2 {
            margin: 0;
        }

        .fv-settings-info p {
            margin: 4px 0 0;
            color: var(--text-muted);
        }

        .fv-settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 24px;
        }

        .fv-settings-card {
            padding: 24px;
            border-radius: 16px;
        }

        .fv-settings-card .fv-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .fv-settings-card .fv-card-header i {
            font-size: 20px;
            color: var(--primary);
        }

        .fv-settings-card .fv-card-header h4 {
            margin: 0;
            font-size: 16px;
        }

        .fv-setting-field {
            margin-bottom: 16px;
        }

        .fv-setting-field label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            font-size: 13px;
        }

        .fv-setting-field input,
        .fv-setting-field select,
        .fv-setting-field textarea {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 14px;
            background: var(--fg-color);
        }

        .fv-setting-check {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 8px 0;
        }

        .fv-setting-check input {
            width: 18px;
            height: 18px;
        }

        .fv-setting-desc {
            margin: 4px 0 16px;
            font-size: 12px;
            color: var(--text-muted);
        }

        /* Reports Hub */
        .fv-reports-header {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
        }

        .fv-reports-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 14px;
            background: var(--primary-light);
        }

        .fv-reports-icon i {
            font-size: 28px;
            color: var(--primary);
        }

        .fv-reports-info {
            flex: 1;
        }

        .fv-reports-info h2 {
            margin: 0;
        }

        .fv-reports-info p {
            margin: 4px 0 0;
            color: var(--text-muted);
        }

        .fv-reports-search {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--fg-color);
        }

        .fv-reports-search i {
            color: var(--text-muted);
        }

        .fv-reports-search input {
            border: none;
            outline: none;
            background: transparent;
            font-size: 14px;
            width: 200px;
        }

        .fv-reports-section {
            margin-bottom: 32px;
        }

        .fv-reports-category {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0 0 16px;
            font-size: 18px;
            font-weight: 600;
        }

        .fv-reports-count {
            background: var(--primary-light);
            color: var(--primary);
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;
        }

        .fv-reports-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }

        .fv-report-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .fv-report-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: var(--primary-light);
            flex-shrink: 0;
        }

        .fv-report-icon i {
            font-size: 22px;
            color: var(--primary);
        }

        .fv-report-info {
            flex: 1;
            min-width: 0;
        }

        .fv-report-info h4 {
            margin: 0;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .fv-report-info p {
            margin: 4px 0 0;
            font-size: 12px;
            color: var(--text-muted);
        }

        /* Wizard */
        .fv-wizard-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 32px;
            border-radius: 20px;
        }

        .fv-wizard-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .fv-wizard-header h2 {
            margin: 0;
        }

        .fv-wizard-header p {
            margin: 8px 0 0;
            color: var(--text-muted);
        }

        .fv-wizard-progress {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 32px;
        }

        .fv-wizard-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            opacity: 0.5;
            transition: opacity 0.3s;
        }

        .fv-wizard-step.active,
        .fv-wizard-step.completed {
            opacity: 1;
        }

        .fv-step-dot {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-light-gray);
            border: 2px solid var(--border-color);
            transition: all 0.3s;
        }

        .fv-wizard-step.active .fv-step-dot {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
        }

        .fv-wizard-step.completed .fv-step-dot {
            background: var(--green-500);
            border-color: var(--green-500);
            color: white;
        }

        .fv-step-label {
            font-size: 12px;
            font-weight: 500;
        }

        .fv-step-content {
            text-align: center;
            padding: 32px;
        }

        .fv-step-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: var(--primary-light);
            margin-bottom: 20px;
        }

        .fv-step-icon i {
            font-size: 32px;
            color: var(--primary);
        }

        .fv-step-content h3 {
            margin: 0 0 12px;
        }

        .fv-step-content > p {
            color: var(--text-muted);
            margin: 0 0 24px;
        }

        .fv-step-body {
            margin-top: 24px;
        }

        .fv-step-video,
        .fv-step-image {
            max-width: 100%;
            border-radius: 12px;
        }

        .fv-wizard-nav {
            display: flex;
            justify-content: space-between;
            padding-top: 24px;
            border-top: 1px solid var(--border-color);
        }

        /* RTL */
        [dir="rtl"] .fv-settings-header,
        [dir="rtl"] .fv-reports-header {
            flex-direction: row-reverse;
        }

        [dir="rtl"] .fv-report-card {
            flex-direction: row-reverse;
        }

        [dir="rtl"] .fv-wizard-nav {
            flex-direction: row-reverse;
        }
    `;
    document.head.appendChild(style);
})();

// Add translations
Object.assign(frappe.visual.generator, {
    _translations: {
        ar: {
            "Generating page for": "جاري إنشاء صفحة لـ",
            "Failed to load app info": "فشل في تحميل معلومات التطبيق",
            "Key Features": "الميزات الرئيسية",
            "Application Structure": "هيكل التطبيق",
            "Data Relationships": "علاقات البيانات",
            "User Roles": "أدوار المستخدمين",
            "Ready to get started?": "جاهز للبدء؟",
            "Explore all the features and capabilities": "استكشف جميع الميزات والإمكانيات",
            "Get Started": "ابدأ الآن",
            "Documentation": "التوثيق",
            "Reports Hub": "مركز التقارير",
            "reports available": "تقرير متاح",
            "Search reports...": "بحث في التقارير...",
            "Standard": "قياسي",
            "Modules": "الوحدات",
            "DocTypes": "أنواع المستندات",
            "Reports": "التقارير",
            "Welcome to": "مرحباً بك في",
            "Let's get you started with a quick tour": "دعنا نبدأ معك بجولة سريعة",
            "Previous": "السابق",
            "Next": "التالي",
            "Finish": "إنهاء",
            "Onboarding complete!": "اكتمل التعريف!",
            "Settings saved successfully": "تم حفظ الإعدادات بنجاح",
            "Save": "حفظ",
            "General": "عام",
            "Configure your settings": "تكوين إعداداتك"
        }
    }
});
