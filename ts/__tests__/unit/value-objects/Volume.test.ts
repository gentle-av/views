import { describe, it, expect } from 'vitest';
import { Volume } from '../../../models/value-objects/Volume.js';

describe('Volume', () => {
  it('should create volume', () => {
    const vol = new Volume(75);
    expect(vol.getValue()).toBe(75);
  });

  it('should throw error on invalid volume', () => {
    expect(() => new Volume(-1)).toThrow('Volume must be between 0 and 100');
    expect(() => new Volume(101)).toThrow('Volume must be between 0 and 100');
  });

  it('should increase volume', () => {
    const vol = new Volume(50);
    expect(vol.increase(10).getValue()).toBe(60);
  });

  it('should decrease volume', () => {
    const vol = new Volume(50);
    expect(vol.decrease(10).getValue()).toBe(40);
  });

  it('should not exceed 100', () => {
    const vol = new Volume(95);
    expect(vol.increase(10).getValue()).toBe(100);
  });

  it('should not go below 0', () => {
    const vol = new Volume(5);
    expect(vol.decrease(10).getValue()).toBe(0);
  });

  it('should create default volume', () => {
    expect(Volume.default().getValue()).toBe(50);
  });
});
