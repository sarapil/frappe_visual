// Copyright (c) 2024, Arkan Lab — https://arkan.it.com
// License: MIT

frappe.pages["frappe-visual-onboarding"].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("Frappe Visual Onboarding"),
        single_column: true,
    });

    page.main.addClass("frappe-visual-onboarding-page");
    const $container = $('<div class="fv-onboarding-container"></div>').appendTo(page.main);

    const steps = [
        {
            title: __("Welcome to Frappe Visual"),
            description: __("307+ premium visual components across 31 waves and 10 tiers. Transform every Frappe page into an immersive, data-rich experience with zero boilerplate."),
            icon: "sparkles",
        },
        {
            title: __("Architecture Overview"),
            description: __("Two usage methods: async shorthands (frappe.visual.kanban(), frappe.visual.heatmap()) available from ANY app, or direct class instantiation inside bundles. Lazy-loaded on first call for zero startup cost."),
            icon: "topology-star-3",
        },
        {
            title: __("Component Library — 10 Tiers"),
            description: __("Tier 1: Core Engine (GraphEngine, LayoutManager). Tier 2: Business Views (AppMap, Kanban, Calendar). Tier 3: Data Viz (ECharts). Tier 4: Layouts. Tier 5: Navigation. Tier 6: Feedback. Tier 7: Productivity. Tier 8: Scene Engine. Tier 9: Animations. Tier 10: Form Enhancement."),
            icon: "sitemap",
            component: "app-map",
        },
        {
            title: __("Auto-Enhancers — Zero Config"),
            description: __("formEnhancer: stats ribbon + relationship graph on every form. listEnhancer: Table/Cards/Kanban/Timeline toggle on every list. workspaceEnhancer: live counts + sparklines + glassmorphism. bilingualTooltip: Arabic↔English hover on every element."),
            icon: "wand",
        },
        {
            title: __("Graph Engine — Cytoscape.js + ELK.js"),
            description: __("Create interactive node-edge graphs with 9 ELK.js layout algorithms. Supports AppMap, RelationshipExplorer, ERD templates, custom nodes, edge bundling, minimap, and context menus."),
            icon: "chart-dots-3",
        },
        {
            title: __("Scene Engine — Immersive SVG Dashboards"),
            description: __("Replace flat workspaces with animated SVG rooms. 5 presets: Office, Library, Clinic, Workshop, Café. 18 components: SceneRoom, SceneFrame, SceneDesk, SceneShelf, SceneBoard, plus SceneDataBinder for live Frappe data."),
            icon: "building",
        },
        {
            title: __("Data Visualization — ECharts Suite"),
            description: __("9 chart types: Heatmap, Sparkline, Radar, Funnel, Treemap, Donut, DataCard, Area, Sankey. All support dark mode, RTL, responsive sizing, and live data refresh."),
            icon: "chart-bar",
        },
        {
            title: __("Layout Containers"),
            description: __("9 powerful layout systems: Masonry, Dock, GridStack, Bento, InfiniteScroll, Sortable, VirtualList, StackedLayout, Resizable. Build complex responsive layouts without CSS headaches."),
            icon: "layout-grid",
        },
        {
            title: __("Navigation & Productivity"),
            description: __("CommandBar (⌘K global search), FloatingNav, NavRail, SpeedDial, TabBar, BottomNav. Plus productivity tools: ShortcutManager, ClipboardManager, UndoRedo (⌘Z), BulkActions, MultiSelectBar."),
            icon: "compass",
        },
        {
            title: __("Micro-Animations — GSAP Effects"),
            description: __("9 animation components: Typewriter, Parallax, Confetti, Ripple, TextLoop, NumberTicker, GlowCard, MorphingText, DotPattern. Plus 10 CSS effect classes: .fv-fx-glass, .fv-fx-hover-lift, .fv-fx-mouse-glow, and more."),
            icon: "sparkles",
        },
        {
            title: __("Page Templates"),
            description: __("8 ready-made templates: dashboard (KPI + charts), erd (Entity Relationships), workflow, tree, wizard, kanbanWorkspace, timeline, appOverview. Each accepts a simple config object."),
            icon: "template",
        },
        {
            title: __("Generators — Auto-Create Pages"),
            description: __("4 generators: aboutPage (full app showcase, 14+ slides), settingsPage (visual settings), reportsHub (unified report access), onboardingWizard (first-time experience). One line of code for an entire page."),
            icon: "robot",
        },
        {
            title: __("Icon System — 5000+ Tabler Icons"),
            description: __("frappe.visual.icons.render(), .forDocType(), .statusBadge(), .pick() (interactive picker), .dashCard(). All icons auto-swap in RTL. Never use Font Awesome — always use frappe.visual.icons."),
            icon: "icons",
        },
        {
            title: __("Internationalization & RTL"),
            description: __("Full Arabic support. CSS Logical Properties (margin-inline-start, not margin-left). dir='auto' for user content. bilingualTooltip on every element. All strings wrapped in __() for i18n."),
            icon: "language",
        },
        {
            title: __("CAPS & Permissions"),
            description: __("15 fine-grained capabilities across Module, Action, and Report categories. 3 role bundles: Viewer (11 caps), Power User (14), Admin (15). Gate pattern checks permissions before any sensitive operation."),
            icon: "shield-lock",
        },
        {
            title: __("Start Building — Your Next Steps"),
            description: __("1) Visit the Visual Hub for live demos. 2) Try the Playground for hands-on testing. 3) Read the docs at frappe_visual/docs/. 4) Use frappe.visual.engine() to start adding components to your app."),
            icon: "rocket",
        },
    ];

    // Use frappe.visual.generator for premium wizard rendering
    const renderWithGenerator = () => {
        try {
            frappe.visual.generator.onboardingWizard(
                $container[0],
                "Frappe Visual",
                steps.map(s => ({
                    ...s,
                    onComplete: s.title.includes("rocket") || s.title.includes("Ready") || s.title.includes("Go Live") || s.title.includes("Start")
                        ? () => frappe.set_route("app")
                        : undefined,
                }))
            );
        } catch(e) {
            console.warn("Generator failed, using fallback:", e);
            renderFallback($container, steps);
        }
    };

    const renderFallback = ($el, steps) => {
        const stepsHtml = steps.map((s, i) => `
            <div style="display:flex;gap:16px;padding:20px 0;border-bottom:1px solid var(--border-color)">
                <div style="width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.1);color:#6366F1;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${i+1}</div>
                <div><h3 style="font-size:1rem;font-weight:600;margin-bottom:4px">${__(s.title)}</h3><p style="font-size:0.9rem;color:var(--text-muted)">${__(s.description)}</p></div>
            </div>
        `).join('');
        $el.html(`
            <div style="text-align:center;padding:60px 20px">
                <h1>🚀 ${__("Get Started with Frappe Visual")}</h1>
                <p style="color:var(--text-muted)">${__("Follow these steps to set up and master Frappe Visual.")}</p>
            </div>
            <div style="max-width:700px;margin:0 auto;padding:0 20px">${stepsHtml}</div>
        `);
    };

    if (frappe.visual && frappe.visual.generator) {
        renderWithGenerator();
    } else {
        frappe.require("frappe_visual.bundle.js", () => {
            if (frappe.visual && frappe.visual.generator) {
                renderWithGenerator();
            } else {
                renderFallback($container, steps);
            }
        });
    }
};
