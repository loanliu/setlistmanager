import { useState } from 'react';
import { Setlist, Song, SetlistItem } from '../types';
import { useApp } from '../state/AppContext';
import { SetlistForm } from './SetlistForm';

interface SetlistDetailProps {
  setlist: Setlist;
  onBack: () => void;
}

export function SetlistDetail({ setlist, onBack }: SetlistDetailProps) {
  const { songs, updateSetlist, deleteSetlist, addItemToSetlist, removeItemFromSetlist, updateSetlistItem, reorderSetlistItems } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');

  const getSongById = (songId: string): Song | undefined => {
    return songs.find((s) => s.id === songId);
  };

  const handleUpdate = (updates: Omit<Setlist, 'id' | 'items'>) => {
    updateSetlist(setlist.id, updates);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete setlist "${setlist.name}"?`)) {
      deleteSetlist(setlist.id);
      onBack();
    }
  };

  const handleAddSong = () => {
    if (selectedSongId) {
      addItemToSetlist(setlist.id, selectedSongId);
      setSelectedSongId('');
    }
  };

  const handleRemoveSong = (itemId: string) => {
    if (confirm('Remove this song from the setlist?')) {
      removeItemFromSetlist(setlist.id, itemId);
    }
  };

  const handleMoveUp = (item: SetlistItem) => {
    if (item.position === 0) return;
    const items = [...setlist.items];
    const currentIndex = items.findIndex((i) => i.id === item.id);
    [items[currentIndex], items[currentIndex - 1]] = [items[currentIndex - 1], items[currentIndex]];
    reorderSetlistItems(setlist.id, items);
  };

  const handleMoveDown = (item: SetlistItem) => {
    if (item.position === setlist.items.length - 1) return;
    const items = [...setlist.items];
    const currentIndex = items.findIndex((i) => i.id === item.id);
    [items[currentIndex], items[currentIndex + 1]] = [items[currentIndex + 1], items[currentIndex]];
    reorderSetlistItems(setlist.id, items);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const availableSongs = songs.filter(
    (song) => !setlist.items.some((item) => item.songId === song.id)
  );

  if (isEditing) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1>Edit Setlist</h1>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
        <SetlistForm setlist={setlist} onSubmit={handleUpdate} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>{setlist.name}</h1>
        <div>
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
        <h2>Songs in Setlist</h2>
        
        {setlist.items.length === 0 ? (
          <p className="empty-state">No songs in this setlist yet. Add some below!</p>
        ) : (
          <div className="setlist-items">
            {setlist.items.map((item) => {
              const song = getSongById(item.songId);
              if (!song) return null;
              return (
                <div key={item.id} className="setlist-item">
                  <div className="setlist-item-number">{item.position + 1}</div>
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
                      className="btn-small"
                      onClick={() => handleMoveUp(item)}
                      disabled={item.position === 0}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-small"
                      onClick={() => handleMoveDown(item)}
                      disabled={item.position === setlist.items.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
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
            <div className="add-song-controls">
              <select
                value={selectedSongId}
                onChange={(e) => setSelectedSongId(e.target.value)}
                className="song-select"
              >
                <option value="">Select a song...</option>
                {availableSongs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title} {song.artist ? `— ${song.artist}` : ''}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                onClick={handleAddSong}
                disabled={!selectedSongId}
              >
                Add Song
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

