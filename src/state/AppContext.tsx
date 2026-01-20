import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
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
  duplicateSetlistItems: (fromSetlistId: string, toSetlistId: string) => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
      
      const savedSong = await n8nClient.saveSong(newSong, 'create');
      console.log('Song saved, returned song:', savedSong);
      
      // Small delay to ensure database has fully processed (even though saveSong already waited)
      // This is especially important for async workflows
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refetch all songs from n8n to get the latest data
      // This ensures we have the most up-to-date list with correct IDs from the database
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
      
      // CRITICAL: Refetch setlists to get the actual database row ID that n8n assigned
      // n8n might return a UUID, but we need the numeric database row ID for SetlistItems foreign key
      try {
        console.log('Refetching setlists after add to get actual database row ID...');
        // Wait a bit for async workflows to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        const refreshedSetlists = await n8nClient.fetchSetlists();
        
        // Find the newly created setlist by name (since ID might have changed)
        const createdSetlist = refreshedSetlists.find((s) => s.name === newSetlist.name);
        if (createdSetlist) {
          console.log(`Found created setlist with database ID: ${createdSetlist.id} (original ID was: ${newId})`);
        } else {
          console.warn(`Could not find created setlist "${newSetlist.name}" after refetch`);
        }
        
        setSetlists(refreshedSetlists);
      } catch (refetchErr) {
        console.warn('Failed to refetch setlists after add (adding to local state):', refetchErr);
        // Add the newly created setlist to local state even if refetch fails
        // But warn that we might have the wrong ID
        console.warn('Using generated ID, but n8n might have assigned a different ID. Items may not link correctly.');
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
      // Note: Empty string means "clear this field", undefined means "keep existing value"
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
      
      console.log('updateSetlist - updates received:', JSON.stringify(updates, null, 2));
      console.log('updateSetlist - setlistToSave being sent:', JSON.stringify(setlistToSave, null, 2));
      
      await n8nClient.saveSetlist(setlistToSave, 'update', false);
      
      // Wait longer for async workflows to complete and database to update
      // This ensures the database is fully updated before we refetch
      // For async workflows, we may need multiple retries
      console.log('Waiting for n8n to complete update...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Refetch all setlists to get the latest data with correct setlistId and items
      // Retry up to 3 times to ensure we get the updated data
      let refreshedSetlists = await n8nClient.fetchSetlists();
      let updatedSetlist = refreshedSetlists.find((s) => s.id === id || s.name === existingSetlist.name);
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!updatedSetlist && retryCount < maxRetries) {
        retryCount++;
        console.log(`Setlist not found immediately, retrying fetch (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        refreshedSetlists = await n8nClient.fetchSetlists();
        updatedSetlist = refreshedSetlists.find((s) => s.id === id || s.name === existingSetlist.name);
      }
      
      if (!updatedSetlist) {
        console.warn(`Setlist ${id} not found after ${maxRetries} retries. Using refreshed setlists anyway.`);
      }
      
      // Use the refreshed setlists directly - they contain the latest items from n8n with correct order
      // Items are already sorted by position in fetchSetlists, but ensure they're sorted here too
      const setlistsWithSortedItems = refreshedSetlists.map(setlist => {
        const sortedItems = [...setlist.items].sort((a, b) => a.position - b.position);
        return {
          ...setlist,
          items: sortedItems
        };
      });
      
      // Log the updated setlist items for debugging
      const updatedSetlistAfterSort = setlistsWithSortedItems.find((s) => s.id === id || s.name === existingSetlist.name);
      if (updatedSetlistAfterSort) {
        console.log('Updated setlist items after refresh (sorted by position):', updatedSetlistAfterSort.items.map((item, idx) => ({
          index: idx,
          position: item.position,
          songId: item.songId,
          id: item.id
        })));
        console.log('Item count:', updatedSetlistAfterSort.items.length);
      } else {
        console.warn('Could not find updated setlist after sorting');
      }
      
      setSetlists(setlistsWithSortedItems);
      console.log('Setlists refreshed with fresh items from n8n, sorted by position');
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
      
      // Refetch setlists first to ensure we have the latest data with correct setlistId
      // This is important because setlist.id might be the database row ID (5) 
      // but we need the actual setlistId (2) that SetlistItems table links to
      console.log('Refetching setlists before adding item to get correct setlistId...');
      const currentSetlists = await n8nClient.fetchSetlists();
      
      // Try to find the setlist by the provided ID, or by name if ID doesn't match
      let setlist = currentSetlists.find((s) => s.id === setlistId);
      if (!setlist) {
        // If not found by ID, try finding by name from the original setlist
        const originalSetlist = setlists.find((s) => s.id === setlistId);
        if (originalSetlist) {
          setlist = currentSetlists.find((s) => s.name === originalSetlist.name);
        }
      }
      if (!setlist) throw new Error('Setlist not found after refetch');
      
      // Use the setlistId from the refetched setlist (which should be the correct setlistId, not database row ID)
      const correctSetlistId = setlist.id;
      console.log(`Using setlistId: ${correctSetlistId} for setlist: ${setlist.name} when adding item`);
      
      // Find the max item ID across all items
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
      
      // Send only the new item to n8n with mode "add_item", using the correct setlistId
      await n8nClient.addItemToSetlist(correctSetlistId, newItem);
      
      // Update local state with the new item immediately
      const updatedItems = [...setlist.items, newItem].sort((a, b) => a.position - b.position);
      setSetlists((prev) => prev.map((s) => 
        (s.id === correctSetlistId || s.id === setlistId) 
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
      
      // Refetch setlists first to ensure we have the latest data with correct setlistId
      // This is important because setlist.id might have been the database row ID (5) 
      // but we need the actual setlistId (2) that SetlistItems table links to
      console.log('Refetching setlists before sync to get correct setlistId...');
      const currentSetlists = await n8nClient.fetchSetlists();
      
      // Try to find the setlist by the provided ID, or by name if ID doesn't match
      let setlist = currentSetlists.find((s) => s.id === setlistId);
      if (!setlist) {
        // If not found by ID, try finding by name from the original setlist
        const originalSetlist = setlists.find((s) => s.id === setlistId);
        if (originalSetlist) {
          setlist = currentSetlists.find((s) => s.name === originalSetlist.name);
        }
      }
      if (!setlist) throw new Error('Setlist not found after refetch');
      
      // Use the setlistId from the refetched setlist (which should be the correct setlistId, not database row ID)
      const correctSetlistId = setlist.id;
      console.log(`Using setlistId: ${correctSetlistId} for setlist: ${setlist.name}`);
      
      // CRITICAL: Ensure items are sorted by position before sending
      // The array order must match the position order for n8n to process correctly
      const sortedItems = [...items].sort((a, b) => a.position - b.position);
      console.log('Items being sent to reorderSetlistItems (sorted by position):', sortedItems.map((item, idx) => ({
        index: idx,
        position: item.position,
        id: item.id,
        songId: item.songId
      })));
      
      // Send all items to n8n to replace the entire setlist
      // IMPORTANT: Send sorted items to ensure correct order
      await n8nClient.syncSetlistItems(correctSetlistId, sortedItems);
      
      // Wait longer for async workflows to complete (if it's an async workflow)
      // This ensures the database is updated before we refetch
      console.log('Waiting for n8n to complete item sync...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Refetch setlists to ensure UI is in sync with n8n
      // Retry up to 3 times to ensure we get the updated data
      console.log('Refetching setlists after syncing items...');
      let refreshedSetlists = await n8nClient.fetchSetlists();
      let updatedSetlist = refreshedSetlists.find((s) => s.id === correctSetlistId);
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!updatedSetlist && retryCount < maxRetries) {
        retryCount++;
        console.log(`Setlist not found immediately after sync, retrying fetch (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        refreshedSetlists = await n8nClient.fetchSetlists();
        updatedSetlist = refreshedSetlists.find((s) => s.id === correctSetlistId);
      }
      
      if (!updatedSetlist) {
        console.warn(`Setlist ${correctSetlistId} not found after ${maxRetries} retries. This might indicate a problem.`);
      }
      
      // Sort items by position to ensure correct order
      const setlistsWithSortedItems = refreshedSetlists.map(setlist => {
        const sortedItems = [...setlist.items].sort((a, b) => a.position - b.position);
        return {
          ...setlist,
          items: sortedItems
        };
      });
      
      // Log the updated setlist items for debugging
      const updatedSetlistAfterSort = setlistsWithSortedItems.find((s) => s.id === correctSetlistId);
      if (updatedSetlistAfterSort) {
        console.log('Updated setlist items after reorder (sorted by position):', updatedSetlistAfterSort.items.map((item, idx) => ({
          index: idx,
          position: item.position,
          songId: item.songId,
          id: item.id
        })));
        console.log('Item count:', updatedSetlistAfterSort.items.length);
      } else {
        console.warn('Could not find updated setlist after reorder');
      }
      
      setSetlists(setlistsWithSortedItems);
      console.log('Setlists refreshed with fresh items from n8n, sorted by position');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync setlist items';
      setError(errorMessage);
      console.error('Error in reorderSetlistItems:', err);
      throw err;
    }
  };

  const duplicateSetlistItems = async (fromSetlistId: string, toSetlistId: string) => {
    try {
      setError(null);
      
      const fromSetlist = setlists.find((s) => s.id === fromSetlistId);
      const toSetlist = setlists.find((s) => s.id === toSetlistId);
      
      if (!fromSetlist) throw new Error('Source setlist not found');
      if (!toSetlist) throw new Error('Destination setlist not found');
      if (fromSetlist.items.length === 0) throw new Error('Source setlist has no items to duplicate');
      
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
      
      // Get existing items from "To" setlist
      const existingItems = toSetlist.items;
      const maxPosition = existingItems.length > 0
        ? Math.max(...existingItems.map((item) => item.position))
        : -1;
      
      // Create new items from "From" setlist with new IDs and updated setlistId
      const newItems: SetlistItem[] = fromSetlist.items.map((item, index) => {
        const newItemId = String(maxItemId + 1 + index);
        return {
          id: newItemId,
          songId: item.songId,
          position: maxPosition + 1 + index,
          keyOverride: item.keyOverride,
          singerOverride: item.singerOverride,
          notes: item.notes,
        };
      });
      
      // Combine existing items with new items
      const allItems = [...existingItems, ...newItems];
      
      // Send all items to n8n with mode "sync_items"
      await n8nClient.syncSetlistItems(toSetlistId, allItems);
      
      // Refetch setlists to ensure UI is in sync with n8n
      console.log('Refetching setlists after duplicating items...');
      const refreshedSetlists = await n8nClient.fetchSetlists();
      setSetlists(refreshedSetlists);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate setlist items';
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
        duplicateSetlistItems,
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

