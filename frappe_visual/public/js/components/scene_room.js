/**
 * SceneRoom — Perspective room geometry renderer
 *
 * Generates back wall, left wall, right wall, floor, baseboards and optional
 * ceiling for a 1-point-perspective interior scene.  Used internally by
 * SceneEngine but can also be used standalone.
 *
 * SceneRoom.render(svgElement, palette, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneRoom {
  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  /**
   * Render the room geometry into an SVG element.
   * @param {SVGElement} svg  — target <svg>
   * @param {Object} pal      — colour palette { wall, wallSide, floor, floorDark, trim, shadow }
   * @param {Object} eng      — SceneEngine instance (for width/height)
   */
  static render(svg, pal, eng) {
    const W = eng?.width || 800, H = eng?.height || 500;
    const g = SceneRoom._el("g", { class: "fv-scene__room" }, svg);

    // ── Geometry (1-point perspective) ───────────────────────
    //  TL───────────────────TR      ← ceiling line
    //  │╲                  ╱│
    //  │  BL────────────BR  │      ← back wall
    //  │  │              │  │
    //  │  BL2──────────BR2  │      ← floor line (back)
    //  │╱                  ╲│
    //  FL───────────────────FR     ← floor front
    const margin = W * 0.025;
    const topY   = H * 0.02;
    const backT  = H * 0.14;
    const backB  = H * 0.60;
    const floorY = H * 0.98;
    const backL  = W * 0.175;
    const backR  = W * 0.825;

    // Floor
    SceneRoom._el("polygon", {
      points: `${backL},${backB} ${backR},${backB} ${W - margin},${floorY} ${margin},${floorY}`,
      fill: "url(#fv-sc-floor)",
      class: "fv-scene__floor"
    }, g);

    // Floor planks (decorative lines)
    const plankG = SceneRoom._el("g", { class: "fv-scene__planks", opacity: "0.12" }, g);
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const lx = backL + (margin - backL) * t;
      const rx = backR + (W - margin - backR) * t;
      const y  = backB + (floorY - backB) * t;
      SceneRoom._el("line", {
        x1: lx, y1: y, x2: rx, y2: y,
        stroke: pal.trim, "stroke-width": "0.8"
      }, plankG);
    }

    // Back wall
    SceneRoom._el("rect", {
      x: backL, y: backT, width: backR - backL, height: backB - backT,
      fill: pal.wall,
      class: "fv-scene__back-wall"
    }, g);

    // Left wall
    SceneRoom._el("polygon", {
      points: `${margin},${topY} ${backL},${backT} ${backL},${backB} ${margin},${floorY}`,
      fill: pal.wallSide,
      class: "fv-scene__left-wall"
    }, g);

    // Right wall
    SceneRoom._el("polygon", {
      points: `${W - margin},${topY} ${backR},${backT} ${backR},${backB} ${W - margin},${floorY}`,
      fill: pal.wallSide,
      class: "fv-scene__right-wall"
    }, g);

    // ── Baseboards ───────────────────────────────────────────
    const bH = 6;
    // Back baseboard
    SceneRoom._el("rect", {
      x: backL, y: backB - bH, width: backR - backL, height: bH,
      fill: pal.trim, opacity: "0.5",
    }, g);
    // Left baseboard
    SceneRoom._el("polygon", {
      points: `${margin},${floorY} ${backL},${backB} ${backL},${backB - bH} ${margin},${floorY - bH * 1.5}`,
      fill: pal.trim, opacity: "0.4",
    }, g);
    // Right baseboard
    SceneRoom._el("polygon", {
      points: `${W - margin},${floorY} ${backR},${backB} ${backR},${backB - bH} ${W - margin},${floorY - bH * 1.5}`,
      fill: pal.trim, opacity: "0.4",
    }, g);

    // ── Ceiling moulding ─────────────────────────────────────
    SceneRoom._el("line", {
      x1: backL, y1: backT, x2: backR, y2: backT,
      stroke: pal.trim, "stroke-width": "2", opacity: "0.3"
    }, g);
    SceneRoom._el("line", {
      x1: margin, y1: topY, x2: backL, y2: backT,
      stroke: pal.trim, "stroke-width": "1.5", opacity: "0.2"
    }, g);
    SceneRoom._el("line", {
      x1: W - margin, y1: topY, x2: backR, y2: backT,
      stroke: pal.trim, "stroke-width": "1.5", opacity: "0.2"
    }, g);

    // ── Corner lines ─────────────────────────────────────────
    SceneRoom._el("line", {
      x1: backL, y1: backT, x2: backL, y2: backB,
      stroke: pal.trim, "stroke-width": "1", opacity: "0.15"
    }, g);
    SceneRoom._el("line", {
      x1: backR, y1: backT, x2: backR, y2: backB,
      stroke: pal.trim, "stroke-width": "1", opacity: "0.15"
    }, g);

    return g;
  }
}
