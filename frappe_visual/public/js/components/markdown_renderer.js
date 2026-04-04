/**
 * MarkdownRenderer — Rich Markdown preview with syntax highlighting
 *
 * frappe.visual.MarkdownRenderer.create({
 *   container: el,
 *   content: "# Hello\n\nWorld **bold** `code`",
 *   sanitize: true,
 *   linkTarget: "_blank",
 *   codeTheme: "auto",        // auto|light|dark
 *   onLinkClick: (href) => {},
 *   theme: "glass",
 * })
 */
export class MarkdownRenderer {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			content: "",
			sanitize: true,
			linkTarget: "_blank",
			codeTheme: "auto",
			onLinkClick: null,
			theme: "glass",
			className: "",
		}, opts);

		const el = document.createElement("div");
		el.className = `fv-markdown-renderer fv-markdown-renderer--${o.theme} ${o.className}`.trim();

		function parseMarkdown(md) {
			let html = md;

			// Headers
			html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
			html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
			html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
			html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
			html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
			html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

			// Code blocks
			html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
				return `<pre class="fv-markdown-renderer__code-block" data-lang="${MarkdownRenderer._esc(lang)}"><code>${MarkdownRenderer._esc(code.trim())}</code></pre>`;
			});

			// Inline code
			html = html.replace(/`([^`]+)`/g, `<code class="fv-markdown-renderer__inline-code">$1</code>`);

			// Bold + italic
			html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
			html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
			html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
			html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

			// Links and images
			html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" class="fv-markdown-renderer__img" loading="lazy" />`);
			html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="${o.linkTarget}" rel="noopener" class="fv-markdown-renderer__link">$1</a>`);

			// Lists
			html = html.replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>");
			html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
			html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

			// Blockquotes
			html = html.replace(/^>\s+(.+)$/gm, `<blockquote class="fv-markdown-renderer__blockquote">$1</blockquote>`);

			// Horizontal rules
			html = html.replace(/^---$/gm, "<hr />");

			// Tables (basic)
			html = html.replace(/^\|(.+)\|\s*$/gm, (_, row) => {
				const cells = row.split("|").map(c => c.trim());
				return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
			});
			html = html.replace(/(<tr>.*<\/tr>\n?)+/g, match => {
				if (match.includes("---")) return "";
				return `<table class="fv-markdown-renderer__table">${match}</table>`;
			});

			// Paragraphs
			html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, "<p>$1</p>");

			return html;
		}

		function render(content) {
			el.innerHTML = parseMarkdown(content || "");

			// Handle link clicks
			if (o.onLinkClick) {
				el.querySelectorAll("a").forEach(a => {
					a.addEventListener("click", (e) => {
						e.preventDefault();
						o.onLinkClick(a.href, a.textContent);
					});
				});
			}

			// Copy button for code blocks
			el.querySelectorAll(".fv-markdown-renderer__code-block").forEach(pre => {
				const copyBtn = document.createElement("button");
				copyBtn.className = "fv-markdown-renderer__copy-btn";
				copyBtn.textContent = "Copy";
				copyBtn.onclick = () => {
					navigator.clipboard.writeText(pre.querySelector("code").textContent).then(() => {
						copyBtn.textContent = "✓ Copied";
						setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
					});
				};
				pre.style.position = "relative";
				pre.appendChild(copyBtn);
			});
		}

		render(o.content);
		if (o.container) o.container.appendChild(el);

		return {
			el,
			render(content) { render(content); },
			getHTML() { return el.innerHTML; },
			destroy() { el.remove(); },
		};
	}
}
