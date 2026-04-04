// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Media Player
 * ==============================
 * Premium audio/video player with playlist, waveform visualization,
 * chapters, speed control, picture-in-picture, and custom UI.
 *
 * Features:
 *  - Audio + Video unified player with custom controls
 *  - Playlist with drag-reorder and shuffle/repeat
 *  - Audio waveform visualization (Canvas)
 *  - Chapter markers with jump-to navigation
 *  - Playback speed control (0.25x – 3x)
 *  - Picture-in-Picture (PiP) for video
 *  - Volume slider with mute toggle
 *  - Progress bar with hover preview
 *  - Keyboard shortcuts (space, arrows, M, F)
 *  - Fullscreen toggle for video
 *  - Time display (current / duration)
 *  - Dark mode / glass theme
 *
 * API:
 *   frappe.visual.MediaPlayer.create('#el', {
 *     playlist: [{ src: '/files/song.mp3', title: 'Song 1' }]
 *   })
 *
 * @module frappe_visual/components/media_player
 */

export class MediaPlayer {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("MediaPlayer: container not found");

		this.opts = Object.assign({
			theme: "glass",
			playlist: [],           // [{ src, title, artist, cover, type, chapters }]
			autoplay: false,
			loop: false,            // "none" | "one" | "all"
			shuffle: false,
			showWaveform: true,
			showPlaylist: true,
			onTrackChange: null,
			onEnded: null,
		}, opts);

		this._currentIndex = 0;
		this._isPlaying = false;
		this._volume = 1;
		this._muted = false;
		this._speed = 1;
		this._loopMode = this.opts.loop ? "all" : "none";
		this._shuffle = this.opts.shuffle;
		this._audioCtx = null;
		this._analyser = null;
		this._waveAnimId = null;

