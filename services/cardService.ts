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

const FABLED_DATA_ENUS: Array<CardData> = [
  {
    "id": "TIME_005t1",
    "dbfId": 119433,
    "name": "Tiny Rafaam",
    "cost": 1,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Deathrattle:</b> Draw a Rafaam.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t2",
    "dbfId": 119434,
    "name": "Green Rafaam",
    "cost": 2,
    "rarity": "LEGENDARY",
    "text": "<b>Battlecry:</b> Give Rafaams\nin your hand +2/+2.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t3",
    "dbfId": 119441,
    "name": "Explorer Rafaam",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "<b>Battlecry:</b> <b>Discover</b> a Rafaam from your deck.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t4",
    "dbfId": 119443,
    "name": "Warchief Rafaam",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Battlecry:</b> Gain 5 Armor.\nIf you control another\nRafaam, gain 5 more.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t5",
    "dbfId": 119444,
    "name": "Mindflayer R'faam",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Taunt</b>\n<b>Battlecry:</b> If you're holding\nanother Rafaam, summon\na copy of this.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t6",
    "dbfId": 119445,
    "name": "Calamitous Rafaam",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>Battlecry:</b> Deal 6 damage to all minions that aren't Rafaam.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t7",
    "dbfId": 119446,
    "name": "Giant Rafaam",
    "cost": 8,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Rush</b>. Costs (1) less\nfor each Rafaam you've\nplayed this game.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t8",
    "dbfId": 119447,
    "name": "Murloc Rafaam",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>Battlecry:</b> The next Rafaam you play costs (3) less.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t9",
    "dbfId": 119450,
    "name": "Archmage Rafaam",
    "cost": 9,
    "rarity": "LEGENDARY",
    "text": "<b>Battlecry:</b> Transform all minions that aren't Rafaam into 1/1 Sheep.",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_009t1",
    "dbfId": 119919,
    "name": "Gnomish Aura",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Tradeable</b>\nAt the end of your turn,\nrestore #4 Health to all your\ncharacters. Lasts 3 turns.",
    "type": "SPELL",
    "cardClass": "PALADIN"
  },
  {
    "id": "TIME_009t2",
    "dbfId": 119920,
    "name": "Mekkatorque's Aura",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Tradeable</b>. At the end\nof your turn, give a random\nfriendly minion +4/+4 and\n<b>Divine Shield</b>. Lasts 3 turns.",
    "type": "SPELL",
    "cardClass": "PALADIN"
  },
  {
    "id": "TIME_020t1",
    "dbfId": 120082,
    "name": "Axe of Cenarius",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Lifesteal</b>\nAfter your hero attacks\nand kills a minion, draw\na Portal to Argus.",
    "type": "WEAPON",
    "cardClass": "DEMONHUNTER"
  },
  {
    "id": "TIME_020t2",
    "dbfId": 120083,
    "name": "First Portal to Argus",
    "cost": 0,
    "rarity": "LEGENDARY",
    "text": "[x]Summon a 1/1 Demon for\nyour opponent. When it dies,\ndraw a card and shuffle the\nnext Portal into your deck.",
    "type": "SPELL",
    "cardClass": "DEMONHUNTER"
  },
  {
    "id": "TIME_209t",
    "dbfId": 119647,
    "name": "High King's Hammer",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Windfury</b>\n<b>Deathrattle:</b> Shuffle this\ninto your deck with +2\n Attack permanently.",
    "type": "WEAPON",
    "cardClass": "SHAMAN"
  },
  {
    "id": "TIME_209t2",
    "dbfId": 119653,
    "name": "Avatar Form",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "[x]Give a friendly character\n+2 Attack and \"After this\nattacks, deal 2 damage to\nall enemies\" this turn.",
    "type": "SPELL",
    "cardClass": "SHAMAN"
  },
  {
    "id": "TIME_211t1",
    "dbfId": 119929,
    "name": "The Well of Eternity",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "Fill your hand\nwith random\n<b>Temporary</b> spells.",
    "type": "LOCATION",
    "cardClass": "DRUID"
  },
  {
    "id": "TIME_211t2",
    "dbfId": 119930,
    "name": "Zin-Azshari",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "Summon a copy of a friendly minion.",
    "type": "LOCATION",
    "cardClass": "DRUID"
  },
  {
    "id": "TIME_609t1",
    "dbfId": 119705,
    "name": "Ranger Captain Alleria",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Battlecry:</b> <b>Discover</b> a spell.\nIf you've played Sylvanas or\nVereesa, repeat for each.",
    "type": "MINION",
    "cardClass": "HUNTER"
  },
  {
    "id": "TIME_609t2",
    "dbfId": 119706,
    "name": "Ranger Initiate Vereesa",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Battlecry:</b> Give minions in\nyour deck +1/+1. If you've\nplayed Alleria or Sylvanas,\nrepeat for each.",
    "type": "MINION",
    "cardClass": "HUNTER"
  },
  {
    "id": "TIME_619t",
    "dbfId": 120187,
    "name": "Bwonsamdi",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Deathrattle:</b> Summon a\nrandom 4-Cost minion.\n<i>(Any Boons given to\n   Bwonsamdi carry over.)</i>",
    "type": "MINION",
    "cardClass": "DEATHKNIGHT"
  },
  {
    "id": "TIME_619t2",
    "dbfId": 120188,
    "name": "What Befell Zandalar",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "[x]Deal $2 damage to all\nenemies. Choose a Boon\nto give to Bwonsamdi.",
    "type": "SPELL",
    "cardClass": "DEATHKNIGHT"
  },
  {
    "id": "TIME_850t",
    "dbfId": 119453,
    "name": "Broll, Blood Fighter",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Taunt</b>\n<b>Deathrattle:</b> Summon a Blood\nFighter from your hand. Give\nit +5/+5 and <b>Taunt</b>.",
    "type": "MINION",
    "cardClass": "WARRIOR"
  },
  {
    "id": "TIME_850t1",
    "dbfId": 119454,
    "name": "Valeera, Blood Fighter",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Elusive</b>\n<b>Deathrattle:</b> Summon a Blood\nFighter from your hand. Give\nit +5/+5 and <b>Elusive</b>.",
    "type": "MINION",
    "cardClass": "WARRIOR"
  },
  {
    "id": "TIME_852t1",
    "dbfId": 119527,
    "name": "Azure King Malygos",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "If you control another Dragon, your Arcane spells cast twice.",
    "type": "MINION",
    "cardClass": "MAGE"
  },
  {
    "id": "TIME_852t3",
    "dbfId": 119525,
    "name": "Azure Oathstone",
    "cost": 8,
    "rarity": "LEGENDARY",
    "text": "Summon your Dragons that died this game.",
    "type": "SPELL",
    "cardClass": "MAGE"
  },
  {
    "id": "TIME_875t",
    "dbfId": 119815,
    "name": "King Llane",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "[x]<b>Start of Game:</b> Hide from\nGarona in the enemy's deck.\n<b>Battlecry:</b> Draw a card. Shuffle\nthis back into your deck.",
    "type": "MINION",
    "cardClass": "ROGUE"
  },
  {
    "id": "TIME_875t1",
    "dbfId": 119816,
    "name": "The Kingslayers",
    "cost": 2,
    "rarity": "LEGENDARY",
    "text": "After your hero attacks, both players draw a <b>Legendary</b> card.",
    "type": "WEAPON",
    "cardClass": "ROGUE"
  },
  {
    "id": "TIME_890t",
    "dbfId": 120064,
    "name": "Atiesh the Greatstaff",
    "cost": 10,
    "rarity": "LEGENDARY",
    "text": "[x]Costs (0) if you control\nMedivh. Double the\ndamage and healing\nof your spells.",
    "type": "WEAPON",
    "cardClass": "PRIEST"
  },
  {
    "id": "TIME_890t2",
    "dbfId": 120068,
    "name": "Karazhan the Sanctum",
    "cost": 10,
    "rarity": "LEGENDARY",
    "text": "Costs (0) if you're wielding Atiesh. Summon two random 8-Cost minions.",
    "type": "LOCATION",
    "cardClass": "PRIEST"
  }
]

