/**
 * PricingTable — Pricing cards with tiers
 * ==========================================
 * Responsive pricing cards with features, highlighted plan, toggles.
 *
 * frappe.visual.PricingTable.create({
 *   target: "#pricing",
 *   plans: [
 *     {
 *       name: "Starter",
 *       price: { monthly: 9, yearly: 90 },
 *       currency: "$",
 *       description: "For individuals",
 *       features: [
 *         { text: "5 projects", included: true },
 *         { text: "API access", included: false }
 *       ],
 *       cta: { label: "Get Started", href: "/signup" },
 *       highlighted: false,
 *       badge: null
 *     },
 *     {
 *       name: "Pro",
 *       price: { monthly: 29, yearly: 290 },
 *       highlighted: true,
 *       badge: "Popular",
 *       …
 *     }
 *   ],
 *   billing: "monthly",     // monthly | yearly
 *   showToggle: true,
 *   variant: "cards",        // cards | minimal
 *   onSelect: (plan) => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class PricingTable {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			plans: [],
			billing: "monthly",
			showToggle: true,
			variant: "cards",
			onSelect: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new PricingTable(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-price fv-price-${this.variant}`;

		/* Toggle */
		if (this.showToggle) {
			const toggle = document.createElement("div");
			toggle.className = "fv-price-toggle";
			toggle.innerHTML = `
				<button class="fv-price-tbtn ${this.billing === "monthly" ? "fv-price-tbtn-active" : ""}" data-b="monthly">Monthly</button>
				<button class="fv-price-tbtn ${this.billing === "yearly" ? "fv-price-tbtn-active" : ""}" data-b="yearly">Yearly</button>
			`;
			toggle.querySelectorAll(".fv-price-tbtn").forEach((btn) => {
				btn.onclick = () => {
					this.billing = btn.dataset.b;
					this.render();
				};
			});
			wrap.appendChild(toggle);
		}

		/* Cards */
		const grid = document.createElement("div");
		grid.className = "fv-price-grid";

		this.plans.forEach((plan) => {
			const card = document.createElement("div");
			card.className = `fv-price-card ${plan.highlighted ? "fv-price-hl" : ""}`;

			const price = typeof plan.price === "object"
				? plan.price[this.billing] ?? plan.price.monthly ?? 0
				: plan.price ?? 0;

			let html = "";
			if (plan.badge) html += `<span class="fv-price-badge">${_esc(plan.badge)}</span>`;
			html += `<h3 class="fv-price-name">${_esc(plan.name)}</h3>`;
			if (plan.description) html += `<p class="fv-price-desc">${_esc(plan.description)}</p>`;
			html += `<div class="fv-price-amount">
				<span class="fv-price-currency">${_esc(plan.currency || "$")}</span>
				<span class="fv-price-value">${price}</span>
				<span class="fv-price-period">/${this.billing === "yearly" ? "yr" : "mo"}</span>
			</div>`;

			if (plan.features?.length) {
				html += `<ul class="fv-price-features">`;
				plan.features.forEach((f) => {
					html += `<li class="fv-price-feat ${f.included ? "" : "fv-price-feat-no"}">
						<span class="fv-price-feat-icon">${f.included ? "✓" : "✕"}</span>
						${_esc(f.text)}
					</li>`;
				});
				html += `</ul>`;
			}

			if (plan.cta) {
				html += `<a class="fv-price-cta ${plan.highlighted ? "fv-price-cta-hl" : ""}" href="${_esc(plan.cta.href || "#")}">${_esc(plan.cta.label || "Select")}</a>`;
			}

			card.innerHTML = html;

			if (this.onSelect) {
				const btn = card.querySelector(".fv-price-cta");
				if (btn) btn.addEventListener("click", (e) => {
					e.preventDefault();
					this.onSelect(plan);
				});
			}

			grid.appendChild(card);
		});

		wrap.appendChild(grid);
		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;
	}

	setBilling(b) {
		this.billing = b;
		this.render();
	}
}
