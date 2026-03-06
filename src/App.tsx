import { useState, useMemo, useEffect } from 'react';
import { Search, Music, BookOpen, ChevronRight, X, FileDown, Plus, RotateCcw, SortAsc, Moon, Sun, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_SONGS, CATEGORIES } from './constants';
import { Song } from './types';
import { SongCard } from './components/SongCard';
import { SongModal } from './components/SongModal';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchInput, setSearchInput] = useState(''); // Performance optimization: local input state
  const [searchQuery, setSearchQuery] = useState(''); // Debounced query for filtering
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sortByNumber, setSortByNumber] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Усі пісні");
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [recentlyViewed, setRecentlyViewed] = useState<Song[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // Storage safety: track if initial load is complete
  const [showResetConfirm, setShowResetConfirm] = useState(false); // Custom reset confirmation dialog

  // Load state from localStorage
  useEffect(() => {
    // Load songs
    const savedSongs = localStorage.getItem('christian_songbook_songs_v2');
    if (savedSongs) {
      try {
        const parsed = JSON.parse(savedSongs);
        // Storage safety: use parsed array even if empty, so user can delete all songs if they want
        if (Array.isArray(parsed)) {
          setSongs(parsed);
        } else {
          setSongs(INITIAL_SONGS);
        }
      } catch (e) {
        setSongs(INITIAL_SONGS);
      }
    } else {
      setSongs(INITIAL_SONGS);
    }

    // Load theme
    const savedTheme = localStorage.getItem('christian_songbook_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Load recently viewed
    const savedRecent = localStorage.getItem('christian_songbook_recent');
    if (savedRecent) {
      try {
        setRecentlyViewed(JSON.parse(savedRecent));
      } catch (e) {}
    }
    
    setIsLoaded(true); // Mark as loaded so we can safely save
  }, []);

  // Save songs to localStorage: removed length check to ensure empty list is saved too
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('christian_songbook_songs_v2', JSON.stringify(songs));
    }
  }, [songs, isLoaded]);

  // Save theme to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('christian_songbook_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, isLoaded]);

  // Save recently viewed to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('christian_songbook_recent', JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, isLoaded]);

  // Performance optimization: debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Recently viewed songs storage logic: keeps last 5 unique songs
  const addToRecent = (song: Song) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, 5);
    });
  };

  const sortedSongs = useMemo(() => {
    const list = [...songs];
    // Alphabetical order maintenance: always sort by title first
    list.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    
    // Dynamic numbering recalculation: assign numbers based on sorted position
    const withNumbers = list.map((song, idx) => ({
      ...song,
      displayNumber: idx + 1
    }));

    if (sortByNumber) {
      return withNumbers.sort((a, b) => a.displayNumber - b.displayNumber);
    }
    return withNumbers;
  }, [songs, sortByNumber]);

  // Category filtering logic: filters by search query and selected category
  const filteredSongs = useMemo(() => {
    return sortedSongs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.displayNumber?.toString().includes(searchQuery) ||
        song.lyrics.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === "Усі пісні" || 
        (song.categories && song.categories.includes(selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, sortedSongs, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Усі пісні": sortedSongs.length
    };
    CATEGORIES.forEach(cat => {
      if (cat !== "Усі пісні") {
        counts[cat] = sortedSongs.filter(s => s.categories?.includes(cat)).length;
      }
    });
    return counts;
  }, [sortedSongs]);

  const handleSaveSong = (updatedSong: Song) => {
    setSongs(prev => {
      const index = prev.findIndex(s => s.id === updatedSong.id);
      const now = Date.now();
      
      if (index >= 0) {
        const next = [...prev];
        next[index] = {
          ...updatedSong,
          updatedAt: now
        };
        return next;
      }
      
      // New song
      return [...prev, {
        ...updatedSong,
        createdAt: now,
        updatedAt: now
      }];
    });
    setSelectedSong(null);
    setIsAdding(false);
  };

  // Delete song logic: removes from state, which triggers localStorage update
  // Fix: Also remove from recentlyViewed to prevent UI inconsistencies
  const handleDeleteSong = (id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
    setRecentlyViewed(prev => prev.filter(s => s.id !== id));
  };

  const handleReset = () => {
    localStorage.removeItem('christian_songbook_songs_v2');
    setSongs(INITIAL_SONGS);
    setShowResetConfirm(false);
  };

  const downloadDocx = async () => {
    setIsGenerating(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "Християнський Пісенник",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Зміст (Алфавітний порядок)",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
            ...sortedSongs.map(song => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${song.displayNumber}. `,
                    bold: true,
                  }),
                  new TextRun({
                    text: song.title,
                  }),
                ],
                spacing: { after: 120 },
              })
            ),
            new Paragraph({
              text: "",
              spacing: { before: 400, after: 400 },
              pageBreakBefore: true,
            }),
            ...sortedSongs.map(song => ([
              new Paragraph({
                text: `${song.displayNumber}. ${song.title}`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                text: song.lyrics || "Текст відсутній",
                spacing: { after: 400 },
              }),
            ])).flat(),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Християнський_Пісенник.docx");
    } catch (error) {
      console.error("Error generating DOCX:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-3 py-6 md:px-4 md:py-12 print:p-0 print:m-0 print:min-h-0">
      {/* Header */}
      <header className="mb-6 md:mb-8 text-center relative no-print">
        <div className="absolute right-0 top-0">
          <button
            onClick={toggleTheme}
            className="p-2.5 md:p-3 rounded-full bg-white dark:bg-[#252725] shadow-sm hover:shadow-md transition-all text-olive dark:text-[#9eb3a3]"
            title={theme === 'light' ? 'Темна тема' : 'Світла тема'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="serif text-4xl md:text-7xl font-light mb-2 md:mb-4 text-olive dark:text-[#9eb3a3]">
            Християнський Пісенник
          </h1>
          <p className="text-[10px] md:text-sm uppercase tracking-[0.2em] text-olive/60 dark:text-[#9eb3a3]/60 font-medium">
            Збірник духовних пісень
          </p>
        </motion.div>
      </header>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-6 md:mb-8 no-print">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
              selectedCategory === cat 
                ? 'bg-olive text-white shadow-md' 
                : 'bg-white dark:bg-[#252725] text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3] shadow-sm'
            }`}
          >
            {cat} <span className="opacity-50 ml-1">({categoryCounts[cat] || 0})</span>
          </button>
        ))}
      </div>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div className="mb-6 md:mb-8 no-print">
          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 text-olive/40 dark:text-[#9eb3a3]/40 px-2">
            <History className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold">Останні переглянуті</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {recentlyViewed.map(song => (
              <button
                key={song.id}
                onClick={() => {
                  setSelectedSong(song);
                  addToRecent(song);
                }}
                className="flex-shrink-0 bg-white dark:bg-[#252725] px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl shadow-sm hover:shadow-md transition-all text-xs md:text-sm text-olive dark:text-[#e2e4e2] border border-olive/5 dark:border-white/10"
              >
                {song.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls Area */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8 items-center no-print">
        {/* Search Bar */}
        <div className="relative flex-grow w-full">
          <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-olive/40 dark:text-[#9eb3a3]/40" />
          </div>
          <input
            type="text"
            placeholder="Пошук за назвою, номером або текстом..."
            className="w-full bg-white dark:bg-[#252725] border-none rounded-full py-3 md:py-4 pl-10 md:pl-12 pr-10 md:pr-12 shadow-sm focus:ring-2 focus:ring-olive/20 dark:focus:ring-[#9eb3a3]/20 transition-all outline-none text-sm md:text-base text-olive dark:text-[#e2e4e2] placeholder:text-olive/30 dark:placeholder:text-[#9eb3a3]/30"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button 
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
              className="absolute inset-y-0 right-3 md:right-4 flex items-center text-olive/40 dark:text-[#9eb3a3]/40 hover:text-olive dark:hover:text-[#9eb3a3] transition-colors"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setSortByNumber(!sortByNumber)}
            className={`flex items-center justify-center gap-1.5 md:gap-2 px-4 py-3 md:px-6 md:py-4 rounded-full shadow-sm transition-all font-medium text-xs md:text-sm flex-1 md:flex-none ${sortByNumber ? 'bg-olive text-white' : 'bg-white dark:bg-[#252725] text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3]'}`}
            title={sortByNumber ? "Сортувати за алфавітом" : "Сортувати за номером"}
          >
            <SortAsc className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="md:hidden lg:inline">{sortByNumber ? 'За номером' : 'За алфавітом'}</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-olive text-white px-5 py-3 md:px-8 md:py-4 rounded-full shadow-md hover:shadow-lg hover:bg-olive/90 transition-all font-medium text-xs md:text-sm flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span>Додати пісню</span>
          </button>
        </div>
      </div>

      {/* Song List */}
      <main className={`flex-grow ${selectedSong || isAdding ? 'no-print' : ''}`}>
        <div className="grid grid-cols-1 gap-3">
          {filteredSongs.map((song, index) => (
            <SongCard
              key={song.id}
              song={song}
              displayNumber={song.displayNumber}
              index={index}
              onClick={() => {
                setSelectedSong(song);
                addToRecent(song);
              }}
            />
          ))}

          {filteredSongs.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-olive/40"
            >
              <Music className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Пісень не знайдено</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer & Secondary Controls */}
      <footer className="mt-12 md:mt-20 pt-8 md:pt-12 border-t border-olive/10 dark:border-white/10 flex flex-col items-center gap-6 md:gap-8 no-print">
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          <button
            onClick={downloadDocx}
            disabled={isGenerating}
            className="flex items-center gap-1.5 md:gap-2 bg-white dark:bg-[#252725] px-4 py-2.5 md:px-6 md:py-3 rounded-full shadow-sm hover:shadow-md text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3] transition-all text-xs md:text-sm font-medium disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {isGenerating ? 'Генерується...' : 'Завантажити Word (.docx)'}
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 md:gap-2 bg-white dark:bg-[#252725] px-4 py-2.5 md:px-6 md:py-3 rounded-full shadow-sm hover:shadow-md text-olive/40 dark:text-[#9eb3a3]/40 hover:text-red-500 transition-all text-xs md:text-sm font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Скинути до стандартного
          </button>
        </div>

        <div className="text-center text-olive/40 dark:text-[#9eb3a3]/40 text-xs md:text-sm">
          <p>© {new Date().getFullYear()} Християнський Пісенник</p>
          <p className="mt-1 italic serif">Співайте Господеві пісню нову</p>
        </div>
      </footer>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-[#1c1d1c]/90 backdrop-blur-sm p-4 no-print"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#252725] p-5 md:p-6 rounded-xl md:rounded-2xl shadow-xl border border-olive/10 dark:border-white/10 max-w-sm w-full text-center"
            >
              <h3 className="text-lg md:text-xl font-semibold text-olive dark:text-[#e2e4e2] mb-3 md:mb-4">Скинути до стандартного?</h3>
              <p className="text-xs md:text-sm text-olive/60 dark:text-[#9eb3a3]/60 mb-5 md:mb-6">
                Усі ваші зміни та нові пісні будуть видалені. Цю дію неможливо скасувати.
              </p>
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-olive/5 dark:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 font-medium hover:bg-olive/10 dark:hover:bg-white/10 transition-all text-sm md:text-base"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all shadow-sm text-sm md:text-base"
                >
                  Скинути
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {selectedSong && (
          <SongModal
            song={selectedSong}
            onClose={() => setSelectedSong(null)}
            onSave={handleSaveSong}
            onDelete={handleDeleteSong}
          />
        )}
        {isAdding && (
          <SongModal
            song={null}
            isNew={true}
            onClose={() => setIsAdding(false)}
            onSave={handleSaveSong}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
