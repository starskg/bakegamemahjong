import { TileData, TileCategory, Difficulty } from '../types';

// O'yin bosqichlariga asoslangan generator
const createFullDeck = (): { category: TileCategory; value: string | number }[] => {
  const deck: { category: TileCategory; value: string | number }[] = [];

  // Standard Mahjong Set
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      deck.push({ category: TileCategory.DOTS, value: i });
      deck.push({ category: TileCategory.BAMBOO, value: i });
      deck.push({ category: TileCategory.CHAR, value: i });
    }
  }
  ['E', 'S', 'W', 'N'].forEach(wind => {
    for (let j = 0; j < 4; j++) deck.push({ category: TileCategory.WIND, value: wind });
  });
  ['R', 'G', 'Wh'].forEach(dragon => {
    for (let j = 0; j < 4; j++) deck.push({ category: TileCategory.DRAGON, value: dragon });
  });
  [1, 2, 3, 4].forEach(f => deck.push({ category: TileCategory.FLOWER, value: f }));
  [1, 2, 3, 4].forEach(s => deck.push({ category: TileCategory.SEASON, value: s }));

  return deck;
};

// Procedural Layout Generator based on tile count and difficulty
const generateLayout = (count: number, difficulty: Difficulty): { x: number, y: number, z: number }[] => {
  const positions: { x: number, y: number, z: number }[] = [];
  
  // Complexity configuration based on difficulty
  let maxLayers = 1;
  let density = 0.3; // Probability of stacking on top

  switch (difficulty) {
    case 'EASY':
      maxLayers = 1; // Mostly flat
      density = 0.1;
      break;
    case 'MEDIUM':
      maxLayers = 2; // Some stacks
      density = 0.3;
      break;
    case 'HARD':
      maxLayers = 4; // Tall stacks
      density = 0.5;
      break;
    case 'NIGHTMARE':
      maxLayers = 6; // Very tall complex stacks
      density = 0.7;
      break;
  }

  // Base logic
  if (count <= 12 && difficulty === 'EASY') {
    // Simple Grid / Lines for very easy levels
    const cols = Math.ceil(count / 2); 
    const rows = count <= 6 ? 1 : 2;
    const itemsPerRow = Math.ceil(count / rows);

    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        const xOffset = 10 - (itemsPerRow); 
        const yOffset = 4 - (rows); 
        positions.push({ x: (col * 2) + xOffset, y: (row * 2) + yOffset, z: 0 });
    }
  } else {
    // Procedural "Turtle-ish" pile
    let remaining = count;
    
    // Create a base grid
    const baseWidth = Math.min(10, Math.ceil(Math.sqrt(count * 1.5)));
    const baseHeight = Math.ceil(count / baseWidth);
    
    // Fill base layer first
    for (let y = 0; y < baseHeight && remaining > 0; y++) {
      for (let x = 0; x < baseWidth && remaining > 0; x++) {
         // Create a somewhat irregular base shape
         if (remaining > count * (1 - density) || Math.random() > 0.2) {
            positions.push({ x: x * 2 + 4, y: y * 2 + 2, z: 0 });
            remaining--;
         }
      }
    }
    
    // Stack layers randomly based on density
    let safety = 0;
    while(remaining > 0 && safety < 2000) {
       safety++;
       // Pick a random existing tile to stack on or near
       const base = positions[Math.floor(Math.random() * positions.length)];
       
       // Try to stack ON TOP (z+1)
       const canStack = base.z < maxLayers && Math.random() < density;
       const existsAbove = positions.some(p => p.x === base.x && p.y === base.y && p.z === base.z + 1);
       
       if (canStack && !existsAbove) {
           positions.push({ x: base.x, y: base.y, z: base.z + 1 });
           remaining--;
       } else {
           // Try to place NEXT TO (same z) if we can't stack
           // Or if we need to expand outward
           const offsets = [{dx:2, dy:0}, {dx:-2, dy:0}, {dx:0, dy:2}, {dx:0, dy:-2}];
           const off = offsets[Math.floor(Math.random() * offsets.length)];
           const nx = base.x + off.dx;
           const ny = base.y + off.dy;
           
           const exists = positions.some(p => p.x === nx && p.y === ny && p.z === 0);
           if (!exists) {
              positions.push({ x: nx, y: ny, z: 0 }); 
              remaining--;
           }
       }
    }
  }

  return positions.slice(0, count);
};

