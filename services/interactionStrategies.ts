import { CardData, GameStateSnapshot, InteractionStrategy, InteractionOption, InteractionAction } from '../types';

// Helper: Local shuffle to avoid circular dependency with App.tsx
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Strategy for the "Dredge" mechanic.
 * Logic: Looks at the bottom 3 cards of the deck.
 * Action: "Select" (moves card to top of deck).
 */
export class DredgeStrategy implements InteractionStrategy {

  getTitleKey(): string { return 'modal_dredge'; }
  getDescriptionKey(): string { return 'modal_dredge_desc'; }
  getLogKey(): string { return 'msg_dredge'; }

  getOptions(gameState: GameStateSnapshot): InteractionOption[] {
    const { remainingDeck } = gameState;
    if (remainingDeck.length === 0) return [];

    // Take bottom 3 cards
    const deckLen = remainingDeck.length;
    const count = Math.min(3, deckLen);
    const startIndex = deckLen - count;
    
    // We reverse them to show the bottom-most as the "first" option usually, 
    // or just list them. Let's list them in order (Bottom-2, Bottom-1, Bottom).
    // The previous implementation used slice(-3).reverse().
    
    const bottomCards = remainingDeck.slice(startIndex).reverse();

    return bottomCards.map((card, i) => ({
        id: `dredge_${i}`,
        card: card,
        // We calculate the absolute index in the deck
        sourceIndex: (deckLen - 1) - i 
    }));
  }

  getActions(): InteractionAction[] {
    return [
        { labelKey: 'select', actionType: 'PICK', style: 'primary' }
    ];
  }

  resolve(
    currentState: GameStateSnapshot, 
    option: InteractionOption, 
    actionType: string,
    idGenerator: () => number
  ): GameStateSnapshot {
    const newState: GameStateSnapshot = {
        ...currentState,
        hand: [...currentState.hand],
        remainingDeck: [...currentState.remainingDeck],
        logs: [...currentState.logs]
    };

    if (actionType === 'PICK' && option.sourceIndex !== undefined) {
        // Remove from bottom (specific index)
        const [movedCard] = newState.remainingDeck.splice(option.sourceIndex, 1);
        
        // Add to top
        newState.remainingDeck.unshift(movedCard);
    }

    return newState;
  }
}

/**
 * Strategy for the "Discover" mechanic.
 * Logic: Looks at the deck, filters by type (optional), picks 3 random unique cards.
 * Action: "Select" (draws card) or "Add Copy" (generates new card).
 */
export class DiscoverStrategy implements InteractionStrategy {
  private filterType?: string;
  private isCopy: boolean;

  constructor(filterType?: string) {
    this.filterType = filterType;
    this.isCopy = false;
  }

  getTitleKey(): string { return 'modal_discover'; }
  getDescriptionKey(): string { return 'modal_discover_desc'; }
  getLogKey(): string { return this.isCopy ? 'msg_discover_copy' : 'msg_discover'; }

  getOptions(gameState: GameStateSnapshot): InteractionOption[] {
    const { remainingDeck } = gameState;
    
    // 1. Filter valid indices
    let poolIndices = remainingDeck.map((_, i) => i);
    if (this.filterType) {
        poolIndices = poolIndices.filter(i => remainingDeck[i].type === this.filterType);
    }

    if (poolIndices.length === 0) return [];

    // 2. Shuffle indices
    const shuffledIndices = shuffleArray(poolIndices);

    const options: InteractionOption[] = [];
    const seenDbfIds = new Set<number>();

    // 3. Select up to 3 unique cards
    for (const idx of shuffledIndices) {
      if (options.length >= 3) break;
      const card = remainingDeck[idx];
      if (!seenDbfIds.has(card.dbfId)) {
        seenDbfIds.add(card.dbfId);
        options.push({
            id: `opt_${idx}`,
            card: card,
            sourceIndex: idx // Track original index to remove it later
        });
      }
    }
    return options;
  }

  getActions(): InteractionAction[] {
    return [
        { labelKey: 'select', actionType: 'PICK', style: 'primary' },
        { labelKey: 'btn_add_copy', actionType: 'COPY', style: 'secondary' }
    ];
  }

  resolve(
    currentState: GameStateSnapshot, 
    option: InteractionOption, 
    actionType: string,
    idGenerator: () => number
  ): GameStateSnapshot {
    // Create a deep copy of state arrays to ensure immutability
    const newState: GameStateSnapshot = {
        ...currentState,
        hand: [...currentState.hand],
        remainingDeck: [...currentState.remainingDeck],
        logs: [...currentState.logs]
    };

    if (actionType === 'PICK') {
        // Remove from deck if it exists in the deck
        if (option.sourceIndex !== undefined) {
             // Find the card instance that matches the sourceIndex
             // Note: In a real app with IDs this is easier. Here we assume the index is valid 
             // for the snapshot provided.
             
             // However, simply splicing by index works because we operate on the snapshot 
             // used to generate options.
             
             // We need to be careful: if we filter indices, option.sourceIndex is the index in the FULL deck.
             // This is correct.
             if (option.sourceIndex < newState.remainingDeck.length) {
                newState.remainingDeck.splice(option.sourceIndex, 1);
             }
        }
        
        newState.hand.push({ card: option.card, originalIndex: idGenerator() });
        this.isCopy = false;
    } 
    else if (actionType === 'COPY') {
        // Do NOT remove from deck. Just add a copy to hand.
        newState.hand.push({ card: option.card, originalIndex: idGenerator() });
        this.isCopy = true;
    }

    return newState;
  }
}

