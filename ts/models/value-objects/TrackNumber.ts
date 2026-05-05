/**
 * Value Object for track number
 * Immutable, validated track number (1-based)
 */
export class TrackNumber {
  private readonly number: number;

  constructor(number: number) {
    if (number < 1) {
      throw new Error("Track number must be at least 1");
    }
    if (number > 999) {
      throw new Error("Track number cannot exceed 999");
    }
    this.number = number;
  }

  getValue(): number {
    return this.number;
  }

  format(): string {
    return this.number.toString().padStart(2, "0");
  }

  equals(other: TrackNumber): boolean {
    return this.number === other.getValue();
  }

  static fromString(str: string): TrackNumber {
    const num = parseInt(str, 10);
    if (isNaN(num)) {
      throw new Error("Invalid track number string");
    }
    return new TrackNumber(num);
  }
}
