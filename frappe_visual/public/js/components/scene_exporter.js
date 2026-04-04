/**
 * SceneExporter — Export SVG scenes as PNG, JPEG, PDF, or SVG download
 *
 * frappe.visual.SceneExporter.create({
 *   engine: sceneInstance,
 *   filename: "dashboard-scene",
 *   format: "png",      // "png" | "jpeg" | "svg" | "pdf"
 *   scale: 2,           // 2x for retina
 *   background: "#fff"
 * })
 */
export class SceneExporter {
  static create(opts = {}) { return new SceneExporter(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      engine: null,
      filename: "scene-export",
      format: "png",
      scale: 2,
      background: "#ffffff",
      quality: 0.92,
    }, opts);
  }

  async export(overrides = {}) {
    const opts = { ...this, ...overrides };
    if (!opts.engine?.svg) throw new Error("No scene engine attached");

    const format = opts.format.toLowerCase();
    if (format === "svg") return this._exportSVG(opts);
    if (format === "pdf") return this._exportPDF(opts);
    return this._exportBitmap(opts);
  }

  _exportSVG(opts) {
    const svgStr = new XMLSerializer().serializeToString(opts.engine.svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    this._download(blob, `${opts.filename}.svg`);
    return blob;
  }

  async _exportBitmap(opts) {
    const svg = opts.engine.svg;
    const vb = svg.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 800, 500];
    const w = vb[2] * opts.scale;
    const h = vb[3] * opts.scale;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);

    // Render SVG to canvas via Image
    const svgStr = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        const mimeType = opts.format === "jpeg" ? "image/jpeg" : "image/png";
        canvas.toBlob(
          (resultBlob) => {
            this._download(resultBlob, `${opts.filename}.${opts.format}`);
            resolve(resultBlob);
          },
          mimeType,
          opts.quality
        );
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async _exportPDF(opts) {
    // Generate PNG first, then wrap in a simple PDF-like download
    // For full PDF support, integrate with jsPDF or server-side
    const pngBlob = await this._exportBitmap({ ...opts, format: "png" });
    // Fallback: download as PNG with PDF note
    frappe.msgprint(__("PDF export requires jsPDF. Downloaded as PNG instead."));
    return pngBlob;
  }

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  destroy() { this.engine = null; }
}
