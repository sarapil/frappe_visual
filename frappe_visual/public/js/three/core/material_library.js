// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * MaterialLibrary — PBR material registry with named presets
 * ===========================================================
 * Provides reusable material definitions for common surface types.
 */

import * as THREE from "three";

const PRESETS = {
	// ── Construction / Architecture ──
	concrete:     { color: 0xb0b0b0, roughness: 0.9, metalness: 0.0 },
	steel:        { color: 0xc8c8c8, roughness: 0.3, metalness: 0.8 },
	glass:        { color: 0xe8f4f8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3 },
	brick:        { color: 0xb35c44, roughness: 0.85, metalness: 0.0 },
	wood_light:   { color: 0xd4a574, roughness: 0.7, metalness: 0.0 },
	wood_dark:    { color: 0x8b6f47, roughness: 0.7, metalness: 0.0 },
	marble:       { color: 0xf0ece4, roughness: 0.2, metalness: 0.05 },
	tile:         { color: 0xe5e5e5, roughness: 0.4, metalness: 0.0 },

	// ── Interior / Furniture ──
	fabric:       { color: 0xa0a0b0, roughness: 0.95, metalness: 0.0 },
	leather:      { color: 0x6b4423, roughness: 0.6, metalness: 0.0 },
	plastic:      { color: 0xfafafa, roughness: 0.4, metalness: 0.0 },
	chrome:       { color: 0xeeeeee, roughness: 0.1, metalness: 0.9 },
	copper:       { color: 0xb87333, roughness: 0.3, metalness: 0.7 },
	gold:         { color: 0xffd700, roughness: 0.2, metalness: 0.8 },

	// ── Technical / Equipment ──
	matte_gray:   { color: 0x6b7280, roughness: 0.8, metalness: 0.1 },
	matte_white:  { color: 0xf5f5f5, roughness: 0.8, metalness: 0.0 },
	matte_black:  { color: 0x2a2a2a, roughness: 0.8, metalness: 0.1 },
	glossy_white: { color: 0xffffff, roughness: 0.15, metalness: 0.0 },
	rubber:       { color: 0x333333, roughness: 0.95, metalness: 0.0 },

	// ── Nature / Landscape ──
	grass:        { color: 0x4a7c3f, roughness: 0.95, metalness: 0.0 },
	soil:         { color: 0x7a5c3e, roughness: 0.95, metalness: 0.0 },
	water:        { color: 0x3498db, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.7 },
	sand:         { color: 0xf4e8c1, roughness: 0.9, metalness: 0.0 },

	// ── Status Colors ──
	success:      { color: 0x10b981, roughness: 0.5, metalness: 0.1 },
	warning:      { color: 0xf59e0b, roughness: 0.5, metalness: 0.1 },
	danger:       { color: 0xef4444, roughness: 0.5, metalness: 0.1 },
	info:         { color: 0x3b82f6, roughness: 0.5, metalness: 0.1 },
};

export class MaterialLibrary {
	constructor() {
		this._custom = {};
		this._instances = new Map();
	}

	/**
	 * Get a material by preset name.
	 * @param {string} name - Preset name (e.g. "concrete", "steel")
	 * @param {Object} overrides - Override specific properties
	 * @returns {THREE.MeshStandardMaterial}
	 */
	get(name, overrides = {}) {
		const preset = PRESETS[name] || this._custom[name];
		if (!preset) {
			console.warn(`MaterialLibrary: Unknown preset "${name}", using default`);
			return new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
		}

		const config = { ...preset, ...overrides };
		const key = JSON.stringify(config);

		if (this._instances.has(key)) {
			return this._instances.get(key);
		}

		const material = new THREE.MeshStandardMaterial(config);
		this._instances.set(key, material);
		return material;
	}

	/** Register a custom material preset */
	register(name, config) {
		this._custom[name] = config;
	}

	/** List all available preset names */
	list() {
		return [...Object.keys(PRESETS), ...Object.keys(this._custom)];
	}

	/** Get preset config (for inspection) */
	getPreset(name) {
		return PRESETS[name] || this._custom[name] || null;
	}

	/** Dispose all cached material instances */
	dispose() {
		for (const mat of this._instances.values()) {
			mat.dispose();
		}
		this._instances.clear();
	}
}
