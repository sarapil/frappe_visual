// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Frappe Visual — Micro-Animation Demo
 * Interactive showcase of 9 GSAP-powered animation effects (Tier 9).
 */
frappe.pages["animation-demo"].on_page_show = function (wrapper) {
  if (wrapper._animation_demo_initialized) return;
  wrapper._animation_demo_initialized = true;

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Micro-Animation Demo"),
    single_column: true,
  });

  page.set_indicator(__("GSAP Powered"), "green");

  const animations = [
    {
      name: "Typewriter",
      icon: "cursor-text",
      description: __("Character-by-character text reveal with blinking cursor"),
      api: "typewriter",
      demo: "typewriter",
    },
    {
      name: "Parallax",
      icon: "layers-subtract",
      description: __("Multi-layer depth scrolling effect"),
      api: "parallax",
      demo: "parallax",
    },
    {
      name: "Confetti",
      icon: "confetti",
      description: __("Celebration particle explosion"),
      api: "confetti",
      demo: "confetti",
    },
    {
      name: "Ripple",
      icon: "ripple",
      description: __("Material Design ripple on click/tap"),
      api: "ripple",
      demo: "ripple",
    },
    {
      name: "Text Loop",
      icon: "rotate",
      description: __("Rotating text with smooth transitions"),
      api: "textLoop",
      demo: "textLoop",
    },
    {
      name: "Number Ticker",
      icon: "123",
      description: __("Animated counting number with easing"),
      api: "numberTicker",
      demo: "numberTicker",
    },
    {
      name: "Glow Card",
      icon: "sparkles",
      description: __("Dynamic glow effect following mouse cursor"),
      api: "glowCard",
      demo: "glowCard",
    },
    {
      name: "Morphing Text",
      icon: "text-resize",
      description: __("SVG path morphing between text strings"),
      api: "morphingText",
      demo: "morphingText",
    },
    {
      name: "Dot Pattern",
      icon: "grid-dots",
      description: __("Animated dot grid background pattern"),
      api: "dotPattern",
      demo: "dotPattern",
    },
  ];

  const container = $(`
    <div class="fv-animation-demo fv-fx-page-enter" style="padding: 20px;">
      <div class="mb-4">
        <p class="text-muted">${__("Tier 9 — GSAP Micro-Animation Suite: Click any card to see the effect in action.")}</p>
      </div>
      <div class="fv-animation-grid row"></div>
    </div>
  `).appendTo(page.body);

  const grid = container.find(".fv-animation-grid");

  animations.forEach((anim, i) => {
    const card = $(`
      <div class="col-lg-4 col-md-6 col-12 mb-4" style="animation: fadeInUp 0.3s ease ${i * 0.06}s both;">
        <div class="fv-fx-glass fv-fx-hover-lift" style="padding: 24px; border-radius: 12px; cursor: pointer; height: 100%;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span class="ti ti-${anim.icon}" style="font-size: 28px; color: var(--primary);"></span>
            <h5 style="margin: 0;">${anim.name}</h5>
          </div>
          <p class="text-muted" style="font-size: 13px; margin-bottom: 16px;">${anim.description}</p>
          <div class="fv-anim-preview" style="background: var(--fg-color); border-radius: 8px; padding: 20px; min-height: 100px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
            ${_getPreview(anim)}
          </div>
          <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <code style="font-size: 11px; color: var(--text-muted);">frappe.visual.${anim.api}()</code>
            <button class="btn btn-xs btn-primary-light fv-play-btn">${__("▶ Play")}</button>
          </div>
        </div>
      </div>
    `);

    card.find(".fv-play-btn").on("click", function (e) {
      e.stopPropagation();
      _playAnimation(anim, card.find(".fv-anim-preview"));
    });

    grid.append(card);
  });

  function _getPreview(anim) {
    switch (anim.demo) {
      case "typewriter":
        return `<span style="font-size: 18px; font-family: monospace;">Hello World_</span>`;
      case "numberTicker":
        return `<span class="fv-ticker-val" style="font-size: 36px; font-weight: 700; color: var(--primary);">0</span>`;
      case "confetti":
        return `<span style="font-size: 40px;">🎉</span>`;
      case "dotPattern":
        return `<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
          ${Array(25).fill(0).map(() => `<div style="width: 6px; height: 6px; background: var(--primary); opacity: 0.2; border-radius: 50%;"></div>`).join("")}
        </div>`;
      default:
        return `<span class="ti ti-${anim.icon}" style="font-size: 40px; color: var(--primary); opacity: 0.3;"></span>`;
    }
  }

  function _playAnimation(anim, previewEl) {
    switch (anim.demo) {
      case "numberTicker": {
        const el = previewEl.find(".fv-ticker-val");
        let val = 0;
        const target = Math.floor(Math.random() * 9999) + 1000;
        const step = Math.ceil(target / 40);
        const interval = setInterval(() => {
          val = Math.min(val + step, target);
          el.text(val.toLocaleString());
          if (val >= target) clearInterval(interval);
        }, 25);
        break;
      }
      case "confetti": {
        const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
        for (let c = 0; c < 30; c++) {
          const particle = $(`<div style="
            position: absolute; width: 8px; height: 8px; border-radius: 50%;
            background: ${colors[c % colors.length]};
            left: 50%; top: 50%; pointer-events: none;
          "></div>`).appendTo(previewEl);
          const angle = (Math.PI * 2 * c) / 30;
          const dist = 40 + Math.random() * 60;
          particle.animate(
            { left: `calc(50% + ${Math.cos(angle) * dist}px)`, top: `calc(50% + ${Math.sin(angle) * dist}px)`, opacity: 0 },
            800,
            function () { $(this).remove(); }
          );
        }
        break;
      }
      case "ripple": {
        const ripple = $(`<div style="
          position: absolute; width: 0; height: 0; border-radius: 50%;
          background: var(--primary); opacity: 0.4;
          left: 50%; top: 50%; transform: translate(-50%, -50%);
        "></div>`).appendTo(previewEl);
        ripple.animate({ width: 120, height: 120, opacity: 0 }, 600, function () { $(this).remove(); });
        break;
      }
      default:
        previewEl.css("opacity", 0.5).animate({ opacity: 1 }, 400);
    }
  }
};
