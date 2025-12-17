import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tile } from './components/Tile';
import { SettingsModal } from './components/SettingsModal';
import { TileData, Language, Difficulty, Theme } from './types';
import { initGame, isTilePlayable, checkMatch, shuffleRemaining, findHintPair } from './services/gameLogic';
import { audioService } from './services/audioService';
import { getGeminiAdvice } from './services/geminiService';
import { liveService } from './services/liveService';
import { RefreshCw, RotateCcw, Lightbulb, Trophy, Settings, ArrowRight, Ban, Zap, ScrollText, Timer as TimerIcon, Mic, MicOff, Coins, AlertTriangle } from 'lucide-react';
import { translations } from './translations';

// Confetti Component for Victory
const Confetti = () => {
  const pieces = Array.from({ length: 50 });
  return (
    <div className="absolute inset-0 pointer-events-none z-[150] overflow-hidden">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-4"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-20px`,
            backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899'][Math.floor(Math.random() * 5)],
            animation: `fall ${2 + Math.random() * 3}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`
          } as React.CSSProperties}
        >
          <style>{`
            @keyframes fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
};

// Explosion Component for Visual Effect
const Explosion = () => {
  const particles = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
      {particles.map((_, i) => {
        const angle = (i / 12) * 360;
        const tx = Math.cos(angle * (Math.PI / 180)) * 60;
        const ty = Math.sin(angle * (Math.PI / 180)) * 60;
        return (
          <div
            key={i}
            className="particle"
            style={{
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              '--r': `${Math.random() * 360}deg`
            } as React.CSSProperties}
          />
        );
      })}
      <div className="absolute w-full h-full bg-red-500/30 rounded-full animate-ping opacity-75"></div>
    </div>
  );
};

// Floating Combo Text
const ComboText = ({ count, x, y }: { count: number, x: number, y: number }) => {
  return (
    <div 
      className="absolute z-[100] text-yellow-300 font-black text-4xl pointer-events-none animate-bounce"
      style={{ left: x, top: y, textShadow: '2px 2px 0 #000' }}
    >
      x{count}
    </div>
  );
};

// Sage Modal (Gemini Advice)
const SageModal = ({ isOpen, onClose, text, isLoading, title }: { isOpen: boolean, onClose: () => void, text: string, isLoading: boolean, title: string }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 bg-black/60 z-[120] flex items-center justify-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#fdf6e3] border-4 border-[#8b5a2b] w-full max-w-[400px] p-6 rounded-xl shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
         <h3 className="text-[#8b5a2b] text-xl md:text-2xl font-bold mb-4 font-serif">{title}</h3>
         {isLoading ? (
            <div className="flex justify-center py-8">
               <RefreshCw className="animate-spin text-[#8b5a2b] w-10 h-10" />
            </div>
         ) : (
            <p className="text-lg md:text-xl text-[#5c3a1e] font-serif italic leading-relaxed">
               "{text}"
            </p>
         )}
         <button onClick={onClose} className="mt-6 bg-[#8b5a2b] text-[#fdf6e3] px-6 py-2 rounded-full font-bold hover:bg-[#6b4521] transition-colors">
            OK
         </button>
      </div>
    </div>
  );
};

// Confirmation Modal for Coins
const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    cost, 
    title, 
    message,
    confirmText,
    cancelText 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onConfirm: () => void, 
    cost: number,
    title: string,
    message: string,
    confirmText: string,
    cancelText: string
}) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 bg-black/70 z-[130] flex items-center justify-center backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-[350px] p-6 rounded-2xl shadow-2xl relative text-center border-4 border-yellow-500" onClick={e => e.stopPropagation()}>
         <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 p-4 rounded-full">
                <AlertTriangle className="text-yellow-600 w-10 h-10" />
            </div>
         </div>
         <h3 className="text-gray-800 text-2xl font-bold mb-2">{title}</h3>
         <p className="text-gray-600 text-lg mb-6">
            {message.replace('{n}', String(cost))}
         </p>
         <div className="flex flex-col gap-3">
             <button onClick={onConfirm} className="bg-yellow-500 hover:bg-yellow-600 text-white text-lg font-bold py-3 px-6 rounded-full shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                <Coins size={20} /> {confirmText}
             </button>
             <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-full transition-colors">
                {cancelText}
             </button>
         </div>
      </div>
    </div>
  );
};

// Component to render a flying tile for animation
const AnimatedTile = ({ 
  tile, 
  startRect, 
  targetRect, 
  onComplete 
}: { 
  tile: TileData, 
  startRect: DOMRect, 
  targetRect: DOMRect, 
  onComplete: () => void 
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    left: startRect.left,
    top: startRect.top,
    width: startRect.width,
    height: startRect.height,
    zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', 
    pointerEvents: 'none',
    transformOrigin: 'top left'
  });

  useEffect(() => {
    // Determine scale to shrink from board size to dock size
    const scaleX = targetRect.width / startRect.width;
    const scaleY = targetRect.height / startRect.height;

    // Next frame, trigger transition
    const frameId = requestAnimationFrame(() => {
      setStyle(prev => ({
        ...prev,
        left: targetRect.left,
        top: targetRect.top,
        width: startRect.width, 
        height: startRect.height,
        transform: `scale(${scaleX}, ${scaleY})`
      }));
    });

    const timer = setTimeout(onComplete, 300); 

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, []);

  return <Tile tile={tile} playable={false} selected={false} isDocked={false} style={style} />;
};

const App: React.FC = () => {
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [score, setScore] = useState(0);
  // Coins System
  const [coins, setCoins] = useState(10000); 
  
  const [gameOver, setGameOver] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [history, setHistory] = useState<TileData[][]>([]); // Undo history
  const [hintActive, setHintActive] = useState(false);
  
  // Flying Tiles State for Animation
  const [flyingTiles, setFlyingTiles] = useState<{
    id: string;
    tile: TileData;
    startRect: DOMRect;
    targetRect: DOMRect;
  }[]>([]);

  // Refs for Dock Slots to calculate target positions
  const dockSlotRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Language & Settings
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ru');
  const t = translations[currentLanguage];
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('MEDIUM');
  const [currentTheme, setCurrentTheme] = useState<Theme>('CLASSIC');

  // Combo System
  const [comboCount, setComboCount] = useState(0);
  const lastMatchTimeRef = useRef<number>(0);
  const [comboPopups, setComboPopups] = useState<{id: number, count: number, x: number, y: number}[]>([]);

  // Timer System
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Sage / Gemini
  const [sageOpen, setSageOpen] = useState(false);
  const [sageText, setSageText] = useState("");
  const [sageLoading, setSageLoading] = useState(false);

  // Live Audio
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Parallax / 3D Tilt
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mobile Scaling
  const [boardScale, setBoardScale] = useState(1);

  // Track explosions: index of the dock slot exploding
  const [activeExplosions, setActiveExplosions] = useState<number[]>([]);
  
  // Level State
  const [level, setLevel] = useState(1);
  
  // Settings & Audio State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [sfxVolume, setSfxVolume] = useState(0.5);

  // Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<{type: 'undo'|'hint'|'shuffle', cost: number} | null>(null);

  // Initialize game on mount
  useEffect(() => {
    startNewGame(1, currentDifficulty);
  }, []);

  // Set language in services
  useEffect(() => {
    liveService.setLanguage(currentLanguage);
  }, [currentLanguage]);

  // Handle Resize for Mobile Scaling
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Target board size is roughly 1000x600 plus margins
      const desiredWidth = 1050; 
      const desiredHeight = 850; // Increased to account for UI elements

      const scaleX = w / desiredWidth;
      const scaleY = h / desiredHeight;

      // Use the smaller scale to fit both dimensions, but cap at 1 (don't stretch on huge screens)
      let finalScale = Math.min(scaleX, scaleY);
      if (finalScale > 1) finalScale = 1;
      // Prevent it from getting microscopically small, though logic above handles ratio
      if (finalScale < 0.3) finalScale = 0.3;

      setBoardScale(finalScale);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!gameOver && !gameLost && !isSettingsOpen && !sageOpen && !pendingAction) {
      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameOver, gameLost, isSettingsOpen, sageOpen, pendingAction]);

  // Sync volumes with audio service
  useEffect(() => {
    audioService.setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    audioService.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  // Handle Mouse Move for Parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    // Disable parallax on mobile to save performance/battery and because touch logic differs
    if (window.innerWidth < 768) return;

    // Normalize coordinates from -1 to 1 based on screen center
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    setMousePos({ x, y });
  };

  // Background Styles based on Theme
  const getBackgroundStyle = () => {
    switch (currentTheme) {
      case 'WOOD':
        return 'bg-[#4a3b2a] bg-[radial-gradient(#5d4a35_1px,transparent_1px)] [background-size:20px_20px]';
      case 'OCEAN':
        return 'bg-gradient-to-b from-[#1e3a8a] to-[#0f172a]';
      case 'NIGHT':
        return 'bg-[#0f172a]';
      case 'CLASSIC':
      default:
        return 'bg-[#2c5844]';
    }
  };

  const startNewGame = (lvl: number = 1, diff: Difficulty = currentDifficulty) => {
    const newTiles = initGame(lvl, diff);
    setTiles(newTiles);
    if (lvl === 1) setScore(0);
    setGameOver(false);
    setGameLost(false);
    setHistory([]);
    setHintActive(false);
    setLevel(lvl);
    setActiveExplosions([]);
    setFlyingTiles([]);
    setComboCount(0);
    setSeconds(0);
  };

  const handleNextLevel = () => {
    audioService.playClick();
    setCoins(prev => prev + 1000); // Reward for next level
    startNewGame(level + 1);
  };

  const handleRestart = () => {
    audioService.playClick();
    startNewGame(1);
  };

  const handleRetryLevel = () => {
    audioService.playClick();
    startNewGame(level);
  };

  const handleDifficultyChange = (newDiff: Difficulty) => {
    setCurrentDifficulty(newDiff);
  };

  const ensureAudioStarted = () => {
    audioService.startMusic();
  };

  const toggleLiveVoice = () => {
    ensureAudioStarted();
    if (isLiveConnected) {
        liveService.disconnect(setIsLiveConnected);
    } else {
        liveService.connect(setIsLiveConnected);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSageAdvice = async () => {
     ensureAudioStarted();
     setSageOpen(true);
     setSageLoading(true);
     setSageText("");
     const advice = await getGeminiAdvice(currentLanguage);
     setSageText(advice);
     setSageLoading(false);
  };

  const triggerExplosion = (slotIndices: number[]) => {
    setActiveExplosions(prev => [...prev, ...slotIndices]);
    setTimeout(() => {
        setActiveExplosions(prev => prev.filter(idx => !slotIndices.includes(idx)));
    }, 700);
  };

  // Called after animation lands
  const processTileDocking = (tileId: string) => {
    setTiles(prevTiles => {
      // 1. Move tile to Dock
      const updatedTiles = prevTiles.map(t => {
        if (t.id === tileId) {
          return { ...t, location: 'dock' as const, isHinted: false, isFlying: false };
        }
        return t;
      });

      // 2. Process Dock Logic
      const dockTiles = updatedTiles.filter(t => t.location === 'dock' && t.isVisible);
      const newTileInDock = dockTiles.find(t => t.id === tileId);
      
      let matchFound = false;
      let newTilesState = [...updatedTiles];
      let shouldExplode = false;
      let explosionIndices: number[] = [];

      if (newTileInDock) {
        const match = dockTiles.find(t => t.id !== newTileInDock.id && checkMatch(t, newTileInDock));
        
        if (match) {
          matchFound = true;
          shouldExplode = true;
          
          const dockList = newTilesState.filter(t => t.location === 'dock' && t.isVisible);
          const idx1 = dockList.findIndex(t => t.id === newTileInDock.id);
          const idx2 = dockList.findIndex(t => t.id === match.id);
          explosionIndices = [idx1, idx2];

          // Mark as invisible
          newTilesState = newTilesState.map(t => {
            if (t.id === newTileInDock.id || t.id === match.id) {
              return { ...t, isVisible: false };
            }
            return t;
          });

          // COMBO LOGIC
          const now = Date.now();
          const timeSinceLast = now - lastMatchTimeRef.current;
          lastMatchTimeRef.current = now;

          let currentCombo = 1;
          // 3 seconds window for combo
          if (timeSinceLast < 3000) {
             setComboCount(prev => {
                currentCombo = prev + 1;
                return currentCombo;
             });
          } else {
             setComboCount(1);
             currentCombo = 1;
          }

          // Trigger visual popup if combo > 1
          if (currentCombo > 1) {
              const dockEl = dockSlotRefs.current[idx1];
              if (dockEl) {
                  const rect = dockEl.getBoundingClientRect();
                  const newPopup = { id: now, count: currentCombo, x: rect.left, y: rect.top - 50 };
                  setComboPopups(prev => [...prev, newPopup]);
                  
                  // Live Voice Reaction for Combo
                  if (liveService.isLive) {
                      liveService.sendGameEvent(`Player got a Combo x${currentCombo}! Praise them!`);
                  }

                  // Remove popup after animation
                  setTimeout(() => {
                      setComboPopups(prev => prev.filter(p => p.id !== now));
                  }, 1000);
              }
          }
        }
      }

      // Side Effects
      setTimeout(() => {
          if (shouldExplode) {
             // Calculate Score: Base 100 * Combo Multiplier
             const comboMult = Math.min(5, Math.max(1, comboCount + (matchFound ? 1 : 0) - (comboCount === 0 ? 0 : 0)));
             const scoreAdd = 100 * (matchFound ? (Date.now() - lastMatchTimeRef.current < 3000 ? (comboCount + 1) : 1) : 1);
             
             setScore(s => s + scoreAdd);
             // Reward coins for match
             setCoins(c => c + 50);

             audioService.playMatch();
             triggerExplosion(explosionIndices);
          }
          
          const visibleDock = newTilesState.filter(t => t.location === 'dock' && t.isVisible);
          const visibleBoard = newTilesState.filter(t => t.location === 'board' && t.isVisible);
          
          if (visibleBoard.length === 0 && visibleDock.length === 0) {
            setGameOver(true);
            audioService.playWin();
            if (liveService.isLive) {
                liveService.sendGameEvent("Player won the level! Congratulate them enthusiastically!");
            }
          } else if (visibleDock.length >= 4 && !matchFound) {
            setGameLost(true);
            audioService.playLose();
             if (liveService.isLive) {
                liveService.sendGameEvent("Player lost the game. Offer kind consolation.");
            }
          }
      }, 0);

      return newTilesState;
    });

    // Remove from flying list
    setFlyingTiles(prev => prev.filter(ft => ft.tile.id !== tileId));
  };

  const handleTileClick = useCallback((clickedTile: TileData, e: React.MouseEvent) => {
    ensureAudioStarted();
    if (gameOver || gameLost || clickedTile.isFlying || pendingAction) return;

    if (clickedTile.location !== 'board' || !isTilePlayable(clickedTile, tiles)) return;

    const currentDockCount = tiles.filter(t => t.location === 'dock' && t.isVisible).length;
    const pendingTilesCount = flyingTiles.length;
    const nextSlotIndex = currentDockCount + pendingTilesCount;

    if (nextSlotIndex >= 4) return; 

    audioService.playLift();

    const startRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const targetSlot = dockSlotRefs.current[nextSlotIndex];
    
    if (!targetSlot) return; 
    const targetRect = targetSlot.getBoundingClientRect();

    const currentTilesState = JSON.parse(JSON.stringify(tiles));
    setHistory(prev => [...prev.slice(-4), currentTilesState]);

    setTiles(prev => prev.map(t => t.id === clickedTile.id ? { ...t, isFlying: true, isHinted: false } : t));

    setFlyingTiles(prev => [
      ...prev,
      { id: clickedTile.id, tile: clickedTile, startRect, targetRect }
    ]);

  }, [tiles, gameOver, gameLost, flyingTiles, pendingAction]);

  const requestAction = (type: 'undo'|'hint'|'shuffle', cost: number) => {
    ensureAudioStarted();
    if (coins >= cost) {
      setPendingAction({ type, cost });
    } else {
      alert(t.not_enough_coins);
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    
    // Deduct coins
    setCoins(prev => prev - pendingAction.cost);

    // Execute logic
    if (pendingAction.type === 'undo') {
        executeUndo();
    } else if (pendingAction.type === 'hint') {
        executeHint();
    } else if (pendingAction.type === 'shuffle') {
        executeShuffle();
    }

    setPendingAction(null);
  };

  const executeShuffle = () => {
    if (score >= 100) setScore(s => s - 100);
    const shuffled = shuffleRemaining(tiles);
    setTiles(shuffled);
    audioService.playShuffle();
  };

  const executeUndo = () => {
    if (history.length === 0 || gameOver || gameLost) return;
    const previousState = history[history.length - 1];
    setTiles(previousState);
    setHistory(prev => prev.slice(0, -1));
    setScore(s => Math.max(0, s - 50));
    setGameLost(false); 
    setFlyingTiles([]); 
    setComboCount(0); // Reset combo on undo
    audioService.playUndo();
  };

  const executeHint = async () => {
    if (hintActive) return;

    const cleanTiles = tiles.map(t => ({...t, isHinted: false}));
    const pair = findHintPair(cleanTiles);

    if (pair) {
      audioService.playHint();
      const [t1, t2] = pair;
      
      const hintedTiles = cleanTiles.map(t => {
        if (t.id === t1.id || t.id === t2.id) {
          return { ...t, isHinted: true };
        }
        return t;
      });

      setTiles(hintedTiles);
      setHintActive(true);
      setScore(s => Math.max(0, s - 200));

      setTimeout(() => {
         setTiles(prev => prev.map(t => ({...t, isHinted: false})));
         setHintActive(false);
      }, 3000);

    } else {
      alert(t.no_hint);
    }
  };

  const toggleSettings = () => {
    ensureAudioStarted();
    setIsSettingsOpen(!isSettingsOpen);
  };

  // Filter tiles for rendering
  const boardTiles = tiles.filter(t => t.isVisible && t.location === 'board');
  const dockTiles = tiles.filter(t => t.isVisible && t.location === 'dock');

  // Dynamic button classes for bottom bar to save space on mobile
  const bottomBtnClass = "flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-full text-xs md:text-lg font-bold shadow-md active:shadow-none active:translate-y-1 transition-all flex-1 md:flex-none";
  const costBadgeClass = "text-[10px] md:text-xs bg-black/30 px-2 py-0.5 rounded-full mt-1 md:mt-0 md:ml-1";

  return (
    <div 
      className={`w-full h-screen flex flex-col items-center relative overflow-hidden transition-colors duration-500 ${getBackgroundStyle()}`} 
      onClick={ensureAudioStarted}
      onMouseMove={handleMouseMove}
    >
      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmAction}
        cost={pendingAction?.cost || 0}
        title={t.confirm_title}
        message={t.confirm_cost}
        confirmText={t.confirm_yes}
        cancelText={t.confirm_no}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        musicVolume={musicVolume}
        onMusicVolumeChange={setMusicVolume}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={setSfxVolume}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        currentDifficulty={currentDifficulty}
        onDifficultyChange={handleDifficultyChange}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />

      {/* Sage Modal */}
      <SageModal 
         isOpen={sageOpen} 
         onClose={() => setSageOpen(false)} 
         text={sageText} 
         isLoading={sageLoading}
         title={t.sage_modal_title}
      />

      {/* Confetti on Win */}
      {gameOver && <Confetti />}

      {/* Combo Popups */}
      {comboPopups.map(p => (
         <ComboText key={p.id} count={p.count} x={p.x} y={p.y} />
      ))}

      {/* Flying Tiles Overlay */}
      {flyingTiles.map((ft) => (
        <AnimatedTile 
          key={ft.id}
          tile={ft.tile}
          startRect={ft.startRect}
          targetRect={ft.targetRect}
          onComplete={() => processTileDocking(ft.id)}
        />
      ))}

      {/* Top Header */}
      <div className={`w-full flex justify-between items-center px-4 md:px-8 py-2 shadow-md z-50 ${currentTheme === 'CLASSIC' ? 'bg-[#1e3d2f]' : 'bg-black/40 backdrop-blur-md'}`}>
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-lg md:text-2xl font-bold text-white tracking-wide hidden sm:block">VITA MAHJONG</h1>
          <span className="bg-white/20 px-2 md:px-3 py-1 rounded text-white text-xs md:text-sm font-bold whitespace-nowrap">{t.level}: {level}</span>
        </div>
        
        {/* Timer Display */}
        <div className="flex items-center gap-2 text-yellow-300 font-mono text-lg md:text-2xl font-bold bg-black/20 px-2 md:px-4 py-1 rounded-lg">
           <TimerIcon className="w-4 h-4 md:w-6 md:h-6" />
           {formatTime(seconds)}
        </div>

        <div className="flex gap-2 md:gap-4 text-white items-center">
          {/* Coins Display */}
          <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/50">
             <Coins className="text-yellow-400 w-5 h-5" />
             <span className="text-white font-bold">{coins}</span>
          </div>

          {comboCount > 1 && (
             <div className="hidden md:flex items-center text-yellow-300 animate-pulse font-bold">
                <Zap size={20} className="mr-1 fill-yellow-300" />
                {t.combo} x{comboCount}
             </div>
          )}
          <div className="flex flex-col items-center">
             <span className="text-[10px] md:text-xs text-gray-300">{t.score}</span>
             <span className="text-sm md:text-xl font-bold text-yellow-400">{score}</span>
          </div>
          <button onClick={toggleLiveVoice} className={`p-2 rounded-full border border-white/20 transition-all ${isLiveConnected ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}>
            {isLiveConnected ? <Mic className="text-white w-4 h-4 md:w-5 md:h-5" /> : <MicOff className="text-white w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button onClick={toggleSettings} className="p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-all">
            <Settings className="text-white w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* DOCK AREA (Top Center) */}
      <div className="w-full flex justify-center mt-2 md:mt-4 z-40">
        <div className={`border-2 border-red-500 rounded-xl p-2 shadow-2xl backdrop-blur-md ${currentTheme === 'CLASSIC' ? 'bg-[#1e3d2f]/90' : 'bg-black/60'}`}>
           <div className="flex gap-2 relative">
              {/* Render slots */}
              {Array.from({ length: 4 }).map((_, idx) => {
                 const tile = dockTiles[idx];
                 const isExploding = activeExplosions.includes(idx);

                 return (
                   <div 
                     key={idx} 
                     ref={el => { dockSlotRefs.current[idx] = el }}
                     className="relative w-[50px] h-[70px] md:w-[60px] md:h-[80px] bg-black/40 rounded-lg border border-white/10 flex items-center justify-center transition-all"
                    >
                      {isExploding && <Explosion />}
                      {tile ? (
                        <Tile 
                          tile={tile}
                          playable={false} 
                          selected={false}
                          isDocked={true}
                        />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                      )}
                   </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 w-full relative flex justify-center items-center overflow-hidden perspective-[1000px]">
         {/* Board Container with Parallax Effect and Responsive Scale */}
         <div 
           className="relative transition-transform duration-100 ease-out origin-center" 
           style={{ 
              width: '1000px', 
              height: '600px',
              // Combine Scale for responsiveness AND Rotate for Parallax
              transform: `scale(${boardScale}) rotateX(${mousePos.y * -3}deg) rotateY(${mousePos.x * 3}deg)`
           }}
         >
            {boardTiles.map(tile => (
                <Tile 
                  key={tile.id} 
                  tile={tile} 
                  playable={isTilePlayable(tile, tiles)}
                  selected={false} 
                  onClick={handleTileClick}
                />
            ))}
         </div>

         {/* Victory Modal */}
         {gameOver && (
           <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[200]">
             <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl text-center max-w-sm md:max-w-lg w-full m-4">
                <Trophy className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-2">{t.victory}</h2>
                <p className="text-lg md:text-xl text-gray-600 mb-6">{t.level_complete.replace('{n}', String(level))}</p>
                <div className="text-xl md:text-2xl font-mono text-green-600 font-bold mb-6">
                   {t.time}: {formatTime(seconds)}
                </div>
                <button 
                  onClick={handleNextLevel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-lg md:text-xl font-bold py-3 px-8 rounded-full shadow-lg mx-auto"
                >
                  {t.next_level} <ArrowRight />
                </button>
             </div>
           </div>
         )}

         {/* Game Over Modal */}
         {gameLost && (
           <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[200]">
             <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl text-center max-w-sm md:max-w-lg w-full border-4 border-red-500 m-4">
                <Ban className="w-16 h-16 md:w-24 md:h-24 text-red-500 mx-auto mb-4" />
                <h2 className="text-3xl md:text-4xl font-bold text-red-800 mb-2">{t.defeat}</h2>
                <p className="text-base md:text-lg text-gray-600 mb-6">{t.defeat_desc}</p>
                <div className="flex gap-4 justify-center">
                    <button 
                      onClick={handleRestart}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 md:py-3 md:px-6 rounded-full"
                    >
                      {t.restart_full}
                    </button>
                    <button 
                      onClick={handleRetryLevel}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-lg md:text-xl font-bold py-2 px-6 md:py-3 md:px-8 rounded-full shadow-lg"
                    >
                      {t.retry_level}
                    </button>
                </div>
             </div>
           </div>
         )}
      </div>

      {/* Bottom Controls */}
      <div className={`w-full p-2 md:p-4 grid grid-cols-4 md:flex md:justify-center gap-2 md:gap-6 shadow-[0_-4px_10px_rgba(0,0,0,0.3)] z-50 ${currentTheme === 'CLASSIC' ? 'bg-[#1e3d2f]' : 'bg-black/60 backdrop-blur-md'}`}>
         <button 
           onClick={() => requestAction('undo', 2000)}
           disabled={history.length === 0}
           className={`${bottomBtnClass} ${history.length === 0 ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_0_#1e3a8a]'}`}
         >
           <div className="flex flex-col items-center">
             <div className="flex items-center gap-1">
               <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">{t.undo}</span>
             </div>
             <span className={costBadgeClass}>2000</span>
           </div>
         </button>

         <button 
           onClick={() => requestAction('hint', 2000)}
           disabled={hintActive}
           className={`${bottomBtnClass} bg-pink-600 hover:bg-pink-500 text-white shadow-[0_4px_0_#be185d]`}
         >
           <div className="flex flex-col items-center">
             <div className="flex items-center gap-1">
               <Lightbulb className={`w-4 h-4 md:w-5 md:h-5 ${hintActive ? "animate-spin" : ""}`} /> 
               <span className="hidden sm:inline">{t.hint}</span>
             </div>
             <span className={costBadgeClass}>2000</span>
           </div>
         </button>

         <button 
           onClick={handleSageAdvice}
           className={`${bottomBtnClass} bg-[#8b5a2b] hover:bg-[#6b4521] text-white shadow-[0_4px_0_#5c3a1e]`}
         >
           <div className="flex flex-col items-center">
             <div className="flex items-center gap-1">
               <ScrollText className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">{t.sage}</span>
             </div>
             <span className={costBadgeClass}>{t.cost_free}</span>
           </div>
         </button>

         <button 
           onClick={() => requestAction('shuffle', 3000)}
           className={`${bottomBtnClass} bg-orange-600 hover:bg-orange-500 text-white shadow-[0_4px_0_#9a3412]`}
         >
           <div className="flex flex-col items-center">
             <div className="flex items-center gap-1">
               <RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">{t.shuffle}</span>
             </div>
             <span className={costBadgeClass}>3000</span>
           </div>
         </button>
      </div>
    </div>
  );
};

export default App;