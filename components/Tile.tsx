import React from 'react';
import { TileData, TileCategory } from '../types';
import { Ghost, Wind, Flower, Cloud, Sun, Leaf, Snowflake, Gem } from 'lucide-react';
import { audioService } from '../services/audioService';

interface TileProps {
  tile: TileData;
  playable: boolean;
  selected: boolean;
  onClick?: (tile: TileData, e: React.MouseEvent) => void;
  isDocked?: boolean;
  style?: React.CSSProperties;
}

// Xitoy raqamlari (1-9)
const CHINESE_NUMBERS: Record<string, string> = {
  '1': '一', '2': '二', '3': '三', '4': '四', '5': '伍',
  '6': '六', '7': '七', '8': '八', '9': '九'
};

const TileContent = ({ category, value, isDocked }: { category: TileCategory, value: string | number, isDocked: boolean }) => {
  const sizeClass = isDocked ? "w-6 h-6 md:w-8 md:h-8" : "w-10 h-10 md:w-16 md:h-16"; 
  const textSize = isDocked ? "text-xl md:text-2xl" : "text-3xl md:text-5xl";
  
  switch (category) {
    case TileCategory.DOTS:
      const dotCount = Number(value);
      const dotsArray = Array.from({ length: dotCount });
      let gridCols = 'grid-cols-1';
      if (dotCount > 1) gridCols = 'grid-cols-2';
      if (dotCount >= 7) gridCols = 'grid-cols-3';
      
      return (
        <div className={`grid ${gridCols} gap-0.5 p-0.5 w-full h-full items-center justify-center content-center`}>
          {dotsArray.map((_, i) => {
             let dotColor = 'bg-blue-600';
             if (dotCount === 1) dotColor = 'bg-red-500 w-full h-full rounded-full';
             else if (i % 2 === 0) dotColor = 'bg-green-600';
             else dotColor = 'bg-blue-600';
             
             return (
               <div key={i} className={`rounded-full shadow-inner border border-black/10 ${dotCount === 1 ? '' : (isDocked ? 'w-1.5 h-1.5 md:w-2 md:h-2' : 'w-3 h-3 md:w-5 md:h-5')} ${dotColor}`}></div>
             );
          })}
        </div>
      );

    case TileCategory.BAMBOO:
      const bamCount = Number(value);
      if (bamCount === 1) {
        return (
           <div className="flex flex-col items-center justify-center text-green-700 w-full h-full">
             <div className="relative">
                <div className={`${isDocked ? 'w-5 h-3 md:w-6 md:h-4' : 'w-10 h-6 md:w-12 md:h-8'} bg-green-600 rounded-full mx-auto relative overflow-hidden`}>
                   <div className="absolute top-1 left-2 w-1 h-1 bg-yellow-400 rounded-full"></div>
                </div>
                <div className={`${isDocked ? 'w-6 h-1.5 md:w-8 md:h-2' : 'w-12 h-3 md:w-16 md:h-4'} bg-green-800 rounded-full mt-[-2px]`}></div>
             </div>
           </div>
        );
      }
      
      const bamsArray = Array.from({ length: bamCount });
      
      // Dynamic Layout Logic to prevent overflow
      let gridClass = '';
      let stickHeight = '';
      let stickWidth = isDocked ? 'w-1 md:w-1.5' : 'w-1.5 md:w-3';

      if (bamCount === 2) {
          // Vertical stack of 2
          gridClass = isDocked ? 'grid-cols-1 gap-1' : 'grid-cols-1 gap-1 md:gap-4';
          stickHeight = isDocked ? 'h-4 md:h-5' : 'h-6 md:h-10';
      } else if (bamCount === 3) {
          // Horizontal row of 3 (or vertical stack if we wanted, but horizontal fits width well)
          // Actually standard 3 bamboo is 1 top, 2 bottom. But grid-cols-3 works fine for this style.
          gridClass = 'grid-cols-3 gap-0.5 md:gap-1';
          stickHeight = isDocked ? 'h-4 md:h-5' : 'h-6 md:h-10';
      } else if (bamCount === 4) {
          // 2x2 Grid
          gridClass = 'grid-cols-2 gap-0.5 md:gap-2';
          stickHeight = isDocked ? 'h-4 md:h-5' : 'h-6 md:h-10';
      } else {
          // 5, 6, 7, 8, 9 -> Use 3 columns and smaller sticks
          gridClass = 'grid-cols-3 gap-0.5 md:gap-1';
          stickHeight = isDocked ? 'h-2.5 md:h-3' : 'h-4 md:h-7';
      }

      return (
         <div className={`grid ${gridClass} w-full h-full content-center justify-center py-0.5 md:py-1 px-0.5 md:px-1`}>
           {bamsArray.map((_, i) => (
             <div key={i} className="flex justify-center">
                <div className={`${stickWidth} ${stickHeight} bg-gradient-to-b from-green-500 via-green-100 to-green-600 border border-green-800 rounded-sm shadow-[1px_1px_2px_rgba(0,0,0,0.2)]`}></div>
             </div>
           ))}
         </div>
      );

    case TileCategory.CHAR:
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
            {/* Tepasi: Ko'k Xitoy Raqami */}
            <span className={`${textSize} font-black text-blue-700 font-serif leading-none mt-[-2px] md:mt-[-6px]`}>
              {CHINESE_NUMBERS[String(value)] || value}
            </span>
            {/* Pasti: Qizil Olmos (Gem) Figurasi (Wan o'rniga) */}
            <div className="mt-[-1px] md:mt-0">
               <Gem className={`${isDocked ? 'w-4 h-4 md:w-5 md:h-5' : 'w-6 h-6 md:w-9 md:h-9'} text-red-600 fill-red-100/50`} strokeWidth={2.5} />
            </div>
        </div>
      );

    case TileCategory.WIND:
      const windMap: Record<string, string> = { 'E': '東', 'S': '南', 'W': '西', 'N': '北' };
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <span className={`${textSize} font-black text-slate-800`}>{windMap[String(value)] || value}</span>
        </div>
      );

    case TileCategory.DRAGON:
      let colorClass = 'text-green-600';
      let dragonChar = '發'; 
      if(value === 'R') { colorClass = 'text-red-600'; dragonChar = '中'; }
      if(value === 'Wh') { colorClass = 'text-blue-800'; dragonChar = '▯'; }

      return (
        <div className={`flex items-center justify-center h-full ${colorClass}`}>
           {value === 'Wh' ? (
             <div className={`${isDocked ? 'w-6 h-8 md:w-8 md:h-10' : 'w-12 h-16 md:w-16 md:h-20'} border-4 border-blue-800 rounded-sm`}></div>
           ) : (
             <span className={`${textSize} font-black`}>{dragonChar}</span>
           )}
        </div>
      );

    case TileCategory.FLOWER:
      return (
        <div className="flex flex-col items-center">
           <Flower className={`${sizeClass} text-pink-500 fill-pink-100`} />
        </div>
      );

    case TileCategory.SEASON:
      const icons = [
          null, 
          <Cloud className="text-blue-400 fill-blue-50" />, 
          <Sun className="text-orange-500 fill-orange-100" />, 
          <Leaf className="text-amber-600 fill-amber-100" />, 
          <Snowflake className="text-cyan-400 fill-cyan-50" />
      ];
      const icon = icons[Number(value)] || icons[1];
      return (
          <div className={`${sizeClass} drop-shadow-md`}>
              {icon}
          </div>
      );

    default:
      return <span>?</span>;
  }
};

