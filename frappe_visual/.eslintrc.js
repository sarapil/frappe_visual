// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0
// ESLint configuration for frappe_visual

module.exports = {
	root: true,
	env: {
		browser: true,
		es2022: true,
		jquery: true,
	},
	globals: {
		frappe: "readonly",
		__: "readonly",
		cur_frm: "readonly",
		cur_list: "readonly",
		locals: "readonly",
		cint: "readonly",
		cstr: "readonly",
		flt: "readonly",
		strip: "readonly",
		moment: "readonly",
		Cytoscape: "readonly",
		ELK: "readonly",
		echarts: "readonly",
		gsap: "readonly",
		Draggable: "readonly",
		L: "readonly",
		lottie: "readonly",
		Sortable: "readonly",
	},
	parserOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
	},
	extends: ["eslint:recommended"],
	rules: {
		// ── Quality ──
		"no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-debugger": "error",
		"no-eval": "error",
		"no-implied-eval": "error",

		// ── Style ──
		"indent": ["warn", "tab", { SwitchCase: 1 }],
		"quotes": ["warn", "double", { avoidEscape: true }],
		"semi": ["warn", "always"],
		"comma-dangle": ["warn", "always-multiline"],
		"no-trailing-spaces": "warn",
		"eol-last": "warn",

		// ── Best Practices ──
		"eqeqeq": ["warn", "smart"],
		"no-var": "error",
		"prefer-const": "warn",
		"prefer-template": "warn",
		"no-throw-literal": "error",
		"no-new-func": "error",
		"no-caller": "error",
		"no-extend-native": "error",
		"no-extra-bind": "warn",
		"no-loop-func": "warn",
		"no-self-compare": "error",
		"curly": ["warn", "multi-line"],

		// ── Frappe-specific relaxations ──
		"no-prototype-builtins": "off",
	},
	overrides: [
		{
			// Bundle source files
			files: ["frappe_visual/public/js/**/*.js"],
			rules: {
				"no-console": ["warn", { allow: ["warn", "error", "debug"] }],
			},
		},
		{
			// Page scripts (may use global patterns)
			files: ["frappe_visual/frappe_visual/page/**/*.js"],
			rules: {
				"no-unused-vars": "off",
			},
		},
	],
	ignorePatterns: [
		"node_modules/",
		"*.min.js",
		"frappe_visual/public/dist/",
		"frappe_visual/public/vendor/",
	],
};
