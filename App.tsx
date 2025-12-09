import React, { useState, useEffect, useCallback, useRef } from 'react';
import { decodeDeckString } from './services/deckDecoder';
import { initializeCardDatabase, getCardByDbfId, getCoinCard } from './services/cardService';
import { DeckCard, CardData, HandCard, MulliganPhase, PlayerTurn, Language } from './types';
import { DeckList } from './components/DeckList';
import { CardDisplay } from './components/CardDisplay';
import { translations } from './utils/translations';

// Shuffle Utility
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// History State Interface
interface GameStateSnapshot {
  hand: HandCard[];
  remainingDeck: CardData[];
  logs: string[];
  turnCount: number;
  manaSpentThisTurn: number;
  manaThisTurn: number;  
  totalMana: number;
}

interface ModalState {
  isOpen: boolean;
  type: 'DISCOVER' | 'DREDGE' | null;
  cards: CardData[];
  indices?: number[]; // To track original deck indices for Discover
  discoverType?: string; // To track if a specific type filter was used for logging
}

// Drag State Interface
interface DraggingItem {
    type: 'HAND' | 'DECK';
    card: CardData;
    handIndex?: number;
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [dbLoading, setDbLoading] = useState(true);
  const [deckString, setDeckString] = useState('');
  //const [deck, setDeck] = useState<DeckCard[]>([]);
  const [flatDeck, setFlatDeck] = useState<CardData[]>([]);
  
  // Game State
  const [hand, setHand] = useState<HandCard[]>([]);
  const [phase, setPhase] = useState<MulliganPhase>('idle');
  const [turnType, setTurnType] = useState<PlayerTurn | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [remainingDeck, setRemainingDeck] = useState<CardData[]>([]);
  const [turnCount, setTurnCount] = useState<number>(1);
  const [manaSpentThisTurn, setManaSpentThisTurn] = useState<number>(0);
  const [manaThisTurn, setManaThisTurn] = useState<number>(0);
  const [totalMana, setTotalMana] = useState<number>(0);
  
