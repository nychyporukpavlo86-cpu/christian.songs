import { Song } from '../types';
import { ChevronRight, Music } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

interface SongCardProps {
  song: Song;
  displayNumber: number;
  onClick: () => void;
  index: number;
  key?: string | number;
}

export function SongCard({ song, displayNumber, onClick, index }: SongCardProps) {
  // Badge is visible only if it's not a seed song and current time - createdAt < 3 hours
  const isRecent = !song.isSeedSong && (Date.now() - song.createdAt < 3 * 60 * 60 * 1000);

  return (
    <button
      onClick={onClick}
      className="group flex items-center bg-white dark:bg-[#252725] p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm hover:shadow-md hover:bg-olive/5 dark:hover:bg-white/5 transition-all text-left border border-transparent hover:border-olive/10 dark:hover:border-white/10"
    >
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-olive/10 dark:bg-[#9eb3a3]/10 flex items-center justify-center text-olive dark:text-[#9eb3a3] font-medium text-xs md:text-sm mr-3 md:mr-4 group-hover:bg-olive dark:group-hover:bg-[#9eb3a3] group-hover:text-white dark:group-hover:text-[#1c1d1c] transition-colors flex-shrink-0">
        {displayNumber}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="text-base md:text-lg text-olive/90 dark:text-[#e2e4e2] group-hover:text-olive dark:group-hover:text-[#9eb3a3] transition-colors font-semibold truncate">
            {song.title}
          </span>
          {isRecent && (
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full font-bold flex-shrink-0">
              Нове
            </span>
          )}
        </div>
        {song.lyrics && (
          <p className="text-[11px] md:text-xs text-olive/40 dark:text-[#9eb3a3]/40 line-clamp-1 mt-0.5 italic serif truncate">
            {song.lyrics.substring(0, 60)}...
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-olive/20 dark:text-[#9eb3a3]/20 group-hover:text-olive/60 dark:group-hover:text-[#9eb3a3]/60 transition-colors flex-shrink-0 ml-2" />
    </button>
  );
}
