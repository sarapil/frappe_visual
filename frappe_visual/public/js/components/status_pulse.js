/**
 * StatusPulse — Animated status indicator with live pulse effect
 *
 * frappe.visual.StatusPulse.create({
 *   container: el,
 *   status: "online",           // online|offline|busy|away|error|syncing|maintenance
 *   label: "Server Status",
 *   showLabel: true,
 *   size: "md",                 // sm|md|lg
 *   pulse: true,                // animated pulse ring
 *   onClick: (status) => {},
 * })
 */
export class StatusPulse {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static STATUSES = {
		online:      { color: "#22c55e", label: "Online",      icon: "circle-check" },
		offline:     { color: "#6b7280", label: "Offline",     icon: "circle-x" },
		busy:        { color: "#ef4444", label: "Busy",        icon: "circle-minus" },
		away:        { color: "#f59e0b", label: "Away",        icon: "clock" },
		error:       { color: "#ef4444", label: "Error",       icon: "alert-triangle" },
		syncing:     { color: "#3b82f6", label: "Syncing",     icon: "refresh" },
		maintenance: { color: "#8b5cf6", label: "Maintenance", icon: "tool" },
	};

	static SIZES = { sm: 8, md: 12, lg: 16 };

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			status: "online",
			label: "",
			showLabel: true,
			size: "md",
			pulse: true,
			onClick: null,
		}, opts);

		let currentStatus = o.status;
		const el = document.createElement("div");
		el.className = `fv-status-pulse fv-status-pulse--${o.size}`;
		if (o.onClick) el.style.cursor = "pointer";

		function render() {
			const st = StatusPulse.STATUSES[currentStatus] || StatusPulse.STATUSES.offline;
			const sz = StatusPulse.SIZES[o.size] || 12;
			const displayLabel = o.label || st.label;

			el.className = `fv-status-pulse fv-status-pulse--${o.size} fv-status-pulse--${currentStatus}`;
			el.innerHTML = `
				<span class="fv-status-pulse__dot" style="width:${sz}px;height:${sz}px;background:${st.color}">
					${o.pulse && currentStatus !== "offline" ? `<span class="fv-status-pulse__ring" style="border-color:${st.color}"></span>` : ""}
				</span>
				${o.showLabel ? `<span class="fv-status-pulse__label">${StatusPulse._esc(displayLabel)}</span>` : ""}
			`;
			el.title = displayLabel;
		}

		render();
		if (o.container) o.container.appendChild(el);
		if (o.onClick) el.onclick = () => o.onClick(currentStatus);

		return {
			el,
			setStatus(status) {
				currentStatus = status;
				render();
			},
			getStatus() { return currentStatus; },
			destroy() { el.remove(); },
		};
	}
}
