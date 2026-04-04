/**
 * SceneNavigator — In-scene navigation system with clickable zones
 *
 * Overlays invisible clickable hotspots on a scene that act as links.
 * Supports labelled zones, cursor change, tooltip, and transitions.
 *
 * frappe.visual.SceneNavigator.create({
 *   engine: sceneInstance,
 *   zones: [
 *     { id: "door", label: "Go to Settings", shape: "rect", coords: [700,300,80,200], href: "/app/settings" },
 *     { id: "window", label: "View Analytics", shape: "circle", coords: [720,150,30], href: "/app/analytics" },
 *     { id: "poster", label: "Help", shape: "poly", coords: [180,100,260,100,260,155,180,155], href: "/app/help" }
 *   ],
 *   showLabels: "hover",   // "always" | "hover" | "never"
 *   transition: "fade"     // "fade" | "slide" | "none"
 * })
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneNavigator {
  static create(opts = {}) { return new SceneNavigator(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      engine: null, zones: [],
      showLabels: "hover", transition: "fade",
    }, opts);
    this._build();
  }

  _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  _build() {
    const svg = this.engine?.svg;
    if (!svg) return;

    this.group = this._el("g", { class: "fv-scene__nav" }, svg);

    this.zones.forEach(zone => {
      let shape;
      const baseAttrs = {
        class: "fv-scene__nav-zone",
        "data-zone": zone.id,
        fill: "rgba(99,102,241,.0)",
        stroke: "none",
        style: "cursor:pointer",
      };

      if (zone.shape === "rect" && zone.coords?.length >= 4) {
        const [x, y, w, h] = zone.coords;
        shape = this._el("rect", { ...baseAttrs, x, y, width: w, height: h, rx: 4 }, this.group);
      } else if (zone.shape === "circle" && zone.coords?.length >= 3) {
        const [cx, cy, r] = zone.coords;
        shape = this._el("circle", { ...baseAttrs, cx, cy, r }, this.group);
      } else if (zone.shape === "poly" && zone.coords?.length >= 6) {
        const points = [];
        for (let i = 0; i < zone.coords.length; i += 2) {
          points.push(`${zone.coords[i]},${zone.coords[i + 1]}`);
        }
        shape = this._el("polygon", { ...baseAttrs, points: points.join(" ") }, this.group);
      }

      if (!shape) return;

      // Label tooltip
      let label = null;
      if (zone.label && this.showLabels !== "never") {
        const bbox = zone.coords;
        const lx = zone.shape === "circle" ? bbox[0] : bbox[0] + (bbox[2] || 0) / 2;
        const ly = zone.shape === "circle" ? bbox[1] - bbox[2] - 10 : bbox[1] - 10;

        // Background
        label = this._el("g", {
          class: "fv-scene__nav-label",
          opacity: this.showLabels === "always" ? "1" : "0",
        }, this.group);

        this._el("rect", {
          x: lx - 30, y: ly - 8, width: 60, height: 16, rx: 4,
          fill: "rgba(30,30,46,.85)",
        }, label);

        const t = this._el("text", {
          x: lx, y: ly + 2,
          "text-anchor": "middle", "font-size": "7",
          fill: "#fff", "font-weight": "500",
        }, label);
        t.textContent = zone.label.slice(0, 15);
      }

      // Hover effects
      shape.addEventListener("mouseenter", () => {
        shape.setAttribute("fill", "rgba(99,102,241,.12)");
        shape.setAttribute("stroke", "rgba(99,102,241,.3)");
        shape.setAttribute("stroke-width", "1.5");
        if (label && this.showLabels === "hover") label.setAttribute("opacity", "1");
      });

      shape.addEventListener("mouseleave", () => {
        shape.setAttribute("fill", "rgba(99,102,241,.0)");
        shape.setAttribute("stroke", "none");
        if (label && this.showLabels === "hover") label.setAttribute("opacity", "0");
      });

      // Click navigation
      shape.addEventListener("click", () => {
        if (zone.handler) return zone.handler(zone);
        if (!zone.href) return;
        if (this.transition === "fade") {
          this.engine?.wrap?.style.setProperty("opacity", "0");
          this.engine?.wrap?.style.setProperty("transition", "opacity .3s");
          setTimeout(() => { window.location.href = zone.href; }, 300);
        } else {
          window.location.href = zone.href;
        }
      });
    });
  }

  addZone(zone) {
    this.zones.push(zone);
    this.group?.remove();
    this._build();
  }

  destroy() { this.group?.remove(); }
}
