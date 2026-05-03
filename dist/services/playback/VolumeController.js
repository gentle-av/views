import { Volume } from "../../models/value-objects/Volume.js";
/**
 * Сервис для управления громкостью
 */
export class VolumeController {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.currentVolume = Volume.default();
        this.isMuted = false;
    }
    async init() {
        try {
            const response = await this.apiClient.get("/api/audio/volume");
            if (response.success && response.data?.volume !== undefined) {
                this.currentVolume = new Volume(response.data.volume);
                this.isMuted = response.data.muted || false;
            }
        }
        catch (error) {
            console.error("Failed to load initial volume:", error);
        }
    }
    getVolume() {
        return this.currentVolume;
    }
    getVolumePercent() {
        return this.currentVolume.getValue();
    }
    isMutedState() {
        return this.isMuted;
    }
    async increase(delta = 5) {
        const newVolume = this.currentVolume.increase(delta);
        await this.setVolume(newVolume);
        return newVolume;
    }
    async decrease(delta = 5) {
        const newVolume = this.currentVolume.decrease(delta);
        await this.setVolume(newVolume);
        return newVolume;
    }
    async setVolume(volume) {
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
        }
        catch (error) {
            console.error("Failed to set volume:", error);
        }
    }
    async toggleMute() {
        try {
            const response = await this.apiClient.post("/api/audio/volume/mute");
            if (response.success && response.data?.muted !== undefined) {
                this.isMuted = response.data.muted;
            }
            return this.isMuted;
        }
        catch (error) {
            console.error("Failed to toggle mute:", error);
            return this.isMuted;
        }
    }
    async setOutput(output) {
        try {
            const endpoint = output === "speakers"
                ? "/api/audio/output/speakers"
                : "/api/audio/output/headphones";
            await this.apiClient.post(endpoint);
        }
        catch (error) {
            console.error(`Failed to switch to ${output}:`, error);
        }
    }
}
