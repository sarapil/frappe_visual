/**
 * EventBus — Typed pub/sub event system with namespaces
 *
 * const bus = frappe.visual.EventBus.create({ namespace:"myapp" })
 * const off = bus.on("user:login", (data) => console.log(data))
 * bus.emit("user:login", { name:"John" })
 * bus.once("init", () => {})
 * off()  // unsubscribe
 * bus.clear()
 */
export class EventBus {
	static create(opts = {}) {
		const o = Object.assign({
			namespace: "",
			maxListeners: 100,
			debug: false,
			onError: null,
		}, opts);

		const events = new Map();
		const onceSet = new Set();

		function key(event) { return o.namespace ? `${o.namespace}:${event}` : event; }

		function on(event, fn) {
			const k = key(event);
			if (!events.has(k)) events.set(k, []);
			const list = events.get(k);
			if (list.length >= o.maxListeners) {
				console.warn(`[EventBus] Max listeners (${o.maxListeners}) reached for "${k}"`);
			}
			list.push(fn);
			if (o.debug) console.log(`[EventBus] +listener "${k}" (${list.length})`);
			return () => off(event, fn);
		}

		function once(event, fn) {
			const wrapper = (...args) => { off(event, wrapper); fn(...args); };
			onceSet.add(wrapper);
			return on(event, wrapper);
		}

		function off(event, fn) {
			const k = key(event);
			if (!events.has(k)) return;
			if (fn) {
				const list = events.get(k).filter(f => f !== fn);
				if (list.length) events.set(k, list); else events.delete(k);
			} else {
				events.delete(k);
			}
		}

		function emit(event, ...args) {
			const k = key(event);
			if (!events.has(k)) return;
			const list = [...events.get(k)];
			if (o.debug) console.log(`[EventBus] emit "${k}" → ${list.length} listener(s)`, ...args);
			list.forEach(fn => {
				try { fn(...args); } catch (err) {
					if (o.onError) o.onError(err, event);
					else console.error(`[EventBus] Error in "${k}" handler:`, err);
				}
			});
		}

		function emitAsync(event, ...args) {
			const k = key(event);
			if (!events.has(k)) return Promise.resolve();
			return Promise.all(events.get(k).map(fn => {
				try { return Promise.resolve(fn(...args)); } catch (err) {
					if (o.onError) o.onError(err, event);
					return Promise.reject(err);
				}
			}));
		}

		return {
			on, once, off, emit, emitAsync,
			has(event) { const k = key(event); return events.has(k) && events.get(k).length > 0; },
			listenerCount(event) { const k = key(event); return events.has(k) ? events.get(k).length : 0; },
			eventNames() { return [...events.keys()]; },
			clear() { events.clear(); onceSet.clear(); },
			destroy() { events.clear(); onceSet.clear(); },
		};
	}
}
