/**
 * SceneLighting — Ambient lighting, lamp glow, and shadow effects
 *
 * Adds atmospheric lighting layers to a scene SVG:
 *   – Ambient radial gradient from a light source
 *   – Window light spill on the floor
 *   – Vignette darkening at edges
 *   – Optional animated flicker for candle/warm themes
 *
 * SceneLighting.render(svg, palette, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneLighting {
  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  static render(svg, pal, eng) {
    const W = eng?.width || 800, H = eng?.height || 500;
    const defs = svg.querySelector("defs") || SceneLighting._el("defs", {}, svg);
    const g = SceneLighting._el("g", { class: "fv-scene__lighting" }, svg);

    // ── Ambient radial light (from upper right — simulating window) ──
    const ambId = "fv-sc-ambient";
    const amb = SceneLighting._el("radialGradient", {
      id: ambId, cx: "0.7", cy: "0.2", r: "0.8", fx: "0.7", fy: "0.2",
    }, defs);
    SceneLighting._el("stop", { offset: "0%", "stop-color": "#fff", "stop-opacity": "0.12" }, amb);
    SceneLighting._el("stop", { offset: "100%", "stop-color": "#000", "stop-opacity": "0" }, amb);

    SceneLighting._el("rect", {
      x: 0, y: 0, width: W, height: H,
      fill: `url(#${ambId})`,
      class: "fv-scene__ambient-light",
    }, g);

    // ── Window light patch on floor ──────────────────────────
    const winId = "fv-sc-winlight";
    const wg = SceneLighting._el("linearGradient", {
      id: winId, x1: "0", y1: "0", x2: "1", y2: "1",
    }, defs);
    SceneLighting._el("stop", { offset: "0%", "stop-color": "#fff", "stop-opacity": "0.08" }, wg);
    SceneLighting._el("stop", { offset: "100%", "stop-color": "#fff", "stop-opacity": "0" }, wg);

    // Light quadrilateral on floor (like sunlight through window)
    SceneLighting._el("polygon", {
      points: `${W * 0.55},${H * 0.62} ${W * 0.75},${H * 0.58} ${W * 0.82},${H * 0.82} ${W * 0.62},${H * 0.88}`,
      fill: `url(#${winId})`,
      opacity: "0.6",
      class: "fv-scene__window-light",
    }, g);

    // ── Vignette (darken edges for depth) ────────────────────
    const vigId = "fv-sc-vignette";
    const vig = SceneLighting._el("radialGradient", {
      id: vigId, cx: "0.5", cy: "0.45", r: "0.7",
    }, defs);
    SceneLighting._el("stop", { offset: "0%", "stop-color": "#000", "stop-opacity": "0" }, vig);
    SceneLighting._el("stop", { offset: "100%", "stop-color": "#000", "stop-opacity": "0.15" }, vig);

    SceneLighting._el("rect", {
      x: 0, y: 0, width: W, height: H,
      fill: `url(#${vigId})`,
      class: "fv-scene__vignette",
    }, g);

    return g;
  }
}
