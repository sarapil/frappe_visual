/**
 * ProgressModal — Full-screen progress overlay for long operations
 *
 * const pm = frappe.visual.ProgressModal.create({
 *   title: "Importing Records",
 *   steps: ["Validating", "Processing", "Saving", "Done"],
 *   showPercentage: true,
 *   cancellable: true,
 *   onCancel: () => abortImport(),
 * })
 *
 * pm.setProgress(35, "Processing row 35 of 100...")
 * pm.nextStep()
 * pm.complete("Successfully imported 100 records!")
 * pm.error("Failed at row 42")
 */
export class ProgressModal {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			title: "Processing...",
			subtitle: "",
			steps: [],
			showPercentage: true,
			cancellable: false,
			onCancel: null,
			showLog: false,
		}, opts);

		let currentStep = 0;
		let percent = 0;
		const logs = [];

		const overlay = document.createElement("div");
		overlay.className = "fv-progress-modal";
		overlay.innerHTML = `
			<div class="fv-progress-modal__card">
				<div class="fv-progress-modal__header">
					<h3 class="fv-progress-modal__title">${ProgressModal._esc(o.title)}</h3>
					${o.subtitle ? `<p class="fv-progress-modal__subtitle">${ProgressModal._esc(o.subtitle)}</p>` : ""}
				</div>
				${o.steps.length ? `<div class="fv-progress-modal__steps"></div>` : ""}
				<div class="fv-progress-modal__bar-wrap">
					<div class="fv-progress-modal__bar"></div>
				</div>
				<div class="fv-progress-modal__info">
					${o.showPercentage ? `<span class="fv-progress-modal__percent">0%</span>` : ""}
					<span class="fv-progress-modal__detail"></span>
				</div>
				${o.showLog ? `<div class="fv-progress-modal__log"></div>` : ""}
				<div class="fv-progress-modal__footer">
					${o.cancellable ? `<button class="fv-progress-modal__cancel">Cancel</button>` : ""}
				</div>
			</div>
		`;

		const bar = overlay.querySelector(".fv-progress-modal__bar");
		const pctEl = overlay.querySelector(".fv-progress-modal__percent");
		const detailEl = overlay.querySelector(".fv-progress-modal__detail");
		const stepsEl = overlay.querySelector(".fv-progress-modal__steps");
		const logEl = overlay.querySelector(".fv-progress-modal__log");
		const cancelBtn = overlay.querySelector(".fv-progress-modal__cancel");

		if (cancelBtn) cancelBtn.onclick = () => { if (o.onCancel) o.onCancel(); dismiss(); };

		function renderSteps() {
			if (!stepsEl || !o.steps.length) return;
			stepsEl.innerHTML = o.steps.map((s, i) => {
				let cls = "fv-progress-modal__step";
				if (i < currentStep) cls += " fv-progress-modal__step--done";
				else if (i === currentStep) cls += " fv-progress-modal__step--active";
				return `<div class="${cls}"><span class="fv-progress-modal__step-dot"></span><span>${ProgressModal._esc(s)}</span></div>`;
			}).join("");
		}

		function setProgress(pct, detail) {
			percent = Math.max(0, Math.min(100, pct));
			bar.style.width = percent + "%";
			if (pctEl) pctEl.textContent = Math.round(percent) + "%";
			if (detail && detailEl) detailEl.textContent = detail;
		}

		function nextStep(detail) {
			if (currentStep < o.steps.length - 1) currentStep++;
			renderSteps();
			if (detail && detailEl) detailEl.textContent = detail;
		}

		function addLog(msg) {
			logs.push(msg);
			if (logEl) {
				const line = document.createElement("div");
				line.className = "fv-progress-modal__log-line";
				line.textContent = msg;
				logEl.appendChild(line);
				logEl.scrollTop = logEl.scrollHeight;
			}
		}

		function complete(msg) {
			setProgress(100, msg || "Complete!");
			currentStep = o.steps.length - 1;
			renderSteps();
			overlay.classList.add("fv-progress-modal--complete");
			if (cancelBtn) cancelBtn.textContent = "Close";
			if (cancelBtn) cancelBtn.onclick = dismiss;
			if (!cancelBtn) setTimeout(dismiss, 2000);
		}

		function error(msg) {
			overlay.classList.add("fv-progress-modal--error");
			if (detailEl) detailEl.textContent = msg || "An error occurred";
			if (cancelBtn) { cancelBtn.textContent = "Close"; cancelBtn.onclick = dismiss; }
		}

		function dismiss() {
			overlay.classList.add("fv-progress-modal--exit");
			setTimeout(() => overlay.remove(), 300);
		}

		renderSteps();
		document.body.appendChild(overlay);
		requestAnimationFrame(() => overlay.classList.add("fv-progress-modal--visible"));

		return { el: overlay, setProgress, nextStep, complete, error, addLog, dismiss };
	}
}
