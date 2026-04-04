/**
 * ToastStack — Stacked notification toasts with auto-dismiss
 *
 * frappe.visual.ToastStack.create({
 *   container: document.body,       // mount point
 *   position: "top-right",          // top-left|top-right|bottom-left|bottom-right|top-center|bottom-center
 *   maxVisible: 5,                  // max toasts visible at once
 *   defaultDuration: 4000,          // ms before auto-dismiss
 * })
 *
 * instance.push({ type:"success", title:"Saved", message:"Record saved.", icon:"check" })
 * instance.push({ type:"error", title:"Error", message:"Failed.", duration:0 }) // sticky
 * instance.clear()
 */
export class ToastStack {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static TYPES = {
		success: { color: "#22c55e", icon: "circle-check" },
		error:   { color: "#ef4444", icon: "circle-x" },
		warning: { color: "#f59e0b", icon: "alert-triangle" },
		info:    { color: "#3b82f6", icon: "info-circle" },
	};

	static POSITIONS = {
		"top-right":     { top: "16px", right: "16px" },
		"top-left":      { top: "16px", left: "16px" },
		"bottom-right":  { bottom: "16px", right: "16px" },
		"bottom-left":   { bottom: "16px", left: "16px" },
		"top-center":    { top: "16px", left: "50%", transform: "translateX(-50%)" },
		"bottom-center": { bottom: "16px", left: "50%", transform: "translateX(-50%)" },
	};

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			position: "top-right",
			maxVisible: 5,
			defaultDuration: 4000,
		}, opts);

		const stack = document.createElement("div");
		stack.className = "fv-toast-stack";
		const pos = ToastStack.POSITIONS[o.position] || ToastStack.POSITIONS["top-right"];
		Object.assign(stack.style, { position: "fixed", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px", width: "380px", maxWidth: "calc(100vw - 32px)", pointerEvents: "none" }, pos);
		o.container.appendChild(stack);

		const toasts = [];

		function remove(el) {
			el.style.opacity = "0";
			el.style.transform = "translateX(30px) scale(0.95)";
			setTimeout(() => { el.remove(); const i = toasts.indexOf(el); if (i > -1) toasts.splice(i, 1); }, 250);
		}

		function push(cfg = {}) {
			const type = ToastStack.TYPES[cfg.type] || ToastStack.TYPES.info;
			const dur = cfg.duration !== undefined ? cfg.duration : o.defaultDuration;
			const el = document.createElement("div");
			el.className = `fv-toast fv-toast--${cfg.type || "info"}`;
			el.style.pointerEvents = "auto";
			el.innerHTML = `
				<div class="fv-toast__icon" style="color:${type.color}">
					<svg width="20" height="20"><use href="#icon-${cfg.icon || type.icon}"/></svg>
				</div>
				<div class="fv-toast__body">
					${cfg.title ? `<div class="fv-toast__title">${ToastStack._esc(cfg.title)}</div>` : ""}
					${cfg.message ? `<div class="fv-toast__message">${ToastStack._esc(cfg.message)}</div>` : ""}
				</div>
				<button class="fv-toast__close" aria-label="Close">&times;</button>
				${dur > 0 ? `<div class="fv-toast__progress" style="animation-duration:${dur}ms"></div>` : ""}
			`;
			el.querySelector(".fv-toast__close").onclick = () => remove(el);
			stack.appendChild(el);
			toasts.push(el);

			// Animate in
			requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateX(0) scale(1)"; });

			if (dur > 0) setTimeout(() => { if (el.parentNode) remove(el); }, dur);

			// Trim overflow
			while (toasts.length > o.maxVisible) remove(toasts[0]);

			return el;
		}

		return {
			el: stack,
			push,
			clear() { [...toasts].forEach(remove); },
			destroy() { stack.remove(); },
		};
	}
}
