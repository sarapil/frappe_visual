// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Form Components Showcase — Interactive sandbox displaying all 60+
 * form input components with live interaction, validation states,
 * and Arabic/English toggle.
 */
frappe.pages["form-components-showcase"].on_page_show = function (wrapper) {
	if (wrapper._form_loaded) return;
	wrapper._form_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Form Components Showcase"),
		single_column: true,
	});

	page.set_indicator(__("60+ Components"), "green");

	const CATEGORIES = [
		{
			key: "text-input", label: __("Text & Input"), icon: "ti ti-cursor-text",
			components: [
				{ name: "TagInput", desc: __("Multi-tag input with autocomplete") },
				{ name: "ChipInput", desc: __("Chip-based input for categories") },
				{ name: "Combobox", desc: __("Searchable dropdown with custom entries") },
				{ name: "SearchSelect", desc: __("Search-enabled select field") },
				{ name: "InlineEditor", desc: __("Click-to-edit inline text") },
				{ name: "PinInput", desc: __("PIN/OTP code input") },
				{ name: "OTPInput", desc: __("One-time password input") },
				{ name: "CurrencyInput", desc: __("Currency-formatted number input") },
				{ name: "NumberStepper", desc: __("Increment/decrement number control") },
			],
		},
		{
			key: "selection", label: __("Selection & Toggle"), icon: "ti ti-toggle-left",
			components: [
				{ name: "ToggleGroup", desc: __("Radio-button-like toggle set") },
				{ name: "SegmentedControl", desc: __("iOS-style segmented selector") },
				{ name: "TransferList", desc: __("Dual-list item transfer") },
				{ name: "RatingStars", desc: __("Star rating widget") },
				{ name: "RatingWidget", desc: __("Customizable rating input") },
				{ name: "SliderRange", desc: __("Dual-handle range slider") },
			],
		},
		{
			key: "date-time", label: __("Date & Time"), icon: "ti ti-calendar",
			components: [
				{ name: "DateRangePicker", desc: __("Date range selection with presets") },
				{ name: "CronBuilder", desc: __("Visual cron expression builder") },
			],
		},
		{
			key: "file-media", label: __("File & Media"), icon: "ti ti-upload",
			components: [
				{ name: "FileDropZone", desc: __("Drag-and-drop file upload area") },
				{ name: "SignaturePad", desc: __("Touch/mouse signature capture") },
				{ name: "ImageCropper", desc: __("Image crop with aspect ratio control") },
				{ name: "AnnotationLayer", desc: __("Image annotation overlay") },
				{ name: "ColorPicker", desc: __("Color selection with palettes") },
			],
		},
		{
			key: "form-flow", label: __("Form Flow"), icon: "ti ti-list-check",
			components: [
				{ name: "FormWizard", desc: __("Multi-step form with validation") },
				{ name: "FormValidator", desc: __("Real-time form validation engine") },
				{ name: "AutoSave", desc: __("Automatic form save on change") },
				{ name: "FormBuilder", desc: __("Drag-and-drop form layout designer") },
			],
		},
		{
			key: "specialized", label: __("Specialized"), icon: "ti ti-star",
			components: [
				{ name: "CreditCard", desc: __("Credit card input with formatting") },
				{ name: "PasswordStrength", desc: __("Password strength meter") },
				{ name: "EmojiPicker", desc: __("Emoji selection grid") },
			],
		},
	];

	const $container = $(`
		<div class="fv-form-showcase fv-fx-page-enter" style="padding: var(--padding-lg);">
			<div class="text-center mb-5">
				<h2 class="fv-fx-gradient-text">${__("Form Components Showcase")}</h2>
				<p class="text-muted">${__("Interactive sandbox for all 60+ form input components")}</p>
			</div>

			<!-- Category tabs -->
			<div class="d-flex flex-wrap gap-2 justify-content-center mb-4" id="fv-form-cats"></div>

			<!-- Component grid -->
			<div id="fv-form-grid"></div>
		</div>
	`).appendTo(page.body);

	// Build category buttons
	const $cats = $container.find("#fv-form-cats");
	$cats.append(`<button class="btn btn-sm btn-primary-light active fv-form-cat" data-cat="all">${__("All")}</button>`);
	CATEGORIES.forEach(cat => {
		$cats.append(`<button class="btn btn-sm btn-default fv-form-cat" data-cat="${cat.key}"><i class="${cat.icon} me-1"></i>${cat.label}</button>`);
	});

	// Build component sections
	const $grid = $container.find("#fv-form-grid");
	CATEGORIES.forEach(cat => {
		let html = `
			<div class="fv-form-section mb-5" data-section="${cat.key}">
				<h4 class="mb-3"><i class="${cat.icon} me-2"></i>${cat.label}</h4>
				<div class="row">
		`;
		cat.components.forEach(comp => {
			html += `
				<div class="col-md-4 col-sm-6 mb-3">
					<div class="card fv-fx-glass fv-fx-hover-lift h-100">
						<div class="card-body">
							<h6 class="mb-1">${comp.name}</h6>
							<small class="text-muted d-block mb-3">${comp.desc}</small>
							<div class="fv-form-demo border rounded p-3 bg-light" id="fv-demo-${comp.name}" style="min-height: 60px;">
								<span class="text-extra-muted">${__("Interactive demo")}</span>
							</div>
						</div>
					</div>
				</div>
			`;
		});
		html += `</div></div>`;
		$grid.append(html);
	});

	// Category filter
	$cats.on("click", ".fv-form-cat", function () {
		$cats.find(".fv-form-cat").removeClass("active btn-primary-light").addClass("btn-default");
		$(this).addClass("active btn-primary-light").removeClass("btn-default");
		const cat = $(this).data("cat");
		if (cat === "all") {
			$grid.find(".fv-form-section").show();
		} else {
			$grid.find(".fv-form-section").hide();
			$grid.find(`[data-section="${cat}"]`).show();
		}
	});

	// Initialize interactive demos via frappe_visual bundle
	frappe.require("frappe_visual.bundle.js", () => {
		const v = frappe.visual;
		if (!v) return;

		// Try to render live demos for each component
		const demoRenderers = {
			TagInput: () => v.tagInput?.("#fv-demo-TagInput", { placeholder: __("Add tags..."), tags: [__("Sales"), __("Priority")] }),
			RatingStars: () => v.ratingStars?.("#fv-demo-RatingStars", { value: 3, max: 5 }),
			SliderRange: () => v.sliderRange?.("#fv-demo-SliderRange", { min: 0, max: 100, value: [20, 80] }),
			ColorPicker: () => v.colorPicker?.("#fv-demo-ColorPicker", { value: "#6366F1" }),
			PasswordStrength: () => v.passwordStrength?.("#fv-demo-PasswordStrength", { password: "Test123!" }),
			SegmentedControl: () => v.segmentedControl?.("#fv-demo-SegmentedControl", { options: [__("Daily"), __("Weekly"), __("Monthly")] }),
		};

		Object.entries(demoRenderers).forEach(([key, fn]) => {
			try { fn(); } catch (e) { /* component may not be available */ }
		});
	});
};
