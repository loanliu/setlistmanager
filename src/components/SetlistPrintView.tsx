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
              {(() => {
                // Track cumulative song counts per singer
                const singerCounts = new Map<string, number>();
                
                // Helper function to format count
                const formatCount = (count: number): string => {
                  if (count % 1 === 0) {
                    return count.toString();
                  } else {
                    // For decimal numbers, show one decimal place and remove trailing zeros
                    return count.toFixed(1).replace(/\.0+$/, '');
                  }
                };
                
                return setlist.items
                  .slice()
                  .map((item) => {
                    const song = getSongById(item.songId);
                    if (!song) return null;

                    const key = item.keyOverride || song.key || '—';
                    const singer = item.singerOverride || song.singer || '—';

                    // Calculate count for this singer(s)
                    if (singer !== '—') {
                      const singers = singer.includes('/') 
                        ? singer.split('/').map(s => s.trim()).filter(s => s.length > 0)
                        : [singer.trim()];
                      
                      const increment = singers.length > 1 ? 0.5 : 1;
                      
                      singers.forEach(singerName => {
                        const currentCount = singerCounts.get(singerName) || 0;
                        singerCounts.set(singerName, currentCount + increment);
                      });
                    }

                    // Get the count for display (for single singer or format for multiple)
                    let displaySinger = singer;
                    if (singer !== '—') {
                      if (singer.includes('/')) {
                        // For multiple singers, show count for each singer separately
                        // Format: "Donna (0.5)/Tony (1.5)" where each singer's cumulative count is shown
                        const singers = singer.split('/').map(s => s.trim()).filter(s => s.length > 0);
                        displaySinger = singers.map(singerName => {
                          const count = singerCounts.get(singerName) || 0;
                          return `${singerName} (${formatCount(count)})`;
                        }).join('/');
                      } else {
                        // For single singer, show count
                        const count = singerCounts.get(singer.trim()) || 0;
                        displaySinger = `${singer} (${formatCount(count)})`;
                      }
                    }

                    return (
                      <li key={item.id} className="print-song-item">
                        <span className="print-song-title">
                          {song.title}
                          {song.artist && <span className="print-song-artist"> — {song.artist}</span>}
                        </span>
                        <span className="print-song-details">
                          <span className="print-song-key">{key}</span>
                          <span className="print-song-singer">{displaySinger}</span>
                        </span>
                        {song.notes && (
                          <span className="print-song-notes"> <strong>{song.notes}</strong></span>
                        )}
                      </li>
                    );
                  });
              })()}
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

