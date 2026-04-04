// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual ChatBubble — Chat message component
 * ===================================================
 * frappe.visual.ChatBubble.create({ container, messages, ... })
 *
 * Renders a single chat message or a stream of messages.
 */
export class ChatBubble {
	static create(opts = {}) { return new ChatBubble(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			messages: [],           // [{ id, content, sender, avatar, timestamp, status, isOwn, replyTo, reactions, attachments }]
			showAvatar: true,
			showTimestamp: true,
			showStatus: true,
			groupByTime: true,      // group consecutive same-sender messages
			onReact: null,          // (messageId, emoji) => {}
			onReply: null,          // (messageId) => {}
			onRetry: null,          // (messageId) => {}
			theme: 'default',       // default | minimal | glass
		}, opts);

		this.el = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;

		if (this.el) {
			this.el.classList.add('fv-cb-container', `fv-cb-${this.o.theme}`);
			this._renderAll();
		}
	}

	_renderAll() {
		this.el.innerHTML = '';
		this.o.messages.forEach(msg => this._renderMessage(msg));
		this._scrollBottom();
	}

	addMessage(msg) {
		this.o.messages.push(msg);
		this._renderMessage(msg);
		this._scrollBottom();
	}

	updateMessage(id, updates) {
		const msg = this.o.messages.find(m => m.id === id);
		if (!msg) return;
		Object.assign(msg, updates);
		const el = this.el.querySelector(`[data-msg-id="${id}"]`);
		if (el) {
			const newEl = this._createBubble(msg);
			el.replaceWith(newEl);
		}
	}

	_renderMessage(msg) {
		const bubble = this._createBubble(msg);
		this.el.appendChild(bubble);
	}

	_createBubble(msg) {
		const wrap = document.createElement('div');
		wrap.className = `fv-cb ${msg.isOwn ? 'fv-cb-own' : 'fv-cb-other'}`;
		wrap.setAttribute('data-msg-id', msg.id || '');

		let html = '';

		// Avatar
		if (this.o.showAvatar && !msg.isOwn) {
			html += `<div class="fv-cb-avatar">`;
			if (msg.avatar) html += `<img src="${ChatBubble._esc(msg.avatar)}" alt="" />`;
			else html += `<div class="fv-cb-avatar-initials">${ChatBubble._initials(msg.sender)}</div>`;
			html += `</div>`;
		}

		html += `<div class="fv-cb-main">`;

		// Sender name
		if (!msg.isOwn && msg.sender) {
			html += `<div class="fv-cb-sender">${ChatBubble._esc(msg.sender)}</div>`;
		}

		// Reply reference
		if (msg.replyTo) {
			html += `<div class="fv-cb-reply">`;
			html += `<div class="fv-cb-reply-sender">${ChatBubble._esc(msg.replyTo.sender || '')}</div>`;
			html += `<div class="fv-cb-reply-text">${ChatBubble._esc(msg.replyTo.text || '')}</div>`;
			html += `</div>`;
		}

		// Content
		html += `<div class="fv-cb-content">${ChatBubble._esc(msg.content || '')}</div>`;

		// Attachments
		if (msg.attachments && msg.attachments.length) {
			html += `<div class="fv-cb-attachments">`;
			msg.attachments.forEach(att => {
				if (att.type === 'image') {
					html += `<img class="fv-cb-att-img" src="${ChatBubble._esc(att.url)}" alt="${ChatBubble._esc(att.name || '')}" />`;
				} else {
					html += `<a class="fv-cb-att-file" href="${ChatBubble._esc(att.url)}" target="_blank">`;
					html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
					html += `<span>${ChatBubble._esc(att.name || 'File')}</span>`;
					html += `</a>`;
				}
			});
			html += `</div>`;
		}

		// Footer: time + status
		html += `<div class="fv-cb-footer">`;
		if (this.o.showTimestamp && msg.timestamp) {
			html += `<span class="fv-cb-time">${ChatBubble._formatTime(msg.timestamp)}</span>`;
		}
		if (this.o.showStatus && msg.isOwn && msg.status) {
			html += `<span class="fv-cb-status fv-cb-status-${msg.status}">${ChatBubble._statusIcon(msg.status)}</span>`;
		}
		html += `</div>`;

		// Reactions
		if (msg.reactions && msg.reactions.length) {
			html += `<div class="fv-cb-reactions">`;
			msg.reactions.forEach(r => {
				html += `<button class="fv-cb-reaction" data-emoji="${r.emoji}">${r.emoji} <span class="fv-cb-reaction-count">${r.count || 1}</span></button>`;
			});
			html += `</div>`;
		}

		// Action buttons (hover)
		html += `<div class="fv-cb-actions">`;
		if (this.o.onReply) html += `<button class="fv-cb-act" data-act="reply" title="${__('Reply')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg></button>`;
		if (this.o.onReact) html += `<button class="fv-cb-act" data-act="react" title="${__('React')}">😊</button>`;
		if (msg.status === 'error' && this.o.onRetry) html += `<button class="fv-cb-act" data-act="retry" title="${__('Retry')}">↻</button>`;
		html += `</div>`;

		html += `</div>`; // close main

		wrap.innerHTML = html;

		// Events
		wrap.querySelectorAll('.fv-cb-act').forEach(btn => {
			btn.onclick = () => {
				const act = btn.dataset.act;
				if (act === 'reply' && this.o.onReply) this.o.onReply(msg.id);
				if (act === 'react' && this.o.onReact) this.o.onReact(msg.id, '👍');
				if (act === 'retry' && this.o.onRetry) this.o.onRetry(msg.id);
			};
		});

		wrap.querySelectorAll('.fv-cb-reaction').forEach(btn => {
			btn.onclick = () => {
				if (this.o.onReact) this.o.onReact(msg.id, btn.dataset.emoji);
			};
		});

		return wrap;
	}

	_scrollBottom() {
		requestAnimationFrame(() => {
			this.el.scrollTop = this.el.scrollHeight;
		});
	}

	static _formatTime(ts) {
		try {
			const d = new Date(ts);
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch { return ''; }
	}

	static _statusIcon(status) {
		const icons = {
			sending: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
			sent:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
			delivered: '<svg width="14" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 6 7 17 2 12"/><polyline points="22 6 11 17"/></svg>',
			read:    '<svg width="14" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="18 6 7 17 2 12"/><polyline points="22 6 11 17"/></svg>',
			error:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
		};
		return icons[status] || '';
	}

	static _initials(name) {
		if (!name) return '?';
		return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
