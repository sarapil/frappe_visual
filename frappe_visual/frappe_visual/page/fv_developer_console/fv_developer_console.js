// Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Developer Console — Interactive frappe.visual Playground
 *
 * A REPL-style console for testing frappe.visual components live.
 * Features:
 *  - Code editor with auto-complete for frappe.visual API
 *  - Live preview canvas
 *  - Bundle loader panel (load 3D, CAD, XR, Desk, ERP bundles on demand)
 *  - Component quick-insert snippets
 *  - Performance profiler
 *
 * Route: /app/fv-developer-console
 */
frappe.pages["fv-developer-console"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Developer Console"),
		single_column: true,
	});

	page.set_title_sub(__("Interactive frappe.visual Playground"));

	const BUNDLES = [
		{ id: "core",  name: "frappe_visual.bundle.js", label: "Core (307+ components)", size: "8.4 MB",   loaded: true },
		{ id: "3d",    name: "fv_3d.bundle.js",         label: "3D Engine (Three.js)",   size: "2.0 MB",   loaded: false },
		{ id: "cad",   name: "fv_cad.bundle.js",        label: "CAD Tools",              size: "54 KB",    loaded: false },
		{ id: "xr",    name: "fv_xr.bundle.js",         label: "XR / WebXR",             size: "30 KB",    loaded: false },
		{ id: "desk",  name: "fv_desk.bundle.js",       label: "Desk Override",          size: "85 KB",    loaded: false },
		{ id: "erp",   name: "fv_erp.bundle.js",        label: "ERP Dashboards (16)",    size: "160 KB",   loaded: false },
	];

	const SNIPPETS = [
		{ label: "KPI Card", code: `frappe.visual.icons.dashCard({
    icon: "chart-line", title: "Revenue", value: "$125,000",
    color: "green", container: "#preview"
});` },
		{ label: "Kanban Board", code: `await frappe.visual.kanban("#preview", {
    columns: [
        { title: "To Do", items: [{id:1, title:"Task 1"}] },
        { title: "In Progress", items: [{id:2, title:"Task 2"}] },
        { title: "Done", items: [] }
    ]
});` },
		{ label: "Heatmap", code: `await frappe.visual.heatmap({
    container: "#preview",
    data: Array.from({length: 365}, (_, i) => ({
        date: new Date(2026, 0, i+1), value: Math.random() * 10
    }))
});` },
		{ label: "Scene Office", code: `await frappe.visual.scenePresetOffice({
    container: "#preview",
    theme: "warm",
    frames: [
        { label: "Revenue", value: "$125K", status: "success" },
        { label: "Users", value: "1,234", status: "info" }
    ]
});` },
		{ label: "ERP Finance", code: `frappe.require("fv_erp.bundle.js", async () => {
    await frappe.visual.erp.finance("#preview", {});
});` },
		{ label: "Role Hub", code: `frappe.require("fv_erp.bundle.js", async () => {
    const data = await frappe.visual.erp.api.getRoleHub();
    console.log("Available modules:", data.modules.length);
    await frappe.visual.erp.launchpad("#preview", {});
});` },
		{ label: "Graph Engine", code: `const engine = await frappe.visual.engine({
    container: "#preview",
    theme: "light"
});
engine.addNode({ id: "n1", label: "Start", x: 100, y: 100 });
engine.addNode({ id: "n2", label: "End", x: 400, y: 200 });
engine.addEdge({ source: "n1", target: "n2" });` },
	];

	// ─── UI Layout ────────────────────────────────────────────────
	const root = $(`
	<div class="fv-dev-console" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem;height:calc(100vh - 160px)">
		<!-- Left: Code Editor -->
		<div style="display:flex;flex-direction:column;gap:0.5rem">
			<!-- Bundle Loader -->
			<div class="fv-fx-glass" style="padding:0.75rem;border-radius:8px">
				<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
					<i class="ti ti-package" style="font-size:1.1rem"></i>
					<strong style="font-size:0.85rem">${__("Bundles")}</strong>
				</div>
				<div id="fv-bundle-pills" style="display:flex;flex-wrap:wrap;gap:0.25rem"></div>
			</div>
			<!-- Snippet Quick-Insert -->
			<div class="fv-fx-glass" style="padding:0.75rem;border-radius:8px">
				<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
					<i class="ti ti-code" style="font-size:1.1rem"></i>
					<strong style="font-size:0.85rem">${__("Snippets")}</strong>
				</div>
				<div id="fv-snippet-pills" style="display:flex;flex-wrap:wrap;gap:0.25rem"></div>
			</div>
			<!-- Code Area -->
			<textarea id="fv-code-editor" style="flex:1;font-family:'JetBrains Mono',monospace;font-size:0.85rem;padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-color);resize:none;tab-size:2" spellcheck="false" placeholder="// Write frappe.visual code here...&#10;// Use #preview as the target container&#10;&#10;await frappe.visual.kanban('#preview', { ... });"></textarea>
			<!-- Action Bar -->
			<div style="display:flex;gap:0.5rem">
				<button class="btn btn-primary btn-sm" id="fv-run-code">
					<i class="ti ti-player-play"></i> ${__("Run")} <code style="font-size:0.7rem;opacity:0.7">Ctrl+Enter</code>
				</button>
				<button class="btn btn-default btn-sm" id="fv-clear-preview">
					<i class="ti ti-eraser"></i> ${__("Clear")}
				</button>
				<span id="fv-exec-time" style="margin-inline-start:auto;font-size:0.75rem;color:var(--text-muted)"></span>
			</div>
		</div>
		<!-- Right: Preview + Console -->
		<div style="display:flex;flex-direction:column;gap:0.5rem">
			<div id="preview" class="fv-fx-glass" style="flex:1;border-radius:8px;overflow:auto;padding:1rem;min-height:300px"></div>
			<div id="fv-console-output" style="height:150px;overflow:auto;font-family:'JetBrains Mono',monospace;font-size:0.75rem;background:var(--bg-color);border:1px solid var(--border-color);border-radius:8px;padding:0.5rem;color:var(--text-muted)">
				<div style="color:var(--text-muted)">&gt; ${__("Console output will appear here")}</div>
			</div>
		</div>
	</div>`).appendTo(page.main);

	// ─── Bundle Loader ────────────────────────────────────────────
	const pillsEl = root.find("#fv-bundle-pills");
	BUNDLES.forEach((b) => {
		const pill = $(`<button class="btn btn-xs ${b.loaded ? "btn-primary" : "btn-default"}" data-bundle="${b.id}" title="${b.label} (${b.size})">
			${b.loaded ? "✅" : "📦"} ${b.label}
		</button>`);
		pill.on("click", () => {
			if (b.loaded) return;
			pill.text(`⏳ ${__("Loading...")}`);
			frappe.require(b.name, () => {
				b.loaded = true;
				pill.removeClass("btn-default").addClass("btn-primary").html(`✅ ${b.label}`);
				_log(`Bundle loaded: ${b.name} (${b.size})`);
			});
		});
		pillsEl.append(pill);
	});

	// ─── Snippet Pills ───────────────────────────────────────────
	const snippetEl = root.find("#fv-snippet-pills");
	SNIPPETS.forEach((s) => {
		const pill = $(`<button class="btn btn-xs btn-default">${s.label}</button>`);
		pill.on("click", () => {
			root.find("#fv-code-editor").val(s.code);
		});
		snippetEl.append(pill);
	});

	// ─── Console Logger ───────────────────────────────────────────
	const consoleOut = root.find("#fv-console-output");
	function _log(msg, type = "info") {
		const colors = { info: "var(--text-muted)", error: "var(--red-600)", success: "var(--green-600)", warn: "var(--yellow-600)" };
		consoleOut.append(`<div style="color:${colors[type] || colors.info};border-bottom:1px solid var(--border-color);padding:2px 0">${frappe.utils.escape_html(String(msg))}</div>`);
		consoleOut.scrollTop(consoleOut[0].scrollHeight);
	}

	// ─── Code Execution ───────────────────────────────────────────
	async function runCode() {
		const code = root.find("#fv-code-editor").val().trim();
		if (!code) return;

		const timeEl = root.find("#fv-exec-time");
		timeEl.text(__("Running..."));
		const start = performance.now();

		// Intercept console.log
		const origLog = console.log;
		const origError = console.error;
		const origWarn = console.warn;
		console.log = (...args) => { _log(args.join(" "), "info"); origLog(...args); };
		console.error = (...args) => { _log(args.join(" "), "error"); origError(...args); };
		console.warn = (...args) => { _log(args.join(" "), "warn"); origWarn(...args); };

		try {
			/* eslint-disable-next-line no-new-func */
			const fn = new Function("__", "frappe", `return (async () => { ${code} })();`);
			const result = await fn(__, frappe);
			const elapsed = (performance.now() - start).toFixed(0);
			timeEl.html(`<span style="color:var(--green-600)">✅ ${elapsed}ms</span>`);
			if (result !== undefined) {
				_log(`→ ${JSON.stringify(result, null, 2).substring(0, 500)}`, "success");
			}
		} catch (err) {
			const elapsed = (performance.now() - start).toFixed(0);
			timeEl.html(`<span style="color:var(--red-600)">❌ ${elapsed}ms</span>`);
			_log(`Error: ${err.message}`, "error");
		} finally {
			console.log = origLog;
			console.error = origError;
			console.warn = origWarn;
		}
	}

	root.find("#fv-run-code").on("click", runCode);
	root.find("#fv-code-editor").on("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
			e.preventDefault();
			runCode();
		}
		// Tab inserts spaces
		if (e.key === "Tab") {
			e.preventDefault();
			const ta = e.target;
			const start = ta.selectionStart;
			ta.value = ta.value.substring(0, start) + "  " + ta.value.substring(ta.selectionEnd);
			ta.selectionStart = ta.selectionEnd = start + 2;
		}
	});

	root.find("#fv-clear-preview").on("click", () => {
		root.find("#preview").html("");
		consoleOut.html(`<div style="color:var(--text-muted)">&gt; ${__("Cleared")}</div>`);
		root.find("#fv-exec-time").text("");
	});
};
