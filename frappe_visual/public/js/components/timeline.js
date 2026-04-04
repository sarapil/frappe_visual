/**
 * FrappeVisual Timeline — Event timeline component
 * ==================================================
 * frappe.visual.Timeline.create({ container, events, ... })
 *
 * Horizontal or vertical timeline with icons, connector lines, collapsible groups
 */
export class Timeline {
	static create(opts = {}) { return new Timeline(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			events: [],             // [{ id, title, description, date, icon, color, group, content, link }]
			direction: 'vertical',  // vertical | horizontal
			alternating: false,     // alternate sides in vertical
			collapsible: false,     // group collapse
			showConnector: true,
			animate: true,
			onEventClick: null,
		}, opts);

		this.el = document.createElement('div');
		this.el.className = `fv-tl fv-tl-${this.o.direction}`;
		if (this.o.alternating) this.el.classList.add('fv-tl-alt');
		if (this.o.animate) this.el.classList.add('fv-tl-animated');

		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		this.el.innerHTML = '';
		const events = this.o.events;

		// Group by group field if collapsible
		if (this.o.collapsible) {
			const groups = {};
			events.forEach(e => {
				const g = e.group || __('General');
				if (!groups[g]) groups[g] = [];
				groups[g].push(e);
			});

			Object.entries(groups).forEach(([label, items]) => {
				const group = document.createElement('div');
				group.className = 'fv-tl-group';

				const header = document.createElement('button');
				header.className = 'fv-tl-group-header';
				header.innerHTML = `<span>${Timeline._esc(label)}</span> <span class="fv-tl-group-count">${items.length}</span>`;
				header.onclick = () => group.classList.toggle('fv-tl-group-collapsed');

				const body = document.createElement('div');
				body.className = 'fv-tl-group-body';
				items.forEach(e => body.appendChild(this._createEvent(e)));

				group.appendChild(header);
				group.appendChild(body);
				this.el.appendChild(group);
			});
		} else {
			events.forEach(e => this.el.appendChild(this._createEvent(e)));
		}
	}

	_createEvent(event) {
		const item = document.createElement('div');
		item.className = 'fv-tl-item';
		if (event.color) item.style.setProperty('--fv-tl-color', event.color);

		let html = '';

		// Marker
		html += `<div class="fv-tl-marker">`;
		if (event.icon) html += `<span class="fv-tl-icon">${event.icon}</span>`;
		else html += `<span class="fv-tl-dot"></span>`;
		html += `</div>`;

		// Connector
		if (this.o.showConnector) html += `<div class="fv-tl-connector"></div>`;

		// Content
		html += `<div class="fv-tl-content">`;
		if (event.date) html += `<div class="fv-tl-date">${Timeline._esc(event.date)}</div>`;
		if (event.title) {
			if (event.link) html += `<a class="fv-tl-title fv-tl-link" href="${Timeline._esc(event.link)}">${Timeline._esc(event.title)}</a>`;
			else html += `<div class="fv-tl-title">${Timeline._esc(event.title)}</div>`;
		}
		if (event.description) html += `<div class="fv-tl-desc">${Timeline._esc(event.description)}</div>`;
		if (event.content) {
			html += `<div class="fv-tl-extra">`;
			html += typeof event.content === 'string' ? event.content : '';
			html += `</div>`;
		}
		html += `</div>`;

		item.innerHTML = html;

		if (event.content instanceof HTMLElement) {
			item.querySelector('.fv-tl-extra').appendChild(event.content);
		}

		if (this.o.onEventClick) {
			item.style.cursor = 'pointer';
			item.onclick = () => this.o.onEventClick(event);
		}

		return item;
	}

	addEvent(event) {
		this.o.events.push(event);
		this.el.appendChild(this._createEvent(event));
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
