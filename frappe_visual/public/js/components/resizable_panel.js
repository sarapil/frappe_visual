/**
 * ResizablePanel — Panel with drag-to-resize handles
 *
 * frappe.visual.ResizablePanel.create({
 *   container: el,
 *   content: element|html,
 *   direction: "horizontal",    // horizontal|vertical|both
 *   minWidth: 200,
 *   maxWidth: 800,
 *   minHeight: 150,
 *   maxHeight: 600,
 *   initialWidth: 400,
 *   initialHeight: 300,
 *   handles: ["right","bottom"],  // top|right|bottom|left|top-right|bottom-right|bottom-left|top-left
 *   snap: 0,                    // snap to grid (px), 0=off
 *   onResize: ({width, height}) => {},
 *   onResizeEnd: ({width, height}) => {},
 * })
 */
export class ResizablePanel {
	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			content: null,
			direction: "horizontal",
			minWidth: 100,
			maxWidth: Infinity,
			minHeight: 80,
			maxHeight: Infinity,
			initialWidth: null,
			initialHeight: null,
			handles: null,
			snap: 0,
			onResize: null,
			onResizeEnd: null,
		}, opts);

		if (!o.handles) {
			o.handles = o.direction === "horizontal" ? ["right"]
				: o.direction === "vertical" ? ["bottom"]
				: ["right", "bottom", "bottom-right"];
		}

		const wrap = document.createElement("div");
		wrap.className = "fv-resizable-panel";
		wrap.style.position = "relative";
		if (o.initialWidth) wrap.style.width = o.initialWidth + "px";
		if (o.initialHeight) wrap.style.height = o.initialHeight + "px";

		const body = document.createElement("div");
		body.className = "fv-resizable-panel__body";
		body.style.cssText = "width:100%;height:100%;overflow:auto";
		if (o.content) {
			if (typeof o.content === "string") body.innerHTML = o.content;
			else if (o.content instanceof HTMLElement) body.appendChild(o.content);
		}
		wrap.appendChild(body);

		const HANDLE_SIZE = 8;

		o.handles.forEach(pos => {
			const handle = document.createElement("div");
			handle.className = `fv-resizable-panel__handle fv-resizable-panel__handle--${pos}`;

			const styles = { position: "absolute", zIndex: 10, };
			if (pos === "right") Object.assign(styles, { top: 0, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: "100%", cursor: "col-resize" });
			else if (pos === "left") Object.assign(styles, { top: 0, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: "100%", cursor: "col-resize" });
			else if (pos === "bottom") Object.assign(styles, { left: 0, bottom: -HANDLE_SIZE / 2, height: HANDLE_SIZE, width: "100%", cursor: "row-resize" });
			else if (pos === "top") Object.assign(styles, { left: 0, top: -HANDLE_SIZE / 2, height: HANDLE_SIZE, width: "100%", cursor: "row-resize" });
			else if (pos.includes("-")) Object.assign(styles, {
				width: HANDLE_SIZE * 2, height: HANDLE_SIZE * 2,
				[pos.includes("bottom") ? "bottom" : "top"]: -HANDLE_SIZE / 2,
				[pos.includes("right") ? "right" : "left"]: -HANDLE_SIZE / 2,
				cursor: pos === "bottom-right" || pos === "top-left" ? "nwse-resize" : "nesw-resize"
			});
			Object.assign(handle.style, styles);
			wrap.appendChild(handle);

			handle.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				handle.setPointerCapture(e.pointerId);
				const startX = e.clientX, startY = e.clientY;
				const startW = wrap.offsetWidth, startH = wrap.offsetHeight;
				const isRTL = document.documentElement.dir === "rtl";

				function onMove(ev) {
					let dx = ev.clientX - startX;
					let dy = ev.clientY - startY;
					if (isRTL) dx = -dx;
					if (o.snap > 0) { dx = Math.round(dx / o.snap) * o.snap; dy = Math.round(dy / o.snap) * o.snap; }

					if (pos.includes("right") || pos === "right") {
						wrap.style.width = Math.min(o.maxWidth, Math.max(o.minWidth, startW + dx)) + "px";
					}
					if (pos.includes("left") || pos === "left") {
						wrap.style.width = Math.min(o.maxWidth, Math.max(o.minWidth, startW - dx)) + "px";
					}
					if (pos.includes("bottom") || pos === "bottom") {
						wrap.style.height = Math.min(o.maxHeight, Math.max(o.minHeight, startH + dy)) + "px";
					}
					if (pos.includes("top") && pos !== "top-left" && pos !== "top-right" || pos === "top") {
						wrap.style.height = Math.min(o.maxHeight, Math.max(o.minHeight, startH - dy)) + "px";
					}

					if (o.onResize) o.onResize({ width: wrap.offsetWidth, height: wrap.offsetHeight });
				}

				function onUp() {
					handle.removeEventListener("pointermove", onMove);
					handle.removeEventListener("pointerup", onUp);
					if (o.onResizeEnd) o.onResizeEnd({ width: wrap.offsetWidth, height: wrap.offsetHeight });
				}

				handle.addEventListener("pointermove", onMove);
				handle.addEventListener("pointerup", onUp);
			});
		});

		o.container.appendChild(wrap);

		return {
			el: wrap,
			setSize(w, h) { if (w) wrap.style.width = w + "px"; if (h) wrap.style.height = h + "px"; },
			getSize: () => ({ width: wrap.offsetWidth, height: wrap.offsetHeight }),
			setContent(c) { body.innerHTML = ""; if (typeof c === "string") body.innerHTML = c; else body.appendChild(c); },
			destroy() { wrap.remove(); },
		};
	}
}
