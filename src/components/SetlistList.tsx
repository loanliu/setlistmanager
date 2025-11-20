import type { Setlist } from '../types';

interface SetlistListProps {
  setlists: Setlist[];
  onSelect: (setlist: Setlist) => void;
  onDelete: (id: string) => Promise<void>;
  selectedSetlistId?: string;
}

export function SetlistList({ setlists, onSelect, onDelete, selectedSetlistId }: SetlistListProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
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

  if (setlists.length === 0) {
    return <p className="empty-state">No setlists yet. Create your first setlist!</p>;
  }

  return (
    <div className="setlist-list-column">
      {setlists.map((setlist) => (
        <div 
          key={setlist.id} 
          className={`setlist-card ${selectedSetlistId === setlist.id ? 'selected' : ''}`}
          onClick={() => onSelect(setlist)}
        >
          <div className="setlist-card-header">
            <div>
              <h3>{setlist.name}</h3>
              {setlist.date && <p className="setlist-card-date">{formatDate(setlist.date)}</p>}
            </div>
          </div>
          <div className="setlist-card-actions">
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement download functionality
                console.log('Download setlist:', setlist.id);
              }}
              aria-label="Download"
            >
              ⬇
            </button>
            <button
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement lyrics functionality
                console.log('Show lyrics for setlist:', setlist.id);
              }}
              aria-label="Lyrics"
            >
              📄
            </button>
            <button
              className="btn-icon btn-icon-delete"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm(`Delete setlist "${setlist.name}"?`)) {
                  try {
                    await onDelete(setlist.id);
                  } catch (error) {
                    console.error('Failed to delete setlist:', error);
                  }
                }
              }}
              aria-label="Delete"
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

