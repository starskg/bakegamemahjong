import React from 'react';
import { X, Volume2, Music, Globe, BarChart3, Palette } from 'lucide-react';
import { Language, Difficulty, Theme } from '../types';
import { translations } from '../translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  musicVolume: number;
  onMusicVolumeChange: (val: number) => void;
  sfxVolume: number;
  onSfxVolumeChange: (val: number) => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  currentDifficulty: Difficulty;
  onDifficultyChange: (diff: Difficulty) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  musicVolume,
  onMusicVolumeChange,
  sfxVolume,
  onSfxVolumeChange,
  currentLanguage,
  onLanguageChange,
  currentDifficulty,
  onDifficultyChange,
  currentTheme,
  onThemeChange
}) => {
  if (!isOpen) return null;

  const t = translations[currentLanguage];

  const btnClass = (isActive: boolean) => 
    `flex-1 py-2 text-sm rounded-lg font-bold border-2 transition-all ${
      isActive 
      ? 'bg-yellow-500 text-black border-yellow-300' 
      : 'bg-green-800 text-gray-300 border-transparent hover:bg-green-700'
    }`;

  return (
    <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-[#1e3d2f] w-[500px] border-4 border-[#4ade80] rounded-2xl shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-green-200 hover:text-white p-2 rounded-full hover:bg-green-800 transition-colors"
        >
          <X size={32} />
        </button>

        <h2 className="text-3xl font-bold text-white mb-6 text-center border-b border-green-700 pb-4">
          {t.settings_title}
        </h2>

        <div className="space-y-6">
          {/* Music Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-yellow-400">
              <Music size={24} />
              <span className="text-lg font-bold">{t.music_vol}</span>
            </div>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={musicVolume}
                onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
                className="w-full h-4 bg-green-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
              />
              <span className="text-white font-mono w-12 text-right">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          </div>

          {/* SFX Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-yellow-400">
              <Volume2 size={24} />
              <span className="text-lg font-bold">{t.sfx_vol}</span>
            </div>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={sfxVolume}
                onChange={(e) => onSfxVolumeChange(parseFloat(e.target.value))}
                className="w-full h-4 bg-green-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
              />
              <span className="text-white font-mono w-12 text-right">
                {Math.round(sfxVolume * 100)}%
              </span>
            </div>
          </div>

          {/* Theme Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-yellow-400">
              <Palette size={24} />
              <span className="text-lg font-bold">{t.theme}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => onThemeChange('CLASSIC')} className={btnClass(currentTheme === 'CLASSIC')}>
                 {t.theme_classic}
               </button>
               <button onClick={() => onThemeChange('WOOD')} className={btnClass(currentTheme === 'WOOD')}>
                 {t.theme_wood}
               </button>
               <button onClick={() => onThemeChange('OCEAN')} className={btnClass(currentTheme === 'OCEAN')}>
                 {t.theme_ocean}
               </button>
               <button onClick={() => onThemeChange('NIGHT')} className={btnClass(currentTheme === 'NIGHT')}>
                 {t.theme_night}
               </button>
            </div>
          </div>

          {/* Difficulty Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-yellow-400">
              <BarChart3 size={24} />
              <span className="text-lg font-bold">{t.difficulty}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => onDifficultyChange('EASY')} className={btnClass(currentDifficulty === 'EASY')}>
                 {t.diff_easy}
               </button>
               <button onClick={() => onDifficultyChange('MEDIUM')} className={btnClass(currentDifficulty === 'MEDIUM')}>
                 {t.diff_medium}
               </button>
               <button onClick={() => onDifficultyChange('HARD')} className={btnClass(currentDifficulty === 'HARD')}>
                 {t.diff_hard}
               </button>
               <button onClick={() => onDifficultyChange('NIGHTMARE')} className={btnClass(currentDifficulty === 'NIGHTMARE')}>
                 {t.diff_nightmare}
               </button>
            </div>
          </div>

          {/* Language Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-yellow-400">
              <Globe size={24} />
              <span className="text-lg font-bold">{t.language}</span>
            </div>
            <div className="flex justify-between gap-2">
               <button 
                 onClick={() => onLanguageChange('ru')}
                 className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${currentLanguage === 'ru' ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-green-800 text-gray-300 border-transparent hover:bg-green-700'}`}
               >
                 Русский
               </button>
               <button 
                 onClick={() => onLanguageChange('en')}
                 className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${currentLanguage === 'en' ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-green-800 text-gray-300 border-transparent hover:bg-green-700'}`}
               >
                 English
               </button>
               <button 
                 onClick={() => onLanguageChange('uz')}
                 className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${currentLanguage === 'uz' ? 'bg-yellow-500 text-black border-yellow-300' : 'bg-green-800 text-gray-300 border-transparent hover:bg-green-700'}`}
               >
                 O'zbek
               </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={onClose}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-10 rounded-full text-lg shadow-lg"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};