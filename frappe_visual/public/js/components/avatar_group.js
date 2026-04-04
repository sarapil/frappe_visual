/**
 * AvatarGroup — Stacked avatar display with overflow counter
 *
 * frappe.visual.AvatarGroup.create({
 *   container: el,
 *   users: [
 *     { name: "John", image: "/img/john.jpg", color: "#6366f1" },
 *     { name: "Sara", image: null, color: "#22c55e" },
 *   ],
 *   max: 5,                     // show "+N" for overflow
 *   size: "md",                 // sm|md|lg|xl
 *   overlap: 8,                 // px overlap between avatars
 *   onClick: (user) => {},
 *   onOverflowClick: (hidden) => {},
 *   showTooltip: true,
 * })
 */
export class AvatarGroup {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static SIZES = { sm: 24, md: 32, lg: 40, xl: 56 };
	static FONT_SIZES = { sm: "0.6rem", md: "0.75rem", lg: "0.88rem", xl: "1.1rem" };

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			users: [],
			max: 5,
			size: "md",
			overlap: 8,
			onClick: null,
			onOverflowClick: null,
			showTooltip: true,
			border: true,
		}, opts);

		const el = document.createElement("div");
		el.className = `fv-avatar-group fv-avatar-group--${o.size}`;

		const sz = AvatarGroup.SIZES[o.size] || 32;
		const fontSize = AvatarGroup.FONT_SIZES[o.size] || "0.75rem";

		function getInitials(name) {
			if (!name) return "?";
			const parts = name.trim().split(/\s+/);
			return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
		}

		function render(users) {
			el.innerHTML = "";
			const visible = users.slice(0, o.max);
			const hidden = users.slice(o.max);

			visible.forEach((user, i) => {
				const avatar = document.createElement("div");
				avatar.className = "fv-avatar-group__item";
				avatar.style.cssText = `width:${sz}px;height:${sz}px;margin-inline-start:${i > 0 ? -o.overlap : 0}px;z-index:${visible.length - i};`;
				if (o.border) avatar.style.border = "2px solid var(--fg-color, #fff)";

				if (user.image) {
					avatar.innerHTML = `<img src="${AvatarGroup._esc(user.image)}" alt="${AvatarGroup._esc(user.name || "")}" class="fv-avatar-group__img" />`;
				} else {
					avatar.style.background = user.color || "#6366f1";
					avatar.style.color = "#fff";
					avatar.style.fontSize = fontSize;
					avatar.textContent = getInitials(user.name);
				}

				if (o.showTooltip && user.name) avatar.title = user.name;
				if (o.onClick) {
					avatar.style.cursor = "pointer";
					avatar.onclick = () => o.onClick(user, i);
				}
				el.appendChild(avatar);
			});

			if (hidden.length > 0) {
				const overflow = document.createElement("div");
				overflow.className = "fv-avatar-group__item fv-avatar-group__overflow";
				overflow.style.cssText = `width:${sz}px;height:${sz}px;margin-inline-start:${-o.overlap}px;z-index:0;font-size:${fontSize};`;
				if (o.border) overflow.style.border = "2px solid var(--fg-color, #fff)";
				overflow.textContent = `+${hidden.length}`;
				if (o.showTooltip) overflow.title = hidden.map(u => u.name).filter(Boolean).join(", ");
				if (o.onOverflowClick) {
					overflow.style.cursor = "pointer";
					overflow.onclick = () => o.onOverflowClick(hidden);
				}
				el.appendChild(overflow);
			}
		}

		render(o.users);
		if (o.container) o.container.appendChild(el);

		return {
			el,
			setUsers(users) { render(users); },
			addUser(user) { o.users.push(user); render(o.users); },
			removeUser(index) { o.users.splice(index, 1); render(o.users); },
			destroy() { el.remove(); },
		};
	}
}
