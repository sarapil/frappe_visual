// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * HandTracking — WebXR Hand Input Module
 * ========================================
 * Uses the WebXR Hand Input API to detect hand poses and gestures.
 * Provides pinch, grab, point detection and joint position tracking.
 */

export class HandTracking {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			handedness: "both", // "left" | "right" | "both"
			showMeshes: true,
			pinchThreshold: 0.02,
			grabThreshold: 0.04,
		}, opts);

		this._hands = { left: null, right: null };
		this._meshes = { left: [], right: [] };
		this._gestures = { left: null, right: null };
		this._callbacks = new Map();
		this._active = false;
	}

	/**
	 * Attach to an active XR session
	 */
	attach(session, referenceSpace) {
		this._session = session;
		this._refSpace = referenceSpace;
		this._active = true;

		for (const source of session.inputSources) {
			this._onInputSourceAdded(source);
		}
		session.addEventListener("inputsourceschange", (e) => {
			for (const s of e.added) this._onInputSourceAdded(s);
			for (const s of e.removed) this._onInputSourceRemoved(s);
		});
	}

	_onInputSourceAdded(source) {
		if (!source.hand) return;
		const side = source.handedness;
		if (this.opts.handedness !== "both" && this.opts.handedness !== side) return;
		this._hands[side] = source;

		if (this.opts.showMeshes) {
			this._createHandMeshes(side);
		}
	}

	_onInputSourceRemoved(source) {
		const side = source.handedness;
		this._hands[side] = null;
		this._removeHandMeshes(side);
	}

	_createHandMeshes(side) {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		this._removeHandMeshes(side);
		const color = side === "left" ? 0x4488ff : 0xff4444;
		const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });

		// 25 joints per hand (XR standard)
		for (let i = 0; i < 25; i++) {
			const geo = new THREE.SphereGeometry(0.005, 8, 8);
			const mesh = new THREE.Mesh(geo, material);
			mesh.visible = false;
			this.engine.scene.add(mesh);
			this._meshes[side].push(mesh);
		}
	}

	_removeHandMeshes(side) {
		for (const mesh of this._meshes[side]) {
			mesh.geometry?.dispose();
			mesh.material?.dispose();
			this.engine.scene.remove(mesh);
		}
		this._meshes[side] = [];
	}

	/**
	 * Must be called each XR frame
	 */
	update(frame) {
		if (!this._active || !frame) return;

		for (const side of ["left", "right"]) {
			const hand = this._hands[side];
			if (!hand?.hand) continue;

			const joints = [];
			let i = 0;

			for (const joint of hand.hand.values()) {
				const pose = frame.getJointPose(joint, this._refSpace);
				if (pose) {
					const p = pose.transform.position;
					joints.push({ x: p.x, y: p.y, z: p.z, radius: pose.radius });

					if (this._meshes[side][i]) {
						this._meshes[side][i].position.set(p.x, p.y, p.z);
						this._meshes[side][i].visible = true;
					}
				}
				i++;
			}

			// Detect gestures
			const gesture = this._detectGesture(joints, side);
			if (gesture !== this._gestures[side]) {
				const prev = this._gestures[side];
				this._gestures[side] = gesture;
				this._emit("gesture", { side, gesture, previous: prev });

				if (gesture === "pinch") this._emit("pinch", { side });
				if (gesture === "grab") this._emit("grab", { side });
				if (gesture === "point") this._emit("point", { side });
				if (gesture === "open") this._emit("open", { side });
			}
		}
	}

	_detectGesture(joints, side) {
		if (joints.length < 25) return null;

		// Indices: 0=wrist, 4=thumb_tip, 9=index_tip, 14=middle_tip, 19=ring_tip, 24=pinky_tip
		const thumbTip = joints[4];
		const indexTip = joints[9];
		const middleTip = joints[14];
		const ringTip = joints[19];
		const pinkyTip = joints[24];
		const wrist = joints[0];

		if (!thumbTip || !indexTip || !wrist) return null;

		const pinchDist = this._dist(thumbTip, indexTip);
		const grabAvg = (
			this._dist(thumbTip, middleTip) +
			this._dist(thumbTip, ringTip) +
			this._dist(thumbTip, pinkyTip)
		) / 3;

		if (pinchDist < this.opts.pinchThreshold) return "pinch";
		if (grabAvg < this.opts.grabThreshold) return "grab";

		// Check if index is extended and others curled (pointing)
		const indexLen = this._dist(indexTip, wrist);
		const middleLen = this._dist(middleTip, wrist);
		const ringLen = this._dist(ringTip, wrist);
		if (indexLen > middleLen * 1.3 && indexLen > ringLen * 1.3) return "point";

		return "open";
	}

	_dist(a, b) {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		const dz = a.z - b.z;
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	/**
	 * Get real-time joint positions for a hand
	 */
	getJoints(side = "right") {
		return this._hands[side]?.hand || null;
	}

	/**
	 * Get current gesture state
	 */
	getGesture(side = "right") {
		return this._gestures[side];
	}

	/**
	 * Listen for gesture events
	 * Events: "gesture", "pinch", "grab", "point", "open"
	 */
	on(event, callback) {
		if (!this._callbacks.has(event)) {
			this._callbacks.set(event, []);
		}
		this._callbacks.get(event).push(callback);
		return this;
	}

	off(event, callback) {
		const list = this._callbacks.get(event);
		if (list) {
			const idx = list.indexOf(callback);
			if (idx >= 0) list.splice(idx, 1);
		}
		return this;
	}

	_emit(event, data) {
		const list = this._callbacks.get(event);
		if (list) list.forEach(cb => cb(data));
	}

	detach() {
		this._active = false;
		this._hands = { left: null, right: null };
		this._gestures = { left: null, right: null };
		this._removeHandMeshes("left");
		this._removeHandMeshes("right");
	}

	dispose() {
		this.detach();
		this._callbacks.clear();
	}
}
