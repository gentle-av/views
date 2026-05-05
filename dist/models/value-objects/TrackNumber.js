/**
 * Value Object for track number
 * Immutable, validated track number (1-based)
 */
export class TrackNumber {
    constructor(number) {
        if (number < 1) {
            throw new Error("Track number must be at least 1");
        }
        if (number > 999) {
            throw new Error("Track number cannot exceed 999");
        }
        this.number = number;
    }
    getValue() {
        return this.number;
    }
    format() {
        return this.number.toString().padStart(2, "0");
    }
    equals(other) {
        return this.number === other.getValue();
    }
    static fromString(str) {
        const num = parseInt(str, 10);
        if (isNaN(num)) {
            throw new Error("Invalid track number string");
        }
        return new TrackNumber(num);
    }
}
