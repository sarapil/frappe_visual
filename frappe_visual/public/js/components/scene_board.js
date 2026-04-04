/**
 * SceneBoard — Corkboard / whiteboard with pinned sticky notes
 *
 * Renders a board on the back wall with colourful pinned notes.
 * Each note can be a clickable link.
 *
 * SceneBoard.render(svg, { x, y, w, h, notes }, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneBoard {
  static NOTE_COLORS = ["#fbbf24", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"];

  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  static render(svg, opts, eng) {
    const { x = 350, y = 230, w = 120, h = 55, notes = [] } = opts;
    const pal = eng?._pal || {};
    const g = SceneBoard._el("g", { class: "fv-scene__board" }, svg);

    // Board shadow
    SceneBoard._el("rect", {
      x: x + 3, y: y + 3, width: w, height: h, rx: 3,
      fill: "rgba(0,0,0,.1)",
    }, g);

    // Board body (cork colour)
    SceneBoard._el("rect", {
      x, y, width: w, height: h, rx: 3,
      fill: "#d4a574", stroke: pal.trim || "#8b7355",
      "stroke-width": "2",
    }, g);

    // Cork texture dots
    const dotsG = SceneBoard._el("g", { opacity: "0.1" }, g);
    for (let i = 0; i < 15; i++) {
      SceneBoard._el("circle", {
        cx: x + 8 + Math.random() * (w - 16),
        cy: y + 8 + Math.random() * (h - 16),
        r: 1 + Math.random(),
        fill: "#8b6914",
      }, dotsG);
    }

    // Frame border (thin)
    SceneBoard._el("rect", {
      x: x + 2, y: y + 2, width: w - 4, height: h - 4, rx: 2,
      fill: "none", stroke: pal.trim || "#8b7355", "stroke-width": "0.5", opacity: "0.3",
    }, g);

    // Notes
    const noteG = SceneBoard._el("g", { class: "fv-scene__board-notes" }, g);
    const maxNotes = Math.min(notes.length, 5);
    const noteW = 28, noteH = 24;

    for (let i = 0; i < maxNotes; i++) {
      const note = notes[i];
      const nx = x + 8 + (i % 3) * (noteW + 4);
      const ny = y + 6 + Math.floor(i / 3) * (noteH + 3);
      const nColor = note.color || SceneBoard.NOTE_COLORS[i % SceneBoard.NOTE_COLORS.length];
      const rot = -4 + Math.random() * 8;

      const ng = SceneBoard._el("g", {
        class: "fv-scene__note",
        "data-type": "note",
        "data-id": i,
        transform: `rotate(${rot}, ${nx + noteW / 2}, ${ny + noteH / 2})`,
        style: note.href || eng?.interactive ? "cursor:pointer" : "",
      }, noteG);

      // Note paper
      SceneBoard._el("rect", {
        x: nx, y: ny, width: noteW, height: noteH, rx: 1,
        fill: nColor, opacity: "0.9",
      }, ng);

      // Fold shadow
      SceneBoard._el("polygon", {
        points: `${nx},${ny} ${nx + 6},${ny} ${nx},${ny + 6}`,
        fill: "rgba(0,0,0,.08)",
      }, ng);

      // Pin
      SceneBoard._el("circle", {
        cx: nx + noteW / 2, cy: ny + 2, r: 2,
        fill: "#ef4444", stroke: "#fff", "stroke-width": "0.5",
      }, ng);

      // Text
      const text = (note.text || "").slice(0, 12);
      if (text) {
        const t = SceneBoard._el("text", {
          x: nx + noteW / 2, y: ny + noteH / 2 + 2,
          "text-anchor": "middle", "font-size": "4.5",
          fill: "rgba(0,0,0,.65)", "font-weight": "500",
        }, ng);
        t.textContent = text;
      }

      // Interactions
      if (eng?.interactive) {
        ng.addEventListener("mouseenter", () => ng.setAttribute("filter", "url(#fv-sc-glow)"));
        ng.addEventListener("mouseleave", () => ng.removeAttribute("filter"));
        ng.addEventListener("click", () => {
          if (eng.onElementClick) eng.onElementClick("note", note);
          else if (note.href) window.location.href = note.href;
        });
      }
    }

    return g;
  }
}
