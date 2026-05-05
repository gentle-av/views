import { FilePath } from "../../models/value-objects/FilePath.js";

/**
 * Сервис для навигации по директориям
 */
export class DirectoryNavigator {
  private history: string[];
  private currentPath: FilePath;
  private readonly rootPath: FilePath;

  constructor(rootPath: string = "/mnt/video") {
    this.rootPath = new FilePath(rootPath);
    this.currentPath = this.rootPath;
    this.history = [this.rootPath.getValue()];
  }

  getCurrentPath(): FilePath {
    return this.currentPath;
  }

  getCurrentPathString(): string {
    return this.currentPath.getValue();
  }

  getRootPath(): FilePath {
    return this.rootPath;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  canGoBack(): boolean {
    return this.history.length > 1;
  }

  canGoForward(): boolean {
    return false;
  }

  navigateTo(path: string): void {
    const newPath = new FilePath(path);
    this.currentPath = newPath;
    this.history.push(newPath.getValue());
  }

  goBack(): boolean {
    if (!this.canGoBack()) {
      return false;
    }
    this.history.pop();
    this.currentPath = new FilePath(this.history[this.history.length - 1]);
    return true;
  }

  goToRoot(): void {
    this.currentPath = this.rootPath;
    this.history = [this.rootPath.getValue()];
  }

  isRoot(): boolean {
    return this.currentPath.equals(this.rootPath);
  }

  getParentPath(): FilePath | null {
    if (this.isRoot()) {
      return null;
    }
    const parent = this.currentPath.getDirectory();
    return parent ? new FilePath(parent) : null;
  }

  goToParent(): boolean {
    const parent = this.getParentPath();
    if (!parent) {
      return false;
    }
    this.navigateTo(parent.getValue());
    return true;
  }

  reset(): void {
    this.currentPath = this.rootPath;
    this.history = [this.rootPath.getValue()];
  }
}
