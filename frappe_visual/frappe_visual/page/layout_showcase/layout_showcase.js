// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Frappe Visual — Layout Showcase
 * Interactive demo of 9 layout container components (Tier 4).
 */
frappe.pages["layout-showcase"].on_page_show = function (wrapper) {
  if (wrapper._layout_showcase_initialized) return;
  wrapper._layout_showcase_initialized = true;

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Layout Showcase"),
    single_column: true,
  });

  page.set_indicator(__("9 Layouts"), "blue");

  const layouts = [
    {
      name: "Masonry",
      icon: "layout-grid",
      description: __("Pinterest-style masonry layout with auto-sizing columns"),
      category: "grid",
      api: "masonry",
    },
    {
      name: "Dock",
      icon: "layout-bottombar",
      description: __("macOS-style dock with magnification effect"),
      category: "navigation",
      api: "dock",
    },
    {
      name: "GridStack",
      icon: "grid-dots",
      description: __("Draggable and resizable grid panels (dashboard builder)"),
      category: "grid",
      api: "gridStack",
    },
    {
      name: "Bento",
      icon: "layout-2",
      description: __("Bento box layout with varied cell sizes"),
      category: "grid",
      api: "bento",
    },
    {
      name: "Infinite Scroll",
      icon: "arrow-autofit-down",
      description: __("Lazy-loading content as user scrolls down"),
      category: "content",
      api: "infiniteScroll",
    },
    {
      name: "Sortable",
      icon: "arrows-sort",
      description: __("Drag-to-reorder list items with animation"),
      category: "content",
      api: "sortable",
    },
    {
      name: "Virtual List",
      icon: "list",
      description: __("Render 100k+ rows with virtual scrolling"),
      category: "content",
      api: "virtualList",
    },
    {
      name: "Stacked Layout",
      icon: "stack-2",
      description: __("Layered card stack with reveal animation"),
      category: "content",
      api: "stackedLayout",
    },
    {
      name: "Resizable",
      icon: "resize",
      description: __("Resize panels with drag handles"),
      category: "grid",
      api: "resizable",
    },
  ];

  const categories = ["all", "grid", "navigation", "content"];
  let activeCategory = "all";

  const container = $(`
    <div class="fv-layout-showcase fv-fx-page-enter" style="padding: 20px;">
      <div class="row mb-4">
        <div class="col-12">
          <p class="text-muted">${__("Tier 4 — Container Suite: 9 layout components for building responsive, interactive interfaces.")}</p>
        </div>
      </div>
      <div class="fv-filter-bar mb-4" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
      <div class="fv-layout-grid row"></div>
    </div>
  `).appendTo(page.body);

  // Category filter
  const filterBar = container.find(".fv-filter-bar");
  categories.forEach((cat) => {
    $(`<button class="btn btn-sm ${cat === "all" ? "btn-primary" : "btn-default"} fv-cat-btn"
        data-cat="${cat}">${cat === "all" ? __("All") : __(cat.charAt(0).toUpperCase() + cat.slice(1))}</button>`)
      .appendTo(filterBar)
      .on("click", function () {
        activeCategory = cat;
        filterBar.find(".fv-cat-btn").removeClass("btn-primary").addClass("btn-default");
        $(this).removeClass("btn-default").addClass("btn-primary");
        renderLayouts();
      });
  });

  function renderLayouts() {
    const grid = container.find(".fv-layout-grid").empty();
    const filtered = activeCategory === "all" ? layouts : layouts.filter((l) => l.category === activeCategory);

    filtered.forEach((layout, i) => {
      const card = $(`
        <div class="col-lg-4 col-md-6 col-12 mb-4" style="animation: fadeInUp 0.3s ease ${i * 0.05}s both;">
          <div class="fv-fx-glass fv-fx-hover-lift" style="padding: 24px; border-radius: 12px; height: 100%; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span class="ti ti-${layout.icon}" style="font-size: 28px; color: var(--primary);"></span>
              <h5 style="margin: 0;">${layout.name}</h5>
            </div>
            <p class="text-muted" style="font-size: 13px; margin-bottom: 16px;">${layout.description}</p>
            <div class="fv-layout-demo" style="background: var(--fg-color); border-radius: 8px; padding: 16px; min-height: 120px; position: relative; overflow: hidden;">
              ${_getLayoutPreview(layout)}
            </div>
            <div style="margin-top: 12px;">
              <code style="font-size: 11px; color: var(--text-muted);">frappe.visual.${layout.api}(container, opts)</code>
            </div>
          </div>
        </div>
      `);

      card.on("click", () => {
        frappe.msgprint({
          title: layout.name,
          message: `<p>${layout.description}</p>
            <pre><code>const layout = await frappe.visual.${layout.api}('#container', {
  // configuration options
});</code></pre>`,
          indicator: "blue",
        });
      });

      grid.append(card);
    });
  }

  function _getLayoutPreview(layout) {
    switch (layout.api) {
      case "masonry":
        return `<div style="display: flex; gap: 4px;">
          <div style="flex: 1;"><div style="background: var(--primary); opacity: 0.3; height: 40px; border-radius: 4px; margin-bottom: 4px;"></div><div style="background: var(--primary); opacity: 0.2; height: 60px; border-radius: 4px;"></div></div>
          <div style="flex: 1;"><div style="background: var(--primary); opacity: 0.2; height: 60px; border-radius: 4px; margin-bottom: 4px;"></div><div style="background: var(--primary); opacity: 0.3; height: 30px; border-radius: 4px;"></div></div>
          <div style="flex: 1;"><div style="background: var(--primary); opacity: 0.25; height: 50px; border-radius: 4px; margin-bottom: 4px;"></div><div style="background: var(--primary); opacity: 0.15; height: 45px; border-radius: 4px;"></div></div>
        </div>`;
      case "dock":
        return `<div style="display: flex; justify-content: center; align-items: flex-end; gap: 6px; height: 60px;">
          ${[28, 34, 42, 34, 28].map((h) => `<div style="width: 20px; height: ${h}px; background: var(--primary); opacity: 0.3; border-radius: 6px;"></div>`).join("")}
        </div>`;
      case "gridStack":
        return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; height: 80px;">
          <div style="background: var(--primary); opacity: 0.3; grid-column: span 2; border-radius: 4px;"></div>
          <div style="background: var(--primary); opacity: 0.2; border-radius: 4px;"></div>
          <div style="background: var(--primary); opacity: 0.2; border-radius: 4px;"></div>
          <div style="background: var(--primary); opacity: 0.3; grid-column: span 2; border-radius: 4px;"></div>
        </div>`;
      default:
        return `<div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${[1, 2, 3, 4].map(() => `<div style="background: var(--primary); opacity: 0.2; height: 30px; flex: 1; min-width: 40px; border-radius: 4px;"></div>`).join("")}
        </div>`;
    }
  }

  renderLayouts();
};
