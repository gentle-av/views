import { TagEditorApi } from "./TagEditorApi.js";
import { TagEditorModal } from "./TagEditorModal.js";
import { TagEditorAlbum } from "./TagEditorAlbum.js";
import { TagEditorTrack } from "./TagEditorTrack.js";
import { TagEditorCover } from "./TagEditorCover.js";

class TagEditor {
  constructor() {
    this.api = new TagEditorApi();
    this.modal = new TagEditorModal();
    this.album = new TagEditorAlbum(this.api, this.modal);
    this.track = new TagEditorTrack(this.api, this.modal);
    this.cover = new TagEditorCover(this.api, this.modal);
  }

  async updateTags(filePath, tags) {
    return this.api.updateTags(filePath, tags);
  }

  async updateAlbumTags(album, newArtist, newAlbum, newYear) {
    return this.album.updateAlbumTags(album, newArtist, newAlbum, newYear);
  }

  showAlbumTagEditor(album) {
    this.album.showEditor(album);
  }

  showTrackTagEditor(track, album) {
    this.track.showEditor(track, album);
  }

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

const TagEditorInstance = new TagEditor();
window.TagEditor = TagEditorInstance;
export { TagEditorInstance };
