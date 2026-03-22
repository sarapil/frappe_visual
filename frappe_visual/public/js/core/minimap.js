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