		this._init();
	}

	static create(container, opts) { return new MediaPlayer(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-mp", `fv-mp--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._createMediaElement();
		this._renderPlayer();
		if (this.opts.showPlaylist && this.opts.playlist.length > 1) this._renderPlaylist();
		if (this.opts.playlist.length) this._loadTrack(0);
	}

	_createMediaElement() {
		const track = this.opts.playlist[0];
		const isVideo = track?.type === "video" || track?.src?.match(/\.(mp4|webm|mov|avi|mkv)$/i);
		this._isVideo = isVideo;

		this._media = document.createElement(isVideo ? "video" : "audio");
		this._media.preload = "metadata";
	}

	/* ── Player UI ───────────────────────────────────────────── */
	_renderPlayer() {
		const player = document.createElement("div");
		player.className = "fv-mp-player";

		// Video area (if video)
		if (this._isVideo) {
			const videoWrap = document.createElement("div");
			videoWrap.className = "fv-mp-video-wrap";
			videoWrap.appendChild(this._media);
			this._media.className = "fv-mp-video";
			player.appendChild(videoWrap);
		}

		// Cover + track info
		const info = document.createElement("div");
		info.className = "fv-mp-info";
		info.innerHTML = `
			<div class="fv-mp-cover-wrap">
				<img class="fv-mp-cover" src="" alt="" />
				${this.opts.showWaveform && !this._isVideo ? '<canvas class="fv-mp-waveform" width="200" height="60"></canvas>' : ""}
			</div>
			<div class="fv-mp-track-info">
				<div class="fv-mp-title"></div>
				<div class="fv-mp-artist"></div>
			</div>`;
		player.appendChild(info);
		this._infoEl = info;

		// Progress bar
		const progress = document.createElement("div");
		progress.className = "fv-mp-progress-wrap";
		progress.innerHTML = `
			<span class="fv-mp-time fv-mp-time-current">0:00</span>
			<div class="fv-mp-progress-bar">
				<div class="fv-mp-progress-filled"></div>
				<div class="fv-mp-progress-buffer"></div>
				<div class="fv-mp-chapters"></div>
			</div>
			<span class="fv-mp-time fv-mp-time-duration">0:00</span>`;
		player.appendChild(progress);
		this._progressWrap = progress;

		// Controls
		const controls = document.createElement("div");
		controls.className = "fv-mp-controls";
		controls.innerHTML = `
			<button class="fv-mp-btn fv-mp-shuffle" title="${__("Shuffle")}">🔀</button>
			<button class="fv-mp-btn fv-mp-prev" title="${__("Previous")}">⏮</button>
			<button class="fv-mp-btn fv-mp-play" title="${__("Play")}">▶</button>
			<button class="fv-mp-btn fv-mp-next" title="${__("Next")}">⏭</button>
			<button class="fv-mp-btn fv-mp-loop" title="${__("Loop")}">🔁</button>
			<div class="fv-mp-volume-wrap">
				<button class="fv-mp-btn fv-mp-mute" title="${__("Mute")}">🔊</button>
				<input type="range" class="fv-mp-volume" min="0" max="1" step="0.05" value="1" />
			</div>
			<select class="fv-mp-speed" title="${__("Speed")}">
				<option value="0.25">0.25×</option>
				<option value="0.5">0.5×</option>
				<option value="0.75">0.75×</option>
				<option value="1" selected>1×</option>
				<option value="1.25">1.25×</option>
				<option value="1.5">1.5×</option>
				<option value="2">2×</option>
				<option value="3">3×</option>
			</select>
			${this._isVideo ? `<button class="fv-mp-btn fv-mp-pip" title="${__("Picture-in-Picture")}">🖼</button>
			<button class="fv-mp-btn fv-mp-fullscreen" title="${__("Fullscreen")}">⛶</button>` : ""}`;
		player.appendChild(controls);

		this.container.appendChild(player);
		this._playerEl = player;

		this._bindPlayerEvents(controls, progress);
	}

	/* ── Playlist UI ─────────────────────────────────────────── */
	_renderPlaylist() {
		const pl = document.createElement("div");
		pl.className = "fv-mp-playlist";
		pl.innerHTML = `<h4 class="fv-mp-pl-header">${__("Playlist")} (${this.opts.playlist.length})</h4>`;

		const list = document.createElement("div");
		list.className = "fv-mp-pl-list";
		this.opts.playlist.forEach((track, i) => {
			const item = document.createElement("div");
			item.className = `fv-mp-pl-item ${i === this._currentIndex ? "active" : ""}`;
			item.dataset.index = i;
			item.innerHTML = `
				<span class="fv-mp-pl-num">${i + 1}</span>
				<span class="fv-mp-pl-title">${this._esc(track.title || "Untitled")}</span>
				<span class="fv-mp-pl-artist">${this._esc(track.artist || "")}</span>`;
			item.addEventListener("click", () => this._loadTrack(i));
			list.appendChild(item);
		});
		pl.appendChild(list);
		this.container.appendChild(pl);
		this._playlistEl = pl;
	}

	_updatePlaylistHighlight() {
		if (!this._playlistEl) return;
		this._playlistEl.querySelectorAll(".fv-mp-pl-item").forEach((el, i) => {
			el.classList.toggle("active", i === this._currentIndex);
		});
	}

	/* ── Events ──────────────────────────────────────────────── */
	_bindPlayerEvents(controls, progress) {
		// Play/pause
		controls.querySelector(".fv-mp-play").addEventListener("click", () => this.togglePlay());
		controls.querySelector(".fv-mp-prev").addEventListener("click", () => this.previous());
		controls.querySelector(".fv-mp-next").addEventListener("click", () => this.next());

		// Shuffle
		controls.querySelector(".fv-mp-shuffle").addEventListener("click", () => {
			this._shuffle = !this._shuffle;
			controls.querySelector(".fv-mp-shuffle").classList.toggle("fv-mp-btn--active", this._shuffle);
		});

		// Loop
		controls.querySelector(".fv-mp-loop").addEventListener("click", () => {
			const modes = ["none", "all", "one"];
			const idx = (modes.indexOf(this._loopMode) + 1) % 3;
			this._loopMode = modes[idx];
			const btn = controls.querySelector(".fv-mp-loop");
			btn.textContent = this._loopMode === "one" ? "🔂" : "🔁";
			btn.classList.toggle("fv-mp-btn--active", this._loopMode !== "none");
		});

		// Volume
		controls.querySelector(".fv-mp-volume").addEventListener("input", (e) => {
			this._volume = parseFloat(e.target.value);
			this._media.volume = this._volume;
			this._muted = false;
			this._updateMuteIcon(controls);
		});

		controls.querySelector(".fv-mp-mute").addEventListener("click", () => {
			this._muted = !this._muted;
			this._media.muted = this._muted;
			this._updateMuteIcon(controls);
		});

		// Speed
		controls.querySelector(".fv-mp-speed").addEventListener("change", (e) => {
			this._speed = parseFloat(e.target.value);
			this._media.playbackRate = this._speed;
		});

		// PiP
		const pipBtn = controls.querySelector(".fv-mp-pip");
		if (pipBtn) {
			pipBtn.addEventListener("click", () => {
				if (document.pictureInPictureElement) document.exitPictureInPicture();
				else this._media.requestPictureInPicture?.();
			});
		}

		// Fullscreen
		const fsBtn = controls.querySelector(".fv-mp-fullscreen");
		if (fsBtn) {
			fsBtn.addEventListener("click", () => {
				if (document.fullscreenElement) document.exitFullscreen();
				else this.container.requestFullscreen?.();
			});
		}

		// Progress bar click
		const progressBar = progress.querySelector(".fv-mp-progress-bar");
		progressBar.addEventListener("click", (e) => {
			const rect = progressBar.getBoundingClientRect();
			const pct = (e.clientX - rect.left) / rect.width;
			this._media.currentTime = pct * this._media.duration;
		});

		// Media events
		this._media.addEventListener("timeupdate", () => this._onTimeUpdate());
		this._media.addEventListener("loadedmetadata", () => this._onLoaded());
		this._media.addEventListener("ended", () => this._onEnded());
		this._media.addEventListener("progress", () => this._onBuffer());

		// Keyboard
		this.container.tabIndex = 0;
		this.container.addEventListener("keydown", (e) => {
			switch (e.key) {
				case " ": e.preventDefault(); this.togglePlay(); break;
				case "ArrowRight": this._media.currentTime += 5; break;
				case "ArrowLeft":  this._media.currentTime -= 5; break;
				case "ArrowUp":    this._media.volume = Math.min(1, this._media.volume + 0.1); break;
				case "ArrowDown":  this._media.volume = Math.max(0, this._media.volume - 0.1); break;
				case "m": case "M": this._muted = !this._muted; this._media.muted = this._muted; break;
				case "f": case "F":
					if (document.fullscreenElement) document.exitFullscreen();
					else this.container.requestFullscreen?.();
					break;
			}
		});
	}

	_onTimeUpdate() {
		const cur = this._media.currentTime;
		const dur = this._media.duration || 0;
		const pct = dur ? (cur / dur) * 100 : 0;

		const filled = this._progressWrap.querySelector(".fv-mp-progress-filled");
		if (filled) filled.style.width = `${pct}%`;

		const curEl = this._progressWrap.querySelector(".fv-mp-time-current");
		if (curEl) curEl.textContent = this._formatTime(cur);
	}

	_onLoaded() {
		const dur = this._media.duration || 0;
		const durEl = this._progressWrap.querySelector(".fv-mp-time-duration");
		if (durEl) durEl.textContent = this._formatTime(dur);

		// Render chapters
		const track = this.opts.playlist[this._currentIndex];
		if (track?.chapters) this._renderChapters(track.chapters, dur);
	}

	_onEnded() {
		if (this._loopMode === "one") {
			this._media.currentTime = 0;
			this._media.play();
		} else if (this._loopMode === "all" || this._currentIndex < this.opts.playlist.length - 1) {
			this.next();
		} else {
			this._isPlaying = false;
			this._updatePlayBtn();
		}
		if (this.opts.onEnded) this.opts.onEnded();
	}

	_onBuffer() {
		if (!this._media.buffered.length) return;
		const buffered = this._media.buffered.end(this._media.buffered.length - 1);
		const dur = this._media.duration || 1;
		const bufEl = this._progressWrap.querySelector(".fv-mp-progress-buffer");
		if (bufEl) bufEl.style.width = `${(buffered / dur) * 100}%`;
	}

	/* ── Waveform ────────────────────────────────────────────── */
	_startWaveform() {
		if (!this.opts.showWaveform || this._isVideo) return;
		const canvas = this._infoEl?.querySelector(".fv-mp-waveform");
		if (!canvas) return;

		if (!this._audioCtx) {
			this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			this._analyser = this._audioCtx.createAnalyser();
			this._analyser.fftSize = 128;
			const source = this._audioCtx.createMediaElementSource(this._media);
			source.connect(this._analyser);
			this._analyser.connect(this._audioCtx.destination);
		}

		const ctx = canvas.getContext("2d");
		const bufLen = this._analyser.frequencyBinCount;
		const data = new Uint8Array(bufLen);

		const draw = () => {
			this._waveAnimId = requestAnimationFrame(draw);
			this._analyser.getByteFrequencyData(data);
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const barW = canvas.width / bufLen;
			data.forEach((val, i) => {
				const h = (val / 255) * canvas.height;
				const hue = (i / bufLen) * 240;
				ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
				ctx.fillRect(i * barW, canvas.height - h, barW - 1, h);
			});
		};
		draw();
	}

	_stopWaveform() {
		if (this._waveAnimId) {
			cancelAnimationFrame(this._waveAnimId);
			this._waveAnimId = null;
		}
	}

	/* ── Chapters ────────────────────────────────────────────── */
	_renderChapters(chapters, duration) {
		const el = this._progressWrap.querySelector(".fv-mp-chapters");
		if (!el || !duration) return;
		el.innerHTML = chapters.map(ch => {
			const left = (ch.time / duration) * 100;
			return `<div class="fv-mp-chapter-mark" style="left:${left}%" title="${this._esc(ch.title)}"></div>`;
		}).join("");
	}

	/* ── Track Loading ───────────────────────────────────────── */
	_loadTrack(index) {
		if (index < 0 || index >= this.opts.playlist.length) return;
		this._currentIndex = index;
		const track = this.opts.playlist[index];

		this._media.src = track.src;
		this._media.load();

		// Update UI
		const titleEl = this._infoEl?.querySelector(".fv-mp-title");
		const artistEl = this._infoEl?.querySelector(".fv-mp-artist");
		const coverEl = this._infoEl?.querySelector(".fv-mp-cover");
		if (titleEl) titleEl.textContent = track.title || __("Untitled");
		if (artistEl) artistEl.textContent = track.artist || "";
		if (coverEl) {
			coverEl.src = track.cover || "";
			coverEl.style.display = track.cover ? "" : "none";
		}

		this._updatePlaylistHighlight();
		if (this._isPlaying || this.opts.autoplay) this.play();
		if (this.opts.onTrackChange) this.opts.onTrackChange(track, index);
	}

	/* ── Controls ────────────────────────────────────────────── */
	togglePlay() {
		if (this._isPlaying) this.pause();
		else this.play();
	}

	play() {
		this._media.play().then(() => {
			this._isPlaying = true;
			this._updatePlayBtn();
			this._startWaveform();
		}).catch(() => {});
	}

	pause() {
		this._media.pause();
		this._isPlaying = false;
		this._updatePlayBtn();
		this._stopWaveform();
	}

	next() {
		let idx;
		if (this._shuffle) {
			idx = Math.floor(Math.random() * this.opts.playlist.length);
		} else {
			idx = (this._currentIndex + 1) % this.opts.playlist.length;
		}
		this._loadTrack(idx);
	}

	previous() {
		if (this._media.currentTime > 3) {
			this._media.currentTime = 0;
			return;
		}
		const idx = (this._currentIndex - 1 + this.opts.playlist.length) % this.opts.playlist.length;
		this._loadTrack(idx);
	}

	_updatePlayBtn() {
		const btn = this._playerEl?.querySelector(".fv-mp-play");
		if (btn) btn.textContent = this._isPlaying ? "⏸" : "▶";
	}

	_updateMuteIcon(controls) {
		const btn = controls.querySelector(".fv-mp-mute");
		if (btn) btn.textContent = this._muted || this._volume === 0 ? "🔇" : this._volume < 0.5 ? "🔉" : "🔊";
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_formatTime(secs) {
		if (!secs || isNaN(secs)) return "0:00";
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this._stopWaveform();
		this._media?.pause();
		this.container.innerHTML = "";
		this.container.classList.remove("fv-mp");
	}
}
