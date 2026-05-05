import { describe, it, expect } from 'vitest';
import { ArtistName } from '../../../models/value-objects/ArtistName.js';
describe('ArtistName', () => {
    it('should create artist name', () => {
        const artist = new ArtistName('The Beatles');
        expect(artist.getValue()).toBe('The Beatles');
    });
    it('should normalize whitespace', () => {
        const artist = new ArtistName('  The  Beatles  ');
        expect(artist.getValue()).toBe('The Beatles');
    });
    it('should throw error on empty name', () => {
        expect(() => new ArtistName('')).toThrow('Artist name cannot be empty');
    });
    it('should get first letter', () => {
        expect(new ArtistName('The Beatles').getFirstLetter()).toBe('T');
    });
    it('should match search term', () => {
        const artist = new ArtistName('The Beatles');
        expect(artist.matches('beatles')).toBe(true);
        expect(artist.matches('queen')).toBe(false);
    });
    it('should create unknown artist', () => {
        expect(ArtistName.unknown().getValue()).toBe('Unknown Artist');
    });
});
