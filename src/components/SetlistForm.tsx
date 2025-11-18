import { useState, useEffect } from 'react';
import { Setlist } from '../types';

interface SetlistFormProps {
  setlist?: Setlist;
  onSubmit: (setlist: Omit<Setlist, 'id' | 'items'>) => void;
  onCancel: () => void;
}

export function SetlistForm({ setlist, onSubmit, onCancel }: SetlistFormProps) {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (setlist) {
      setName(setlist.name || '');
      setVenue(setlist.venue || '');
      setCity(setlist.city || '');
      setDate(setlist.date || '');
      setNotes(setlist.notes || '');
    }
  }, [setlist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      venue: venue || undefined,
      city: city || undefined,
      date: date || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="setlist-form">
      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="venue">Venue</label>
        <input
          id="venue"
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="city">City</label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
        <button type="submit">{setlist ? 'Update' : 'Create'} Setlist</button>
      </div>
    </form>
  );
}

