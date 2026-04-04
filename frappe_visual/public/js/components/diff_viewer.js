// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual DiffViewer — Side-by-side or unified diff display
 * ================================================================
 * frappe.visual.DiffViewer.create({ container, oldText, newText, ... })
 */
export class DiffViewer {
	static create(opts = {}) { return new DiffViewer(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			oldText: '',
			newText: '',
			oldTitle: 'Original',
			newTitle: 'Modified',
			mode: 'unified',         // unified | split
			showLineNumbers: true,
			context: 3,              // lines of context around changes
			showHeader: true,
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-diff fv-diff-${o.mode}`;
		const diff = this._computeDiff(o.oldText.split('\n'), o.newText.split('\n'));

		let header = '';
		if (o.showHeader) {
			header = `<div class="fv-diff-header">
				<span class="fv-diff-title fv-diff-old-title">${DiffViewer._esc(o.oldTitle)}</span>
				<span class="fv-diff-title fv-diff-new-title">${DiffViewer._esc(o.newTitle)}</span>
			</div>`;
		}

		if (o.mode === 'split') {
			this.el.innerHTML = header + this._renderSplit(diff);
		} else {
			this.el.innerHTML = header + this._renderUnified(diff);
		}
	}

	_computeDiff(oldLines, newLines) {
		// Simple LCS-based diff
		const m = oldLines.length, n = newLines.length;
		const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				dp[i][j] = oldLines[i - 1] === newLines[j - 1]
					? dp[i - 1][j - 1] + 1
					: Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}

		const result = [];
		let i = m, j = n;
		while (i > 0 || j > 0) {
			if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
				result.unshift({ type: 'equal', old: oldLines[i - 1], new: newLines[j - 1], oldLine: i, newLine: j });
				i--; j--;
			} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
				result.unshift({ type: 'add', new: newLines[j - 1], newLine: j });
				j--;
			} else {
				result.unshift({ type: 'remove', old: oldLines[i - 1], oldLine: i });
				i--;
			}
		}
		return result;
	}

	_renderUnified(diff) {
		const rows = diff.map(d => {
			const cls = d.type === 'add' ? 'fv-diff-add' : d.type === 'remove' ? 'fv-diff-remove' : 'fv-diff-equal';
			const prefix = d.type === 'add' ? '+' : d.type === 'remove' ? '-' : ' ';
			const ln1 = d.oldLine || '';
			const ln2 = d.newLine || '';
			const text = d.type === 'remove' ? d.old : (d.new !== undefined ? d.new : d.old);
			return `<tr class="${cls}">
				${this.o.showLineNumbers ? `<td class="fv-diff-ln">${ln1}</td><td class="fv-diff-ln">${ln2}</td>` : ''}
				<td class="fv-diff-prefix">${prefix}</td>
				<td class="fv-diff-text"><pre>${DiffViewer._esc(text)}</pre></td>
			</tr>`;
		}).join('');
		return `<table class="fv-diff-table">${rows}</table>`;
	}

	_renderSplit(diff) {
		const rows = diff.map(d => {
			const lCls = d.type === 'remove' ? 'fv-diff-remove' : d.type === 'equal' ? '' : 'fv-diff-empty';
			const rCls = d.type === 'add' ? 'fv-diff-add' : d.type === 'equal' ? '' : 'fv-diff-empty';
			const lText = d.type !== 'add' ? DiffViewer._esc(d.old || '') : '';
			const rText = d.type !== 'remove' ? DiffViewer._esc(d.new || '') : '';
			const ln1 = d.oldLine || '';
			const ln2 = d.newLine || '';
			return `<tr>
				<td class="fv-diff-ln">${ln1}</td>
				<td class="fv-diff-text ${lCls}"><pre>${lText}</pre></td>
				<td class="fv-diff-ln">${ln2}</td>
				<td class="fv-diff-text ${rCls}"><pre>${rText}</pre></td>
			</tr>`;
		}).join('');
		return `<table class="fv-diff-table fv-diff-split-table">${rows}</table>`;
	}

	setTexts(oldText, newText) { this.o.oldText = oldText; this.o.newText = newText; this._render(); }
	setMode(mode) { this.o.mode = mode; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