  // New Features State
  const [history, setHistory] = useState<GameStateSnapshot[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null, cards: [] });
  const uniqueIdCounter = useRef(1000); // For generating unique keys for new cards
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const [dragTooltip, setDragTooltip] = useState<{ visible: boolean, x: number, y: number, text: string }>({ visible: false, x: 0, y: 0, text: '' });

  // UI State
  const [showTrueOrder, setShowTrueOrder] = useState(false);
  const [isLogDesc, setIsLogDesc] = useState(true); // Default descending (newest first)

  // Stats State
  // 5 counters for success types, 1 shared total
  const [successCounts, setSuccessCounts] = useState<number[]>([0, 0, 0, 0, 0]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Init DB and Handle Language Switch
  useEffect(() => {
    setDbLoading(true);
    initializeCardDatabase(lang)
      .then(() => {
        setDbLoading(false);
        
        // Refresh cards in state to match new language
        const refresh = (c: CardData): CardData => {
             if (c.id === 'GAME_005') return getCoinCard(lang);
             return getCardByDbfId(c.dbfId) || c;
        };

        // Update Deck Lists and Hand
        //setDeck(prev => prev.map(item => ({ ...item, card: refresh(item.card) })));
        setFlatDeck(prev => prev.map(c => refresh(c)));
        setHand(prev => prev.map(h => ({ ...h, card: refresh(h.card) })));
        setRemainingDeck(prev => prev.map(c => refresh(c)));
      })
      .catch((err) => {
          console.error(err);
          setDbLoading(false);
          alert(t['msg_db_error']);
      });
  }, [lang]); 

  // Auto-scroll logs logic
  useEffect(() => {
    if (logContainerRef.current) {
      if (isLogDesc) {
        // If descending (newest top), scroll to top
        logContainerRef.current.scrollTop = 0;
      } else {
        // If ascending (oldest top), scroll to bottom
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }
  }, [logs, isLogDesc]);

  // Parse Deck
  const handleLoadDeck = useCallback(() => {
    if (dbLoading) return;
    if (!deckString.trim()) return;

    const decoded = decodeDeckString(deckString.trim());
    if (!decoded) {
      alert(t['msg_invalid_deck']);
      return;
    }

    const newDeckList: DeckCard[] = [];
    const newFlatDeck: CardData[] = [];

    Object.entries(decoded.cards).forEach(([dbfIdStr, val]) => {
      const count = Number(val);
      const dbfId = parseInt(dbfIdStr);
      const card = getCardByDbfId(dbfId);
      if (card) {
        newDeckList.push({ card, count });
        for (let i = 0; i < count; i++) {
          newFlatDeck.push(card);
        }
      }
    });

    //setDeck(newDeckList);
    setFlatDeck(newFlatDeck);
    
    // Reset game state
    setHand([]);
    setPhase('idle');
    setTurnType(null);
    setSelectedIndices(new Set());
    setShowTrueOrder(false);
    setLogs([]);
    setHistory([]);
    setTurnCount(0);
    setManaSpentThisTurn(0);
    setManaThisTurn(0);
    setTotalMana(0);
  }, [deckString, dbLoading, t]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const saveHistory = () => {
    setHistory(prev => [
      ...prev,
      {
        hand: [...hand],
        remainingDeck: [...remainingDeck],
        logs: [...logs],
        turnCount: turnCount,
        manaSpentThisTurn: manaSpentThisTurn,
        manaThisTurn: manaThisTurn,
        totalMana: totalMana
      }
    ]);
  };

  // Start Simulation
  const startSimulation = (turn: PlayerTurn) => {
    if (flatDeck.length === 0) return;

    // Reset stuff
    setLogs([]);
    setHistory([]);
    setTurnCount(0);
    setManaSpentThisTurn(0);
    setManaThisTurn(0);
    setTotalMana(0);
    uniqueIdCounter.current = 1000;

    // 1. Shuffle full deck
    const shuffled = shuffleArray<CardData>(flatDeck);
    
    // 2. Determine initial draw count
    const drawCount = turn === PlayerTurn.FIRST ? 3 : 4;
    
    // 3. Draw cards
    const initialHand: HandCard[] = [];
    const deckAfterDraw: CardData[] = [...shuffled];
    
    for (let i = 0; i < drawCount; i++) {
      if (deckAfterDraw.length > 0) {
        initialHand.push({
          card: deckAfterDraw.shift()!,
          originalIndex: i
        });
      }
    }

    setHand(initialHand);
    setRemainingDeck(deckAfterDraw);
    setPhase('selection');
    setTurnType(turn);
    setSelectedIndices(new Set());
    addLog(turn === PlayerTurn.FIRST ? t['msg_start_first'] : t['msg_start_second']);
  };

  // Toggle Card Selection
  const toggleSelection = (index: number) => {
    if (phase !== 'selection') return;
    
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  // Confirm Mulligan
  const confirmMulligan = () => {
    if (phase !== 'selection') return;
    
    const keptCards: HandCard[] = [];
    const cardsToShuffleBack: CardData[] = [];
    const indicesToReplace = Array.from(selectedIndices);

    hand.forEach((handCard, idx) => {
      if (handCard.isCoin) {
          keptCards.push(handCard); 
      } else if (indicesToReplace.includes(idx)) {
        cardsToShuffleBack.push(handCard.card);
      } else {
        keptCards.push(handCard);
      }
    });

    let currentDeck = [...remainingDeck];
    const replacements: HandCard[] = [];

    for (let i = 0; i < cardsToShuffleBack.length; i++) {
        if (currentDeck.length > 0) {
            replacements.push({
                card: currentDeck.shift()!,
                originalIndex: uniqueIdCounter.current++ 
            });
        }
    }

    currentDeck = shuffleArray([...currentDeck, ...cardsToShuffleBack]);

    const finalHand = hand.map((handCard, idx) => {
        if (handCard.isCoin) return handCard;
        if (selectedIndices.has(idx)) {
            const newCard = replacements.shift();
            return newCard || handCard; 
        }
        return handCard;
    });

    // Add Coin if Second Player
    if (turnType === PlayerTurn.SECOND) {
        const coinCard = getCoinCard(lang);
        if (coinCard) {
            finalHand.push({
                card: coinCard,
                originalIndex: uniqueIdCounter.current++,
                isCoin: true
            });
        }
    }

    setHand(finalHand);
    setRemainingDeck(currentDeck);
    setPhase('result');
    setSelectedIndices(new Set());
    setTotalCount(prev => prev + 1);
    setManaSpentThisTurn(0);
    setManaThisTurn(0);
    setTotalMana(0);
    

    let historyArray = [];
    let logArray = [];

    logArray.push(finalHand.length == 3 ? t['msg_start_first'] : t['msg_start_second']);
    let logMsg = t['msg_mulligan_done']
        .replace('{kept}', keptCards.length.toString())
        .replace('{swapped}', indicesToReplace.length.toString());
    addLog(logMsg);
    logArray.push(logMsg);
            
    historyArray.push({
      hand: finalHand,
      remainingDeck: currentDeck,
      logs: [logArray[0], logArray[1]],
      turnCount: 0,
      manaSpentThisTurn: 0,
      manaThisTurn: 0,
      totalMana: 0
    });
    // Initialize History for the post-mulligan state
    setHistory(historyArray);

    // Handle Start Turn
    logMsg = t['msg_start_turn'].replace('{turn}', (turnCount + 1).toString());
    setTurnCount(1);
    setManaThisTurn(1);
    setTotalMana(1);

    if (remainingDeck.length == 0) {
      // No Deck
      addLog(logMsg);
    }
    else { 
      // Handle Draw
      const newDeck = [...currentDeck];
      const card = newDeck.shift()!;
      const newHand = [...finalHand, { card, originalIndex: uniqueIdCounter.current++ }];      
      setRemainingDeck(newDeck);
      setHand(newHand);

      logMsg += t['msg_draw'].replace('{card}', card.name);
      addLog(logMsg);
    }
  };

  // --- Actions ---

  const handleUndo = () => {
    if (history.length == 0) return; // Keep the initial state
    const newHistory = [...history];    
    const previousState = newHistory.pop() as GameStateSnapshot; // Remove current state

    setHand(previousState.hand);
    setRemainingDeck(previousState.remainingDeck);
    setLogs(previousState.logs);
    setTurnCount(previousState.turnCount);
    setManaSpentThisTurn(previousState.manaSpentThisTurn);
    setManaThisTurn(previousState.manaThisTurn);
    setTotalMana(previousState.totalMana);
    setHistory(newHistory);
  };

  const handleDraw = () => {
    if (remainingDeck.length === 0) return;
    saveHistory();

    const currentDeck = [...remainingDeck];
    const card = currentDeck.shift()!;
    const newHand = [...hand, { card, originalIndex: uniqueIdCounter.current++ }];
    
    setRemainingDeck(currentDeck);
    setHand(newHand);
    addLog(t['msg_draw'].replace('{card}', card.name));
  };

  const handleDrawSpecific = (type: string) => {
    const index = remainingDeck.findIndex(c => c.type === type);
    if (index === -1) {
        alert(t['msg_no_type'].replace('{type}', t[`btn_${type.toLowerCase()}`]));
        return;
    }
    saveHistory();
    const currentDeck = [...remainingDeck];
    const [card] = currentDeck.splice(index, 1);
    
    setRemainingDeck(currentDeck);
    setHand([...hand, { card, originalIndex: uniqueIdCounter.current++ }]);
    
    const typeName = t[`btn_${type.toLowerCase()}`];
    addLog(t['msg_draw_type'].replace('{type}', typeName).replace('{card}', card.name));
  };
  
  const handleEndTurn = () => {
    saveHistory();
    let logMsg = t['msg_start_turn'].replace('{turn}', (turnCount + 1).toString());
    setTurnCount(prev => prev + 1);
    setManaSpentThisTurn(0);
    setManaThisTurn(_ => Math.min(totalMana + 1, 10));
    setTotalMana(prev => Math.min(prev + 1, 10));

    if (remainingDeck.length > 0) {
      const newDeck = [...remainingDeck];
      const card = newDeck.shift()!;
      const newHand = [...hand, { card, originalIndex: uniqueIdCounter.current++ }];
      setRemainingDeck(newDeck);
      setHand(newHand);
      logMsg += t['msg_draw'].replace('{card}', card.name);
    }
    addLog(logMsg);
  };

  const handlePlayCard = (index: number) => {
    saveHistory();
    const cardItem = hand[index];
    
    // Remove from hand
    const newHand = [...hand];
    newHand.splice(index, 1);
    setHand(newHand);
    
    setManaSpentThisTurn(prev => prev + cardItem.card.cost);
    setManaThisTurn(prev => prev - cardItem.card.cost);

    // Mana Gain
    switch (cardItem.card.dbfId) {
      case 1746: // Coin
      case 40437: // Counterfeit Coin
      case 69550: // Innervate
      case 254: // Innervate
      setManaThisTurn(prev => prev + 1);
      break;
    }

    addLog(t['msg_play'].replace('{card}', cardItem.card.name).replace('{cost}', cardItem.card.cost.toString()));
  };

  const handleDiscover = (filterType?: string) => {
    if (remainingDeck.length === 0) return;
    
    // 1. Create a list of available indices, filtering by type if needed
    let poolIndices = remainingDeck.map((_, i) => i);
    
    if (filterType) {
        poolIndices = poolIndices.filter(i => remainingDeck[i].type === filterType);
        if (poolIndices.length === 0) {
            alert(t['msg_no_type'].replace('{type}', t[`btn_${filterType.toLowerCase()}`]));
            return;
        }
    }

    // 2. Shuffle indices to randomize search order
    const shuffledIndices = shuffleArray(poolIndices);

    const selectedIndices: number[] = [];
    const seenIds = new Set<number>();

    // 3. Find up to 3 cards with unique IDs
    for (const idx of shuffledIndices) {
      if (selectedIndices.length >= 3) break;
      const card = remainingDeck[idx];
      if (!seenIds.has(card.dbfId)) {
        seenIds.add(card.dbfId);
        selectedIndices.push(idx);
      }
    }

    // If we couldn't find 3 unique IDs, we show what we found.
    const cards = selectedIndices.map(i => remainingDeck[i]);

    setModal({ isOpen: true, type: 'DISCOVER', cards, indices: selectedIndices, discoverType: filterType });
  };

  const handleDredge = () => {
    if (remainingDeck.length === 0) return;
    // Look at bottom 3
    const cards = remainingDeck.slice(-3).reverse(); 
    setModal({ isOpen: true, type: 'DREDGE', cards });
  };

  const handleShuffle = () => {
    if (remainingDeck.length === 0) return;
    saveHistory();
    setRemainingDeck(prev => shuffleArray([...prev]));
    addLog(t['msg_shuffle']);
  }

  const handleSwap = () => {
    if (hand.length === 0) return; // Requirement implies X is hand length. If 0, nothing to swap.
    saveHistory();

    const currentHand = [...hand];
    const currentDeck = [...remainingDeck];

    // X = hand size. Swap X cards.
    // If deck has fewer than X, swap all available deck cards.
    const count = Math.min(currentHand.length, currentDeck.length);

    // Deck Cards -> Hand (Bottom 'count' cards)
    const newHandCardsFromDeck = currentDeck.splice(currentDeck.length - count, count);

    // Hand Cards -> Deck (Append to Bottom)
    const cardsFromHand = currentHand.map(h => h.card);

    // New Deck = Old Deck (minus bottom) + Old Hand
    const newDeck = [...currentDeck, ...cardsFromHand];

    // New Hand = Cards from Deck
    const newHand: HandCard[] = newHandCardsFromDeck.map(card => ({
        card,
        originalIndex: uniqueIdCounter.current++
    }));

    setHand(newHand);
    setRemainingDeck(newDeck);
    addLog(t['msg_swap'].replace('{count}', count.toString()));
  };

  const onModalSelect = (selectedCard: CardData, selectionIndex: number) => {
    saveHistory();
    const currentDeck = [...remainingDeck];
    
    if (modal.type === 'DISCOVER') {
      // Remove specific instance from deck
      if (modal.indices) {
        const deckIndexToRemove = modal.indices[selectionIndex];
        
        if (typeof deckIndexToRemove === 'number' && deckIndexToRemove < currentDeck.length) {
            currentDeck.splice(deckIndexToRemove, 1);
        }

        setHand([...hand, { card: selectedCard, originalIndex: uniqueIdCounter.current++ }]);
        setRemainingDeck(currentDeck);
        
        if (modal.discoverType) {
            const typeName = t[`btn_${modal.discoverType.toLowerCase()}`];
            addLog(t['msg_discover_type'].replace('{type}', typeName).replace('{card}', selectedCard.name));
        } else {
            addLog(t['msg_discover'].replace('{card}', selectedCard.name));
        }
      }
    
    } else if (modal.type === 'DREDGE') {
      const deckLen: number = currentDeck.length;
      const dredgeCount: number = Math.min(3, deckLen);
      const startIndex: number = deckLen - dredgeCount;
      const bottomCards = currentDeck.splice(startIndex, dredgeCount);
      
      const selectedIndex = bottomCards.indexOf(selectedCard);
      if (selectedIndex > -1) {
        bottomCards.splice(selectedIndex, 1);
      }
      
      currentDeck.unshift(selectedCard);
      currentDeck.push(...bottomCards);

      setRemainingDeck(currentDeck);
      addLog(t['msg_dredge'].replace('{card}', selectedCard.name));
    }

    setModal({ isOpen: false, type: null, cards: [], indices: [] });
  };

  const handleDiscoverCopy = (selectedCard: CardData) => {
    saveHistory();
    // Add a copy of the card to hand, leave deck untouched
    setHand([...hand, { card: selectedCard, originalIndex: uniqueIdCounter.current++ }]);
    addLog(t['msg_discover_copy'].replace('{card}', selectedCard.name));
    setModal({ isOpen: false, type: null, cards: [], indices: [] });
  };

  // --- Drag and Drop Handlers ---

  const handleHandDragStart = (e: React.DragEvent, index: number) => {
    const card = hand[index].card;
    setDraggingItem({ type: 'HAND', card, handIndex: index });
    e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'HAND_CARD',
        index: index
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Called when DeckList starts a drag
  const handleDeckDragStart = (card: CardData) => {
      setDraggingItem({ type: 'DECK', card });
  }

  // Handle Drag Over Logic for Tooltip
  const handleGlobalDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      
      let text = '';
      if (draggingItem?.type === 'HAND') {
          text = t['action_discard']; // Dragging hand over background -> Discard
      } else if (draggingItem?.type === 'DECK') {
          text = t['action_destroy']; // Dragging deck over background -> Destroy
      }

      setDragTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          text
      });
  };
  
  const handleHandAreaDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent global background handler
      e.dataTransfer.dropEffect = 'move';
      
      let text = '';
      if (draggingItem?.type === 'DECK') {
          text = t['action_search'];
      } else if (draggingItem?.type === 'HAND') {
          text = t['action_cancel'];
      }
      
      setDragTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          text
      });
  };

  const handleDeckAreaDragOverAction = (e: React.DragEvent) => {
      let text = '';
      if (draggingItem?.type === 'HAND') {
          text = t['action_sink'];
      } else if (draggingItem?.type === 'DECK') {
          text = t['action_cancel'];
      }
      setDragTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          text
      });
  }

  const handleDragEnd = () => {
      setDraggingItem(null);
      setDragTooltip(prev => ({ ...prev, visible: false }));
  }

  // Global Drop (Discard/Destroy)
  const handleGlobalDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragTooltip(prev => ({ ...prev, visible: false }));
      
      if (!draggingItem) return;

      if (draggingItem.type === 'HAND' && typeof draggingItem.handIndex === 'number') {
          // Discard
          const index = draggingItem.handIndex;
          saveHistory();
          const newHand = [...hand];
          const card = newHand[index].card;
          newHand.splice(index, 1);
          setHand(newHand);
          addLog(t['msg_discard'].replace('{card}', card.name));
      } else if (draggingItem.type === 'DECK') {
          // Destroy
          // Find first instance in deck and remove
          const index = remainingDeck.findIndex(c => c.dbfId === draggingItem.card.dbfId);
          if (index !== -1) {
              saveHistory();
              const newDeck = [...remainingDeck];
              newDeck.splice(index, 1);
              setRemainingDeck(newDeck);
              addLog(t['msg_destroy'].replace('{card}', draggingItem.card.name));
          }
      }
      
      setDraggingItem(null);
  };

  // Dropping a Card FROM DECK -> INTO HAND (Search)
  const handleHandDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling to global
    setDragTooltip(prev => ({ ...prev, visible: false }));

    try {
        const raw = e.dataTransfer.getData('application/json');
        const data = JSON.parse(raw) as any;
        if (data && data.type === 'DECK_CARD' && data.card) {
            const cardData = data.card as CardData;
            
            // Find the first instance in the remaining deck
            const indexInDeck = remainingDeck.findIndex(c => c.dbfId === cardData.dbfId);
            
            if (indexInDeck !== -1) {
                saveHistory();
                const newDeck = [...remainingDeck];
                // Remove from deck
                const [foundCard] = newDeck.splice(indexInDeck, 1);
                setRemainingDeck(newDeck);
                
                // Add to hand
                setHand([...hand, { card: foundCard, originalIndex: uniqueIdCounter.current++ }]);
                addLog(t['msg_search'].replace('{card}', foundCard.name));
            }
        }
    } catch (err) {
        console.error("Failed to process drop on hand", err);
    }
    setDraggingItem(null);
  };

  // Dropping a Card FROM HAND -> INTO DECK (Sink/Bottom)
  const handleDeckDrop = (handIndex: number) => {
      if (handIndex < 0 || handIndex >= hand.length) return;
      
      const handCard = hand[handIndex];
      saveHistory();
      
      // Remove from Hand
      const newHand = [...hand];
      newHand.splice(handIndex, 1);
      setHand(newHand);
      
      // Add to bottom of deck
      const newDeck = [...remainingDeck, handCard.card];
      setRemainingDeck(newDeck);
      
      addLog(t['msg_sink'].replace('{card}', handCard.card.name));
      setDraggingItem(null);
  };


  // --- Hand Layout Calculation ---
  const getHandStyles = (index: number, total: number) => {
    if (phase === 'selection') return {};

    const CARD_WIDTH = 128;
    const CONTAINER_WIDTH = Math.min(800, window.innerWidth - 64);
    
    let step = CARD_WIDTH + 10;
    const totalRequiredWidth = (total * CARD_WIDTH) + ((total - 1) * 10);
    
    if (totalRequiredWidth > CONTAINER_WIDTH) {
        step = (CONTAINER_WIDTH - CARD_WIDTH) / (total - 1);
    } else {
        step = Math.min(100, step);
    }
    
    const stackWidth = (total - 1) * step + CARD_WIDTH;
    const startX = (CONTAINER_WIDTH - stackWidth) / 2;

    return {
        position: 'absolute' as const,
        left: `${startX + index * step}px`,
        zIndex: index,
        transition: 'all 0.3s ease-out'
    };
  };

  // Stats Handlers
  const handleSuccessCountChange = (index: number, newVal: number) => {
    setSuccessCounts(prev => {
      const next = [...prev];
      next[index] = Math.max(0, newVal);
      return next;
    });
  };
  
  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setTotalCount(Math.max(0, val));
  };

  const handleResetStats = () => {
	  setTotalCount(0);
	  setSuccessCounts([0, 0, 0, 0, 0]);
  };

  const getSuccessRate = (count: number) => {
      return totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0.0";
  };

  const displayLogs = isLogDesc ? [...logs].reverse() : logs;

  return (
    <div 
        className="min-h-screen p-4 md:p-8 flex flex-col items-center pb-24 relative"
        onDragOver={handleGlobalDragOver}
        onDrop={handleGlobalDrop}
        onDragEnd={handleDragEnd}
    >
      {/* Header */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between mb-8 relative">
          <h1 className="text-3xl md:text-4xl font-bold text-[#fcd144] drop-shadow-lg text-center tracking-wide flex-1">
            {t['title']}
          </h1>
          <div className="absolute right-0 top-0 md:relative md:top-auto flex items-center gap-2">
             <span className="text-xl">🌐</span>
             <select 
               value={lang} 
               onChange={(e) => setLang(e.target.value as Language)}
               className="bg-[#15100c] text-[#fcd144] border border-[#3d2b1f] rounded px-2 py-1 text-sm font-bold focus:outline-none cursor-pointer hover:bg-[#2b221a]"
             >
               <option value="zh-TW">繁體中文</option>
               <option value="zh-CN">简体中文</option>
               <option value="en">English</option>
             </select>
          </div>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-7xl bg-[#2b221a] border-2 border-[#5c4028] rounded-xl p-6 shadow-xl mb-4 flex flex-col md:flex-row gap-4 items-center">
        <input 
          type="text" 
          value={deckString}
          onChange={(e) => setDeckString(e.target.value)}
          placeholder={t['placeholder']}
          className="flex-1 bg-[#15100c] text-[#e0e0e0] border border-[#3d2b1f] rounded px-4 py-3 focus:outline-none focus:border-[#fcd144] focus:ring-1 focus:ring-[#fcd144] placeholder-gray-600 font-mono"
        />
        <button 
          onClick={handleLoadDeck}
          disabled={dbLoading}
          className={`
            px-8 py-3 rounded font-bold text-[#2b221a] transition-colors whitespace-nowrap
            ${dbLoading 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-[#fcd144] hover:bg-[#ffdb65] active:bg-[#dcb028] shadow-[0_4px_0_#b58b00] active:shadow-none active:translate-y-1'
            }
          `}
        >
          {dbLoading ? t['loading'] : t['loadDeck']}
        </button>
      </div>

      {/* Stats Section */}
      <div className="w-full max-w-7xl bg-[#2b221a] border border-[#5c4028] rounded-lg p-4 mb-8 shadow-md">
        {/* Row 1: Header & Total */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4 pb-4 border-b border-[#3d2b1f]">
            <h3 className="text-[#fcd144] font-bold text-lg">{t['stats_header']}</h3>
            <div className="flex items-center gap-2">
                <label className="text-[#e0e0e0] font-bold">{t['stats_total']}</label>
                <input 
                    type="number" 
                    min="0"
                    value={totalCount} 
                    onChange={handleTotalChange} 
                    className="w-20 bg-[#15100c] border border-[#3d2b1f] rounded px-2 py-1 text-center text-[#fcd144] font-mono focus:outline-none focus:border-[#fcd144]"
                />
                <button
                    type="button"
                    onClick={handleResetStats}
                    className="bg-red-900 hover:bg-red-800 text-white px-3 py-1 rounded text-xs font-bold ml-2 shadow-sm"
                >
                    {t['reset']}
                </button>
            </div>
        </div>

        {/* Row 2: Individual Counters */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center text-sm md:text-base">
          {successCounts.map((count, idx) => {
            const labels = ["1st", "2nd", "3rd", "4th", "5th"]; 
            return (
              <div key={idx} className="flex items-center gap-2">
                <label className="text-[#e0e0e0] font-bold">{t[`stats_${labels[idx].toLowerCase()}`] || labels[idx]}</label>
                <input 
                    type="number" 
                    min="0"
                    value={count} 
                    onChange={(e) => handleSuccessCountChange(idx, parseInt(e.target.value) || 0)} 
                    className="w-16 bg-[#15100c] border border-[#3d2b1f] rounded px-1 py-1 text-center text-[#fcd144] font-mono focus:outline-none focus:border-[#fcd144]"
                />
                <button 
                    onClick={() => handleSuccessCountChange(idx, count + 1)}
                    className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold shadow-sm active:translate-y-0.5"
                >
                +1
                </button>
                <span className="text-gray-400 font-mono text-xs ml-1">{`{${getSuccessRate(count)}%}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Col: Simulation Controls & Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls */}
          <div className="bg-[#2b221a]/80 border border-[#5c4028] rounded-lg p-6 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => startSimulation(PlayerTurn.FIRST)}
              disabled={flatDeck.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">{t['start_first']}</span>
                <span className="text-sm opacity-80 font-normal">{t['start_first_desc']}</span>
              </div>
            </button>

            <button 
              onClick={() => startSimulation(PlayerTurn.SECOND)}
              disabled={flatDeck.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded shadow-[0_4px_0_#581c87] active:shadow-none active:translate-y-1 transition-all"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">{t['start_second']}</span>
                <span className="text-sm opacity-80 font-normal">{t['start_second_desc']}</span>
              </div>
            </button>
          </div>

          {/* Simulation Area */}
          <div 
            className="bg-[#1e1611] border border-[#5c4028] rounded-xl p-4 min-h-[460px] flex flex-col items-center relative overflow-hidden transition-all duration-300"
            onDragOver={handleHandAreaDragOver}
            onDrop={handleHandDrop}
          >
            
            {phase === 'idle' && (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
                {flatDeck.length > 0 ? t['idle_prompt'] : t['idle_no_deck']}
              </div>
            )}

            {phase !== 'idle' && (
              <>
                <div className="h-10 flex items-center justify-center mb-6 z-10 w-full relative">
                    <div className="text-[#fcd144] font-bold text-xl uppercase tracking-wider bg-[#1e1611]/80 px-4 py-1 rounded-full border border-[#5c4028]">
                        {phase === 'selection' 
                           ? t['phase_selection'] 
                           : `${t['phase_sim_prefix']} ${turnCount} ${t['phase_sim_suffix']}`
                        }
                    </div>
                </div>

                {/* Cards Container */}
                <div className={`relative w-full flex justify-center z-10 px-4 ${phase === 'selection' ? 'h-auto' : 'h-[280px]'}`}>
                  {phase === 'selection' ? (
                     // Selection Phase: Flex with Gap
                     <div className="flex justify-center gap-4 flex-wrap">
                        {hand.map((cardItem, idx) => (
                            <div key={`${cardItem.card.id}-${idx}`} className="flex-shrink-0">
                                <CardDisplay
                                    card={cardItem.card}
                                    selected={selectedIndices.has(idx)}
                                    onClick={() => toggleSelection(idx)}
                                    disabled={cardItem.isCoin}
                                    lang={lang}
                                />
                            </div>
                        ))}
                     </div>
                  ) : (
                     // Result Phase: Absolute Overlap
                     <div className="relative w-full max-w-[800px] h-full">
                        {hand.map((cardItem, idx) => (
                            <div 
                                key={cardItem.originalIndex} 
                                style={getHandStyles(idx, hand.length)}
                                draggable
                                onDragStart={(e) => handleHandDragStart(e, idx)}
                                className="cursor-grab active:cursor-grabbing"
                            >
                                <CardDisplay
                                    card={cardItem.card}
                                    selected={false}
                                    disabled={false}
                                    onClick={() => handlePlayCard(idx)}
                                    lang={lang}
                                />
                            </div>
                        ))}
                     </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="mt-2 z-20 w-full max-w-4xl px-4 pb-4 flex flex-col items-center">
                  {phase === 'selection' ? (
                    <div className="flex justify-center mt-6">
                        <button
                        onClick={confirmMulligan}
                        className="bg-[#2da042] hover:bg-[#34b54b] text-white text-xl font-bold py-3 px-12 rounded-full shadow-[0_4px_0_#1b6829] active:shadow-none active:translate-y-1 transition-all"
                        >
                        {t['confirm']}
                        </button>
                    </div>
                  ) : (
                    <>
                    {/* Hand Count and Mana Spent Info */}
                    <div className="flex justify-between items-center w-full px-2 mb-2 text-cyan-400 font-mono text-sm font-bold tracking-wider">
                        <span>{t['hand_count']}: {hand.length}</span>
                        <span>{t['mana_this_turn']}: {manaThisTurn}</span>
                    </div>

                    {/* Action Dashboard */}
                    <div className="grid grid-cols-5 gap-3 w-full h-[100px]">
                        {/* Undo */}
                        <button 
                             onClick={handleUndo}
                             disabled={history.length == 0}
                             className="h-full bg-gray-600 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-[0_4px_0_#374151] active:shadow-none active:translate-y-1 flex flex-col items-center justify-center gap-1"
                        >
                            <span className="text-2xl">↩</span>
                            <span className="text-sm">{t['undo']}</span>
                        </button>
                        
                        {/* Dredge & Swap (Group) */}
                        <div className="flex flex-col gap-1 h-full">
                            <button 
                                onClick={handleDredge}
                                disabled={remainingDeck.length === 0}
                                className="flex-1 bg-[#8b4513] hover:bg-[#a0522d] disabled:opacity-30 text-white font-bold rounded-lg shadow-[0_2px_0_#5e2f0d] active:shadow-none active:translate-y-0.5 flex flex-col items-center justify-center gap-0.5"
                            >
                                <span className="text-xl">⚓</span>
                                <span className="text-xs">{t['dredge']}</span>
                            </button>
                            <div className="flex gap-1 h-8">
                              <button 
                                  onClick={handleShuffle}
                                  disabled={hand.length === 0}
                                  className="flex-1 bg-[#5e2f0d] hover:bg-[#8b4513] disabled:opacity-30 text-white text-xs font-bold rounded shadow-[0_1px_0_#3d1f08] active:shadow-none active:translate-y-0.5"
                              >
                                  {t['shuffle']}
                              </button>
                              <button 
                                  onClick={handleSwap}
                                  disabled={hand.length === 0}
                                  className="flex-1 bg-[#5e2f0d] hover:bg-[#8b4513] disabled:opacity-30 text-white text-xs font-bold rounded shadow-[0_1px_0_#3d1f08] active:shadow-none active:translate-y-0.5"
                              >
                                  {t['swap']}
                              </button>
                            </div>
                        </div>

                        {/* Discover (Group) */}
                        <div className="flex flex-col gap-1 h-full">
                            <button 
                                onClick={() => handleDiscover()}
                                disabled={remainingDeck.length === 0}
                                className="flex-1 bg-[#008b8b] hover:bg-[#20b2aa] disabled:opacity-30 text-white font-bold rounded-lg shadow-[0_2px_0_#005f5f] active:shadow-none active:translate-y-0.5 flex flex-col items-center justify-center gap-0.5"
                            >
                                <span className="text-xl">🔍</span>
                                <span className="text-xs">{t['discover']}</span>
                            </button>
                            <div className="flex gap-1 h-8">
                                <button 
                                    onClick={() => handleDiscover('MINION')}
                                    disabled={remainingDeck.length === 0}
                                    className="flex-1 bg-[#006f6f] hover:bg-[#008b8b] disabled:opacity-30 text-white text-xs font-bold rounded shadow-[0_1px_0_#004f4f] active:shadow-none active:translate-y-0.5"
                                >
                                    {t['btn_minion']}
                                </button>
                                <button 
                                    onClick={() => handleDiscover('SPELL')}
                                    disabled={remainingDeck.length === 0}
                                    className="flex-1 bg-[#006f6f] hover:bg-[#008b8b] disabled:opacity-30 text-white text-xs font-bold rounded shadow-[0_1px_0_#004f4f] active:shadow-none active:translate-y-0.5"
                                >
                                    {t['btn_spell']}
                                </button>
                            </div>
                        </div>

                        {/* Draw (Group) */}
                        <div className="flex flex-col gap-1 h-full">
                            <button 
                                onClick={handleDraw}
                                disabled={remainingDeck.length === 0}
                                className="flex-1 bg-[#b8860b] hover:bg-[#daa520] disabled:opacity-30 text-white font-bold rounded-lg shadow-[0_2px_0_#8b6508] active:shadow-none active:translate-y-0.5 flex flex-col items-center justify-center gap-0.5"
                            >
                                <span className="text-xl">⬇️</span>
                                <span className="text-xs">{t['draw']}</span>
                            </button>
                             <div className="flex gap-1 h-8">
                                <button 
                                    onClick={() => handleDrawSpecific('MINION')}
                                    disabled={remainingDeck.length === 0}
                                    className="flex-1 bg-[#946b09] hover:bg-[#b8860b] disabled:opacity-30 text-white text-xs font-bold rounded shadow-[0_1px_0_#6b4c06] active:shadow-none active:translate-y-0.5"
                                >
                                    {t['btn_minion']}
                                </button>
                                <button 
                                    onClick={() => handleDrawSpecific('SPELL')}
                                    disabled={remainingDeck.length === 0}
                                    className="flex-1 bg-[#946b09] hover:bg-[#b8860b] disabled:opacity-30 text-white text-xs font-bold rounded shadow-[0_1px_0_#6b4c06] active:shadow-none active:translate-y-0.5"
                                >
                                    {t['btn_spell']}
                                </button>
                            </div>
                        </div>

                         {/* End Turn */}
                         <button 
                             onClick={handleEndTurn}
                             className="h-full bg-[#8b0000] hover:bg-[#a50000] text-white font-bold rounded-lg shadow-[0_4px_0_#500000] active:shadow-none active:translate-y-1 flex flex-col items-center justify-center gap-1"
                        >
                             <span className="text-2xl">⏳</span>
                             <span className="text-sm">{t['end_turn']}</span>
                        </button>
                    </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Background Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#fcd144] rounded-full blur-[128px] opacity-5 pointer-events-none"></div>
          </div>

           {/* Logs Console */}
           <div className="bg-[#0f0a08] border border-[#5c4028] rounded-lg h-[192px] flex flex-col font-mono text-sm text-[#a0a0a0] shadow-inner overflow-hidden">
             {/* Sticky Header */}
             <div className="p-2 px-4 text-[#fcd144] font-bold border-b border-[#3d2b1f] bg-[#1a1410] flex justify-between items-center shrink-0">
                <span>{t['logs_title']}</span>
                <button 
                    onClick={() => setIsLogDesc(!isLogDesc)}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-[#2b221a] px-2 py-0.5 rounded border border-[#3d2b1f]"
                    title={isLogDesc ? "Desc" : "Asc"}
                >
                    {isLogDesc ? t['sort_desc'] : t['sort_asc']}
                </button>
             </div>
             
             {/* Scrollable Content */}
             <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 pt-2">
                 {logs.length === 0 && <div className="text-gray-600 italic">{t['log_empty']}</div>}
                 <div className="flex flex-col">
                    {displayLogs.map((log, i) => {
                        // Logic to show correct index based on order
                        const index = isLogDesc ? logs.length - i : i + 1;
                        return (
                            <div key={i} className="py-0.5 border-b border-[#221812] last:border-0 hover:bg-[#1a1410] px-1">
                                <span className="text-gray-500 mr-2">[{index.toString().padStart(2, '0')}]</span>
                                {log}
                            </div>
                        );
                    })}
                 </div>
             </div>
           </div>

        </div>

        {/* Right Col: Deck List */}
        <div className="lg:col-span-1 h-[600px] lg:h-auto">
          <DeckList 
            cards={phase === 'idle' ? flatDeck : remainingDeck} 
            loading={dbLoading}
            isSimulation={phase !== 'idle'}
            showTrueOrder={showTrueOrder}
            onToggleTrueOrder={() => setShowTrueOrder(!showTrueOrder)}
            onCardDrop={handleDeckDrop}
            onDragStart={handleDeckDragStart}
            onDragOverAction={handleDeckAreaDragOverAction}
            lang={lang}
            allowDrag={phase === 'result'}
          />
        </div>

      </div>

      {/* Drag Action Tooltip */}
      {dragTooltip.visible && (
          <div 
             className="fixed z-[100] bg-black/80 text-white border border-[#fcd144] px-4 py-2 rounded-lg pointer-events-none font-bold text-lg shadow-xl backdrop-blur-sm"
             style={{
                 left: dragTooltip.x + 15,
                 top: dragTooltip.y + 15
             }}
          >
              {dragTooltip.text}
          </div>
      )}

      {/* Modal Overlay */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-[#2b221a] border-2 border-[#5c4028] rounded-xl p-6 w-full max-w-4xl shadow-2xl relative">
              <h2 className="text-2xl font-bold text-[#fcd144] text-center mb-6">
                 {modal.type === 'DISCOVER' ? t['modal_discover'] : t['modal_dredge']}
              </h2>
              <p className="text-center text-gray-400 mb-6">
                 {modal.type === 'DISCOVER' ? t['modal_discover_desc'] : t['modal_dredge_desc']}
              </p>
              
              <div className="flex flex-wrap justify-center gap-6">
                  {modal.cards.map((card, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                          <CardDisplay 
                            card={card} 
                            onClick={() => onModalSelect(card, i)}
                            lang={lang}
                          />
                          <button 
                             onClick={() => {
                                if (modal.type === 'DISCOVER') {
                                    handleDiscoverCopy(card);
                                } else {
                                    onModalSelect(card, i);
                                }
                             }}
                             className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow text-sm font-bold"
                          >
                             {modal.type === 'DISCOVER' ? t['btn_add_copy'] : t['select']}
                          </button>
                      </div>
                  ))}
              </div>

              <button 
                 onClick={() => setModal({ isOpen: false, type: null, cards: [], indices: [] })}
                 className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
              >
                 ✕
              </button>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;