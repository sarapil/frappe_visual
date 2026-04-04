// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Visual Hub — Main page for Frappe Visual framework.
 * Allows selecting any installed app and viewing its visual map.
 */

frappe.pages["visual-hub"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Visual Hub"),
		single_column: true,
	});

	page.set_title_sub(__("Interactive Application Explorer"));

	// App selector
	const appSelect = page.add_field({
		fieldname: "app_name",
		label: __("Application"),
		fieldtype: "Select",
		options: "",
		change: () => loadAppMap(appSelect.get_value()),
	});

	// Populate apps
	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Module Def",
			fields: ["distinct app_name as name"],
			limit_page_length: 0,
		},
		callback: (r) => {
			if (r.message) {
				const apps = r.message.map((a) => a.name).filter(Boolean);
				appSelect.df.options = ["", ...apps].join("\n");
				appSelect.refresh();
			}
		},
	});

	// Map container
	const mapContainer = document.createElement("div");
	mapContainer.id = "fv-hub-map";
	mapContainer.style.cssText =
		"width:100%;height:calc(100vh - 200px);min-height:500px;margin-top:16px;";
	page.main.append(mapContainer);

	let currentMap = null;

	async function loadAppMap(appName) {
		if (!appName) return;
		if (currentMap) currentMap.destroy();

		// Use the lazy-loaded API
		const { AppMap } = await frappe.visual.engine();
		currentMap = await AppMap.create("#fv-hub-map", appName);
	}
};
