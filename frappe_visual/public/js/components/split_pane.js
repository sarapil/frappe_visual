/**
 * Frappe Visual — SplitPane
 * ===========================
 * Resizable split-panel layout with drag handles,
 * min/max constraints, collapsible sides, nested splits.
 *
 * Usage:
 *   const split = SplitPane.create(container, {
 *     direction: 'horizontal',   // 'horizontal' | 'vertical'
 *     sizes: [30, 70],           // initial % sizes
 *     minSizes: [200, 300],      // minimum px
 *     maxSizes: [600, null],     // maximum px (null = no limit)
 *     collapsible: [true, false], // which panes can collapse
 *     gutterSize: 6,
 *     theme: 'glass',            // 'glass' | 'flat' | 'minimal'
 *     snap: 50,                  // snap to collapsed below this px
 *     onResize: (sizes) => {},
 *     onCollapse: (paneIdx) => {},
 *   });
 *
 *   // Access panes for content
 *   split.panes[0].appendChild(myElement);
 *   split.panes[1].innerHTML = '<div>...</div>';
 */

export class SplitPane {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				direction: "horizontal",
				sizes: [50, 50],
				minSizes: [100, 100],
				maxSizes: [null, null],
				collapsible: [false, false],
				gutterSize: 6,
				theme: "glass",
				snap: 50,
				onResize: null,
				onCollapse: null,
			},
			opts
		);

		this.panes = [];
		this._sizes = [...this.opts.sizes];
		this._collapsed = [false, false];
		this._dragging = false;
		this._init();
	}

	static create(container, opts = {}) {
		return new SplitPane(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
		this._bindEvents();
	}

	_render() {
		const { direction, gutterSize, theme, collapsible } = this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-sp fv-sp-${direction} fv-sp-${theme}`;
		wrap.style.display = "flex";
		wrap.style.flexDirection =
			direction === "horizontal" ? "row" : "column";
		wrap.style.width = "100%";
		wrap.style.height = "100%";
		wrap.style.overflow = "hidden";

		// Pane 1
		const pane1 = document.createElement("div");
		pane1.className = "fv-sp-pane fv-sp-pane-0";
		this._applySize(pane1, this._sizes[0]);
		wrap.appendChild(pane1);
		this.panes[0] = pane1;

		// Gutter
		const gutter = document.createElement("div");
		gutter.className = "fv-sp-gutter";
		gutter.style[direction === "horizontal" ? "width" : "height"] =
			gutterSize + "px";
		gutter.style.cursor =
			direction === "horizontal" ? "col-resize" : "row-resize";

		const gutterLine = document.createElement("div");
		gutterLine.className = "fv-sp-gutter-line";
		gutter.appendChild(gutterLine);

		// Collapse buttons
		if (collapsible[0] || collapsible[1]) {
			const collapseArea = document.createElement("div");
			collapseArea.className = "fv-sp-collapse-btns";

			if (collapsible[0]) {
				const btn = document.createElement("button");
				btn.className = "fv-sp-collapse-btn fv-sp-collapse-start";
				btn.innerHTML = direction === "horizontal" ? "◀" : "▲";
				btn.title = typeof __ !== "undefined" ? __("Collapse") : "Collapse";
				btn.addEventListener("click", () => this.toggleCollapse(0));
				collapseArea.appendChild(btn);
			}
			if (collapsible[1]) {
				const btn = document.createElement("button");
				btn.className = "fv-sp-collapse-btn fv-sp-collapse-end";
				btn.innerHTML = direction === "horizontal" ? "▶" : "▼";
				btn.title = typeof __ !== "undefined" ? __("Collapse") : "Collapse";
				btn.addEventListener("click", () => this.toggleCollapse(1));
				collapseArea.appendChild(btn);
			}
			gutter.appendChild(collapseArea);
		}

		wrap.appendChild(gutter);
		this._gutter = gutter;

		// Pane 2
		const pane2 = document.createElement("div");
		pane2.className = "fv-sp-pane fv-sp-pane-1";
		this._applySize(pane2, this._sizes[1]);
		wrap.appendChild(pane2);
		this.panes[1] = pane2;

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;
	}

	_applySize(pane, percent) {
		pane.style.flex = `0 0 ${percent}%`;
		pane.style.overflow = "auto";
	}

	_bindEvents() {
		const isHz = this.opts.direction === "horizontal";

		const onMouseDown = (e) => {
			e.preventDefault();
			this._dragging = true;
			this._startPos = isHz ? e.clientX : e.clientY;
			this._startSizes = [...this._sizes];

			const wrapSize = isHz
				? this.el.offsetWidth
				: this.el.offsetHeight;
			this._wrapSize = wrapSize;

			document.body.style.cursor = isHz ? "col-resize" : "row-resize";
			document.body.style.userSelect = "none";
			this.el.classList.add("fv-sp-dragging");

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		};

		const onMouseMove = (e) => {
			if (!this._dragging) return;

			const pos = isHz ? e.clientX : e.clientY;
			const delta = pos - this._startPos;
			const pctDelta = (delta / this._wrapSize) * 100;

			let newSize0 = this._startSizes[0] + pctDelta;
			let newSize1 = this._startSizes[1] - pctDelta;

			// Enforce min/max in pixels
			const px0 = (newSize0 / 100) * this._wrapSize;
			const px1 = (newSize1 / 100) * this._wrapSize;

			const { minSizes, maxSizes, snap } = this.opts;

			if (minSizes[0] && px0 < minSizes[0]) {
				if (snap && px0 < snap) {
					newSize0 = 0;
					newSize1 = 100;
				} else {
					newSize0 = (minSizes[0] / this._wrapSize) * 100;
					newSize1 = 100 - newSize0;
				}
			}
			if (minSizes[1] && px1 < minSizes[1]) {
				if (snap && px1 < snap) {
					newSize1 = 0;
					newSize0 = 100;
				} else {
					newSize1 = (minSizes[1] / this._wrapSize) * 100;
					newSize0 = 100 - newSize1;
				}
			}
			if (maxSizes[0] && px0 > maxSizes[0]) {
				newSize0 = (maxSizes[0] / this._wrapSize) * 100;
				newSize1 = 100 - newSize0;
			}
			if (maxSizes[1] && px1 > maxSizes[1]) {
				newSize1 = (maxSizes[1] / this._wrapSize) * 100;
				newSize0 = 100 - newSize1;
			}

			this._sizes = [newSize0, newSize1];
			this._applySize(this.panes[0], newSize0);
			this._applySize(this.panes[1], newSize1);
		};

		const onMouseUp = () => {
			this._dragging = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			this.el.classList.remove("fv-sp-dragging");

			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);

			if (this.opts.onResize) this.opts.onResize([...this._sizes]);
		};

		this._gutter.addEventListener("mousedown", onMouseDown);

		// Touch support
		this._gutter.addEventListener("touchstart", (e) => {
			const touch = e.touches[0];
			onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });

			const onTouchMove = (ev) => {
				const t = ev.touches[0];
				onMouseMove({ clientX: t.clientX, clientY: t.clientY });
			};
			const onTouchEnd = () => {
				onMouseUp();
				document.removeEventListener("touchmove", onTouchMove);
				document.removeEventListener("touchend", onTouchEnd);
			};
			document.addEventListener("touchmove", onTouchMove);
			document.addEventListener("touchend", onTouchEnd);
		});
	}

	/* ── Public API ─────────────────────────────────────── */

	setSizes(sizes) {
		this._sizes = [...sizes];
		this._applySize(this.panes[0], sizes[0]);
		this._applySize(this.panes[1], sizes[1]);
		if (this.opts.onResize) this.opts.onResize([...this._sizes]);
	}

	getSizes() {
		return [...this._sizes];
	}

	toggleCollapse(paneIdx) {
		this._collapsed[paneIdx] = !this._collapsed[paneIdx];

		if (this._collapsed[paneIdx]) {
			this._preCollapseSizes = [...this._sizes];
			const newSizes = paneIdx === 0 ? [0, 100] : [100, 0];
			this.setSizes(newSizes);
			this.panes[paneIdx].classList.add("fv-sp-collapsed");
		} else {
			const restoreSizes = this._preCollapseSizes || [50, 50];
			this.setSizes(restoreSizes);
			this.panes[paneIdx].classList.remove("fv-sp-collapsed");
		}

		if (this.opts.onCollapse) this.opts.onCollapse(paneIdx, this._collapsed[paneIdx]);
	}

	isCollapsed(paneIdx) {
		return this._collapsed[paneIdx];
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
