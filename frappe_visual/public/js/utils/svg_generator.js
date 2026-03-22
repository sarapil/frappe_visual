/**
 * SVGGenerator — Programmatic SVG Art for Frappe Visual
 * =======================================================
 * Creates beautiful, branded SVG illustrations for apps.
 * Used for: app headers, empty states, loading screens.
 */

export class SVGGenerator {
	/**
	 * Generate an app header SVG with connected nodes representing modules.
	 * @param {Object} opts
	 * @param {number} opts.width
	 * @param {number} opts.height
	 * @param {Array} opts.modules - [{name, color, icon}]
	 * @param {string} opts.title
	 */
	static appHeader(opts) {
		const { width = 800, height = 200, modules = [], title = "" } = opts;
		const ns = "http://www.w3.org/2000/svg";

		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		svg.setAttribute("class", "fv-app-header-svg");
		svg.style.width = "100%";
		svg.style.maxWidth = width + "px";

		// Background gradient
		const defs = document.createElementNS(ns, "defs");

		// Gradient
		const grad = document.createElementNS(ns, "linearGradient");
		grad.id = "fv-header-grad";
		grad.setAttribute("x1", "0%");
		grad.setAttribute("y1", "0%");
		grad.setAttribute("x2", "100%");
		grad.setAttribute("y2", "100%");

		const stop1 = document.createElementNS(ns, "stop");
		stop1.setAttribute("offset", "0%");
		stop1.setAttribute("stop-color", "var(--fv-accent, #6366f1)");
		stop1.setAttribute("stop-opacity", "0.05");

		const stop2 = document.createElementNS(ns, "stop");
		stop2.setAttribute("offset", "100%");
		stop2.setAttribute("stop-color", "var(--fv-accent, #6366f1)");
		stop2.setAttribute("stop-opacity", "0.02");

		grad.appendChild(stop1);
		grad.appendChild(stop2);
		defs.appendChild(grad);

		// Glow filter
		const filter = document.createElementNS(ns, "filter");
		filter.id = "fv-glow";
		filter.innerHTML = `
			<feGaussianBlur stdDeviation="3" result="coloredBlur"/>
			<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
		`;
		defs.appendChild(filter);
		svg.appendChild(defs);

		// Background rect
		const bgRect = document.createElementNS(ns, "rect");
		bgRect.setAttribute("width", width);
		bgRect.setAttribute("height", height);
		bgRect.setAttribute("fill", "url(#fv-header-grad)");
		bgRect.setAttribute("rx", "12");
		svg.appendChild(bgRect);

		// Draw connection lines between module positions
		const positions = SVGGenerator._distributeNodes(modules.length, width, height);

		// Edges first (behind nodes)
		for (let i = 0; i < positions.length; i++) {
			for (let j = i + 1; j < positions.length; j++) {
				if (Math.random() > 0.5) continue; // Random connections
				const line = document.createElementNS(ns, "line");
				line.setAttribute("x1", positions[i].x);
				line.setAttribute("y1", positions[i].y);
				line.setAttribute("x2", positions[j].x);
				line.setAttribute("y2", positions[j].y);
				line.setAttribute("stroke", "var(--fv-border-primary, #e2e8f0)");
				line.setAttribute("stroke-width", "1");
				line.setAttribute("stroke-dasharray", "4,4");
				line.setAttribute("opacity", "0.4");
				line.classList.add("fv-svg-edge");
				svg.appendChild(line);
			}
		}

		// Nodes
		modules.forEach((mod, i) => {
			if (!positions[i]) return;
			const g = document.createElementNS(ns, "g");
			g.setAttribute("transform", `translate(${positions[i].x}, ${positions[i].y})`);
			g.classList.add("fv-svg-node");

			const circle = document.createElementNS(ns, "circle");
			circle.setAttribute("r", "20");
			circle.setAttribute("fill", mod.color || "var(--fv-accent, #6366f1)");
			circle.setAttribute("opacity", "0.15");
			circle.setAttribute("filter", "url(#fv-glow)");

			const innerCircle = document.createElementNS(ns, "circle");
			innerCircle.setAttribute("r", "14");
			innerCircle.setAttribute("fill", mod.color || "var(--fv-accent, #6366f1)");
			innerCircle.setAttribute("opacity", "0.3");

			const text = document.createElementNS(ns, "text");
			text.setAttribute("text-anchor", "middle");
			text.setAttribute("dy", "5");
			text.setAttribute("font-size", "14");
			text.textContent = mod.icon || "📦";

			const label = document.createElementNS(ns, "text");
			label.setAttribute("text-anchor", "middle");
			label.setAttribute("dy", "35");
			label.setAttribute("font-size", "10");
			label.setAttribute("fill", "var(--fv-text-secondary, #64748b)");
			label.setAttribute("font-family", "Inter, sans-serif");
			label.textContent = mod.name;

			g.appendChild(circle);
			g.appendChild(innerCircle);
			g.appendChild(text);
			g.appendChild(label);
			svg.appendChild(g);
		});

		// Title
		if (title) {
			const titleText = document.createElementNS(ns, "text");
			titleText.setAttribute("x", width / 2);
			titleText.setAttribute("y", height - 20);
			titleText.setAttribute("text-anchor", "middle");
			titleText.setAttribute("font-size", "18");
			titleText.setAttribute("font-weight", "bold");
			titleText.setAttribute("fill", "var(--fv-text-primary, #1e293b)");
			titleText.setAttribute("font-family", "Inter, sans-serif");
			titleText.textContent = title;
			svg.appendChild(titleText);
		}

		return svg;
	}

