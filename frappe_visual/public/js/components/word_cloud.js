/**
 * Frappe Visual — WordCloud
 * ============================
 * Tag / word cloud visualization with proportional sizing, color mapping,
 * interactive hover/click, and spiral or rectangular layouts.
 * Perfect for tag analysis, keyword frequency, and category overviews.
 *
 * Usage:
 *   frappe.visual.WordCloud.create('#el', {
 *     words: [
 *       { text: 'JavaScript', weight: 90 },
 *       { text: 'Python', weight: 75 },
 *       { text: 'Frappe', weight: 60, color: '#6366f1' },
 *     ]
 *   })
 *
 * @module frappe_visual/components/word_cloud
 */

const DEFAULT_COLORS = [
	"#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
	"#10b981", "#0ea5e9", "#14b8a6", "#a855f7", "#ef4444",
];

export class WordCloud {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("WordCloud: container not found");

		this.opts = Object.assign({
			theme: "glass",
			words: [],
			minFontSize: 12,
			maxFontSize: 56,
			fontFamily: "inherit",
			colors: DEFAULT_COLORS,
			padding: 4,
			rotations: [0, 0, 0, -90, 90],  // random pick per word
			animate: true,
			shape: "rectangular",     // rectangular | elliptic
			onClick: null,
			onHover: null,
		}, opts);

		this._init();
	}

	static create(container, opts = {}) { return new WordCloud(container, opts); }

	_init() {
		this.container.classList.add("fv-wcloud", `fv-wcloud--${this.opts.theme}`);
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		const canvas = document.createElement("div");
		canvas.className = "fv-wcloud-canvas";
		this.container.appendChild(canvas);
		this._canvasEl = canvas;

		const words = [...this.opts.words].sort((a, b) => (b.weight || 0) - (a.weight || 0));
		if (words.length === 0) {
			canvas.innerHTML = `<div class="fv-wcloud-empty">${__("No words to display")}</div>`;
			return;
		}

		const maxWeight = Math.max(...words.map(w => w.weight || 1));
		const minWeight = Math.min(...words.map(w => w.weight || 1));
		const weightRange = maxWeight - minWeight || 1;

		// Use requestAnimationFrame to get container dimensions
		requestAnimationFrame(() => {
			const cw = canvas.clientWidth || 600;
			const ch = canvas.clientHeight || 400;
			const placed = [];  // [{x, y, w, h}] for collision detection

			for (let i = 0; i < words.length; i++) {
				const word = words[i];
				const normalizedWeight = (word.weight - minWeight) / weightRange;
				const fontSize = this.opts.minFontSize + normalizedWeight * (this.opts.maxFontSize - this.opts.minFontSize);
				const color = word.color || this.opts.colors[i % this.opts.colors.length];
				const rotation = this.opts.rotations[Math.floor(Math.random() * this.opts.rotations.length)];

				const el = document.createElement("span");
				el.className = "fv-wcloud-word";
				el.textContent = word.text || "";
				el.style.fontSize = fontSize + "px";
				el.style.color = color;
				el.style.fontFamily = this.opts.fontFamily;
				el.style.padding = this.opts.padding + "px";

				if (rotation !== 0) {
					el.style.transform = `rotate(${rotation}deg)`;
					el.style.writingMode = rotation === 90 || rotation === -90 ? "vertical-rl" : "";
				}

				// Place in DOM to measure
				el.style.position = "absolute";
				el.style.visibility = "hidden";
				canvas.appendChild(el);

				const rect = el.getBoundingClientRect();
				const wW = rect.width + this.opts.padding * 2;
				const wH = rect.height + this.opts.padding * 2;

				// Find position using spiral placement
				const pos = this._findPosition(cw, ch, wW, wH, placed);
				if (pos) {
					el.style.left = pos.x + "px";
					el.style.top = pos.y + "px";
					el.style.visibility = "visible";
					placed.push({ x: pos.x, y: pos.y, w: wW, h: wH });

					// Animate entrance
					if (this.opts.animate) {
						el.style.opacity = "0";
						el.style.transition = `opacity 0.4s ease ${i * 30}ms, transform 0.4s ease ${i * 30}ms`;
						requestAnimationFrame(() => {
							el.style.opacity = "1";
							if (rotation !== 0) {
								el.style.transform = `rotate(${rotation}deg) scale(1)`;
							}
						});
					}

					// Events
					if (this.opts.onClick) {
						el.style.cursor = "pointer";
						el.addEventListener("click", () => this.opts.onClick(word));
					}
					if (this.opts.onHover) {
						el.addEventListener("mouseenter", () => this.opts.onHover(word, el));
					}

					// Tooltip
					el.title = `${word.text}: ${word.weight}`;
				} else {
					// Could not place — hide
					el.remove();
				}
			}
		});
	}

	_findPosition(canvasW, canvasH, wordW, wordH, placed) {
		// Spiral outward from center
		const cx = canvasW / 2 - wordW / 2;
		const cy = canvasH / 2 - wordH / 2;
		const maxAttempts = 500;
		const spiralStep = this.opts.shape === "elliptic" ? 0.5 : 0.8;

		for (let i = 0; i < maxAttempts; i++) {
			let x, y;
			if (this.opts.shape === "elliptic") {
				const angle = i * 0.3;
				const radius = spiralStep * i;
				x = cx + radius * Math.cos(angle);
				y = cy + radius * Math.sin(angle) * 0.6;
			} else {
				// Rectangular spiral
				const layer = Math.floor(Math.sqrt(i));
				const offset = i - layer * layer;
				const side = offset % 4;
				const pos = Math.floor(offset / 4) * spiralStep * 4;
				x = cx + (side === 0 ? pos : side === 2 ? -pos : (layer % 2 ? 1 : -1) * layer * spiralStep * 4);
				y = cy + (side === 1 ? pos : side === 3 ? -pos : (layer % 2 ? -1 : 1) * layer * spiralStep * 3);
			}

			// Bounds check
			if (x < 0 || y < 0 || x + wordW > canvasW || y + wordH > canvasH) continue;

			// Collision check
			let collision = false;
			for (const p of placed) {
				if (x < p.x + p.w && x + wordW > p.x && y < p.y + p.h && y + wordH > p.y) {
					collision = true;
					break;
				}
			}

			if (!collision) return { x, y };
		}

		return null; // Could not place
	}

	/* ── Public API ──────────────────────────────────────────── */
	setWords(words) { this.opts.words = words; this._render(); }
	getWords() { return JSON.parse(JSON.stringify(this.opts.words)); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-wcloud", `fv-wcloud--${this.opts.theme}`);
	}
}
