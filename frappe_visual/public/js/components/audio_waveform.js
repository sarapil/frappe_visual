/**
 * AudioWaveform — Canvas-based audio visualization with playback
 *
 * frappe.visual.AudioWaveform.create({
 *   container: el,
 *   src: "/path/to/audio.mp3",
 *   waveColor: "#6366f1",
 *   progressColor: "#818cf8",
 *   height: 80,
 *   barWidth: 3,
 *   barGap: 1,
 *   showTime: true,
 *   onReady: () => {},
 *   onPlay: () => {},
 *   onEnd: () => {},
 * })
 */
export class AudioWaveform {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			src: "",
			waveColor: "#d1d5db",
			progressColor: "#6366f1",
			cursorColor: "#ef4444",
			height: 80,
			barWidth: 3,
			barGap: 1,
			showTime: true,
			responsive: true,
			onReady: null,
			onPlay: null,
			onPause: null,
			onEnd: null,
		}, opts);

		const el = document.createElement("div");
		el.className = "fv-audio-waveform";

		el.innerHTML = `
			<div class="fv-audio-waveform__canvas-wrap">
				<canvas class="fv-audio-waveform__canvas" height="${o.height}"></canvas>
				<div class="fv-audio-waveform__cursor"></div>
			</div>
			<div class="fv-audio-waveform__controls">
				<button class="fv-audio-waveform__play" aria-label="Play">▶</button>
				${o.showTime ? `<span class="fv-audio-waveform__time">0:00 / 0:00</span>` : ""}
			</div>
		`;

		const canvas = el.querySelector("canvas");
		const ctx = canvas.getContext("2d");
		const cursor = el.querySelector(".fv-audio-waveform__cursor");
		const playBtn = el.querySelector(".fv-audio-waveform__play");
		const timeEl = el.querySelector(".fv-audio-waveform__time");

		const audio = new Audio();
		audio.crossOrigin = "anonymous";
		audio.preload = "auto";
		audio.src = o.src;

		let peaks = [];
		let duration = 0;
		let animFrame = null;

		function fmt(s) {
			const m = Math.floor(s / 60);
			const sec = Math.floor(s % 60);
			return `${m}:${sec < 10 ? "0" : ""}${sec}`;
		}

		// Decode audio and extract peaks
		async function analyze() {
			try {
				const resp = await fetch(o.src);
				const buf = await resp.arrayBuffer();
				const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
				const decoded = await audioCtx.decodeAudioData(buf);
				const raw = decoded.getChannelData(0);
				const barsCount = Math.floor(canvas.width / (o.barWidth + o.barGap));
				const samplesPerBar = Math.floor(raw.length / barsCount);
				peaks = [];
				for (let i = 0; i < barsCount; i++) {
					let sum = 0;
					for (let j = 0; j < samplesPerBar; j++) {
						sum += Math.abs(raw[i * samplesPerBar + j] || 0);
					}
					peaks.push(sum / samplesPerBar);
				}
				const maxPeak = Math.max(...peaks, 0.01);
				peaks = peaks.map(p => p / maxPeak);
				audioCtx.close();
				drawWaveform(0);
				if (o.onReady) o.onReady();
			} catch (e) {
				// Fallback: generate random waveform
				const barsCount = Math.floor(canvas.width / (o.barWidth + o.barGap));
				peaks = Array.from({ length: barsCount }, () => 0.2 + Math.random() * 0.8);
				drawWaveform(0);
			}
		}

		function drawWaveform(progress) {
			const w = canvas.width;
			const h = canvas.height;
			ctx.clearRect(0, 0, w, h);
			const mid = h / 2;
			const barCount = peaks.length;
			const progressIndex = Math.floor(progress * barCount);

			for (let i = 0; i < barCount; i++) {
				const x = i * (o.barWidth + o.barGap);
				const barH = peaks[i] * mid * 0.9;
				ctx.fillStyle = i <= progressIndex ? o.progressColor : o.waveColor;
				ctx.fillRect(x, mid - barH, o.barWidth, barH * 2);
			}
		}

		function animate() {
			if (!audio.paused && duration > 0) {
				const progress = audio.currentTime / duration;
				drawWaveform(progress);
				cursor.style.left = (progress * 100) + "%";
				if (timeEl) timeEl.textContent = `${fmt(audio.currentTime)} / ${fmt(duration)}`;
			}
			animFrame = requestAnimationFrame(animate);
		}

		audio.onloadedmetadata = () => { duration = audio.duration; };
		audio.onplay = () => { playBtn.textContent = "⏸"; el.classList.add("fv-audio-waveform--playing"); animate(); if (o.onPlay) o.onPlay(); };
		audio.onpause = () => { playBtn.textContent = "▶"; el.classList.remove("fv-audio-waveform--playing"); cancelAnimationFrame(animFrame); if (o.onPause) o.onPause(); };
		audio.onended = () => { el.classList.remove("fv-audio-waveform--playing"); cancelAnimationFrame(animFrame); drawWaveform(0); cursor.style.left = "0%"; if (o.onEnd) o.onEnd(); };

		playBtn.onclick = () => { audio.paused ? audio.play() : audio.pause(); };

		// Click to seek
		canvas.parentElement.onclick = (e) => {
			if (!duration) return;
			const rect = canvas.getBoundingClientRect();
			const pct = (e.clientX - rect.left) / rect.width;
			audio.currentTime = pct * duration;
			drawWaveform(pct);
			cursor.style.left = (pct * 100) + "%";
		};

		// Responsive
		function resize() {
			canvas.width = canvas.parentElement.clientWidth;
			if (peaks.length) drawWaveform(duration ? audio.currentTime / duration : 0);
		}

		if (o.responsive) {
			const ro = new ResizeObserver(resize);
			if (o.container) ro.observe(o.container);
		}

		if (o.container) o.container.appendChild(el);
		requestAnimationFrame(() => { resize(); analyze(); });

		return {
			el,
			audio,
			play() { audio.play(); },
			pause() { audio.pause(); },
			seek(t) { audio.currentTime = t; },
			setSource(src) { audio.src = src; peaks = []; analyze(); },
			destroy() { audio.pause(); cancelAnimationFrame(animFrame); el.remove(); },
		};
	}
}