const FABLED_DATA_ZHCN: Array<CardData> = [
  {
    "id": "TIME_005t1",
    "dbfId": 119433,
    "name": "小小拉法姆",
    "cost": 1,
    "rarity": "LEGENDARY",
    "text": "<b>亡语：</b>抽一张拉法姆。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t2",
    "dbfId": 119434,
    "name": "绿色拉法姆",
    "cost": 2,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>使你手牌中的拉法姆获得+2/+2。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t3",
    "dbfId": 119441,
    "name": "探险者拉法姆",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>从你的牌库中<b>发现</b>一张拉法姆。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t4",
    "dbfId": 119443,
    "name": "大酋长拉法姆",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>获得5点护甲值。如果你控制着其他拉法姆，再获得5点。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t5",
    "dbfId": 119444,
    "name": "夺心者拉法姆",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "<b>嘲讽</b>。<b>战吼：</b>如果你的手牌中有其他拉法姆，召唤一个本随从的复制。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t6",
    "dbfId": 119445,
    "name": "灾异拉法姆",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>对所有非拉法姆随从造成6点伤害。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t7",
    "dbfId": 119446,
    "name": "巨人拉法姆",
    "cost": 8,
    "rarity": "LEGENDARY",
    "text": "<b>突袭</b>。在本局对战中，你每使用过一张拉法姆，本牌的法力值消耗便减少（1）点。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t8",
    "dbfId": 119447,
    "name": "鱼人拉法姆",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>你的下一张拉法姆的法力值消耗减少（3）点。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_005t9",
    "dbfId": 119450,
    "name": "大法师拉法姆",
    "cost": 9,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>将所有非拉法姆随从变形成为1/1的绵羊。",
    "type": "MINION",
    "cardClass": "WARLOCK"
  },
  {
    "id": "TIME_009t1",
    "dbfId": 119919,
    "name": "侏儒光环",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "<b>可交易</b>\n在你的回合结束时，为你的所有角色恢复#4点生命值。持续3回合。",
    "type": "SPELL",
    "cardClass": "PALADIN"
  },
  {
    "id": "TIME_009t2",
    "dbfId": 119920,
    "name": "梅卡托克的光环",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "<b>可交易</b>\n在你的回合结束时，随机使一个友方随从获得+4/+4和<b>圣盾</b>。持续3回合。",
    "type": "SPELL",
    "cardClass": "PALADIN"
  },
  {
    "id": "TIME_020t1",
    "dbfId": 120082,
    "name": "塞纳留斯之斧",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>吸血</b>。在你的英雄攻击并消灭一个随从后，抽一张阿古斯传送门。",
    "type": "WEAPON",
    "cardClass": "DEMONHUNTER"
  },
  {
    "id": "TIME_020t2",
    "dbfId": 120083,
    "name": "第一道阿古斯传送门",
    "cost": 0,
    "rarity": "LEGENDARY",
    "text": "为你的对手召唤一个1/1的恶魔。当它死亡时，抽一张牌，并将下一道传送门洗入你的牌库。",
    "type": "SPELL",
    "cardClass": "DEMONHUNTER"
  },
  {
    "id": "TIME_209t",
    "dbfId": 119647,
    "name": "高山之王的战锤",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>风怒</b>。<b>亡语：</b>将本武器洗入你的牌库并永久具有+2攻击力。",
    "type": "WEAPON",
    "cardClass": "SHAMAN"
  },
  {
    "id": "TIME_209t2",
    "dbfId": 119653,
    "name": "天神下凡形态",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "在本回合中，使一个友方角色获得+2攻击力和“在本角色攻击后，對所有敌人造成2点伤害”。",
    "type": "SPELL",
    "cardClass": "SHAMAN"
  },
  {
    "id": "TIME_211t1",
    "dbfId": 119929,
    "name": "永恒之井",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "用随机的<b>临时</b>法术牌填满你的手牌。",
    "type": "LOCATION",
    "cardClass": "DRUID"
  },
  {
    "id": "TIME_211t2",
    "dbfId": 119930,
    "name": "辛艾萨莉",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "召唤一个友方随从的一个复制。",
    "type": "LOCATION",
    "cardClass": "DRUID"
  },
  {
    "id": "TIME_609t1",
    "dbfId": 119705,
    "name": "游侠队长奥蕾莉亚",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b><b>发现</b>一张法术牌。如果你使用过希尔瓦娜斯或温蕾萨，每使用过一位，重复一次。",
    "type": "MINION",
    "cardClass": "HUNTER"
  },
  {
    "id": "TIME_609t2",
    "dbfId": 119706,
    "name": "游侠新兵温蕾萨",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>战吼：</b>使你牌库中的随从牌获得+1/+1。如果你使用过奥蕾莉亚或希尔瓦娜斯，每使用过一位，重复一次。",
    "type": "MINION",
    "cardClass": "HUNTER"
  },
  {
    "id": "TIME_619t",
    "dbfId": 120187,
    "name": "邦桑迪",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>亡语：</b>随机召唤一个法力值消耗为（4）的随从。<i>（邦桑迪获得的所有恩泽都会继承下去。）</i>",
    "type": "MINION",
    "cardClass": "DEATHKNIGHT"
  },
  {
    "id": "TIME_619t2",
    "dbfId": 120188,
    "name": "赞达拉的惨象",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "对所有敌人造成$2点伤害。选择并使邦桑迪获得一项恩泽。",
    "type": "SPELL",
    "cardClass": "DEATHKNIGHT"
  },
  {
    "id": "TIME_850t",
    "dbfId": 119453,
    "name": "血斗士布罗尔",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "<b>嘲讽</b>。<b>亡语：</b>从你的手牌中召唤一位血斗士，使其获得+5/+5和<b>嘲讽</b>。",
    "type": "MINION",
    "cardClass": "WARRIOR"
  },
  {
    "id": "TIME_850t1",
    "dbfId": 119454,
    "name": "血斗士瓦莉拉",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "<b>扰魔</b>。<b>亡语：</b>从你的手牌中召唤一位血斗士，使其获得+5/+5和<b>扰魔</b>。",
    "type": "MINION",
    "cardClass": "WARRIOR"
  },
  {
    "id": "TIME_852t1",
    "dbfId": 119527,
    "name": "碧蓝之王玛里苟斯",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "如果你控制着其他龙，你的奥术法术会施放两次。",
    "type": "MINION",
    "cardClass": "MAGE"
  },
  {
    "id": "TIME_852t3",
    "dbfId": 119525,
    "name": "碧蓝誓言石",
    "cost": 8,
    "rarity": "LEGENDARY",
    "text": "召唤在\n本局对战中死亡的你的龙。",
    "type": "SPELL",
    "cardClass": "MAGE"
  },
  {
    "id": "TIME_875t",
    "dbfId": 119815,
    "name": "莱恩国王",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>对战开始时：</b>躲避迦罗娜，藏进敌方牌库。<b>战吼：</b>抽一张牌。将本随从洗回你的牌库。",
    "type": "MINION",
    "cardClass": "ROGUE"
  },
  {
    "id": "TIME_875t1",
    "dbfId": 119816,
    "name": "弑君者",
    "cost": 2,
    "rarity": "LEGENDARY",
    "text": "在你的英雄\n攻击后，双方玩家各抽一张<b>传说</b>卡牌。",
    "type": "WEAPON",
    "cardClass": "ROGUE"
  },
  {
    "id": "TIME_890t",
    "dbfId": 120064,
    "name": "圣杖埃提耶什",
    "cost": 10,
    "rarity": "LEGENDARY",
    "text": "如果你控制着麦迪文，本牌的法力值消耗为（0）点。你的法术的伤害和治疗效果翻倍。",
    "type": "WEAPON",
    "cardClass": "PRIEST"
  },
  {
    "id": "TIME_890t2",
    "dbfId": 120068,
    "name": "圣地卡拉赞",
    "cost": 10,
    "rarity": "LEGENDARY",
    "text": "如果你装备着埃提耶什，本牌的法力值消耗为（0）点。随机召唤两个法力值消耗为（8）的随从。",
    "type": "LOCATION",
    "cardClass": "PRIEST"
  }
]

