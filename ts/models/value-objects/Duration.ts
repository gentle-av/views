/**
 * Value Object for duration in seconds
 * Immutable, validated duration
 */
export class Duration {
  private readonly seconds: number;

  constructor(seconds: number) {
    if (seconds < 0) {
      throw new Error("Duration cannot be negative");
    }
    this.seconds = seconds;
  }

  getSeconds(): number {
    return this.seconds;
  }

  getMinutes(): number {
    return Math.floor(this.seconds / 60);
  }

  getHours(): number {
    return Math.floor(this.seconds / 3600);
  }

  format(): string {
    const hours = this.getHours();
    const minutes = this.getMinutes() % 60;
    const secs = Math.floor(this.seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  formatShort(): string {
    const minutes = this.getMinutes();
    const secs = Math.floor(this.seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  isZero(): boolean {
    return this.seconds === 0;
  }

  equals(other: Duration): boolean {
    return this.seconds === other.getSeconds();
  }

  static zero(): Duration {
    return new Duration(0);
  }

  static fromString(timeStr: string): Duration {
    const parts = timeStr.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else {
      seconds = parts[0];
    }
    return new Duration(seconds);
  }
}
