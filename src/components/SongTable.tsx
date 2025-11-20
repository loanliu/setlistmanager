import { useMemo } from 'react';
import type { Song, Setlist } from '../types';

interface SongTableProps {
  songs: Song[];
  onEdit: (song: Song) => void;
  onDelete: (id: string) => Promise<void>;
  selectedSetlist?: Setlist | null;
  onAddToSetlist?: (songId: string) => void;
  isSongInSetlist?: (songId: string) => boolean;
  currentSetlistSongIds?: string[];
}

export function SongTable({ songs, onEdit, onDelete, selectedSetlist, onAddToSetlist, isSongInSetlist: checkIsSongInSetlist, currentSetlistSongIds }: SongTableProps) {
  if (songs.length === 0) {
    return <p className="empty-state">No songs yet. Add your first song!</p>;
  }

  // currentSetlistSongIds is used to force re-render when setlist items change
  // This ensures the Add button visibility updates when songs are added/removed locally

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Singer</th>
            <th>Key</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song) => {
            // Check if song is in setlist - use currentSetlistSongIds for immediate updates
            let isInSetlist = false;
            if (currentSetlistSongIds && currentSetlistSongIds.length > 0) {
              // Use the current song IDs array for immediate updates (includes unsaved changes)
              isInSetlist = currentSetlistSongIds.includes(song.id);
            } else if (checkIsSongInSetlist) {
              // Fallback to callback if array not available
              isInSetlist = checkIsSongInSetlist(song.id);
            } else if (selectedSetlist) {
              // Final fallback: check saved items only
              isInSetlist = selectedSetlist.items.some((item) => item.songId === song.id);
            }
            const canAddToSetlist = selectedSetlist && onAddToSetlist && !isInSetlist;
            
            return (
              <tr key={song.id}>
                <td className="title-cell">{song.title}</td>
                <td>{song.artist || '—'}</td>
                <td>{song.singer || '—'}</td>
                <td>{song.key || '—'}</td>
                <td>
                  <div className="song-actions">
                    {canAddToSetlist && (
                      <button
                        className="btn-icon btn-icon-add"
                        onClick={() => onAddToSetlist!(song.id)}
                        aria-label={`Add ${song.title} to setlist`}
                        title="Add to setlist"
                      >
                        ➕
                      </button>
                    )}
                    <button
                      className="btn-icon btn-icon-edit"
                      onClick={() => onEdit(song)}
                      aria-label={`Edit ${song.title}`}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-icon-delete"
                      onClick={async () => {
                        if (confirm(`Delete "${song.title}"?`)) {
                          try {
                            await onDelete(song.id);
                          } catch (error) {
                            console.error('Failed to delete song:', error);
                          }
                        }
                      }}
                      aria-label={`Delete ${song.title}`}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

