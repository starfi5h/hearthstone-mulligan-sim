import React, { useMemo, useState } from 'react';
import { CardData, DeckCard, Language } from '../types';
import { translations } from '../utils/translations';
import { getHSLocale } from '../services/cardService';

interface DeckListProps {
  cards: CardData[]; // Now accepts a flat list of cards
  loading: boolean;
  isSimulation?: boolean;
  showTrueOrder?: boolean;
  onToggleTrueOrder?: () => void;
  onCardDrop?: (handIndex: number) => void; // Callback for dropping a hand card here (Sink)
  onDragStart?: (card: CardData) => void;
  onDragOverAction?: (e: React.DragEvent) => void;
  lang?: Language;
  allowDrag?: boolean;
}

export const DeckList: React.FC<DeckListProps> = ({ 
  cards, 
  loading, 
  isSimulation = false,
  showTrueOrder = false,
  onToggleTrueOrder,
  onCardDrop,
  onDragStart,
  onDragOverAction,
  lang = 'zh-TW',
  allowDrag = true
}) => {
  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const t = translations[lang];
  const locale = getHSLocale(lang);
  
  // Process cards based on view mode
  const displayItems = useMemo(() => {
    if (showTrueOrder) {
      // Return flat list with an index key to handle duplicates in specific positions
      return cards.map((card, index) => ({
        card,
        count: 1,
        key: `${card.dbfId}-${index}` // Unique key for flat list
      }));
    } else {
      // Group by ID and Sort (Classic View)
      const map = new Map<number, DeckCard>();
      
      cards.forEach(card => {
        const existing = map.get(card.dbfId);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(card.dbfId, { card, count: 1 });
        }
      });

      const grouped = Array.from(map.values());

      // Sort: Cost ASC, then Name ASC
      return grouped.sort((a, b) => {
        if (a.card.cost !== b.card.cost) return a.card.cost - b.card.cost;
        return a.card.name.localeCompare(b.card.name);
      }).map(item => ({
        ...item,
        key: item.card.dbfId // DBF ID is unique enough for grouped list
      }));
    }
  }, [cards, showTrueOrder]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  // Drag Handlers for List Items (Search Source)
  const handleDragStart = (e: React.DragEvent, card: CardData) => {
    if (!isSimulation || !allowDrag) {
        e.preventDefault();
        return;
    }
    // Notify parent
    if (onDragStart) onDragStart(card);

    e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'DECK_CARD',
        card: card
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag Handlers for Container (Sink Target)
  const handleDragOver = (e: React.DragEvent) => {
    if (isSimulation) {
        e.preventDefault(); // Allow drop
        e.stopPropagation(); // Stop parent (Destroy)
        e.dataTransfer.dropEffect = 'move';
        // Notify parent to show "Sink" action
        if (onDragOverAction) onDragOverAction(e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isSimulation || !onCardDrop) return;
    e.preventDefault();
    e.stopPropagation(); // Stop parent (Destroy)
    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type === 'HAND_CARD' && typeof data.index === 'number') {
            onCardDrop(data.index as number);
        }
    } catch (err) {
        console.error("Failed to parse drag data", err);
    }
  };

  return (
    <div 
        className="bg-[#2b221a] border-2 border-[#5c4028] rounded-lg p-4 h-full flex flex-col shadow-inner relative transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4 border-b border-[#5c4028] pb-2">
        <h2 className="text-xl font-bold text-[#fcd144]">
          {isSimulation ? t['deck_remaining'] : t['deck_full']} 
          <span className="text-sm font-normal text-gray-400 ml-2">
             ({loading ? '...' : cards.length})
          </span>
        </h2>
        
        {/* True Order Toggle - Only visible during simulation */}
        {isSimulation && onToggleTrueOrder && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showTrueOrder} 
              onChange={onToggleTrueOrder}
              className="w-4 h-4 accent-[#fcd144] bg-[#15100c] border-[#3d2b1f] rounded focus:ring-[#fcd144]"
            />
            <span className="text-sm text-[#e0e0e0] font-bold">{t['show_order']}</span>
          </label>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && (
          <div className="text-gray-400 text-center py-4 animate-pulse">{t['loading_db']}</div>
        )}

        {!loading && cards.length === 0 && (
          <div className="text-gray-500 text-center py-4 italic">
            {isSimulation ? t['deck_empty'] : t['deck_not_loaded']}
          </div>
        )}

        {displayItems.map((item, index) => (
          <div 
            key={item.key} 
            draggable={isSimulation && allowDrag}
            onDragStart={(e) => handleDragStart(e, item.card)}
            className={`group relative flex items-center bg-[#15100c] border border-[#3d2b1f] rounded h-10 overflow-hidden hover:brightness-125 transition-all select-none
                ${isSimulation && allowDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-help'}
            `}
            onMouseEnter={(e) => {
                setHoveredCard(item.card);
                setTooltipPos({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setHoveredCard(null)}
            onMouseMove={handleMouseMove}
          >
            {/* Index Indicator for True Order */}
            {showTrueOrder && (
               <div className="flex items-center justify-center w-6 h-full bg-[#1a1410] text-gray-500 text-xs font-mono border-r border-[#3d2b1f]">
                 {index + 1}
               </div>
            )}

            {/* Mana Cost */}
            <div className="flex items-center justify-center w-8 h-full bg-[#203a74] text-white font-bold text-sm z-10 border-r border-[#3d2b1f]">
              {item.card.cost}
            </div>
            
            {/* Name */}
            <div className="flex-1 px-3 text-sm text-[#e0e0e0] truncate z-10 font-medium">
              {item.card.name}
            </div>

            {/* Count (Only show if > 1 and NOT in True Order mode) */}
            {!showTrueOrder && item.count > 1 && (
              <div className="flex items-center justify-center w-8 h-full bg-[#3d2b1f] text-[#fcd144] font-bold text-sm z-10 border-l border-[#3d2b1f]">
                {item.count}
              </div>
            )}
            
             {/* Rarity Gradient Overlay */}
             <div className={`absolute inset-0 opacity-20 pointer-events-none 
                ${item.card.rarity === 'LEGENDARY' ? 'bg-orange-500' : ''}
                ${item.card.rarity === 'EPIC' ? 'bg-purple-500' : ''}
                ${item.card.rarity === 'RARE' ? 'bg-blue-500' : ''}
				${item.card.rarity === 'COMMON' ? 'bg-gray-400' : ''}
             `}></div>
          </div>
        ))}
      </div>

      {/* Hover Image Tooltip */}
      {hoveredCard && (
        <div 
            className="fixed z-[100] pointer-events-none drop-shadow-2xl"
            style={{ 
                // Position to the left of the cursor, clamped to viewport height
                top: Math.min(window.innerHeight - 320, Math.max(10, tooltipPos.y - 150)), 
                left: Math.max(10, tooltipPos.x - 260),
                width: '240px'
            }}
        >
             <img 
                src={`https://art.hearthstonejson.com/v1/render/latest/${locale}/512x/${hoveredCard.id}.png`} 
                alt={hoveredCard.name}
                className="w-full h-auto object-contain"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://art.hearthstonejson.com/v1/render/latest/${locale}/512x/GAME_005.png`;
                }}
            />
        </div>
      )}
    </div>
  );
};