export class TagEditorApi {
  constructor() {
    this.serverUrl = `http://${window.location.hostname}:${window.location.port}`;
  }

  getBaseUrl() {
    return this.serverUrl;
  }

  async updateTags(filePath, tags) {
    try {
      const payload = { path: filePath, ...tags };
      const response = await fetch(
        `${this.getBaseUrl()}/api/music/update-tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      return false;
    }
  }

  async uploadAlbumArt(filePath, imageData) {
    if (!imageData || imageData.length < 100) {
      return false;
    }
    try {
      const payload = { path: filePath, image_data: imageData };
      const response = await fetch(
        `${this.getBaseUrl()}/api/music/upload-album-art`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      return false;
    }
  }
}
