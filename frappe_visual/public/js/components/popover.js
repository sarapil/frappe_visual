/**
 * FrappeVisual Popover — Rich tooltip/popover with arrow placement
 * ==================================================================
 * frappe.visual.Popover.create({ trigger, content, placement, ... })
 *
 * Placement: top|bottom|left|right + start|end (12 positions)
 * Trigger: hover | click | focus | manual
 */
export class Popover {
	static create(opts = {}) { return new Popover(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			trigger: null,          // selector or element
			content: '',            // html string, element, or render fn
			title: '',
			placement: 'top',       // top|bottom|left|right[-start|-end]
			triggerOn: 'hover',     // hover | click | focus | manual
			showDelay: 200,
			hideDelay: 100,
			arrow: true,
			interactive: false,     // hovering popover keeps it open
			maxWidth: 320,
			offset: 8,
			theme: 'default',      // default | dark | glass
			onShow: null,
			onHide: null,
		}, opts);

		this.visible = false;
		this._triggerEl = typeof this.o.trigger === 'string'
			? document.querySelector(this.o.trigger) : this.o.trigger;

		if (!this._triggerEl) return;
		this._build();
		this._bind();
	}

	_build() {
		this.el = document.createElement('div');
		this.el.className = `fv-pop fv-pop-${this.o.theme}`;
		this.el.style.maxWidth = this.o.maxWidth + 'px';
		this.el.setAttribute('role', 'tooltip');

		let html = '';
		if (this.o.arrow) html += `<div class="fv-pop-arrow"></div>`;
		if (this.o.title) html += `<div class="fv-pop-title">${Popover._esc(this.o.title)}</div>`;
		html += `<div class="fv-pop-body"></div>`;
		this.el.innerHTML = html;

		const body = this.el.querySelector('.fv-pop-body');
		if (typeof this.o.content === 'function') {
			const result = this.o.content(body);
			if (result instanceof HTMLElement) body.appendChild(result);
			else if (typeof result === 'string') body.innerHTML = result;
		} else if (this.o.content instanceof HTMLElement) {
			body.appendChild(this.o.content);
		} else {
			body.innerHTML = this.o.content;
		}
	}

	_bind() {
		const mode = this.o.triggerOn;

		if (mode === 'hover') {
			this._triggerEl.addEventListener('mouseenter', () => this._scheduleShow());
			this._triggerEl.addEventListener('mouseleave', () => this._scheduleHide());
			if (this.o.interactive) {
				this.el.addEventListener('mouseenter', () => clearTimeout(this._hideTimer));
				this.el.addEventListener('mouseleave', () => this._scheduleHide());
			}
		} else if (mode === 'click') {
			this._triggerEl.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
			document.addEventListener('click', (e) => {
				if (this.visible && !this.el.contains(e.target) && !this._triggerEl.contains(e.target)) this.hide();
			});
		} else if (mode === 'focus') {
			this._triggerEl.addEventListener('focus', () => this.show());
			this._triggerEl.addEventListener('blur', () => this.hide());
		}
	}

	_scheduleShow() { clearTimeout(this._hideTimer); this._showTimer = setTimeout(() => this.show(), this.o.showDelay); }
	_scheduleHide() { clearTimeout(this._showTimer); this._hideTimer = setTimeout(() => this.hide(), this.o.hideDelay); }

	show() {
		if (this.visible) return;
		document.body.appendChild(this.el);
		this._position();
		this.el.classList.add('fv-pop-visible');
		this.visible = true;
		if (this.o.onShow) this.o.onShow();
	}

	hide() {
		if (!this.visible) return;
		this.el.classList.remove('fv-pop-visible');
		setTimeout(() => { if (this.el.parentNode) this.el.remove(); }, 200);
		this.visible = false;
		if (this.o.onHide) this.o.onHide();
	}

	toggle() { this.visible ? this.hide() : this.show(); }

	_position() {
		const trigRect = this._triggerEl.getBoundingClientRect();
		const tipRect = this.el.getBoundingClientRect();
		const offset = this.o.offset;
		const [side, align] = this.o.placement.split('-');

		let top = 0, left = 0;

		if (side === 'top') {
			top = trigRect.top - tipRect.height - offset + window.scrollY;
			left = trigRect.left + (trigRect.width - tipRect.width) / 2 + window.scrollX;
		} else if (side === 'bottom') {
			top = trigRect.bottom + offset + window.scrollY;
			left = trigRect.left + (trigRect.width - tipRect.width) / 2 + window.scrollX;
		} else if (side === 'left') {
			top = trigRect.top + (trigRect.height - tipRect.height) / 2 + window.scrollY;
			left = trigRect.left - tipRect.width - offset + window.scrollX;
		} else if (side === 'right') {
			top = trigRect.top + (trigRect.height - tipRect.height) / 2 + window.scrollY;
			left = trigRect.right + offset + window.scrollX;
		}

		if (align === 'start') {
			if (side === 'top' || side === 'bottom') left = trigRect.left + window.scrollX;
			else top = trigRect.top + window.scrollY;
		} else if (align === 'end') {
			if (side === 'top' || side === 'bottom') left = trigRect.right - tipRect.width + window.scrollX;
			else top = trigRect.bottom - tipRect.height + window.scrollY;
		}

		// Auto-flip if out of viewport
		if (top < window.scrollY) top = trigRect.bottom + offset + window.scrollY;
		if (left < 0) left = 8;
		if (left + tipRect.width > window.innerWidth) left = window.innerWidth - tipRect.width - 8;

		this.el.style.position = 'absolute';
		this.el.style.top = top + 'px';
		this.el.style.left = left + 'px';
		this.el.setAttribute('data-side', side);
	}

	destroy() {
		this.hide();
		this._triggerEl = null;
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
