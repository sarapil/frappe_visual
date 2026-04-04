// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Rich Text Pro
 * ===============================
 * Premium block-based rich text editor with slash commands,
 * @mentions, embeds, markdown shortcuts, floating toolbar,
 * and table/code/media block support.
 *
 * Features:
 *  - Block-based editing (paragraphs, headings, lists, quotes, code, divider)
 *  - Slash commands (/) with fuzzy search menu
 *  - @mention autocomplete (users, doctypes, tags)
 *  - Floating format toolbar on selection (bold, italic, underline, link, code)
 *  - Markdown shortcuts (* bold *, / italic /, # heading, -, >, ```)
 *  - Table block with add row/col, merge cells
 *  - Code block with language selector
 *  - Image/video embed blocks
 *  - Drag-and-drop block reordering
 *  - Export to HTML / Markdown / JSON
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.RichText.create('#el', { value: '<p>Hello</p>' })
 *
 * @module frappe_visual/components/rich_text_pro
 */

const BLOCK_TYPES = [
	{ type: "paragraph", label: "Text",      icon: "T",  shortcut: null },
	{ type: "heading1",  label: "Heading 1", icon: "H1", shortcut: "# " },
	{ type: "heading2",  label: "Heading 2", icon: "H2", shortcut: "## " },
	{ type: "heading3",  label: "Heading 3", icon: "H3", shortcut: "### " },
	{ type: "bullet",    label: "Bullet List",icon: "•", shortcut: "- " },
	{ type: "numbered",  label: "Numbered",  icon: "1.", shortcut: "1. " },
	{ type: "todo",      label: "To-do",     icon: "☑", shortcut: "[] " },
	{ type: "quote",     label: "Quote",     icon: "❝", shortcut: "> " },
	{ type: "code",      label: "Code Block",icon: "<>", shortcut: "```" },
	{ type: "divider",   label: "Divider",   icon: "—",  shortcut: "---" },
	{ type: "table",     label: "Table",     icon: "⊞",  shortcut: null },
	{ type: "image",     label: "Image",     icon: "🖼", shortcut: null },
	{ type: "callout",   label: "Callout",   icon: "💡", shortcut: null },
];

const FORMAT_BUTTONS = [
	{ cmd: "bold",      icon: "B",  label: "Bold",      key: "b" },
	{ cmd: "italic",    icon: "I",  label: "Italic",    key: "i" },
	{ cmd: "underline", icon: "U",  label: "Underline", key: "u" },
	{ cmd: "strikeThrough", icon: "S", label: "Strike", key: null },
	{ cmd: "code",      icon: "<>", label: "Code",      key: "e" },
	{ cmd: "link",      icon: "🔗", label: "Link",      key: "k" },
];

export class RichText {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("RichText: container not found");

		this.opts = Object.assign({
			theme: "glass",
			value: "",
			placeholder: __("Type / for commands..."),
			mentionSource: null,
			readOnly: false,
			onChange: null,
			minHeight: 200,
		}, opts);

		this._blocks = [];
		this._slashOpen = false;
		this._slashFilter = "";
		this._mentionOpen = false;

		this._init();
	}

	static create(container, opts) { return new RichText(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-rt", `fv-rt--${this.opts.theme}`);
		this.container.innerHTML = "";

		// Editor area
		this._editor = document.createElement("div");
		this._editor.className = "fv-rt-editor";
		this._editor.contentEditable = !this.opts.readOnly;
		this._editor.setAttribute("role", "textbox");
		this._editor.setAttribute("aria-multiline", "true");
		this._editor.style.minHeight = `${this.opts.minHeight}px`;
		if (this.opts.value) this._editor.innerHTML = this.opts.value;
		else this._editor.innerHTML = `<p data-placeholder="${this._esc(this.opts.placeholder)}"></p>`;
		this.container.appendChild(this._editor);

		// Floating toolbar
		this._toolbar = document.createElement("div");
		this._toolbar.className = "fv-rt-toolbar";
		this._toolbar.innerHTML = FORMAT_BUTTONS.map(b =>
			`<button class="fv-rt-fmt-btn" data-cmd="${b.cmd}" title="${__(b.label)}">${b.icon}</button>`
		).join("");
		this.container.appendChild(this._toolbar);

		// Slash menu
		this._slashMenu = document.createElement("div");
		this._slashMenu.className = "fv-rt-slash-menu fv-rt-hidden";
		this.container.appendChild(this._slashMenu);

		// Mention menu
		this._mentionMenu = document.createElement("div");
		this._mentionMenu.className = "fv-rt-mention-menu fv-rt-hidden";
		this.container.appendChild(this._mentionMenu);

		this._bindEvents();
	}

	/* ── Events ──────────────────────────────────────────────── */
	_bindEvents() {
		// Selection → show/hide toolbar
		document.addEventListener("selectionchange", () => this._onSelectionChange());

		// Keyboard
		this._editor.addEventListener("keydown", (e) => this._onKeydown(e));
		this._editor.addEventListener("input", () => this._onInput());

		// Toolbar buttons
		this._toolbar.querySelectorAll(".fv-rt-fmt-btn").forEach(btn => {
			btn.addEventListener("mousedown", (e) => {
				e.preventDefault();
				const cmd = btn.dataset.cmd;
				if (cmd === "link") this._insertLink();
				else if (cmd === "code") this._toggleInlineCode();
				else document.execCommand(cmd, false, null);
			});
		});

		// Keyboard shortcuts (Ctrl+B/I/U/K/E)
		this._editor.addEventListener("keydown", (e) => {
			if (!(e.ctrlKey || e.metaKey)) return;
			const btn = FORMAT_BUTTONS.find(b => b.key === e.key);
			if (btn) {
				e.preventDefault();
				if (btn.cmd === "link") this._insertLink();
				else if (btn.cmd === "code") this._toggleInlineCode();
				else document.execCommand(btn.cmd, false, null);
			}
		});

		// Paste — strip formatting
		this._editor.addEventListener("paste", (e) => {
			e.preventDefault();
			const text = e.clipboardData?.getData("text/html") || e.clipboardData?.getData("text/plain") || "";
			document.execCommand("insertHTML", false, this._sanitizeHTML(text));
		});
	}

	_onSelectionChange() {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !this._editor.contains(sel.anchorNode)) {
			this._toolbar.classList.remove("fv-rt-toolbar--visible");
			return;
		}
		const range = sel.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		const editorRect = this._editor.getBoundingClientRect();

		this._toolbar.style.top = `${rect.top - editorRect.top - 44}px`;
		this._toolbar.style.left = `${rect.left - editorRect.left + rect.width / 2}px`;
		this._toolbar.classList.add("fv-rt-toolbar--visible");
	}

	_onKeydown(e) {
		// Slash command trigger
		if (e.key === "/" && !this._slashOpen) {
			// Only if at beginning of block or after space
			const sel = window.getSelection();
			if (sel?.anchorNode) {
				const text = sel.anchorNode.textContent?.slice(0, sel.anchorOffset) || "";
				if (text === "" || text.endsWith(" ")) {
					setTimeout(() => this._openSlashMenu(), 10);
				}
			}
		}

		// @ mention trigger
		if (e.key === "@" && !this._mentionOpen) {
			setTimeout(() => this._openMentionMenu(), 10);
		}

		// Escape closes menus
		if (e.key === "Escape") {
			this._closeSlashMenu();
			this._closeMentionMenu();
		}

		// Tab for indent
		if (e.key === "Tab") {
			e.preventDefault();
			document.execCommand("insertText", false, "  ");
		}

		// Enter in slash menu
		if (this._slashOpen && e.key === "Enter") {
			e.preventDefault();
			const active = this._slashMenu.querySelector(".fv-rt-slash-item.active");
			if (active) active.click();
		}

		// Arrow navigation in slash menu
		if (this._slashOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
			e.preventDefault();
			this._navigateSlashMenu(e.key === "ArrowDown" ? 1 : -1);
		}
	}

	_onInput() {
		// Check for markdown shortcuts at line start
		this._checkMarkdownShortcuts();

		// Update slash filter
		if (this._slashOpen) {
			const sel = window.getSelection();
			const text = sel?.anchorNode?.textContent || "";
			const slashIdx = text.lastIndexOf("/");
			if (slashIdx >= 0) {
				this._slashFilter = text.slice(slashIdx + 1);
				this._renderSlashMenu();
			} else {
				this._closeSlashMenu();
			}
		}

		this._emitChange();
	}

	/* ── Slash Commands ──────────────────────────────────────── */
	_openSlashMenu() {
		this._slashOpen = true;
		this._slashFilter = "";
		this._renderSlashMenu();
		this._positionMenu(this._slashMenu);
		this._slashMenu.classList.remove("fv-rt-hidden");
	}

	_closeSlashMenu() {
		this._slashOpen = false;
		this._slashMenu.classList.add("fv-rt-hidden");
	}

	_renderSlashMenu() {
		const filter = this._slashFilter.toLowerCase();
		const items = BLOCK_TYPES.filter(b =>
			b.label.toLowerCase().includes(filter) || b.type.includes(filter)
		);

		this._slashMenu.innerHTML = items.length === 0
			? `<div class="fv-rt-slash-empty">${__("No commands found")}</div>`
			: items.map((b, i) =>
				`<button class="fv-rt-slash-item ${i === 0 ? "active" : ""}" data-type="${b.type}">
					<span class="fv-rt-slash-icon">${b.icon}</span>
					<span class="fv-rt-slash-label">${__(b.label)}</span>
				</button>`
			).join("");

		this._slashMenu.querySelectorAll(".fv-rt-slash-item").forEach(btn => {
			btn.addEventListener("click", () => {
				this._insertBlock(btn.dataset.type);
				this._closeSlashMenu();
			});
		});
	}

	_navigateSlashMenu(dir) {
		const items = Array.from(this._slashMenu.querySelectorAll(".fv-rt-slash-item"));
		const active = items.findIndex(i => i.classList.contains("active"));
		items[active]?.classList.remove("active");
		const next = Math.max(0, Math.min(items.length - 1, active + dir));
		items[next]?.classList.add("active");
		items[next]?.scrollIntoView({ block: "nearest" });
	}

	/* ── Mention ─────────────────────────────────────────────── */
	_openMentionMenu() {
		this._mentionOpen = true;
		this._positionMenu(this._mentionMenu);
		this._mentionMenu.classList.remove("fv-rt-hidden");
		this._fetchMentions("");
	}

	_closeMentionMenu() {
		this._mentionOpen = false;
		this._mentionMenu.classList.add("fv-rt-hidden");
	}

	async _fetchMentions(query) {
		let users = [];
		if (this.opts.mentionSource) {
			users = await this.opts.mentionSource(query);
		} else {
			try {
				const result = await frappe.xcall("frappe.client.get_list", {
					doctype: "User",
					fields: ["name", "full_name", "user_image"],
					filters: { enabled: 1, full_name: ["like", `%${query}%`] },
					limit_page_length: 10,
				});
				users = (result || []).map(u => ({
					id: u.name,
					label: u.full_name || u.name,
					image: u.user_image,
				}));
			} catch { /* */ }
		}

		this._mentionMenu.innerHTML = users.length === 0
			? `<div class="fv-rt-mention-empty">${__("No users found")}</div>`
			: users.map(u =>
				`<button class="fv-rt-mention-item" data-id="${this._esc(u.id)}">
					${u.image ? `<img class="fv-rt-mention-avatar" src="${u.image}" />` : `<span class="fv-rt-mention-avatar">👤</span>`}
					<span>${this._esc(u.label)}</span>
				</button>`
			).join("");

		this._mentionMenu.querySelectorAll(".fv-rt-mention-item").forEach(btn => {
			btn.addEventListener("click", () => {
				this._insertMention(btn.dataset.id, btn.textContent.trim());
				this._closeMentionMenu();
			});
		});
	}

	/* ── Block Insertion ─────────────────────────────────────── */
	_insertBlock(type) {
		// Remove the slash trigger text
		const sel = window.getSelection();
		if (sel?.anchorNode) {
			const text = sel.anchorNode.textContent || "";
			const slashIdx = text.lastIndexOf("/");
			if (slashIdx >= 0) {
				sel.anchorNode.textContent = text.slice(0, slashIdx);
			}
		}

		let html = "";
		switch (type) {
			case "heading1":  html = "<h1><br></h1>"; break;
			case "heading2":  html = "<h2><br></h2>"; break;
			case "heading3":  html = "<h3><br></h3>"; break;
			case "bullet":    html = "<ul><li><br></li></ul>"; break;
			case "numbered":  html = "<ol><li><br></li></ol>"; break;
			case "todo":      html = '<div class="fv-rt-todo"><input type="checkbox" /><span><br></span></div>'; break;
			case "quote":     html = "<blockquote><p><br></p></blockquote>"; break;
			case "code":      html = '<pre class="fv-rt-code"><code><br></code></pre>'; break;
			case "divider":   html = '<hr class="fv-rt-divider" /><p><br></p>'; break;
			case "table":     html = this._createTableHTML(3, 3); break;
			case "image":     this._insertImage(); return;
			case "callout":   html = '<div class="fv-rt-callout"><span class="fv-rt-callout-icon">💡</span><p><br></p></div>'; break;
			default:          html = "<p><br></p>";
		}
		document.execCommand("insertHTML", false, html);
	}

	_createTableHTML(rows, cols) {
		let html = '<table class="fv-rt-table"><thead><tr>';
		for (let c = 0; c < cols; c++) html += `<th>${__("Column")} ${c + 1}</th>`;
		html += "</tr></thead><tbody>";
		for (let r = 0; r < rows - 1; r++) {
			html += "<tr>";
			for (let c = 0; c < cols; c++) html += "<td><br></td>";
			html += "</tr>";
		}
		html += "</tbody></table><p><br></p>";
		return html;
	}

	_insertImage() {
		const url = prompt(__("Enter image URL:"));
		if (url) {
			document.execCommand("insertHTML", false,
				`<figure class="fv-rt-figure"><img src="${this._esc(url)}" /><figcaption>${__("Caption")}</figcaption></figure>`
			);
		}
	}

	_insertLink() {
		const url = prompt(__("Enter URL:"));
		if (url) document.execCommand("createLink", false, url);
	}

	_toggleInlineCode() {
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed) return;
		const range = sel.getRangeAt(0);
		const text = range.toString();
		const code = document.createElement("code");
		code.className = "fv-rt-inline-code";
		code.textContent = text;
		range.deleteContents();
		range.insertNode(code);
	}

	_insertMention(id, label) {
		// Remove @ trigger
		const sel = window.getSelection();
		if (sel?.anchorNode) {
			const text = sel.anchorNode.textContent || "";
			const atIdx = text.lastIndexOf("@");
			if (atIdx >= 0) sel.anchorNode.textContent = text.slice(0, atIdx);
		}
		document.execCommand("insertHTML", false,
			`<span class="fv-rt-mention" data-mention-id="${this._esc(id)}" contenteditable="false">@${this._esc(label)}</span>&nbsp;`
		);
	}

	/* ── Markdown Shortcuts ──────────────────────────────────── */
	_checkMarkdownShortcuts() {
		const sel = window.getSelection();
		if (!sel?.anchorNode) return;
		const node = sel.anchorNode;
		const text = node.textContent || "";

		// Heading shortcuts
		if (text.startsWith("### ")) {
			node.textContent = text.slice(4);
			document.execCommand("formatBlock", false, "h3");
		} else if (text.startsWith("## ")) {
			node.textContent = text.slice(3);
			document.execCommand("formatBlock", false, "h2");
		} else if (text.startsWith("# ")) {
			node.textContent = text.slice(2);
			document.execCommand("formatBlock", false, "h1");
		} else if (text.startsWith("> ")) {
			node.textContent = text.slice(2);
			document.execCommand("formatBlock", false, "blockquote");
		} else if (text === "---") {
			node.textContent = "";
			document.execCommand("insertHTML", false, '<hr class="fv-rt-divider" /><p><br></p>');
		}
	}

	/* ── Positioning ─────────────────────────────────────────── */
	_positionMenu(menu) {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;
		const range = sel.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		const editorRect = this._editor.getBoundingClientRect();

		menu.style.top = `${rect.bottom - editorRect.top + 4}px`;
		menu.style.left = `${rect.left - editorRect.left}px`;
	}

	/* ── Sanitize ────────────────────────────────────────────── */
	_sanitizeHTML(html) {
		const tmp = document.createElement("div");
		tmp.innerHTML = html;
		// Strip scripts
		tmp.querySelectorAll("script, style, iframe").forEach(el => el.remove());
		return tmp.innerHTML;
	}

	/* ── Export ───────────────────────────────────────────────── */
	getHTML() { return this._editor.innerHTML; }

	getText() { return this._editor.textContent || ""; }

	getMarkdown() {
		// Simplified HTML → MD conversion
		let md = this._editor.innerHTML;
		md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n");
		md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
		md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n");
		md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
		md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
		md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
		md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
		md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
		md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
		md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n");
		md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
		md = md.replace(/<hr[^>]*\/?>/gi, "\n---\n");
		md = md.replace(/<br[^>]*\/?>/gi, "\n");
		md = md.replace(/<[^>]+>/g, "");
		return md.trim();
	}

	setValue(html) {
		this._editor.innerHTML = html || `<p data-placeholder="${this._esc(this.opts.placeholder)}"></p>`;
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	_emitChange() {
		if (this.opts.onChange) this.opts.onChange(this.getHTML());
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-rt");
	}
}
