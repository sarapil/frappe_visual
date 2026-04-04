// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — CardStack
 * ===========================
 * Tinder-like swipeable card stack with gesture support,
 * action buttons, snap-back animation, and progress indicator.
 *
 * Usage:
 *   const stack = CardStack.create(container, {
 *     cards: [
 *       { id: '1', content: '<div>Card 1</div>' },
 *       { id: '2', render: (el) => el.innerHTML = 'Card 2' },
 *     ],
 *     actions: ['reject', 'approve', 'skip'],  // bottom buttons
 *     swipeable: true,
 *     swipeThreshold: 100,       // px to trigger swipe
 *     rotationFactor: 15,        // max rotation degrees
 *     stackDepth: 3,             // visible cards in stack
 *     showProgress: true,
 *     theme: 'glass',            // 'glass' | 'flat' | 'minimal'
 *     onSwipe: (card, direction) => {},   // 'left' | 'right' | 'up'
 *     onAction: (card, action) => {},
 *     onEmpty: () => {},
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

const ACTION_ICONS = {
	reject: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
	approve: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
	skip: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>`,
	star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

const ACTION_COLORS = {
	reject: "#ef4444",
	approve: "#22c55e",
	skip: "#f59e0b",
	star: "#8b5cf6",
};

export class CardStack {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				cards: [],
				actions: ["reject", "approve"],
				swipeable: true,
				swipeThreshold: 100,
				rotationFactor: 15,
				stackDepth: 3,
				showProgress: true,
				theme: "glass",
				onSwipe: null,
				onAction: null,
				onEmpty: null,
			},
			opts
		);

		this._currentIdx = 0;
		this._total = this.opts.cards.length;
		this._init();
	}

	static create(container, opts = {}) {
		return new CardStack(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { theme, showProgress } = this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-cs fv-cs-${theme}`;

		// Progress
		if (showProgress && this._total > 0) {
			const progress = document.createElement("div");
			progress.className = "fv-cs-progress";
			const bar = document.createElement("div");
			bar.className = "fv-cs-progress-bar";
			bar.style.width = `${(this._currentIdx / this._total) * 100}%`;
			progress.appendChild(bar);

			const count = document.createElement("span");
			count.className = "fv-cs-count";
			count.textContent = `${this._currentIdx + 1} / ${this._total}`;
			progress.appendChild(count);

			wrap.appendChild(progress);
		}

		// Stack area
		const stackArea = document.createElement("div");
		stackArea.className = "fv-cs-stack";
		this._stackArea = stackArea;

		this._renderStack();

		wrap.appendChild(stackArea);

		// Action buttons
		if (this.opts.actions.length > 0) {
			const actions = document.createElement("div");
			actions.className = "fv-cs-actions";

			this.opts.actions.forEach((action) => {
				const btn = document.createElement("button");
				btn.className = `fv-cs-action fv-cs-action-${action}`;
				btn.innerHTML = ACTION_ICONS[action] || _esc(action);
				btn.style.setProperty("--action-color", ACTION_COLORS[action] || "#6366f1");
				btn.title = action.charAt(0).toUpperCase() + action.slice(1);
				btn.addEventListener("click", () => this._performAction(action));
				actions.appendChild(btn);
			});

			wrap.appendChild(actions);
		}

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;
	}

	_renderStack() {
		if (!this._stackArea) return;
		this._stackArea.innerHTML = "";

		const remaining = this.opts.cards.slice(this._currentIdx);
		const visible = remaining.slice(0, this.opts.stackDepth);

		if (visible.length === 0) {
			const empty = document.createElement("div");
			empty.className = "fv-cs-empty";
			empty.innerHTML = `<div class="fv-cs-empty-icon">✓</div>
				<div class="fv-cs-empty-text">${typeof __ !== "undefined" ? __("All done!") : "All done!"}</div>`;
			this._stackArea.appendChild(empty);
			if (this.opts.onEmpty) this.opts.onEmpty();
			return;
		}

		// Render cards in reverse order (bottom → top)
		visible.reverse().forEach((card, reverseIdx) => {
			const idx = visible.length - 1 - reverseIdx;
			const el = document.createElement("div");
			el.className = "fv-cs-card";
			el.style.zIndex = visible.length - idx;
			el.style.transform = `translateY(${idx * 8}px) scale(${1 - idx * 0.04})`;
			el.style.opacity = idx === 0 ? 1 : 0.7 + idx * 0.1;

			if (typeof card.content === "string") {
				el.innerHTML = card.content;
			} else if (card.content instanceof HTMLElement) {
				el.appendChild(card.content.cloneNode(true));
			} else if (typeof card.render === "function") {
				card.render(el);
			}

			if (idx === 0 && this.opts.swipeable) {
				this._makeSwipeable(el);
			}

			this._stackArea.appendChild(el);
		});
	}

	_makeSwipeable(el) {
		let startX = 0, startY = 0, currentX = 0, currentY = 0;
		let isDragging = false;

		const onStart = (e) => {
			isDragging = true;
			const pos = e.touches ? e.touches[0] : e;
			startX = pos.clientX;
			startY = pos.clientY;
			el.style.transition = "none";
		};

		const onMove = (e) => {
			if (!isDragging) return;
			const pos = e.touches ? e.touches[0] : e;
			currentX = pos.clientX - startX;
			currentY = pos.clientY - startY;

			const rotation =
				(currentX / window.innerWidth) * this.opts.rotationFactor;
			el.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;

			// Visual feedback
			const threshold = this.opts.swipeThreshold;
			if (currentX > threshold * 0.5) {
				el.classList.add("fv-cs-swipe-right");
				el.classList.remove("fv-cs-swipe-left");
			} else if (currentX < -threshold * 0.5) {
				el.classList.add("fv-cs-swipe-left");
				el.classList.remove("fv-cs-swipe-right");
			} else {
				el.classList.remove("fv-cs-swipe-left", "fv-cs-swipe-right");
			}
		};

		const onEnd = () => {
			if (!isDragging) return;
			isDragging = false;
			el.style.transition = "transform 0.3s ease, opacity 0.3s ease";

			const threshold = this.opts.swipeThreshold;

			if (Math.abs(currentX) > threshold) {
				const direction = currentX > 0 ? "right" : "left";
				el.style.transform = `translate(${currentX > 0 ? 500 : -500}px, ${currentY}px) rotate(${currentX > 0 ? 30 : -30}deg)`;
				el.style.opacity = "0";
				setTimeout(() => this._swipe(direction), 300);
			} else if (currentY < -threshold) {
				el.style.transform = "translate(0, -500px)";
				el.style.opacity = "0";
				setTimeout(() => this._swipe("up"), 300);
			} else {
				// Snap back
				el.style.transform = "translate(0, 0) rotate(0deg)";
				el.classList.remove("fv-cs-swipe-left", "fv-cs-swipe-right");
			}

			currentX = 0;
			currentY = 0;
		};

		el.addEventListener("mousedown", onStart);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onEnd);

		el.addEventListener("touchstart", onStart, { passive: true });
		document.addEventListener("touchmove", onMove, { passive: true });
		document.addEventListener("touchend", onEnd);

		el.style.cursor = "grab";
	}

	_swipe(direction) {
		const card = this.opts.cards[this._currentIdx];
		this._currentIdx++;

		if (this.opts.onSwipe) this.opts.onSwipe(card, direction);
		this._render();
	}

	_performAction(action) {
		if (this._currentIdx >= this._total) return;

		const card = this.opts.cards[this._currentIdx];
		const topCard = this._stackArea.querySelector(
			".fv-cs-card:last-child"
		);

		if (topCard) {
			const dir = action === "reject" ? "left" : action === "approve" ? "right" : "up";
			topCard.style.transition = "transform 0.3s ease, opacity 0.3s ease";
			topCard.style.transform =
				dir === "left"
					? "translate(-500px, 0) rotate(-30deg)"
					: dir === "right"
						? "translate(500px, 0) rotate(30deg)"
						: "translate(0, -500px)";
			topCard.style.opacity = "0";
		}

		setTimeout(() => {
			this._currentIdx++;
			if (this.opts.onAction) this.opts.onAction(card, action);
			this._render();
		}, 300);
	}

	/* ── Public API ─────────────────────────────────────── */

	next() {
		this._performAction("skip");
	}

	reset() {
		this._currentIdx = 0;
		this._render();
	}

	getCurrent() {
		return this.opts.cards[this._currentIdx] || null;
	}

	getProgress() {
		return { current: this._currentIdx, total: this._total };
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
