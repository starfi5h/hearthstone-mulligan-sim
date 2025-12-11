import { CardData, GameStateSnapshot } from '../types';

// Helper: Local shuffle to avoid circular dependency with App.tsx
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function swapAction(currentState: GameStateSnapshot, idGenerator: () => number): GameStateSnapshot {
  // Requirement implies X is hand length. If 0, nothing to swap.
  if (currentState.hand.length === 0) return currentState; 
  
  const newState: GameStateSnapshot = {
      ...currentState,
      hand: [...currentState.hand],
      remainingDeck: [...currentState.remainingDeck],
      logs: [...currentState.logs]
  };

  // X = hand size. Swap X cards.
  // If deck has fewer than X, swap all available deck cards.
  const count = Math.min(newState.hand.length, newState.remainingDeck.length);

  // Deck Cards -> Hand (Bottom 'count' cards)
  const newHandCardsFromDeck = newState.remainingDeck.splice(-count);

  // Hand Cards -> Deck (Append to Bottom)
  const cardsFromHand = newState.hand.map(h => h.card);

  // New Deck = Old Deck (minus bottom) + Old Hand
  newState.remainingDeck = [...newState.remainingDeck, ...cardsFromHand];

  // New Hand = Cards from Deck
  newState.hand = newHandCardsFromDeck.map(card => ({
      card,
      originalIndex: idGenerator()
  }));
  
  return newState;
}

