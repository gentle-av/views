import { FilePath } from "../../models/value-objects/FilePath.js";
/**
 * Сервис для навигации по директориям
 */
export class DirectoryNavigator {
    constructor(rootPath = "/mnt/video") {
        this.rootPath = new FilePath(rootPath);
        this.currentPath = this.rootPath;
        this.history = [this.rootPath.getValue()];
    }
    getCurrentPath() {
        return this.currentPath;
    }
    getCurrentPathString() {
        return this.currentPath.getValue();
    }
    getRootPath() {
        return this.rootPath;
    }
    getHistory() {
        return [...this.history];
    }
    canGoBack() {
        return this.history.length > 1;
    }
    canGoForward() {
        return false;
    }
    navigateTo(path) {
        const newPath = new FilePath(path);
        this.currentPath = newPath;
        this.history.push(newPath.getValue());
    }
    goBack() {
        if (!this.canGoBack()) {
            return false;
        }
        this.history.pop();
        this.currentPath = new FilePath(this.history[this.history.length - 1]);
        return true;
    }
    goToRoot() {
        this.currentPath = this.rootPath;
        this.history = [this.rootPath.getValue()];
    }
    isRoot() {
        return this.currentPath.equals(this.rootPath);
    }
    getParentPath() {
        if (this.isRoot()) {
            return null;
        }
        const parent = this.currentPath.getDirectory();
        return parent ? new FilePath(parent) : null;
    }
    goToParent() {
        const parent = this.getParentPath();
        if (!parent) {
            return false;
        }
        this.navigateTo(parent.getValue());
        return true;
    }
    reset() {
        this.currentPath = this.rootPath;
        this.history = [this.rootPath.getValue()];
    }
}
