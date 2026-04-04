/**
 * UndoRedo — Global undo/redo stack manager
 *
 * const ur = frappe.visual.UndoRedo.create({ maxHistory: 50 });
 * ur.execute({ do: () => addItem(), undo: () => removeItem(), label: "Add item" });
 * ur.undo(); ur.redo();
 * ur.onUpdate((state) => updateUI(state));
 */
export class UndoRedo {
  static create(opts = {}) { return new UndoRedo(opts); }

  constructor(opts = {}) {
    Object.assign(this, { maxHistory: 50 }, opts);
    this._undoStack = [];
    this._redoStack = [];
    this._listeners = [];
    this._bindKeys();
  }

  execute({ do: doFn, undo: undoFn, label = "" }) {
    doFn();
    this._undoStack.push({ do: doFn, undo: undoFn, label });
    this._redoStack = []; // clear redo on new action
    if (this._undoStack.length > this.maxHistory) this._undoStack.shift();
    this._emit();
  }

  undo() {
    const action = this._undoStack.pop();
    if (!action) return false;
    action.undo();
    this._redoStack.push(action);
    this._emit();
    return true;
  }

  redo() {
    const action = this._redoStack.pop();
    if (!action) return false;
    action.do();
    this._undoStack.push(action);
    this._emit();
    return true;
  }

  canUndo() { return this._undoStack.length > 0; }
  canRedo() { return this._redoStack.length > 0; }

  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoLabel: this._undoStack.length ? this._undoStack[this._undoStack.length - 1].label : "",
      redoLabel: this._redoStack.length ? this._redoStack[this._redoStack.length - 1].label : "",
      undoCount: this._undoStack.length,
      redoCount: this._redoStack.length
    };
  }

  onUpdate(fn) { this._listeners.push(fn); }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._emit();
  }

  _emit() {
    const state = this.getState();
    this._listeners.forEach(fn => fn(state));
  }

  _bindKeys() {
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
        e.preventDefault();
        this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
        e.preventDefault();
        this.redo();
      }
    });
  }

  destroy() { this.clear(); this._listeners = []; }
}
