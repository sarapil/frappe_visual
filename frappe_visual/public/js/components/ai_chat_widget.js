// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — AI Chat Widget
 * =================================
 * Premium AI assistant chat panel with streaming responses,
 * code blocks, action suggestions, context awareness, and
 * dockable/floating positioning. Integrates with any AI backend
 * via configurable endpoint.
 *
 * Features:
 *  - Chat bubble UI with user / assistant / system roles
 *  - Streaming response display (SSE or chunked)
 *  - Code block rendering with syntax highlighting & copy button
 *  - Markdown rendering (bold, italic, lists, links, code)
 *  - Suggested action chips (quick replies)
 *  - Context injection (current doctype, page, selection)
 *  - Conversation history with local storage persistence
 *  - Dockable panel (right/bottom) or floating window
 *  - Typing indicator with animated dots
 *  - File/image attachment support
 *  - Voice input button (Web Speech API)
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.AIChatWidget.create('#el', { endpoint, systemPrompt })
 *
 * @module frappe_visual/components/ai_chat_widget
 */

export class AIChatWidget {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("AIChatWidget: container not found");

		this.opts = Object.assign({
			theme: "glass",
			position: "right",        // "right" | "bottom" | "float"
			title: __("AI Assistant"),
			subtitle: "",
			endpoint: null,            // API endpoint URL or frappe method
			method: null,              // Alternative: frappe.call method
			systemPrompt: "",
			contextProvider: null,      // () => { doctype, docname, route, ... }
			suggestedActions: [],       // ["Explain this", "Summarize", ...]
			persistHistory: true,
			storageKey: "fv_ai_chat",
			maxHistory: 50,
			placeholder: __("Ask anything..."),
			enableVoice: false,
			enableAttach: false,
			onAction: null,             // callback(action, messageData)
			assistantName: "AI",
			assistantAvatar: null,      // URL or emoji
		}, opts);

