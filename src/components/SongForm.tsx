import { useState, useEffect } from 'react';
import { Song } from '../types';

interface SongFormProps {
  song?: Song;
  onSubmit: (song: Omit<Song, 'id'>) => void;
  onCancel: () => void;
}

export function SongForm({ song, onSubmit, onCancel }: SongFormProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [singer, setSinger] = useState('');
  const [key, setKey] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setArtist(song.artist || '');
      setSinger(song.singer || '');
      setKey(song.key || '');
      setNotes(song.notes || '');
    }
  }, [song]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      artist: artist || undefined,
      singer: singer || undefined,
      key: key || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="song-form">
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="artist">Artist</label>
        <input
          id="artist"
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="singer">Singer</label>
        <input
          id="singer"
          type="text"
          value={singer}
          onChange={(e) => setSinger(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="key">Key</label>
        <input
          id="key"
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g., C, Dm, G#"
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">{song ? 'Update' : 'Add'} Song</button>
      </div>
    </form>
  );
}

