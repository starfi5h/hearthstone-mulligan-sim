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
