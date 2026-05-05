/**
 * Value Object for file path
 * Immutable, validated file path
 */
export class FilePath {
    constructor(path) {
        if (!path || path.trim() === "") {
            throw new Error("File path cannot be empty");
        }
        this.value = this.normalize(path);
    }
    normalize(path) {
        return path.replace(/\\/g, "/").replace(/\/+/g, "/");
    }
    getValue() {
        return this.value;
    }
    getFileName() {
        const parts = this.value.split("/");
        return parts[parts.length - 1];
    }
    getFileNameWithoutExtension() {
        const fileName = this.getFileName();
        const lastDot = fileName.lastIndexOf(".");
        return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
    }
    getExtension() {
        const fileName = this.getFileName();
        const lastDot = fileName.lastIndexOf(".");
        return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : "";
    }
    getDirectory() {
        const lastSlash = this.value.lastIndexOf("/");
        return lastSlash > 0 ? this.value.substring(0, lastSlash) : "";
    }
    isVideo() {
        const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v"];
        return videoExts.includes(this.getExtension());
    }
    isAudio() {
        const audioExts = ["mp3", "flac", "wav", "m4a", "ogg", "aac", "wma"];
        return audioExts.includes(this.getExtension());
    }
    isImage() {
        const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
        return imageExts.includes(this.getExtension());
    }
    equals(other) {
        return this.value === other.getValue();
    }
    toString() {
        return this.value;
    }
}
