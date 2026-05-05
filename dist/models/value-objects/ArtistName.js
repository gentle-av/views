/**
 * Value Object for artist name
 * Immutable, normalized artist name
 */
export class ArtistName {
    constructor(name) {
        if (!name || name.trim() === "") {
            throw new Error("Artist name cannot be empty");
        }
        this.name = this.normalize(name);
    }
    normalize(name) {
        return name.trim().replace(/\s+/g, " ");
    }
    getValue() {
        return this.name;
    }
    getDisplayName() {
        return this.name;
    }
    getFirstLetter() {
        return this.name.charAt(0).toUpperCase();
    }
    equals(other) {
        return this.name.toLowerCase() === other.getValue().toLowerCase();
    }
    matches(searchTerm) {
        return this.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    toString() {
        return this.name;
    }
    static unknown() {
        return new ArtistName("Unknown Artist");
    }
}