	static _distributeNodes(count, width, height) {
		const positions = [];
		const padding = 60;
		const cols = Math.ceil(Math.sqrt(count * (width / height)));
		const rows = Math.ceil(count / cols);

		const cellW = (width - padding * 2) / cols;
		const cellH = (height - padding * 2) / rows;

		for (let i = 0; i < count; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			positions.push({
				x: padding + col * cellW + cellW / 2 + (Math.random() - 0.5) * 20,
				y: padding + row * cellH + cellH / 2 + (Math.random() - 0.5) * 15,
			});
		}

		return positions;
	}

	/**
	 * Generate an empty state SVG illustration.
	 */
	static emptyState(message = "No data to display") {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 300 200");
		svg.classList.add("fv-empty-state-svg");
		svg.style.width = "300px";
		svg.style.maxWidth = "100%";

		svg.innerHTML = `
			<defs>
				<linearGradient id="fv-empty-grad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="var(--fv-accent, #6366f1)" stop-opacity="0.1"/>
					<stop offset="100%" stop-color="var(--fv-accent, #6366f1)" stop-opacity="0.03"/>
				</linearGradient>
			</defs>
			<rect x="50" y="30" width="200" height="120" rx="16" fill="url(#fv-empty-grad)" stroke="var(--fv-border-primary, #e2e8f0)" stroke-width="1.5" stroke-dasharray="8,4"/>
			<circle cx="110" cy="75" r="12" fill="var(--fv-accent, #6366f1)" opacity="0.15"/>
			<circle cx="150" cy="90" r="16" fill="var(--fv-accent, #6366f1)" opacity="0.1"/>
			<circle cx="190" cy="70" r="10" fill="var(--fv-accent, #6366f1)" opacity="0.2"/>
			<line x1="110" y1="75" x2="150" y2="90" stroke="var(--fv-border-secondary, #cbd5e1)" stroke-width="1" stroke-dasharray="3,3"/>
			<line x1="150" y1="90" x2="190" y2="70" stroke="var(--fv-border-secondary, #cbd5e1)" stroke-width="1" stroke-dasharray="3,3"/>
			<text x="150" y="170" text-anchor="middle" font-size="13" fill="var(--fv-text-tertiary, #94a3b8)" font-family="Inter, sans-serif">${message}</text>
		`;

		return svg;
	}
}
