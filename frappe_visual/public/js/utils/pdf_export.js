/**
 * Frappe Visual — Dashboard PDF Export Engine
 * =============================================
 * Exports visual dashboards, charts, and components to PDF/PNG/SVG.
 * Uses html2canvas + jsPDF (lazy-loaded) for high-fidelity output.
 *
 * @module utils/pdf_export
 * @since v0.2.0
 *
 * Usage:
 *   await frappe.visual.exportPDF(container, { filename: "report.pdf" })
 *   await frappe.visual.exportPNG(chart, { scale: 2 })
 *   await frappe.visual.exportSVG(graph)
 */
(function () {
	"use strict";

	// ── Export Format Presets ───────────────────────────────────
	const FORMATS = {
		a4: { width: 210, height: 297, unit: "mm" },
		a3: { width: 297, height: 420, unit: "mm" },
		letter: { width: 215.9, height: 279.4, unit: "mm" },
		landscape_a4: { width: 297, height: 210, unit: "mm" },
		slide: { width: 1920, height: 1080, unit: "px" },
	};

	const QUALITY_PRESETS = {
		draft: { scale: 1, quality: 0.7 },
		standard: { scale: 2, quality: 0.85 },
		high: { scale: 3, quality: 0.95 },
		print: { scale: 4, quality: 1 },
	};

	// ── Library Loader (lazy) ──────────────────────────────────
	let _html2canvas = null;
	let _jsPDF = null;

	async function _loadHtml2Canvas() {
		if (_html2canvas) return _html2canvas;
		if (window.html2canvas) { _html2canvas = window.html2canvas; return _html2canvas; }

		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
			script.onload = () => { _html2canvas = window.html2canvas; resolve(_html2canvas); };
			script.onerror = () => reject(new Error("Failed to load html2canvas"));
			document.head.appendChild(script);
		});
	}

	async function _loadJsPDF() {
		if (_jsPDF) return _jsPDF;
		if (window.jspdf?.jsPDF) { _jsPDF = window.jspdf.jsPDF; return _jsPDF; }

		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js";
			script.onload = () => { _jsPDF = window.jspdf.jsPDF; resolve(_jsPDF); };
			script.onerror = () => reject(new Error("Failed to load jsPDF"));
			document.head.appendChild(script);
		});
	}

	// ── Core: Capture Element to Canvas ────────────────────────

	async function _captureCanvas(element, options = {}) {
		const html2canvas = await _loadHtml2Canvas();

		const {
			scale = 2,
			backgroundColor = "#ffffff",
			ignoreElements = null,
			logging = false,
			useCORS = true,
			allowTaint = false,
			onClone = null,
		} = options;

		const canvas = await html2canvas(element, {
			scale,
			backgroundColor,
			ignoreElements: ignoreElements || ((el) => el.classList?.contains("fv-no-export")),
			logging,
			useCORS,
			allowTaint,
			onclone: (doc) => {
				// Remove interactive elements for clean export
				doc.querySelectorAll(".fv-toolbar, .fv-floating-window, .fv-context-menu, .fv-minimap").forEach((el) => {
					el.style.display = "none";
				});
				if (onClone) onClone(doc);
			},
		});

		return canvas;
	}

	// ── Export to PNG ──────────────────────────────────────────

	/**
	 * Export element as PNG image.
	 * @param {Element} element - DOM element to capture
	 * @param {Object} [options]
	 * @param {string} [options.filename="export.png"]
	 * @param {string} [options.quality="standard"] - draft|standard|high|print
	 * @param {number} [options.scale] - Override quality scale
	 * @param {string} [options.backgroundColor="#ffffff"]
	 * @returns {Promise<Blob>}
	 */
	async function exportPNG(element, options = {}) {
		const qualityPreset = QUALITY_PRESETS[options.quality || "standard"];
		const scale = options.scale || qualityPreset.scale;

		_showProgress(__("Capturing..."));

		const canvas = await _captureCanvas(element, {
			...options,
			scale,
		});

		return new Promise((resolve) => {
			canvas.toBlob((blob) => {
				const filename = options.filename || _generateFilename("png");
				_downloadBlob(blob, filename);
				_hideProgress();
				_emit("export:complete", { format: "png", filename, size: blob.size });
				resolve(blob);
			}, "image/png");
		});
	}

	// ── Export to PDF ──────────────────────────────────────────

	/**
	 * Export element as PDF document.
	 * @param {Element} element - DOM element to capture
	 * @param {Object} [options]
	 * @param {string} [options.filename="export.pdf"]
	 * @param {string} [options.format="a4"] - a4|a3|letter|landscape_a4|slide
	 * @param {string} [options.quality="standard"]
	 * @param {string} [options.title] - Document title metadata
	 * @param {boolean} [options.header=true] - Include header with title/date
	 * @param {boolean} [options.footer=true] - Include footer with page number
	 * @param {number} [options.margin=15] - Page margin in mm
	 * @returns {Promise<Blob>}
	 */
	async function exportPDF(element, options = {}) {
		const [, JsPDF] = await Promise.all([_loadHtml2Canvas(), _loadJsPDF()]);

		const qualityPreset = QUALITY_PRESETS[options.quality || "standard"];
		const format = FORMATS[options.format || "a4"];
		const margin = options.margin ?? 15;
		const showHeader = options.header !== false;
		const showFooter = options.footer !== false;

		_showProgress(__("Generating PDF..."));

		const canvas = await _captureCanvas(element, {
			scale: options.scale || qualityPreset.scale,
			backgroundColor: options.backgroundColor,
		});

		const imgData = canvas.toDataURL("image/png", qualityPreset.quality);

		const pdf = new JsPDF({
			orientation: format.width > format.height ? "landscape" : "portrait",
			unit: "mm",
			format: [format.width, format.height],
		});

		// Content area dimensions
		const contentWidth = format.width - (margin * 2);
		const headerHeight = showHeader ? 12 : 0;
		const footerHeight = showFooter ? 8 : 0;
		const contentHeight = format.height - (margin * 2) - headerHeight - footerHeight;

		// Scale image to fit content area
		const imgRatio = canvas.width / canvas.height;
		let imgWidth = contentWidth;
		let imgHeight = contentWidth / imgRatio;

		// Multi-page support if content is taller than one page
		const totalPages = Math.ceil(imgHeight / contentHeight);

		for (let page = 0; page < totalPages; page++) {
			if (page > 0) pdf.addPage();

			// Header
			if (showHeader) {
				pdf.setFontSize(10);
				pdf.setTextColor(100);
				const title = options.title || __("Frappe Visual Export");
				pdf.text(title, margin, margin + 4);
				const dateStr = frappe.datetime?.nowdate?.() || new Date().toISOString().slice(0, 10);
				pdf.text(dateStr, format.width - margin, margin + 4, { align: "right" });
				pdf.setDrawColor(200);
				pdf.line(margin, margin + 7, format.width - margin, margin + 7);
			}

			// Image section for this page
			const yOffset = -(page * contentHeight);
			pdf.addImage(
				imgData, "PNG",
				margin, margin + headerHeight + yOffset,
				imgWidth, imgHeight
			);

			// Footer
			if (showFooter) {
				pdf.setFontSize(8);
				pdf.setTextColor(150);
				pdf.text(
					`${__("Page")} ${page + 1} / ${totalPages}`,
					format.width / 2,
					format.height - margin + 2,
					{ align: "center" }
				);
			}
		}

		// Metadata
		pdf.setProperties({
			title: options.title || "Frappe Visual Export",
			creator: "Frappe Visual",
			subject: "Dashboard Export",
		});

		const filename = options.filename || _generateFilename("pdf");
		pdf.save(filename);

		const blob = pdf.output("blob");
		_hideProgress();
		_emit("export:complete", { format: "pdf", filename, pages: totalPages, size: blob.size });
		return blob;
	}

	// ── Export to SVG ──────────────────────────────────────────

	/**
	 * Export SVG elements or serialize DOM to SVG.
	 * @param {Element} element - SVG element or container with SVG children
	 * @param {Object} [options]
	 * @param {string} [options.filename="export.svg"]
	 * @param {boolean} [options.inlineStyles=true] - Inline computed styles
	 * @returns {Promise<Blob>}
	 */
	async function exportSVG(element, options = {}) {
		_showProgress(__("Exporting SVG..."));

		let svgElement = element;
		if (element.tagName !== "svg") {
			svgElement = element.querySelector("svg");
		}

		if (!svgElement) {
			frappe.toast({ message: __("No SVG element found"), indicator: "red" });
			_hideProgress();
			return null;
		}

		// Clone and inline styles
		const clone = svgElement.cloneNode(true);

		if (options.inlineStyles !== false) {
			_inlineSVGStyles(clone);
		}

		// Ensure viewBox and dimensions
		if (!clone.getAttribute("viewBox")) {
			const bbox = svgElement.getBBox?.();
			if (bbox) {
				clone.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
			}
		}

		clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(clone);
		const blob = new Blob([svgString], { type: "image/svg+xml" });

		const filename = options.filename || _generateFilename("svg");
		_downloadBlob(blob, filename);
		_hideProgress();
		_emit("export:complete", { format: "svg", filename, size: blob.size });
		return blob;
	}

	/**
	 * Export to clipboard as PNG image data.
	 * @param {Element} element
	 * @param {Object} [options]
	 * @returns {Promise<boolean>}
	 */
	async function copyToClipboard(element, options = {}) {
		try {
			const canvas = await _captureCanvas(element, {
				scale: options.scale || 2,
			});

			const blob = await new Promise((resolve) =>
				canvas.toBlob(resolve, "image/png")
			);

			await navigator.clipboard.write([
				new ClipboardItem({ "image/png": blob }),
			]);

			frappe.toast({ message: __("Copied to clipboard"), indicator: "green" });
			_emit("export:clipboard", { size: blob.size });
			return true;
		} catch (err) {
			console.error("[FV Export] Clipboard copy failed:", err);
			frappe.toast({ message: __("Clipboard copy failed"), indicator: "red" });
			return false;
		}
	}

	// ── Helpers ────────────────────────────────────────────────

	function _generateFilename(ext) {
		const date = new Date().toISOString().slice(0, 10);
		return `frappe-visual-${date}.${ext}`;
	}

	function _downloadBlob(blob, filename) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	}

	function _inlineSVGStyles(svgEl) {
		const allElements = svgEl.querySelectorAll("*");
		const important = ["fill", "stroke", "stroke-width", "font-family", "font-size", "font-weight", "opacity", "transform"];

		allElements.forEach((el) => {
			const computed = window.getComputedStyle(el);
			important.forEach((prop) => {
				const val = computed.getPropertyValue(prop);
				if (val && val !== "none" && val !== "normal") {
					el.style[prop] = val;
				}
			});
		});
	}

	function _showProgress(message) {
		frappe.show_progress?.(
			__("Exporting"),
			0, 100,
			message || __("Preparing export..."),
			true
		);
	}

	function _hideProgress() {
		frappe.hide_progress?.();
	}

	function _emit(event, data) {
		if (frappe.visual.eventBus && typeof frappe.visual.eventBus.emit === "function") {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.exporter");

	Object.assign(frappe.visual.exporter, {
		FORMATS,
		QUALITY_PRESETS,

		png: exportPNG,
		pdf: exportPDF,
		svg: exportSVG,
		clipboard: copyToClipboard,

		/** Export with format auto-detection. */
		async export(element, format = "pdf", options = {}) {
			switch (format.toLowerCase()) {
				case "pdf": return exportPDF(element, options);
				case "png": return exportPNG(element, options);
				case "svg": return exportSVG(element, options);
				case "clipboard": return copyToClipboard(element, options);
				default:
					console.warn(`[FV Export] Unknown format: ${format}`);
					return null;
			}
		},
	});

	console.log(
		"%c⬡ FV Export%c ready — pdf() · png() · svg() · clipboard()",
		"color:#f59e0b;font-weight:bold",
		"color:#94a3b8"
	);
})();
