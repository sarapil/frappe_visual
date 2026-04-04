// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualMap — Leaflet-Based Map View
 * ====================================
 * Renders geo-located records on an interactive map with
 * ColorSystem markers, FloatingWindow detail popups,
 * animated marker entrance, and clustering.
 *
 * Usage:
 *   frappe.visual.map('#container', {
 *     doctype: 'Customer',
 *     locationField: 'location',       // or lat/lng fields
 *     latField: 'latitude',
 *     lngField: 'longitude',
 *     titleField: 'customer_name',
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class VisualMap {
	static create(container, opts) {
		return new VisualMap(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign(
			{
				doctype: null,
				locationField: "location",  // Geolocation field
				latField: "latitude",
				lngField: "longitude",
				titleField: "name",
				colorField: null,
				filters: {},
				onMarkerClick: null,
				center: [24.7136, 46.6753],  // Riyadh default
				zoom: 6,
				animate: true,
				tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
				tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			},
			opts
		);

		this._records = [];
		this._markers = [];
		this._map = null;
		this._gsap = null;
		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		await this._ensureLeaflet();
		this._build();
		if (this.opts.doctype) await this._fetchData();
		this._renderMarkers();
	}

	/* ── Ensure Leaflet is available ─────────────────────────── */
	async _ensureLeaflet() {
		if (window.L) return;
		// Leaflet is bundled with Frappe (MapView uses it).
		// If somehow not available, load from CDN.
		try {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
			document.head.appendChild(link);

			await new Promise((resolve, reject) => {
				const script = document.createElement("script");
				script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});
		} catch (e) {
			console.error("VisualMap: Failed to load Leaflet", e);
		}
	}

	/* ── DOM Structure ─────────────────────────────────────────── */
	_build() {
		this.container.classList.add("fv-map", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Toolbar
		const toolbar = this._el("div", "fv-map-toolbar fv-fx-glass");
		toolbar.innerHTML = `
			<div class="fv-map-title-wrap">
				<svg class="fv-map-pin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
				</svg>
				<h3 class="fv-map-title fv-fx-gradient-text">${this.opts.doctype ? __(this.opts.doctype) : __("Map")}</h3>
				<span class="fv-map-count"></span>
			</div>
			<div class="fv-map-actions">
				<button class="fv-map-btn fv-map-fit-btn fv-fx-hover-scale" title="${__("Fit to View")}">${__("Fit")}</button>
				<button class="fv-map-btn fv-map-locate-btn fv-fx-hover-scale" title="${__("My Location")}">📍</button>
			</div>`;
		this.container.appendChild(toolbar);

		toolbar.querySelector(".fv-map-fit-btn").addEventListener("click", () => this._fitBounds());
		toolbar.querySelector(".fv-map-locate-btn").addEventListener("click", () => this._locateMe());

		// Map container
		this._mapEl = this._el("div", "fv-map-canvas");
		this._mapEl.id = `fv-map-${Date.now()}`;
		this.container.appendChild(this._mapEl);

		// Initialize Leaflet map
		if (window.L) {
			this._map = L.map(this._mapEl.id, {
				center: this.opts.center,
				zoom: this.opts.zoom,
				zoomControl: true,
				scrollWheelZoom: true,
			});

			L.tileLayer(this.opts.tileUrl, {
				attribution: this.opts.tileAttribution,
				maxZoom: 19,
			}).addTo(this._map);

			// Scale control
			L.control.scale().addTo(this._map);
		}
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	/* ── Data ──────────────────────────────────────────────────── */
	async _fetchData() {
		if (!this.opts.doctype) return;

		const fields = [...new Set([
			"name", this.opts.titleField,
			this.opts.locationField, this.opts.latField, this.opts.lngField,
			this.opts.colorField,
		].filter(Boolean))];

		try {
			this._records = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields,
				filters: this.opts.filters || {},
				limit_page_length: 500,
			});
		} catch (e) {
			console.error("VisualMap: fetch failed", e);
			this._records = [];
		}
	}

	/* ── Render Markers ───────────────────────────────────────── */
	_renderMarkers() {
		if (!this._map || !window.L) return;

		// Clear old markers
		this._markers.forEach((m) => m.remove());
		this._markers = [];

		const bounds = [];
		let count = 0;

		this._records.forEach((rec, idx) => {
			const pos = this._extractPosition(rec);
			if (!pos) return;

			const title = rec[this.opts.titleField] || rec.name;
			const color = this.opts.colorField && rec[this.opts.colorField]
				? rec[this.opts.colorField]
				: ColorSystem.autoColor(title).border;

			// Custom colored SVG marker
			const markerIcon = L.divIcon({
				className: "fv-map-marker-icon",
				html: `<div class="fv-map-marker fv-fx-hover-scale" style="--fv-marker-color:${color}">
					<svg width="28" height="36" viewBox="0 0 28 36">
						<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}" opacity="0.9"/>
						<circle cx="14" cy="14" r="6" fill="white" opacity="0.85"/>
					</svg>
				</div>`,
				iconSize: [28, 36],
				iconAnchor: [14, 36],
				popupAnchor: [0, -36],
			});

			const marker = L.marker([pos.lat, pos.lng], { icon: markerIcon })
				.addTo(this._map);

			// Popup
			const popupContent = `
				<div class="fv-map-popup fv-fx-glass">
					<strong>${frappe.utils.escape_html(title)}</strong>
					<br><small class="text-muted">${rec.name}</small>
					<br><a href="/app/${this.opts.doctype.toLowerCase().replace(/ /g, "-")}/${rec.name}" class="fv-map-popup-link">${__("Open")}</a>
				</div>`;
			marker.bindPopup(popupContent);

			marker.on("click", () => {
				if (this.opts.onMarkerClick) {
					this.opts.onMarkerClick(rec, marker);
				}
			});

			this._markers.push(marker);
			bounds.push([pos.lat, pos.lng]);
			count++;
		});

		// Update count
		const countEl = this.container.querySelector(".fv-map-count");
		if (countEl) countEl.textContent = count > 0 ? `(${count})` : "";

		// Fit bounds
		if (bounds.length > 1) {
			this._map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
		} else if (bounds.length === 1) {
			this._map.setView(bounds[0], 14);
		}

		// GSAP stagger entrance
		if (this._gsap && this.opts.animate) {
			const markerEls = this.container.querySelectorAll(".fv-map-marker");
			if (markerEls.length) {
				this._gsap.from(markerEls, {
					scale: 0, y: -20, opacity: 0,
					duration: 0.4, stagger: 0.03, ease: "back.out(1.7)",
				});
			}
		}
	}

	_extractPosition(rec) {
		// Try GeoJSON location field
		if (rec[this.opts.locationField]) {
			try {
				const geo = typeof rec[this.opts.locationField] === "string"
					? JSON.parse(rec[this.opts.locationField])
					: rec[this.opts.locationField];
				if (geo.features?.[0]?.geometry?.coordinates) {
					const [lng, lat] = geo.features[0].geometry.coordinates;
					return { lat, lng };
				}
			} catch (e) { /* ignore */ }
		}
		// Try lat/lng fields
		const lat = parseFloat(rec[this.opts.latField]);
		const lng = parseFloat(rec[this.opts.lngField]);
		if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
			return { lat, lng };
		}
		return null;
	}

	/* ── Actions ───────────────────────────────────────────────── */
	_fitBounds() {
		if (!this._map || !this._markers.length) return;
		const group = L.featureGroup(this._markers);
		this._map.fitBounds(group.getBounds(), { padding: [30, 30] });
	}

	_locateMe() {
		if (!this._map) return;
		this._map.locate({ setView: true, maxZoom: 14 });
	}

	/* ── Public API ────────────────────────────────────────────── */
	setRecords(records) { this._records = records; this._renderMarkers(); }
	refresh() { this._fetchData().then(() => this._renderMarkers()); }
	getMap() { return this._map; }
	destroy() {
		if (this._map) { this._map.remove(); this._map = null; }
		this.container.innerHTML = "";
		this.container.classList.remove("fv-map");
	}
}
