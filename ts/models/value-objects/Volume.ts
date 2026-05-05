/**
 * Value Object for volume level
 * Immutable, validated volume 0-100
 */
export class Volume {
  private readonly level: number;

  constructor(level: number) {
    if (level < 0 || level > 100) {
      throw new Error("Volume must be between 0 and 100");
    }
    this.level = level;
  }

  getValue(): number {
    return this.level;
  }

  getPercentage(): number {
    return this.level;
  }

  isMuted(): boolean {
    return this.level === 0;
  }

  isMax(): boolean {
    return this.level === 100;
  }

  increase(amount: number = 5): Volume {
    return new Volume(Math.min(100, this.level + amount));
  }

  decrease(amount: number = 5): Volume {
    return new Volume(Math.max(0, this.level - amount));
  }

  equals(other: Volume): boolean {
    return this.level === other.getValue();
  }

  toString(): string {
    return `${this.level}%`;
  }

  static zero(): Volume {
    return new Volume(0);
  }

  static hundred(): Volume {
    return new Volume(100);
  }

  static default(): Volume {
    return new Volume(50);
  }
}
