/**
 * Collapsible — Expand / collapse sections
 * ==========================================
 * Smooth animated open/close, nested support, accordion mode.
 *
 * frappe.visual.Collapsible.create({
 *   target: "#faq",
 *   items: [
 *     { title: "Question 1", content: "<p>Answer</p>", open: false, icon: "?" },
 *     { title: "Question 2", content: "…", children: [ … ] }
 *   ],
 *   accordion: false,  // only one open at a time
 *   variant: "default", // default | bordered | ghost
 *   size: "md",
 *   onToggle: (idx, open) => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class Collapsible {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			accordion: false,
			variant: "default",
			size: "md",
			onToggle: null,
		}, opts);

		this._panels = [];
		this.render();
	}

	static create(opts) { return new Collapsible(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-coll fv-coll-${this.variant} fv-coll-${this.size}`;

		this.items.forEach((item, i) => {
			wrap.appendChild(this._buildItem(item, i));
		});

		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;
	}

	_buildItem(item, idx) {
		const panel = document.createElement("div");
		panel.className = `fv-coll-item ${item.open ? "fv-coll-open" : ""}`;

		/* Header */
		const header = document.createElement("button");
		header.className = "fv-coll-header";
		header.innerHTML = `
			${item.icon ? `<span class="fv-coll-icon">${_esc(item.icon)}</span>` : ""}
			<span class="fv-coll-title">${_esc(item.title)}</span>
			<span class="fv-coll-chevron">&#9662;</span>
		`;
		header.onclick = () => this._toggle(panel, idx);

		/* Body */
		const body = document.createElement("div");
		body.className = "fv-coll-body";
		const inner = document.createElement("div");
		inner.className = "fv-coll-inner";
		inner.innerHTML = item.content || "";

		/* Nested children */
		if (item.children?.length) {
			const nested = document.createElement("div");
			nested.className = "fv-coll-nested";
			item.children.forEach((child, ci) => {
				nested.appendChild(this._buildItem(child, `${idx}-${ci}`));
			});
			inner.appendChild(nested);
		}

		body.appendChild(inner);
		panel.appendChild(header);
		panel.appendChild(body);

		/* Set initial height */
		if (item.open) {
			requestAnimationFrame(() => {
				body.style.maxHeight = body.scrollHeight + "px";
			});
		}

		this._panels.push({ panel, body, idx });
		return panel;
	}

	_toggle(panel, idx) {
		const isOpen = panel.classList.contains("fv-coll-open");

		/* Accordion: close others */
		if (this.accordion && !isOpen) {
			this._panels.forEach(({ panel: p, body: b }) => {
				if (p !== panel && p.classList.contains("fv-coll-open")) {
					p.classList.remove("fv-coll-open");
					b.style.maxHeight = "0";
				}
			});
		}

		const body = panel.querySelector(".fv-coll-body");
		if (isOpen) {
			panel.classList.remove("fv-coll-open");
			body.style.maxHeight = "0";
		} else {
			panel.classList.add("fv-coll-open");
			body.style.maxHeight = body.scrollHeight + "px";
		}

		this.onToggle?.(idx, !isOpen);
	}

	openAll() {
		this._panels.forEach(({ panel, body }) => {
			panel.classList.add("fv-coll-open");
			body.style.maxHeight = body.scrollHeight + "px";
		});
	}

	closeAll() {
		this._panels.forEach(({ panel, body }) => {
			panel.classList.remove("fv-coll-open");
			body.style.maxHeight = "0";
		});
	}
}
