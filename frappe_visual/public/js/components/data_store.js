/**
 * DataStore — Reactive key-value store with persistence
 *
 * const store = frappe.visual.DataStore.create({
 *   initial: { count:0, user:null },
 *   persist: "myapp_store",         // localStorage key (null=off)
 *   computed: { doubled: (s) => s.count * 2 },
 * })
 * store.set("count", 5)
 * store.get("count")           // 5
 * store.get("doubled")         // 10
 * store.subscribe("count", (val, old) => {})
 * store.batch({ count:10, user:"John" })
 */
export class DataStore {
	static create(opts = {}) {
		const o = Object.assign({
			initial: {},
			persist: null,
			computed: {},
			onChange: null,
		}, opts);

		let state = { ...o.initial };
		const subscribers = new Map();  // key -> Set<fn>
		const globalSubs = new Set();

		// Restore from localStorage
		if (o.persist) {
			try {
				const saved = localStorage.getItem(o.persist);
				if (saved) state = { ...state, ...JSON.parse(saved) };
			} catch (e) { /* ignore */ }
		}

		function save() {
			if (o.persist) {
				try { localStorage.setItem(o.persist, JSON.stringify(state)); } catch (e) { /* ignore */ }
			}
		}

		function notify(key, newVal, oldVal) {
			if (subscribers.has(key)) subscribers.get(key).forEach(fn => fn(newVal, oldVal));
			globalSubs.forEach(fn => fn(key, newVal, oldVal));
			if (o.onChange) o.onChange(key, newVal, oldVal);
		}

		function get(key) {
			if (o.computed[key]) return o.computed[key](state);
			return state[key];
		}

		function set(key, value) {
			const old = state[key];
			if (old === value) return;
			state[key] = value;
			save();
			notify(key, value, old);
		}

		function batch(updates) {
			const changes = [];
			Object.entries(updates).forEach(([key, value]) => {
				const old = state[key];
				if (old !== value) {
					state[key] = value;
					changes.push([key, value, old]);
				}
			});
			save();
			changes.forEach(([key, val, old]) => notify(key, val, old));
		}

		function subscribe(keyOrFn, fn) {
			if (typeof keyOrFn === "function") {
				globalSubs.add(keyOrFn);
				return () => globalSubs.delete(keyOrFn);
			}
			if (!subscribers.has(keyOrFn)) subscribers.set(keyOrFn, new Set());
			subscribers.get(keyOrFn).add(fn);
			return () => subscribers.get(keyOrFn)?.delete(fn);
		}

		return {
			get,
			set,
			batch,
			subscribe,
			getState: () => ({ ...state }),
			reset() { state = { ...o.initial }; save(); globalSubs.forEach(fn => fn("_reset", state, null)); },
			has(key) { return key in state || key in o.computed; },
			keys() { return [...new Set([...Object.keys(state), ...Object.keys(o.computed)])]; },
			destroy() { subscribers.clear(); globalSubs.clear(); },
		};
	}
}
