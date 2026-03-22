/**
 * Frappe Visual - Icon Helper
 * ===========================
 * JavaScript utilities for icon management
 */

frappe.provide("frappe.visual");
frappe.provide("frappe.visual.icons");

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

frappe.visual.icons.config = {
    // Default library
    defaultLibrary: "tabler",

    // Size mappings (px)
    sizes: {
        xs: 12, sm: 14, md: 16, lg: 20, xl: 24, "2xl": 32, "3xl": 48
    },

    // Semantic colors
    colors: {
        primary: "var(--primary-color)",
        secondary: "var(--text-muted)",
        success: "var(--green-500)",
        warning: "var(--yellow-500)",
        danger: "var(--red-500)",
        info: "var(--blue-500)",
        muted: "var(--gray-500)",
    },

    // Action to icon mapping
    actions: {
        create: "plus", add: "plus", "new": "plus",
        edit: "pencil", update: "pencil", modify: "pencil",
        "delete": "trash", remove: "x",
        view: "eye", preview: "eye", show: "eye",
        hide: "eye-off",
        save: "device-floppy", submit: "send",
        cancel: "x", close: "x",
        search: "search", find: "search",
        filter: "filter", sort: "arrows-sort",
        refresh: "refresh", reload: "refresh",
        download: "download", "export": "download",
        upload: "upload", "import": "upload",
        print: "printer",
        share: "share", copy: "copy",
        link: "link", unlink: "unlink",
        settings: "settings", configure: "adjustments",
        help: "help-circle", info: "info-circle",
        success: "check", error: "alert-circle", warning: "alert-triangle",
        expand: "chevron-down", collapse: "chevron-up",
        next: "chevron-right", prev: "chevron-left",
        menu: "menu-2", more: "dots-vertical",
        home: "home", dashboard: "layout-dashboard",
        user: "user", users: "users", team: "users-group",
        email: "mail", phone: "phone", chat: "message-circle",
        calendar: "calendar", clock: "clock",
        file: "file", folder: "folder", document: "file-text",
        image: "photo", video: "video", audio: "music",
        lock: "lock", unlock: "lock-open",
        star: "star", favorite: "heart", bookmark: "bookmark",
        tag: "tag", flag: "flag",
        graph: "git-branch", node: "circle-dot", edge: "arrow-right",
        workflow: "git-merge", automation: "robot",
    },

    // Status to icon+color
    statuses: {
        "Draft": { icon: "file", color: "muted" },
        "Pending": { icon: "clock", color: "warning" },
        "Pending Review": { icon: "eye", color: "info" },
        "Pending Approval": { icon: "user-check", color: "info" },
        "Approved": { icon: "check", color: "success" },
        "Rejected": { icon: "x", color: "danger" },
        "Cancelled": { icon: "ban", color: "danger" },
        "Completed": { icon: "check-all", color: "success" },
        "Closed": { icon: "lock", color: "muted" },
        "On Hold": { icon: "player-pause", color: "warning" },
        "Submitted": { icon: "send", color: "primary" },
        "Active": { icon: "check-circle", color: "success" },
        "Inactive": { icon: "circle-off", color: "muted" },
        "Enabled": { icon: "toggle-right", color: "success" },
        "Disabled": { icon: "toggle-left", color: "muted" },
    },

    // DocType icons
    doctypes: {
        "User": "user",
        "Customer": "users",
        "Supplier": "building",
        "Item": "package",
        "Employee": "id-badge",
        "Lead": "target",
        "Project": "briefcase",
        "Task": "checkbox",
        "Visual Graph": "git-branch",
        "Graph Node": "circle-dot",
        "Graph Edge": "arrow-right",
        "Visual Workflow": "git-merge",
        "Visual Dashboard": "layout-dashboard",
        "Dashboard Widget": "layout-cards",
        "Visual Automation": "robot",
    },
};


// ═══════════════════════════════════════════════════════════════════
// ICON RENDERING
// ═══════════════════════════════════════════════════════════════════

/**
 * Render an icon as HTML string
 * @param {string} name - Icon name (without prefix)
 * @param {Object} options - Rendering options
 * @returns {string} HTML string
 */
frappe.visual.icons.render = function(name, options = {}) {
    const {
        library = frappe.visual.icons.config.defaultLibrary,
        size = "md",
        color = null,
        class: extraClass = "",
        attrs = {}
    } = options;

    if (library === "tabler") {
        return frappe.visual.icons._renderTabler(name, size, color, extraClass, attrs);
    }
    return frappe.visual.icons._renderFrappe(name, size, color, extraClass, attrs);
};

frappe.visual.icons._renderTabler = function(name, size, color, extraClass, attrs) {
    const classes = ["ti", `ti-${name}`];

    if (size && size !== "md") {
        classes.push(`ti-${size}`);
    }
    if (color && frappe.visual.icons.config.colors[color]) {
        classes.push(`icon-${color}`);
    }
    if (extraClass) {
        classes.push(extraClass);
    }

    const attrsStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
    const style = color && !frappe.visual.icons.config.colors[color] ? `style="color:${color}"` : "";

    return `<i class="${classes.join(" ")}" ${style} ${attrsStr}></i>`;
};

