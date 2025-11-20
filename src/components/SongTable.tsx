import type { Song, Setlist } from '../types';

interface SongTableProps {
  songs: Song[];
  onEdit: (song: Song) => void;
  onDelete: (id: string) => Promise<void>;
  selectedSetlist?: Setlist | null;
  onAddToSetlist?: (songId: string) => void;
  isSongInSetlist?: (songId: string) => boolean;
}

export function SongTable({ songs, onEdit, onDelete, selectedSetlist, onAddToSetlist, isSongInSetlist: checkIsSongInSetlist }: SongTableProps) {
  if (songs.length === 0) {
    return <p className="empty-state">No songs yet. Add your first song!</p>;
  }

  const isSongInSetlist = (songId: string): boolean => {
    if (!selectedSetlist) return false;
    if (checkIsSongInSetlist) {
      return checkIsSongInSetlist(songId);
    }
    // Fallback: check saved items only
    return selectedSetlist.items.some((item) => item.songId === songId);
  };

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
            const isInSetlist = isSongInSetlist(song.id);
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

