export class PlayerVisibilityController {
  constructor(dom, core) {
    this.dom = dom;
    this.core = core;
    this.uiUpdater = null;
    this.isVisible = false;
  }

  setUIUpdater(uiUpdater) {
    this.uiUpdater = uiUpdater;
  }

  show() {
    if (this.dom && this.core.hasActiveFile()) {
      this.dom.show();
      this.isVisible = true;
    }
  }

  hide() {
    if (this.dom) {
      this.dom.hide();
      this.isVisible = false;
    }
  }

  toggleMinimize() {
    if (!this.uiUpdater) return;
    const isMinimized = this.dom.hasClass("minimized");
    this.uiUpdater.toggleMinimize(!isMinimized);
  }

  toggleSettings() {
    if (!this.uiUpdater) return;
    const settings = this.dom.get("universalBottomSettings");
    const isCollapsed = settings?.classList.contains("collapsed");
    if (isCollapsed !== undefined) {
      this.uiUpdater.toggleSettings(!isCollapsed);
    }
  }
}
