export interface CardData {
  id: string; // The string ID (e.g., GAME_005)
  dbfId: number; // The numeric ID used in deck strings
  name: string;
  cost: number;
  rarity?: string;
  cardClass?: string;
  type?: string;
  text?: string;
}

export interface DeckCard {
  card: CardData;
  count: number;
}

export interface HandCard {
  card: CardData;
  originalIndex: number; // To track position
  isCoin?: boolean;
}

export type MulliganPhase = 'idle' | 'selection' | 'result';

export enum PlayerTurn {
  FIRST = 'FIRST',
  SECOND = 'SECOND'
}

export type Language = 'en' | 'zh-TW' | 'zh-CN';

// Moved from App.tsx so strategies can access it
export interface GameStateSnapshot {
  hand: HandCard[];
  remainingDeck: CardData[];
  logs: string[];
  turnCount: number;
  manaSpentThisTurn: number;
  manaThisTurn: number;
  totalMana: number;
}

// Represents a choice presented to the user
export interface InteractionOption {
  id: string;       // Unique ID for the option
  card: CardData;   // The card to display
  sourceIndex?: number; // Optional: where it came from in the deck
}

// Represents a button/action the user can click (e.g., "Select", "Add Copy")
export interface InteractionAction {
  labelKey: string; // Translation key for the button text
  actionType: string; // Internal type: 'PICK', 'COPY', etc.
  style: 'primary' | 'secondary';
}

// The core Strategy Interface
export interface InteractionStrategy {
  // Title for the Modal header
  getTitleKey(): string; 
  // Description for the Modal body
  getDescriptionKey(): string;
  // Log for the Modal result
  getLogKey(): string;

  // Logic to calculate available options based on current game state
  getOptions(gameState: GameStateSnapshot): InteractionOption[];
  
  // Logic to define what buttons appear for each option
  getActions(): InteractionAction[];

  // Logic to apply the user's choice and return the new Game State
  resolve(
    currentState: GameStateSnapshot, 
    selectedOption: InteractionOption, 
    actionType: string,
    idGenerator: () => number // Pass a function to generate unique IDs
  ): GameStateSnapshot;

  // If this returns a Strategy, the UI switches to it immediately instead of closing.
  getFollowUpStrategy?(
      selectedOption: InteractionOption
  ): InteractionStrategy | null;
}
