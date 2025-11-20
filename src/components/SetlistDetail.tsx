import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Setlist, Song, SetlistItem } from '../types';
import { useApp } from '../state/AppContext';
import { SetlistForm } from './SetlistForm';
import { SetlistPrintView } from './SetlistPrintView';

interface SetlistDetailProps {
  setlist: Setlist;
  onBack: () => void;
  onRegisterAddSong?: (callback: (songId: string) => void) => void;
  onRegisterIsSongInSetlist?: (callback: (songId: string) => boolean) => void;
}

export function SetlistDetail({ setlist, onBack, onRegisterAddSong, onRegisterIsSongInSetlist }: SetlistDetailProps) {
  const { songs, setlists, updateSetlist, deleteSetlist, reorderSetlistItems } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [localItems, setLocalItems] = useState<SetlistItem[]>(setlist.items);
  const [draggedItem, setDraggedItem] = useState<SetlistItem | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Use ref to store latest localItems without causing re-renders
  const localItemsRef = useRef(localItems);
  useEffect(() => {
    localItemsRef.current = localItems;
  }, [localItems]);

  // Memoize the check function to avoid recreating it on every render
  const checkIsSongInSetlist = useCallback((songId: string) => {
    // Check both saved items and localItems (unsaved changes)
    const inSavedItems = setlist.items.some((item) => item.songId === songId);
    const inLocalItems = localItemsRef.current.some((item) => item.songId === songId);
    return inSavedItems || inLocalItems;
  }, [setlist.items]);

  // Register the callbacks only once when component mounts or when setlist changes
  useEffect(() => {
    if (onRegisterAddSong) {
      onRegisterAddSong(handleAddSong);
    }
    if (onRegisterIsSongInSetlist) {
      onRegisterIsSongInSetlist(checkIsSongInSetlist);
    }
  }, [onRegisterAddSong, onRegisterIsSongInSetlist, checkIsSongInSetlist]);

  const getSongById = (songId: string): Song | undefined => {
    return songs.find((s) => s.id === songId);
  };

  const handleUpdate = async (updates: Omit<Setlist, 'id' | 'items'>) => {
    try {
      await updateSetlist(setlist.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update setlist:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete setlist "${setlist.name}"?`)) {
      try {
        await deleteSetlist(setlist.id);
        onBack();
      } catch (error) {
        console.error('Failed to delete setlist:', error);
      }
    }
  };

  const handleAddSong = useCallback((songId: string) => {
    // Find the max item ID across all setlists AND localItems (to handle multiple adds)
    let maxItemId = 0;
    
    // Check all setlists
    setlists.forEach((sl) => {
      sl.items.forEach((item) => {
        const itemId = parseInt(item.id, 10);
        if (!isNaN(itemId) && itemId > maxItemId) {
          maxItemId = itemId;
        }
      });
    });
    
    // Also check localItems (items already added but not saved yet) - use ref to get latest
    localItemsRef.current.forEach((item) => {
      const itemId = parseInt(item.id, 10);
      if (!isNaN(itemId) && itemId > maxItemId) {
        maxItemId = itemId;
      }
    });
    
    const newItemId = String(maxItemId + 1);
    
    // Add to local items immediately (no API call) - use ref to get latest
    const currentItems = localItemsRef.current;
    const maxPosition = currentItems.length > 0 
      ? Math.max(...currentItems.map((item) => item.position))
      : -1;
    
    const newItem: SetlistItem = {
      id: newItemId, // Generate numeric ID like we do for songs
      songId,
      position: maxPosition + 1,
    };
    
    const updatedItems = [...currentItems, newItem].sort((a, b) => a.position - b.position);
    setLocalItems(updatedItems);
    setHasUnsavedChanges(true);
    setSongSearchQuery('');
  }, [setlists]);

  const handleRemoveSong = (itemId: string) => {
    // Remove from local items immediately (no API call)
    const filtered = localItems.filter((item) => item.id !== itemId);
    // Recalculate positions
    const updatedItems = filtered.map((item, index) => ({ ...item, position: index }));
    setLocalItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  // Update local items when setlist changes (e.g., after adding/removing items)
  useEffect(() => {
    setLocalItems(setlist.items);
    setHasUnsavedChanges(false);
  }, [setlist.items]);

  const handleDragStart = (e: React.DragEvent, item: SetlistItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', item.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItem: SetlistItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const items = [...localItems];
    const draggedIndex = items.findIndex((i) => i.id === draggedItem.id);
    const targetIndex = items.findIndex((i) => i.id === targetItem.id);

    // Remove dragged item from its current position
    items.splice(draggedIndex, 1);
    // Insert at target position
    items.splice(targetIndex, 0, draggedItem);

    // Update positions
    const reorderedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));

    setLocalItems(reorderedItems);
    setHasUnsavedChanges(true);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSaveChanges = async () => {
    try {
      // Send all items to n8n to replace the entire setlist
      await reorderSetlistItems(setlist.id, localItems);
      setHasUnsavedChanges(false);
      // The context will refetch setlists, which will update our localItems via useEffect
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  const handleCancelReorder = () => {
    setLocalItems(setlist.items);
    setHasUnsavedChanges(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      let day: string, year: string;
      
      // Handle different date formats
      if (dateString.includes('/')) {
        // Parse MM/DD/YYYY format (from Google Sheets)
        const parts = dateString.split('/');
        const monthNum = parseInt(parts[0], 10);
        day = parts[1];
        year = parts[2];
        const date = new Date(parseInt(year), monthNum - 1, parseInt(day));
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } else if (dateString.includes('-')) {
        // Parse YYYY-MM-DD format (from n8n conversion)
        const parts = dateString.split('-');
        year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        day = parts[2];
        const date = new Date(parseInt(year), monthNum - 1, parseInt(day));
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        // Try default Date parsing
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return dateString;
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    } catch {
      return dateString;
    }
  };

  const availableSongs = useMemo(() => {
    return songs.filter(
      (song) => !localItems.some((item) => item.songId === song.id)
    );
  }, [songs, localItems]);

  // Filter available songs based on search
  const filteredAvailableSongs = useMemo(() => {
    const query = songSearchQuery.toLowerCase().trim();
    if (!query) return availableSongs;

    return availableSongs.filter((song) => {
      const matchesTitle = song.title.toLowerCase().includes(query);
      const matchesArtist = song.artist?.toLowerCase().includes(query) || false;
      const matchesSinger = song.singer?.toLowerCase().includes(query) || false;
      return matchesTitle || matchesArtist || matchesSinger;
    });
  }, [availableSongs, songSearchQuery]);

  const handleCopyAsText = async () => {
    const getSongById = (songId: string): Song | undefined => {
      return songs.find((s) => s.id === songId);
    };

    let text = `${setlist.name}\n`;
    if (setlist.date) {
      const date = new Date(setlist.date);
      text += `${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    }
    if (setlist.venue || setlist.city) {
      text += `${setlist.venue || ''}${setlist.venue && setlist.city ? ' • ' : ''}${setlist.city || ''}\n`;
    }
    text += '\n';

    setlist.items.forEach((item) => {
      const song = getSongById(item.songId);
      if (song) {
        const key = item.keyOverride || song.key || '—';
        const singer = item.singerOverride || song.singer || '—';
        text += `${item.position + 1}. ${song.title} – ${key} – ${singer}\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(text);
      alert('Setlist copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  if (isEditing) {
    return (
      <div className="column-content">
        <div className="column-header">
          <h2>Edit Setlist</h2>
          <button className="btn-back" onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
        <SetlistForm setlist={setlist} onSubmit={handleUpdate} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className="column-content">
      <div className="column-header">
        <h2>Setlist</h2>
        <div>
          <button className="btn-primary" onClick={() => setShowPrintView(true)}>
            Print Setlist
          </button>
          <button className="btn-edit" onClick={() => setIsEditing(true)}>Edit</button>
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="setlist-info">
        {setlist.venue && <p><strong>Venue:</strong> {setlist.venue}</p>}
        {setlist.city && <p><strong>City:</strong> {setlist.city}</p>}
        {setlist.date && <p><strong>Date:</strong> {formatDate(setlist.date)}</p>}
        {setlist.notes && <p><strong>Notes:</strong> {setlist.notes}</p>}
      </div>

      <div className="setlist-songs-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Songs in Setlist</h2>
          {hasUnsavedChanges && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" onClick={handleSaveChanges}>
                Save Changes
              </button>
              <button className="btn-edit" onClick={handleCancelReorder}>
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {localItems.length === 0 ? (
          <p className="empty-state">No songs in this setlist yet. Add some below!</p>
        ) : (
          <div className="setlist-items">
            {localItems.map((item, index) => {
              const song = getSongById(item.songId);
              if (!song) return null;
              return (
                <div
                  key={item.id}
                  className="setlist-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item)}
                  onDragEnd={handleDragEnd}
                  style={{
                    cursor: 'move',
                    opacity: draggedItem?.id === item.id ? 0.5 : 1,
                  }}
                >
                  <div className="setlist-item-number" style={{ cursor: 'grab' }}>
                    {index + 1} ⋮⋮
                  </div>
                  <div className="setlist-item-content">
                    <div className="setlist-item-main">
                      <strong>{song.title}</strong>
                      {song.artist && <span className="artist"> — {song.artist}</span>}
                    </div>
                    <div className="setlist-item-details">
                      <span>Key: {item.keyOverride || song.key || '—'}</span>
                      <span>Singer: {item.singerOverride || song.singer || '—'}</span>
                      {item.notes && <span className="item-notes">{item.notes}</span>}
                    </div>
                  </div>
                  <div className="setlist-item-actions">
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleRemoveSong(item.id)}
                      aria-label="Remove"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="add-song-section">
          <h3>Add Song to Setlist</h3>
          {availableSongs.length === 0 ? (
            <p className="empty-state">All songs are already in this setlist!</p>
          ) : (
            <>
              <div className="add-song-search">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search songs by title, artist, or singer..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                />
              </div>
              {filteredAvailableSongs.length === 0 ? (
                <p className="empty-state">No songs match your search.</p>
              ) : (
                <div className="song-selection-list">
                  {filteredAvailableSongs.map((song) => (
                    <div key={song.id} className="song-selection-item">
                      <div className="song-selection-info">
                        <span className="song-selection-title">{song.title}</span>
                        {song.artist && (
                          <span className="song-selection-artist"> — {song.artist}</span>
                        )}
                        <div className="song-selection-details">
                          {song.key && <span>Key: {song.key}</span>}
                          {song.singer && <span>Singer: {song.singer}</span>}
                        </div>
                      </div>
                      <button
                        className="btn-small btn-primary"
                        onClick={() => handleAddSong(song.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showPrintView && (
        <div className="modal-overlay" onClick={() => setShowPrintView(false)}>
          <div className="modal-content print-modal" onClick={(e) => e.stopPropagation()}>
            <SetlistPrintView
              setlist={setlist}
              songs={songs}
              onClose={() => setShowPrintView(false)}
              onCopy={handleCopyAsText}
            />
          </div>
        </div>
      )}
    </div>
  );
}

