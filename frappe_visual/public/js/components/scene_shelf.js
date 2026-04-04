/**
 * SceneShelf — Bookshelf with coloured book spines as clickable links
 *
 * Renders a perspective bookshelf on the left wall with 2-3 shelves.
 * Each book is a clickable link with a coloured spine and label.
 *
 * SceneShelf.render(svg, { x, y, w, h, books }, engine)
 */
const NS = "http://www.w3.org/2000/svg";

export class SceneShelf {
  static _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  static render(svg, opts, eng) {
    const { x = 30, y = 80, w = 100, h = 200, books = [] } = opts;
    const pal = eng?._pal || {};
    const g = SceneShelf._el("g", { class: "fv-scene__shelf" }, svg);

    const shelfCount = Math.min(3, Math.max(2, Math.ceil(books.length / 4)));
    const shelfH = h / shelfCount;
    const woodColor = pal.trim || "#8b7355";
    const woodLight = pal.floor || "#c9a87c";

    // Shelf back panel
    SceneShelf._el("rect", {
      x, y, width: w, height: h, rx: 2,
      fill: woodColor, opacity: "0.3",
    }, g);

    // Individual shelves + books
    for (let s = 0; s < shelfCount; s++) {
      const sy = y + s * shelfH;
      const shelfBottomY = sy + shelfH;

      // Shelf board (top of books area)
      SceneShelf._el("rect", {
        x: x - 2, y: shelfBottomY - 5, width: w + 4, height: 5, rx: 1,
        fill: woodLight, stroke: woodColor, "stroke-width": "0.5",
      }, g);

      // Books on this shelf
      const shelfBooks = books.slice(s * 4, (s + 1) * 4);
      const bookAreaW = w - 8;
      const maxBookW = 18;
      const bookGap = 2;
      let bx = x + 6;

      shelfBooks.forEach((book, i) => {
        const bw = Math.min(maxBookW, (bookAreaW - shelfBooks.length * bookGap) / shelfBooks.length);
        const bh = shelfH - 14 - (i % 2 === 0 ? 0 : 4); // varied heights
        const by = shelfBottomY - 5 - bh;
        const bookColor = book.color || ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b"][i % 4];

        const bg = SceneShelf._el("g", {
          class: "fv-scene__book",
          "data-type": "book",
          "data-id": (book.label || "").toLowerCase().replace(/\s+/g, "_"),
          style: "cursor:pointer",
        }, g);

        // Book body
        SceneShelf._el("rect", {
          x: bx, y: by, width: bw, height: bh, rx: 1,
          fill: bookColor,
        }, bg);

        // Spine detail line
        SceneShelf._el("line", {
          x1: bx + bw - 2, y1: by + 2, x2: bx + bw - 2, y2: by + bh - 2,
          stroke: "rgba(0,0,0,.15)", "stroke-width": "1",
        }, bg);

        // Top highlight
        SceneShelf._el("rect", {
          x: bx, y: by, width: bw, height: 3, rx: 1,
          fill: "rgba(255,255,255,.2)",
        }, bg);

        // Spine label (rotated)
        if (bh > 30) {
          const lt = SceneShelf._el("text", {
            x: bx + bw / 2, y: by + bh / 2,
            "text-anchor": "middle", "font-size": "5",
            "font-weight": "600", fill: "#fff",
            transform: `rotate(-90, ${bx + bw / 2}, ${by + bh / 2})`,
            "dominant-baseline": "middle",
          }, bg);
          lt.textContent = (book.label || "").slice(0, 8);
        }

        // Interactions
        if (eng?.interactive) {
          bg.addEventListener("mouseenter", () => { bg.style.opacity = "0.85"; bg.setAttribute("filter", "url(#fv-sc-glow)"); });
          bg.addEventListener("mouseleave", () => { bg.style.opacity = "1"; bg.removeAttribute("filter"); });
          bg.addEventListener("click", () => {
            if (eng.onElementClick) eng.onElementClick("book", book);
            else if (book.href) window.location.href = book.href;
          });
        }

        bx += bw + bookGap;
      });
    }

    // Side panels
    SceneShelf._el("rect", { x: x - 3, y, width: 3, height: h, fill: woodColor, opacity: "0.6" }, g);
    SceneShelf._el("rect", { x: x + w, y, width: 3, height: h, fill: woodColor, opacity: "0.6" }, g);

    return g;
  }
}
