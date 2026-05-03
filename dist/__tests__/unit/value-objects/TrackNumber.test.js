import { describe, it, expect } from 'vitest';
import { TrackNumber } from '../../../models/value-objects/TrackNumber.js';
describe('TrackNumber', () => {
    it('should create track number', () => {
        const track = new TrackNumber(5);
        expect(track.getValue()).toBe(5);
    });
    it('should throw error on invalid number', () => {
        expect(() => new TrackNumber(0)).toThrow('Track number must be at least 1');
        expect(() => new TrackNumber(1000)).toThrow('Track number cannot exceed 999');
    });
    it('should format with padding', () => {
        expect(new TrackNumber(5).format()).toBe('05');
        expect(new TrackNumber(12).format()).toBe('12');
    });
});
