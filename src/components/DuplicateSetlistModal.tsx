import { useState } from 'react';
import type { Setlist } from '../types';

interface DuplicateSetlistModalProps {
  setlists: Setlist[];
  onClose: () => void;
  onDuplicate: (fromSetlistId: string, toSetlistId: string) => Promise<void>;
}

export function DuplicateSetlistModal({ setlists, onClose, onDuplicate }: DuplicateSetlistModalProps) {
  const [fromSetlistId, setFromSetlistId] = useState<string>('');
  const [toSetlistId, setToSetlistId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromSetlistId || !toSetlistId) {
      setError('Please select both "From" and "To" setlists');
      return;
    }

    if (fromSetlistId === toSetlistId) {
      setError('"From" and "To" setlists cannot be the same');
      return;
    }

    const fromSetlist = setlists.find(s => s.id === fromSetlistId);
    if (!fromSetlist || fromSetlist.items.length === 0) {
      setError('The "From" setlist has no items to duplicate');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onDuplicate(fromSetlistId, toSetlistId);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate setlist items';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          display: 'block',
          position: 'relative',
          zIndex: 1001
        }}
      >
        <div className="modal-header">
          <h2>Duplicate Setlist Items</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem', color: '#d32f2f' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="from-setlist">From Setlist *</label>
            <select
              id="from-setlist"
              value={fromSetlistId}
              onChange={(e) => {
                setFromSetlistId(e.target.value);
                setError(null);
              }}
              disabled={isSubmitting}
              required
            >
              <option value="">Select a setlist...</option>
              {setlists.map((setlist) => (
                <option key={setlist.id} value={setlist.id}>
                  {setlist.name} {setlist.date ? `(${setlist.date})` : ''} - {setlist.items.length} items
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="to-setlist">To Setlist *</label>
            <select
              id="to-setlist"
              value={toSetlistId}
              onChange={(e) => {
                setToSetlistId(e.target.value);
                setError(null);
              }}
              disabled={isSubmitting}
              required
            >
              <option value="">Select a setlist...</option>
              {setlists
                .filter((setlist) => setlist.id !== fromSetlistId)
                .map((setlist) => (
                  <option key={setlist.id} value={setlist.id}>
                    {setlist.name} {setlist.date ? `(${setlist.date})` : ''} - {setlist.items.length} items
                  </option>
                ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Duplicating...' : 'Duplicate Items'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

