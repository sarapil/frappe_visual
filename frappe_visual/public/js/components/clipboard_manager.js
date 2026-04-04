/**
 * ClipboardManager — Rich copy/paste with format options
 *
 * const cm = frappe.visual.ClipboardManager.create({
 *   onCopy: ({ text, html }) => {},
 *   showToast: true
 * });
 * cm.copy("text"); cm.copyHTML("<b>bold</b>"); cm.copyJSON({a:1});
 * cm.readText().then(text => {});
 */
export class ClipboardManager {
  static create(opts = {}) { return new ClipboardManager(opts); }

  constructor(opts = {}) {
    Object.assign(this, { onCopy: null, showToast: true }, opts);
  }

  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      this._notify(__("Copied to clipboard"));
      if (this.onCopy) this.onCopy({ text, html: null });
      return true;
    } catch { return this._fallback(text); }
  }

  async copyHTML(html) {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([html.replace(/<[^>]*>/g, "")], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blob, "text/plain": textBlob })
      ]);
      this._notify(__("Copied rich text"));
      if (this.onCopy) this.onCopy({ text: null, html });
      return true;
    } catch { return this.copy(html.replace(/<[^>]*>/g, "")); }
  }

  async copyJSON(obj) {
    return this.copy(JSON.stringify(obj, null, 2));
  }

  async copyTable(rows, headers) {
    const tsv = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
    return this.copy(tsv);
  }

  async readText() {
    try { return await navigator.clipboard.readText(); }
    catch { return ""; }
  }

  _fallback(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    if (ok) this._notify(__("Copied"));
    return ok;
  }

  _notify(msg) {
    if (!this.showToast) return;
    const toast = document.createElement("div");
    toast.className = "fv-clip-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("fv-clip-toast--show"));
    setTimeout(() => { toast.classList.remove("fv-clip-toast--show"); setTimeout(() => toast.remove(), 300); }, 1500);
  }

  destroy() {}
}
