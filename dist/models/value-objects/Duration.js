/**
 * Value Object for duration in seconds
 * Immutable, validated duration
 */
export class Duration {
    constructor(seconds) {
        if (seconds < 0) {
            throw new Error("Duration cannot be negative");
        }
        this.seconds = seconds;
    }
    getSeconds() {
        return this.seconds;
    }
    getMinutes() {
        return Math.floor(this.seconds / 60);
    }
    getHours() {
        return Math.floor(this.seconds / 3600);
    }
    format() {
        const hours = this.getHours();
        const minutes = this.getMinutes() % 60;
        const secs = Math.floor(this.seconds % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
    formatShort() {
        const minutes = this.getMinutes();
        const secs = Math.floor(this.seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
    isZero() {
        return this.seconds === 0;
    }
    equals(other) {
        return this.seconds === other.getSeconds();
    }
    static zero() {
        return new Duration(0);
    }
    static fromString(timeStr) {
        const parts = timeStr.split(":").map(Number);
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        else if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        }
        else {
            seconds = parts[0];
        }
        return new Duration(seconds);
    }
}
