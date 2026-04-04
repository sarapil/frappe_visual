/**
 * ImageCropper — Interactive image crop with aspect ratio lock
 *
 * frappe.visual.ImageCropper.create({
 *   container: el,
 *   src: "/path/to/image.jpg",
 *   aspectRatio: 1,              // 1=square, 16/9, 4/3, 0=free
 *   minWidth: 100, minHeight: 100,
 *   outputType: "blob",          // blob|base64|canvas
 *   outputFormat: "image/jpeg",
 *   quality: 0.9,
 *   guides: true,
 *   onCrop: (result) => {},
 *   onCancel: () => {},
 * })
 */
export class ImageCropper {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static ASPECT_PRESETS = [
		{ label: "Free", value: 0 },
		{ label: "1:1", value: 1 },
		{ label: "4:3", value: 4 / 3 },
		{ label: "16:9", value: 16 / 9 },
		{ label: "3:2", value: 3 / 2 },
	];

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			src: "",
			aspectRatio: 0,
			minWidth: 50,
			minHeight: 50,
			outputType: "blob",
			outputFormat: "image/jpeg",
			quality: 0.9,
			guides: true,
			onCrop: null,
			onCancel: null,
		}, opts);

		const el = document.createElement("div");
		el.className = "fv-image-cropper";

		el.innerHTML = `
			<div class="fv-image-cropper__workspace">
				<img class="fv-image-cropper__img" crossorigin="anonymous" />
				<div class="fv-image-cropper__overlay"></div>
				<div class="fv-image-cropper__crop-box">
					${o.guides ? `
						<div class="fv-image-cropper__guide fv-image-cropper__guide--h1"></div>
						<div class="fv-image-cropper__guide fv-image-cropper__guide--h2"></div>
						<div class="fv-image-cropper__guide fv-image-cropper__guide--v1"></div>
						<div class="fv-image-cropper__guide fv-image-cropper__guide--v2"></div>
					` : ""}
					<div class="fv-image-cropper__handle fv-image-cropper__handle--nw" data-dir="nw"></div>
					<div class="fv-image-cropper__handle fv-image-cropper__handle--ne" data-dir="ne"></div>
					<div class="fv-image-cropper__handle fv-image-cropper__handle--sw" data-dir="sw"></div>
					<div class="fv-image-cropper__handle fv-image-cropper__handle--se" data-dir="se"></div>
				</div>
			</div>
			<div class="fv-image-cropper__toolbar">
				<div class="fv-image-cropper__presets"></div>
				<div class="fv-image-cropper__actions">
					<button class="fv-image-cropper__btn" data-action="cancel">${ImageCropper._esc("Cancel")}</button>
					<button class="fv-image-cropper__btn fv-image-cropper__btn--primary" data-action="crop">${ImageCropper._esc("Crop")}</button>
				</div>
			</div>
		`;

		const img = el.querySelector(".fv-image-cropper__img");
		const cropBox = el.querySelector(".fv-image-cropper__crop-box");
		const workspace = el.querySelector(".fv-image-cropper__workspace");
		const presetsWrap = el.querySelector(".fv-image-cropper__presets");

		let aspectRatio = o.aspectRatio;
		let crop = { x: 50, y: 50, w: 200, h: 200 };
		let dragging = null;
		let dragStart = {};

		// Presets
		ImageCropper.ASPECT_PRESETS.forEach(p => {
			const btn = document.createElement("button");
			btn.className = "fv-image-cropper__preset-btn";
			if (p.value === aspectRatio) btn.classList.add("fv-image-cropper__preset-btn--active");
			btn.textContent = p.label;
			btn.onclick = () => {
				aspectRatio = p.value;
				presetsWrap.querySelectorAll(".fv-image-cropper__preset-btn--active").forEach(b => b.classList.remove("fv-image-cropper__preset-btn--active"));
				btn.classList.add("fv-image-cropper__preset-btn--active");
				if (aspectRatio > 0) { crop.h = crop.w / aspectRatio; updateCropBox(); }
			};
			presetsWrap.appendChild(btn);
		});

		function updateCropBox() {
			cropBox.style.left = crop.x + "px";
			cropBox.style.top = crop.y + "px";
			cropBox.style.width = crop.w + "px";
			cropBox.style.height = crop.h + "px";
		}

		img.onload = () => {
			const ww = workspace.clientWidth;
			const wh = workspace.clientHeight;
			const s = Math.min(ww / img.naturalWidth, wh / img.naturalHeight, 1);
			img.style.width = (img.naturalWidth * s) + "px";
			img.style.height = (img.naturalHeight * s) + "px";
			crop.w = Math.min(200, img.naturalWidth * s * 0.6);
			crop.h = aspectRatio > 0 ? crop.w / aspectRatio : crop.w;
			crop.x = (img.naturalWidth * s - crop.w) / 2;
			crop.y = (img.naturalHeight * s - crop.h) / 2;
			updateCropBox();
		};
		img.src = o.src;

		// Drag handlers
		function onMouseDown(e) {
			const handle = e.target.closest("[data-dir]");
			if (handle) {
				dragging = handle.dataset.dir;
			} else if (e.target === cropBox || e.target.closest(".fv-image-cropper__crop-box")) {
				dragging = "move";
			}
			if (dragging) {
				dragStart = { x: e.clientX, y: e.clientY, ...crop };
				e.preventDefault();
			}
		}

		function onMouseMove(e) {
			if (!dragging) return;
			const dx = e.clientX - dragStart.x;
			const dy = e.clientY - dragStart.y;
			if (dragging === "move") {
				crop.x = dragStart.x + dx - (dragStart.x - dragStart.x); // simplified
				crop.x = Math.max(0, dragStart.x + dx - dragStart.x + dragStart.x);
				crop.x = dragStart.x + dx;
				crop.y = dragStart.y + dy;
			} else if (dragging === "se") {
				crop.w = Math.max(o.minWidth, dragStart.w + dx);
				crop.h = aspectRatio > 0 ? crop.w / aspectRatio : Math.max(o.minHeight, dragStart.h + dy);
			} else if (dragging === "nw") {
				const nw = Math.max(o.minWidth, dragStart.w - dx);
				crop.x = dragStart.x + (dragStart.w - nw);
				crop.w = nw;
				if (aspectRatio > 0) { crop.h = crop.w / aspectRatio; crop.y = dragStart.y + dragStart.h - crop.h; }
				else { const nh = Math.max(o.minHeight, dragStart.h - dy); crop.y = dragStart.y + (dragStart.h - nh); crop.h = nh; }
			}
			updateCropBox();
		}

		function onMouseUp() { dragging = null; }

		workspace.addEventListener("mousedown", onMouseDown);
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);

		// Actions
		el.querySelector("[data-action='cancel']").onclick = () => { if (o.onCancel) o.onCancel(); destroy(); };
		el.querySelector("[data-action='crop']").onclick = () => {
			const canvas = document.createElement("canvas");
			const scale = img.naturalWidth / img.clientWidth;
			canvas.width = crop.w * scale;
			canvas.height = crop.h * scale;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(img, crop.x * scale, crop.y * scale, crop.w * scale, crop.h * scale, 0, 0, canvas.width, canvas.height);

			if (o.outputType === "canvas") { if (o.onCrop) o.onCrop(canvas); }
			else if (o.outputType === "base64") { if (o.onCrop) o.onCrop(canvas.toDataURL(o.outputFormat, o.quality)); }
			else { canvas.toBlob(blob => { if (o.onCrop) o.onCrop(blob); }, o.outputFormat, o.quality); }
		};

		function destroy() {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			el.remove();
		}

		if (o.container) o.container.appendChild(el);

		return { el, destroy, getCropData() { return { ...crop }; } };
	}
}
