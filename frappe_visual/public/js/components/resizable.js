/**
 * Resizable — Make any element resizable
 * =========================================
 * Adds resize handles to any element.
 *
 * frappe.visual.Resizable.create({
 *   target: "#panel",
 *   handles: ["e","s","se"],  // edges: n,s,e,w,ne,nw,se,sw
 *   minWidth: 100,
 *   minHeight: 80,
 *   maxWidth: null,
 *   maxHeight: null,
 *   onResize: ({width, height}) => {},
 *   className: ""
 * })
 */

export class Resizable {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			handles: ["e", "s", "se"],
			minWidth: 100,
			minHeight: 80,
			maxWidth: null,
			maxHeight: null,
			onResize: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new Resizable(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		el.style.position = el.style.position || "relative";
		el.classList.add("fv-resizable", this.className);

		const cursors = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", nw: "nwse-resize", se: "nwse-resize", sw: "nesw-resize" };
		const handleStyles = {
			n:  "top:0;left:0;right:0;height:6px;",
			s:  "bottom:0;left:0;right:0;height:6px;",
			e:  "top:0;right:0;bottom:0;width:6px;",
			w:  "top:0;left:0;bottom:0;width:6px;",
			ne: "top:0;right:0;width:10px;height:10px;",
			nw: "top:0;left:0;width:10px;height:10px;",
			se: "bottom:0;right:0;width:10px;height:10px;",
			sw: "bottom:0;left:0;width:10px;height:10px;",
		};

		this.handles.forEach(dir => {
			const handle = document.createElement("div");
			handle.className = `fv-resize-handle fv-resize-${dir}`;
			handle.style.cssText = `position:absolute;z-index:10;cursor:${cursors[dir]};${handleStyles[dir]}`;

			let startX, startY, startW, startH;

			const onMove = (e) => {
				let newW = startW;
				let newH = startH;
				const dx = e.clientX - startX;
				const dy = e.clientY - startY;

				if (dir.includes("e")) newW = startW + dx;
				if (dir.includes("w")) newW = startW - dx;
				if (dir.includes("s")) newH = startH + dy;
				if (dir.includes("n")) newH = startH - dy;

				newW = Math.max(this.minWidth, this.maxWidth ? Math.min(newW, this.maxWidth) : newW);
				newH = Math.max(this.minHeight, this.maxHeight ? Math.min(newH, this.maxHeight) : newH);

				el.style.width = `${newW}px`;
				el.style.height = `${newH}px`;
				this.onResize?.({ width: newW, height: newH });
			};

			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
			};

			handle.addEventListener("mousedown", (e) => {
				e.preventDefault();
				startX = e.clientX;
				startY = e.clientY;
				startW = el.offsetWidth;
				startH = el.offsetHeight;
				document.body.style.userSelect = "none";
				document.body.style.cursor = cursors[dir];
				document.addEventListener("mousemove", onMove);
				document.addEventListener("mouseup", onUp);
			});

			el.appendChild(handle);
		});
	}
}
