/**
 * Value Object for file path
 * Immutable, validated file path
 */
export class FilePath {
  private readonly value: string;

  constructor(path: string) {
    if (!path || path.trim() === "") {
      throw new Error("File path cannot be empty");
    }
    this.value = this.normalize(path);
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, "/").replace(/\/+/g, "/");
  }

  getValue(): string {
    return this.value;
  }

  getFileName(): string {
    const parts = this.value.split("/");
    return parts[parts.length - 1];
  }

  getFileNameWithoutExtension(): string {
    const fileName = this.getFileName();
    const lastDot = fileName.lastIndexOf(".");
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  }

  getExtension(): string {
    const fileName = this.getFileName();
    const lastDot = fileName.lastIndexOf(".");
    return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : "";
  }

  getDirectory(): string {
    const lastSlash = this.value.lastIndexOf("/");
    return lastSlash > 0 ? this.value.substring(0, lastSlash) : "";
  }

  isVideo(): boolean {
    const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v"];
    return videoExts.includes(this.getExtension());
  }

  isAudio(): boolean {
    const audioExts = ["mp3", "flac", "wav", "m4a", "ogg", "aac", "wma"];
    return audioExts.includes(this.getExtension());
  }

  isImage(): boolean {
    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    return imageExts.includes(this.getExtension());
  }

  equals(other: FilePath): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
