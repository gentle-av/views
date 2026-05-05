import { Volume } from "../../models/value-objects/Volume.js";
import { ApiClient } from "../../api/base/ApiClient.js";

/**
 * Сервис для управления громкостью
 */
export class VolumeController {
  private currentVolume: Volume;
  private isMuted: boolean;

  constructor(private apiClient: ApiClient) {
    this.currentVolume = Volume.default();
    this.isMuted = false;
  }

  async init(): Promise<void> {
    try {
      const response = await this.apiClient.get("/api/audio/volume");
      if (response.success && response.data?.volume !== undefined) {
        this.currentVolume = new Volume(response.data.volume);
        this.isMuted = response.data.muted || false;
      }
    } catch (error) {
      console.error("Failed to load initial volume:", error);
    }
  }

  getVolume(): Volume {
    return this.currentVolume;
  }

  getVolumePercent(): number {
    return this.currentVolume.getValue();
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  async increase(delta: number = 5): Promise<Volume> {
    const newVolume = this.currentVolume.increase(delta);
    await this.setVolume(newVolume);
    return newVolume;
  }

  async decrease(delta: number = 5): Promise<Volume> {
    const newVolume = this.currentVolume.decrease(delta);
    await this.setVolume(newVolume);
    return newVolume;
  }

  async setVolume(volume: Volume): Promise<void> {
    try {
      const response = await this.apiClient.post("/api/audio/volume", {
        volume: volume.getValue(),
      });
      if (response.success) {
        this.currentVolume = volume;
        if (this.isMuted && volume.getValue() > 0) {
          this.isMuted = false;
        }
      }
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }

  async toggleMute(): Promise<boolean> {
    try {
      const response = await this.apiClient.post("/api/audio/volume/mute");
      if (response.success && response.data?.muted !== undefined) {
        this.isMuted = response.data.muted;
      }
      return this.isMuted;
    } catch (error) {
      console.error("Failed to toggle mute:", error);
      return this.isMuted;
    }
  }

  async setOutput(output: "speakers" | "headphones"): Promise<void> {
    try {
      const endpoint =
        output === "speakers"
          ? "/api/audio/output/speakers"
          : "/api/audio/output/headphones";
      await this.apiClient.post(endpoint);
    } catch (error) {
      console.error(`Failed to switch to ${output}:`, error);
    }
  }
}