export const Tile: React.FC<TileProps> = ({ tile, playable, selected, onClick, isDocked = false, style }) => {
  // Styles for Board vs Dock
  // Mobile Dock: 50x70, Desktop Dock: 60x80 (handled via parent scale mostly, but explicit here for safety)
  // Board: 80x110 (always fixed, scaled by parent transform)
  const width = isDocked ? '100%' : 80;
  const height = isDocked ? '100%' : 110;
  
  // Board positioning
  const depth = 14; 
  const left = tile.x * (80 / 2) + 120; 
  const top = tile.y * (110 / 2.3) + 60; 
  const zIndex = tile.z * 10 + tile.x + tile.y; 

  const isDark = !playable && !isDocked;
  const isHinted = tile.isHinted && playable;
  
  const handleMouseEnter = () => {
    if (playable && !isDocked) {
      audioService.playHover();
    }
  };
  
  const containerStyle: React.CSSProperties = isDocked ? {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    borderBottomWidth: '2px',
    borderRightWidth: '2px',
    zIndex: 10,
  } : {
    position: 'absolute',
    width: `${width}px`,
    height: `${height}px`,
    left: `${left}px`,
    top: `${top - (tile.z * depth)}px`,
    zIndex: zIndex,
    borderRadius: '16px',
    // Thicker border for 3D look
    borderBottomWidth: isDark ? '0px' : '9px',
    borderRightWidth: isDark ? '0px' : '9px',
  };

  // If style is provided (for flying animation), override layout properties
  const finalStyle = { ...containerStyle, ...style };
  
  // If tile is flying (original instance on board), hide it but keep it in DOM if needed (or just make invisible)
  if (tile.isFlying && !style) {
      finalStyle.opacity = 0;
      finalStyle.pointerEvents = 'none';
  }

  return (
    <div
      onClick={(e) => (playable || isDocked) && onClick && onClick(tile, e)}
      onMouseEnter={handleMouseEnter}
      className={`
        group transition-all duration-200 ease-out cursor-pointer
        flex items-center justify-center border-2
        ${selected ? 'tile-selected bg-[#fdf6e3]' : (isHinted ? 'tile-hinted bg-pink-50' : 'bg-[#fffbf0]')}
        ${isDark 
          ? 'brightness-[0.6] cursor-not-allowed grayscale-[0.3]' 
          : (style ? '' : 'hover:brightness-105 active:scale-95 hover:-translate-y-2') /* Disable hover lift during flight */
        }
        ${!isDocked && !isDark && !style ? 'shadow-[2px_10px_15px_rgba(0,0,0,0.5)]' : ''}
      `}
      style={{
        ...finalStyle,
        // Top/Left is bright white (light source)
        borderTopColor: '#ffffff',
        borderLeftColor: '#f0f0f0',
        
        // Highlight logic
        borderColor: selected ? '#facc15' : (isHinted ? '#ec4899' : '#e5e7eb'),

        // The "Body" of the tile (Dark Green/Teal like screenshot)
        borderBottomColor: selected ? '#d97706' : (isHinted ? '#db2777' : '#0f3d2e'),
        borderRightColor: selected ? '#d97706' : (isHinted ? '#db2777' : '#14533e'),
      }}
    >
      {/* Inner White Face with slight rounded corners to separate from the "Block" */}
      <div className={`pointer-events-none z-10 w-full h-full p-0.5 md:p-1 flex items-center justify-center ${!isDocked ? 'bg-gradient-to-b from-white to-[#f4f1e6] rounded-lg' : ''}`}>
        <TileContent category={tile.category} value={tile.value} isDocked={isDocked} />
      </div>
      
      {!isDark && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      )}
    </div>
  );
};