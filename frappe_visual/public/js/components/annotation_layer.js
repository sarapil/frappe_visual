// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual AnnotationLayer — Image/PDF annotation overlay
 * ==============================================================
 * frappe.visual.AnnotationLayer.create({ container, src, ... })
 */
export class AnnotationLayer {
	static create(opts = {}) { return new AnnotationLayer(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			src: '',                  // image/pdf URL
			annotations: [],          // [{ type, x, y, width, height, text, color }]
			tools: ['pin', 'rect', 'freehand', 'text'],
			activeTool: 'pin',
			color: '#ef4444',
			strokeWidth: 2,
			editable: true,
			onChange: null,
			onSelect: null,
		}, opts);

		this._drawing = false;
		this._startPos = null;
		this._currentPath = [];
		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = 'fv-anno';

		// Toolbar
		let toolbar = '';
		if (o.editable) {
			toolbar = `<div class="fv-anno-toolbar">${o.tools.map(t =>
				`<button class="fv-anno-tool${t === o.activeTool ? ' fv-anno-tool-active' : ''}" data-tool="${t}" title="${t}">${this._toolIcon(t)}</button>`
			).join('')}<input type="color" class="fv-anno-color" value="${o.color}" title="Color"/></div>`;
		}

		this.el.innerHTML = `${toolbar}<div class="fv-anno-canvas-wrap">
			<img class="fv-anno-img" src="${o.src}" draggable="false"/>
			<svg class="fv-anno-svg"></svg>
		</div>`;

		this._svg = this.el.querySelector('.fv-anno-svg');
		this._renderAnnotations();
		this._bindEvents();
	}

	_renderAnnotations() {
		const svg = this._svg;
		svg.innerHTML = '';
		this.o.annotations.forEach((a, idx) => {
			let el;
			switch (a.type) {
				case 'pin':
					el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
					el.setAttribute('cx', a.x); el.setAttribute('cy', a.y);
					el.setAttribute('r', 8); el.setAttribute('fill', a.color || this.o.color);
					el.setAttribute('stroke', '#fff'); el.setAttribute('stroke-width', '2');
					break;
				case 'rect':
					el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
					el.setAttribute('x', a.x); el.setAttribute('y', a.y);
					el.setAttribute('width', a.width || 0); el.setAttribute('height', a.height || 0);
					el.setAttribute('fill', 'none');
					el.setAttribute('stroke', a.color || this.o.color); el.setAttribute('stroke-width', this.o.strokeWidth);
					break;
				case 'freehand':
					if (a.path) {
						el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
						el.setAttribute('d', a.path); el.setAttribute('fill', 'none');
						el.setAttribute('stroke', a.color || this.o.color); el.setAttribute('stroke-width', this.o.strokeWidth);
						el.setAttribute('stroke-linecap', 'round');
					}
					break;
				case 'text':
					el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
					el.setAttribute('x', a.x); el.setAttribute('y', a.y);
					el.setAttribute('fill', a.color || this.o.color);
					el.setAttribute('font-size', '14'); el.setAttribute('font-family', 'system-ui');
					el.textContent = a.text || '';
					break;
			}
			if (el) {
				el.dataset.idx = idx;
				el.style.cursor = 'pointer';
				el.onclick = (e) => { e.stopPropagation(); if (this.o.onSelect) this.o.onSelect(a, idx); };
				svg.appendChild(el);
			}
		});
	}

	_bindEvents() {
		if (!this.o.editable) return;

		// Tool selection
		this.el.querySelectorAll('.fv-anno-tool').forEach(btn => {
			btn.onclick = () => {
				this.o.activeTool = btn.dataset.tool;
				this.el.querySelectorAll('.fv-anno-tool').forEach(b => b.classList.remove('fv-anno-tool-active'));
				btn.classList.add('fv-anno-tool-active');
			};
		});

		// Color
		const colorInp = this.el.querySelector('.fv-anno-color');
		if (colorInp) colorInp.oninput = () => { this.o.color = colorInp.value; };

		// Canvas interactions
		const wrap = this.el.querySelector('.fv-anno-canvas-wrap');
		const getPos = (e) => {
			const rect = wrap.getBoundingClientRect();
			return { x: e.clientX - rect.left, y: e.clientY - rect.top };
		};

		wrap.onmousedown = (e) => {
			if (e.target.closest('.fv-anno-toolbar')) return;
			const pos = getPos(e);
			const tool = this.o.activeTool;

			if (tool === 'pin') {
				this.o.annotations.push({ type: 'pin', x: pos.x, y: pos.y, color: this.o.color });
				this._renderAnnotations();
				if (this.o.onChange) this.o.onChange(this.o.annotations);
			} else if (tool === 'text') {
				const text = prompt('Enter text:');
				if (text) {
					this.o.annotations.push({ type: 'text', x: pos.x, y: pos.y, text, color: this.o.color });
					this._renderAnnotations();
					if (this.o.onChange) this.o.onChange(this.o.annotations);
				}
			} else if (tool === 'rect') {
				this._drawing = true;
				this._startPos = pos;
			} else if (tool === 'freehand') {
				this._drawing = true;
				this._currentPath = [pos];
			}
		};

		wrap.onmousemove = (e) => {
			if (!this._drawing) return;
			const pos = getPos(e);
			if (this.o.activeTool === 'freehand') {
				this._currentPath.push(pos);
				// Live preview
				let path = this._svg.querySelector('.fv-anno-live');
				if (!path) {
					path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
					path.classList.add('fv-anno-live');
					path.setAttribute('fill', 'none');
					path.setAttribute('stroke', this.o.color);
					path.setAttribute('stroke-width', this.o.strokeWidth);
					this._svg.appendChild(path);
				}
				path.setAttribute('d', this._pathToD(this._currentPath));
			}
		};

		wrap.onmouseup = (e) => {
			if (!this._drawing) return;
			this._drawing = false;
			const pos = getPos(e);

			if (this.o.activeTool === 'rect' && this._startPos) {
				const x = Math.min(this._startPos.x, pos.x);
				const y = Math.min(this._startPos.y, pos.y);
				const w = Math.abs(pos.x - this._startPos.x);
				const h = Math.abs(pos.y - this._startPos.y);
				if (w > 5 && h > 5) {
					this.o.annotations.push({ type: 'rect', x, y, width: w, height: h, color: this.o.color });
				}
			} else if (this.o.activeTool === 'freehand' && this._currentPath.length > 2) {
				this.o.annotations.push({ type: 'freehand', path: this._pathToD(this._currentPath), color: this.o.color });
				const live = this._svg.querySelector('.fv-anno-live');
				if (live) live.remove();
			}
			this._currentPath = [];
			this._startPos = null;
			this._renderAnnotations();
			if (this.o.onChange) this.o.onChange(this.o.annotations);
		};
	}

	_pathToD(pts) {
		if (pts.length < 2) return '';
		return 'M ' + pts.map(p => `${p.x} ${p.y}`).join(' L ');
	}

	_toolIcon(tool) {
		const icons = {
			pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
			rect: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
			freehand: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17c3-3 6 3 9 0s6-3 9 0"/></svg>',
			text: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
		};
		return icons[tool] || tool;
	}

	getAnnotations() { return [...this.o.annotations]; }
	clearAnnotations() { this.o.annotations = []; this._renderAnnotations(); }
	removeAnnotation(idx) { this.o.annotations.splice(idx, 1); this._renderAnnotations(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
