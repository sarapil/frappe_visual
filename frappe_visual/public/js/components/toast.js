/**
 * FrappeVisual Toast / Snackbar — Stackable notifications
 * =========================================================
 * frappe.visual.Toast.show({ title, message, type, duration, position, actions })
 *
 * Types: success | error | warning | info | loading
 * Positions: top-right | top-left | top-center | bottom-right | bottom-left | bottom-center
 */
export class Toast {
	static _containers = {};

	static show(opts = {}) {
		const o = Object.assign({
			title: '',
			message: '',
			type: 'info',           // success | error | warning | info | loading
			duration: 4000,         // 0 = persistent
			position: 'top-right',
			showProgress: true,
			closable: true,
			icon: null,             // custom SVG string
			actions: [],            // [{ label, onClick, variant:'primary'|'ghost' }]
			onClose: null,
		}, opts);

		const container = Toast._getContainer(o.position);
		const el = document.createElement('div');
		el.className = `fv-toast fv-toast-${o.type} fv-toast-enter`;
		el.setAttribute('role', 'alert');

		const iconSvg = o.icon || Toast._defaultIcon(o.type);
		let html = `<div class="fv-toast-icon">${iconSvg}</div>`;
		html += `<div class="fv-toast-body">`;
		if (o.title) html += `<div class="fv-toast-title">${Toast._esc(o.title)}</div>`;
		if (o.message) html += `<div class="fv-toast-msg">${Toast._esc(o.message)}</div>`;
		if (o.actions.length) {
			html += `<div class="fv-toast-actions">`;
			o.actions.forEach((a, i) => {
				html += `<button class="fv-toast-action fv-toast-action-${a.variant || 'ghost'}" data-idx="${i}">${Toast._esc(a.label)}</button>`;
			});
			html += `</div>`;
		}
		html += `</div>`;
		if (o.closable) html += `<button class="fv-toast-close" aria-label="Close">&times;</button>`;
		if (o.showProgress && o.duration > 0) html += `<div class="fv-toast-progress"><div class="fv-toast-progress-bar"></div></div>`;
		el.innerHTML = html;

		// Close handler
		const dismiss = () => {
			el.classList.remove('fv-toast-enter');
			el.classList.add('fv-toast-exit');
			el.addEventListener('animationend', () => {
				el.remove();
				if (o.onClose) o.onClose();
			}, { once: true });
		};

		if (o.closable) el.querySelector('.fv-toast-close').onclick = dismiss;
		o.actions.forEach((a, i) => {
			el.querySelector(`[data-idx="${i}"]`).onclick = () => { if (a.onClick) a.onClick(); dismiss(); };
		});

		// Progress bar
		if (o.showProgress && o.duration > 0) {
			const bar = el.querySelector('.fv-toast-progress-bar');
			bar.style.transition = `width ${o.duration}ms linear`;
			requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '0%'; }));
		}

		container.appendChild(el);
		if (o.duration > 0) setTimeout(dismiss, o.duration);

		return { dismiss, el };
	}

	/* Convenience */
	static success(msg, opts = {}) { return Toast.show({ ...opts, message: msg, type: 'success' }); }
	static error(msg, opts = {})   { return Toast.show({ ...opts, message: msg, type: 'error' }); }
	static warning(msg, opts = {}) { return Toast.show({ ...opts, message: msg, type: 'warning' }); }
	static info(msg, opts = {})    { return Toast.show({ ...opts, message: msg, type: 'info' }); }
	static loading(msg, opts = {}) { return Toast.show({ ...opts, message: msg, type: 'loading', duration: 0, showProgress: false }); }

	static _getContainer(position) {
		if (Toast._containers[position]) return Toast._containers[position];
		const c = document.createElement('div');
		c.className = `fv-toast-container fv-toast-${position}`;
		document.body.appendChild(c);
		Toast._containers[position] = c;
		return c;
	}

	static _defaultIcon(type) {
		const icons = {
			success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
			error:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
			warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
			info:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
			loading: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="fv-toast-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
		};
		return icons[type] || icons.info;
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
