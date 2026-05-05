/**
 * Value Object for artist name
 * Immutable, normalized artist name
 */
export class ArtistName {
  private readonly name: string;

  constructor(name: string) {
    if (!name || name.trim() === "") {
      throw new Error("Artist name cannot be empty");
    }
    this.name = this.normalize(name);
  }

  private normalize(name: string): string {
    return name.trim().replace(/\s+/g, " ");
  }

  getValue(): string {
    return this.name;
  }

  getDisplayName(): string {
    return this.name;
  }

  getFirstLetter(): string {
    return this.name.charAt(0).toUpperCase();
  }

  equals(other: ArtistName): boolean {
    return this.name.toLowerCase() === other.getValue().toLowerCase();
  }

  matches(searchTerm: string): boolean {
    return this.name.toLowerCase().includes(searchTerm.toLowerCase());
  }

  toString(): string {
    return this.name;
  }

  static unknown(): ArtistName {
    return new ArtistName("Unknown Artist");
  }
}
