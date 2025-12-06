/**
 * Decodes a Hearthstone deck string into a list of DBF IDs.
 * Implements the VarInt and logic described in:
 * https://hearthsim.info/docs/deckstrings/
 */

export interface DecodedDeck {
  heroes: number[];
  cards: { [dbfId: number]: number }; // map of dbfId -> count
  format: number; // 1 = standard, 2 = wild
}

export function decodeDeckString(deckString: string): DecodedDeck | null {
  try {
    // 1. Decode Base64
    const binaryString = atob(deckString);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let offset = 0;

    // Helper to read VarInt
    const readVarInt = (): number => {
      let result = 0;
      let shift = 0;
      while (true) {
        if (offset >= bytes.length) throw new Error("Unexpected end of stream");
        const byte = bytes[offset++];
        result |= (byte & 0x7f) << shift;
        shift += 7;
        if ((byte & 0x80) === 0) return result;
      }
    };

    // 2. Parse Header
    const reserved = bytes[offset++]; // Should be 0
    if (reserved !== 0) {
        // Some robust decoders skip this check, but spec says 0.
        // We will just proceed but log warning if needed.
    }
    
    const version = readVarInt(); // Should be 1
    if (version !== 1) {
        // console.warn("Unknown version: " + version);
    }

    const format = readVarInt();

    // 3. Parse Heroes
    const numHeroes = readVarInt();
    const heroes: number[] = [];
    for (let i = 0; i < numHeroes; i++) {
      heroes.push(readVarInt());
    }

    const cards: { [dbfId: number]: number } = {};

    // 4. Parse Single Copies
    const numSingle = readVarInt();
    for (let i = 0; i < numSingle; i++) {
      const dbfId = readVarInt();
      cards[dbfId] = (cards[dbfId] || 0) + 1;
    }

    // 5. Parse Double Copies
    const numDouble = readVarInt();
    for (let i = 0; i < numDouble; i++) {
      const dbfId = readVarInt();
      cards[dbfId] = (cards[dbfId] || 0) + 2;
    }

    // 6. Parse N-Copies
    const numMulti = readVarInt();
    for (let i = 0; i < numMulti; i++) {
      const dbfId = readVarInt();
      const count = readVarInt();
      cards[dbfId] = (cards[dbfId] || 0) + count;
    }

    return { heroes, cards, format };
  } catch (e) {
    console.error("Failed to decode deck string", e);
    return null;
  }
}
