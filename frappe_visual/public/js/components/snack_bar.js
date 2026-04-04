/**
 * SnackBar — Bottom-anchored action bar with undo support
 *
 * frappe.visual.SnackBar.create({
 *   container: document.body,
 *   message: "Item deleted",
 *   actionLabel: "Undo",
 *   onAction: () => restoreItem(),
 *   duration: 6000,
 *   type: "info",               // info|success|warning|error
 *   position: "bottom-center",  // bottom-center|bottom-left|bottom-right
 * })
 */
export class SnackBar {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			message: "",
			actionLabel: "",
			onAction: null,
			onDismiss: null,
			duration: 6000,
			type: "info",
			position: "bottom-center",
			icon: null,
		}, opts);

		// Remove existing snackbar
		const existing = o.container.querySelector(".fv-snackbar");
		if (existing) existing.remove();

		const el = document.createElement("div");
		el.className = `fv-snackbar fv-snackbar--${o.type} fv-snackbar--${o.position}`;
		el.setAttribute("role", "status");
		el.setAttribute("aria-live", "polite");

		const colors = { info: "#3b82f6", success: "#22c55e", warning: "#f59e0b", error: "#ef4444" };
		const color = colors[o.type] || colors.info;

		el.innerHTML = `
			<div class="fv-snackbar__content">
				${o.icon ? `<span class="fv-snackbar__icon" style="color:${color}"><svg width="18" height="18"><use href="#icon-${o.icon}"/></svg></span>` : ""}
				<span class="fv-snackbar__message">${SnackBar._esc(o.message)}</span>
				${o.actionLabel ? `<button class="fv-snackbar__action" style="color:${color}">${SnackBar._esc(o.actionLabel)}</button>` : ""}
				<button class="fv-snackbar__dismiss" aria-label="Dismiss">&times;</button>
			</div>
			${o.duration > 0 ? `<div class="fv-snackbar__timer" style="background:${color};animation-duration:${o.duration}ms"></div>` : ""}
		`;

		function dismiss() {
			el.classList.add("fv-snackbar--exit");
			setTimeout(() => { el.remove(); if (o.onDismiss) o.onDismiss(); }, 250);
		}

		const actionBtn = el.querySelector(".fv-snackbar__action");
		if (actionBtn) actionBtn.onclick = () => { if (o.onAction) o.onAction(); dismiss(); };
		el.querySelector(".fv-snackbar__dismiss").onclick = dismiss;

		o.container.appendChild(el);
		requestAnimationFrame(() => el.classList.add("fv-snackbar--visible"));

		let timer;
		if (o.duration > 0) timer = setTimeout(dismiss, o.duration);

		return {
			el,
			dismiss,
			pause() { if (timer) { clearTimeout(timer); } },
			resume(ms) { timer = setTimeout(dismiss, ms || 3000); },
		};
	}
}
