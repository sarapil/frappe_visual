/**
 * StateMachine — Finite state machine with transitions & guards
 *
 * frappe.visual.StateMachine.create({
 *   initial: "idle",
 *   states: {
 *     idle:    { on: { START: "running", RESET: "idle" } },
 *     running: { on: { PAUSE: "paused", STOP: "idle", FINISH: "done" } },
 *     paused:  { on: { RESUME: "running", STOP: "idle" } },
 *     done:    { on: { RESET: "idle" }, final: true },
 *   },
 *   guards: { START: (ctx) => ctx.ready },
 *   actions: { running: { enter:(ctx)=>{}, exit:(ctx)=>{} } },
 *   context: { ready: true },
 *   onChange: (state, prev, event) => {},
 * })
 */
export class StateMachine {
	static create(opts = {}) {
		const o = Object.assign({
			initial: "",
			states: {},
			guards: {},
			actions: {},
			context: {},
			onChange: null,
			onError: null,
		}, opts);

		let current = o.initial;
		let ctx = { ...o.context };
		const history = [current];
		const listeners = new Set();

		function send(event, payload = {}) {
			const stateConfig = o.states[current];
			if (!stateConfig || !stateConfig.on || !stateConfig.on[event]) {
				const err = `No transition for event "${event}" in state "${current}"`;
				if (o.onError) o.onError(err);
				return false;
			}

			const target = stateConfig.on[event];

			// Check guard
			if (o.guards[event]) {
				if (!o.guards[event](ctx, payload)) return false;
			}

			const prev = current;

			// Exit action
			if (o.actions[current]?.exit) o.actions[current].exit(ctx, payload);

			current = target;
			history.push(current);

			// Enter action
			if (o.actions[current]?.enter) o.actions[current].enter(ctx, payload);

			// Notify
			if (o.onChange) o.onChange(current, prev, event);
			listeners.forEach(fn => fn(current, prev, event));

			return true;
		}

		function can(event) {
			const stateConfig = o.states[current];
			if (!stateConfig?.on?.[event]) return false;
			if (o.guards[event] && !o.guards[event](ctx)) return false;
			return true;
		}

		return {
			get state() { return current; },
			get context() { return ctx; },
			get history() { return [...history]; },
			send,
			can,
			matches(state) { return current === state; },
			isFinal() { return o.states[current]?.final === true; },
			setContext(updates) { Object.assign(ctx, updates); },
			reset() { current = o.initial; history.length = 0; history.push(current); ctx = { ...o.context }; },
			subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
			getAvailableEvents() {
				const stateConfig = o.states[current];
				return stateConfig?.on ? Object.keys(stateConfig.on) : [];
			},
			destroy() { listeners.clear(); },
		};
	}
}
