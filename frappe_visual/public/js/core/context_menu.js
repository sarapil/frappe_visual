// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * ContextMenu — placeholder re-export (actual logic in graph_engine.js)
 */
export class ContextMenu {
	/**
	 * Build context menu commands from node type definitions.
	 * @param {Object} nodeTypes - Map of type → { commands: [...] }
	 */
	static buildCommands(nodeTypes) {
		return Object.entries(nodeTypes).map(([type, config]) => ({
			selector: `node[type = "${type}"]`,
			commands: config.commands || [],
		}));
	}
}
