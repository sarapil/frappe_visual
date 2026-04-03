/**
 * Frappe Visual — APIExplorer
 * =============================
 * Interactive API documentation viewer and tester for Frappe whitelisted methods.
 * Auto-discovers endpoints, shows parameters, lets users test calls in-browser,
 * and displays formatted responses with syntax highlighting.
 *
 * Usage:
 *   frappe.visual.APIExplorer.create('#el', {
 *     endpoints: [...],  // or auto-discover from server
 *     baseUrl: '/api/method/',
 *   })
 *
 * @module frappe_visual/components/api_explorer
 */

const HTTP_METHODS = {
	GET:    { color: "#10b981", label: "GET" },
	POST:   { color: "#6366f1", label: "POST" },
	PUT:    { color: "#f59e0b", label: "PUT" },
	DELETE: { color: "#ef4444", label: "DELETE" },
};

export class APIExplorer {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("APIExplorer: container not found");

		this.opts = Object.assign({
			theme: "glass",
			endpoints: [],
			baseUrl: "/api/method/",
			showSearch: true,
			showGrouping: true,
			autoDiscover: false,
			discoverApps: [],   // e.g. ["arrowz", "vertex"]
		}, opts);

		this._endpoints = JSON.parse(JSON.stringify(this.opts.endpoints));
		this._selectedIdx = -1;
		this._filterText = "";
		this._response = null;
		this._init();
	}

	static create(container, opts = {}) { return new APIExplorer(container, opts); }

	async _init() {
		this.container.classList.add("fv-api", `fv-api--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (this.opts.autoDiscover && this._endpoints.length === 0) {
			await this._discover();
		}

		const layout = document.createElement("div");
		layout.className = "fv-api-layout";

		// Sidebar: endpoint list
		layout.appendChild(this._buildSidebar());

		// Main: endpoint detail + tester
		layout.appendChild(this._buildMain());

		this.container.appendChild(layout);
	}

	async _discover() {
		try {
			for (const app of this.opts.discoverApps) {
				const res = await frappe.xcall("frappe.client.get_list", {
					doctype: "Server Script",
					filters: { script_type: "API", disabled: 0 },
					fields: ["name", "api_method", "module"],
					limit_page_length: 0,
				});
				for (const r of (res || [])) {
					this._endpoints.push({
						path: r.api_method,
						method: "POST",
						group: r.module || app,
						description: r.name,
						params: [],
					});
				}
			}
		} catch (e) {
			console.warn("APIExplorer: auto-discover failed", e);
		}
	}

	_buildSidebar() {
		const sidebar = document.createElement("div");
		sidebar.className = "fv-api-sidebar";

		// Search
		if (this.opts.showSearch) {
			const search = document.createElement("input");
			search.className = "fv-api-search";
			search.placeholder = __("Search APIs...");
			search.addEventListener("input", () => {
				this._filterText = search.value.toLowerCase();
				this._renderEndpointList();
			});
			sidebar.appendChild(search);
		}

		const list = document.createElement("div");
		list.className = "fv-api-list";
		sidebar.appendChild(list);
		this._listEl = list;

		this._renderEndpointList();
		return sidebar;
	}

	_renderEndpointList() {
		this._listEl.innerHTML = "";

		let endpoints = this._endpoints;
		if (this._filterText) {
			endpoints = endpoints.filter(ep =>
				(ep.path || "").toLowerCase().includes(this._filterText) ||
				(ep.description || "").toLowerCase().includes(this._filterText) ||
				(ep.group || "").toLowerCase().includes(this._filterText));
		}

		// Group by module/group
		const groups = {};
		for (const ep of endpoints) {
			const g = ep.group || __("General");
			if (!groups[g]) groups[g] = [];
			groups[g].push(ep);
		}

		for (const [gName, eps] of Object.entries(groups)) {
			if (this.opts.showGrouping) {
				const grpEl = document.createElement("div");
				grpEl.className = "fv-api-group-title";
				grpEl.textContent = gName;
				this._listEl.appendChild(grpEl);
			}

			for (const ep of eps) {
				const idx = this._endpoints.indexOf(ep);
				const item = document.createElement("div");
				item.className = `fv-api-item ${idx === this._selectedIdx ? "fv-api-item--active" : ""}`;
				const m = HTTP_METHODS[ep.method || "POST"] || HTTP_METHODS.POST;
				item.innerHTML = `
					<span class="fv-api-method-badge" style="background:${m.color}">${m.label}</span>
					<span class="fv-api-path">${this._esc(this._shortPath(ep.path))}</span>`;
				item.addEventListener("click", () => this._selectEndpoint(idx));
				this._listEl.appendChild(item);
			}
		}

		if (endpoints.length === 0) {
			this._listEl.innerHTML = `<div class="fv-api-empty">${__("No endpoints found")}</div>`;
		}
	}

	_buildMain() {
		const main = document.createElement("div");
		main.className = "fv-api-main";
		main.innerHTML = `<div class="fv-api-placeholder">${__("Select an API endpoint from the sidebar")}</div>`;
		this._mainEl = main;
		return main;
	}

	_selectEndpoint(idx) {
		this._selectedIdx = idx;
		this._response = null;
		this._renderEndpointList();
		this._renderDetail();
	}

	_renderDetail() {
		const ep = this._endpoints[this._selectedIdx];
		if (!ep) return;

		const m = HTTP_METHODS[ep.method || "POST"] || HTTP_METHODS.POST;

		this._mainEl.innerHTML = `
			<div class="fv-api-detail-header">
				<span class="fv-api-method-badge fv-api-method-badge--lg" style="background:${m.color}">${m.label}</span>
				<code class="fv-api-detail-path">${this.opts.baseUrl}${this._esc(ep.path)}</code>
			</div>
			${ep.description ? `<p class="fv-api-desc">${this._esc(ep.description)}</p>` : ""}

			<div class="fv-api-section">
				<h4>${__("Parameters")}</h4>
				<div class="fv-api-params"></div>
				<button class="fv-api-add-param">${__("+ Add Parameter")}</button>
			</div>

			<div class="fv-api-tester">
				<button class="fv-api-send-btn" style="background:${m.color}">${__("Send Request")}</button>
			</div>

			<div class="fv-api-response-wrap">
				<h4>${__("Response")}</h4>
				<div class="fv-api-response"><pre class="fv-api-pre">${__("Click Send to test")}</pre></div>
			</div>`;

		// Render param inputs
		const paramsEl = this._mainEl.querySelector(".fv-api-params");
		this._paramInputs = [];

		const params = ep.params || [];
		for (const p of params) {
			this._addParamRow(paramsEl, p.name, p.default || "", p.type || "text");
		}

		this._mainEl.querySelector(".fv-api-add-param").addEventListener("click", () => {
			this._addParamRow(paramsEl, "", "", "text");
		});

		this._mainEl.querySelector(".fv-api-send-btn").addEventListener("click", () => this._sendRequest(ep));
	}

	_addParamRow(container, name, value, type) {
		const row = document.createElement("div");
		row.className = "fv-api-param-row";
		row.innerHTML = `
			<input class="fv-api-param-name" placeholder="${__("Key")}" value="${this._esc(name)}">
			<input class="fv-api-param-value" placeholder="${__("Value")}" value="${this._esc(value)}">
			<button class="fv-api-param-del" title="${__("Remove")}">✕</button>`;
		row.querySelector(".fv-api-param-del").addEventListener("click", () => {
			row.remove();
			this._paramInputs = this._paramInputs.filter(r => r !== row);
		});
		container.appendChild(row);
		this._paramInputs.push(row);
	}

	async _sendRequest(ep) {
		const responseEl = this._mainEl.querySelector(".fv-api-pre");
		responseEl.textContent = __("Loading...");

		const args = {};
		for (const row of this._paramInputs) {
			const key = row.querySelector(".fv-api-param-name").value.trim();
			const val = row.querySelector(".fv-api-param-value").value;
			if (key) args[key] = val;
		}

		const startTime = performance.now();

		try {
			const res = await frappe.xcall(ep.path, args);
			const elapsed = (performance.now() - startTime).toFixed(0);
			this._response = res;

			const respWrap = this._mainEl.querySelector(".fv-api-response");
			respWrap.innerHTML = `
				<div class="fv-api-resp-meta">
					<span class="fv-api-resp-status" style="color:#10b981">✓ ${__("Success")}</span>
					<span class="fv-api-resp-time">${elapsed}ms</span>
				</div>
				<pre class="fv-api-pre">${this._esc(JSON.stringify(res, null, 2))}</pre>`;
		} catch (e) {
			const elapsed = (performance.now() - startTime).toFixed(0);
			const respWrap = this._mainEl.querySelector(".fv-api-response");
			respWrap.innerHTML = `
				<div class="fv-api-resp-meta">
					<span class="fv-api-resp-status" style="color:#ef4444">✕ ${__("Error")}</span>
					<span class="fv-api-resp-time">${elapsed}ms</span>
				</div>
				<pre class="fv-api-pre fv-api-pre--error">${this._esc(e.message || JSON.stringify(e, null, 2))}</pre>`;
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	setEndpoints(endpoints) {
		this._endpoints = JSON.parse(JSON.stringify(endpoints));
		this._selectedIdx = -1;
		this._renderEndpointList();
	}

	addEndpoint(ep) {
		this._endpoints.push(ep);
		this._renderEndpointList();
	}

	_shortPath(path) {
		return path?.split(".").pop() || path;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-api", `fv-api--${this.opts.theme}`);
	}
}
