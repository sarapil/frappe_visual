/**
 * StackedLayout — Stacked card / layered layout
 * ================================================
 * Cards that stack/fan out with perspective for depth.
 *
 * frappe.visual.StackedLayout.create({
 *   target: "#stack",
 *   items: [
 *     { html: "<div>Card 1</div>", color: "#6366f1" },
 *     { html: "<div>Card 2</div>", color: "#ec4899" },
 *     { html: "<div>Card 3</div>", color: "#f59e0b" }
 *   ],
 *   direction: "vertical",  // "vertical" | "horizontal"
 *   offset: 12,             // px shift per card
 *   scaleStep: 0.04,        // scale reduction per card
 *   expandOnHover: true,    // fan out on hover
 *   expandOffset: 60,
 *   cardWidth: 300,
 *   cardHeight: 200,
 *   onClick: null,
 *   className: ""
 * })
 */

export class StackedLayout {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			direction: "vertical",
			offset: 12,
			scaleStep: 0.04,
			expandOnHover: true,
			expandOffset: 60,
			cardWidth: 300,
			cardHeight: 200,
			onClick: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new StackedLayout(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const isVert = this.direction === "vertical";
		const wrap = document.createElement("div");
		wrap.className = `fv-stacked fv-stacked-${this.direction} ${this.className}`;
		wrap.style.cssText = `position:relative;width:${this.cardWidth}px;height:${this.cardHeight + this.offset * (this.items.length - 1)}px;perspective:800px;`;

		this.items.forEach((item, i) => {
			const card = document.createElement("div");
			card.className = "fv-stacked-card";
			const scale = 1 - i * this.scaleStep;
			const translateY = isVert ? i * this.offset : 0;
			const translateX = isVert ? 0 : i * this.offset;

			card.style.cssText = `position:absolute;top:0;left:0;width:${this.cardWidth}px;height:${this.cardHeight}px;border-radius:12px;overflow:hidden;background:${item.color || "var(--fg-color, #fff)"};border:1px solid rgba(255,255,255,.2);box-shadow:0 4px 20px rgba(0,0,0,${0.06 + i * 0.02});transform:translate(${translateX}px,${translateY}px) scale(${scale});transition:transform 0.35s cubic-bezier(.4,0,.2,1);z-index:${this.items.length - i};cursor:pointer;`;

			if (typeof item.html === "string") card.innerHTML = item.html;
			else if (item.element) card.appendChild(item.element);

			card.dataset.idx = i;
			wrap.appendChild(card);
		});

		if (this.expandOnHover) {
			wrap.addEventListener("mouseenter", () => {
				wrap.querySelectorAll(".fv-stacked-card").forEach((c, i) => {
					const exp = isVert ? i * this.expandOffset : i * this.expandOffset;
					const scale = 1 - i * (this.scaleStep / 2);
					c.style.transform = isVert
						? `translateY(${exp}px) scale(${scale})`
						: `translateX(${exp}px) scale(${scale})`;
				});
			});
			wrap.addEventListener("mouseleave", () => {
				wrap.querySelectorAll(".fv-stacked-card").forEach((c, i) => {
					const scale = 1 - i * this.scaleStep;
					const ty = isVert ? i * this.offset : 0;
					const tx = isVert ? 0 : i * this.offset;
					c.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
				});
			});
		}

		if (this.onClick) {
			wrap.addEventListener("click", (e) => {
				const card = e.target.closest(".fv-stacked-card");
				if (card) this.onClick(this.items[+card.dataset.idx], +card.dataset.idx);
			});
		}

		el.innerHTML = "";
		el.appendChild(wrap);
	}
}
