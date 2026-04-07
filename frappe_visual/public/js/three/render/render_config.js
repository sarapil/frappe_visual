// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * RenderConfig — Quality presets, camera presets, resolution management
 * ======================================================================
 * Central configuration store for 3D rendering parameters.
 */

export class RenderConfig {
	static qualityPresets = {
		preview: { samples: 1, shadows: false, ao: false, reflections: false, resolution: [800, 600], label: __("Preview") },
		draft: { samples: 16, shadows: true, ao: false, reflections: false, resolution: [1280, 720], label: __("Draft") },
		standard: { samples: 64, shadows: true, ao: false, reflections: false, resolution: [1920, 1080], label: __("Standard") },
		high: { samples: 256, shadows: true, ao: true, reflections: true, resolution: [2560, 1440], label: __("High") },
		ultra: { samples: 1024, shadows: true, ao: true, reflections: true, resolution: [3840, 2160], label: __("Ultra") },
		print: { samples: 1024, shadows: true, ao: true, reflections: true, resolution: [7680, 4320], label: __("Print") },
	};

	static cameraPresets = {
		perspective: { position: [300, 400, 300], target: [0, 0, 0], fov: 50, type: "perspective" },
		topDown: { position: [0, 600, 0], target: [0, 0, 0], fov: 35, type: "orthographic" },
		frontElevation: { position: [0, 150, 500], target: [0, 150, 0], fov: 45, type: "perspective" },
		sideElevation: { position: [500, 150, 0], target: [0, 150, 0], fov: 45, type: "perspective" },
		cornerView: { position: [350, 250, 350], target: [0, 0, 0], fov: 50, type: "perspective" },
		birdEye: { position: [0, 1000, 500], target: [0, 0, 0], fov: 30, type: "perspective" },
		walkthrough: { position: [0, 170, 0], target: [0, 170, 300], fov: 75, type: "perspective" },
	};

	static outputFormats = {
		png: { mime: "image/png", extension: ".png", quality: 1 },
		jpeg: { mime: "image/jpeg", extension: ".jpg", quality: 0.92 },
		webp: { mime: "image/webp", extension: ".webp", quality: 0.9 },
	};

	static lightingPresets = {
		studio: "studio",
		daylight: "daylight",
		interior: "interior",
		dramatic: "dramatic",
		blueprint: "blueprint",
	};

	static getResolution(preset) {
		const p = this.qualityPresets[preset];
		return p ? { width: p.resolution[0], height: p.resolution[1] } : { width: 1920, height: 1080 };
	}

	static parseResolution(str) {
		if (typeof str === "string") {
			const [w, h] = str.split("x").map(Number);
			return { width: w || 1920, height: h || 1080 };
		}
		return str;
	}

	static buildConfig(opts = {}) {
		const quality = this.qualityPresets[opts.quality || "standard"];
		const camera = opts.customCamera || this.cameraPresets[opts.camera || "perspective"];
		const format = this.outputFormats[opts.format || "png"];
		const res = opts.resolution ? this.parseResolution(opts.resolution) : { width: quality.resolution[0], height: quality.resolution[1] };

		return {
			quality: { ...quality, preset: opts.quality || "standard" },
			camera: { ...camera, preset: opts.camera || "perspective" },
			output: { ...format, formatKey: opts.format || "png" },
			resolution: res,
			lighting: opts.lighting || "studio",
		};
	}
}
