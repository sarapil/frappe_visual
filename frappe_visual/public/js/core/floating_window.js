// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FloatingWindow — Draggable Desktop-style Windows
 * ==================================================
 * Creates floating, resizable, draggable windows over the graph.
 * Uses GSAP Draggable for smooth drag. Each window has a colored
 * title bar matching its node type and supports minimize/close.
 */

export class FloatingWindow {
	static _windows = [];
	static _zIndex = 10000;

	/**
	 * @param {Object} opts
	 * @param {string} opts.title
	 * @param {string} [opts.color] - Title bar accent color
	 * @param {string|HTMLElement} [opts.content] - HTML string or element
	 * @param {number} [opts.width=380]
	 * @param {number} [opts.height=280]
	 * @param {number} [opts.x] - Initial X position
	 * @param {number} [opts.y] - Initial Y position
	 * @param {boolean} [opts.minimizable=true]
	 * @param {boolean} [opts.closable=true]
	 * @param {boolean} [opts.resizable=true]
	 * @param {string} [opts.icon]
	 */
	constructor(opts) {
		this.opts = Object.assign(
			{
				width: 380,
				height: 280,
				color: "var(--fv-accent)",
				minimizable: true,
				closable: true,
				resizable: true,
			},
			opts
		);

		this.id = "fv-win-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
		this.isMinimized = false;

		this._build();
		this._makeDraggable();
		this._animate("open");

		FloatingWindow._windows.push(this);
	}

	_build() {
		const { title, color, content, width, height, icon, minimizable, closable } = this.opts;

		// Calculate position (cascade from top-right)
		const winCount = FloatingWindow._windows.length;
		const x = this.opts.x ?? window.innerWidth - width - 40 - winCount * 30;
		const y = this.opts.y ?? 80 + winCount * 30;

		this.el = document.createElement("div");
		this.el.id = this.id;
		this.el.className = "fv-floating-window";
		this.el.style.cssText = `
			width: ${width}px;
			height: ${height}px;
			left: ${x}px;
			top: ${y}px;
			z-index: ${++FloatingWindow._zIndex};
		`;

		this.el.innerHTML = `
			<div class="fv-win-titlebar" style="--fv-win-color: ${color}">
				<div class="fv-win-title">
					${icon ? `<span class="fv-win-icon">${icon}</span>` : ""}
					<span class="fv-win-title-text">${title}</span>
				</div>
				<div class="fv-win-controls">
					${minimizable ? '<button class="fv-win-btn fv-win-minimize" title="Minimize">─</button>' : ""}
					${closable ? '<button class="fv-win-btn fv-win-close" title="Close">✕</button>' : ""}
				</div>
			</div>
			<div class="fv-win-body"></div>
			${this.opts.resizable ? '<div class="fv-win-resize-handle"></div>' : ""}
		`;

		// Body content
		const body = this.el.querySelector(".fv-win-body");
		if (typeof content === "string") {
			body.innerHTML = content;
		} else if (content instanceof HTMLElement) {
			body.appendChild(content);
		}

		// Events
		this.el.addEventListener("mousedown", () => {
			this.el.style.zIndex = ++FloatingWindow._zIndex;
		});

		const minBtn = this.el.querySelector(".fv-win-minimize");
		if (minBtn) {
			minBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleMinimize();
			});
		}

		const closeBtn = this.el.querySelector(".fv-win-close");
		if (closeBtn) {
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.close();
			});
		}

		document.body.appendChild(this.el);
	}

	_makeDraggable() {
		const gsap = frappe.visual?.gsap;
		const Draggable = frappe.visual?.Draggable;

		if (Draggable) {
			// GSAP Draggable
			this._draggable = Draggable.create(this.el, {
				trigger: this.el.querySelector(".fv-win-titlebar"),
				bounds: document.body,
				cursor: "grab",
				activeCursor: "grabbing",
				zIndexBoost: false,
			})[0];
		} else {
			// Fallback: manual drag
			this._manualDrag();
		}
	}

	_manualDrag() {
		const titlebar = this.el.querySelector(".fv-win-titlebar");
		let isDragging = false;
		let startX, startY, startLeft, startTop;

		titlebar.addEventListener("mousedown", (e) => {
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			startLeft = this.el.offsetLeft;
			startTop = this.el.offsetTop;
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		});

		const onMove = (e) => {
			if (!isDragging) return;
			this.el.style.left = startLeft + (e.clientX - startX) + "px";
			this.el.style.top = startTop + (e.clientY - startY) + "px";
		};

		const onUp = () => {
			isDragging = false;
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}

	_animate(type) {
		const gsap = frappe.visual?.gsap;
		if (!gsap) return;

		if (type === "open") {
			gsap.fromTo(
				this.el,
				{ opacity: 0, scale: 0.85, y: 20 },
				{
					opacity: 1,
					scale: 1,
					y: 0,
					duration: 0.4,
					ease: "back.out(1.5)",
				}
			);
		} else if (type === "close") {
			return gsap.to(this.el, {
				opacity: 0,
				scale: 0.85,
				y: 20,
				duration: 0.25,
				ease: "power2.in",
			});
		}
	}

	toggleMinimize() {
		const gsap = frappe.visual?.gsap;
		const body = this.el.querySelector(".fv-win-body");
		const resizeHandle = this.el.querySelector(".fv-win-resize-handle");

		this.isMinimized = !this.isMinimized;
		this.el.classList.toggle("fv-win-minimized", this.isMinimized);

		if (gsap) {
			gsap.to(body, {
				height: this.isMinimized ? 0 : "auto",
				opacity: this.isMinimized ? 0 : 1,
				duration: 0.3,
				ease: "power2.inOut",
			});
		} else {
			body.style.display = this.isMinimized ? "none" : "";
		}

		if (resizeHandle) {
			resizeHandle.style.display = this.isMinimized ? "none" : "";
		}
	}

	async close() {
		await this._animate("close");
		this.el.remove();
		FloatingWindow._windows = FloatingWindow._windows.filter((w) => w !== this);
		if (this._draggable) this._draggable.kill();
	}

	/**
	 * Update window content.
	 */
	setContent(content) {
		const body = this.el.querySelector(".fv-win-body");
		if (typeof content === "string") {
			body.innerHTML = content;
		} else if (content instanceof HTMLElement) {
			body.innerHTML = "";
			body.appendChild(content);
		}
	}

	/** Close all floating windows */
	static closeAll() {
		[...FloatingWindow._windows].forEach((w) => w.close());
	}
}
