/**
 * SceneDataBinder — Auto-bind Frappe DocType data to Scene elements
 *
 * Connects a SceneEngine to live Frappe API data, mapping DocType
 * aggregates to frames, lists to documents, modules to books.
 *
 * frappe.visual.SceneDataBinder.create({
 *   engine: sceneInstance,
 *   frames: [
 *     { label: "Revenue", doctype: "Sales Invoice", aggregate: "sum", field: "grand_total",
 *       filters: { status: "Paid" }, format: "$%s", status_rules: { ">100000": "success" } }
 *   ],
 *   documents: [
 *     { label: "Pending", doctype: "Sales Invoice", filters: { status: "Unpaid" },
 *       countField: "name", href: "/app/sales-invoice?status=Unpaid" }
 *   ],
 *   books: [
 *     { label: "Reports", href: "/app/query-report", color: "#6366f1" }
 *   ],
 *   refreshInterval: 30000
 * })
 */
export class SceneDataBinder {
  static create(opts = {}) { return new SceneDataBinder(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      engine: null,
      frames: [], documents: [], books: [], notes: [],
      refreshInterval: 30000, autoStart: true,
    }, opts);
    this._timer = null;
    if (this.autoStart) this.refresh().then(() => this._startTimer());
  }

  async refresh() {
    if (!this.engine) return;

    const [frameData, docData] = await Promise.all([
      this._fetchFrames(),
      this._fetchDocuments(),
    ]);

    this.engine.refresh({
      frames: frameData,
      documents: docData,
      books: this.books,
      notes: this.notes,
    });
  }

  async _fetchFrames() {
    return Promise.all(this.frames.map(async (f) => {
      try {
        const result = await frappe.xcall("frappe.client.get_count", {
          doctype: f.doctype,
          filters: f.filters || {},
        });

        let value = result;
        if (f.aggregate === "sum" || f.aggregate === "avg") {
          const agg = await frappe.xcall("frappe.client.get_list", {
            doctype: f.doctype,
            filters: f.filters || {},
            fields: [`${f.aggregate}(${f.field || "grand_total"}) as val`],
            limit_page_length: 1,
          });
          value = agg?.[0]?.val || 0;
        }

        // Format
        let display = f.format ? f.format.replace("%s", this._formatNum(value)) : this._formatNum(value);

        // Status rules
        let status = "neutral";
        if (f.status_rules) {
          for (const [rule, st] of Object.entries(f.status_rules)) {
            const op = rule[0], threshold = parseFloat(rule.slice(1));
            if (op === ">" && value > threshold) status = st;
            else if (op === "<" && value < threshold) status = st;
            else if (op === "=" && value === threshold) status = st;
          }
        }

        return { label: f.label, value: display, status, icon: f.icon || "" };
      } catch (e) {
        console.warn("[SceneDataBinder] frame fetch error:", f.label, e);
        return { label: f.label, value: "—", status: "neutral" };
      }
    }));
  }

  async _fetchDocuments() {
    return Promise.all(this.documents.map(async (d) => {
      try {
        const count = await frappe.xcall("frappe.client.get_count", {
          doctype: d.doctype,
          filters: d.filters || {},
        });
        return {
          label: d.label, count,
          href: d.href || `/app/${d.doctype.toLowerCase().replace(/ /g, "-")}`,
          color: d.color || "#6366f1",
        };
      } catch (e) {
        return { label: d.label, count: 0, href: d.href || "#", color: d.color || "#94a3b8" };
      }
    }));
  }

  _formatNum(n) {
    if (typeof n !== "number") return String(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString();
  }

  _startTimer() {
    if (this.refreshInterval > 0) {
      this._timer = setInterval(() => this.refresh(), this.refreshInterval);
    }
  }

  stop() { clearInterval(this._timer); }

  destroy() {
    this.stop();
    this.engine = null;
  }
}
