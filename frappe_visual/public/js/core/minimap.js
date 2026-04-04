// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Minimap — placeholder re-export
 * (Actual minimap is initialized in GraphEngine via cytoscape-navigator)
 */
export class Minimap {
	static create(container, cy) {
		const navEl = document.createElement("div");
		navEl.className = "fv-minimap";
		container.appendChild(navEl);

		return cy.navigator({
			container: navEl,
			viewLiveFramerate: 0,
			thumbnailEventFramerate: 15,
			thumbnailLiveFramerate: false,
			dblClickDelay: 200,
		});
	}
}
