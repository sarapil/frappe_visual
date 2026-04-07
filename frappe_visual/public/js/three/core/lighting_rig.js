// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * LightingRig — Preset lighting configurations for 3D scenes
 * ============================================================
 * 5+ named presets for common lighting scenarios.
 */

import * as THREE from "three";

function _createShadowLight(color, intensity, position, shadowSize = 2048) {
	const light = new THREE.DirectionalLight(color, intensity);
	light.position.set(...position);
	light.castShadow = true;
	light.shadow.mapSize.width = shadowSize;
	light.shadow.mapSize.height = shadowSize;
	light.shadow.camera.near = 0.5;
	light.shadow.camera.far = 100;
	const d = 30;
	light.shadow.camera.left = -d;
	light.shadow.camera.right = d;
	light.shadow.camera.top = d;
	light.shadow.camera.bottom = -d;
	return light;
}

export const LightingRig = {
	/** 3-point studio lighting (key + fill + rim) */
	studio(scene) {
		scene.add(new THREE.AmbientLight(0xffffff, 0.4));
		scene.add(_createShadowLight(0xffffff, 1.0, [5, 10, 7]));      // Key
		scene.add(new THREE.DirectionalLight(0xaaccff, 0.3, [-3, 5, -5])); // Fill
		const rim = new THREE.DirectionalLight(0xffeedd, 0.2);
		rim.position.set(0, 8, -10);
		scene.add(rim);
	},

	/** Natural daylight — sun, ambient sky, hemisphere */
	daylight(scene) {
		const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
		scene.add(hemi);
		scene.add(_createShadowLight(0xfff5e6, 1.2, [10, 20, 5]));
		scene.add(new THREE.AmbientLight(0xe8f0ff, 0.2));
	},

	/** Warm interior lighting — ambient + warm points */
	interior(scene) {
		scene.add(new THREE.AmbientLight(0xfff0e0, 0.5));
		scene.add(_createShadowLight(0xffeedd, 0.8, [3, 8, 5]));

		const point1 = new THREE.PointLight(0xffc87c, 0.6, 20);
		point1.position.set(2, 4, 2);
		scene.add(point1);

		const point2 = new THREE.PointLight(0xffc87c, 0.4, 15);
		point2.position.set(-3, 3, -2);
		scene.add(point2);
	},

	/** High-contrast dramatic single source */
	dramatic(scene) {
		scene.add(new THREE.AmbientLight(0x111122, 0.2));
		scene.add(_createShadowLight(0xffffff, 1.5, [-5, 15, 3], 4096));
	},

	/** Flat uniform lighting with blue tint — engineering/blueprint */
	blueprint(scene) {
		scene.add(new THREE.AmbientLight(0xd0e0ff, 0.8));
		const dir = new THREE.DirectionalLight(0xeeeeff, 0.5);
		dir.position.set(0, 10, 0);
		scene.add(dir);
	},

	/** Neutral flat lighting — good for model inspection */
	neutral(scene) {
		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		scene.add(_createShadowLight(0xffffff, 0.5, [5, 8, 5]));
		const back = new THREE.DirectionalLight(0xffffff, 0.3);
		back.position.set(-5, 5, -5);
		scene.add(back);
	},

	/** Sunset warm glow */
	sunset(scene) {
		const hemi = new THREE.HemisphereLight(0xff8844, 0x4444ff, 0.4);
		scene.add(hemi);
		scene.add(_createShadowLight(0xff9966, 1.0, [15, 5, 5]));
		scene.add(new THREE.AmbientLight(0xffd0a0, 0.3));
	},
};