frappe.visual.icons._renderFrappe = function(name, size, color, extraClass, attrs) {
    const sizePx = frappe.visual.icons.config.sizes[size] || 16;
    const classes = ["icon", `icon-${size}`];

    if (color && frappe.visual.icons.config.colors[color]) {
        classes.push(`icon-${color}`);
    }
    if (extraClass) {
        classes.push(extraClass);
    }

    const attrsStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
    const style = color && !frappe.visual.icons.config.colors[color] ? `style="color:${color}"` : "";

    return `<svg class="${classes.join(" ")}" width="${sizePx}" height="${sizePx}" ${style} ${attrsStr}>
        <use href="#icon-${name}"></use>
    </svg>`;
};


// ═══════════════════════════════════════════════════════════════════
// SEMANTIC HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get icon name for an action
 */
frappe.visual.icons.forAction = function(action, options = {}) {
    const iconName = frappe.visual.icons.config.actions[action.toLowerCase()] || "circle";
    return frappe.visual.icons.render(iconName, options);
};

/**
 * Get icon for a status
 */
frappe.visual.icons.forStatus = function(status, options = {}) {
    const config = frappe.visual.icons.config.statuses[status] || { icon: "circle", color: "muted" };
    return frappe.visual.icons.render(config.icon, { ...options, color: config.color });
};

/**
 * Get icon for a DocType
 */
frappe.visual.icons.forDocType = function(doctype, options = {}) {
    const iconName = frappe.visual.icons.config.doctypes[doctype] || "file-text";
    return frappe.visual.icons.render(iconName, options);
};

/**
 * Render a status badge
 */
frappe.visual.icons.statusBadge = function(status, showText = true) {
    const config = frappe.visual.icons.config.statuses[status] || { icon: "circle", color: "muted" };
    const icon = frappe.visual.icons.render(config.icon, { size: "xs", color: config.color });
    const text = showText ? ` ${__(status)}` : "";
    const className = `fv-status-icon status-${status.toLowerCase().replace(/\s+/g, "-")}`;

    return `<span class="${className}">${icon}${text}</span>`;
};


// ═══════════════════════════════════════════════════════════════════
// ICON PICKER DIALOG
// ═══════════════════════════════════════════════════════════════════

/**
 * Open icon picker dialog
 * @param {Function} callback - Called with selected icon name
 * @param {Object} options - Dialog options
 */
frappe.visual.icons.pick = function(callback, options = {}) {
    const { library = "tabler", title = __("Select Icon") } = options;

    // Popular/common icons for quick access
    const popularIcons = [
        "home", "dashboard", "layout-dashboard", "chart-bar", "report-analytics",
        "user", "users", "users-group", "id-badge", "building",
        "file", "file-text", "folder", "folder-open", "archive",
        "mail", "mail-opened", "send", "inbox", "message-circle",
        "phone", "phone-call", "device-mobile", "brand-whatsapp",
        "calendar", "calendar-event", "clock", "alarm", "hourglass",
        "check", "check-circle", "x", "x-circle", "alert-triangle", "alert-circle",
        "search", "filter", "sort-ascending", "arrows-sort",
        "plus", "minus", "pencil", "trash", "copy", "clipboard",
        "download", "upload", "share", "share-2", "link", "unlink",
        "eye", "eye-off", "lock", "lock-open", "shield", "key",
        "star", "star-filled", "heart", "heart-filled", "bookmark", "flag",
        "tag", "tags", "hash", "at",
        "settings", "adjustments", "tool", "tools",
        "git-branch", "git-merge", "git-pull-request", "code",
        "database", "server", "cloud", "api",
        "package", "box", "shopping-cart", "receipt", "credit-card", "wallet",
        "map-pin", "globe", "world", "plane", "car", "truck",
        "bulb", "bolt", "flame", "droplet", "sun", "moon",
        "camera", "photo", "video", "music", "microphone",
        "printer", "scan", "qrcode", "barcode",
        "wifi", "bluetooth", "cast", "rss",
        "refresh", "rotate", "arrows-maximize", "arrows-minimize",
        "chevron-up", "chevron-down", "chevron-left", "chevron-right",
        "arrow-up", "arrow-down", "arrow-left", "arrow-right",
        "menu", "menu-2", "dots", "dots-vertical", "grip-vertical",
        "layout-grid", "layout-list", "table", "columns",
        "circle", "circle-dot", "square", "triangle", "hexagon",
        "robot", "cpu", "device-desktop", "device-laptop",
    ];

    const d = new frappe.ui.Dialog({
        title: title,
        size: "large",
        fields: [
            {
                fieldtype: "Data",
                fieldname: "search",
                placeholder: __("Search icons..."),
                onchange: function() {
                    filterIcons(this.get_value().toLowerCase());
                }
            },
            {
                fieldtype: "HTML",
                fieldname: "icons_grid"
            }
        ],
        primary_action_label: __("Select"),
        primary_action: function() {
            const selected = d.$wrapper.find(".fv-icon-picker-item.selected");
            if (selected.length) {
                callback(selected.data("icon"));
                d.hide();
            } else {
                frappe.show_alert({ message: __("Please select an icon"), indicator: "orange" });
            }
        }
    });

    // Render grid
    const gridHtml = `
        <div class="fv-icon-picker-grid" style="
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
            gap: 8px;
            max-height: 400px;
            overflow-y: auto;
            padding: 12px;
        ">
            ${popularIcons.map(icon => `
                <div class="fv-icon-picker-item" data-icon="${icon}" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 12px 4px;
                    border-radius: 8px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.15s ease;
                ">
                    <i class="ti ti-${icon}" style="font-size: 24px; margin-bottom: 4px;"></i>
                    <span style="font-size: 9px; color: var(--text-muted); text-align: center; word-break: break-all;">${icon}</span>
                </div>
            `).join("")}
        </div>
    `;

    d.fields_dict.icons_grid.$wrapper.html(gridHtml);

    // Item interactions
    d.$wrapper.find(".fv-icon-picker-item").on("click", function() {
        d.$wrapper.find(".fv-icon-picker-item").removeClass("selected")
            .css({ borderColor: "transparent", background: "transparent" });
        $(this).addClass("selected")
            .css({ borderColor: "var(--primary-color)", background: "var(--control-bg-on-gray)" });
    }).on("dblclick", function() {
        callback($(this).data("icon"));
        d.hide();
    });

    function filterIcons(query) {
        d.$wrapper.find(".fv-icon-picker-item").each(function() {
            const iconName = $(this).data("icon");
            $(this).toggle(iconName.includes(query));
        });
    }

    d.show();
};


