/**
 * Frappe Visual — Bilingual Tooltip System
 * ==========================================
 * Shows English translation tooltip when hovering over Arabic text.
 * Helps users who may not fully understand Arabic translations.
 *
 * Features:
 * - Auto-detects Arabic text
 * - Shows English equivalent on hover
 * - Configurable delay and styling
 * - RTL-aware positioning
 * - Works with dynamically added content
 *
 * Usage:
 *   frappe.visual.bilingual.init()     // Initialize on page load
 *   frappe.visual.bilingual.refresh()  // Refresh after dynamic content
 */

frappe.provide("frappe.visual.bilingual");

(function() {
    "use strict";

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Only show tooltips when UI is Arabic
        enabledLanguages: ["ar", "ar-SA", "ar-EG", "ar-AE"],

        // Delay before showing tooltip (ms)
        showDelay: 400,

        // Tooltip styling
        tooltipClass: "fv-bilingual-tip",

        // Elements to scan for translatable text
        selectors: [
            "button",
            "a",
            ".btn",
            ".dropdown-item",
            "label",
            "h1, h2, h3, h4, h5, h6",
            ".sidebar-label",
            ".desk-sidebar .standard-sidebar-item",
            ".page-title",
            ".module-card-label",
            ".doctype-card-label",
            ".control-label",
            ".checkbox-label",
            ".like-disabled-input",
            ".form-section .section-head",
            ".form-tab-label",
            ".navbar-brand",
            ".dropdown-toggle",
            ".indicator-pill",
            ".alert",
            "[data-page-title]",
            ".report-title",
            ".card-title",
            ".list-row .title-field",
            ".page-card-label",
            ".frappe-control:not(.hide-control) .control-label",
        ],

        // Skip these elements
        skipSelectors: [
            "input",
            "textarea",
            "select",
            "code",
            "pre",
            ".CodeMirror",
            ".no-bilingual-tip",
        ],

        // Cache for translations (Arabic → English)
        cache: new Map(),

        // Pre-loaded common translations
        commonTranslations: {
            // Navigation
            "الرئيسية": "Home",
            "الإعدادات": "Settings",
            "المستخدمون": "Users",
            "الأدوار": "Roles",
            "لوحة التحكم": "Dashboard",
            "البحث": "Search",
            "بحث": "Search",
            "تصفية": "Filter",
            "ترتيب": "Sort",

            // Actions
            "حفظ": "Save",
            "إلغاء": "Cancel",
            "حذف": "Delete",
            "تعديل": "Edit",
            "إضافة": "Add",
            "جديد": "New",
            "إرسال": "Submit",
            "موافقة": "Approve",
            "رفض": "Reject",
            "طباعة": "Print",
            "تصدير": "Export",
            "استيراد": "Import",
            "تحديث": "Refresh",
            "إغلاق": "Close",
            "التالي": "Next",
            "السابق": "Previous",
            "إنهاء": "Finish",
            "تأكيد": "Confirm",
            "رجوع": "Back",
            "عرض": "View",
            "إخفاء": "Hide",
            "نسخ": "Copy",
            "لصق": "Paste",
            "قص": "Cut",
            "تحميل": "Download",
            "رفع": "Upload",
            "مشاركة": "Share",

            // Status
            "مسودة": "Draft",
            "قيد الانتظار": "Pending",
            "معتمد": "Approved",
            "مرفوض": "Rejected",
            "ملغى": "Cancelled",
            "مكتمل": "Completed",
            "نشط": "Active",
            "غير نشط": "Inactive",
            "مفعل": "Enabled",
            "معطل": "Disabled",
            "مغلق": "Closed",

            // Common fields
            "الاسم": "Name",
            "الوصف": "Description",
            "التاريخ": "Date",
            "الوقت": "Time",
            "النوع": "Type",
            "الحالة": "Status",
            "المالك": "Owner",
            "المنشئ": "Created By",
            "تاريخ الإنشاء": "Created On",
            "آخر تعديل": "Last Modified",
            "ملاحظات": "Notes",
            "تعليقات": "Comments",
            "المرفقات": "Attachments",
            "الإجمالي": "Total",
            "المبلغ": "Amount",
            "الكمية": "Quantity",
            "السعر": "Price",
            "الخصم": "Discount",
            "الضريبة": "Tax",

            // Modules
            "المحاسبة": "Accounting",
            "المبيعات": "Sales",
            "المشتريات": "Purchases",
            "المخزون": "Stock",
            "الموارد البشرية": "HR",
            "المشاريع": "Projects",
            "الإنتاج": "Manufacturing",
            "الصيانة": "Maintenance",
            "العملاء": "Customers",
            "الموردين": "Suppliers",
            "الأصناف": "Items",
            "الفواتير": "Invoices",
            "الطلبات": "Orders",
            "التقارير": "Reports",
            "التحليلات": "Analytics",

            // frappe_visual specific
            "خريطة التطبيق": "App Map",
            "مخطط العلاقات": "ERD",
            "لوحة البيانات": "Dashboard",
            "التدفق": "Flow",
            "الشجرة": "Tree",
            "الجدول الزمني": "Timeline",
            "المعرض": "Gallery",
            "الخريطة": "Map",
            "كانبان": "Kanban",
            "التقويم": "Calendar",
        },
    };

    // ═══════════════════════════════════════════════════════════════════
    // ARABIC DETECTION
    // ═══════════════════════════════════════════════════════════════════

    const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

    function containsArabic(text) {
        return ARABIC_REGEX.test(text);
    }

    function isArabicUI() {
        const lang = frappe.boot?.lang || frappe.sys_defaults?.language || "en";
        return CONFIG.enabledLanguages.some(l => lang.startsWith(l));
    }

    // ═══════════════════════════════════════════════════════════════════
    // TRANSLATION LOOKUP
    // ═══════════════════════════════════════════════════════════════════

    async function getEnglishTranslation(arabicText) {
        const trimmed = arabicText.trim();

        // Check local cache
        if (CONFIG.cache.has(trimmed)) {
            return CONFIG.cache.get(trimmed);
        }

        // Check common translations
        if (CONFIG.commonTranslations[trimmed]) {
            return CONFIG.commonTranslations[trimmed];
        }

        // Try to find in frappe translation messages (reverse lookup)
        if (frappe.boot?.translated_messages) {
            for (const [en, ar] of Object.entries(frappe.boot.translated_messages)) {
                if (ar === trimmed) {
                    CONFIG.cache.set(trimmed, en);
                    return en;
                }
            }
        }

        // Try server-side lookup for exact match
        try {
            const response = await frappe.call({
                method: "frappe_visual.api.get_reverse_translation",
                args: { arabic_text: trimmed },
                async: true,
            });
            if (response?.message) {
                CONFIG.cache.set(trimmed, response.message);
                return response.message;
            }
        } catch (e) {
            // Silently fail - not critical
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // TOOLTIP MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    let tooltipEl = null;
    let showTimeout = null;
    let currentTarget = null;

    function createTooltipElement() {
        if (tooltipEl) return tooltipEl;

        tooltipEl = document.createElement("div");
        tooltipEl.className = CONFIG.tooltipClass;
        tooltipEl.style.cssText = `
            position: fixed;
            z-index: 99999;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: #f8fafc;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
            direction: ltr;
            text-align: left;
            max-width: 300px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
            opacity: 0;
            transform: translateY(8px) scale(0.95);
            transition: opacity 0.2s ease, transform 0.2s ease;
            pointer-events: none;
            backdrop-filter: blur(8px);
        `;

        // Arrow
        const arrow = document.createElement("div");
        arrow.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: #1e293b;
            transform: rotate(45deg);
            top: -5px;
            left: 20px;
        `;
        tooltipEl.appendChild(arrow);
        tooltipEl.arrowEl = arrow;

        // English text
        const textSpan = document.createElement("span");
        textSpan.className = "fv-bilingual-text";
        textSpan.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        tooltipEl.appendChild(textSpan);
        tooltipEl.textSpan = textSpan;

        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }

    function showTooltip(target, englishText) {
        if (!englishText || !target.isConnected) return;

        const tip = createTooltipElement();
        const rect = target.getBoundingClientRect();

        // Set content with icon
        tip.textSpan.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 8l6 6M4 14l6 -6M2 5h12M7 2v3M22 22l-5 -10l-5 10M14 18h6"/>
            </svg>
            <span>${englishText}</span>
        `;

        // Position
        const tipWidth = tip.offsetWidth || 200;
        const tipHeight = tip.offsetHeight || 40;
        const isRTL = document.dir === "rtl";

        let top = rect.bottom + 10;
        let left = isRTL
            ? rect.right - tipWidth + 30
            : rect.left;

        // Keep in viewport
        if (left + tipWidth > window.innerWidth - 10) {
            left = window.innerWidth - tipWidth - 10;
        }
        if (left < 10) left = 10;

        if (top + tipHeight > window.innerHeight - 10) {
            // Show above
            top = rect.top - tipHeight - 10;
            tip.arrowEl.style.top = "auto";
            tip.arrowEl.style.bottom = "-5px";
        } else {
            tip.arrowEl.style.top = "-5px";
            tip.arrowEl.style.bottom = "auto";
        }

        tip.arrowEl.style.left = `${Math.min(Math.max(rect.left - left + rect.width/2 - 5, 10), tipWidth - 20)}px`;

        tip.style.top = `${top}px`;
        tip.style.left = `${left}px`;

        // Show with animation
        requestAnimationFrame(() => {
            tip.style.opacity = "1";
            tip.style.transform = "translateY(0) scale(1)";
        });

        currentTarget = target;
    }

    function hideTooltip() {
        if (tooltipEl) {
            tooltipEl.style.opacity = "0";
            tooltipEl.style.transform = "translateY(8px) scale(0.95)";
        }
        if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
        }
        currentTarget = null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    function handleMouseEnter(e) {
        if (!isArabicUI()) return;

        const target = e.target;

        // Skip if matches skip selectors
        if (CONFIG.skipSelectors.some(sel => target.matches(sel))) return;

        // Get text content
        let text = target.textContent?.trim();
        if (!text || !containsArabic(text)) return;

        // Clean up text (remove extra whitespace, icons)
        text = text.replace(/\s+/g, " ").trim();
        if (text.length < 2 || text.length > 100) return;

        // Show tooltip after delay
        showTimeout = setTimeout(async () => {
            const english = await getEnglishTranslation(text);
            if (english && english !== text) {
                showTooltip(target, english);
            }
        }, CONFIG.showDelay);
    }

    function handleMouseLeave(e) {
        if (e.target === currentTarget || tooltipEl?.contains(e.relatedTarget)) {
            hideTooltip();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    frappe.visual.bilingual = {
        config: CONFIG,

        /**
         * Initialize the bilingual tooltip system
         */
        init() {
            if (!isArabicUI()) {
                console.log("Bilingual tooltips: Skipped (UI is not Arabic)");
                return;
            }

            // Use event delegation on body
            document.body.addEventListener("mouseenter", handleMouseEnter, true);
            document.body.addEventListener("mouseleave", handleMouseLeave, true);

            console.log(
                "%c🌐 Bilingual Tooltips%c initialized — hover Arabic text for English",
                "color:#6366f1;font-weight:bold",
                "color:#94a3b8"
            );
        },

        /**
         * Manually refresh after dynamic content
         */
        refresh() {
            // No-op with event delegation, but kept for API compatibility
        },

        /**
         * Add custom translations
         * @param {Object} translations - { "عربي": "English", ... }
         */
        addTranslations(translations) {
            Object.assign(CONFIG.commonTranslations, translations);
        },

        /**
         * Temporarily disable tooltips
         */
        disable() {
            document.body.removeEventListener("mouseenter", handleMouseEnter, true);
            document.body.removeEventListener("mouseleave", handleMouseLeave, true);
        },

        /**
         * Re-enable tooltips
         */
        enable() {
            this.init();
        },

        /**
         * Check if Arabic UI is active
         */
        isActive() {
            return isArabicUI();
        },
    };

    // Auto-initialize when document is ready
    $(document).ready(() => {
        // Slight delay to ensure frappe.boot is loaded
        setTimeout(() => frappe.visual.bilingual.init(), 500);
    });

})();
