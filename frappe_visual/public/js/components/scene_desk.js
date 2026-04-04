/**
 * SceneDesk — Perspective desk surface with side panels
 *
 * Renders a wooden desk in 1-point perspective on the room floor.
 * Documents are placed on top by SceneEngine.
 *
 * SceneDesk.render(svg, { x, y, w, h }, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneDesk {
  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  static render(svg, opts, eng) {
    const { x = 280, y = 330, w = 240, h = 75 } = opts;
    const pal = eng?._pal || {};
    const g = SceneDesk._el("g", { class: "fv-scene__desk" }, svg);

    // Perspective: desk top is a trapezoid (front wider than back)
    const shrink = w * 0.08;
    const topL  = x + shrink;
    const topR  = x + w - shrink;
    const botL  = x - 10;
    const botR  = x + w + 10;
    const topY  = y;
    const botY  = y + h;

    // Desk shadow
    SceneDesk._el("polygon", {
      points: `${botL + 8},${botY + 4} ${botR + 8},${botY + 4} ${topR + 5},${topY + 4} ${topL + 5},${topY + 4}`,
      fill: pal.shadow || "rgba(0,0,0,.15)",
      opacity: "0.4",
    }, g);

    // Desk front face
    SceneDesk._el("polygon", {
      points: `${botL},${botY} ${botR},${botY} ${botR},${botY + 14} ${botL},${botY + 14}`,
      fill: pal.trim || "#6b5b45",
      opacity: "0.85",
    }, g);

    // Desk top surface
    SceneDesk._el("polygon", {
      points: `${topL},${topY} ${topR},${topY} ${botR},${botY} ${botL},${botY}`,
      fill: pal.floor || "#c9a87c",
      stroke: pal.trim || "#8b7355",
      "stroke-width": "1.5",
      class: "fv-scene__desk-top",
    }, g);

    // Wood grain lines on desk
    const grainG = SceneDesk._el("g", { opacity: "0.08" }, g);
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const lx = topL + (botL - topL) * t;
      const rx = topR + (botR - topR) * t;
      const ly = topY + (botY - topY) * t;
      SceneDesk._el("line", {
        x1: lx, y1: ly, x2: rx, y2: ly,
        stroke: pal.trim || "#6b5b45", "stroke-width": "0.8",
      }, grainG);
    }

    // Desk legs (front two visible)
    const legW = 8, legH = 35;
    SceneDesk._el("rect", {
      x: botL + 15, y: botY + 14, width: legW, height: legH,
      fill: pal.trim || "#6b5b45", rx: 1,
    }, g);
    SceneDesk._el("rect", {
      x: botR - 23, y: botY + 14, width: legW, height: legH,
      fill: pal.trim || "#6b5b45", rx: 1,
    }, g);

    // Optional: small lamp on desk
    const lampX = topR - 30, lampY = topY - 32;
    const lampG = SceneDesk._el("g", { class: "fv-scene__lamp", opacity: "0.7" }, g);
    // Lamp base
    SceneDesk._el("ellipse", { cx: lampX, cy: topY - 2, rx: 10, ry: 3, fill: pal.trim || "#6b5b45" }, lampG);
    // Lamp pole
    SceneDesk._el("line", { x1: lampX, y1: topY - 2, x2: lampX, y2: lampY, stroke: pal.trim || "#6b5b45", "stroke-width": "2" }, lampG);
    // Lamp shade
    SceneDesk._el("polygon", {
      points: `${lampX - 14},${lampY} ${lampX + 14},${lampY} ${lampX + 8},${lampY - 14} ${lampX - 8},${lampY - 14}`,
      fill: pal.accent || "#d4a373", opacity: "0.8",
    }, lampG);
    // Lamp glow
    SceneDesk._el("ellipse", {
      cx: lampX, cy: lampY - 5, rx: 20, ry: 12,
      fill: pal.accent || "#d4a373", opacity: "0.08",
      class: "fv-scene__lamp-glow",
    }, lampG);

    return g;
  }
}
