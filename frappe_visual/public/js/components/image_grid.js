// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual ImageGrid — Responsive image gallery grid
 * ========================================================
 * frappe.visual.ImageGrid.create({ container, images, ... })
 */
export class ImageGrid {
	static create(opts = {}) { return new ImageGrid(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			images: [],             // [{ src, thumb, caption, alt, width, height }]
			columns: 3,
			gap: 8,
			lightbox: true,
			lazyLoad: true,
			aspectRatio: null,      // '1/1', '16/9', null = natural
			borderRadius: 8,
			showCaption: false,
			onImageClick: null,
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = 'fv-ig';
		this.el.style.setProperty('--fv-ig-cols', o.columns);
		this.el.style.setProperty('--fv-ig-gap', o.gap + 'px');
		this.el.style.setProperty('--fv-ig-radius', o.borderRadius + 'px');
		if (o.aspectRatio) this.el.style.setProperty('--fv-ig-ratio', o.aspectRatio);

		this.el.innerHTML = '';

		o.images.forEach((img, idx) => {
			const item = document.createElement('div');
			item.className = 'fv-ig-item';

			const imgEl = document.createElement('img');
			imgEl.className = 'fv-ig-img';
			imgEl.alt = img.alt || '';
			if (o.lazyLoad) imgEl.loading = 'lazy';
			imgEl.src = img.thumb || img.src;

			imgEl.onclick = () => {
				if (o.onImageClick) o.onImageClick(img, idx);
				else if (o.lightbox) this._openLightbox(idx);
			};

			item.appendChild(imgEl);

			if (o.showCaption && img.caption) {
				const cap = document.createElement('div');
				cap.className = 'fv-ig-caption';
				cap.textContent = img.caption;
				item.appendChild(cap);
			}

			this.el.appendChild(item);
		});
	}

	_openLightbox(startIdx) {
		let idx = startIdx;
		const images = this.o.images;

		const overlay = document.createElement('div');
		overlay.className = 'fv-ig-lightbox';

		overlay.innerHTML = `
			<button class="fv-ig-lb-close">&times;</button>
			<button class="fv-ig-lb-prev"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
			<button class="fv-ig-lb-next"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></button>
			<div class="fv-ig-lb-content">
				<img class="fv-ig-lb-img" />
				<div class="fv-ig-lb-caption"></div>
			</div>
			<div class="fv-ig-lb-counter"></div>
		`;

		const imgEl = overlay.querySelector('.fv-ig-lb-img');
		const capEl = overlay.querySelector('.fv-ig-lb-caption');
		const cntEl = overlay.querySelector('.fv-ig-lb-counter');

		const show = (i) => {
			idx = i;
			imgEl.src = images[idx].src;
			capEl.textContent = images[idx].caption || '';
			cntEl.textContent = `${idx + 1} / ${images.length}`;
		};

		show(idx);

		overlay.querySelector('.fv-ig-lb-close').onclick = () => overlay.remove();
		overlay.querySelector('.fv-ig-lb-prev').onclick = () => show((idx - 1 + images.length) % images.length);
		overlay.querySelector('.fv-ig-lb-next').onclick = () => show((idx + 1) % images.length);
		overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

		const keyHandler = (e) => {
			if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', keyHandler); }
			if (e.key === 'ArrowLeft') show((idx - 1 + images.length) % images.length);
			if (e.key === 'ArrowRight') show((idx + 1) % images.length);
		};
		document.addEventListener('keydown', keyHandler);

		document.body.appendChild(overlay);
		requestAnimationFrame(() => overlay.classList.add('fv-ig-lb-visible'));
	}

	addImage(img) { this.o.images.push(img); this._render(); }
	setImages(images) { this.o.images = images; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
