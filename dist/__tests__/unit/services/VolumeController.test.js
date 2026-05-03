import { describe, it, expect, beforeEach } from "vitest";
import { Volume } from "../../../models/value-objects/Volume.js";
// Мок для ApiClient
class MockApiClient {
    async get(endpoint) {
        if (endpoint === "/api/audio/volume") {
            return { success: true, data: { volume: 50, muted: false } };
        }
        return { success: true, data: {} };
    }
    async post(endpoint, data) {
        return { success: true, data: { muted: false, volume: data?.volume } };
    }
}
import { VolumeController } from "../../../services/playback/VolumeController.js";
describe("VolumeController", () => {
    let apiClient;
    let volumeController;
    beforeEach(() => {
        apiClient = new MockApiClient();
        volumeController = new VolumeController(apiClient);
    });
    it("should create with default volume", () => {
        expect(volumeController.getVolumePercent()).toBe(50);
        expect(volumeController.isMutedState()).toBe(false);
    });
    it("should increase volume", async () => {
        const newVolume = await volumeController.increase(10);
        expect(newVolume.getValue()).toBe(60);
        expect(volumeController.getVolumePercent()).toBe(60);
    });
    it("should not exceed 100 when increasing", async () => {
        await volumeController.setVolume(new Volume(95));
        const newVolume = await volumeController.increase(10);
        expect(newVolume.getValue()).toBe(100);
    });
    it("should decrease volume", async () => {
        await volumeController.setVolume(new Volume(50));
        const newVolume = await volumeController.decrease(10);
        expect(newVolume.getValue()).toBe(40);
    });
    it("should not go below 0 when decreasing", async () => {
        await volumeController.setVolume(new Volume(5));
        const newVolume = await volumeController.decrease(10);
        expect(newVolume.getValue()).toBe(0);
    });
    it("should toggle mute", async () => {
        const isMuted = await volumeController.toggleMute();
        expect(typeof isMuted).toBe("boolean");
    });
    it("should set output to speakers", async () => {
        await expect(volumeController.setOutput("speakers")).resolves.not.toThrow();
    });
    it("should set output to headphones", async () => {
        await expect(volumeController.setOutput("headphones")).resolves.not.toThrow();
    });
});
