import { describe, it, expect } from 'vitest';
import { Duration } from '../../../models/value-objects/Duration.js';

describe('Duration', () => {
  it('should create duration from seconds', () => {
    const duration = new Duration(125);
    expect(duration.getSeconds()).toBe(125);
  });

  it('should throw error on negative duration', () => {
    expect(() => new Duration(-5)).toThrow('Duration cannot be negative');
  });

  it('should format duration', () => {
    const duration = new Duration(125);
    expect(duration.format()).toBe('2:05');
  });

  it('should format duration with hours', () => {
    const duration = new Duration(3665);
    expect(duration.format()).toBe('1:01:05');
  });

  it('should create zero duration', () => {
    const zero = Duration.zero();
    expect(zero.getSeconds()).toBe(0);
  });
});
