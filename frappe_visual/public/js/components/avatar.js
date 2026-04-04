/**
 * FrappeVisual Avatar — User/entity avatar component
 * =====================================================
 * frappe.visual.Avatar.create({ name, image, size, ... })
 * frappe.visual.Avatar.group({ users, max, size })
 */
export class Avatar {
	static create(opts = {}) { return new Avatar(opts); }

	/**
	 * Render a stacked avatar group
	 */
	static group(opts = {}) {
		const { users = [], max = 5, size = 'md', overlap = 8 } = opts;
		const wrap = document.createElement('div');
		wrap.className = `fv-av-group fv-av-group-${size}`;
		wrap.style.setProperty('--fv-av-overlap', `-${overlap}px`);

		const visible = users.slice(0, max);
		const remaining = users.length - max;

		visible.forEach(u => {
			const av = Avatar.create({ ...u, size, showBadge: false });
			wrap.appendChild(av.el);
		});

		if (remaining > 0) {
			const extra = document.createElement('div');
			extra.className = `fv-av fv-av-${size} fv-av-extra`;
			extra.textContent = `+${remaining}`;
			extra.title = users.slice(max).map(u => u.name).join(', ');
			wrap.appendChild(extra);
		}

		return wrap;
	}

	constructor(opts = {}) {
		this.o = Object.assign({
			name: '',
			image: null,
			icon: null,             // SVG string
			size: 'md',             // xs | sm | md | lg | xl | 2xl
			shape: 'circle',        // circle | rounded | square
			color: null,            // bg color for initials
			online: false,
			showBadge: false,
			badgeContent: '',
			badgeColor: '#22c55e',
			onClick: null,
		}, opts);

		this.el = document.createElement('div');
		this._render();
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-av fv-av-${o.size} fv-av-${o.shape}`;
		if (o.onClick) { this.el.style.cursor = 'pointer'; this.el.onclick = o.onClick; }
		if (o.color) this.el.style.setProperty('--fv-av-bg', o.color);

		let html = '';
		if (o.image) {
			html += `<img class="fv-av-img" src="${Avatar._esc(o.image)}" alt="${Avatar._esc(o.name)}" loading="lazy" />`;
		} else if (o.icon) {
			html += `<span class="fv-av-icon">${o.icon}</span>`;
		} else {
			html += `<span class="fv-av-initials">${Avatar._initials(o.name)}</span>`;
		}

		if (o.online) html += `<span class="fv-av-online"></span>`;
		if (o.showBadge) {
			html += `<span class="fv-av-badge" style="background:${o.badgeColor}">${Avatar._esc(o.badgeContent)}</span>`;
		}

		this.el.innerHTML = html;
		this.el.title = o.name;
	}

	setOnline(val) { this.o.online = val; this._render(); }
	setImage(url) { this.o.image = url; this._render(); }

	static _initials(name) {
		if (!name) return '?';
		return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
