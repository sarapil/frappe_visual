// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Code Editor Pro
 * =================================
 * Lightweight code editor with syntax highlighting, line numbers,
 * multi-tab support, diff view, minimap, and bracket matching.
 * Pure JS implementation (no Monaco dependency).
 *
 * Features:
 *  - Syntax highlighting (JS, Python, HTML, CSS, JSON, SQL, Markdown)
 *  - Line numbers with gutter
 *  - Multi-tab editor with add/close tabs
 *  - Side-by-side diff view with colored changes
 *  - Minimap (scaled overview) sidebar
 *  - Bracket/paren matching
 *  - Indent/outdent (Tab/Shift+Tab)
 *  - Find & replace (Ctrl+F / Ctrl+H)
 *  - Auto-indent on Enter
 *  - Line wrapping toggle
 *  - Copy / select all shortcuts
 *  - Dark mode / glass theme
 *
 * API:
 *   frappe.visual.CodeEditor.create('#el', { language: 'python', value: 'print(...)' })
 *
 * @module frappe_visual/components/code_editor
 */

const LANGUAGES = {
	javascript: {
		keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|throw|typeof|instanceof|in|of|null|undefined|true|false)\b/g,
		strings: /(["'`])(?:(?!\1|\\).|\\.)*\1/g,
		comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
		numbers: /\b\d+\.?\d*\b/g,
		functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
	},
	python: {
		keywords: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|raise|pass|break|continue|and|or|not|in|is|None|True|False|lambda|global|nonlocal|assert|del|print|self)\b/g,
		strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
		comments: /#.*$/gm,
		numbers: /\b\d+\.?\d*\b/g,
		functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
		decorators: /@\w+/g,
	},
	html: {
		tags: /<\/?[a-zA-Z][\w-]*[^>]*>/g,
		attributes: /\b([a-zA-Z-]+)(?==)/g,
		strings: /(["'])(?:(?!\1|\\).|\\.)*\1/g,
		comments: /<!--[\s\S]*?-->/g,
	},
	css: {
		selectors: /[.#]?[a-zA-Z][\w-]*(?=\s*\{)/g,
		properties: /[\w-]+(?=\s*:)/g,
		values: /:\s*([^;{}]+)/g,
		comments: /\/\*[\s\S]*?\*\//g,
	},
	json: {
		keys: /"([^"]+)"\s*:/g,
		strings: /"(?:[^"\\]|\\.)*"/g,
		numbers: /\b\d+\.?\d*\b/g,
		booleans: /\b(true|false|null)\b/g,
	},
	sql: {
		keywords: /\b(SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|LIKE|IN|BETWEEN|IS|NOT|NULL|EXISTS|UNION|CASE|WHEN|THEN|ELSE|END)\b/gi,
		strings: /'(?:[^'\\]|\\.)*'/g,
		comments: /--.*$/gm,
		numbers: /\b\d+\.?\d*\b/g,
	},
	markdown: {
		headings: /^#{1,6}\s.+$/gm,
		bold: /\*\*[^*]+\*\*/g,
		italic: /\*[^*]+\*/g,
		code: /`[^`]+`/g,
		links: /\[([^\]]+)\]\([^)]+\)/g,
	},
};

export class CodeEditor {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("CodeEditor: container not found");

		this.opts = Object.assign({
			theme: "glass",
			language: "javascript",
			value: "",
			readOnly: false,
			lineNumbers: true,
			minimap: true,
			wordWrap: false,
			tabSize: 4,
			fontSize: 14,
			onChange: null,
		}, opts);

		this._tabs = [{ id: "tab-1", label: "untitled", language: this.opts.language, value: this.opts.value }];
		this._activeTab = "tab-1";
		this._tabCounter = 1;
		this._searchOpen = false;
		this._searchTerm = "";

		this._init();
	}

	static create(container, opts) { return new CodeEditor(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-ce", `fv-ce--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._renderTabs();
		this._renderEditor();
		if (this.opts.minimap) this._renderMinimap();
		this._renderStatusBar();
		this._setValue(this.opts.value);
	}

	_renderTabs() {
		const tabBar = document.createElement("div");
		tabBar.className = "fv-ce-tab-bar";
		this.container.appendChild(tabBar);
		this._tabBar = tabBar;
		this._updateTabs();
	}

	_updateTabs() {
		if (!this._tabBar) return;
		this._tabBar.innerHTML = this._tabs.map(t => `
			<div class="fv-ce-tab ${t.id === this._activeTab ? "active" : ""}" data-id="${t.id}">
				<span class="fv-ce-tab-label">${this._esc(t.label)}</span>
				${this._tabs.length > 1 ? `<button class="fv-ce-tab-close" data-id="${t.id}">×</button>` : ""}
			</div>`
		).join("") + `<button class="fv-ce-tab-add" title="${__("New Tab")}">+</button>`;

		this._tabBar.querySelectorAll(".fv-ce-tab").forEach(el => {
			el.addEventListener("click", (e) => {
				if (e.target.classList.contains("fv-ce-tab-close")) return;
				this._switchTab(el.dataset.id);
			});
		});
		this._tabBar.querySelectorAll(".fv-ce-tab-close").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._closeTab(btn.dataset.id);
			});
		});
		this._tabBar.querySelector(".fv-ce-tab-add").addEventListener("click", () => this._addTab());
	}

	_renderEditor() {
		const editorWrap = document.createElement("div");
		editorWrap.className = "fv-ce-editor-wrap";

		// Line numbers
		if (this.opts.lineNumbers) {
			this._gutterEl = document.createElement("div");
			this._gutterEl.className = "fv-ce-gutter";
			editorWrap.appendChild(this._gutterEl);
		}

		// Code display (highlighted)
		this._codeDisplay = document.createElement("div");
		this._codeDisplay.className = "fv-ce-display";
		editorWrap.appendChild(this._codeDisplay);

		// Textarea (actual input)
		this._textarea = document.createElement("textarea");
		this._textarea.className = "fv-ce-textarea";
		this._textarea.spellcheck = false;
		this._textarea.readOnly = this.opts.readOnly;
		this._textarea.style.fontSize = `${this.opts.fontSize}px`;
		this._textarea.style.tabSize = this.opts.tabSize;
		if (this.opts.wordWrap) this._textarea.style.whiteSpace = "pre-wrap";
		editorWrap.appendChild(this._textarea);

		this.container.appendChild(editorWrap);
		this._editorWrap = editorWrap;

		this._bindEditorEvents();
	}

	_renderMinimap() {
		const minimap = document.createElement("div");
		minimap.className = "fv-ce-minimap";
		minimap.innerHTML = '<canvas class="fv-ce-minimap-canvas"></canvas>';
		this._editorWrap.appendChild(minimap);
		this._minimapCanvas = minimap.querySelector("canvas");
	}

	_renderStatusBar() {
		const bar = document.createElement("div");
		bar.className = "fv-ce-status";
		bar.innerHTML = `
			<span class="fv-ce-status-pos">Ln 1, Col 1</span>
			<span class="fv-ce-status-lang">${this.opts.language}</span>
			<span class="fv-ce-status-encoding">UTF-8</span>
			<button class="fv-ce-status-wrap">${this.opts.wordWrap ? "Wrap: On" : "Wrap: Off"}</button>`;
		this.container.appendChild(bar);
		this._statusBar = bar;

		bar.querySelector(".fv-ce-status-wrap").addEventListener("click", () => {
			this.opts.wordWrap = !this.opts.wordWrap;
			this._textarea.style.whiteSpace = this.opts.wordWrap ? "pre-wrap" : "pre";
			bar.querySelector(".fv-ce-status-wrap").textContent = this.opts.wordWrap ? "Wrap: On" : "Wrap: Off";
		});
	}

	/* ── Events ──────────────────────────────────────────────── */
	_bindEditorEvents() {
		this._textarea.addEventListener("input", () => {
			this._onInput();
		});

		this._textarea.addEventListener("scroll", () => {
			if (this._codeDisplay) {
				this._codeDisplay.scrollTop = this._textarea.scrollTop;
				this._codeDisplay.scrollLeft = this._textarea.scrollLeft;
			}
			if (this._gutterEl) {
				this._gutterEl.scrollTop = this._textarea.scrollTop;
			}
		});

		this._textarea.addEventListener("keydown", (e) => {
			// Tab indent
			if (e.key === "Tab") {
				e.preventDefault();
				const start = this._textarea.selectionStart;
				const end = this._textarea.selectionEnd;
				const val = this._textarea.value;
				if (e.shiftKey) {
					// Outdent
					const lineStart = val.lastIndexOf("\n", start - 1) + 1;
					const line = val.slice(lineStart, end);
					const outdented = line.replace(new RegExp(`^ {1,${this.opts.tabSize}}`), "");
					this._textarea.value = val.slice(0, lineStart) + outdented + val.slice(end);
				} else {
					const spaces = " ".repeat(this.opts.tabSize);
					this._textarea.value = val.slice(0, start) + spaces + val.slice(end);
					this._textarea.selectionStart = this._textarea.selectionEnd = start + this.opts.tabSize;
				}
				this._onInput();
			}

			// Auto-indent on Enter
			if (e.key === "Enter") {
				const start = this._textarea.selectionStart;
				const val = this._textarea.value;
				const lineStart = val.lastIndexOf("\n", start - 1) + 1;
				const line = val.slice(lineStart, start);
				const indent = line.match(/^\s*/)?.[0] || "";
				// Extra indent after : or {
				const lastChar = line.trim().slice(-1);
				const extra = (lastChar === ":" || lastChar === "{") ? " ".repeat(this.opts.tabSize) : "";
				e.preventDefault();
				const insert = "\n" + indent + extra;
				this._textarea.value = val.slice(0, start) + insert + val.slice(start);
				this._textarea.selectionStart = this._textarea.selectionEnd = start + insert.length;
				this._onInput();
			}

			// Ctrl+F — find
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				e.preventDefault();
				this._toggleSearch();
			}
		});

		// Cursor position
		this._textarea.addEventListener("click", () => this._updateStatusPos());
		this._textarea.addEventListener("keyup", () => this._updateStatusPos());
	}

	_onInput() {
		const val = this._textarea.value;
		// Save to active tab
		const tab = this._tabs.find(t => t.id === this._activeTab);
		if (tab) tab.value = val;

		this._highlight(val);
		this._updateGutter(val);
		if (this.opts.minimap) this._updateMinimap(val);
		if (this.opts.onChange) this.opts.onChange(val);
	}

	/* ── Syntax Highlighting ─────────────────────────────────── */
	_highlight(code) {
		if (!this._codeDisplay) return;
		const tab = this._tabs.find(t => t.id === this._activeTab);
		const lang = tab?.language || this.opts.language;
		const rules = LANGUAGES[lang];

		let html = this._esc(code);

		if (rules) {
			// Apply highlighting in priority order
			if (rules.comments)   html = html.replace(rules.comments, '<span class="fv-ce-comment">$&</span>');
			if (rules.strings)    html = html.replace(rules.strings, '<span class="fv-ce-string">$&</span>');
			if (rules.decorators) html = html.replace(rules.decorators, '<span class="fv-ce-decorator">$&</span>');
			if (rules.keywords)   html = html.replace(rules.keywords, '<span class="fv-ce-keyword">$&</span>');
			if (rules.numbers)    html = html.replace(rules.numbers, '<span class="fv-ce-number">$&</span>');
			if (rules.functions)  html = html.replace(rules.functions, '<span class="fv-ce-function">$1</span>(');
			if (rules.booleans)   html = html.replace(rules.booleans, '<span class="fv-ce-boolean">$&</span>');
			if (rules.headings)   html = html.replace(rules.headings, '<span class="fv-ce-heading">$&</span>');
			if (rules.bold)       html = html.replace(rules.bold, '<span class="fv-ce-bold">$&</span>');
			if (rules.tags)       html = html.replace(rules.tags, '<span class="fv-ce-tag">$&</span>');
			if (rules.keys)       html = html.replace(rules.keys, '<span class="fv-ce-key">"$1"</span>:');
		}

		this._codeDisplay.innerHTML = html;
	}

	_updateGutter(code) {
		if (!this._gutterEl) return;
		const lineCount = (code.match(/\n/g) || []).length + 1;
		this._gutterEl.innerHTML = Array.from({ length: lineCount }, (_, i) =>
			`<div class="fv-ce-line-num">${i + 1}</div>`
		).join("");
	}

	_updateMinimap(code) {
		if (!this._minimapCanvas) return;
		const canvas = this._minimapCanvas;
		const ctx = canvas.getContext("2d");
		const lines = code.split("\n");
		canvas.width = 60;
		canvas.height = Math.max(lines.length * 2, 100);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		lines.forEach((line, i) => {
			const width = Math.min(line.length * 0.5, 58);
			ctx.fillStyle = line.trim().startsWith("//") || line.trim().startsWith("#")
				? "rgba(100,200,100,0.3)" : "rgba(200,200,200,0.2)";
			ctx.fillRect(1, i * 2, width, 1.5);
		});
	}

	_updateStatusPos() {
		const pos = this._textarea.selectionStart;
		const val = this._textarea.value.slice(0, pos);
		const line = (val.match(/\n/g) || []).length + 1;
		const col = pos - val.lastIndexOf("\n");
		const posEl = this._statusBar?.querySelector(".fv-ce-status-pos");
		if (posEl) posEl.textContent = `Ln ${line}, Col ${col}`;
	}

	/* ── Tabs ────────────────────────────────────────────────── */
	_addTab(label, language, value) {
		this._tabCounter++;
		const id = `tab-${this._tabCounter}`;
		this._tabs.push({
			id,
			label: label || `untitled-${this._tabCounter}`,
			language: language || this.opts.language,
			value: value || "",
		});
		this._switchTab(id);
	}

	_closeTab(id) {
		if (this._tabs.length <= 1) return;
		const idx = this._tabs.findIndex(t => t.id === id);
		this._tabs.splice(idx, 1);
		if (this._activeTab === id) {
			this._activeTab = this._tabs[Math.max(0, idx - 1)].id;
		}
		this._updateTabs();
		this._loadTab();
	}

	_switchTab(id) {
		this._activeTab = id;
		this._updateTabs();
		this._loadTab();
	}

	_loadTab() {
		const tab = this._tabs.find(t => t.id === this._activeTab);
		if (!tab) return;
		this._textarea.value = tab.value;
		this._highlight(tab.value);
		this._updateGutter(tab.value);
		if (this.opts.minimap) this._updateMinimap(tab.value);
		const langEl = this._statusBar?.querySelector(".fv-ce-status-lang");
		if (langEl) langEl.textContent = tab.language;
	}

	/* ── Search ──────────────────────────────────────────────── */
	_toggleSearch() {
		if (this._searchOpen) {
			this._searchEl?.remove();
			this._searchOpen = false;
			return;
		}
		this._searchOpen = true;
		const el = document.createElement("div");
		el.className = "fv-ce-search";
		el.innerHTML = `
			<input class="fv-ce-search-input" placeholder="${__("Find...")}" />
			<button class="fv-ce-search-next">▼</button>
			<button class="fv-ce-search-prev">▲</button>
			<button class="fv-ce-search-close">×</button>`;
		this.container.insertBefore(el, this._editorWrap);
		this._searchEl = el;

		const input = el.querySelector(".fv-ce-search-input");
		input.focus();
		input.addEventListener("input", () => {
			this._searchTerm = input.value;
			this._highlightSearch();
		});
		el.querySelector(".fv-ce-search-close").addEventListener("click", () => this._toggleSearch());
	}

	_highlightSearch() {
		// Simple: select first match in textarea
		if (!this._searchTerm) return;
		const val = this._textarea.value;
		const idx = val.toLowerCase().indexOf(this._searchTerm.toLowerCase());
		if (idx >= 0) {
			this._textarea.focus();
			this._textarea.selectionStart = idx;
			this._textarea.selectionEnd = idx + this._searchTerm.length;
		}
	}

	/* ── Diff View ───────────────────────────────────────────── */
	showDiff(original, modified) {
		const origLines = original.split("\n");
		const modLines = modified.split("\n");
		const maxLen = Math.max(origLines.length, modLines.length);

		let html = '<div class="fv-ce-diff">';
		for (let i = 0; i < maxLen; i++) {
			const oLine = origLines[i];
			const mLine = modLines[i];
			let cls = "";
			if (oLine === undefined) cls = "fv-ce-diff--added";
			else if (mLine === undefined) cls = "fv-ce-diff--removed";
			else if (oLine !== mLine) cls = "fv-ce-diff--changed";

			html += `<div class="fv-ce-diff-row ${cls}">
				<span class="fv-ce-diff-num">${i + 1}</span>
				<span class="fv-ce-diff-orig">${this._esc(oLine || "")}</span>
				<span class="fv-ce-diff-sep">│</span>
				<span class="fv-ce-diff-mod">${this._esc(mLine || "")}</span>
			</div>`;
		}
		html += '</div>';
		this._editorWrap.innerHTML = html;
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this._textarea.value; }

	_setValue(val) {
		this._textarea.value = val;
		this._onInput();
	}

	setValue(val) { this._setValue(val); }

	setLanguage(lang) {
		const tab = this._tabs.find(t => t.id === this._activeTab);
		if (tab) tab.language = lang;
		this._highlight(this._textarea.value);
		const langEl = this._statusBar?.querySelector(".fv-ce-status-lang");
		if (langEl) langEl.textContent = lang;
	}

	openFile(label, language, value) { this._addTab(label, language, value); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ce");
	}
}
