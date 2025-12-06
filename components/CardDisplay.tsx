import React from 'react';
import { CardData, Language } from '../types';

interface CardDisplayProps {
  card: CardData;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  lang?: Language;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ 
  card, 
  selected, 
  onClick, 
  disabled, 
  lang = 'zh-TW' 
}) => {
  // Map App Language to Hearthstone API Locale
  const getHsLocale = (l: Language) => {
    switch (l) {
        case 'zh-CN': return 'zhCN';
        case 'zh-TW': return 'zhTW';
        default: return 'enUS';
    }
  };

  const locale = getHsLocale(lang);
  const imageUrl = `https://art.hearthstonejson.com/v1/render/latest/${locale}/512x/${card.id}.png`;
  
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative w-32 h-48 md:w-40 md:h-56 lg:w-48 lg:h-64 
        transition-all duration-200 transform
        ${!disabled ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${selected ? 'ring-4 ring-red-600 rounded-xl translate-y-2 grayscale' : ''}
      `}
    >
      {/* Card Image */}
      <img 
        src={imageUrl} 
        alt={card.name} 
        className="w-full h-full object-contain drop-shadow-xl"
        loading="lazy"
        onError={(e) => {
            // Fallback if image fails (Coin or other)
            (e.target as HTMLImageElement).src = `https://art.hearthstonejson.com/v1/render/latest/${locale}/512x/GAME_005.png`; 
        }}
      />

      {/* Mulligan Cross Indicator */}
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-red-600 font-bold text-8xl drop-shadow-md opacity-80">
            ×
          </div>
        </div>
      )}
    </div>
  );
};