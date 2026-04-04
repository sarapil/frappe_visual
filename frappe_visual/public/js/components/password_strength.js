/**
 * FrappeVisual PasswordStrength — Visual password strength meter
 * ================================================================
 * frappe.visual.PasswordStrength.create({ container, ... })
 */
export class PasswordStrength {
	static create(opts = {}) { return new PasswordStrength(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			value: '',
			showBar: true,
			showLabel: true,
			showRequirements: true,
			minLength: 8,
			requireUppercase: true,
			requireLowercase: true,
			requireNumber: true,
			requireSpecial: true,
			labels: { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong', veryStrong: 'Very Strong' },
			colors: { weak: '#ef4444', fair: '#f97316', good: '#eab308', strong: '#22c55e', veryStrong: '#16a34a' },
			onChange: null,
		}, opts);

		this.el = document.createElement('div');
		this.el.className = 'fv-pw';
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const score = this._calcScore(this.o.value);
		const level = this._getLevel(score);
		const label = this.o.labels[level];
		const color = this.o.colors[level];

		let html = '';

		if (this.o.showBar) {
			const pct = Math.min(100, score * 20);
			html += `<div class="fv-pw-bar"><div class="fv-pw-fill" style="width:${pct}%;background:${color}"></div></div>`;
		}

		if (this.o.showLabel && this.o.value) {
			html += `<span class="fv-pw-label" style="color:${color}">${PasswordStrength._esc(label)}</span>`;
		}

		if (this.o.showRequirements) {
			const checks = this._getChecks(this.o.value);
			html += '<div class="fv-pw-reqs">';
			checks.forEach(c => {
				html += `<div class="fv-pw-req ${c.met ? 'fv-pw-met' : ''}">
					<span class="fv-pw-check">${c.met ? '✓' : '○'}</span>
					<span>${PasswordStrength._esc(c.label)}</span>
				</div>`;
			});
			html += '</div>';
		}

		this.el.innerHTML = html;
	}

	_calcScore(pw) {
		if (!pw) return 0;
		let score = 0;
		if (pw.length >= this.o.minLength) score++;
		if (pw.length >= 12) score++;
		if (/[A-Z]/.test(pw)) score++;
		if (/[a-z]/.test(pw)) score++;
		if (/[0-9]/.test(pw)) score++;
		if (/[^A-Za-z0-9]/.test(pw)) score++;
		if (pw.length >= 16) score++;
		// Penalize repeated chars
		if (/(.)\1{2,}/.test(pw)) score--;
		return Math.max(0, Math.min(5, score));
	}

	_getLevel(score) {
		if (score <= 1) return 'weak';
		if (score === 2) return 'fair';
		if (score === 3) return 'good';
		if (score === 4) return 'strong';
		return 'veryStrong';
	}

	_getChecks(pw) {
		const checks = [];
		checks.push({ label: `At least ${this.o.minLength} characters`, met: pw.length >= this.o.minLength });
		if (this.o.requireUppercase) checks.push({ label: 'Uppercase letter', met: /[A-Z]/.test(pw) });
		if (this.o.requireLowercase) checks.push({ label: 'Lowercase letter', met: /[a-z]/.test(pw) });
		if (this.o.requireNumber) checks.push({ label: 'Number', met: /[0-9]/.test(pw) });
		if (this.o.requireSpecial) checks.push({ label: 'Special character', met: /[^A-Za-z0-9]/.test(pw) });
		return checks;
	}

	setValue(v) { this.o.value = v; this._render(); if (this.o.onChange) this.o.onChange(v, this._calcScore(v)); }
	getScore() { return this._calcScore(this.o.value); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
