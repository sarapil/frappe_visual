// Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ERP API Tester — Developer Tool
 *
 * Interactive page for testing all 16 ERP dashboard API endpoints.
 * Displays request/response times, JSON responses, and error details.
 * Route: /app/fv-erp-api-tester
 */
frappe.pages["fv-erp-api-tester"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("ERP API Tester"),
		single_column: true,
	});

	page.set_title_sub(__("Developer Tool — Test all ERP Dashboard endpoints"));

	const API_BASE = "frappe_visual.api.erp_dashboard";
	const ENDPOINTS = [
		{ key: "finance",       method: "get_finance_data",       params: { period: "month" }, icon: "💰" },
		{ key: "stock",         method: "get_stock_data",         params: { period: "month" }, icon: "📦" },
		{ key: "hr",            method: "get_hr_data",            params: { period: "month" }, icon: "👥" },
		{ key: "selling",       method: "get_selling_data",       params: { period: "month" }, icon: "📈" },
		{ key: "buying",        method: "get_buying_data",        params: { period: "month" }, icon: "🛒" },
		{ key: "manufacturing", method: "get_manufacturing_data", params: { period: "month" }, icon: "🏭" },
		{ key: "projects",      method: "get_projects_data",      params: { period: "month" }, icon: "🗂️" },
		{ key: "crm",           method: "get_crm_data",           params: { period: "month" }, icon: "🤝" },
		{ key: "assets",        method: "get_assets_data",        params: {},                  icon: "🏗️" },
		{ key: "quality",       method: "get_quality_data",       params: { period: "month" }, icon: "🔬" },
		{ key: "support",       method: "get_support_data",       params: { period: "month" }, icon: "🎫" },
		{ key: "payroll",       method: "get_payroll_data",       params: { period: "month" }, icon: "💵" },
		{ key: "pos",           method: "get_pos_data",           params: { period: "month" }, icon: "🛍️" },
		{ key: "loans",         method: "get_loan_data",          params: {},                  icon: "🏦" },
		{ key: "website",       method: "get_website_data",       params: {},                  icon: "🌐" },
		{ key: "role_hub",      method: "get_role_hub_data",      params: {},                  icon: "🏠" },
	];

	const root = $(`<div class="fv-api-tester" style="padding:1rem">
		<div class="fv-api-tester__toolbar" style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center">
			<button class="btn btn-primary btn-sm" id="fv-test-all">
				<i class="ti ti-player-play"></i> ${__("Test All Endpoints")}
			</button>
			<button class="btn btn-default btn-sm" id="fv-clear-all">
				<i class="ti ti-trash"></i> ${__("Clear Results")}
			</button>
			<span id="fv-test-summary" style="margin-inline-start:auto;font-size:0.85rem;color:var(--text-muted)"></span>
		</div>
		<div id="fv-api-results" class="fv-api-tester__results"></div>
	</div>`).appendTo(page.main);

	// Build endpoint cards
	const resultsEl = root.find("#fv-api-results");
	ENDPOINTS.forEach((ep) => {
		const card = $(`
			<div class="fv-api-card fv-fx-glass" id="fv-api-${ep.key}" style="margin-bottom:1rem;padding:1rem;border-radius:8px;border:1px solid var(--border-color)">
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
					<div style="display:flex;align-items:center;gap:0.5rem">
						<span style="font-size:1.3rem">${ep.icon}</span>
						<strong>${ep.key}</strong>
						<code style="font-size:0.75rem;color:var(--text-muted)">${API_BASE}.${ep.method}</code>
					</div>
					<div style="display:flex;align-items:center;gap:0.5rem">
						<span class="fv-api-status badge" style="display:none"></span>
						<span class="fv-api-time" style="font-size:0.75rem;color:var(--text-muted)"></span>
						<button class="btn btn-xs btn-default fv-test-single" data-key="${ep.key}">
							<i class="ti ti-player-play"></i>
						</button>
					</div>
				</div>
				<div class="fv-api-response" style="display:none;max-height:300px;overflow:auto;background:var(--bg-color);border-radius:4px;padding:0.5rem">
					<pre style="margin:0;font-size:0.75rem;white-space:pre-wrap;word-break:break-all"></pre>
				</div>
			</div>`);
		resultsEl.append(card);
	});

	// Test single endpoint
	async function testEndpoint(ep) {
		const card = $(`#fv-api-${ep.key}`);
		const statusEl = card.find(".fv-api-status");
		const timeEl = card.find(".fv-api-time");
		const responseEl = card.find(".fv-api-response");
		const preEl = responseEl.find("pre");

		statusEl.show().text(__("Testing...")).removeClass("badge-success badge-danger").addClass("badge-warning");
		const start = performance.now();

		try {
			const result = await frappe.xcall(`${API_BASE}.${ep.method}`, ep.params);
			const elapsed = (performance.now() - start).toFixed(0);
			statusEl.text(`${__("OK")} ✅`).removeClass("badge-warning").addClass("badge-success");
			timeEl.text(`${elapsed}ms`);
			preEl.text(JSON.stringify(result, null, 2));
			responseEl.show();
			return { key: ep.key, ok: true, time: elapsed };
		} catch (err) {
			const elapsed = (performance.now() - start).toFixed(0);
			statusEl.text(`${__("Error")} ❌`).removeClass("badge-warning").addClass("badge-danger");
			timeEl.text(`${elapsed}ms`);
			preEl.text(err?.message || JSON.stringify(err, null, 2));
			responseEl.show();
			return { key: ep.key, ok: false, time: elapsed };
		}
	}

	// Test All
	root.find("#fv-test-all").on("click", async () => {
		const summary = root.find("#fv-test-summary");
		summary.text(__("Running tests..."));
		const results = [];
		for (const ep of ENDPOINTS) {
			const result = await testEndpoint(ep);
			results.push(result);
		}
		const ok = results.filter((r) => r.ok).length;
		const fail = results.filter((r) => !r.ok).length;
		const avgTime = Math.round(results.reduce((s, r) => s + parseInt(r.time), 0) / results.length);
		summary.html(`
			<span style="color:var(--green-600)">✅ ${ok} passed</span> &nbsp;
			${fail ? `<span style="color:var(--red-600)">❌ ${fail} failed</span> &nbsp;` : ""}
			<span>⏱ avg ${avgTime}ms</span>
		`);
	});

	// Test Single
	root.on("click", ".fv-test-single", function () {
		const key = $(this).data("key");
		const ep = ENDPOINTS.find((e) => e.key === key);
		if (ep) testEndpoint(ep);
	});

	// Clear
	root.find("#fv-clear-all").on("click", () => {
		root.find(".fv-api-status").hide();
		root.find(".fv-api-time").text("");
		root.find(".fv-api-response").hide();
		root.find("#fv-test-summary").text("");
	});
};
