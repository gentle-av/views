import { describe, it, expect } from 'vitest';
import { FilePath } from '../../../models/value-objects/FilePath.js';

describe('FilePath', () => {
  it('should create valid file path', () => {
    const path = new FilePath('/mnt/video/movie.mp4');
    expect(path.getValue()).toBe('/mnt/video/movie.mp4');
  });

  it('should throw error on empty path', () => {
    expect(() => new FilePath('')).toThrow('File path cannot be empty');
  });

  it('should extract file name', () => {
    const path = new FilePath('/mnt/video/test.mp4');
    expect(path.getFileName()).toBe('test.mp4');
  });

  it('should extract extension', () => {
    const path = new FilePath('/mnt/video/video.mkv');
    expect(path.getExtension()).toBe('mkv');
  });

  it('should detect video files', () => {
    expect(new FilePath('/test.mp4').isVideo()).toBe(true);
    expect(new FilePath('/test.txt').isVideo()).toBe(false);
  });
});