const FABLED_DATA_ZHTW: Array<CardData> = [
  {
    "id": "TIME_005t1",
    "dbfId": 119433,
    "name": "迷你拉法姆",
    "cost": 1,
    "rarity": "LEGENDARY",
    "text": "<b>死亡之聲：</b>抽一個\n拉法姆",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t2",
    "dbfId": 119434,
    "name": "綠色拉法姆",
    "cost": 2,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>賦予你手中的拉法姆+2/+2",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t3",
    "dbfId": 119441,
    "name": "探險者拉法姆",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>從你的牌堆\n<b>發現</b>一個拉法姆",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t4",
    "dbfId": 119443,
    "name": "大酋長拉法姆",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>獲得5點護甲值。若你場上有另一個拉法姆，再獲得5點",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t5",
    "dbfId": 119444,
    "name": "笞靈者拉法姆",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "<b>嘲諷</b>\n<b>戰吼：</b>若你手中有另一個拉法姆，召喚一個此手下的分身",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t6",
    "dbfId": 119445,
    "name": "災禍拉法姆",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>對不是拉法姆的全部手下造成6點\n傷害",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t7",
    "dbfId": 119446,
    "name": "巨大拉法姆",
    "cost": 8,
    "rarity": "LEGENDARY",
    "text": "<b>衝刺</b>\n你在本賽局中打出的每個拉法姆使消耗\n減少(1)",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t8",
    "dbfId": 119447,
    "name": "魚人拉法姆",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>你打出的下一個拉法姆消耗減少(3)",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_005t9",
    "dbfId": 119450,
    "name": "大法師拉法姆",
    "cost": 9,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>將不是拉法姆的全部手下變形\n為1/1的羊",
    "type": "MINION",
    "cardClass": "WARLOCK"
    },
    {
    "id": "TIME_009t1",
    "dbfId": 119919,
    "name": "地精光環",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "<b>可更換</b>\n在你的回合結束時，為你的全部角色恢復\n#4點生命值。持續3回合",
    "type": "SPELL",
    "cardClass": "PALADIN"
    },
    {
    "id": "TIME_009t2",
    "dbfId": 119920,
    "name": "梅卡托克的光環",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "<b>可更換</b>。在你的回合結束時，賦予一個隨機友方手下+4/+4和<b>聖盾術</b>。持續3回合",
    "type": "SPELL",
    "cardClass": "PALADIN"
    },
    {
    "id": "TIME_020t1",
    "dbfId": 120082,
    "name": "塞納留斯之斧",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>生命竊取</b>\n在你的英雄攻擊並殺死一個手下後，抽一張阿古斯傳送門",
    "type": "WEAPON",
    "cardClass": "DEMONHUNTER"
    },
    {
    "id": "TIME_020t2",
    "dbfId": 120083,
    "name": "第一道阿古斯傳送門",
    "cost": 0,
    "rarity": "LEGENDARY",
    "text": "為對手召喚一個1/1惡魔。當它死亡時，抽一張牌並將下一道傳送門洗入你的牌堆",
    "type": "SPELL",
    "cardClass": "DEMONHUNTER"
    },
    {
    "id": "TIME_209t",
    "dbfId": 119647,
    "name": "高山之王之錘",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>風怒</b>\n<b>死亡之聲：</b>將此武器洗入你的牌堆，其攻擊力永久+2",
    "type": "WEAPON",
    "cardClass": "SHAMAN"
    },
    {
    "id": "TIME_209t2",
    "dbfId": 119653,
    "name": "石之聖者形態",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "本回合賦予一個友方角色+2攻擊力和「在此手下攻擊後，對全部敵人造成2點傷害」",
    "type": "SPELL",
    "cardClass": "SHAMAN"
    },
    {
    "id": "TIME_211t1",
    "dbfId": 119929,
    "name": "永恆之井",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "用隨機<b>暫時</b>法術塞滿你的手牌",
    "type": "LOCATION",
    "cardClass": "DRUID"
    },
    {
    "id": "TIME_211t2",
    "dbfId": 119930,
    "name": "辛艾薩拉",
    "cost": 4,
    "rarity": "LEGENDARY",
    "text": "召喚一個友方手下的分身",
    "type": "LOCATION",
    "cardClass": "DRUID"
    },
    {
    "id": "TIME_609t1",
    "dbfId": 119705,
    "name": "遊俠隊長艾蘭里亞",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b><b>發現</b>一個法術，\n再依你打出過的希瓦娜斯或凡蕾莎重複此效果",
    "type": "MINION",
    "cardClass": "HUNTER"
    },
    {
    "id": "TIME_609t2",
    "dbfId": 119706,
    "name": "遊俠新兵凡蕾莎",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>戰吼：</b>賦予你牌堆中的手下+1/+1，再依你打出過的艾蘭里亞或希瓦娜斯重複此效果",
    "type": "MINION",
    "cardClass": "HUNTER"
    },
    {
    "id": "TIME_619t",
    "dbfId": 120187,
    "name": "伯昂撒姆第",
    "cost": 6,
    "rarity": "LEGENDARY",
    "text": "<b>死亡之聲：</b>召喚一個消耗為4的隨機手下<i>(賦予伯昂撒姆第的任何恩澤都會繼承)</i>",
    "type": "MINION",
    "cardClass": "DEATHKNIGHT"
    },
    {
    "id": "TIME_619t2",
    "dbfId": 120188,
    "name": "贊達拉的命運",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "對全部敵人造成$2點傷害。選擇一種恩澤賦予伯昂撒姆第",
    "type": "SPELL",
    "cardClass": "DEATHKNIGHT"
    },
    {
    "id": "TIME_850t",
    "dbfId": 119453,
    "name": "『鮮血鬥士』布洛",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "<b>嘲諷</b>\n<b>死亡之聲：</b>從你的手中召喚一個鮮血鬥士，賦予它+5/+5和<b>嘲諷</b>",
    "type": "MINION",
    "cardClass": "WARRIOR"
    },
    {
    "id": "TIME_850t1",
    "dbfId": 119454,
    "name": "『鮮血鬥士』瓦麗拉",
    "cost": 7,
    "rarity": "LEGENDARY",
    "text": "<b>飄渺</b>\n<b>死亡之聲：</b>從你的手中召喚一個鮮血鬥士，賦予它+5/+5和<b>飄渺</b>",
    "type": "MINION",
    "cardClass": "WARRIOR"
    },
    {
    "id": "TIME_852t1",
    "dbfId": 119527,
    "name": "蒼藍之王瑪里苟斯",
    "cost": 5,
    "rarity": "LEGENDARY",
    "text": "若你場上有其他龍類，你的秘法法術施放兩次",
    "type": "MINION",
    "cardClass": "MAGE"
    },
    {
    "id": "TIME_852t3",
    "dbfId": 119525,
    "name": "蒼藍誓言石",
    "cost": 8,
    "rarity": "LEGENDARY",
    "text": "召喚本賽局中死亡的友方龍類",
    "type": "SPELL",
    "cardClass": "MAGE"
    },
    {
    "id": "TIME_875t",
    "dbfId": 119815,
    "name": "萊恩王",
    "cost": 3,
    "rarity": "LEGENDARY",
    "text": "<b>對戰開始：</b>躲入敵方\n牌堆逃避迦羅娜\n<b>戰吼：</b>抽一張牌，並將\n此手下洗入你的牌堆",
    "type": "MINION",
    "cardClass": "ROGUE"
    },
    {
    "id": "TIME_875t1",
    "dbfId": 119816,
    "name": "弒君之刃",
    "cost": 2,
    "rarity": "LEGENDARY",
    "text": "在你的英雄攻擊後，雙方抽一張\n<b>傳說</b>牌",
    "type": "WEAPON",
    "cardClass": "ROGUE"
    },
    {
    "id": "TIME_890t",
    "dbfId": 120064,
    "name": "阿泰絲大法杖",
    "cost": 10,
    "rarity": "LEGENDARY",
    "text": "若你場上有麥迪文，消耗為(0)。使你的法術造成的傷害和治療效果加倍",
    "type": "WEAPON",
    "cardClass": "PRIEST"
    },
    {
    "id": "TIME_890t2",
    "dbfId": 120068,
    "name": "聖所卡拉贊",
    "cost": 10,
    "rarity": "LEGENDARY",
    "text": "若你裝備了阿泰絲，消耗為(0)。召喚兩個消耗為8的隨機手下",
    "type": "LOCATION",
    "cardClass": "PRIEST"
    }
];


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

    // Add Fabled cards (uncollectible)
    let fabled_data = FABLED_DATA_ENUS;
    if (lang == 'zh-CN') fabled_data = FABLED_DATA_ZHCN;
    else if (lang == 'zh-TW') fabled_data = FABLED_DATA_ZHTW;
    fabled_data.forEach(card => {
      byDbfId.set(card.dbfId, card);
      byId.set(card.id, card);
    });

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