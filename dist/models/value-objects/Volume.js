/**
 * Value Object for volume level
 * Immutable, validated volume 0-100
 */
export class Volume {
    constructor(level) {
        if (level < 0 || level > 100) {
            throw new Error("Volume must be between 0 and 100");
        }
        this.level = level;
    }
    getValue() {
        return this.level;
    }
    getPercentage() {
        return this.level;
    }
    isMuted() {
        return this.level === 0;
    }
    isMax() {
        return this.level === 100;
    }
    increase(amount = 5) {
        return new Volume(Math.min(100, this.level + amount));
    }
    decrease(amount = 5) {
        return new Volume(Math.max(0, this.level - amount));
    }
    equals(other) {
        return this.level === other.getValue();
    }
    toString() {
        return `${this.level}%`;
    }
    static zero() {
        return new Volume(0);
    }
    static hundred() {
        return new Volume(100);
    }
    static default() {
        return new Volume(50);
    }
}
