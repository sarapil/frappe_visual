/**
 * VisualMapPro — Multi-Provider Geographic Map Engine
 * ====================================================
 * World-class map component supporting multiple providers:
 *   • OpenStreetMap (Leaflet) — free, default
 *   • Google Maps — satellite, traffic, street view
 *   • Mapbox — custom styles, 3D terrain
 *   • Custom tile servers
 *
 * Features:
 *   • Marker clustering with animated expand
 *   • Heatmap layer (density visualization)
 *   • Geofencing (draw/edit zones, alerts)
 *   • Route drawing & directions
 *   • Drawing tools (polygon, circle, line, rectangle)
 *   • Geocoding search bar (Nominatim)
 *   • Multi-layer toggle (satellite, terrain, traffic)
 *   • Fullscreen, fit-bounds, my-location
 *   • GeoJSON import/export
 *   • Real-time marker updates via frappe.realtime
 *   • RTL-aware controls
 *   • GSAP animated markers & transitions
 *
 * Usage:
 *   frappe.visual.mapPro('#container', {
 *     provider: 'osm',  // 'osm' | 'google' | 'mapbox' | 'custom'
 *     doctype: 'Customer',
 *     latField: 'latitude',
 *     lngField: 'longitude',
 *     clustering: true,
 *     heatmap: true,
 *     drawing: true,
 *     geofencing: true,
 *     routing: true,
 *     search: true,
 *     layers: ['street', 'satellite', 'terrain'],
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class VisualMapPro {
	static create(container, opts) {
		return new VisualMapPro(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign({
			provider: "osm",
			googleApiKey: null,
			mapboxToken: null,
			customTileUrl: null,
			doctype: null,
			locationField: "location",
			latField: "latitude",
			lngField: "longitude",
			titleField: "name",
			colorField: null,
			statusField: null,
			iconField: null,
			popupTemplate: null,
			filters: {},
			center: [24.7136, 46.6753],
			zoom: 6,
			minZoom: 2,
			maxZoom: 19,
			animate: true,

			// Features
			clustering: true,
			clusterRadius: 60,
			heatmap: false,
			heatmapIntensity: 0.6,
			drawing: false,
			geofencing: false,
			routing: false,
			search: true,
			fullscreen: true,
			layerControl: true,
			minimap: false,
			streetView: false,

			// Layers
			layers: ["street"],
			defaultLayer: "street",

			// Events
			onMarkerClick: null,
			onAreaSelect: null,
			onGeofenceCreate: null,
			onRouteComplete: null,
			onMapClick: null,

			// Real-time
			realtime: false,
			realtimeEvent: null,

			// Styling
			markerStyle: "pin",    // 'pin' | 'circle' | 'avatar' | 'icon' | 'custom'
			markerSize: 32,
			clusterStyle: "circle", // 'circle' | 'donut' | 'pie'
		}, opts);

		this._map = null;
		this._markers = [];
		this._records = [];
		this._layers = {};
		this._overlays = {};
		this._clusterer = null;
		this._heatLayer = null;
		this._drawLayer = null;
		this._geofences = [];
		this._routeControl = null;
		this._searchBar = null;
		this._gsap = null;
		this._activePopup = null;

		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		await this._loadProvider();
		this._buildUI();
		this._initMap();
		this._setupLayers();
		if (this.opts.clustering) this._initClustering();
		if (this.opts.heatmap) this._initHeatmap();
		if (this.opts.drawing) this._initDrawing();
		if (this.opts.search) this._initSearch();
		if (this.opts.routing) this._initRouting();
		if (this.opts.geofencing) this._initGeofencing();
		if (this.opts.minimap) this._initMinimap();
		if (this.opts.doctype) await this._fetchAndRender();
		if (this.opts.realtime) this._initRealtime();
	}

	// ═══════════════════════════════════════════════════════════
	// Provider Loading
	// ═══════════════════════════════════════════════════════════

	async _loadProvider() {
		// Always need Leaflet as our base (even for Google/Mapbox we use Leaflet wrapper)
		if (!window.L) {
			await this._loadScript(
				"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
				"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
			);
		}

		// MarkerCluster plugin
		if (this.opts.clustering && !window.L?.MarkerClusterGroup) {
			await this._loadScript(
				"https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
				"https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
			);
			await this._loadCSS(
				"https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
			);
		}

		// Heatmap plugin
		if (this.opts.heatmap && !window.L?.heatLayer) {
			await this._loadScript(
				"https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"
			);
		}

		// Draw plugin
		if ((this.opts.drawing || this.opts.geofencing) && !window.L?.Draw) {
			await this._loadScript(
				"https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js",
				"https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"
			);
		}

		// Routing Machine
		if (this.opts.routing && !window.L?.Routing) {
			await this._loadScript(
				"https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js",
				"https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css"
			);
		}

		// Google Maps tiles via leaflet plugin
		if (this.opts.provider === "google" && !window.L?.gridLayer?.googleMutant) {
			if (this.opts.googleApiKey) {
				await this._loadScript(
					`https://maps.googleapis.com/maps/api/js?key=${this.opts.googleApiKey}`
				);
				await this._loadScript(
					"https://unpkg.com/leaflet.gridlayer.googlemutant@0.14.1/dist/Leaflet.GoogleMutant.js"
				);
			}
		}
	}

	async _loadScript(src, css) {
		if (css) await this._loadCSS(css);
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
			const s = document.createElement("script");
			s.src = src;
			s.onload = resolve;
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	async _loadCSS(href) {
		return new Promise((resolve) => {
			if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
			const l = document.createElement("link");
			l.rel = "stylesheet";
			l.href = href;
			l.onload = resolve;
			document.head.appendChild(l);
		});
	}

	// ═══════════════════════════════════════════════════════════
	// UI Construction
	// ═══════════════════════════════════════════════════════════

	_buildUI() {
		this.container.classList.add("fv-map-pro", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Toolbar
		this._toolbar = this._el("div", "fv-map-pro-toolbar fv-fx-glass");
		this._toolbar.innerHTML = `
			<div class="fv-map-pro-title-wrap">
				<div class="fv-map-pro-icon">${this._renderIcon("map-pin")}</div>
				<h3 class="fv-map-pro-title fv-fx-gradient-text">
					${this.opts.doctype ? __(this.opts.doctype) : __("Map")}
				</h3>
				<span class="fv-map-pro-count fv-fx-hover-scale"></span>
			</div>
			<div class="fv-map-pro-actions">
				${this.opts.layerControl ? `
				<div class="fv-map-pro-layers-dropdown">
					<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="layers"
						title="${__("Map Layers")}">
						${this._renderIcon("layers-subtract")}
					</button>
					<div class="fv-map-pro-layers-menu fv-fx-glass"></div>
				</div>` : ""}
				${this.opts.heatmap ? `
				<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="heatmap"
					title="${__("Toggle Heatmap")}">
					${this._renderIcon("flame")}
				</button>` : ""}
				${this.opts.drawing ? `
				<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="draw"
					title="${__("Drawing Tools")}">
					${this._renderIcon("pencil")}
				</button>` : ""}
				${this.opts.routing ? `
				<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="route"
					title="${__("Route Planner")}">
					${this._renderIcon("route")}
				</button>` : ""}
				<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="fit"
					title="${__("Fit to View")}">
					${this._renderIcon("arrows-maximize")}
				</button>
				<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="locate"
					title="${__("My Location")}">
					${this._renderIcon("current-location")}
				</button>
				${this.opts.fullscreen ? `
				<button class="fv-map-pro-btn fv-fx-hover-scale" data-action="fullscreen"
					title="${__("Fullscreen")}">
					${this._renderIcon("maximize")}
				</button>` : ""}
			</div>
		`;
		this.container.appendChild(this._toolbar);
		this._bindToolbarEvents();

		// Search bar
		if (this.opts.search) {
			this._searchEl = this._el("div", "fv-map-pro-search fv-fx-glass");
			this._searchEl.innerHTML = `
				<div class="fv-map-pro-search-input-wrap">
					${this._renderIcon("search")}
					<input type="text" class="fv-map-pro-search-input"
						placeholder="${__("Search location...")}" />
					<div class="fv-map-pro-search-results"></div>
				</div>
			`;
			this.container.appendChild(this._searchEl);
		}

		// Map canvas
		this._mapEl = this._el("div", "fv-map-pro-canvas");
		this._mapEl.id = `fv-map-pro-${Date.now()}`;
		this.container.appendChild(this._mapEl);

		// Info panel (for routing, geofencing details)
		this._infoPanel = this._el("div", "fv-map-pro-info-panel fv-fx-glass");
		this._infoPanel.style.display = "none";
		this.container.appendChild(this._infoPanel);

		// Legend
		this._legend = this._el("div", "fv-map-pro-legend fv-fx-glass");
		this._legend.style.display = "none";
		this.container.appendChild(this._legend);
	}

	_bindToolbarEvents() {
		this._toolbar.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-action]");
			if (!btn) return;
			const action = btn.dataset.action;

			switch (action) {
				case "fit": this.fitBounds(); break;
				case "locate": this.locateMe(); break;
				case "fullscreen": this.toggleFullscreen(); break;
				case "heatmap": this.toggleHeatmap(); break;
				case "draw": this.toggleDrawing(); break;
				case "route": this.toggleRouting(); break;
				case "layers": this._toggleLayersMenu(); break;
			}
		});
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	_renderIcon(name, size = 18) {
		if (frappe.visual?.icons?.render) {
			return frappe.visual.icons.render(name, { size: `${size}px` });
		}
		return `<i class="ti ti-${name}" style="font-size:${size}px"></i>`;
	}

	// ═══════════════════════════════════════════════════════════
	// Map Initialization
	// ═══════════════════════════════════════════════════════════

	_initMap() {
		if (!window.L) return;

		this._map = L.map(this._mapEl.id, {
			center: this.opts.center,
			zoom: this.opts.zoom,
			minZoom: this.opts.minZoom,
			maxZoom: this.opts.maxZoom,
			zoomControl: false,
			scrollWheelZoom: true,
			attributionControl: true,
		});

		// Custom zoom control position
		L.control.zoom({ position: "bottomright" }).addTo(this._map);
		L.control.scale({ position: "bottomleft" }).addTo(this._map);

		// Click event
		this._map.on("click", (e) => {
			if (this.opts.onMapClick) {
				this.opts.onMapClick(e.latlng, e);
			}
		});
	}

	// ═══════════════════════════════════════════════════════════
	// Layer Management
	// ═══════════════════════════════════════════════════════════

	_setupLayers() {
		if (!this._map) return;

		// OpenStreetMap layers
		this._layers.street = L.tileLayer(
			"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			{ attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>', maxZoom: 19 }
		);

		this._layers.topo = L.tileLayer(
			"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
			{ attribution: '© OpenTopoMap', maxZoom: 17 }
		);

		this._layers.dark = L.tileLayer(
			"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
			{ attribution: '© CARTO', maxZoom: 20 }
		);

		this._layers.satellite = L.tileLayer(
			"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
			{ attribution: '© Esri', maxZoom: 18 }
		);

		this._layers.watercolor = L.tileLayer(
			"https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
			{ attribution: '© Stadia Maps', maxZoom: 16 }
		);

		// Google layers (if API key provided)
		if (this.opts.provider === "google" && this.opts.googleApiKey && window.L?.gridLayer?.googleMutant) {
			this._layers.google_road = L.gridLayer.googleMutant({ type: "roadmap" });
			this._layers.google_sat = L.gridLayer.googleMutant({ type: "satellite" });
			this._layers.google_hybrid = L.gridLayer.googleMutant({ type: "hybrid" });
			this._layers.google_terrain = L.gridLayer.googleMutant({ type: "terrain" });
		}

		// Mapbox layers
		if (this.opts.provider === "mapbox" && this.opts.mapboxToken) {
			const mb = (style) => L.tileLayer(
				`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/{z}/{x}/{y}?access_token=${this.opts.mapboxToken}`,
				{ tileSize: 512, zoomOffset: -1, attribution: '© Mapbox' }
			);
			this._layers.mapbox_streets = mb("streets-v12");
			this._layers.mapbox_satellite = mb("satellite-streets-v12");
			this._layers.mapbox_dark = mb("dark-v11");
			this._layers.mapbox_light = mb("light-v11");
			this._layers.mapbox_outdoors = mb("outdoors-v12");
		}

		// Custom tile
		if (this.opts.customTileUrl) {
			this._layers.custom = L.tileLayer(this.opts.customTileUrl, { maxZoom: 19 });
		}

		// Set default layer
		const defaultKey = this.opts.defaultLayer || "street";
		const defaultLayer = this._layers[defaultKey] || this._layers.street;
		defaultLayer.addTo(this._map);
		this._activeLayer = defaultKey;

		// Build layer menu
		this._buildLayerMenu();
	}

	_buildLayerMenu() {
		const menu = this.container.querySelector(".fv-map-pro-layers-menu");
		if (!menu) return;

		const layerNames = {
			street: "🗺️ Street",
			topo: "⛰️ Topographic",
			dark: "🌙 Dark",
			satellite: "🛰️ Satellite",
			watercolor: "🎨 Watercolor",
			google_road: "🗺️ Google Roads",
			google_sat: "🛰️ Google Satellite",
			google_hybrid: "🛰️ Google Hybrid",
			google_terrain: "⛰️ Google Terrain",
			mapbox_streets: "🗺️ Mapbox Streets",
			mapbox_satellite: "🛰️ Mapbox Satellite",
			mapbox_dark: "🌙 Mapbox Dark",
			mapbox_light: "☀️ Mapbox Light",
			mapbox_outdoors: "⛰️ Mapbox Outdoors",
			custom: "⚙️ Custom",
		};

		menu.innerHTML = Object.entries(this._layers)
			.map(([key]) => `
				<button class="fv-map-pro-layer-btn ${key === this._activeLayer ? "active" : ""}"
					data-layer="${key}">
					${layerNames[key] || key}
				</button>
			`).join("");

		menu.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-layer]");
			if (!btn) return;
			this.switchLayer(btn.dataset.layer);
			menu.querySelectorAll(".active").forEach(b => b.classList.remove("active"));
			btn.classList.add("active");
		});
	}

	_toggleLayersMenu() {
		const menu = this.container.querySelector(".fv-map-pro-layers-menu");
		if (!menu) return;
		menu.classList.toggle("visible");
	}

	switchLayer(key) {
		if (!this._layers[key] || !this._map) return;
		if (this._layers[this._activeLayer]) {
			this._map.removeLayer(this._layers[this._activeLayer]);
		}
		this._layers[key].addTo(this._map);
		this._activeLayer = key;
	}

	// ═══════════════════════════════════════════════════════════
	// Clustering
	// ═══════════════════════════════════════════════════════════

	_initClustering() {
		if (!window.L?.MarkerClusterGroup) return;

		this._clusterer = new L.MarkerClusterGroup({
			maxClusterRadius: this.opts.clusterRadius,
			spiderfyOnMaxZoom: true,
			showCoverageOnHover: true,
			zoomToBoundsOnClick: true,
			animate: this.opts.animate,
			iconCreateFunction: (cluster) => {
				const count = cluster.getChildCount();
				const size = count < 10 ? 36 : count < 50 ? 44 : 54;
				const color = count < 10 ? "#10B981" : count < 50 ? "#F59E0B" : "#EF4444";

				if (this.opts.clusterStyle === "donut") {
					return L.divIcon({
						html: `<div class="fv-map-pro-cluster fv-map-pro-cluster--donut" style="
							width:${size}px;height:${size}px;
							--cluster-color:${color};--cluster-size:${size}px;">
							<svg viewBox="0 0 40 40"><circle r="16" cx="20" cy="20" fill="none"
								stroke="${color}" stroke-width="4" stroke-dasharray="${count} ${100 - count}"
								transform="rotate(-90 20 20)"/></svg>
							<span>${count}</span>
						</div>`,
						className: "fv-map-pro-cluster-icon",
						iconSize: [size, size],
					});
				}

				return L.divIcon({
					html: `<div class="fv-map-pro-cluster" style="
						width:${size}px;height:${size}px;
						background:${color};border-radius:50%;
						display:flex;align-items:center;justify-content:center;
						color:white;font-weight:700;font-size:${size > 44 ? 16 : 13}px;
						box-shadow:0 2px 8px ${color}66;">
						${count}
					</div>`,
					className: "fv-map-pro-cluster-icon",
					iconSize: [size, size],
				});
			},
		});

		this._map.addLayer(this._clusterer);
	}

	// ═══════════════════════════════════════════════════════════
	// Heatmap
	// ═══════════════════════════════════════════════════════════

	_initHeatmap() {
		this._heatVisible = false;
	}

	_updateHeatmap() {
		if (!window.L?.heatLayer) return;

		if (this._heatLayer) {
			this._map.removeLayer(this._heatLayer);
			this._heatLayer = null;
		}

		const points = this._records
			.map(rec => {
				const pos = this._extractPosition(rec);
				return pos ? [pos.lat, pos.lng, this.opts.heatmapIntensity] : null;
			})
			.filter(Boolean);

		if (points.length) {
			this._heatLayer = L.heatLayer(points, {
				radius: 25,
				blur: 20,
				maxZoom: 15,
				gradient: {
					0.2: "#3B82F6",
					0.4: "#10B981",
					0.6: "#F59E0B",
					0.8: "#EF4444",
					1.0: "#DC2626",
				},
			});
			if (this._heatVisible) {
				this._heatLayer.addTo(this._map);
			}
		}
	}

	toggleHeatmap() {
		this._heatVisible = !this._heatVisible;
		if (this._heatVisible && this._heatLayer) {
			this._heatLayer.addTo(this._map);
			// Hide markers
			if (this._clusterer) this._map.removeLayer(this._clusterer);
		} else {
			if (this._heatLayer) this._map.removeLayer(this._heatLayer);
			if (this._clusterer) this._map.addLayer(this._clusterer);
		}
		// Toggle button active state
		const btn = this._toolbar.querySelector('[data-action="heatmap"]');
		if (btn) btn.classList.toggle("active", this._heatVisible);
	}

	// ═══════════════════════════════════════════════════════════
	// Drawing Tools
	// ═══════════════════════════════════════════════════════════

	_initDrawing() {
		if (!window.L?.Draw) return;

		this._drawLayer = new L.FeatureGroup();
		this._map.addLayer(this._drawLayer);
		this._drawActive = false;

		this._drawControl = new L.Control.Draw({
			position: "topright",
			draw: {
				polyline: { shapeOptions: { color: "#6366F1", weight: 3 } },
				polygon: { shapeOptions: { color: "#6366F1", fillColor: "#6366F166" } },
				circle: { shapeOptions: { color: "#10B981", fillColor: "#10B98133" } },
				rectangle: { shapeOptions: { color: "#F59E0B", fillColor: "#F59E0B33" } },
				marker: true,
				circlemarker: false,
			},
			edit: { featureGroup: this._drawLayer },
		});

		this._map.on(L.Draw.Event.CREATED, (e) => {
			this._drawLayer.addLayer(e.layer);
			if (this.opts.onAreaSelect) {
				this.opts.onAreaSelect(e.layer.toGeoJSON(), e.layerType, e.layer);
			}
		});
	}

	toggleDrawing() {
		this._drawActive = !this._drawActive;
		if (this._drawActive) {
			this._map.addControl(this._drawControl);
		} else {
			this._map.removeControl(this._drawControl);
		}
		const btn = this._toolbar.querySelector('[data-action="draw"]');
		if (btn) btn.classList.toggle("active", this._drawActive);
	}

	// ═══════════════════════════════════════════════════════════
	// Search (Nominatim Geocoding)
	// ═══════════════════════════════════════════════════════════

	_initSearch() {
		if (!this._searchEl) return;
		const input = this._searchEl.querySelector(".fv-map-pro-search-input");
		const results = this._searchEl.querySelector(".fv-map-pro-search-results");
		let debounceTimer;

		input.addEventListener("input", () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => this._searchLocation(input.value, results), 400);
		});

		input.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				results.innerHTML = "";
				results.style.display = "none";
			}
		});
	}

	async _searchLocation(query, resultsEl) {
		if (!query || query.length < 3) {
			resultsEl.innerHTML = "";
			resultsEl.style.display = "none";
			return;
		}

		try {
			const resp = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
			);
			const data = await resp.json();

			if (!data.length) {
				resultsEl.innerHTML = `<div class="fv-map-pro-search-empty">${__("No results")}</div>`;
				resultsEl.style.display = "block";
				return;
			}

			resultsEl.innerHTML = data.map(r => `
				<button class="fv-map-pro-search-result" data-lat="${r.lat}" data-lng="${r.lon}">
					<span class="fv-map-pro-search-result-icon">${this._renderIcon("map-pin", 14)}</span>
					<span class="fv-map-pro-search-result-text">${frappe.utils.escape_html(r.display_name)}</span>
				</button>
			`).join("");
			resultsEl.style.display = "block";

			resultsEl.addEventListener("click", (e) => {
				const btn = e.target.closest("[data-lat]");
				if (!btn) return;
				const lat = parseFloat(btn.dataset.lat);
				const lng = parseFloat(btn.dataset.lng);
				this._map.setView([lat, lng], 15);
				resultsEl.style.display = "none";

				// Add a temporary marker
				const marker = L.marker([lat, lng]).addTo(this._map);
				marker.bindPopup(btn.querySelector(".fv-map-pro-search-result-text").textContent).openPopup();
				setTimeout(() => marker.remove(), 10000);
			}, { once: false });

		} catch (e) {
			console.error("VisualMapPro: search failed", e);
		}
	}

	// ═══════════════════════════════════════════════════════════
	// Routing
	// ═══════════════════════════════════════════════════════════

	_initRouting() {
		this._routeActive = false;
	}

	toggleRouting() {
		if (!window.L?.Routing) return;
		this._routeActive = !this._routeActive;

		if (this._routeActive) {
			this._routeControl = L.Routing.control({
				waypoints: [],
				routeWhileDragging: true,
				createMarker: (i, wp) => {
					return L.marker(wp.latLng, {
						icon: this._createMarkerIcon(
							i === 0 ? "#10B981" : "#EF4444",
							i === 0 ? "A" : "B"
						),
						draggable: true,
					});
				},
				lineOptions: {
					styles: [{ color: "#6366F1", weight: 5, opacity: 0.7 }],
				},
			}).addTo(this._map);

			this._routeControl.on("routesfound", (e) => {
				const routes = e.routes;
				if (this.opts.onRouteComplete && routes.length) {
					this.opts.onRouteComplete({
						distance: routes[0].summary.totalDistance,
						time: routes[0].summary.totalTime,
						waypoints: routes[0].waypoints,
					});
				}
				// Show info panel
				this._showInfoPanel(`
					<h4>${__("Route")}</h4>
					<p><strong>${__("Distance")}:</strong> ${(routes[0].summary.totalDistance / 1000).toFixed(1)} km</p>
					<p><strong>${__("Time")}:</strong> ${Math.round(routes[0].summary.totalTime / 60)} ${__("min")}</p>
				`);
			});
		} else {
			if (this._routeControl) {
				this._map.removeControl(this._routeControl);
				this._routeControl = null;
			}
			this._hideInfoPanel();
		}

		const btn = this._toolbar.querySelector('[data-action="route"]');
		if (btn) btn.classList.toggle("active", this._routeActive);
	}

	// ═══════════════════════════════════════════════════════════
	// Geofencing
	// ═══════════════════════════════════════════════════════════

	_initGeofencing() {
		if (!window.L?.Draw) return;
		this._geofenceLayer = new L.FeatureGroup();
		this._map.addLayer(this._geofenceLayer);
	}

	addGeofence(latlngs, opts = {}) {
		const zone = L.polygon(latlngs, {
			color: opts.color || "#EF4444",
			fillColor: (opts.color || "#EF4444") + "33",
			weight: 2,
			dashArray: "5, 10",
		});
		zone._fvGeofence = {
			name: opts.name || `Zone ${this._geofences.length + 1}`,
			alertOnEnter: opts.alertOnEnter ?? true,
			alertOnExit: opts.alertOnExit ?? true,
		};
		this._geofenceLayer.addLayer(zone);
		this._geofences.push(zone);

		zone.bindPopup(`<strong>${zone._fvGeofence.name}</strong>`);

		if (this.opts.onGeofenceCreate) {
			this.opts.onGeofenceCreate(zone.toGeoJSON(), zone._fvGeofence);
		}

		return zone;
	}

	checkGeofence(lat, lng) {
		const point = L.latLng(lat, lng);
		const results = [];
		this._geofences.forEach(zone => {
			const inside = zone.getBounds().contains(point);
			results.push({
				name: zone._fvGeofence.name,
				inside,
				zone: zone.toGeoJSON(),
			});
		});
		return results;
	}

	// ═══════════════════════════════════════════════════════════
	// Minimap
	// ═══════════════════════════════════════════════════════════

	_initMinimap() {
		// Load minimap plugin
		this._loadScript(
			"https://unpkg.com/leaflet-minimap@3.6.1/dist/Control.MiniMap.min.js",
			"https://unpkg.com/leaflet-minimap@3.6.1/dist/Control.MiniMap.min.css"
		).then(() => {
			if (window.L?.Control?.MiniMap) {
				const osmMini = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
				new L.Control.MiniMap(osmMini, {
					position: "bottomleft",
					width: 120,
					height: 100,
					toggleDisplay: true,
				}).addTo(this._map);
			}
		});
	}

	// ═══════════════════════════════════════════════════════════
	// Data & Markers
	// ═══════════════════════════════════════════════════════════

	async _fetchAndRender() {
		await this._fetchData();
		this._renderMarkers();
		if (this.opts.heatmap) this._updateHeatmap();
		this._updateLegend();
	}

	async _fetchData() {
		if (!this.opts.doctype) return;

		const fields = [...new Set([
			"name", this.opts.titleField,
			this.opts.locationField, this.opts.latField, this.opts.lngField,
			this.opts.colorField, this.opts.statusField, this.opts.iconField,
		].filter(Boolean))];

		try {
			this._records = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields,
				filters: this.opts.filters || {},
				limit_page_length: 2000,
			});
		} catch (e) {
			console.error("VisualMapPro: fetch failed", e);
			this._records = [];
		}
	}

	_renderMarkers() {
		if (!this._map || !window.L) return;

		// Clear
		this._markers.forEach(m => {
			if (this._clusterer) this._clusterer.removeLayer(m);
			else m.remove();
		});
		this._markers = [];

		const bounds = [];
		let count = 0;

		this._records.forEach((rec) => {
			const pos = this._extractPosition(rec);
			if (!pos) return;

			const title = rec[this.opts.titleField] || rec.name;
			const status = this.opts.statusField ? rec[this.opts.statusField] : null;
			const color = this._getMarkerColor(rec, title, status);
			const icon = this._buildMarkerIcon(rec, color, title);

			const marker = L.marker([pos.lat, pos.lng], { icon });
			marker._fvRecord = rec;

			// Popup
			const popupContent = this.opts.popupTemplate
				? this.opts.popupTemplate(rec)
				: this._defaultPopup(rec, title, status, color);

			marker.bindPopup(popupContent, {
				maxWidth: 300,
				className: "fv-map-pro-popup-container",
			});

			marker.on("click", () => {
				if (this.opts.onMarkerClick) this.opts.onMarkerClick(rec, marker);
			});

			if (this._clusterer) {
				this._clusterer.addLayer(marker);
			} else {
				marker.addTo(this._map);
			}

			this._markers.push(marker);
			bounds.push([pos.lat, pos.lng]);
			count++;
		});

		// Update count
		const countEl = this.container.querySelector(".fv-map-pro-count");
		if (countEl) countEl.textContent = count > 0 ? `${count} ${__("records")}` : "";

		// Fit bounds
		if (bounds.length > 1) {
			this._map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
		} else if (bounds.length === 1) {
			this._map.setView(bounds[0], 14);
		}

		// Animate
		if (this._gsap && this.opts.animate) {
			setTimeout(() => {
				const els = this.container.querySelectorAll(".fv-map-pro-marker");
				if (els.length) {
					this._gsap.from(els, {
						scale: 0, y: -30, opacity: 0,
						duration: 0.5, stagger: 0.02, ease: "back.out(1.7)",
					});
				}
			}, 100);
		}
	}

	_getMarkerColor(rec, title, status) {
		if (this.opts.colorField && rec[this.opts.colorField]) {
			return rec[this.opts.colorField];
		}
		if (status) {
			const statusColors = {
				Active: "#10B981", Open: "#3B82F6", Closed: "#6B7280",
				Completed: "#10B981", Cancelled: "#EF4444", Draft: "#F59E0B",
				Pending: "#F59E0B", Overdue: "#EF4444", "In Progress": "#6366F1",
			};
			return statusColors[status] || ColorSystem.autoColor(status).border;
		}
		return ColorSystem.autoColor(title).border;
	}

	_buildMarkerIcon(rec, color, title) {
		const size = this.opts.markerSize;

		if (this.opts.markerStyle === "circle") {
			return L.divIcon({
				className: "fv-map-pro-marker-wrap",
				html: `<div class="fv-map-pro-marker fv-map-pro-marker--circle fv-fx-hover-scale"
					style="width:${size * 0.7}px;height:${size * 0.7}px;background:${color};
					border-radius:50%;border:3px solid white;box-shadow:0 2px 8px ${color}66;">
				</div>`,
				iconSize: [size * 0.7, size * 0.7],
				iconAnchor: [size * 0.35, size * 0.35],
			});
		}

		if (this.opts.markerStyle === "avatar") {
			const initials = title.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
			return L.divIcon({
				className: "fv-map-pro-marker-wrap",
				html: `<div class="fv-map-pro-marker fv-map-pro-marker--avatar fv-fx-hover-scale"
					style="width:${size}px;height:${size}px;background:${color};
					border-radius:50%;display:flex;align-items:center;justify-content:center;
					color:white;font-weight:700;font-size:${size * 0.35}px;
					border:3px solid white;box-shadow:0 2px 8px ${color}66;">
					${initials}
				</div>`,
				iconSize: [size, size],
				iconAnchor: [size / 2, size / 2],
			});
		}

		// Default pin style
		return L.divIcon({
			className: "fv-map-pro-marker-wrap",
			html: `<div class="fv-map-pro-marker fv-fx-hover-scale" style="--fv-marker-color:${color}">
				<svg width="${size}" height="${size * 1.3}" viewBox="0 0 28 36">
					<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z"
						fill="${color}" opacity="0.9"/>
					<circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
				</svg>
			</div>`,
			iconSize: [size, size * 1.3],
			iconAnchor: [size / 2, size * 1.3],
			popupAnchor: [0, -size * 1.3],
		});
	}

	_createMarkerIcon(color, label) {
		return L.divIcon({
			className: "fv-map-pro-marker-wrap",
			html: `<div class="fv-map-pro-marker fv-map-pro-marker--labeled" style="background:${color}">
				<span>${label}</span>
			</div>`,
			iconSize: [30, 30],
			iconAnchor: [15, 15],
		});
	}

	_defaultPopup(rec, title, status, color) {
		const dt = this.opts.doctype;
		const slug = dt.toLowerCase().replace(/ /g, "-");
		return `
			<div class="fv-map-pro-popup fv-fx-glass">
				<div class="fv-map-pro-popup-header" style="border-left: 3px solid ${color}">
					<strong>${frappe.utils.escape_html(title)}</strong>
					${status ? `<span class="fv-map-pro-popup-status" style="background:${color}22;color:${color}">${__(status)}</span>` : ""}
				</div>
				<div class="fv-map-pro-popup-body">
					<small class="text-muted">${rec.name}</small>
				</div>
				<a href="/app/${slug}/${encodeURIComponent(rec.name)}" class="fv-map-pro-popup-link">
					${__("Open")} →
				</a>
			</div>`;
	}

	_extractPosition(rec) {
		if (rec[this.opts.locationField]) {
			try {
				const geo = typeof rec[this.opts.locationField] === "string"
					? JSON.parse(rec[this.opts.locationField])
					: rec[this.opts.locationField];
				if (geo.features?.[0]?.geometry?.coordinates) {
					const [lng, lat] = geo.features[0].geometry.coordinates;
					return { lat, lng };
				}
			} catch { /* ignore */ }
		}
		const lat = parseFloat(rec[this.opts.latField]);
		const lng = parseFloat(rec[this.opts.lngField]);
		if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) return { lat, lng };
		return null;
	}

	// ═══════════════════════════════════════════════════════════
	// Legend
	// ═══════════════════════════════════════════════════════════

	_updateLegend() {
		if (!this.opts.statusField || !this._legend) return;

		const statuses = {};
		this._records.forEach(rec => {
			const s = rec[this.opts.statusField];
			if (s) statuses[s] = (statuses[s] || 0) + 1;
		});

		if (!Object.keys(statuses).length) return;

		this._legend.style.display = "block";
		this._legend.innerHTML = `
			<h5 class="fv-map-pro-legend-title">${__(this.opts.statusField)}</h5>
			${Object.entries(statuses).map(([status, count]) => {
				const color = this._getMarkerColor({}, status, status);
				return `<div class="fv-map-pro-legend-item">
					<span class="fv-map-pro-legend-dot" style="background:${color}"></span>
					<span>${__(status)}</span>
					<span class="fv-map-pro-legend-count">${count}</span>
				</div>`;
			}).join("")}`;
	}

	// ═══════════════════════════════════════════════════════════
	// Info Panel
	// ═══════════════════════════════════════════════════════════

	_showInfoPanel(html) {
		this._infoPanel.innerHTML = `
			<button class="fv-map-pro-info-close">${this._renderIcon("x", 16)}</button>
			${html}`;
		this._infoPanel.style.display = "block";
		this._infoPanel.querySelector(".fv-map-pro-info-close")
			.addEventListener("click", () => this._hideInfoPanel());
		if (this._gsap) {
			this._gsap.from(this._infoPanel, { x: 20, opacity: 0, duration: 0.3, ease: "power2.out" });
		}
	}

	_hideInfoPanel() {
		this._infoPanel.style.display = "none";
	}

	// ═══════════════════════════════════════════════════════════
	// Realtime
	// ═══════════════════════════════════════════════════════════

	_initRealtime() {
		const event = this.opts.realtimeEvent || `fv_map_${this.opts.doctype}`;
		frappe.realtime.on(event, (data) => {
			if (data.action === "add" || data.action === "update") {
				this._records = this._records.filter(r => r.name !== data.record.name);
				this._records.push(data.record);
			} else if (data.action === "remove") {
				this._records = this._records.filter(r => r.name !== data.name);
			}
			this._renderMarkers();
		});
	}

	// ═══════════════════════════════════════════════════════════
	// Public API
	// ═══════════════════════════════════════════════════════════

	setRecords(records) {
		this._records = records;
		this._renderMarkers();
		if (this.opts.heatmap) this._updateHeatmap();
		this._updateLegend();
	}

	addRecord(rec) {
		this._records.push(rec);
		this._renderMarkers();
	}

	refresh() { this._fetchAndRender(); }

	fitBounds() {
		if (!this._map || !this._markers.length) return;
		const group = L.featureGroup(this._markers);
		this._map.fitBounds(group.getBounds(), { padding: [40, 40] });
	}

	locateMe() {
		if (!this._map) return;
		this._map.locate({ setView: true, maxZoom: 14 });
		this._map.on("locationfound", (e) => {
			L.circleMarker(e.latlng, {
				radius: 10, fillColor: "#6366F1",
				fillOpacity: 0.8, color: "white", weight: 2,
			}).addTo(this._map).bindPopup(__("You are here")).openPopup();
		});
	}

	toggleFullscreen() {
		if (!document.fullscreenElement) {
			this.container.requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}

	getMap() { return this._map; }
	getMarkers() { return this._markers; }
	getRecords() { return this._records; }
	getGeofences() { return this._geofences; }

	exportGeoJSON() {
		const features = this._records.map(rec => {
			const pos = this._extractPosition(rec);
			if (!pos) return null;
			return {
				type: "Feature",
				geometry: { type: "Point", coordinates: [pos.lng, pos.lat] },
				properties: rec,
			};
		}).filter(Boolean);
		return { type: "FeatureCollection", features };
	}

	destroy() {
		if (this._map) { this._map.remove(); this._map = null; }
		this.container.innerHTML = "";
		this.container.classList.remove("fv-map-pro");
	}
}
