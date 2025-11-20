import type { Setlist, Song, SetlistItem } from '../types';

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
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
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
              {setlist.items.map((item) => {
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

