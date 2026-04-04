/**
 * SceneDocument — Clickable document / paper on a desk surface
 *
 * Renders a sheet of paper with a title, optional badge count,
 * and a coloured edge tab.  Slightly rotated for realism.
 *
 * SceneDocument.render(parentGroup, { label, count, href, color, x, y, rotation }, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneDocument {
  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  static render(parent, opts, eng) {
    const { label = "", count = null, href = "#", color = "#6366f1", x = 0, y = 0, rotation = 0 } = opts;

    const w = 55, h = 68;
    const g = SceneDocument._el("g", {
      class: "fv-scene__doc",
      "data-type": "document",
      "data-id": (label || "").toLowerCase().replace(/\s+/g, "_"),
      transform: `translate(${x},${y}) rotate(${rotation}, ${w / 2}, ${h / 2})`,
      style: "cursor:pointer",
    }, parent);

    // Paper shadow
    SceneDocument._el("rect", {
      x: 2, y: 2, width: w, height: h, rx: 2,
      fill: "rgba(0,0,0,.1)",
    }, g);

    // Paper body
    SceneDocument._el("rect", {
      x: 0, y: 0, width: w, height: h, rx: 2,
      fill: "#fff", stroke: "#e2e8f0", "stroke-width": "0.5",
    }, g);

    // Dog-ear corner
    SceneDocument._el("polygon", {
      points: `${w - 10},0 ${w},10 ${w - 10},10`,
      fill: "#f1f5f9",
    }, g);
    SceneDocument._el("polygon", {
      points: `${w - 10},0 ${w},10 ${w},0`,
      fill: "#e2e8f0",
    }, g);

    // Colour tab on left edge
    SceneDocument._el("rect", {
      x: 0, y: 8, width: 4, height: 20, rx: 1,
      fill: color,
    }, g);

    // Fake text lines
    for (let i = 0; i < 4; i++) {
      SceneDocument._el("rect", {
        x: 10, y: 30 + i * 7, width: 30 - (i % 2) * 8, height: 2, rx: 1,
        fill: "#e2e8f0",
      }, g);
    }

    // Label text
    const lt = SceneDocument._el("text", {
      x: w / 2, y: 18,
      "text-anchor": "middle", "font-size": "7",
      "font-weight": "600", fill: "#334155",
    }, g);
    lt.textContent = label.length > 10 ? label.slice(0, 9) + "…" : label;

    // Badge count
    if (count != null) {
      SceneDocument._el("circle", {
        cx: w - 6, cy: h - 8, r: 8,
        fill: color,
      }, g);
      const ct = SceneDocument._el("text", {
        x: w - 6, y: h - 5,
        "text-anchor": "middle", "font-size": "7",
        "font-weight": "700", fill: "#fff",
      }, g);
      ct.textContent = count > 99 ? "99+" : count;
    }

    // Interactions
    if (eng?.interactive) {
      g.addEventListener("mouseenter", () => {
        g.style.transform = `translate(${x}px,${y - 3}px) rotate(${rotation}deg)`;
        g.setAttribute("filter", "url(#fv-sc-shadow)");
      });
      g.addEventListener("mouseleave", () => {
        g.style.transform = "";
        g.setAttribute("transform", `translate(${x},${y}) rotate(${rotation}, ${w / 2}, ${h / 2})`);
        g.removeAttribute("filter");
      });
      g.addEventListener("click", () => {
        if (eng.onElementClick) eng.onElementClick("document", opts);
        else if (href) window.location.href = href;
      });
    }

    return g;
  }
}