/**
 * Strategy for the "Fracking" mechanic.
 * Logic: Looks at the bottom 3 cards of the deck. Draw one and destroy the others.
 * Action: "Select" (moves card to top of deck).
 */
export class FrackingStrategy implements InteractionStrategy {

  getTitleKey(): string { return 'modal_fracking'; }
  getDescriptionKey(): string { return 'modal_fracking_desc'; }
  getLogKey(): string { return 'msg_search'; }

  getOptions(gameState: GameStateSnapshot): InteractionOption[] {
    const { remainingDeck } = gameState;
    if (remainingDeck.length === 0) return [];

    // Take bottom 3 cards
    const deckLen = remainingDeck.length;
    const count = Math.min(3, deckLen);
    const startIndex = deckLen - count;
    const bottomCards = remainingDeck.slice(startIndex).reverse();

    return bottomCards.map((card, i) => ({
        id: `fracking_${i}`,
        card: card,
        // We calculate the absolute index in the deck
        sourceIndex: (deckLen - 1) - i 
    }));
  }

  getActions(): InteractionAction[] {
    return [
        { labelKey: 'select', actionType: 'PICK', style: 'primary' }
    ];
  }

  resolve(
    currentState: GameStateSnapshot, 
    option: InteractionOption, 
    actionType: string,
    idGenerator: () => number
  ): GameStateSnapshot {
    const newState: GameStateSnapshot = {
        ...currentState,
        hand: [...currentState.hand],
        remainingDeck: [...currentState.remainingDeck],
        logs: [...currentState.logs]
    };

    if (actionType === 'PICK' && option.sourceIndex !== undefined) {
      const count = Math.min(newState.remainingDeck.length, 3);
      newState.remainingDeck.splice(-count);
      newState.hand.push({ card: option.card, originalIndex: idGenerator() });
    }

    return newState;
  }
}

/**
 * Strategy for "Waveshaping"
 * Logic: Discover a card. The selected card goes to hand. 
 *        The UNSELECTED cards from the discovered pool are moved to the bottom of the deck.
 */
export class WaveshapingStrategy implements InteractionStrategy {
  // We need to store the generated options internally because resolve() needs to know
  // which cards were NOT selected to move them to the bottom.
  private currentOptions: InteractionOption[] = [];

  getTitleKey(): string { return 'modal_waveshaping'; }
  getDescriptionKey(): string { return 'modal_waveshaping_desc'; }
  getLogKey(): string { return 'msg_discover'; }

  getOptions(gameState: GameStateSnapshot): InteractionOption[] {
    const { remainingDeck } = gameState;
    const poolIndices = remainingDeck.map((_, i) => i);
    
    if (poolIndices.length === 0) return [];

    const shuffledIndices = shuffleArray(poolIndices);
    const options: InteractionOption[] = [];
    const seenDbfIds = new Set<number>();

    // Standard Discover logic: Pick 3 unique cards
    for (const idx of shuffledIndices) {
      if (options.length >= 3) break;
      const card = remainingDeck[idx];
      if (!seenDbfIds.has(card.dbfId)) {
        seenDbfIds.add(card.dbfId);
        options.push({
            id: `wave_${idx}`,
            card: card,
            sourceIndex: idx 
        });
      }
    }

    // Save strictly for use in resolve()
    this.currentOptions = options;
    return options;
  }

  getActions(): InteractionAction[] {
    return [
        { labelKey: 'select', actionType: 'PICK', style: 'primary' }
    ];
  }