export const initGame = (level: number = 1, difficulty: Difficulty = 'MEDIUM'): TileData[] => {
  // Determine tile count based on difficulty
  let baseCount = 16;
  let increment = 4;

  switch (difficulty) {
    case 'EASY':
      baseCount = 12;
      increment = 2; // Grows slowly
      break;
    case 'MEDIUM':
      baseCount = 16;
      increment = 4;
      break;
    case 'HARD':
      baseCount = 24;
      increment = 8; // Grows fast
      break;
    case 'NIGHTMARE':
      baseCount = 36;
      increment = 12; // Very big very fast
      break;
  }

  const tileCount = baseCount + (level - 1) * increment;
  
  // Ensure even number for pairs
  const finalCount = tileCount % 2 !== 0 ? tileCount + 1 : tileCount;

  const fullDeck = createFullDeck();
  
  const numPairs = finalCount / 2;
  const gameDeck: { category: TileCategory; value: string | number }[] = [];
  
  for (let i = fullDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
  }

  const usedIndices = new Set<number>();
  let pairsFound = 0;
  
  for (let i = 0; i < fullDeck.length && pairsFound < numPairs; i++) {
      if (usedIndices.has(i)) continue;
      
      const t1 = fullDeck[i];
      let matchIdx = -1;
      for (let j = i + 1; j < fullDeck.length; j++) {
          if (!usedIndices.has(j)) {
              if (t1.category === fullDeck[j].category) {
                  if (t1.category === TileCategory.FLOWER || t1.category === TileCategory.SEASON || t1.value === fullDeck[j].value) {
                      matchIdx = j;
                      break;
                  }
              }
          }
      }
      
      if (matchIdx !== -1) {
          gameDeck.push(t1);
          gameDeck.push(fullDeck[matchIdx]);
          usedIndices.add(i);
          usedIndices.add(matchIdx);
          pairsFound++;
      }
  }

  for (let i = gameDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameDeck[i], gameDeck[j]] = [gameDeck[j], gameDeck[i]];
  }

  const positions = generateLayout(finalCount, difficulty);
  
  const tiles: TileData[] = [];
  for(let i=0; i < gameDeck.length; i++) {
    if (i >= positions.length) break;
    tiles.push({
        id: `tile-${level}-${i}`,
        category: gameDeck[i].category,
        value: gameDeck[i].value,
        x: positions[i].x,
        y: positions[i].y,
        z: positions[i].z,
        isVisible: true,
        isHinted: false,
        location: 'board' // Default location
    });
  }
  
  return tiles.sort((a, b) => (a.z - b.z) || (a.y - b.y) || (a.x - b.x));
};

export const isTilePlayable = (tile: TileData, allTiles: TileData[]): boolean => {
  if (!tile.isVisible || tile.location === 'dock') return false; // Docked tiles are not "playable" in board sense

  const activeBoardTiles = allTiles.filter(t => t.isVisible && t.location === 'board');

  const isCovered = activeBoardTiles.some(other => 
    other.z === tile.z + 1 &&
    Math.abs(other.x - tile.x) < 2 &&
    Math.abs(other.y - tile.y) < 2
  );

  if (isCovered) return false;

  const blockedLeft = activeBoardTiles.some(other => 
    other.z === tile.z &&
    other.x === tile.x - 2 &&
    Math.abs(other.y - tile.y) < 2
  );

  const blockedRight = activeBoardTiles.some(other => 
    other.z === tile.z &&
    other.x === tile.x + 2 &&
    Math.abs(other.y - tile.y) < 2
  );

  return !(blockedLeft && blockedRight);
};

export const checkMatch = (t1: TileData, t2: TileData): boolean => {
  if (t1.id === t2.id) return false;
  if (t1.category !== t2.category) return false;
  if (t1.category === TileCategory.FLOWER || t1.category === TileCategory.SEASON) return true;
  return t1.value === t2.value;
};

export const shuffleRemaining = (currentTiles: TileData[]): TileData[] => {
  const visibleBoardTiles = currentTiles.filter(t => t.isVisible && t.location === 'board');
  const otherTiles = currentTiles.filter(t => !t.isVisible || t.location === 'dock');

  const contents = visibleBoardTiles.map(t => ({ category: t.category, value: t.value }));
  
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }

  const newVisibleTiles = visibleBoardTiles.map((t, idx) => ({
    ...t,
    category: contents[idx].category,
    value: contents[idx].value,
    id: `tile-shuffled-${Date.now()}-${idx}`,
    isHinted: false
  }));

  return [...otherTiles, ...newVisibleTiles].sort((a, b) => (a.z - b.z) || (a.y - b.y) || (a.x - b.x));
};

export const findHintPair = (allTiles: TileData[]): [TileData, TileData] | null => {
  // Hint should show pair on board that can be clicked
  const visibleTiles = allTiles.filter(t => t.isVisible && t.location === 'board');
  const playableTiles = visibleTiles.filter(t => isTilePlayable(t, allTiles));

  for (let i = 0; i < playableTiles.length; i++) {
    for (let j = i + 1; j < playableTiles.length; j++) {
      if (checkMatch(playableTiles[i], playableTiles[j])) {
        return [playableTiles[i], playableTiles[j]];
      }
    }
  }
  return null;
};