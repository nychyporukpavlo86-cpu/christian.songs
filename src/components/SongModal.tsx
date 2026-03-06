import React, { useState, useRef, ChangeEvent } from 'react';
import { Song } from '../types';
import { X, Edit2, Save, Camera, FileText, Loader2, Trash2, Printer, Copy, Check, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromImage } from '../services/ocrService';
import { CATEGORIES } from '../constants';

interface SongModalProps {
  song: Song | null;
  onClose: () => void;
  onSave: (song: Song) => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
}

export function SongModal({ song, onClose, onSave, onDelete, isNew }: SongModalProps) {
  const [isEditing, setIsEditing] = useState(isNew || false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [title, setTitle] = useState(song?.title || '');
  const [lyrics, setLyrics] = useState(song?.lyrics || '');
  const [notes, setNotes] = useState(song?.notes || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(song?.categories || []);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!song && !isNew) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    
    const updatedSong: Song = {
      ...(song || { id: crypto.randomUUID(), createdAt: Date.now() }),
      title: title.trim(),
      lyrics: lyrics.trim(),
      notes: notes.trim(),
      categories: selectedCategories,
      updatedAt: Date.now(),
    };
    
    onSave(updatedSong);
    setIsEditing(false);
    if (isNew) onClose();
  };

  const handleCopy = () => {
    const text = `${title}\n\n${lyrics}${notes ? '\n\nПримітки: ' + notes : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Print logic: triggers browser print dialog with print-specific CSS
  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("print button clicked");
    console.log("selected song for print:", song);
    console.log("triggering browser print");

    if (!song && !title && !lyrics) {
      console.log("No song selected for printing");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print songs.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Print</title>
          <style>
            body {
              font-family: serif;
              padding: 20px;
              color: black;
              background: white;
            }
            h1 {
              font-size: 24pt;
              margin-bottom: 20pt;
              text-align: center;
            }
            .lyrics {
              font-size: 14pt;
              line-height: 1.6;
              white-space: pre-wrap;
              text-align: center;
            }
            .notes {
              margin-top: 30pt;
              font-size: 11pt;
              font-style: italic;
              border-top: 1px solid #ccc;
              padding-top: 10pt;
            }
            @media print {
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <h1>${song?.displayNumber ? (song.displayNumber + '. ') : ''}${title}</h1>
          <div class="lyrics">${lyrics}</div>
          ${notes ? ('<div class="notes">Примітки: ' + notes + '</div>') : ''}
          <script>
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 250);
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // OCR Fix: Added timeout and robust promise handling to prevent infinite loading
    // and ensure the UI state is reset even if the recognition fails or hangs.
    setIsOcrLoading(true);
    
    // Create a timeout promise to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 45000); // 45 seconds timeout
    });

    try {
      // Convert file to base64 using a Promise-based approach
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
        reader.readAsDataURL(file);
      });

      // OCR Fix: Wrap the extraction in a race with the timeout
      const extractedText = await Promise.race([
        extractTextFromImage(base64),
        timeoutPromise
      ]);

      if (extractedText) {
        setLyrics(prev => prev ? prev + '\n\n' + extractedText : extractedText);
      } else {
        throw new Error('EMPTY_RESULT');
      }
    } catch (error: any) {
      console.error("OCR Process Error:", error);
      
      let errorMessage = 'Не вдалося розпізнати текст. Спробуйте інше фото або вставте текст вручну.';
      
      if (error.message === 'TIMEOUT') {
        errorMessage = 'Час очікування розпізнавання вичерпано. Спробуйте ще раз або виберіть менше фото.';
      } else if (error.message) {
        // Use the error message from the service if it's available
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      // Always reset loading state and clear the input
      setIsOcrLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-olive/20 dark:bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-[#252725] w-full max-w-3xl rounded-2xl md:rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 md:p-8 flex items-center justify-between transition-all ${isReadingMode ? 'bg-transparent' : 'border-b border-olive/5 dark:border-white/5 bg-warm-bg/50 dark:bg-black/10'}`}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-olive/10 dark:bg-[#9eb3a3]/10 flex items-center justify-center text-olive dark:text-[#9eb3a3] font-bold text-base md:text-lg flex-shrink-0">
              {song?.displayNumber || '#'}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Назва пісні"
                className="serif text-xl md:text-3xl text-olive/90 dark:text-[#e2e4e2] bg-transparent border-b border-olive/20 dark:border-[#9eb3a3]/20 outline-none focus:border-olive dark:focus:border-[#9eb3a3] transition-colors font-semibold w-full"
              />
            ) : (
              <h2 className="serif text-xl md:text-3xl text-olive/90 dark:text-[#e2e4e2] font-semibold leading-tight line-clamp-2">
                {song?.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {!isEditing && (
              <button
                onClick={() => setIsReadingMode(!isReadingMode)}
                className={`p-1.5 md:p-2 rounded-full transition-all ${isReadingMode ? 'bg-olive/20 dark:bg-white/20 text-olive dark:text-[#9eb3a3]' : 'hover:bg-olive/10 dark:hover:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3]'}`}
                title={isReadingMode ? "Вимкнути режим читання" : "Режим читання"}
              >
                <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            {!isEditing && !isReadingMode && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-1.5 md:p-2 rounded-full hover:bg-olive/10 dark:hover:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3] transition-all relative"
                  title="Копіювати текст"
                >
                  {isCopied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                  <AnimatePresence>
                    {isCopied && (
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-olive dark:bg-[#9eb3a3] text-white px-2 py-1 rounded whitespace-nowrap"
                      >
                        Скопійовано
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <button
                  onClick={handlePrint}
                  className="p-1.5 md:p-2 rounded-full hover:bg-olive/10 dark:hover:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3] transition-all"
                  title="Друк"
                >
                  <Printer className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 md:p-2 rounded-full hover:bg-olive/10 dark:hover:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3] transition-all"
                  title="Редагувати"
                >
                  <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </>
            )}
            {onDelete && !isNew && !isReadingMode && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 md:p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 text-red-300 hover:text-red-500 transition-all"
                title="Видалити"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 rounded-full hover:bg-olive/10 dark:hover:bg-white/5 text-olive/40 dark:text-[#9eb3a3]/40 hover:text-olive dark:hover:text-[#9eb3a3] transition-all"
            >
              <X className="w-5 h-5 md:w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div>
            {isEditing ? (
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-[10px] md:text-xs uppercase tracking-widest text-olive/40 dark:text-[#9eb3a3]/40 font-bold mb-2 md:mb-3 ml-1">
                    Категорії
                  </label>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {CATEGORIES.filter(c => c !== "Усі пісні").map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all ${
                          selectedCategories.includes(cat)
                            ? 'bg-olive text-white'
                            : 'bg-olive/5 dark:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 hover:bg-olive/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <label className="text-[10px] md:text-xs uppercase tracking-widest text-olive/40 dark:text-[#9eb3a3]/40 font-bold ml-1">
                      Текст пісні
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isOcrLoading}
                        className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs bg-olive/5 dark:bg-white/5 hover:bg-olive/10 dark:hover:bg-white/10 text-olive dark:text-[#9eb3a3] px-2.5 py-1 md:px-3 md:py-1.5 rounded-full transition-all disabled:opacity-50"
                      >
                        {isOcrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        {isOcrLoading ? 'Розпізнавання...' : 'З фото'}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Введіть текст пісні тут..."
                    className="w-full min-h-[200px] md:min-h-[300px] bg-warm-bg/30 dark:bg-black/20 border border-olive/10 dark:border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 outline-none focus:border-olive/30 dark:focus:border-[#9eb3a3]/30 transition-all serif text-base md:text-xl leading-relaxed text-olive/80 dark:text-[#e2e4e2]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs uppercase tracking-widest text-olive/40 dark:text-[#9eb3a3]/40 font-bold mb-1.5 md:mb-2 ml-1">
                    Примітки (необов'язково)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Додайте коментарі або нотатки..."
                    className="w-full bg-warm-bg/30 dark:bg-black/20 border border-olive/10 dark:border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 outline-none focus:border-olive/30 dark:focus:border-[#9eb3a3]/30 transition-all text-xs md:text-sm text-olive/60 dark:text-[#e2e4e2]/60"
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                {lyrics ? (
                  <div className={`serif leading-relaxed text-olive/80 dark:text-[#e2e4e2] whitespace-pre-wrap text-center transition-all ${isReadingMode ? 'text-xl md:text-3xl' : 'text-lg md:text-2xl'}`}>
                    {lyrics}
                  </div>
                ) : (
                  <div className="text-center py-12 md:py-20 text-olive/30 dark:text-[#9eb3a3]/30 italic">
                    <FileText className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-20" />
                    <p className="text-sm md:text-base">Текст пісні ще не додано</p>
                    {!isReadingMode && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="mt-3 md:mt-4 text-olive/60 dark:text-[#9eb3a3]/60 hover:text-olive dark:hover:text-[#9eb3a3] underline text-xs md:text-sm transition-all"
                      >
                        Додати текст зараз
                      </button>
                    )}
                  </div>
                )}
                {notes && !isReadingMode && (
                  <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-olive/5 dark:border-white/5 text-xs md:text-sm text-olive/40 dark:text-[#9eb3a3]/40 italic text-center">
                    {notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="p-4 md:p-6 border-t border-olive/5 dark:border-white/5 bg-warm-bg/30 dark:bg-black/10 flex gap-2 md:gap-3">
            <button
              onClick={() => isNew ? onClose() : setIsEditing(false)}
              className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl text-olive/60 dark:text-[#9eb3a3]/60 font-medium hover:bg-olive/5 dark:hover:bg-white/5 transition-all text-sm md:text-base"
            >
              Скасувати
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 bg-olive text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-medium shadow-md hover:shadow-lg hover:bg-olive/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
            >
              <Save className="w-4 h-4 md:w-5 md:h-5" />
              Зберегти
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#252725] p-5 md:p-6 rounded-xl md:rounded-2xl shadow-xl border border-olive/10 dark:border-white/10 max-w-sm w-full mx-4 text-center"
              >
                <h3 className="text-lg md:text-xl font-semibold text-olive dark:text-[#e2e4e2] mb-4 md:mb-6">Видалити пісню?</h3>
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-olive/5 dark:bg-white/5 text-olive/60 dark:text-[#9eb3a3]/60 font-medium hover:bg-olive/10 dark:hover:bg-white/10 transition-all text-sm md:text-base"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={() => {
                      if (onDelete && song) {
                        onDelete(song.id);
                        onClose();
                      }
                    }}
                    className="flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-olive text-white font-medium hover:bg-olive/90 dark:bg-[#9eb3a3] dark:text-[#1c1d1c] dark:hover:bg-[#9eb3a3]/90 transition-all shadow-sm text-sm md:text-base"
                  >
                    Видалити
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
