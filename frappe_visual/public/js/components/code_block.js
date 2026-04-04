/**
 * FrappeVisual CodeBlock — Syntax display with copy + line numbers
 * ==================================================================
 * frappe.visual.CodeBlock.create({ container, code, language, ... })
 */
export class CodeBlock {
	static create(opts = {}) { return new CodeBlock(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			code: '',
			language: 'javascript',
			showLineNumbers: true,
			showCopy: true,
			showLanguage: true,
			maxHeight: null,
			highlight: [],           // line numbers to highlight
			startLine: 1,
			wrapLines: false,
			theme: 'default',        // default | dark
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		const lines = o.code.split('\n');
		this.el.className = `fv-code fv-code-${o.theme}${o.wrapLines ? ' fv-code-wrap' : ''}`;

		let header = '';
		if (o.showLanguage || o.showCopy) {
			header = `<div class="fv-code-header">
				${o.showLanguage ? `<span class="fv-code-lang">${CodeBlock._esc(o.language)}</span>` : ''}
				${o.showCopy ? '<button class="fv-code-copy" title="Copy">&#x2398;</button>' : ''}
			</div>`;
		}

		const lineNums = o.showLineNumbers
			? `<div class="fv-code-gutter">${lines.map((_, i) => `<span>${i + o.startLine}</span>`).join('\n')}</div>`
			: '';

		const codeLines = lines.map((line, i) => {
			const lineNum = i + o.startLine;
			const hl = o.highlight.includes(lineNum) ? ' fv-code-hl' : '';
			return `<span class="fv-code-line${hl}">${CodeBlock._esc(line) || ' '}</span>`;
		}).join('\n');

		const body = `<div class="fv-code-body"${o.maxHeight ? ` style="max-height:${o.maxHeight}px;overflow:auto"` : ''}>
			<div class="fv-code-content">${lineNums}<pre class="fv-code-pre"><code>${codeLines}</code></pre></div>
		</div>`;

		this.el.innerHTML = header + body;

		// Copy handler
		const copyBtn = this.el.querySelector('.fv-code-copy');
		if (copyBtn) {
			copyBtn.onclick = async () => {
				try { await navigator.clipboard.writeText(o.code); }
				catch { /* fallback */ const ta = document.createElement('textarea'); ta.value = o.code; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
				copyBtn.textContent = '✓';
				copyBtn.classList.add('fv-code-copied');
				setTimeout(() => { copyBtn.textContent = '⎘'; copyBtn.classList.remove('fv-code-copied'); }, 2000);
			};
		}
	}

	setCode(code, language) {
		this.o.code = code;
		if (language) this.o.language = language;
		this._render();
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
