/**
 * FilterBar — Visual filter chips with quick-add, presets, and search
 *
 * frappe.visual.FilterBar.create({
 *   container: el,
 *   fields: [
 *     { key: "status", label: "Status", type: "select", options: ["Draft","Active","Closed"] },
 *     { key: "date", label: "Date", type: "date" },
 *     { key: "amount", label: "Amount", type: "number" },
 *     { key: "name", label: "Name", type: "text" },
 *   ],
 *   presets: [
 *     { label: "Active Today", filters: { status: "Active", date: "today" } },
 *   ],
 *   onChange: (filters) => {},
 *   showSearch: true,
 *   showPresets: true,
 *   theme: "glass",
 * })
 */
export class FilterBar {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			fields: [],
			presets: [],
			onChange: null,
			showSearch: true,
			showPresets: true,
			theme: "glass",
			className: "",
			placeholder: "Search...",
		}, opts);

		const el = document.createElement("div");
		el.className = `fv-filter-bar fv-filter-bar--${o.theme} ${o.className}`.trim();

		const activeFilters = new Map(); // key → { value, operator }
		let searchTerm = "";

		function render() {
			el.innerHTML = "";

			// Search box
			if (o.showSearch) {
				const searchWrap = document.createElement("div");
				searchWrap.className = "fv-filter-bar__search";
				const searchIcon = document.createElement("span");
				searchIcon.className = "fv-filter-bar__search-icon";
				searchIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;
				const searchInput = document.createElement("input");
				searchInput.type = "text";
				searchInput.className = "fv-filter-bar__search-input";
				searchInput.placeholder = o.placeholder;
				searchInput.value = searchTerm;
				searchInput.addEventListener("input", e => {
					searchTerm = e.target.value;
					fireChange();
				});
				searchWrap.appendChild(searchIcon);
				searchWrap.appendChild(searchInput);
				el.appendChild(searchWrap);
			}

			// Active filter chips
			const chipsWrap = document.createElement("div");
			chipsWrap.className = "fv-filter-bar__chips";

			activeFilters.forEach((filter, key) => {
				const field = o.fields.find(f => f.key === key);
				const chip = document.createElement("span");
				chip.className = "fv-filter-bar__chip";
				chip.innerHTML = `
					<span class="fv-filter-bar__chip-label">${FilterBar._esc(field?.label || key)}</span>
					<span class="fv-filter-bar__chip-op">${FilterBar._esc(filter.operator || "=")}</span>
					<span class="fv-filter-bar__chip-value">${FilterBar._esc(String(filter.value))}</span>
					<button class="fv-filter-bar__chip-remove" type="button" aria-label="Remove filter">&times;</button>
				`;
				chip.querySelector(".fv-filter-bar__chip-remove").addEventListener("click", () => {
					activeFilters.delete(key);
					render();
					fireChange();
				});
				chipsWrap.appendChild(chip);
			});
			el.appendChild(chipsWrap);

			// Add filter dropdown
			const addBtn = document.createElement("button");
			addBtn.type = "button";
			addBtn.className = "fv-filter-bar__add-btn";
			addBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> <span>Filter</span>`;
			addBtn.addEventListener("click", () => showFieldPicker(addBtn));
			el.appendChild(addBtn);

			// Presets
			if (o.showPresets && o.presets.length > 0) {
				const presetsWrap = document.createElement("div");
				presetsWrap.className = "fv-filter-bar__presets";
				o.presets.forEach(preset => {
					const btn = document.createElement("button");
					btn.type = "button";
					btn.className = "fv-filter-bar__preset-btn";
					btn.textContent = preset.label;
					btn.addEventListener("click", () => {
						activeFilters.clear();
						Object.entries(preset.filters).forEach(([k, v]) => {
							activeFilters.set(k, { value: v, operator: "=" });
						});
						render();
						fireChange();
					});
					presetsWrap.appendChild(btn);
				});
				el.appendChild(presetsWrap);
			}

			// Clear all
			if (activeFilters.size > 0) {
				const clearBtn = document.createElement("button");
				clearBtn.type = "button";
				clearBtn.className = "fv-filter-bar__clear-btn";
				clearBtn.textContent = "Clear All";
				clearBtn.addEventListener("click", () => {
					activeFilters.clear();
					searchTerm = "";
					render();
					fireChange();
				});
				el.appendChild(clearBtn);
			}
		}

		function showFieldPicker(anchor) {
			// Remove existing picker
			const existing = el.querySelector(".fv-filter-bar__picker");
			if (existing) { existing.remove(); return; }

			const picker = document.createElement("div");
			picker.className = "fv-filter-bar__picker";

			o.fields.forEach(field => {
				if (activeFilters.has(field.key)) return; // already active
				const item = document.createElement("button");
				item.type = "button";
				item.className = "fv-filter-bar__picker-item";
				item.textContent = field.label || field.key;
				item.addEventListener("click", () => {
					picker.remove();
					showValueInput(field);
				});
				picker.appendChild(item);
			});

			if (picker.children.length === 0) {
				const empty = document.createElement("div");
				empty.className = "fv-filter-bar__picker-empty";
				empty.textContent = "All filters applied";
				picker.appendChild(empty);
			}

			el.appendChild(picker);

			// Close on outside click
			const closeHandler = (e) => {
				if (!picker.contains(e.target) && e.target !== anchor) {
					picker.remove();
					document.removeEventListener("click", closeHandler);
				}
			};
			setTimeout(() => document.addEventListener("click", closeHandler), 0);
		}

		function showValueInput(field) {
			const modal = document.createElement("div");
			modal.className = "fv-filter-bar__value-modal";

			const label = document.createElement("div");
			label.className = "fv-filter-bar__value-label";
			label.textContent = field.label || field.key;
			modal.appendChild(label);

			let input;
			if (field.type === "select" && field.options) {
				input = document.createElement("select");
				input.className = "fv-filter-bar__value-input";
				field.options.forEach(opt => {
					const option = document.createElement("option");
					option.value = typeof opt === "object" ? opt.value : opt;
					option.textContent = typeof opt === "object" ? opt.label : opt;
					input.appendChild(option);
				});
			} else {
				input = document.createElement("input");
				input.type = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
				input.className = "fv-filter-bar__value-input";
				input.placeholder = `Enter ${field.label || field.key}...`;
			}
			modal.appendChild(input);

			const actions = document.createElement("div");
			actions.className = "fv-filter-bar__value-actions";

			const applyBtn = document.createElement("button");
			applyBtn.type = "button";
			applyBtn.className = "fv-filter-bar__value-apply";
			applyBtn.textContent = "Apply";
			applyBtn.addEventListener("click", () => {
				const val = input.value;
				if (val !== "" && val !== undefined) {
					activeFilters.set(field.key, { value: val, operator: "=" });
				}
				modal.remove();
				render();
				fireChange();
			});

			const cancelBtn = document.createElement("button");
			cancelBtn.type = "button";
			cancelBtn.className = "fv-filter-bar__value-cancel";
			cancelBtn.textContent = "Cancel";
			cancelBtn.addEventListener("click", () => modal.remove());

			actions.appendChild(applyBtn);
			actions.appendChild(cancelBtn);
			modal.appendChild(actions);

			el.appendChild(modal);
			requestAnimationFrame(() => input.focus());

			input.addEventListener("keydown", e => {
				if (e.key === "Enter") applyBtn.click();
				if (e.key === "Escape") cancelBtn.click();
			});
		}

		function fireChange() {
			if (!o.onChange) return;
			const filters = {};
			activeFilters.forEach((v, k) => { filters[k] = v; });
			o.onChange({ filters, searchTerm });
		}

		if (o.container) o.container.appendChild(el);
		render();

		return {
			el,
			getFilters() {
				const f = {};
				activeFilters.forEach((v, k) => { f[k] = v; });
				return { filters: f, searchTerm };
			},
			setFilter(key, value, operator = "=") {
				activeFilters.set(key, { value, operator });
				render();
				fireChange();
			},
			removeFilter(key) {
				activeFilters.delete(key);
				render();
				fireChange();
			},
			clearAll() {
				activeFilters.clear();
				searchTerm = "";
				render();
				fireChange();
			},
			setSearch(term) {
				searchTerm = term;
				render();
				fireChange();
			},
			refresh: render,
			destroy() { el.remove(); },
		};
	}
}
