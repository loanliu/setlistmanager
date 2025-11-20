import type { Setlist, Song } from '../types';

interface SetlistPrintViewProps {
  setlist: Setlist;
  songs: Song[];
  onClose: () => void;
  onCopy: () => void;
}

export function SetlistPrintView({ setlist, songs, onClose, onCopy }: SetlistPrintViewProps) {
  const getSongById = (songId: string): Song | undefined => {
    return songs.find((s) => s.id === songId);
  };

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

  return (
    <div className="print-view-container">
      <div className="print-view-controls no-print">
        <button className="btn-primary" onClick={onCopy}>
          Copy as Text
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          Print Setlist
        </button>
        <button onClick={onClose}>Close</button>
      </div>

      <div className="print-view-content">
        <div className="print-header">
          <h1 className="print-title">{setlist.name}</h1>
          {setlist.date && <p className="print-date">{formatDate(setlist.date)}</p>}
          {(setlist.venue || setlist.city) && (
            <p className="print-location">
              {setlist.venue && <span>{setlist.venue}</span>}
              {setlist.venue && setlist.city && <span> • </span>}
              {setlist.city && <span>{setlist.city}</span>}
            </p>
          )}
        </div>

        <div className="print-songs">
          {setlist.items.length === 0 ? (
            <p className="print-empty">No songs in this setlist</p>
          ) : (
            <ol className="print-song-list">
              {setlist.items
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((item) => {
                  const song = getSongById(item.songId);
                  if (!song) return null;

                  const key = item.keyOverride || song.key || '—';
                  const singer = item.singerOverride || song.singer || '—';

                  return (
                    <li key={item.id} className="print-song-item">
                      <span className="print-song-title">{song.title}</span>
                      <span className="print-song-details">
                        <span className="print-song-key">{key}</span>
                        <span className="print-song-singer">{singer}</span>
                      </span>
                    </li>
                  );
                })}
            </ol>
          )}
        </div>

        {setlist.notes && (
          <div className="print-notes">
            <h2>Notes</h2>
            <p>{setlist.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

