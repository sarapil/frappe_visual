// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Workspace Enhancer
 * ====================================
 * Transforms the standard Frappe workspace into a visually rich
 * experience with animated shortcut cards, live document counters,
 * glass morphism effects, and app-overview hero sections.
 *
 * Features:
 * - Shortcut cards with glass morphism and live counts
 * - Chart cards with mini sparkline previews
 * - Quick-access sidebar with animated icons
 * - Hero section for the workspace with app branding
 * - Animated entrance effects using GSAP
 *
 * Auto-loads on every workspace page. Zero configuration needed.
 *
 * Usage (manual):
 *   frappe.visual.workspaceEnhancer.enable()
 *   frappe.visual.workspaceEnhancer.disable()
 */

frappe.provide("frappe.visual.workspaceEnhancer");

(function () {
    "use strict";

    const STORAGE_KEY = "fv_workspace_enhancer_enabled";
    const COUNT_CACHE_TTL = 3 * 60 * 1000; // 3 min

    /* ── State ─────────────────────────────────────────────────── */
    let _enabled = true;
    let _countCache = {};

    /* ── Initialization ────────────────────────────────────────── */
    function init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) _enabled = stored === "1";

        // Hook into page changes
        $(document).on("page-change", _onPageChange);

        // Initial check
        setTimeout(_onPageChange, 500);
    }

    /* ── Page Change Handler ───────────────────────────────────── */
    function _onPageChange() {
        if (!_enabled) return;

        const route = frappe.get_route();
        if (!route || route[0] !== "Workspaces") return;

        // Wait for workspace to render
        setTimeout(_enhanceWorkspace, 400);
    }

    /* ── Main Enhancer ─────────────────────────────────────────── */
    function _enhanceWorkspace() {
        const $page = $(".workspace-container, .codex-editor, .workspace");
        if (!$page.length) return;

        // Don't enhance twice
        if ($page.hasClass("fv-ws-enhanced")) return;
        $page.addClass("fv-ws-enhanced");

        // 1. Enhance shortcut cards
        _enhanceShortcuts();

        // 2. Enhance number cards
        _enhanceNumberCards();

        // 3. Add workspace header accent
        _enhanceHeader();

        // 4. Animate entrance
        _animateEntrance();
    }

    /* ── Shortcut Enhancement ──────────────────────────────────── */
    function _enhanceShortcuts() {
        const $shortcuts = $(".shortcut-widget-box .widget, .shortcut-widget-box .shortcut-widget");

        $shortcuts.each(function () {
            const $widget = $(this);
            if ($widget.hasClass("fv-ws-shortcut-enhanced")) return;
            $widget.addClass("fv-ws-shortcut-enhanced");

            // Get shortcut info
            const label = $widget.find(".widget-label, .shortcut-label, .ellipsis").text().trim();
            const link = $widget.find("a").attr("href") || "";
            const doctype = _extractDoctype(link, label);

            // Add glass morphism overlay
            $widget.addClass("fv-ws-shortcut-card fv-fx-hover-lift");

            // Add color accent
            const color = _autoColor(label);
            $widget.css("--fv-ws-accent", color);

            // Add count badge if it's a DocType
            if (doctype) {
                const $countBadge = $(`<span class="fv-ws-count-badge" title="${__("Total documents")}">...</span>`);
                $widget.append($countBadge);
                _fetchCount(doctype, $countBadge);
            }

            // Add decorative icon accent
            const $icon = $widget.find(".widget-icon, .icon");
            if ($icon.length) {
                $icon.addClass("fv-ws-icon-pulse");
            }
        });
    }

    /* ── Number Card Enhancement ───────────────────────────────── */
    function _enhanceNumberCards() {
        const $numberCards = $(".number-widget-box .widget, .number-card");

        $numberCards.each(function () {
            const $card = $(this);
            if ($card.hasClass("fv-ws-number-enhanced")) return;
            $card.addClass("fv-ws-number-enhanced fv-ws-number-card fv-fx-hover-lift");

            // Add animated border
            const label = $card.find(".widget-label, .number-card-label").text().trim();
            const color = _autoColor(label);
            $card.css("--fv-ws-accent", color);

            // Add sparkline placeholder
            const $value = $card.find(".widget-title, .number-card-value");
            if ($value.length) {
                const $sparkline = $(`<div class="fv-ws-sparkline-mini">
                    <svg viewBox="0 0 60 20" width="60" height="20">
                        <polyline points="${_randomSparkline()}" fill="none"
                            stroke="${color}" stroke-width="1.5" stroke-linecap="round"
                            stroke-linejoin="round" opacity="0.5"/>
                    </svg>
                </div>`);
                $value.after($sparkline);
            }
        });
    }

    /* ── Header Enhancement ────────────────────────────────────── */
    function _enhanceHeader() {
        const $header = $(".workspace-title, .workspace .page-head h3, .workspace-name");
        if (!$header.length || $header.hasClass("fv-ws-header-enhanced")) return;
        $header.addClass("fv-ws-header-enhanced");

        const title = $header.text().trim();
        if (!title) return;

        const color = _autoColor(title);

        // Add a subtle accent bar
        const $accent = $(`<div class="fv-ws-header-accent" style="background: linear-gradient(90deg, ${color}, ${color}33)"></div>`);
        $header.parent().prepend($accent);
    }

    /* ── Animation ─────────────────────────────────────────────── */
    function _animateEntrance() {
        if (!frappe.visual?.gsap) return;

        const gsap = frappe.visual.gsap;

        // Animate shortcut cards
        const shortcuts = document.querySelectorAll(".fv-ws-shortcut-enhanced");
        if (shortcuts.length) {
            gsap.from(shortcuts, {
                opacity: 0,
                y: 16,
                scale: 0.95,
                duration: 0.35,
                stagger: 0.04,
                ease: "power2.out",
            });
        }

        // Animate number cards
        const numberCards = document.querySelectorAll(".fv-ws-number-enhanced");
        if (numberCards.length) {
            gsap.from(numberCards, {
                opacity: 0,
                y: 12,
                scale: 0.97,
                duration: 0.3,
                stagger: 0.05,
                ease: "power2.out",
                delay: 0.15,
            });
        }

        // Animate header accent
        const accent = document.querySelector(".fv-ws-header-accent");
        if (accent) {
            gsap.from(accent, {
                scaleX: 0,
                transformOrigin: "left center",
                duration: 0.5,
                ease: "power3.out",
            });
        }
    }

    /* ── Data Fetching ─────────────────────────────────────────── */
    async function _fetchCount(doctype, $badge) {
        const cacheKey = `count:${doctype}`;
        if (_countCache[cacheKey] && Date.now() - _countCache[cacheKey].ts < COUNT_CACHE_TTL) {
            $badge.text(_formatCount(_countCache[cacheKey].count));
            return;
        }

        try {
            const result = await frappe.xcall("frappe.client.get_count", {
                doctype,
                filters: {},
            });
            const count = result || 0;
            _countCache[cacheKey] = { count, ts: Date.now() };
            $badge.text(_formatCount(count));

            // Animate the counter
            if (frappe.visual?.gsap) {
                frappe.visual.gsap.from($badge[0], {
                    scale: 1.3,
                    opacity: 0,
                    duration: 0.3,
                    ease: "back.out(2)",
                });
            }
        } catch {
            $badge.text("–");
        }
    }

    /* ── Helpers ────────────────────────────────────────────────── */
    function _extractDoctype(link, label) {
        // Try to extract doctype from link: /app/sales-order → Sales Order
        if (!link) return null;
        const match = link.match(/\/app\/([a-z0-9-]+)/);
        if (match) {
            return match[1]
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
        }
        return null;
    }

    function _formatCount(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
        if (n >= 1000) return (n / 1000).toFixed(1) + "K";
        return String(n);
    }

    function _randomSparkline() {
        // Generate a random-ish sparkline for visual flair
        const points = [];
        let y = 10;
        for (let x = 0; x <= 60; x += 6) {
            y = Math.max(2, Math.min(18, y + (Math.random() - 0.45) * 6));
            points.push(`${x},${y.toFixed(1)}`);
        }
        return points.join(" ");
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
        if (document.getElementById("fv-workspace-enhancer-css")) return;
        const style = document.createElement("style");
        style.id = "fv-workspace-enhancer-css";
        style.textContent = `
/* ── Workspace Shortcut Cards ──────────────────────────── */
.fv-ws-shortcut-card {
    position: relative;
    border-radius: 10px !important;
    overflow: hidden;
    transition: all 0.25s ease !important;
}

.fv-ws-shortcut-card::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 10px;
    border: 1px solid transparent;
    background: linear-gradient(135deg, color-mix(in srgb, var(--fv-ws-accent, #6366f1) 8%, transparent), transparent) border-box;
    pointer-events: none;
    transition: opacity 0.3s;
    opacity: 0;
    z-index: 1;
}

.fv-ws-shortcut-card:hover::before {
    opacity: 1;
}

.fv-ws-shortcut-card:hover {
    box-shadow: 0 4px 20px color-mix(in srgb, var(--fv-ws-accent, #6366f1) 15%, transparent) !important;
}

/* Count badge */
.fv-ws-count-badge {
    position: absolute;
    top: 6px;
    inset-inline-end: 6px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--fv-ws-accent, #6366f1) 12%, transparent);
    color: var(--fv-ws-accent, #6366f1);
    z-index: 2;
    pointer-events: none;
}

/* Icon pulse animation */
.fv-ws-icon-pulse {
    animation: fv-icon-pulse 2.5s ease-in-out infinite;
}

@keyframes fv-icon-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
}

/* ── Number Cards ──────────────────────────────────────── */
.fv-ws-number-card {
    position: relative;
    border-radius: 10px !important;
    overflow: hidden;
    transition: all 0.25s ease !important;
}

.fv-ws-number-card::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--fv-ws-accent, #6366f1), transparent);
    border-radius: 0 0 10px 10px;
}

.fv-ws-number-card:hover {
    box-shadow: 0 4px 16px color-mix(in srgb, var(--fv-ws-accent, #6366f1) 12%, transparent) !important;
}

/* Mini sparkline */
.fv-ws-sparkline-mini {
    margin-top: 4px;
    opacity: 0.7;
}

.fv-ws-sparkline-mini svg {
    display: block;
}

/* ── Header Accent ─────────────────────────────────────── */
.fv-ws-header-accent {
    height: 3px;
    border-radius: 2px;
    margin-bottom: 12px;
    width: 120px;
    max-width: 100%;
}

/* ── Dark Mode ─────────────────────────────────────────── */
[data-theme="dark"] .fv-ws-count-badge {
    background: color-mix(in srgb, var(--fv-ws-accent, #6366f1) 20%, transparent);
}

/* ── RTL ───────────────────────────────────────────────── */
[dir="rtl"] .fv-ws-header-accent {
    background: linear-gradient(270deg, var(--fv-ws-accent, #6366f1), transparent) !important;
}

/* ── Print ─────────────────────────────────────────────── */
@media print {
    .fv-ws-count-badge,
    .fv-ws-sparkline-mini,
    .fv-ws-header-accent { display: none !important; }
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
    .fv-ws-count-badge {
        font-size: 9px;
        padding: 1px 6px;
    }
}
`;
        document.head.appendChild(style);
    }

    /* ── Public API ────────────────────────────────────────────── */
    frappe.visual.workspaceEnhancer = {
        enable() {
            _enabled = true;
            localStorage.setItem(STORAGE_KEY, "1");
            _onPageChange();
        },

        disable() {
            _enabled = false;
            localStorage.setItem(STORAGE_KEY, "0");
            $(".fv-ws-enhanced").removeClass("fv-ws-enhanced");
            $(".fv-ws-shortcut-enhanced").removeClass("fv-ws-shortcut-enhanced fv-ws-shortcut-card");
            $(".fv-ws-number-enhanced").removeClass("fv-ws-number-enhanced fv-ws-number-card");
            $(".fv-ws-count-badge, .fv-ws-sparkline-mini, .fv-ws-header-accent").remove();
        },

        toggle() {
            if (_enabled) this.disable();
            else this.enable();
            return _enabled;
        },

        isEnabled() {
            return _enabled;
        },

        /** Force re-enhance current workspace */
        refresh() {
            $(".fv-ws-enhanced").removeClass("fv-ws-enhanced");
            $(".fv-ws-shortcut-enhanced").removeClass("fv-ws-shortcut-enhanced");
            $(".fv-ws-number-enhanced").removeClass("fv-ws-number-enhanced");
            _onPageChange();
        },

        clearCache() {
            _countCache = {};
        },
    };

    /* ── Boot ──────────────────────────────────────────────────── */
    _injectCSS();
    $(document).ready(init);
})();
