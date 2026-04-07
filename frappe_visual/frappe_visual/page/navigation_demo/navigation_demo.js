// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Frappe Visual — Navigation Demo
 * Interactive showcase of 9 navigation/wayfinding components (Tier 5).
 */
frappe.pages["navigation-demo"].on_page_show = function (wrapper) {
  if (wrapper._navigation_demo_initialized) return;
  wrapper._navigation_demo_initialized = true;

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Navigation Demo"),
    single_column: true,
  });

  page.set_indicator(__("9 Components"), "orange");

  const navComponents = [
    {
      name: "Command Bar",
      icon: "command",
      description: __("⌘K spotlight search — search anything from anywhere"),
      api: "commandBar",
      shortcut: "⌘K / Ctrl+K",
    },
    {
      name: "Floating Nav",
      icon: "menu-2",
      description: __("Floating navigation bubble with quick-access actions"),
      api: "floatingNav",
      shortcut: null,
    },
    {
      name: "Page Transition",
      icon: "arrows-right-left",
      description: __("Smooth animated transitions between pages"),
      api: "pageTransition",
      shortcut: null,
    },
    {
      name: "Back To Top",
      icon: "arrow-up",
      description: __("Smooth scroll-to-top button with progress ring"),
      api: "backToTop",
      shortcut: null,
    },
    {
      name: "Nav Rail",
      icon: "layout-sidebar-left-collapse",
      description: __("Vertical icon rail for desktop — collapses on mobile"),
      api: "navRail",
      shortcut: null,
    },
    {
      name: "Anchor Nav",
      icon: "anchor",
      description: __("Sticky section navigation with scroll progress"),
      api: "anchorNav",
      shortcut: null,
    },
    {
      name: "Tab Bar",
      icon: "layout-navbar",
      description: __("Horizontal tab bar with animated indicator"),
      api: "tabBar",
      shortcut: null,
    },
    {
      name: "Bottom Nav",
      icon: "layout-bottombar",
      description: __("Mobile-style bottom navigation bar"),
      api: "bottomNav",
      shortcut: null,
    },
    {
      name: "Speed Dial",
      icon: "plus",
      description: __("FAB with expanding radial action menu"),
      api: "speedDial",
      shortcut: null,
    },
  ];

  const container = $(`
    <div class="fv-navigation-demo fv-fx-page-enter" style="padding: 20px;">
      <div class="mb-4">
        <p class="text-muted">${__("Tier 5 — Wayfinding Suite: 9 navigation components for seamless user journeys.")}</p>
      </div>
      <div class="fv-nav-grid row"></div>
    </div>
  `).appendTo(page.body);

  const grid = container.find(".fv-nav-grid");

  navComponents.forEach((comp, i) => {
    const card = $(`
      <div class="col-lg-4 col-md-6 col-12 mb-4" style="animation: fadeInUp 0.3s ease ${i * 0.05}s both;">
        <div class="fv-fx-glass fv-fx-hover-lift" style="padding: 24px; border-radius: 12px; cursor: pointer; height: 100%;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, var(--primary), #8B5CF6); display: flex; align-items: center; justify-content: center;">
              <span class="ti ti-${comp.icon}" style="font-size: 24px; color: white;"></span>
            </div>
            <div>
              <h5 style="margin: 0;">${comp.name}</h5>
              ${comp.shortcut ? `<span class="badge" style="font-size: 10px; background: var(--fg-color); color: var(--text-muted);">${comp.shortcut}</span>` : ""}
            </div>
          </div>
          <p class="text-muted" style="font-size: 13px; margin-bottom: 16px;">${comp.description}</p>
          <div class="fv-nav-preview" style="background: var(--fg-color); border-radius: 8px; padding: 16px; min-height: 80px; position: relative; overflow: hidden;">
            ${_getNavPreview(comp)}
          </div>
          <div style="margin-top: 12px;">
            <code style="font-size: 11px; color: var(--text-muted);">frappe.visual.${comp.api}(opts)</code>
          </div>
        </div>
      </div>
    `);

    card.on("click", () => {
      _tryLiveDemo(comp);
    });

    grid.append(card);
  });

  function _getNavPreview(comp) {
    switch (comp.api) {
      case "commandBar":
        return `<div style="background: var(--bg-color); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
          <span class="ti ti-search" style="color: var(--text-muted);"></span>
          <span style="color: var(--text-light); font-size: 13px;">${__("Search anything...")}</span>
          <span style="margin-inline-start: auto; font-size: 11px; color: var(--text-muted); background: var(--fg-color); padding: 2px 6px; border-radius: 4px;">⌘K</span>
        </div>`;
      case "bottomNav":
        return `<div style="display: flex; justify-content: space-around; padding: 8px 0;">
          ${["home", "search", "plus-circle", "bell", "user"].map((ic, idx) => `<div style="text-align: center; color: ${idx === 0 ? "var(--primary)" : "var(--text-muted)"};">
            <span class="ti ti-${ic}" style="font-size: 20px;"></span>
            <div style="font-size: 9px; margin-top: 2px;">${ic}</div>
          </div>`).join("")}
        </div>`;
      case "tabBar":
        return `<div style="display: flex; gap: 0; border-bottom: 2px solid var(--border-color); position: relative;">
          ${["Overview", "Details", "History"].map((t, idx) => `<div style="padding: 8px 16px; font-size: 13px; color: ${idx === 0 ? "var(--primary)" : "var(--text-muted)"}; border-bottom: 2px solid ${idx === 0 ? "var(--primary)" : "transparent"}; margin-bottom: -2px;">${t}</div>`).join("")}
        </div>`;
      case "speedDial":
        return `<div style="position: relative; height: 60px;">
          <div style="position: absolute; inset-inline-end: 0; bottom: 0; width: 40px; height: 40px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center;">
            <span class="ti ti-plus" style="color: white; font-size: 20px;"></span>
          </div>
        </div>`;
      default:
        return `<div style="display: flex; align-items: center; justify-content: center; height: 50px;">
          <span class="ti ti-${comp.icon}" style="font-size: 32px; color: var(--primary); opacity: 0.3;"></span>
        </div>`;
    }
  }

  function _tryLiveDemo(comp) {
    frappe.msgprint({
      title: comp.name,
      message: `<p>${comp.description}</p>
        <pre><code>// Usage
const nav = await frappe.visual.${comp.api}({
  container: '#my-container',
  // ... options
});
</code></pre>
        ${comp.shortcut ? `<p><strong>${__("Keyboard Shortcut")}:</strong> ${comp.shortcut}</p>` : ""}`,
      indicator: "orange",
    });
  }
};
