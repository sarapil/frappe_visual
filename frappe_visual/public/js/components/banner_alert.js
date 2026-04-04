/**
 * BannerAlert — Full-width persistent alert banners
 *
 * frappe.visual.BannerAlert.create({
 *   container: document.querySelector(".layout-main"),
 *   type: "warning",          // info|success|warning|error|neutral
 *   title: "Maintenance",
 *   message: "System will be down at 2 AM.",
 *   dismissible: true,
 *   icon: "alert-triangle",
 *   actions: [{ label: "Details", onClick: () => {} }],
 *   persist: false,           // survive page navigation via localStorage key
 *   persistKey: "maint-2024",
 * })
 */
export class BannerAlert {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static TYPES = {
		info:    { bg: "rgba(59,130,246,0.08)",  border: "#3b82f6", icon: "info-circle",    color: "#2563eb" },
		success: { bg: "rgba(34,197,94,0.08)",   border: "#22c55e", icon: "circle-check",   color: "#16a34a" },
		warning: { bg: "rgba(245,158,11,0.08)",  border: "#f59e0b", icon: "alert-triangle",  color: "#d97706" },
		error:   { bg: "rgba(239,68,68,0.08)",   border: "#ef4444", icon: "circle-x",       color: "#dc2626" },
		neutral: { bg: "rgba(107,114,128,0.08)", border: "#6b7280", icon: "info-circle",    color: "#4b5563" },
	};

	static create(opts = {}) {
		const o = Object.assign({
			container: document.body,
			type: "info",
			title: "",
			message: "",
			dismissible: true,
			icon: null,
			actions: [],
			persist: false,
			persistKey: null,
		}, opts);

		// Check if dismissed
		if (o.persist && o.persistKey) {
			try { if (localStorage.getItem(`fv_banner_${o.persistKey}`) === "dismissed") return null; } catch (e) {}
		}

		const t = BannerAlert.TYPES[o.type] || BannerAlert.TYPES.info;
		const el = document.createElement("div");
		el.className = `fv-banner-alert fv-banner-alert--${o.type}`;
		el.setAttribute("role", "alert");
		el.style.cssText = `background:${t.bg};border-left:4px solid ${t.border};`;

		const iconName = o.icon || t.icon;

		el.innerHTML = `
			<div class="fv-banner-alert__icon" style="color:${t.color}">
				<svg width="20" height="20"><use href="#icon-${iconName}"/></svg>
			</div>
			<div class="fv-banner-alert__body">
				${o.title ? `<div class="fv-banner-alert__title" style="color:${t.color}">${BannerAlert._esc(o.title)}</div>` : ""}
				${o.message ? `<div class="fv-banner-alert__message">${BannerAlert._esc(o.message)}</div>` : ""}
			</div>
			<div class="fv-banner-alert__actions"></div>
			${o.dismissible ? `<button class="fv-banner-alert__close" aria-label="Dismiss">&times;</button>` : ""}
		`;

		const actionsWrap = el.querySelector(".fv-banner-alert__actions");
		(o.actions || []).forEach(a => {
			const btn = document.createElement("button");
			btn.className = "fv-banner-alert__action-btn";
			btn.textContent = a.label || "Action";
			btn.style.color = t.color;
			btn.onclick = a.onClick;
			actionsWrap.appendChild(btn);
		});

		function dismiss() {
			el.style.opacity = "0";
			el.style.maxHeight = "0";
			el.style.padding = "0";
			el.style.margin = "0";
			setTimeout(() => el.remove(), 300);
			if (o.persist && o.persistKey) {
				try { localStorage.setItem(`fv_banner_${o.persistKey}`, "dismissed"); } catch (e) {}
			}
		}

		const closeBtn = el.querySelector(".fv-banner-alert__close");
		if (closeBtn) closeBtn.onclick = dismiss;

		if (o.container.firstChild) o.container.insertBefore(el, o.container.firstChild);
		else o.container.appendChild(el);

		requestAnimationFrame(() => { el.style.opacity = "1"; el.style.maxHeight = "200px"; });

		return { el, dismiss, update(msg) { const m = el.querySelector(".fv-banner-alert__message"); if (m) m.textContent = msg; } };
	}
}