  resolve(
    currentState: GameStateSnapshot, 
    selectedOption: InteractionOption, 
    actionType: string,
    idGenerator: () => number
  ): GameStateSnapshot {
    const newState: GameStateSnapshot = {
        ...currentState,
        hand: [...currentState.hand],
        remainingDeck: [...currentState.remainingDeck],
        logs: [...currentState.logs]
    };

    if (actionType === 'PICK') {
        // 1. Identify all indices involved (selected + unselected)
        // We must remove ALL generated options from their original positions first.
        const indicesToRemove = this.currentOptions
            .map(opt => opt.sourceIndex)
            .filter((idx): idx is number => idx !== undefined)
            .sort((a, b) => b - a); // Sort Descending is crucial for splicing

        // 2. Remove all 3 cards from the deck
        // Since we sort descending, removing index 10 won't affect index 2.
        indicesToRemove.forEach(index => {
            if (index < newState.remainingDeck.length) {
                newState.remainingDeck.splice(index, 1);
            }
        });

        // 3. Add Selected Card to Hand
        newState.hand.push({ card: selectedOption.card, originalIndex: idGenerator() });

        // 4. Handle Unselected Cards (Put to Bottom)
        const unselectedOptions = this.currentOptions.filter(opt => opt.id !== selectedOption.id);
        
        // "Put the others on the bottom" usually implies a random order among them
        const shuffledUnselected = shuffleArray(unselectedOptions);

        shuffledUnselected.forEach(opt => {
            newState.remainingDeck.push(opt.card);
        });
    }

    return newState;
  }
}

export class PickTwoStrategy implements InteractionStrategy {
  private currentOptions: InteractionOption[] = [];

  getTitleKey() { return 'modal_pick_two'; }
  getDescriptionKey() { return 'modal_pick_two_desc'; }
  getLogKey(): string { return 'msg_pick_two_step1'; }

  getOptions(gameState: GameStateSnapshot): InteractionOption[] {
    const { remainingDeck } = gameState;
    const poolIndices = remainingDeck.map((_, i) => i);
    if (poolIndices.length === 0) return [];

    const shuffled = shuffleArray(poolIndices);
    const options: InteractionOption[] = [];
    const seen = new Set<number>();

    for (const idx of shuffled) {
      if (options.length >= 3) break;
      const card = remainingDeck[idx];
      if (!seen.has(card.dbfId)) {
        seen.add(card.dbfId);
        options.push({ id: `pick2_step1_${idx}`, card, sourceIndex: idx });
      }
    }
    
    this.currentOptions = options;
    return options;
  }

  getActions(): InteractionAction[] {
    return [{ labelKey: 'select', actionType: 'PICK', style: 'primary' }];
  }

  resolve(
    state: GameStateSnapshot, 
    option: InteractionOption, 
    type: string, 
    genId: () => number
  ): GameStateSnapshot {
    const newState = { ...state, hand: [...state.hand], remainingDeck: [...state.remainingDeck], logs: [...state.logs] };

    // Remove the FIRST selection
    if (option.sourceIndex !== undefined) {
      newState.remainingDeck.splice(option.sourceIndex, 1);
    }
    newState.hand.push({ card: option.card, originalIndex: genId() });
    return newState;
  }

  // --- CHAINING LOGIC ---
  getFollowUpStrategy(selectedOption: InteractionOption): InteractionStrategy | null {
    // We need to calculate where the UNSELECTED cards are now located in the deck.
    // Since one card was removed (selectedOption.sourceIndex), 
    // any index larger than that needs to be decremented by 1.
    
    if (selectedOption.sourceIndex === undefined) return null;

    const removedIndex = selectedOption.sourceIndex;

    const nextStepIndices = this.currentOptions
        .filter(opt => opt.id !== selectedOption.id) // Get unpicked cards
        .map(opt => {
            const originalIdx = opt.sourceIndex!;
            // Adjust index: if original was below removed, it stays same. If above, it shifts down.
            return originalIdx > removedIndex ? originalIdx - 1 : originalIdx;
        });

    return new PickRemainingStrategy(nextStepIndices);
  }
}

class PickRemainingStrategy implements InteractionStrategy {
  // We store the specific indices of the cards remaining in the deck
  private remainingIndices: number[];

  constructor(indices: number[]) {
    this.remainingIndices = indices;
  }

  getTitleKey() { return 'modal_pick_remaining'; }
  getDescriptionKey() { return 'modal_pick_remaining_desc'; }
  getLogKey(): string { return 'msg_pick_two_step2'; }

  getOptions(gameState: GameStateSnapshot): InteractionOption[] {
    const { remainingDeck } = gameState;
    
    // Convert indices to options, but verify bounds
    // (Indices passed here are already adjusted for the removal in Step 1)
    return this.remainingIndices
      .filter(idx => idx < remainingDeck.length)
      .map(idx => ({
        id: `pick2_step2_${idx}`,
        card: remainingDeck[idx],
        sourceIndex: idx
      }));
  }

  getActions(): InteractionAction[] {
    return [{ labelKey: 'select', actionType: 'PICK', style: 'primary' }];
  }

  resolve(
    state: GameStateSnapshot, 
    option: InteractionOption, 
    type: string, 
    genId: () => number
  ): GameStateSnapshot {
    const newState = { ...state, hand: [...state.hand], remainingDeck: [...state.remainingDeck], logs: [...state.logs] };
    
    if (option.sourceIndex !== undefined) {
      newState.remainingDeck.splice(option.sourceIndex, 1);
    }
    newState.hand.push({ card: option.card, originalIndex: genId() });
    return newState;
  }
}
