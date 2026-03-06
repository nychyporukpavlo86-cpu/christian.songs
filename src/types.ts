export interface Song {
  id: string; // Unique UUID or stable ID
  title: string;
  number?: number;
  displayNumber?: number;
  lyrics: string;
  notes?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  sourceImages?: string[]; // base64 or URLs
  categories?: string[]; // categories like "Хорові", "Загальний спів"
  isSeedSong?: boolean; // flag for initial songs
}

export interface SongbookState {
  songs: Song[];
  lastUpdated: number;
}
