export class PlaybackActions {
  constructor(api, state, events) {
    this.api = api;
    this.state = state;
    this.events = events;
  }

  getCurrentMediaType() {
    const player = window.universalPlayerInstance;
    return player?.mediaType || "audio";
  }

  async seekVideo(seconds) {
    try {
      const status = await this.api.getVideoStatus();
      if (status?.success && status?.data) {
        let newTime = status.data.currentTime + seconds;
        newTime = Math.max(0, Math.min(newTime, status.data.duration));
        await this.api.seekVideo(newTime);
      } else if (status?.currentTime !== undefined) {
        let newTime = status.currentTime + seconds;
        newTime = Math.max(0, Math.min(newTime, status.duration));
        await this.api.seekVideo(newTime);
      } else {
        await this.seekRelativeAudio(seconds);
      }
    } catch (error) {
      await this.seekRelativeAudio(seconds);
    }
  }

  async seekRelativeAudio(seconds) {
    try {
      const timeInfo = await this.api.getCurrentTime();
      if (
        timeInfo?.data?.duration &&
        timeInfo?.data?.currentTime !== undefined
      ) {
        let newTime = timeInfo.data.currentTime + seconds;
        newTime = Math.max(0, Math.min(newTime, timeInfo.data.duration));
        await this.api.seek(newTime);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async seekRelative(seconds) {
    const mediaType = this.getCurrentMediaType();
    if (mediaType === "video") {
      await this.seekVideo(seconds);
    } else {
      await this.seekRelativeAudio(seconds);
    }
  }

  async next(mediaType = null) {
    const currentMediaType = mediaType || this.getCurrentMediaType();
    if (currentMediaType === "video") {
      await this.seekVideo(5);
    } else {
      await this.api.next();
      setTimeout(() => this._updateTrackName(), 50);
    }
  }

  async previous(mediaType = null) {
    const currentMediaType = mediaType || this.getCurrentMediaType();
    if (currentMediaType === "video") {
      await this.seekVideo(-5);
    } else {
      await this.api.previous();
      setTimeout(() => this._updateTrackName(), 50);
    }
  }

  async play() {
    await this.api.play();
    this.state.isPlaying = true;
    this._updatePlayerUI(true);
  }

  async pause() {
    await this.api.pause();
    this.state.isPlaying = false;
    this._updatePlayerUI(false);
  }

  async stop() {
    await this.api.stop();
    this.state.reset();
    this._updatePlayerUI(false);
  }

  async seek(percent, progressBar) {
    const mediaType = this.getCurrentMediaType();
    if (mediaType === "video") {
      const status = await this.api.getVideoStatus();
      if (status?.success && status?.data?.duration) {
        const seekTime = status.data.duration * percent;
        await this.api.seekVideo(seekTime);
      }
    } else {
      const timeInfo = await this.api.getCurrentTime();
      if (timeInfo?.data?.duration) {
        const seekTime = timeInfo.data.duration * percent;
        await this.api.seek(seekTime);
      }
    }
  }

  async togglePlayPause() {
    const state = await this.api.getPlaybackState();
    if (state?.data?.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  _updatePlayerUI(isPlaying) {
    const player = window.universalPlayerInstance;
    if (player && player.uiUpdater) {
      player.uiUpdater.updatePlayPauseButton(isPlaying);
      player.core?.setPlaying(isPlaying);
    }
  }

  async _updateTrackName() {
    const state = await this.api.getPlaybackState();
    if (!state?.success) return;
    let trackName = this.state.getTrackNameByPath(state.data.currentTrack);
    if (!trackName && this.state.currentAlbum) {
      const track = this.state.currentAlbum.tracks.find(
        (t) => t.path === state.data.currentTrack,
      );
      if (track && track.title) {
        trackName = track.title;
        this.state.trackNameCache.set(state.data.currentTrack, trackName);
      }
    }
    this.events.emit("stateChange", {
      ...state.data,
      currentTrackName: trackName,
    });
  }
}
