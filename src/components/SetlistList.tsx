import { Setlist } from '../types';

interface SetlistListProps {
  setlists: Setlist[];
  onSelect: (setlist: Setlist) => void;
  onDelete: (id: string) => void;
}

export function SetlistList({ setlists, onSelect, onDelete }: SetlistListProps) {
  if (setlists.length === 0) {
    return <p className="empty-state">No setlists yet. Create your first setlist!</p>;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="setlist-grid">
      {setlists.map((setlist) => (
        <div key={setlist.id} className="setlist-card">
          <div className="setlist-card-header">
            <h3>{setlist.name}</h3>
            <div className="setlist-card-actions">
              <button
                className="btn-edit"
                onClick={() => onSelect(setlist)}
                aria-label={`Edit ${setlist.name}`}
              >
                Edit / Open
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  if (confirm(`Delete setlist "${setlist.name}"?`)) {
                    onDelete(setlist.id);
                  }
                }}
                aria-label={`Delete ${setlist.name}`}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="setlist-card-body">
            {setlist.venue && <p><strong>Venue:</strong> {setlist.venue}</p>}
            {setlist.city && <p><strong>City:</strong> {setlist.city}</p>}
            {setlist.date && <p><strong>Date:</strong> {formatDate(setlist.date)}</p>}
            <p><strong>Songs:</strong> {setlist.items.length}</p>
            {setlist.notes && <p className="notes-preview">{setlist.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

