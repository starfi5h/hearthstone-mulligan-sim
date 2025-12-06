import { CardData, Language } from "../types";

const API_BASE_URL = "https://api.hearthstonejson.com/v1/latest";

// Cache for databases to prevent re-fetching
const dbCache: Record<string, { byDbfId: Map<number, CardData>, byId: Map<string, CardData> }> = {};

// Current active database references
let currentByDbfId: Map<number, CardData> | null = null;
let currentById: Map<string, CardData> | null = null;
let currentLang: Language = 'en';

const COIN_DATA: Record<Language, CardData> = {
    'en': {
        id: "GAME_005",
        dbfId: 1746,
        name: "The Coin",
        cost: 0,
        rarity: "COMMON",
        text: "Gain 1 Mana Crystal this turn only.",
        type: "SPELL",
        cardClass: "NEUTRAL"
    },
    'zh-CN': {
        id: "GAME_005",
        dbfId: 1746,
        name: "幸运币",
        cost: 0,
        rarity: "COMMON",
        text: "在本回合中，获得一个法力水晶。",
        type: "SPELL",
        cardClass: "NEUTRAL"
    },
    'zh-TW': {
        id: "GAME_005",
        dbfId: 1746,
        name: "幸運幣",
        cost: 0,
        rarity: "COMMON",
        text: "本回合獲得一顆法力水晶。",
        type: "SPELL",
        cardClass: "NEUTRAL"
    }
};

export const getHSLocale = (lang: Language): string => {
    switch (lang) {
        case 'zh-CN': return 'zhCN';
        case 'zh-TW': return 'zhTW';
        default: return 'enUS';
    }
};

export const initializeCardDatabase = async (lang: Language = 'en'): Promise<void> => {
  currentLang = lang;
  const hsLocale = getHSLocale(lang);

  // Use cache if available
  if (dbCache[hsLocale]) {
      currentByDbfId = dbCache[hsLocale].byDbfId;
      currentById = dbCache[hsLocale].byId;
      return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${hsLocale}/cards.collectible.json`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data: CardData[] = await response.json();

    const byDbfId = new Map<number, CardData>();
    const byId = new Map<string, CardData>();

    data.forEach(card => {
      byDbfId.set(card.dbfId, card);
      byId.set(card.id, card);
    });
    
    // Ensure Coin is in the lookup map
    const coin = COIN_DATA[lang];
    byId.set("GAME_005", coin);

    // Update Cache and References
    dbCache[hsLocale] = { byDbfId, byId };
    currentByDbfId = byDbfId;
    currentById = byId;

  } catch (error) {
    console.error("Failed to load card database:", error);
    throw error;
  }
};

export const getCardByDbfId = (dbfId: number): CardData | undefined => {
  return currentByDbfId?.get(dbfId);
};

export const getCardById = (id: string): CardData | undefined => {
  return currentById?.get(id);
};

export const getCoinCard = (lang?: Language): CardData => {
    return COIN_DATA[lang || currentLang] || COIN_DATA['en'];
}