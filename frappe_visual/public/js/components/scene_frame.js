/**
 * SceneFrame — Wall-mounted picture frame showing a KPI value
 *
 * Renders an ornate frame on the back wall with a label, value,
 * optional icon, and a status-coloured accent bar.
 *
 * SceneFrame.render(parentGroup, { label, value, status, icon, x, y, w, h }, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneFrame {
  static STATUS = {
    success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
    info: "#3b82f6", neutral: "#94a3b8",
  };

  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  static render(parent, opts, eng) {
    const { label = "", value = "", status = "neutral", icon = "", x = 0, y = 0, w = 110, h = 80 } = opts;
    const color = SceneFrame.STATUS[status] || SceneFrame.STATUS.neutral;
    const pal = eng?._pal || {};

    const g = SceneFrame._el("g", {
      class: "fv-scene__frame",
      "data-type": "frame",
      "data-id": (label || "").toLowerCase().replace(/\s+/g, "_"),
      transform: `translate(${x},${y})`,
      style: eng?.interactive ? "cursor:pointer" : "",
    }, parent);

    // Shadow
    SceneFrame._el("rect", {
      x: 3, y: 3, width: w, height: h, rx: 3,
      fill: pal.shadow || "rgba(0,0,0,.15)", filter: "url(#fv-sc-shadow)",
    }, g);

    // Outer frame
    SceneFrame._el("rect", {
      x: 0, y: 0, width: w, height: h, rx: 3,
      fill: pal.trim || "#8b7355", stroke: pal.trim || "#8b7355",
      "stroke-width": "1",
    }, g);

    // Inner mat
    const pad = 6;
    SceneFrame._el("rect", {
      x: pad, y: pad, width: w - pad * 2, height: h - pad * 2, rx: 2,
      fill: "#fff", opacity: "0.95",
    }, g);

    // Status accent bar (top)
    SceneFrame._el("rect", {
      x: pad, y: pad, width: w - pad * 2, height: 4, rx: 1,
      fill: color,
    }, g);

    // Icon (emoji or text)
    if (icon) {
      const t = SceneFrame._el("text", {
        x: w / 2, y: pad + 22,
        "text-anchor": "middle", "font-size": "14",
        "dominant-baseline": "middle",
      }, g);
      t.textContent = icon;
    }

    // Value
    const valY = icon ? pad + 38 : pad + 28;
    const vt = SceneFrame._el("text", {
      x: w / 2, y: valY,
      "text-anchor": "middle", "font-size": "16",
      "font-weight": "800", fill: "#1e293b",
      "dominant-baseline": "middle",
      class: "fv-scene__frame-value",
    }, g);
    vt.textContent = value;

    // Label
    const lt = SceneFrame._el("text", {
      x: w / 2, y: h - pad - 6,
      "text-anchor": "middle", "font-size": "9",
      fill: "#64748b", "font-weight": "500",
      class: "fv-scene__frame-label",
    }, g);
    lt.textContent = label;

    // Interaction
    if (eng?.interactive) {
      g.addEventListener("mouseenter", () => g.setAttribute("filter", "url(#fv-sc-glow)"));
      g.addEventListener("mouseleave", () => g.removeAttribute("filter"));
      g.addEventListener("click", () => eng.onElementClick?.("frame", opts));
    }

    return g;
  }
}