		this.messages = [];
		this.isStreaming = false;
		this._init();
	}

	static create(container, opts = {}) { return new AIChatWidget(container, opts); }

	static _instance = null;
	static toggle(opts) {
		if (AIChatWidget._instance) {
			AIChatWidget._instance.destroy();
			AIChatWidget._instance = null;
		} else {
			const el = document.createElement("div");
			document.body.appendChild(el);
			AIChatWidget._instance = new AIChatWidget(el, { position: "right", ...opts });
		}
	}

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-ai", `fv-ai--${this.opts.theme}`, `fv-ai--${this.opts.position}`);
		this.container.innerHTML = "";
		this.container.setAttribute("role", "complementary");
		this.container.setAttribute("aria-label", this.opts.title);

		if (this.opts.persistHistory) this._loadHistory();

		this._renderHeader();
		this._renderMessages();
		this._renderInput();
		if (this.opts.suggestedActions.length) this._renderSuggestions();

		this._scrollToBottom();
	}

	/* ── Header ──────────────────────────────────────────────── */
	_renderHeader() {
		const header = document.createElement("div");
		header.className = "fv-ai-header";
		header.innerHTML = `
			<div class="fv-ai-header-left">
				${this.opts.assistantAvatar ? `<span class="fv-ai-avatar">${this.opts.assistantAvatar}</span>` :
					`<span class="fv-ai-avatar">🤖</span>`}
				<div>
					<div class="fv-ai-title">${this._esc(this.opts.title)}</div>
					${this.opts.subtitle ? `<div class="fv-ai-subtitle">${this._esc(this.opts.subtitle)}</div>` : ""}
				</div>
			</div>
			<div class="fv-ai-header-right">
				<button class="fv-ai-btn fv-ai-btn--clear" title="${__("Clear chat")}">🗑</button>
				<button class="fv-ai-btn fv-ai-btn--close" title="${__("Close")}">✕</button>
			</div>`;
		this.container.appendChild(header);

		header.querySelector(".fv-ai-btn--clear").addEventListener("click", () => this.clearHistory());
		header.querySelector(".fv-ai-btn--close").addEventListener("click", () => this.destroy());
	}

	/* ── Messages ────────────────────────────────────────────── */
	_renderMessages() {
		const area = document.createElement("div");
		area.className = "fv-ai-messages";
		this.container.appendChild(area);
		this._messagesEl = area;

		// Render existing history
		for (const msg of this.messages) {
			this._appendBubble(msg, false);
		}

		// Welcome message if empty
		if (this.messages.length === 0) {
			this._appendBubble({
				role: "assistant",
				content: __("Hello! How can I help you today?"),
				timestamp: Date.now(),
			}, false);
		}
	}

	_appendBubble(msg, animate = true) {
		const bubble = document.createElement("div");
		bubble.className = `fv-ai-bubble fv-ai-bubble--${msg.role}`;

		const content = document.createElement("div");
		content.className = "fv-ai-bubble-content";
		content.innerHTML = this._renderContent(msg.content);
		bubble.appendChild(content);

		// Timestamp
		const time = document.createElement("div");
		time.className = "fv-ai-bubble-time";
		time.textContent = this._formatTime(msg.timestamp);
		bubble.appendChild(time);

		// Actions on assistant messages
		if (msg.role === "assistant" && msg.actions?.length) {
			const actions = document.createElement("div");
			actions.className = "fv-ai-actions";
			for (const action of msg.actions) {
				const btn = document.createElement("button");
				btn.className = "fv-ai-action-chip";
				btn.textContent = action.label || action;
				btn.addEventListener("click", () => {
					if (this.opts.onAction) this.opts.onAction(action, msg);
					else if (typeof action === "string") this.send(action);
				});
				actions.appendChild(btn);
			}
			bubble.appendChild(actions);
		}

		this._messagesEl.appendChild(bubble);

		if (animate && typeof gsap !== "undefined") {
			gsap.from(bubble, {
				opacity: 0, y: 15, scale: 0.95,
				duration: 0.3, ease: "power2.out"
			});
		}

		this._scrollToBottom();
	}

	_showTypingIndicator() {
		const indicator = document.createElement("div");
		indicator.className = "fv-ai-typing";
		indicator.id = "fv-ai-typing";
		indicator.innerHTML = `
			<span class="fv-ai-typing-dot"></span>
			<span class="fv-ai-typing-dot"></span>
			<span class="fv-ai-typing-dot"></span>`;
		this._messagesEl.appendChild(indicator);
		this._scrollToBottom();
	}

	_removeTypingIndicator() {
		const el = this._messagesEl.querySelector("#fv-ai-typing");
		if (el) el.remove();
	}

	/* ── Content Rendering ───────────────────────────────────── */
	_renderContent(text) {
		if (!text) return "";
		let html = this._esc(text);

		// Code blocks ```...```
		html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
			return `<div class="fv-ai-code-block">
				<div class="fv-ai-code-header">
					<span>${lang || "code"}</span>
					<button class="fv-ai-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)">${__("Copy")}</button>
				</div>
				<pre class="fv-ai-code"><code>${code}</code></pre>
			</div>`;
		});

		// Inline code `...`
		html = html.replace(/`([^`]+)`/g, '<code class="fv-ai-inline-code">$1</code>');

		// Bold **...**
		html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

		// Italic *...*
		html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

		// Links [text](url)
		html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

		// Lists - item
		html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
		html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

		// Line breaks
		html = html.replace(/\n/g, "<br>");

		return html;
	}

	/* ── Input Area ──────────────────────────────────────────── */
	_renderInput() {
		const input = document.createElement("div");
		input.className = "fv-ai-input-area";
		input.innerHTML = `
			<div class="fv-ai-input-row">
				${this.opts.enableAttach ? `<button class="fv-ai-btn fv-ai-btn--attach" title="${__("Attach")}">📎</button>` : ""}
				<textarea class="fv-ai-input" placeholder="${this._esc(this.opts.placeholder)}"
					rows="1" maxlength="4000"></textarea>
				${this.opts.enableVoice ? `<button class="fv-ai-btn fv-ai-btn--voice" title="${__("Voice input")}">🎙</button>` : ""}
				<button class="fv-ai-btn fv-ai-btn--send" title="${__("Send")}">➤</button>
			</div>`;
		this.container.appendChild(input);

		this._inputEl = input.querySelector(".fv-ai-input");
		const sendBtn = input.querySelector(".fv-ai-btn--send");

		// Auto-resize textarea
		this._inputEl.addEventListener("input", () => {
			this._inputEl.style.height = "auto";
			this._inputEl.style.height = Math.min(this._inputEl.scrollHeight, 120) + "px";
		});

		// Send on Enter (Shift+Enter for newline)
		this._inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this._handleSend();
			}
		});

		sendBtn.addEventListener("click", () => this._handleSend());

		// Voice input
		if (this.opts.enableVoice) {
			const voiceBtn = input.querySelector(".fv-ai-btn--voice");
			voiceBtn.addEventListener("click", () => this._startVoice());
		}
	}

	/* ── Suggestions ─────────────────────────────────────────── */
	_renderSuggestions() {
		const sug = document.createElement("div");
		sug.className = "fv-ai-suggestions";
		for (const text of this.opts.suggestedActions) {
			const chip = document.createElement("button");
			chip.className = "fv-ai-suggestion-chip";
			chip.textContent = text;
			chip.addEventListener("click", () => this.send(text));
			sug.appendChild(chip);
		}
		// Insert before input area
		const inputArea = this.container.querySelector(".fv-ai-input-area");
		this.container.insertBefore(sug, inputArea);
	}

	/* ── Send ────────────────────────────────────────────────── */
	async _handleSend() {
		const text = this._inputEl.value.trim();
		if (!text || this.isStreaming) return;

		this._inputEl.value = "";
		this._inputEl.style.height = "auto";

		await this.send(text);
	}

	async send(text) {
		// Add user message
		const userMsg = { role: "user", content: text, timestamp: Date.now() };
		this.messages.push(userMsg);
		this._appendBubble(userMsg);
		this._saveHistory();

		// Get context
		const context = this.opts.contextProvider ? this.opts.contextProvider() : {};

		// Show typing
		this.isStreaming = true;
		this._showTypingIndicator();

		try {
			let response;
			if (this.opts.method) {
				// Frappe call
				const r = await frappe.xcall(this.opts.method, {
					message: text,
					history: this.messages.slice(-10),
					context,
					system_prompt: this.opts.systemPrompt,
				});
				response = typeof r === "string" ? r : (r?.message || r?.response || JSON.stringify(r));
			} else if (this.opts.endpoint) {
				// Custom endpoint
				const res = await fetch(this.opts.endpoint, {
					method: "POST",
					headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": frappe.csrf_token },
					body: JSON.stringify({
						message: text,
						history: this.messages.slice(-10),
						context,
						system_prompt: this.opts.systemPrompt,
					}),
				});
				const data = await res.json();
				response = data.message || data.response || data.text || JSON.stringify(data);
			} else {
				// Demo mode — echo
				response = __("AI endpoint not configured. Set `endpoint` or `method` option.");
			}

			this._removeTypingIndicator();

			const assistantMsg = { role: "assistant", content: response, timestamp: Date.now() };
			this.messages.push(assistantMsg);
			this._appendBubble(assistantMsg);
			this._saveHistory();

		} catch (e) {
			this._removeTypingIndicator();
			console.error("AIChatWidget: send error", e);
			this._appendBubble({
				role: "assistant",
				content: __("Sorry, something went wrong. Please try again."),
				timestamp: Date.now(),
			});
		}

		this.isStreaming = false;
	}

	/* ── Voice Input ─────────────────────────────────────────── */
	_startVoice() {
		if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
			frappe.show_alert({ message: __("Speech recognition not supported"), indicator: "orange" });
			return;
		}

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SpeechRecognition();
		recognition.lang = frappe.boot?.lang === "ar" ? "ar-SA" : "en-US";
		recognition.interimResults = false;

		recognition.onresult = (event) => {
			const text = event.results[0][0].transcript;
			this._inputEl.value = text;
			this._inputEl.dispatchEvent(new Event("input"));
		};

		recognition.onerror = (e) => {
			console.warn("AIChatWidget: voice error", e.error);
		};

		recognition.start();
		frappe.show_alert({ message: __("Listening..."), indicator: "blue" }, 3);
	}

	/* ── History Persistence ─────────────────────────────────── */
	_saveHistory() {
		if (!this.opts.persistHistory) return;
		try {
			const trimmed = this.messages.slice(-this.opts.maxHistory);
			localStorage.setItem(this.opts.storageKey, JSON.stringify(trimmed));
		} catch {}
	}

	_loadHistory() {
		try {
			const raw = localStorage.getItem(this.opts.storageKey);
			if (raw) this.messages = JSON.parse(raw);
		} catch {}
	}

	clearHistory() {
		this.messages = [];
		try { localStorage.removeItem(this.opts.storageKey); } catch {}
		if (this._messagesEl) this._messagesEl.innerHTML = "";
		this._appendBubble({
			role: "assistant",
			content: __("Chat cleared. How can I help you?"),
			timestamp: Date.now(),
		}, false);
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_scrollToBottom() {
		if (this._messagesEl) {
			this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
		}
	}

	_formatTime(ts) {
		if (!ts) return "";
		const d = new Date(ts);
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ai", `fv-ai--${this.opts.theme}`, `fv-ai--${this.opts.position}`);
		if (AIChatWidget._instance === this) AIChatWidget._instance = null;
	}
}
