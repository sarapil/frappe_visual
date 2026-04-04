/**
 * FeatureFlag — Client-side feature flag management
 *
 * frappe.visual.FeatureFlag.create({
 *   flags: {
 *     new_dashboard:  { enabled:true, description:"New dashboard UI" },
 *     beta_reports:   { enabled:false, roles:["System Manager"], description:"Beta reports" },
 *     dark_mode:      { enabled:true, percentage:50, description:"Dark mode rollout" },
 *   },
 *   user: frappe.session.user,
 *   roles: frappe.user_roles || [],
 *   persist: "fv_feature_flags",   // localStorage key for overrides
 *   onCheck: (flag, enabled) => {},
 * })
 *
 * if (flags.isEnabled("new_dashboard")) { ... }
 * flags.override("beta_reports", true)  // dev override
 */
export class FeatureFlag {
	static create(opts = {}) {
		const o = Object.assign({
			flags: {},
			user: "",
			roles: [],
			persist: null,
			onCheck: null,
		}, opts);

		let overrides = {};

		// Load overrides from localStorage
		if (o.persist) {
			try {
				const saved = localStorage.getItem(o.persist);
				if (saved) overrides = JSON.parse(saved);
			} catch (e) { /* ignore */ }
		}

		function saveOverrides() {
			if (o.persist) {
				try { localStorage.setItem(o.persist, JSON.stringify(overrides)); } catch (e) { /* ignore */ }
			}
		}

		function hash(str) {
			let h = 0;
			for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
			return Math.abs(h);
		}

		function isEnabled(flag) {
			// Check override first
			if (flag in overrides) {
				const result = !!overrides[flag];
				if (o.onCheck) o.onCheck(flag, result);
				return result;
			}

			const config = o.flags[flag];
			if (!config) return false;

			// Basic enabled check
			if (!config.enabled) {
				if (o.onCheck) o.onCheck(flag, false);
				return false;
			}

			// Role-based gating
			if (config.roles && config.roles.length > 0) {
				const hasRole = config.roles.some(r => o.roles.includes(r));
				if (!hasRole) {
					if (o.onCheck) o.onCheck(flag, false);
					return false;
				}
			}

			// User whitelist
			if (config.users && config.users.length > 0) {
				if (!config.users.includes(o.user)) {
					if (o.onCheck) o.onCheck(flag, false);
					return false;
				}
			}

			// Percentage rollout (deterministic per user)
			if (config.percentage !== undefined && config.percentage < 100) {
				const userHash = hash(o.user + flag) % 100;
				if (userHash >= config.percentage) {
					if (o.onCheck) o.onCheck(flag, false);
					return false;
				}
			}

			// Date range
			if (config.startDate && new Date() < new Date(config.startDate)) { if (o.onCheck) o.onCheck(flag, false); return false; }
			if (config.endDate && new Date() > new Date(config.endDate)) { if (o.onCheck) o.onCheck(flag, false); return false; }

			if (o.onCheck) o.onCheck(flag, true);
			return true;
		}

		function override(flag, value) {
			overrides[flag] = value;
			saveOverrides();
		}

		function clearOverride(flag) {
			delete overrides[flag];
			saveOverrides();
		}

		return {
			isEnabled,
			override,
			clearOverride,
			clearAllOverrides() { overrides = {}; saveOverrides(); },
			getOverrides: () => ({ ...overrides }),
			getAllFlags() {
				return Object.entries(o.flags).map(([name, config]) => ({
					name, ...config,
					overridden: name in overrides,
					currentValue: isEnabled(name),
				}));
			},
			setUser(user) { o.user = user; },
			setRoles(roles) { o.roles = roles; },
			destroy() { /* stateless */ },
		};
	}
}
