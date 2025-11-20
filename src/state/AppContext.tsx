import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Song, Setlist, SetlistItem } from '../types';
import * as n8nClient from '../api/n8nClient';

interface AppContextType {
  songs: Song[];
  setlists: Setlist[];
  isLoading: boolean;
  error: string | null;
  addSong: (song: Omit<Song, 'id'>) => Promise<void>;
  updateSong: (id: string, song: Partial<Song>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  addSetlist: (setlist: Omit<Setlist, 'id' | 'items'>) => Promise<void>;
  updateSetlist: (id: string, setlist: Partial<Setlist>) => Promise<void>;
  deleteSetlist: (id: string) => Promise<void>;
  addItemToSetlist: (setlistId: string, songId: string) => Promise<void>;
  removeItemFromSetlist: (setlistId: string, itemId: string) => Promise<void>;
  updateSetlistItem: (setlistId: string, itemId: string, updates: Partial<SetlistItem>) => Promise<void>;
  reorderSetlistItems: (setlistId: string, items: SetlistItem[]) => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function generateId(): string {
  return crypto.randomUUID();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Always try to load songs
        const loadedSongs = await n8nClient.fetchSongs();
        setSongs(loadedSongs);
        
        // Try to load setlists
        try {
          const loadedSetlists = await n8nClient.fetchSetlists();
          setSetlists(loadedSetlists);
        } catch (err) {
          console.warn('Failed to load setlists (workflow may not be set up yet):', err);
          // Don't set error for setlists, just use empty array
          setSetlists([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addSong = async (songData: Omit<Song, 'id'>) => {
    try {
      setError(null);
      
      // Generate new ID by finding the largest ID and adding 1
      // First, ensure we have the latest songs list
      const currentSongs = songs.length > 0 ? songs : await n8nClient.fetchSongs();
      
      // Find the maximum numeric ID
      let maxId = 0;
      currentSongs.forEach((song) => {
        const songId = parseInt(song.id, 10);
        if (!isNaN(songId) && songId > maxId) {
          maxId = songId;
        }
      });
      
      // Generate new ID (maxId + 1)
      const newId = String(maxId + 1);
      console.log(`Generated new song ID: ${newId} (max existing ID was ${maxId})`);
      
      // Create complete song object with all fields including the generated ID
      const newSong: Song = {
        id: newId,
        title: songData.title || '',
        artist: songData.artist,
        singer: songData.singer,
        key: songData.key,
        tempoBmp: songData.tempoBmp,
        notes: songData.notes,
      };
      
      await n8nClient.saveSong(newSong, 'create');
      
      // Refetch all songs from n8n to get the latest data
      console.log('Refetching songs after add...');
      const refreshedSongs = await n8nClient.fetchSongs();
      setSongs(refreshedSongs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add song';
      setError(errorMessage);
      throw err;
    }
  };

  const updateSong = async (id: string, updates: Partial<Song>) => {
    try {
      setError(null);
      const existingSong = songs.find((s) => s.id === id);
      if (!existingSong) throw new Error('Song not found');
      
      // Merge existing song with updates, ensuring all fields are preserved
      // Only use update values if they're explicitly provided (not undefined)
      const songToSave: Song = {
        id,
        title: updates.title !== undefined ? updates.title : existingSong.title,
        artist: updates.artist !== undefined ? updates.artist : existingSong.artist,
        singer: updates.singer !== undefined ? updates.singer : existingSong.singer,
        key: updates.key !== undefined ? updates.key : existingSong.key,
        tempoBmp: updates.tempoBmp !== undefined ? updates.tempoBmp : existingSong.tempoBmp,
        notes: updates.notes !== undefined ? updates.notes : existingSong.notes,
      };
      
      await n8nClient.saveSong(songToSave);
      
      // Refetch all songs from n8n to get the latest data
      console.log('Refetching songs after update...');
      const refreshedSongs = await n8nClient.fetchSongs();
      setSongs(refreshedSongs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update song';
      console.error('Error updating song:', err);
      setError(errorMessage);
      throw err;
    }
  };

  const deleteSong = async (id: string) => {
    try {
      setError(null);
      await n8nClient.deleteSong(id);
      
      // Refetch all songs from n8n to get the latest data
      console.log('Refetching songs after delete...');
      const refreshedSongs = await n8nClient.fetchSongs();
      setSongs(refreshedSongs);
      
      // Also remove from all setlists
      setSetlists((prev) =>
        prev.map((setlist) => ({
          ...setlist,
          items: setlist.items.filter((item) => item.songId !== id),
        }))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete song';
      setError(errorMessage);
      throw err;
    }
  };

  const addSetlist = async (setlistData: Omit<Setlist, 'id' | 'items'>) => {
    try {
      setError(null);
      // Fetch current setlists to find max ID
      let currentSetlists = setlists;
      if (currentSetlists.length === 0) {
        try {
          currentSetlists = await n8nClient.fetchSetlists();
        } catch (fetchErr) {
          console.warn('Failed to fetch setlists for ID generation, using empty array:', fetchErr);
          currentSetlists = [];
        }
      }
      let maxId = 0;
      currentSetlists.forEach((setlist) => {
        const setlistId = parseInt(setlist.id, 10);
        if (!isNaN(setlistId) && setlistId > maxId) {
          maxId = setlistId;
        }
      });
      const newId = String(maxId + 1);
      
      // Build the new setlist with generated ID
      const newSetlist: Setlist = {
        id: newId,
        name: setlistData.name || '',
        venue: setlistData.venue,
        city: setlistData.city,
        date: setlistData.date,
        notes: setlistData.notes,
        items: [],
      };
      
      // Send to n8n with explicit 'create' mode
      await n8nClient.saveSetlist(newSetlist, 'create', false);
      
      // Try to refetch all setlists, but if it fails, add the new setlist to local state
      try {
        console.log('Refetching setlists after add...');
        const refreshedSetlists = await n8nClient.fetchSetlists();
        setSetlists(refreshedSetlists);
      } catch (refetchErr) {
        console.warn('Failed to refetch setlists after add (adding to local state):', refetchErr);
        // Add the newly created setlist to local state even if refetch fails
        setSetlists((prev) => [...prev, newSetlist]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add setlist';
      setError(errorMessage);
      throw err;
    }
  };

  const updateSetlist = async (id: string, updates: Partial<Setlist>) => {
    try {
      setError(null);
      const existingSetlist = setlists.find((s) => s.id === id);
      if (!existingSetlist) throw new Error('Setlist not found');
      
      // Build setlist with only top-level fields (exclude items)
      const setlistToSave = {
        id,
        name: updates.name !== undefined ? updates.name : existingSetlist.name,
        venue: updates.venue !== undefined ? updates.venue : existingSetlist.venue,
        city: updates.city !== undefined ? updates.city : existingSetlist.city,
        date: updates.date !== undefined ? updates.date : existingSetlist.date,
        notes: updates.notes !== undefined ? updates.notes : existingSetlist.notes,
        // Preserve items from existing setlist (not sent to n8n for top-level updates)
        items: existingSetlist.items,
      };
      
      const updatedSetlist = await n8nClient.saveSetlist(setlistToSave, 'update', false);
      
      // Merge the response with existing items to preserve them
      const finalSetlist = {
        ...updatedSetlist,
        items: existingSetlist.items, // Keep existing items since we're only updating top-level
      };
      
      setSetlists((prev) => prev.map((setlist) => (setlist.id === id ? finalSetlist : setlist)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update setlist';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteSetlist = async (id: string) => {
    try {
      setError(null);
      await n8nClient.deleteSetlist(id);
      
      // Refetch all setlists from n8n to get the latest data
      console.log('Refetching setlists after delete...');
      const refreshedSetlists = await n8nClient.fetchSetlists();
      setSetlists(refreshedSetlists);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete setlist';
      setError(errorMessage);
      throw err;
    }
  };

  const addItemToSetlist = async (setlistId: string, songId: string) => {
    try {
      setError(null);
      const setlist = setlists.find((s) => s.id === setlistId);
      if (!setlist) throw new Error('Setlist not found');
      
      // Fetch all setlists to find the max item ID across all items
      const currentSetlists = await n8nClient.fetchSetlists();
      let maxItemId = 0;
      currentSetlists.forEach((sl) => {
        sl.items.forEach((item) => {
          const itemId = parseInt(item.id, 10);
          if (!isNaN(itemId) && itemId > maxItemId) {
            maxItemId = itemId;
          }
        });
      });
      const newItemId = String(maxItemId + 1);
      
      const maxPosition = setlist.items.length > 0 
        ? Math.max(...setlist.items.map((item) => item.position))
        : -1;
      const newItem: SetlistItem = {
        id: newItemId, // Use numeric ID instead of UUID
        songId,
        position: maxPosition + 1,
      };
      
      // Send only the new item to n8n with mode "add_item"
      await n8nClient.addItemToSetlist(setlistId, newItem);
      
      // Update local state with the new item immediately
      const updatedItems = [...setlist.items, newItem].sort((a, b) => a.position - b.position);
      setSetlists((prev) => prev.map((s) => 
        s.id === setlistId 
          ? { ...s, items: updatedItems }
          : s
      ));
      
      // Optionally refetch setlists to ensure UI is in sync with n8n
      // If refetch fails, we still have the local update, so don't throw
      try {
        console.log('Refetching setlists after adding item...');
        const refreshedSetlists = await n8nClient.fetchSetlists();
        setSetlists(refreshedSetlists);
      } catch (refetchErr) {
        console.warn('Failed to refetch setlists after adding item (local state is updated):', refetchErr);
        // Don't throw - the item was added successfully, just refetch failed
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add song to setlist';
      setError(errorMessage);
      throw err;
    }
  };

  const removeItemFromSetlist = async (setlistId: string, itemId: string) => {
    try {
      setError(null);
      const setlist = setlists.find((s) => s.id === setlistId);
      if (!setlist) throw new Error('Setlist not found');
      
      const filtered = setlist.items.filter((item) => item.id !== itemId);
      const updatedItems = filtered.map((item, index) => ({ ...item, position: index }));
      
      const updatedSetlist = await n8nClient.saveSetlist({
        ...setlist,
        items: updatedItems,
      });
      
      setSetlists((prev) => prev.map((s) => (s.id === setlistId ? updatedSetlist : s)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove song from setlist';
      setError(errorMessage);
      throw err;
    }
  };

  const updateSetlistItem = async (setlistId: string, itemId: string, updates: Partial<SetlistItem>) => {
    try {
      setError(null);
      const setlist = setlists.find((s) => s.id === setlistId);
      if (!setlist) throw new Error('Setlist not found');
      
      const updatedItems = setlist.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      
      const updatedSetlist = await n8nClient.saveSetlist({
        ...setlist,
        items: updatedItems,
      });
      
      setSetlists((prev) => prev.map((s) => (s.id === setlistId ? updatedSetlist : s)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update setlist item';
      setError(errorMessage);
      throw err;
    }
  };

  const reorderSetlistItems = async (setlistId: string, items: SetlistItem[]) => {
    try {
      setError(null);
      const setlist = setlists.find((s) => s.id === setlistId);
      if (!setlist) throw new Error('Setlist not found');
      
      // Send all items to n8n to replace the entire setlist
      await n8nClient.syncSetlistItems(setlistId, items);
      
      // Refetch setlists to ensure UI is in sync with n8n
      console.log('Refetching setlists after syncing items...');
      const refreshedSetlists = await n8nClient.fetchSetlists();
      setSetlists(refreshedSetlists);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync setlist items';
      setError(errorMessage);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AppContext.Provider
      value={{
        songs,
        setlists,
        isLoading,
        error,
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
        clearError,
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

