export enum TileCategory {
  DOTS = 'DOTS',       // Doiralar
  BAMBOO = 'BAMBOO',   // Bambuk
  CHAR = 'CHAR',       // Raqamlar/Belgilar
  WIND = 'WIND',       // Shamollar
  DRAGON = 'DRAGON',   // Ajdarlar
  FLOWER = 'FLOWER',   // Gullar
  SEASON = 'SEASON'    // Fasllar
}

export interface TileData {
  id: string;
  category: TileCategory;
  value: string | number; // e.g., 1-9 for suits, 'N' for North, etc.
  x: number; // Grid x position (1 unit = half tile width for overlapping)
  y: number; // Grid y position (1 unit = half tile height)
  z: number; // Layer (0 is bottom)
  isVisible: boolean; // Has it been matched and removed?
  isHinted?: boolean; // Is currently highlighted by a hint?
  location: 'board' | 'dock'; // Where is the tile currently?
  isFlying?: boolean; // Is currently animating to dock?
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export type Language = 'uz' | 'ru' | 'en';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'NIGHTMARE';

export type Theme = 'CLASSIC' | 'WOOD' | 'OCEAN' | 'NIGHT';