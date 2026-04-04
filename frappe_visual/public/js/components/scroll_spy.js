// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual ScrollSpy — Section tracking with active nav
 * ============================================================
 * frappe.visual.ScrollSpy.create({ container, sections, ... })
 */
export class ScrollSpy {
	static create(opts = {}) { return new ScrollSpy(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,         // nav container
			scrollContainer: null,   // element to observe (default: window)
			sections: [],            // [{ id, label, icon? }] or auto-detect from headings
			offset: 80,
			smooth: true,
			activeClass: 'fv-spy-active',
			variant: 'default',      // default | pill | underline | dot
			orientation: 'vertical', // vertical | horizontal
			onChange: null,
		}, opts);

		this._activeId = null;
		this.el = document.createElement('nav');
		this._render();
		this._observe();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-spy fv-spy-${o.variant} fv-spy-${o.orientation}`;

		const sections = o.sections.length ? o.sections : this._autoDetect();

		this.el.innerHTML = sections.map(sec =>
			`<a class="fv-spy-link" href="#${sec.id}" data-id="${sec.id}">
				${sec.icon ? `<span class="fv-spy-icon">${sec.icon}</span>` : ''}
				<span class="fv-spy-text">${ScrollSpy._esc(sec.label)}</span>
			</a>`
		).join('');

		// Click handler
		this.el.querySelectorAll('.fv-spy-link').forEach(link => {
			link.onclick = (e) => {
				e.preventDefault();
				const id = link.dataset.id;
				const target = document.getElementById(id);
				if (target) {
					const top = target.getBoundingClientRect().top + window.scrollY - this.o.offset;
					window.scrollTo({ top, behavior: this.o.smooth ? 'smooth' : 'auto' });
				}
			};
		});
	}

	_autoDetect() {
		const headings = document.querySelectorAll('h2[id], h3[id], [data-scrollspy]');
		return Array.from(headings).map(h => ({
			id: h.id || h.dataset.scrollspy,
			label: h.textContent.trim(),
		}));
	}

	_observe() {
		const scrollEl = this.o.scrollContainer
			? (typeof this.o.scrollContainer === 'string' ? document.querySelector(this.o.scrollContainer) : this.o.scrollContainer)
			: null;

		const handler = () => {
			const links = this.el.querySelectorAll('.fv-spy-link');
			let activeId = null;

			links.forEach(link => {
				const id = link.dataset.id;
				const sec = document.getElementById(id);
				if (sec) {
					const rect = sec.getBoundingClientRect();
					if (rect.top <= this.o.offset + 10) activeId = id;
				}
			});

			if (activeId && activeId !== this._activeId) {
				this._activeId = activeId;
				links.forEach(l => l.classList.remove(this.o.activeClass));
				const active = this.el.querySelector(`[data-id="${activeId}"]`);
				if (active) active.classList.add(this.o.activeClass);
				if (this.o.onChange) this.o.onChange(activeId);
			}
		};

		(scrollEl || window).addEventListener('scroll', handler, { passive: true });
		handler(); // Initial check

		this._cleanup = () => (scrollEl || window).removeEventListener('scroll', handler);
	}

	destroy() { if (this._cleanup) this._cleanup(); this.el.remove(); }
	setActive(id) {
		this._activeId = id;
		this.el.querySelectorAll('.fv-spy-link').forEach(l => {
			l.classList.toggle(this.o.activeClass, l.dataset.id === id);
		});
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
