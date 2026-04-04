/**
 * PerformanceMonitor — Track and visualize component render/load times
 *
 * const perf = frappe.visual.PerformanceMonitor.create({
 *   enabled: true,
 *   threshold: 100,             // warn if operation >100ms
 *   maxEntries: 500,
 *   onSlow: (entry) => console.warn("Slow:", entry),
 * })
 *
 * const end = perf.start("loadDashboard")
 * await loadDashboard()
 * end()  // records timing
 *
 * perf.mark("page_ready")
 * perf.getReport()
 */
export class PerformanceMonitor {
	static create(opts = {}) {
		const o = Object.assign({
			enabled: true,
			threshold: 100,
			maxEntries: 500,
			onSlow: null,
			groupBy: "name",
		}, opts);

		const entries = [];
		const marks = {};

		function start(name, meta = {}) {
			if (!o.enabled) return () => {};
			const t0 = performance.now();
			return (extraMeta = {}) => {
				const duration = performance.now() - t0;
				const entry = {
					name,
					duration: Math.round(duration * 100) / 100,
					timestamp: Date.now(),
					...meta,
					...extraMeta,
				};
				entries.push(entry);
				if (entries.length > o.maxEntries) entries.shift();

				if (duration > o.threshold) {
					if (o.onSlow) o.onSlow(entry);
					else console.warn(`[PerfMon] Slow: "${name}" took ${entry.duration}ms (threshold: ${o.threshold}ms)`);
				}

				return entry;
			};
		}

		function mark(name) {
			marks[name] = performance.now();
		}

		function measure(name, startMark, endMark) {
			const t0 = marks[startMark];
			const t1 = endMark ? marks[endMark] : performance.now();
			if (t0 === undefined) return null;
			const duration = Math.round((t1 - t0) * 100) / 100;
			const entry = { name, duration, timestamp: Date.now(), type: "measure" };
			entries.push(entry);
			return entry;
		}

		function wrap(name, fn) {
			if (!o.enabled) return fn;
			return function (...args) {
				const end = start(name);
				const result = fn.apply(this, args);
				if (result && typeof result.then === "function") {
					return result.then(v => { end(); return v; }).catch(e => { end({ error: true }); throw e; });
				}
				end();
				return result;
			};
		}

		function getReport() {
			const grouped = {};
			entries.forEach(e => {
				const key = e[o.groupBy] || e.name;
				if (!grouped[key]) grouped[key] = { name: key, count: 0, total: 0, min: Infinity, max: 0, entries: [] };
				grouped[key].count++;
				grouped[key].total += e.duration;
				grouped[key].min = Math.min(grouped[key].min, e.duration);
				grouped[key].max = Math.max(grouped[key].max, e.duration);
				grouped[key].entries.push(e);
			});

			return Object.values(grouped).map(g => ({
				...g,
				avg: Math.round(g.total / g.count * 100) / 100,
				total: Math.round(g.total * 100) / 100,
				entries: undefined,
			})).sort((a, b) => b.total - a.total);
		}

		function printReport() {
			const report = getReport();
			console.group("[PerfMon] Performance Report");
			console.table(report);
			console.groupEnd();
			return report;
		}

		return {
			start,
			mark,
			measure,
			wrap,
			getReport,
			printReport,
			getEntries: () => [...entries],
			getSlow: () => entries.filter(e => e.duration > o.threshold),
			clear() { entries.length = 0; Object.keys(marks).forEach(k => delete marks[k]); },
			setEnabled(v) { o.enabled = v; },
			setThreshold(v) { o.threshold = v; },
			destroy() { entries.length = 0; },
		};
	}
}
