import { Song } from '../types';

interface SongTableProps {
  songs: Song[];
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
}

export function SongTable({ songs, onEdit, onDelete }: SongTableProps) {
  if (songs.length === 0) {
    return <p className="empty-state">No songs yet. Add your first song!</p>;
  }

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
          {songs.map((song) => (
            <tr key={song.id}>
              <td className="title-cell">{song.title}</td>
              <td>{song.artist || '—'}</td>
              <td>{song.singer || '—'}</td>
              <td>{song.key || '—'}</td>
              <td>
                <button
                  className="btn-edit"
                  onClick={() => onEdit(song)}
                  aria-label={`Edit ${song.title}`}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => {
                    if (confirm(`Delete "${song.title}"?`)) {
                      onDelete(song.id);
                    }
                  }}
                  aria-label={`Delete ${song.title}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

