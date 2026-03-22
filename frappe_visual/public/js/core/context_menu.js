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
