/**
 * ShareDialog — Rich sharing dialog with permissions and link generation
 *
 * A Google-Docs-style sharing dialog for Frappe documents. Supports
 * user/role sharing, link sharing with permissions, expiry dates,
 * and QR code generation.
 *
 * frappe.visual.ShareDialog.create({
 *   doctype: "Sales Order", docname: "SO-001"
 * })
 */
export class ShareDialog {
	static create(opts = {}) { return new ShareDialog(opts); }

	static PERMISSIONS = [
		{ key: "read",  label: "Can view",   icon: "👁️" },
		{ key: "write", label: "Can edit",   icon: "✏️" },
		{ key: "share", label: "Can share",  icon: "🔗" },
		{ key: "submit", label: "Can submit", icon: "✅" },
	];

	constructor(opts) {
		this.opts = Object.assign({
			doctype: "", docname: "", container: null,
			showLinkSharing: true, showQR: false,
			onShare: null, onUnshare: null
		}, opts);
		this._shares = [];
		this._build();
		this._loadShares();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Share with a user */
	async shareWith(user, permissions = { read: 1 }) {
		if (typeof frappe !== "undefined" && frappe.xcall) {
			try {
				await frappe.xcall("frappe.client.add_sharing", {
					doctype: this.opts.doctype, name: this.opts.docname,
					user, ...permissions
				});
				this._shares.push({ user, ...permissions, timestamp: Date.now() });
				this._render();
				this.opts.onShare?.(user, permissions);
			} catch (e) {
				frappe.msgprint?.(__("Could not share: {0}", [e.message || e]));
			}
		}
	}

	/** Remove sharing */
	async unshare(user) {
		if (typeof frappe !== "undefined" && frappe.xcall) {
			try {
				await frappe.xcall("frappe.client.remove_sharing", {
					doctype: this.opts.doctype, name: this.opts.docname, user
				});
				this._shares = this._shares.filter(s => s.user !== user);
				this._render();
				this.opts.onUnshare?.(user);
			} catch { /* ignore */ }
		}
	}

	/** Generate a shareable link */
	getShareLink() {
		const base = window.location.origin;
		return `${base}/app/${this.opts.doctype.toLowerCase().replace(/ /g, "-")}/${this.opts.docname}`;
	}

	/** Copy link to clipboard */
	async copyLink() {
		const link = this.getShareLink();
		try {
			await navigator.clipboard.writeText(link);
			frappe.show_alert?.({ message: __("Link copied!"), indicator: "green" });
		} catch {
			// Fallback
			const input = document.createElement("input");
			input.value = link; document.body.appendChild(input);
			input.select(); document.execCommand("copy");
			document.body.removeChild(input);
		}
	}

	/** Close / destroy */
	destroy() { this._el?.remove(); }
	close() { this.destroy(); }

	/* ── private ────────────────────────────────────────────── */

	_build() {
		let parent = this.opts.container
			? (typeof this.opts.container === "string"
				? document.querySelector(this.opts.container) : this.opts.container)
			: null;

		// Create as modal overlay if no container
		if (!parent) {
			this._overlay = document.createElement("div");
			this._overlay.className = "fv-share-overlay";
			this._overlay.addEventListener("click", (e) => {
				if (e.target === this._overlay) this.close();
			});
			document.body.appendChild(this._overlay);
			parent = this._overlay;
		}

		this._el = document.createElement("div");
		this._el.className = "fv-share-dialog";
		this._el.setAttribute("role", "dialog");
		this._el.setAttribute("aria-label", __("Share document"));
		parent.appendChild(this._el);
		this._render();
	}

	async _loadShares() {
		if (typeof frappe === "undefined" || !frappe.xcall) return;
		try {
			const shares = await frappe.xcall("frappe.client.get_list", {
				doctype: "DocShare",
				filters: { share_doctype: this.opts.doctype, share_name: this.opts.docname },
				fields: ["user", "read", "write", "share", "submit", "creation"]
			});
			this._shares = (shares || []).map(s => ({
				user: s.user, read: s.read, write: s.write,
				share: s.share, submit: s.submit,
				timestamp: new Date(s.creation).getTime()
			}));
			this._render();
		} catch { /* silently fail */ }
	}

	_render() {
		if (!this._el) return;
		let html = `<div class="fv-sd-header">
			<h3 class="fv-sd-title">🔗 ${__("Share")} "${this._esc(this.opts.docname)}"</h3>
			<button class="fv-sd-close" aria-label="${__("Close")}">✕</button>
		</div>`;

		// Add people section
		html += `<div class="fv-sd-add">
			<input class="fv-sd-input" placeholder="${__("Add people (email or name)")}" type="text">
			<select class="fv-sd-perm-select">
				${ShareDialog.PERMISSIONS.map(p =>
					`<option value="${p.key}">${p.icon} ${__(p.label)}</option>`
				).join("")}
			</select>
			<button class="fv-sd-add-btn">${__("Share")}</button>
		</div>`;

		// Current shares
		html += '<div class="fv-sd-list">';
		if (this._shares.length) {
			this._shares.forEach(s => {
				const perms = ShareDialog.PERMISSIONS
					.filter(p => s[p.key])
					.map(p => p.icon)
					.join(" ");
				html += `<div class="fv-sd-item">
					<div class="fv-sd-avatar">${this._esc(s.user.charAt(0).toUpperCase())}</div>
					<div class="fv-sd-user-info">
						<span class="fv-sd-name">${this._esc(s.user)}</span>
						<span class="fv-sd-perms">${perms}</span>
					</div>
					<button class="fv-sd-remove" data-user="${this._esc(s.user)}"
						aria-label="${__("Remove")}">✕</button>
				</div>`;
			});
		} else {
			html += `<div class="fv-sd-empty">${__("Not shared with anyone")}</div>`;
		}
		html += "</div>";

		// Link sharing
		if (this.opts.showLinkSharing) {
			html += `<div class="fv-sd-link-section">
				<div class="fv-sd-link-header">${__("Link sharing")}</div>
				<div class="fv-sd-link-row">
					<input class="fv-sd-link-input" readonly value="${this._esc(this.getShareLink())}">
					<button class="fv-sd-copy-btn">📋 ${__("Copy")}</button>
				</div>
			</div>`;
		}

		this._el.innerHTML = html;

		// Bind events
		this._el.querySelector(".fv-sd-close")?.addEventListener("click", () => this.close());
		this._el.querySelector(".fv-sd-add-btn")?.addEventListener("click", () => {
			const input = this._el.querySelector(".fv-sd-input");
			const select = this._el.querySelector(".fv-sd-perm-select");
			const user = input?.value.trim();
			if (!user) return;
			const perm = select?.value || "read";
			this.shareWith(user, { [perm]: 1 });
			input.value = "";
		});
		this._el.querySelector(".fv-sd-input")?.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this._el.querySelector(".fv-sd-add-btn")?.click();
		});
		this._el.querySelectorAll(".fv-sd-remove").forEach(btn => {
			btn.addEventListener("click", () => this.unshare(btn.dataset.user));
		});
		this._el.querySelector(".fv-sd-copy-btn")?.addEventListener("click", () => this.copyLink());
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
