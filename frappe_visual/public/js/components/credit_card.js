// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual CreditCard — Visual card preview
 * =================================================
 * frappe.visual.CreditCard.create({ container, ... })
 */
export class CreditCard {
	static create(opts = {}) { return new CreditCard(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			number: '',
			name: '',
			expiry: '',
			cvv: '',
			variant: 'dark',         // dark | light | gradient
			showFlip: true,
			brand: 'auto',           // auto | visa | mastercard | amex
		}, opts);

		this.el = document.createElement('div');
		this._flipped = false;
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		const brand = o.brand === 'auto' ? this._detectBrand(o.number) : o.brand;
		this.el.className = `fv-cc fv-cc-${o.variant}${this._flipped ? ' fv-cc-flipped' : ''}`;

		const num = this._formatNumber(o.number);
		const brandIcon = this._brandSvg(brand);

		this.el.innerHTML = `
			<div class="fv-cc-inner">
				<div class="fv-cc-front">
					<div class="fv-cc-chip"><svg width="36" height="28" viewBox="0 0 36 28" fill="none"><rect x="1" y="1" width="34" height="26" rx="4" stroke="#d4a843" stroke-width="1.5"/><line x1="1" y1="10" x2="35" y2="10" stroke="#d4a843" stroke-width="1"/><line x1="1" y1="18" x2="35" y2="18" stroke="#d4a843" stroke-width="1"/><line x1="12" y1="1" x2="12" y2="27" stroke="#d4a843" stroke-width="1"/><line x1="24" y1="1" x2="24" y2="27" stroke="#d4a843" stroke-width="1"/></svg></div>
					<div class="fv-cc-brand">${brandIcon}</div>
					<div class="fv-cc-number">${num || '•••• •••• •••• ••••'}</div>
					<div class="fv-cc-bottom">
						<div class="fv-cc-name">${CreditCard._esc(o.name || 'CARDHOLDER NAME')}</div>
						<div class="fv-cc-expiry"><span class="fv-cc-exp-label">EXP</span> ${CreditCard._esc(o.expiry || 'MM/YY')}</div>
					</div>
				</div>
				<div class="fv-cc-back">
					<div class="fv-cc-stripe"></div>
					<div class="fv-cc-cvv-wrap">
						<span class="fv-cc-cvv-label">CVV</span>
						<span class="fv-cc-cvv">${o.cvv ? '•'.repeat(o.cvv.length) : '•••'}</span>
					</div>
					<div class="fv-cc-brand fv-cc-brand-back">${brandIcon}</div>
				</div>
			</div>
		`;

		if (o.showFlip) {
			this.el.onclick = () => { this._flipped = !this._flipped; this.el.classList.toggle('fv-cc-flipped'); };
		}
	}

	_formatNumber(n) {
		const clean = n.replace(/\D/g, '');
		return clean.replace(/(.{4})/g, '$1 ').trim();
	}

	_detectBrand(n) {
		const d = n.replace(/\D/g, '');
		if (/^4/.test(d)) return 'visa';
		if (/^5[1-5]/.test(d)) return 'mastercard';
		if (/^3[47]/.test(d)) return 'amex';
		return 'generic';
	}

	_brandSvg(brand) {
		const svgs = {
			visa: '<svg width="48" height="16" viewBox="0 0 48 16"><text x="0" y="13" fill="#fff" font-weight="700" font-size="14" font-style="italic" font-family="sans-serif">VISA</text></svg>',
			mastercard: '<svg width="36" height="22" viewBox="0 0 36 22"><circle cx="12" cy="11" r="10" fill="#eb001b" opacity="0.8"/><circle cx="24" cy="11" r="10" fill="#f79e1b" opacity="0.8"/></svg>',
			amex: '<svg width="36" height="16" viewBox="0 0 36 16"><text x="0" y="13" fill="#fff" font-weight="700" font-size="11" font-family="sans-serif">AMEX</text></svg>',
			generic: '<svg width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" rx="3" fill="rgba(255,255,255,0.2)"/></svg>',
		};
		return svgs[brand] || svgs.generic;
	}

	setData(data) { Object.assign(this.o, data); this._render(); }
	flip() { this._flipped = !this._flipped; this.el.classList.toggle('fv-cc-flipped'); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
