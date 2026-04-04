/**
 * FrappeVisual InlineEdit — Click-to-edit inline text
 * =====================================================
 * frappe.visual.InlineEdit.create({ container, value, ... })
 */
export class InlineEdit {
	static create(opts = {}) { return new InlineEdit(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			value: '',
			type: 'text',            // text | number | textarea | select
			options: [],              // for select: [{ value, label }]
			placeholder: 'Click to edit',
			emptyText: '—',
			formatter: null,          // fn(value) → display string
			validator: null,          // fn(value) → true | 'Error msg'
			onSave: null,             // fn(newValue, oldValue)
			onCancel: null,
			maxLength: null,
			editOnClick: true,
			showPencil: true,
			inputClass: '',
		}, opts);

		this.editing = false;
		this.el = document.createElement('span');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		this.el.className = 'fv-ie' + (this.editing ? ' fv-ie-editing' : '');
		if (this.editing) { this._renderEdit(); return; }

		const display = this.o.formatter
			? this.o.formatter(this.o.value)
			: (this.o.value ?? '');

		const text = String(display || this.o.emptyText);
		this.el.innerHTML = `<span class="fv-ie-display${!this.o.value ? ' fv-ie-empty' : ''}">${InlineEdit._esc(text)}</span>`;

		if (this.o.showPencil) {
			const pencil = document.createElement('span');
			pencil.className = 'fv-ie-pencil';
			pencil.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
			pencil.onclick = (e) => { e.stopPropagation(); this.startEdit(); };
			this.el.appendChild(pencil);
		}

		if (this.o.editOnClick) this.el.onclick = () => this.startEdit();
	}

	_renderEdit() {
		const o = this.o;
		this.el.innerHTML = '';

		let input;
		if (o.type === 'textarea') {
			input = document.createElement('textarea');
			input.rows = 3;
		} else if (o.type === 'select') {
			input = document.createElement('select');
			o.options.forEach(opt => {
				const option = document.createElement('option');
				option.value = typeof opt === 'object' ? opt.value : opt;
				option.textContent = typeof opt === 'object' ? opt.label : opt;
				input.appendChild(option);
			});
		} else {
			input = document.createElement('input');
			input.type = o.type;
		}

		input.className = 'fv-ie-input ' + o.inputClass;
		input.value = o.value ?? '';
		if (o.placeholder) input.placeholder = o.placeholder;
		if (o.maxLength) input.maxLength = o.maxLength;

		const errorEl = document.createElement('div');
		errorEl.className = 'fv-ie-error';

		const actions = document.createElement('span');
		actions.className = 'fv-ie-actions';
		actions.innerHTML = `<button class="fv-ie-save" title="Save">&#10003;</button><button class="fv-ie-cancel" title="Cancel">&#10005;</button>`;

		this.el.append(input, actions, errorEl);

		const save = () => {
			const val = input.value;
			if (o.validator) {
				const result = o.validator(val);
				if (result !== true) { errorEl.textContent = result || 'Invalid'; return; }
			}
			const old = o.value;
			o.value = val;
			this.editing = false;
			this._render();
			if (o.onSave) o.onSave(val, old);
		};

		const cancel = () => {
			this.editing = false;
			this._render();
			if (o.onCancel) o.onCancel();
		};

		actions.querySelector('.fv-ie-save').onclick = save;
		actions.querySelector('.fv-ie-cancel').onclick = cancel;

		input.onkeydown = (e) => {
			if (e.key === 'Enter' && o.type !== 'textarea') save();
			if (e.key === 'Escape') cancel();
		};

		requestAnimationFrame(() => { input.focus(); input.select && input.select(); });
	}

	startEdit() { this.editing = true; this._render(); }
	getValue() { return this.o.value; }
	setValue(v) { this.o.value = v; if (!this.editing) this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
