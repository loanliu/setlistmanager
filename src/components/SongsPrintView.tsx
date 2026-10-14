import { useMemo } from 'react';
import type { Song } from '../types';

interface SongsPrintViewProps {
  songs: Song[];
  onClose: () => void;
}

function sortByTitle(songs: Song[]): Song[] {
  return songs.slice().sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
  );
}

function displayCell(value?: string): string {
  return value?.trim() ? value : '—';
}

function textCell(value?: string): string {
  return (value || '').replace(/[\r\n\t]+/g, ' ').trim();
}

export function SongsPrintView({ songs, onClose }: SongsPrintViewProps) {
  const sortedSongs = useMemo(() => sortByTitle(songs), [songs]);

  const handleCopyAsText = async () => {
    const header = 'Title\tArtist\tSinger\tKey';
    const lines = sortedSongs.map(
      (song) =>
        [textCell(song.title), textCell(song.artist), textCell(song.singer), textCell(song.key)].join('\t')
    );
    const text = [header, ...lines].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('Songs copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  return (
    <div className="print-view-container">
      <div className="print-view-controls no-print">
        <button className="btn-primary" onClick={handleCopyAsText}>
          Copy as Text
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          Print Songs
        </button>
        <button onClick={onClose}>Close</button>
      </div>

      <div className="print-view-content songs-print-content">
        <div className="print-header">
          <h1 className="print-title">Songs</h1>
        </div>

        {sortedSongs.length === 0 ? (
          <p className="print-empty">No songs yet</p>
        ) : (
          <table className="data-table songs-print-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Artist</th>
                <th>Singer</th>
                <th>Key</th>
              </tr>
            </thead>
            <tbody>
              {sortedSongs.map((song) => (
                <tr key={song.id}>
                  <td className="title-cell">{displayCell(song.title)}</td>
                  <td>{displayCell(song.artist)}</td>
                  <td>{displayCell(song.singer)}</td>
                  <td>{displayCell(song.key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
