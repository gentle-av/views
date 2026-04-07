export class AlbumDataManager {
  constructor(library) {
    this.library = library;
  }

  async loadArtistAlbums(artist, uniqueAlbums, foundSpan) {
    try {
      const url = `${this.library.getServerUrl()}/api/music/albums?artist=${encodeURIComponent(artist)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status === "success" && data.albums) {
        const newAlbums = [];
        for (const album of data.albums) {
          const albumKey = `${album.album}|${album.artist}`;
          if (!uniqueAlbums.has(albumKey)) {
            const [tracks, coverUrl] = await Promise.all([
              this.getTracksFromAlbum(album.album, album.artist),
              this.getAlbumCover(album.album, album.artist),
            ]);
            const albumData = {
              name: album.album,
              artist: album.artist,
              title: album.album,
              year: album.year || "",
              tracks: tracks,
              coverUrl: coverUrl,
              trackCount: tracks.length,
            };
            uniqueAlbums.set(albumKey, albumData);
            newAlbums.push(albumData);
          }
        }
        if (newAlbums.length > 0) {
          this.library.albums.push(...newAlbums);
          this.library.filteredAlbums = [...this.library.albums];
          this.library.uiRenderer.renderAlbumsIncremental();
          if (foundSpan) foundSpan.textContent = this.library.albums.length;
        }
      }
    } catch (error) {
      console.error(`Error loading albums for artist ${artist}:`, error);
    }
  }

  async getTracksFromAlbum(albumName, artist) {
    try {
      const url = `${this.library.getServerUrl()}/api/music/tracks/album/${encodeURIComponent(albumName)}${artist ? `?artist=${encodeURIComponent(artist)}` : ""}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status === "success" && data.tracks) {
        return data.tracks.map((track, idx) => ({
          name:
            track.title ||
            track.filename?.replace(/\.(flac|mp3|m4a|wav)$/i, "") ||
            `Track ${idx + 1}`,
          path: track.path,
          number: track.track || idx + 1,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error loading tracks:", error);
      return [];
    }
  }

  async getAlbumCover(albumName, artist) {
    try {
      const url = `${this.library.getServerUrl()}/api/music/albumart/album/${encodeURIComponent(albumName)}${artist ? `?artist=${encodeURIComponent(artist)}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0 && blob.type.startsWith("image/")) return url;
      }
    } catch (error) {
      console.debug("No album art found");
    }
    return "";
  }

  async collectAllTracks() {
    if (this.library.allTracks.length > 0) return this.library.allTracks;
    const tracks = [];
    for (const album of this.library.albums) {
      for (const track of album.tracks) {
        tracks.push({
          name: track.name,
          artist: album.artist,
          album: album.title,
          year: album.year,
          path: track.path,
          coverUrl: album.coverUrl,
          trackNumber: track.number,
        });
      }
    }
    this.library.allTracks = tracks;
    return tracks;
  }
}
