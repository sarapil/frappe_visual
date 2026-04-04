/**
 * ColumnResizer — Add drag-to-resize handles between table columns
 *
 * frappe.visual.ColumnResizer.create({
 *   table: tableElement,             // <table> or CSS selector
 *   minWidth: 50,                    // minimum column width
 *   maxWidth: 800,                   // maximum column width
 *   onResize: (colIndex, newWidth) => {},
 *   persist: "my-table-cols",        // localStorage key for persistence
 *   handleWidth: 6,
 * })
 */
export class ColumnResizer {
	static create(opts = {}) {
		const o = Object.assign({
			table: null,
			minWidth: 50,
			maxWidth: 800,
			onResize: null,
			persist: null,
			handleWidth: 6,
		}, opts);

		const table = typeof o.table === "string" ? document.querySelector(o.table) : o.table;
		if (!table) return null;

		table.classList.add("fv-column-resizer__table");
		table.style.tableLayout = "fixed";

		const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
		if (!headerRow) return null;

		const headers = Array.from(headerRow.children);
		let widths = headers.map(th => th.offsetWidth || 100);

		// Restore persisted widths
		if (o.persist) {
			try {
				const saved = JSON.parse(localStorage.getItem(`fv-colresize-${o.persist}`));
				if (saved && saved.length === widths.length) widths = saved;
			} catch (e) { /* ignore */ }
		}

		function applyWidths() {
			headers.forEach((th, i) => {
				th.style.width = widths[i] + "px";
			});
			if (o.persist) {
				localStorage.setItem(`fv-colresize-${o.persist}`, JSON.stringify(widths));
			}
		}

		applyWidths();

		// Insert handles
		const handles = [];
		headers.forEach((th, i) => {
			if (i === headers.length - 1) return; // no handle after last column
			const handle = document.createElement("div");
			handle.className = "fv-column-resizer__handle";
			handle.style.cssText = `
				position:absolute;top:0;right:${-o.handleWidth / 2}px;
				width:${o.handleWidth}px;height:100%;cursor:col-resize;z-index:10;
			`;
			th.style.position = "relative";
			th.appendChild(handle);
			handles.push(handle);

			let startX = 0, startWidth = 0, nextStartWidth = 0;

			const onMouseMove = (e) => {
				const dx = e.clientX - startX;
				const isRTL = getComputedStyle(table).direction === "rtl";
				const delta = isRTL ? -dx : dx;
				const newW = Math.max(o.minWidth, Math.min(o.maxWidth, startWidth + delta));
				widths[i] = newW;
				applyWidths();
				if (o.onResize) o.onResize(i, newW);
			};

			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				handle.classList.remove("fv-column-resizer__handle--active");
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			handle.addEventListener("mousedown", (e) => {
				e.preventDefault();
				startX = e.clientX;
				startWidth = widths[i];
				nextStartWidth = widths[i + 1] || 100;
				handle.classList.add("fv-column-resizer__handle--active");
				document.body.style.cursor = "col-resize";
				document.body.style.userSelect = "none";
				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", onMouseUp);
			});
		});

		return {
			table,
			getWidths: () => [...widths],
			setWidths(w) { widths = w; applyWidths(); },
			resetWidths() {
				widths = headers.map(() => Math.floor(table.offsetWidth / headers.length));
				applyWidths();
			},
			destroy() {
				handles.forEach(h => h.remove());
				table.classList.remove("fv-column-resizer__table");
			},
		};
	}
}
