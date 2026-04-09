class AlbumAPIHandler {
  constructor(library) {
    this.library = library;
  }

  async refreshDatabase() {
    try {
      const response = await fetch(
        `${this.library.getServerUrl()}/api/music/force-rescan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json();
      if (data.status === "success") {
        if (typeof Utils !== "undefined") {
          Utils.showNotification("База данных обновлена", "success");
        }
        await this.library.reloadAlbums();
      } else {
        if (typeof Utils !== "undefined") {
          Utils.showNotification(data.message || "Ошибка обновления", "error");
        }
      }
    } catch (error) {
      console.error("Error refreshing database:", error);
      if (typeof Utils !== "undefined") {
        Utils.showNotification("Ошибка обновления базы данных", "error");
      }
    }
  }

  async fetchAlbumArt(albumName, artist) {
    try {
      const url = `${this.library.getServerUrl()}/api/music/albumart/album/${encodeURIComponent(albumName)}?artist=${encodeURIComponent(artist)}`;
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error("Error fetching album art:", error);
      return null;
    }
  }

  async fetchTrackMetadata(filePath) {
    try {
      const url = `${this.library.getServerUrl()}/api/music/file-metadata?path=${encodeURIComponent(filePath)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "success" && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching track metadata:", error);
      return null;
    }
  }

  async updateTrackTags(filePath, tags) {
    try {
      const response = await fetch(
        `${this.library.getServerUrl()}/api/music/update-tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, ...tags }),
        },
      );
      const data = await response.json();
      if (data.status === "success") {
        if (typeof Utils !== "undefined") {
          Utils.showNotification("Теги обновлены", "success");
        }
        return true;
      }
      if (typeof Utils !== "undefined") {
        Utils.showNotification(
          data.message || "Ошибка обновления тегов",
          "error",
        );
      }
      return false;
    } catch (error) {
      console.error("Error updating tags:", error);
      if (typeof Utils !== "undefined") {
        Utils.showNotification("Ошибка обновления тегов", "error");
      }
      return false;
    }
  }
}
