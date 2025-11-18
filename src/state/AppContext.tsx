import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song, Setlist, SetlistItem } from '../types';

interface AppContextType {
  songs: Song[];
  setlists: Setlist[];
  addSong: (song: Omit<Song, 'id'>) => void;
  updateSong: (id: string, song: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  addSetlist: (setlist: Omit<Setlist, 'id' | 'items'>) => void;
  updateSetlist: (id: string, setlist: Partial<Setlist>) => void;
  deleteSetlist: (id: string) => void;
  addItemToSetlist: (setlistId: string, songId: string) => void;
  removeItemFromSetlist: (setlistId: string, itemId: string) => void;
  updateSetlistItem: (setlistId: string, itemId: string, updates: Partial<SetlistItem>) => void;
  reorderSetlistItems: (setlistId: string, items: SetlistItem[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_SONGS = 'setlist-app-songs';
const STORAGE_KEY_SETLISTS = 'setlist-app-setlists';

function generateId(): string {
  return crypto.randomUUID();
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const loadedSongs = loadFromStorage<Song[]>(STORAGE_KEY_SONGS, []);
    const loadedSetlists = loadFromStorage<Setlist[]>(STORAGE_KEY_SETLISTS, []);
    
    // If no data exists, initialize with seed data
    if (loadedSongs.length === 0 && loadedSetlists.length === 0) {
      const seedSongs = getSeedSongs();
      const seedSetlists = getSeedSetlists(seedSongs);
      setSongs(seedSongs);
      setSetlists(seedSetlists);
      saveToStorage(STORAGE_KEY_SONGS, seedSongs);
      saveToStorage(STORAGE_KEY_SETLISTS, seedSetlists);
    } else {
      setSongs(loadedSongs);
      setSetlists(loadedSetlists);
    }
  }, []);

  // Save to localStorage whenever songs or setlists change
  useEffect(() => {
    if (songs.length > 0 || localStorage.getItem(STORAGE_KEY_SONGS)) {
      saveToStorage(STORAGE_KEY_SONGS, songs);
    }
  }, [songs]);

  useEffect(() => {
    if (setlists.length > 0 || localStorage.getItem(STORAGE_KEY_SETLISTS)) {
      saveToStorage(STORAGE_KEY_SETLISTS, setlists);
    }
  }, [setlists]);

  const addSong = (songData: Omit<Song, 'id'>) => {
    const newSong: Song = { ...songData, id: generateId() };
    setSongs((prev) => [...prev, newSong]);
  };

  const updateSong = (id: string, updates: Partial<Song>) => {
    setSongs((prev) => prev.map((song) => (song.id === id ? { ...song, ...updates } : song)));
  };

  const deleteSong = (id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
    // Also remove from all setlists
    setSetlists((prev) =>
      prev.map((setlist) => ({
        ...setlist,
        items: setlist.items.filter((item) => item.songId !== id),
      }))
    );
  };

  const addSetlist = (setlistData: Omit<Setlist, 'id' | 'items'>) => {
    const newSetlist: Setlist = { ...setlistData, id: generateId(), items: [] };
    setSetlists((prev) => [...prev, newSetlist]);
  };

  const updateSetlist = (id: string, updates: Partial<Setlist>) => {
    setSetlists((prev) => prev.map((setlist) => (setlist.id === id ? { ...setlist, ...updates } : setlist)));
  };

  const deleteSetlist = (id: string) => {
    setSetlists((prev) => prev.filter((setlist) => setlist.id !== id));
  };

  const addItemToSetlist = (setlistId: string, songId: string) => {
    setSetlists((prev) =>
      prev.map((setlist) => {
        if (setlist.id !== setlistId) return setlist;
        const maxPosition = setlist.items.length > 0 
          ? Math.max(...setlist.items.map((item) => item.position))
          : -1;
        const newItem: SetlistItem = {
          id: generateId(),
          songId,
          position: maxPosition + 1,
        };
        return {
          ...setlist,
          items: [...setlist.items, newItem].sort((a, b) => a.position - b.position),
        };
      })
    );
  };

  const removeItemFromSetlist = (setlistId: string, itemId: string) => {
    setSetlists((prev) =>
      prev.map((setlist) => {
        if (setlist.id !== setlistId) return setlist;
        const filtered = setlist.items.filter((item) => item.id !== itemId);
        // Reorder positions
        return {
          ...setlist,
          items: filtered.map((item, index) => ({ ...item, position: index })),
        };
      })
    );
  };

  const updateSetlistItem = (setlistId: string, itemId: string, updates: Partial<SetlistItem>) => {
    setSetlists((prev) =>
      prev.map((setlist) => {
        if (setlist.id !== setlistId) return setlist;
        return {
          ...setlist,
          items: setlist.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        };
      })
    );
  };

  const reorderSetlistItems = (setlistId: string, items: SetlistItem[]) => {
    setSetlists((prev) =>
      prev.map((setlist) => {
        if (setlist.id !== setlistId) return setlist;
        return {
          ...setlist,
          items: items.map((item, index) => ({ ...item, position: index })),
        };
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        songs,
        setlists,
        addSong,
        updateSong,
        deleteSong,
        addSetlist,
        updateSetlist,
        deleteSetlist,
        addItemToSetlist,
        removeItemFromSetlist,
        updateSetlistItem,
        reorderSetlistItems,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Seed data functions
function getSeedSongs(): Song[] {
  return [
    {
      id: '1',
      title: 'Sweet Child O\' Mine',
      artist: 'Guns N\' Roses',
      singer: 'John',
      key: 'D',
      notes: 'Great opener',
    },
    {
      id: '2',
      title: 'Wonderwall',
      artist: 'Oasis',
      singer: 'Sarah',
      key: 'Em',
      notes: 'Crowd favorite',
    },
    {
      id: '3',
      title: 'Hotel California',
      artist: 'Eagles',
      singer: 'Mike',
      key: 'Bm',
    },
    {
      id: '4',
      title: 'Brown Eyed Girl',
      artist: 'Van Morrison',
      singer: 'John',
      key: 'G',
    },
    {
      id: '5',
      title: 'Don\'t Stop Believin\'',
      artist: 'Journey',
      singer: 'Sarah',
      key: 'E',
    },
  ];
}

function getSeedSetlists(songs: Song[]): Setlist[] {
  return [
    {
      id: 'setlist-1',
      name: 'Friday night – bar gig',
      venue: 'The Blue Note',
      city: 'New York',
      date: '2024-12-20',
      notes: 'First set starts at 9pm',
      items: [
        {
          id: 'item-1',
          songId: songs[0].id,
          position: 0,
        },
        {
          id: 'item-2',
          songId: songs[1].id,
          position: 1,
        },
        {
          id: 'item-3',
          songId: songs[2].id,
          position: 2,
        },
      ],
    },
  ];
}

