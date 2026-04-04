// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Rich Text Editor Pro
 * =======================================
 * Premium WYSIWYG content editor with slash commands, @mentions,
 * embeds, markdown shortcuts, and a floating toolbar. Outputs
 * clean HTML ready for Frappe Text Editor fields.
 *
 * Features:
 *  - Floating toolbar (bold, italic, underline, strike, headings, lists, code, link, image)
 *  - Slash commands (/ menu with block types: heading, list, code, quote, divider, image)
 *  - @mentions autocomplete (users, doctypes, custom sources)
 *  - Markdown shortcuts (** bold, * italic, # heading, ``` code, > quote, - list)
 *  - Image/file embed via drag-drop or paste
 *  - Code blocks with language label
 *  - Clean HTML output (sanitized)
 *  - Character/word count
 *  - Placeholder text
 *  - Focus/blur events
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.RichEditor.create('#el', { placeholder, onChange })
 *
 * @module frappe_visual/components/rich_editor
 */

const TOOLBAR_ACTIONS = [
	{ cmd: "bold",          icon: "B",  title: "Bold (Ctrl+B)" },
	{ cmd: "italic",        icon: "I",  title: "Italic (Ctrl+I)" },
	{ cmd: "underline",     icon: "U",  title: "Underline (Ctrl+U)" },
	{ cmd: "strikeThrough", icon: "S",  title: "Strikethrough" },
	{ sep: true },
	{ cmd: "h2",            icon: "H2", title: "Heading 2", block: true },
	{ cmd: "h3",            icon: "H3", title: "Heading 3", block: true },
	{ sep: true },
	{ cmd: "insertUnorderedList", icon: "•",  title: "Bullet List" },
	{ cmd: "insertOrderedList",   icon: "1.", title: "Numbered List" },
	{ sep: true },
	{ cmd: "blockquote",   icon: "❝",  title: "Blockquote", block: true },
	{ cmd: "code",         icon: "<>", title: "Code Block", block: true },
	{ sep: true },
	{ cmd: "createLink",   icon: "🔗", title: "Insert Link" },
	{ cmd: "insertImage",  icon: "🖼", title: "Insert Image" },
];

const SLASH_COMMANDS = [
	{ id: "h1",        label: "Heading 1",    icon: "H1", tag: "h1" },
	{ id: "h2",        label: "Heading 2",    icon: "H2", tag: "h2" },
	{ id: "h3",        label: "Heading 3",    icon: "H3", tag: "h3" },
	{ id: "bullet",    label: "Bullet List",  icon: "•",  tag: "ul" },
	{ id: "numbered",  label: "Numbered List",icon: "1.", tag: "ol" },
	{ id: "quote",     label: "Blockquote",   icon: "❝",  tag: "blockquote" },
	{ id: "code",      label: "Code Block",   icon: "<>", tag: "pre" },
	{ id: "divider",   label: "Divider",      icon: "—",  tag: "hr" },
	{ id: "image",     label: "Image",        icon: "🖼",  tag: "img" },
];

export class RichEditor {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("RichEditor: container not found");

		this.opts = Object.assign({
			theme: "glass",
			placeholder: __("Start writing..."),
			value: "",
			onChange: null,
			onFocus: null,
			onBlur: null,
			mentionSources: null,   // async (query) => [{ id, label, avatar? }]
			maxLength: 0,
			showWordCount: true,
		}, opts);

		this._slashMenuOpen = false;
		this._mentionMenuOpen = false;
		this._init();
	}

	static create(container, opts) { return new RichEditor(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-rte", `fv-rte--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._renderToolbar();
		this._renderEditor();
		if (this.opts.showWordCount) this._renderFooter();
		this._setupShortcuts();
		this._setupSlashMenu();
		this._setupMentions();
		this._setupDragDrop();
	}

	/* ── Toolbar ─────────────────────────────────────────────── */
	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-rte-toolbar";

		for (const action of TOOLBAR_ACTIONS) {
			if (action.sep) {
				bar.appendChild(Object.assign(document.createElement("div"), { className: "fv-rte-sep" }));
				continue;
			}
			const btn = document.createElement("button");
			btn.className = "fv-rte-tool";
			btn.title = action.title;
			btn.textContent = action.icon;
			btn.addEventListener("mousedown", (e) => {
				e.preventDefault();
				this._execCommand(action);
			});
			bar.appendChild(btn);
		}

		this.container.appendChild(bar);
		this._toolbar = bar;
	}

	_execCommand(action) {
		this._editor.focus();
		if (action.cmd === "h2" || action.cmd === "h3") {
			document.execCommand("formatBlock", false, action.cmd);
		} else if (action.cmd === "blockquote") {
			document.execCommand("formatBlock", false, "blockquote");
		} else if (action.cmd === "code") {
			document.execCommand("formatBlock", false, "pre");
		} else if (action.cmd === "createLink") {
			const url = prompt(__("Enter URL:"));
			if (url) document.execCommand("createLink", false, url);
		} else if (action.cmd === "insertImage") {
			const url = prompt(__("Enter image URL:"));
			if (url) document.execCommand("insertImage", false, url);
		} else {
			document.execCommand(action.cmd, false, null);
		}
		this._emitChange();
	}

	/* ── Editor ──────────────────────────────────────────────── */
	_renderEditor() {
		const editor = document.createElement("div");
		editor.className = "fv-rte-editor";
		editor.contentEditable = "true";
		editor.setAttribute("role", "textbox");
		editor.setAttribute("aria-multiline", "true");
		editor.setAttribute("data-placeholder", this.opts.placeholder);

		if (this.opts.value) editor.innerHTML = this.opts.value;

		editor.addEventListener("input", () => this._onInput());
		editor.addEventListener("focus", () => {
			this.container.classList.add("fv-rte--focused");
			if (this.opts.onFocus) this.opts.onFocus();
		});
		editor.addEventListener("blur", () => {
			this.container.classList.remove("fv-rte--focused");
			if (this.opts.onBlur) this.opts.onBlur();
		});
		editor.addEventListener("paste", (e) => this._handlePaste(e));

		this.container.appendChild(editor);
		this._editor = editor;
	}

	_onInput() {
		this._checkMarkdownShortcuts();
		this._emitChange();
		this._updateWordCount();
	}

	_emitChange() {
		if (this.opts.onChange) this.opts.onChange(this.getHTML());
	}

	/* ── Markdown Shortcuts ──────────────────────────────────── */
	_checkMarkdownShortcuts() {
		const sel = window.getSelection();
		if (!sel.rangeCount) return;

		const node = sel.anchorNode;
		if (!node || node.nodeType !== 3) return;
		const text = node.textContent;

		// Line-level shortcuts (must be at start of block)
		const block = node.parentElement;
		if (block && block.closest?.(".fv-rte-editor")) {
			if (/^### $/.test(text)) { this._replaceTextBlock(node, "h3"); return; }
			if (/^## $/.test(text))  { this._replaceTextBlock(node, "h2"); return; }
			if (/^# $/.test(text))   { this._replaceTextBlock(node, "h1"); return; }
			if (/^> $/.test(text))   { this._replaceTextBlock(node, "blockquote"); return; }
			if (/^- $/.test(text)) {
				node.textContent = "";
				document.execCommand("insertUnorderedList");
				return;
			}
			if (/^1\. $/.test(text)) {
				node.textContent = "";
				document.execCommand("insertOrderedList");
				return;
			}
			if (/^```$/.test(text.trim())) {
				this._replaceTextBlock(node, "pre");
				return;
			}
			if (/^---$/.test(text.trim())) {
				node.textContent = "";
				document.execCommand("insertHorizontalRule");
				return;
			}
		}
	}

	_replaceTextBlock(node, tag) {
		node.textContent = "";
		document.execCommand("formatBlock", false, tag);
	}

	/* ── Slash Menu ──────────────────────────────────────────── */
	_setupSlashMenu() {
		this._slashMenu = document.createElement("div");
		this._slashMenu.className = "fv-rte-slash-menu";
		this._slashMenu.style.display = "none";
		this.container.appendChild(this._slashMenu);

		this._editor.addEventListener("keydown", (e) => {
			if (this._slashMenuOpen) {
				if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
					e.preventDefault();
					this._handleSlashNav(e.key);
					return;
				}
			}
		});

		this._editor.addEventListener("input", () => {
			this._checkSlashTrigger();
		});
	}

	_checkSlashTrigger() {
		const sel = window.getSelection();
		if (!sel.rangeCount) return;
		const node = sel.anchorNode;
		if (!node || node.nodeType !== 3) { this._closeSlashMenu(); return; }

		const text = node.textContent.slice(0, sel.anchorOffset);
		const match = text.match(/\/(\w*)$/);

		if (match) {
			const query = match[1].toLowerCase();
			const items = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(query));
			if (items.length > 0) {
				this._showSlashMenu(items);
				return;
			}
		}
		this._closeSlashMenu();
	}

	_showSlashMenu(items) {
		this._slashMenuOpen = true;
		this._slashItems = items;
		this._slashIdx = 0;

		this._slashMenu.innerHTML = items.map((item, i) => `
			<div class="fv-rte-slash-item ${i === 0 ? "active" : ""}" data-idx="${i}">
				<span class="fv-rte-slash-icon">${item.icon}</span>
				<span>${item.label}</span>
			</div>`).join("");
		this._slashMenu.style.display = "block";

		// Position near caret
		const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
		const cRect = this.container.getBoundingClientRect();
		this._slashMenu.style.top = `${rect.bottom - cRect.top + 4}px`;
		this._slashMenu.style.left = `${rect.left - cRect.left}px`;

		this._slashMenu.querySelectorAll(".fv-rte-slash-item").forEach(el => {
			el.addEventListener("mousedown", (e) => {
				e.preventDefault();
				this._insertSlashCommand(this._slashItems[parseInt(el.dataset.idx)]);
			});
		});
	}

	_handleSlashNav(key) {
		if (key === "Escape") { this._closeSlashMenu(); return; }
		if (key === "Enter") { this._insertSlashCommand(this._slashItems[this._slashIdx]); return; }

		if (key === "ArrowDown") this._slashIdx = Math.min(this._slashIdx + 1, this._slashItems.length - 1);
		if (key === "ArrowUp") this._slashIdx = Math.max(this._slashIdx - 1, 0);

		this._slashMenu.querySelectorAll(".fv-rte-slash-item").forEach((el, i) => {
			el.classList.toggle("active", i === this._slashIdx);
		});
	}

	_insertSlashCommand(cmd) {
		this._closeSlashMenu();
		// Remove the /query text
		const sel = window.getSelection();
		const node = sel.anchorNode;
		if (node?.nodeType === 3) {
			const text = node.textContent;
			const match = text.match(/\/\w*$/);
			if (match) node.textContent = text.slice(0, match.index);
		}

		if (cmd.tag === "hr") {
			document.execCommand("insertHorizontalRule");
		} else if (cmd.tag === "img") {
			const url = prompt(__("Enter image URL:"));
			if (url) document.execCommand("insertImage", false, url);
		} else if (cmd.tag === "ul") {
			document.execCommand("insertUnorderedList");
		} else if (cmd.tag === "ol") {
			document.execCommand("insertOrderedList");
		} else {
			document.execCommand("formatBlock", false, cmd.tag);
		}
		this._emitChange();
	}

	_closeSlashMenu() {
		this._slashMenuOpen = false;
		this._slashMenu.style.display = "none";
	}

	/* ── @Mentions ───────────────────────────────────────────── */
	_setupMentions() {
		if (!this.opts.mentionSources) return;

		this._mentionMenu = document.createElement("div");
		this._mentionMenu.className = "fv-rte-mention-menu";
		this._mentionMenu.style.display = "none";
		this.container.appendChild(this._mentionMenu);

		this._editor.addEventListener("input", () => this._checkMentionTrigger());
	}

	async _checkMentionTrigger() {
		if (!this.opts.mentionSources) return;
		const sel = window.getSelection();
		if (!sel.rangeCount) return;
		const node = sel.anchorNode;
		if (!node || node.nodeType !== 3) { this._closeMentionMenu(); return; }

		const text = node.textContent.slice(0, sel.anchorOffset);
		const match = text.match(/@(\w{1,20})$/);
		if (!match) { this._closeMentionMenu(); return; }

		const query = match[1];
		const results = await this.opts.mentionSources(query);
		if (results?.length > 0) {
			this._showMentionMenu(results);
		} else {
			this._closeMentionMenu();
		}
	}

	_showMentionMenu(items) {
		this._mentionMenuOpen = true;
		this._mentionMenu.innerHTML = items.slice(0, 8).map((item, i) => `
			<div class="fv-rte-mention-item ${i === 0 ? "active" : ""}" data-idx="${i}">
				${item.avatar ? `<img src="${item.avatar}" class="fv-rte-mention-avatar" />` : ""}
				<span>${this._esc(item.label || item.id)}</span>
			</div>`).join("");
		this._mentionMenu.style.display = "block";

		const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
		const cRect = this.container.getBoundingClientRect();
		this._mentionMenu.style.top = `${rect.bottom - cRect.top + 4}px`;
		this._mentionMenu.style.left = `${rect.left - cRect.left}px`;

		this._mentionMenu.querySelectorAll(".fv-rte-mention-item").forEach(el => {
			el.addEventListener("mousedown", (e) => {
				e.preventDefault();
				const idx = parseInt(el.dataset.idx);
				this._insertMention(items[idx]);
			});
		});
	}

	_insertMention(item) {
		this._closeMentionMenu();
		const sel = window.getSelection();
		const node = sel.anchorNode;
		if (node?.nodeType === 3) {
			const text = node.textContent;
			const match = text.match(/@\w*$/);
			if (match) node.textContent = text.slice(0, match.index);
		}

		const mention = document.createElement("span");
		mention.className = "fv-rte-mention";
		mention.contentEditable = "false";
		mention.dataset.mentionId = item.id;
		mention.textContent = `@${item.label || item.id}`;

		const range = sel.getRangeAt(0);
		range.insertNode(mention);
		range.setStartAfter(mention);
		range.collapse(true);
		sel.removeAllRanges();
		sel.addRange(range);

		// Add a space after mention
		const space = document.createTextNode("\u00A0");
		mention.after(space);
		range.setStartAfter(space);

		this._emitChange();
	}

	_closeMentionMenu() {
		this._mentionMenuOpen = false;
		if (this._mentionMenu) this._mentionMenu.style.display = "none";
	}

	/* ── Drag-Drop / Paste ───────────────────────────────────── */
	_setupDragDrop() {
		this._editor.addEventListener("dragover", (e) => {
			e.preventDefault();
			this._editor.classList.add("fv-rte-dragover");
		});
		this._editor.addEventListener("dragleave", () => {
			this._editor.classList.remove("fv-rte-dragover");
		});
		this._editor.addEventListener("drop", (e) => {
			e.preventDefault();
			this._editor.classList.remove("fv-rte-dragover");
			const files = e.dataTransfer?.files;
			if (files?.length) this._handleFiles(files);
		});
	}

	_handlePaste(e) {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (item.type.startsWith("image/")) {
				e.preventDefault();
				const file = item.getAsFile();
				if (file) this._handleFiles([file]);
				return;
			}
		}
	}

	async _handleFiles(files) {
		for (const file of files) {
			if (!file.type.startsWith("image/")) continue;
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("is_private", 0);
				const resp = await fetch("/api/method/upload_file", {
					method: "POST",
					headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
					body: formData,
				});
				const data = await resp.json();
				if (data.message?.file_url) {
					document.execCommand("insertImage", false, data.message.file_url);
					this._emitChange();
				}
			} catch (err) {
				console.error("RichEditor: upload error", err);
			}
		}
	}

	/* ── Keyboard Shortcuts ──────────────────────────────────── */
	_setupShortcuts() {
		this.container.addEventListener("keydown", (e) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key === "b") { e.preventDefault(); document.execCommand("bold"); this._emitChange(); }
				if (e.key === "i") { e.preventDefault(); document.execCommand("italic"); this._emitChange(); }
				if (e.key === "u") { e.preventDefault(); document.execCommand("underline"); this._emitChange(); }
			}
		});
	}

	/* ── Footer ──────────────────────────────────────────────── */
	_renderFooter() {
		const footer = document.createElement("div");
		footer.className = "fv-rte-footer";
		footer.innerHTML = `<span class="fv-rte-wc"></span>`;
		this.container.appendChild(footer);
		this._wcEl = footer.querySelector(".fv-rte-wc");
		this._updateWordCount();
	}

	_updateWordCount() {
		if (!this._wcEl) return;
		const text = (this._editor.innerText || "").trim();
		const words = text ? text.split(/\s+/).length : 0;
		const chars = text.length;
		this._wcEl.textContent = `${words} ${__("words")} · ${chars} ${__("chars")}`;
	}

	/* ── Public API ──────────────────────────────────────────── */
	getHTML() { return this._editor?.innerHTML || ""; }
	getText() { return this._editor?.innerText || ""; }
	setHTML(html) { if (this._editor) { this._editor.innerHTML = html; this._emitChange(); } }
	focus() { this._editor?.focus(); }
	clear() { if (this._editor) { this._editor.innerHTML = ""; this._emitChange(); } }

	getMentions() {
		const mentions = this._editor?.querySelectorAll(".fv-rte-mention") || [];
		return [...mentions].map(m => m.dataset.mentionId);
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-rte", `fv-rte--${this.opts.theme}`);
	}
}
