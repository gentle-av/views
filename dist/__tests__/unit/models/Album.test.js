import { describe, it, expect } from 'vitest';
import { Album } from '../../../models/entities/Album.js';
import { Track } from '../../../models/entities/Track.js';
describe('Album', () => {
    const tracks = [
        new Track({ path: '/music/01-song1.mp3', title: 'Song 1', trackNumber: 1, duration: 180 }),
        new Track({ path: '/music/02-song2.mp3', title: 'Song 2', trackNumber: 2, duration: 200 }),
        new Track({ path: '/music/03-song3.mp3', title: 'Song 3', trackNumber: 3, duration: 220 }),
    ];
    it('should create album with minimal data', () => {
        const album = new Album({ title: 'Greatest Hits' });
        expect(album.getTitle()).toBe('Greatest Hits');
        expect(album.getArtistString()).toBe('Unknown Artist');
        expect(album.getTrackCount()).toBe(0);
    });
    it('should create album with full data', () => {
        const album = new Album({
            title: 'Greatest Hits',
            artist: 'The Artist',
            year: '2024',
            tracks,
            coverUrl: '/covers/cover.jpg',
        });
        expect(album.getTitle()).toBe('Greatest Hits');
        expect(album.getArtistString()).toBe('The Artist');
        expect(album.getYear()).toBe('2024');
        expect(album.getTrackCount()).toBe(3);
        expect(album.getCoverUrl()).toBe('/covers/cover.jpg');
    });
    it('should get tracks as copy', () => {
        const album = new Album({ title: 'Album', tracks });
        const tracksCopy = album.getTracks();
        expect(tracksCopy).toEqual(tracks);
        expect(tracksCopy).not.toBe(tracks);
    });
    it('should get track by number', () => {
        const album = new Album({ title: 'Album', tracks });
        const track = album.getTrackByNumber(2);
        expect(track).toBeDefined();
        expect(track?.getTitle()).toBe('Song 2');
    });
    it('should get track by index', () => {
        const album = new Album({ title: 'Album', tracks });
        const track = album.getTrackByIndex(1);
        expect(track).toBeDefined();
        expect(track?.getTitle()).toBe('Song 2');
    });
    it('should return undefined for non-existent track', () => {
        const album = new Album({ title: 'Album', tracks });
        expect(album.getTrackByNumber(99)).toBeUndefined();
        expect(album.getTrackByIndex(99)).toBeUndefined();
    });
    it('should get track paths', () => {
        const album = new Album({ title: 'Album', tracks });
        const paths = album.getTrackPaths();
        expect(paths).toEqual([
            '/music/01-song1.mp3',
            '/music/02-song2.mp3',
            '/music/03-song3.mp3',
        ]);
    });
    it('should calculate total duration', () => {
        const album = new Album({ title: 'Album', tracks });
        expect(album.getDuration()).toBe(600);
    });
    it('should format duration', () => {
        const album = new Album({ title: 'Album', tracks });
        expect(album.getDurationFormatted()).toBe('10m');
    });
    it('should format long duration with hours', () => {
        const longTracks = [
            new Track({ path: '/song.mp3', duration: 3600 }),
            new Track({ path: '/song2.mp3', duration: 1800 }),
        ];
        const album = new Album({ title: 'Album', tracks: longTracks });
        expect(album.getDurationFormatted()).toBe('1h 30m');
    });
    it('should get display name', () => {
        const album = new Album({ title: 'Album', artist: 'Artist' });
        expect(album.getDisplayName()).toBe('Artist - Album');
    });
    it('should add track', () => {
        const album = new Album({ title: 'Album' });
        const track = new Track({ path: '/song.mp3', trackNumber: 1 });
        const updated = album.addTrack(track);
        expect(album.getTrackCount()).toBe(0);
        expect(updated.getTrackCount()).toBe(1);
    });
    it('should remove track', () => {
        const album = new Album({ title: 'Album', tracks });
        const updated = album.removeTrack(2);
        expect(album.getTrackCount()).toBe(3);
        expect(updated.getTrackCount()).toBe(2);
        expect(updated.getTrackByNumber(2)).toBeUndefined();
    });
    it('should sort tracks', () => {
        const unsortedTracks = [
            new Track({ path: '/03-song3.mp3', trackNumber: 3 }),
            new Track({ path: '/01-song1.mp3', trackNumber: 1 }),
            new Track({ path: '/02-song2.mp3', trackNumber: 2 }),
        ];
        const album = new Album({ title: 'Album', tracks: unsortedTracks });
        const sorted = album.sortTracks();
        expect(sorted.getTrackByIndex(0)?.getTrackNumberValue()).toBe(1);
        expect(sorted.getTrackByIndex(1)?.getTrackNumberValue()).toBe(2);
        expect(sorted.getTrackByIndex(2)?.getTrackNumberValue()).toBe(3);
    });
    it('should search tracks', () => {
        const album = new Album({ title: 'Album', tracks });
        const results = album.searchTracks('Song 2');
        expect(results.length).toBe(1);
        expect(results[0].getTitle()).toBe('Song 2');
    });
    it('should validate album', () => {
        const valid = new Album({ title: 'Album', tracks });
        expect(valid.isValid()).toBe(true);
        const invalid = new Album({ title: '', tracks: [] });
        expect(invalid.isValid()).toBe(false);
    });
    it('should create immutable copies with with* methods', () => {
        const original = new Album({ title: 'Original', artist: 'Artist' });
        const updated = original.withTitle('Updated').withYear('2024');
        expect(original.getTitle()).toBe('Original');
        expect(updated.getTitle()).toBe('Updated');
        expect(updated.getYear()).toBe('2024');
        expect(original).not.toBe(updated);
    });
    it('should serialize to JSON', () => {
        const album = new Album({ title: 'Album', artist: 'Artist', year: '2024', tracks });
        const json = album.toJSON();
        expect(json.title).toBe('Album');
        expect(json.artist).toBe('Artist');
        expect(json.year).toBe('2024');
        expect(json.tracks).toHaveLength(3);
    });
    it('should deserialize from JSON', () => {
        const json = {
            title: 'Album',
            artist: 'Artist',
            year: '2024',
            tracks: [
                { path: '/song1.mp3', title: 'Song 1', trackNumber: 1 },
                { path: '/song2.mp3', title: 'Song 2', trackNumber: 2 },
            ],
        };
        const album = Album.fromJSON(json);
        expect(album.getTitle()).toBe('Album');
        expect(album.getArtistString()).toBe('Artist');
        expect(album.getTrackCount()).toBe(2);
    });
    it('should compare equality', () => {
        const album1 = new Album({ title: 'Same', artist: 'Artist' });
        const album2 = new Album({ title: 'Same', artist: 'Artist' });
        const album3 = new Album({ title: 'Different', artist: 'Artist' });
        expect(album1.equals(album2)).toBe(true);
        expect(album1.equals(album3)).toBe(false);
    });
    it('should create empty album', () => {
        const album = Album.createEmpty('New Album', 'New Artist');
        expect(album.getTitle()).toBe('New Album');
        expect(album.getArtistString()).toBe('New Artist');
        expect(album.getTrackCount()).toBe(0);
    });
});