// ═══════════════════════════════════════════════════════════════════
// DOM UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Add icon to element
 */
frappe.visual.icons.addTo = function($el, iconName, options = {}) {
    const { position = "prepend", ...iconOpts } = options;
    const iconHtml = frappe.visual.icons.render(iconName, iconOpts);

    if (position === "prepend") {
        $($el).prepend(iconHtml + " ");
    } else {
        $($el).append(" " + iconHtml);
    }

    return $($el);
};

/**
 * Replace element content with icon (keeps title as tooltip)
 */
frappe.visual.icons.replaceWith = function($el, iconName, options = {}) {
    const text = $($el).text().trim();
    const iconHtml = frappe.visual.icons.render(iconName, options);

    $($el).html(iconHtml).attr("title", text).attr("aria-label", text);

    return $($el);
};


// ═══════════════════════════════════════════════════════════════════
// DASHBOARD HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create dashboard link HTML
 */
frappe.visual.icons.dashLink = function(options) {
    const { icon, label, href = "#", count = null, color = "primary" } = options;
    const iconHtml = frappe.visual.icons.render(icon, { size: "lg", color });
    const countHtml = count !== null ? `<span class="fv-dash-link-count">${count}</span>` : "";

    return `
        <a href="${href}" class="fv-dash-link">
            ${iconHtml}
            <span class="fv-dash-link-text">${label}</span>
            ${countHtml}
        </a>
    `;
};

/**
 * Create dashboard card HTML
 */
frappe.visual.icons.dashCard = function(options) {
    const {
        icon, title, value = "", subtitle = "",
        color = "primary", onclick = null
    } = options;

    const iconHtml = frappe.visual.icons.render(icon, { size: "2xl" });
    const clickAttr = onclick ? `onclick="${onclick}"` : "";

    return `
        <div class="fv-dash-card fv-dash-card-${color}" ${clickAttr}>
            ${iconHtml}
            <div class="fv-dash-card-title">${title}</div>
            ${value ? `<div class="fv-dash-card-value">${value}</div>` : ""}
            ${subtitle ? `<div class="fv-dash-card-subtitle">${subtitle}</div>` : ""}
        </div>
    `;
};


// ═══════════════════════════════════════════════════════════════════
// SHORTHAND GLOBAL ALIAS
// ═══════════════════════════════════════════════════════════════════

// Convenient shorthand: fv_icon("home", { size: "lg" })
window.fv_icon = frappe.visual.icons.render;
window.fv_icons = frappe.visual.icons;


// ═══════════════════════════════════════════════════════════════════
// AUTO-ENHANCE (Optional)
// ═══════════════════════════════════════════════════════════════════

$(document).ready(function() {
    // Enhance elements with data-fv-icon attribute
    $("[data-fv-icon]").each(function() {
        const icon = $(this).data("fv-icon");
        const size = $(this).data("fv-size") || "md";
        const color = $(this).data("fv-color");

        frappe.visual.icons.addTo($(this), icon, { size, color });
    });
});
