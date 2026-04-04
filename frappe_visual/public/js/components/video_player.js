/**
 * VideoPlayer — Custom HTML5 video player with controls
 *
 * frappe.visual.VideoPlayer.create({
 *   container: el,
 *   src: "/path/to/video.mp4",
 *   poster: "/path/to/poster.jpg",
 *   autoplay: false,
 *   muted: false,
 *   loop: false,
 *   controls: true,
 *   theme: "glass",           // glass|flat|minimal
 *   onPlay: () => {},
 *   onEnd: () => {},
 * })
 */
export class VideoPlayer {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			src: "",
			poster: "",
			autoplay: false,
			muted: false,
			loop: false,
			controls: true,
			theme: "glass",
			width: "100%",
			onPlay: null,
			onPause: null,
			onEnd: null,
			onTimeUpdate: null,
		}, opts);

		const el = document.createElement("div");
		el.className = `fv-video-player fv-video-player--${o.theme}`;
		el.style.width = o.width;

		const video = document.createElement("video");
		video.className = "fv-video-player__video";
		video.src = o.src;
		if (o.poster) video.poster = o.poster;
		video.autoplay = o.autoplay;
		video.muted = o.muted;
		video.loop = o.loop;
		video.playsInline = true;

		el.appendChild(video);

		if (o.controls) {
			const controls = document.createElement("div");
			controls.className = "fv-video-player__controls";
			controls.innerHTML = `
				<button class="fv-video-player__btn" data-action="play" aria-label="Play">▶</button>
				<span class="fv-video-player__time">0:00</span>
				<div class="fv-video-player__progress">
					<div class="fv-video-player__progress-bar"></div>
					<div class="fv-video-player__progress-buffered"></div>
					<div class="fv-video-player__progress-fill"></div>
				</div>
				<span class="fv-video-player__duration">0:00</span>
				<button class="fv-video-player__btn" data-action="mute" aria-label="Mute">🔊</button>
				<input type="range" class="fv-video-player__volume" min="0" max="1" step="0.05" value="1" />
				<button class="fv-video-player__btn" data-action="fullscreen" aria-label="Fullscreen">⛶</button>
			`;
			el.appendChild(controls);

			const playBtn = controls.querySelector("[data-action='play']");
			const muteBtn = controls.querySelector("[data-action='mute']");
			const fsBtn = controls.querySelector("[data-action='fullscreen']");
			const progressBar = controls.querySelector(".fv-video-player__progress");
			const progressFill = controls.querySelector(".fv-video-player__progress-fill");
			const volumeSlider = controls.querySelector(".fv-video-player__volume");
			const timeEl = controls.querySelector(".fv-video-player__time");
			const durationEl = controls.querySelector(".fv-video-player__duration");

			function fmt(s) {
				const m = Math.floor(s / 60);
				const sec = Math.floor(s % 60);
				return `${m}:${sec < 10 ? "0" : ""}${sec}`;
			}

			playBtn.onclick = () => { video.paused ? video.play() : video.pause(); };
			muteBtn.onclick = () => { video.muted = !video.muted; muteBtn.textContent = video.muted ? "🔇" : "🔊"; };
			fsBtn.onclick = () => {
				if (document.fullscreenElement) document.exitFullscreen();
				else el.requestFullscreen?.();
			};

			volumeSlider.oninput = () => { video.volume = parseFloat(volumeSlider.value); };

			progressBar.onclick = (e) => {
				const rect = progressBar.getBoundingClientRect();
				const pct = (e.clientX - rect.left) / rect.width;
				video.currentTime = pct * video.duration;
			};

			video.ontimeupdate = () => {
				const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
				progressFill.style.width = pct + "%";
				timeEl.textContent = fmt(video.currentTime);
				if (o.onTimeUpdate) o.onTimeUpdate(video.currentTime, video.duration);
			};

			video.onloadedmetadata = () => { durationEl.textContent = fmt(video.duration); };
			video.onplay = () => { playBtn.textContent = "⏸"; el.classList.add("fv-video-player--playing"); if (o.onPlay) o.onPlay(); };
			video.onpause = () => { playBtn.textContent = "▶"; el.classList.remove("fv-video-player--playing"); if (o.onPause) o.onPause(); };
			video.onended = () => { el.classList.remove("fv-video-player--playing"); if (o.onEnd) o.onEnd(); };
		}

		// Click to play/pause
		video.onclick = () => { video.paused ? video.play() : video.pause(); };

		if (o.container) o.container.appendChild(el);

		return {
			el,
			video,
			play() { video.play(); },
			pause() { video.pause(); },
			seek(t) { video.currentTime = t; },
			setSource(src) { video.src = src; },
			destroy() { video.pause(); el.remove(); },
		};
	}
}
